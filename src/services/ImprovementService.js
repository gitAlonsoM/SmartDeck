// src\services\ImprovementService.js
// This service encapsulates all logic related to the card improvement workflow.

class ImprovementService {

    /**
     * Handles the entire process of exporting cards marked for improvement.
     * @param {object} deck - The full deck object to export cards from.
     * @returns {object} An object indicating the result, e.g., { success: true, count: 5 } or { success: false, message: '...' }.
     */
    static async handleExport(deck) {
        if (!deck) {
            return { success: false, message: 'Invalid deck provided.' };
        }

        console.log(`DEBUG: [ImprovementService] handleExport -> Preparing export for deck ${deck.id}`);
        const improvementData = StorageService.loadImprovementData(deck.id);
        const markedCardIds = Object.keys(improvementData);

        if (markedCardIds.length === 0) {
            return { success: false, message: 'There are no cards marked for improvement to export.' };
        }

        const cardMap = new Map(deck.cards.map(c => [c.cardId, c]));
        const exportBatch = markedCardIds.map(cardId => {
            const card = cardMap.get(cardId);
            const review_request = improvementData[cardId];
            return { ...card, review_request };
        });

        // Use the stored 'fileName' for static decks, or construct it from the id for AI-generated decks.
        const deckFileName = deck.fileName || `${deck.id}.json`;

        const textToCopy = this._generateImprovementPrompt(deck.name, deckFileName, exportBatch);

        try {
            await navigator.clipboard.writeText(textToCopy);
            return { success: true, count: exportBatch.length };
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return { success: false, message: 'Could not copy data to clipboard. See console for details.' };
        }
    }

    /**
     * Generates a definitive, professional-grade prompt for an LLM. (Moved from App.js)
     * @private
     */
    static _generateImprovementPrompt(deckName, deckFileName, cardsToImprove) {
        const promptHeader = `
# SmartDeck Card Improvement Prompt V3
## 1. ROLE AND GOAL
You are a senior content editor for 'SmartDeck'. Your task is to process a batch of flashcards and return a complete, actionable response that includes both the corrected data and instructions for the user.
## 2. CONTEXT
The flashcards belong to the deck named: "${deckName}".
The target deck file is: "${deckFileName}".
## 3. CARD DATA STRUCTURES
(The user will provide the JSON data below. You must understand the following schemas.)
### A) Multiple-Choice ('quiz') Card:
- \`cardId\`: Unique identifier. DO NOT CHANGE.
- \`category\`, \`hint\`, \`content\`: Preserve these fields unless the user's request is specifically about them.
- \`question\`: The question text. Improve for clarity.
- \`options\`: An array of answers. This array has a FIXED LENGTH. Do not add/remove items, but you can correct the text within them.
- \`correctAnswer\`: The correct string from \`options\`. MUST be updated if you change the option's text.
- \`review_request\`: The user's feedback.
### B) Flippable ('flippable') Card:
- \`cardId\`: Unique identifier. DO NOT CHANGE.
- \`sideA\`: The front of the card.
- \`sideB\`: An array of valid answers. This array is FLEXIBLE. You can add new valid answers here.
- \`note\`: A field for YOUR feedback to the user.
- \`review_request\`: The user's feedback.
## 4. CORE WORKFLOW & RULES
1.  **Analyze Request**: Prioritize the \`review_request.reasons\` (e.g., "improve_hint", "clarify_question"). Use the \`review_request.note\` for specific user suggestions.
2.  **Apply Corrections**: Fix typos, improve clarity, and validate user suggestions.
3.  **Provide Feedback**: Use the \`note\` field to explain your changes.
    - **Preserve & Append**: If the \`note\` field already has content, **you must preserve it**. Append your new explanation after the original content, separated by a double newline (\`\\n\\n\`).
    - **Overwrite Exception**: Only replace the entire note if the user's \`review_request.note\` explicitly asks to 'replace' or 'rewrite' the note.
    - **Formatting**: The note must be concise, in English, and can be \`null\` for trivial fixes.
4.  **Language**: All your output (notes, corrected text) must be in English.
## 5. **CRITICAL: REQUIRED OUTPUT FORMAT**
Your final response MUST be a single block of Markdown text structured in exactly two parts:
### Part 1: Corrected JSON
- Start with the exact heading: \`## Corrected Cards JSON\`
- Below it, provide a single, raw JSON array of the corrected cards inside a \`\`\`json code block.
- In this JSON, you MUST REMOVE the entire \`review_request\` object from every card.
### Part 2: Next Steps for the User
- Follow the JSON block with the exact heading: \`## Next Steps\`
- Provide a short, numbered list of instructions for the user.
- Step 1 must tell the user to save the JSON above into the \`corrections.json\` file.
- Step 2 must provide the **exact, ready-to-copy command** to run the update script in their terminal, using the deck's filename you were given.
Here is the template you must follow:
## Corrected Cards JSON
\`\`\`json
[
  {
    "cardId": "...",
    "question": "...",
    "options": ["..."],
    "correctAnswer": "...",
    "note": "Your expert note here..."
  }
]
\`\`\`
## Next Steps
1. Save the JSON content above into the \`corrections.json\` file at the root of the project.
2. Open the terminal at the project root and run the following command to apply the updates:
   \`\`\`bash
   py update_deck.py --deck-file "public/data/${deckFileName}" --input-file "corrections.json"
   \`\`\`
---
[BEGIN CARD BATCH FOR YOUR REVIEW]
---
`;
        const jsonString = JSON.stringify(cardsToImprove, null, 2);
        return promptHeader + '\n' + jsonString;
    }
}
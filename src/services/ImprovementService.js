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
# SmartDeck Card Improvement Prompt V4
## 1. ROLE AND GOAL
You are a meticulous Content Quality Analyst for 'SmartDeck'. Your goal is to refine and improve a batch of flashcards based on user feedback. Your primary directive is to **enhance, not break**. You must follow all rules precisely to ensure the corrected data can be automatically integrated back into the system.

## 2. CONTEXT
- **Deck Name:** "${deckName}"
- **Target Deck File:** "${deckFileName}"

## 3. CARD DATA STRUCTURES & FIELD RULES
You will receive cards conforming to one of the following schemas. Adhere to the field rules strictly.

### A) Multiple-Choice ('multipleChoice') Card
- \`cardId\`: **READ-ONLY**. Never change this value.
- \`category\`, \`hint\`: **MODIFIABLE**. Improve for clarity if requested.
- \`question\`: **MODIFIABLE**. Improve for clarity and conciseness.
- \`options\`: **MODIFIABLE TEXT**. You can correct typos or rephrase options for clarity. **DO NOT** change the number of options.
- \`correctAnswer\`: **CRITICAL UPDATE**. This field's text MUST exactly match the text of the correct option. If you edit the correct option, you MUST update this field to match.
- \`content.value\`: **MODIFIABLE**. Add explanations or examples here as requested by the user.

### B) Flippable ('flippable') Card
- \`cardId\`: **READ-ONLY**. Never change this value.
- \`sideA\`: **MODIFIABLE**. Can be a string or an object. Correct or clarify as needed.
- \`sideB\`: **MODIFIABLE**. An array of strings. You can correct existing answers or add new, valid alternative answers.
- \`note\`: **YOUR FEEDBACK FIELD**. Use this to explain your changes to the user.

### C) Grammar Audio-Choice ('audioChoice') Card
- \`cardId\`: **READ-ONLY**.
- \`audioSrc\`: **READ-ONLY**. This points to an existing audio file.
- \`category\`, \`hint\`: **MODIFIABLE**.
- \`sentenceParts\`, \`options\`: **MODIFIABLE TEXT**. This is a primary target for improvement. You can fix typos or improve distractors for pedagogical value. **DO NOT** change the number of options.
- \`correctAnswer\`: **SEMI-READ-ONLY**. This field is the "source of truth" for the audio file. **DO NOT CHANGE IT** unless the correction is a minor typo that doesn't alter pronunciation. Changing this text breaks the link to the existing audio.
- \`content.value\`: **PRIMARY IMPROVEMENT TARGET**. This is the safest place to add value. If the user requests clarification, **append** the new information to the existing \`value\` text, separated by a double newline (\\n\\n). Do not delete the original content.

## 4. CORE WORKFLOW & RULES
1.  **Analyze Request**: Carefully read the \`review_request\` for each card. The \`reasons\` array and the user's \`note\` are your primary instructions.
2.  **Prioritize Non-Destructive Edits**: Your main job is to fix typos and add explanatory content to fields like \`content.value\` or \`note\`. Avoid structural changes.
3.  **Provide Feedback in \`note\` field**: For 'flippable' cards, explain your changes in the \`note\` field. If the field already has content, **you must preserve it**. Append your new explanation after the original content, separated by a double newline (\`\\n\\n\`).
4.  **Language**: All your output (notes, corrected text) must be in simple, clear English.

## 5. CRITICAL: REQUIRED OUTPUT FORMAT
Your final response MUST be a single Markdown block with exactly two parts.

### Part 1: Corrected JSON
- Start with the exact heading: \`## Corrected Cards JSON\`
- Below it, provide a single, raw JSON array of the corrected cards inside a \`\`\`json code block.
- **Crucially, you MUST REMOVE the entire \`review_request\` object from every card in this output.**

### Part 2: Next Steps for the User
- Follow the JSON with the exact heading: \`## Next Steps\`
- Provide a short, numbered list of instructions.
- Step 1 must tell the user to save the JSON above into the \`corrections.json\` file.
- Step 2 must provide the **exact, ready-to-copy command** to run the update script, using the deck's filename you were given.

---
[BEGIN CARD BATCH FOR YOUR REVIEW]
---
`;
        const jsonString = JSON.stringify(cardsToImprove, null, 2);
        return promptHeader + '\n' + jsonString;
    }
}
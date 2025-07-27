// src\services\ImprovementService.js
// This service encapsulates all logic related to the card improvement workflow.

/**
 * =====================================================================================
 * SmartDeck - Technical Deck Schema Guide
 * =====================================================================================
 *
 * @version 1.0
 * @date 2025-07-27
 *
 * @description
 * This document provides a technical overview of the different JSON data structures (schemas)
 * used for creating study decks in the SmartDeck application. It serves as a guide for
 * developers and content creators.
 *
 * NOTE: The schemas described here reflect the current state of the application and are
 * subject to evolution as new features are added.
 *
 * ---
 * ### Root Deck Properties
 * All deck files share a common set of root properties:
 *
 * - id (string): A unique identifier for the deck.
 * - name (string): The display name of the deck shown in the UI.
 * - description (string): A brief explanation of the deck's content.
 * - deckType (string): The most critical property. It defines the study mode and the
 * expected schema for its cards. Valid values are "multipleChoice", "flippable",
 * or "audioChoice".
 * - isAiGenerated (boolean): If true, the UI will display an option to delete this deck.
 * - cards (array): An array of card objects, whose structure depends on the deckType.
 *
 * ---
 *
 * ### Deck Type 1: Multiple Choice (`deckType: "multipleChoice"`)
 *
 * @purpose Standard quiz format where the user selects one correct answer from a list of options.
 * Ideal for knowledge checks on topics like programming, technical standards, or facts.
 *
 * @uiBehavior Renders in the `QuizScreen`. The user is shown a question and clickable buttons
 * for each option. Immediate feedback is provided upon selection.
 *
 * #### Card Structure for `multipleChoice`:
 * - cardId (string): Unique ID for the card (e.g., "plsql_001").
 * - category (string, optional): A sub-topic for organizing cards.
 * - hint (string, optional): A small tip shown to the user.
 * - question (string): The text of the question being asked.
 * - options (array of strings): A list of potential answers.
 * - correctAnswer (string): The string that must exactly match one of the items in `options`.
 * - content (object, optional): Supplementary information shown after answering.
 * - type (string): "code", "text", or "none".
 * - language (string): The language for syntax highlighting (e.g., "sql", "dart").
 * - value (string): The code or text content to display.
 *
 * ---
 *
 * ### Deck Type 2: Audio Choice (`deckType: "audioChoice"`)
 *
 * @purpose Specialized quiz format for grammar and sentence completion, focused on listening comprehension.
 *
 * @uiBehavior Renders in the `AudioChoiceScreen`. An audio of a full sentence is played.
 * The UI shows the sentence with a blank ("___"). The user selects an option to fill the blank.
 *
 * #### Card Structure for `audioChoice`:
 * - cardId (string): Unique ID for the card (e.g., "egac_001").
 * - sentenceParts (object): The static parts of the sentence.
 * - prefix (string): The text before the blank.
 * - suffix (string): The text after the blank.
 * - options (array of objects): The choices to fill the blank.
 * - text (string): The text for the option.
 * - isCorrect (boolean): Indicates if this is the correct choice.
 * - correctAnswer (string): The complete, correct sentence. This is the source text for the TTS audio generation.
 * - audioSrc (string): The relative path to the generated audio file.
 * - hint (string, optional): A tip shown before the user answers.
 * - content (object, optional): A detailed explanation shown after answering.
 *
 * ---
 *
 * ### Deck Type 3: Flippable (`deckType: "flippable"`)
 *
 * @purpose A versatile, self-assessed study format based on digital flashcards (Side A / Side B).
 * It is highly **polymorphic**, meaning the structure of a card's `sideA` property determines
 * how it renders and behaves.
 *
 * @uiBehavior Renders in the `FlippableCardScreen`. The user views Side A, thinks of the answer,
 * flips the card to see Side B, and then self-assesses with "Review Again" or "I Knew It".
 *
 * #### Polymorphic Subtypes for `flippable`:
 *
 * #### 3.1) Visual Content Card
 * @purpose For vocabulary or concepts where a text prompt is enhanced by a visual cue.
 * @structure
 * - sideA (object): `{ "text": "...", "visualContent": { "type": "icon" | "ascii", "value": "..." } }`
 * - sideB (array of strings): A list of acceptable answers.
 * - note (string | null): Additional context shown on Side B.
 *
 * #### 3.2) Single Audio Card
 * @purpose For audio-based recall, like listening to a phrase and remembering its translation.
 * @structure
 * - audioSrc (string): A top-level property with the path to the audio file. Side A's content is an audio player.
 * - sideB (array of strings): The corresponding text answer(s).
 * - note (string | null): Additional context.
 *
 * #### 3.3) Conversation Card
 * @purpose To practice understanding conversational flow and context by simulating a short dialogue.
 * @structure
 * - sideA (object): `{ "conversation": [ { "text": "...", "audioSrc": "..." }, { ... } ] }`
 * - sideA contains a `conversation` array. The UI plays each audio sequentially.
 * - note (string | null): Used to define vocabulary or idioms from the conversation.
 *
 */

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
# SmartDeck Card Improvement Prompt V5
## 1. ROLE AND GOAL
You are an expert Content Quality Analyst and Instructional Designer for 'SmartDeck'. Your goal is to significantly enhance the pedagogical value of a batch of flashcards based on user feedback and your own expertise. Your directives are:
1.  **Enhance, Don't Break**: Follow all rules precisely to ensure the data remains machine-readable.
2.  **Add Value Proactively**: Don't just fix the reported issue. If you see an opportunity to make a card better for learning, take it.
3.  **Be Clear and Concise**: All additions must be in simple, clear English.

## 2. CONTEXT
- **Deck Name:** "${deckName}"
- **Target Deck File:** "${deckFileName}"

## 3. CARD DATA STRUCTURES & FIELD RULES
You will receive cards conforming to one of the following schemas. Your primary function is to **add value**. For any card, if you can add a clarifying \`note\`, a helpful \`content.value\`, or a better \`hint\`, you are encouraged to do so.

### A) Multiple-Choice ('multipleChoice') Card
- \`cardId\`: **READ-ONLY**. Never change this value.
- \`category\`, \`hint\`: **MODIFIABLE**. Improve for clarity and pedagogical value. A good hint guides the user toward the answer without giving it away.
- \`question\`: **MODIFIABLE**. Rephrase for maximum clarity and conciseness.
- \`options\`: **MODIFIABLE TEXT & STRATEGY**. You can correct typos, but more importantly, improve weak "distractors" to be more plausible yet unambiguously incorrect. **DO NOT** change the number of options.
- \`correctAnswer\`: **CRITICAL UPDATE**. Must **exactly match** the text of the correct option. If you edit the correct option, you MUST update this field.
- \`content.value\`: **PRIMARY VALUE-ADD FIELD**. This is a key area to add value. Provide concise code examples, bullet-point explanations, or "Pro-Tip" style advice here.

### B) Flippable ('flippable') Card
This card type is polymorphic. Pay close attention to the structure of each card.
- \`cardId\`: **READ-ONLY**.
- \`sideA\`: **MODIFIABLE**. Can be a string or an object (e.g., with \`text\` and \`visualContent\`, or a \`conversation\` array). Correct typos or clarify the prompt as needed. For conversation cards, **DO NOT** change \`audioSrc\` paths.
- \`sideB\`: **PRIMARY VALUE-ADD FIELD**. This is an array of strings representing correct answers. You are strongly encouraged to **add new, valid, and diverse alternative answers**. Correct typos in existing ones. The more high-quality alternatives, the better.
- \`note\`: **PRIMARY VALUE-ADD FIELD**. This field is for **permanent educational content** for the end-user. Use it to explain key terms, phrasal verbs, or provide "Pro-Tip" style advice. If the field already has content, **you must preserve it**. Append your new information after the original content, separated by a double newline (\`\\n\\n\`).

### C) Grammar Audio-Choice ('audioChoice') Card
- \`cardId\`: **READ-ONLY**.
- \`audioSrc\`: **READ-ONLY**. This points to an existing audio file and must not be changed.
- \`category\`, \`hint\`: **MODIFIABLE**. Improve for clarity.
- \`sentenceParts\`, \`options\`: **MODIFIABLE TEXT**. This is a primary target for improvement. You can fix typos or improve distractors for pedagogical value. **DO NOT** change the number of options.
- \`correctAnswer\`: **SEMI-READ-ONLY**. This field is the "source of truth" for the audio file. **DO NOT CHANGE IT** unless the correction is a minor typo that doesn't alter pronunciation or meaning. Changing this text breaks the link to the existing audio.
- \`content.value\`: **PRIMARY VALUE-ADD FIELD**. This is the safest and most important place to add value. If the user requests clarification or more info, **append** the new information to the existing \`value\` text, separated by a double newline (\`\\n\\n\`). Do not delete the original content.

## 4. CORE WORKFLOW & RULES
1.  **Analyze Request**: Carefully read the \`review_request\` for each card. This is your primary instruction from the user.
2.  **Apply Expertise**: Go beyond the user's request. Add value by improving hints, adding notes, or providing better alternative answers as described in the rules above.
3.  **Preserve Existing Content**: When adding to fields like \`note\` or \`content.value\`, always append. Never delete the user's or system's existing information unless correcting a clear error.

## 5. CRITICAL: REQUIRED OUTPUT FORMAT
Your final response MUST be a single Markdown block with exactly two parts.

### Part 1: Corrected JSON
- Start with the exact heading: \`## Corrected Cards JSON\`
- Below it, provide a single, raw JSON array of the corrected cards inside a \`\`\`json code block.
- **Crucially, you MUST REMOVE the entire \`review_request\` object from every card in this output.**

### Part 2: Summary of Changes & Next Steps
- Follow the JSON with the exact heading: \`## Summary of Changes & Next Steps\`
- Provide a short, bulleted list summarizing the **most significant changes** you made (e.g., "- Added 3 new alternatives to card \`itc_004\`.", "- Clarified the \`note\` on card \`ui_001\`.").
- After the summary, provide the user's next steps:
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
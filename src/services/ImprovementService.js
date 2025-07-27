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
        const deckRelativePath = `public/data/${deckFileName}`;

        // Construct the exact and correct command here, so the LLM doesn't have to guess.
        const correctCommand = `py update_deck.py --deck-file "${deckRelativePath}" --input-file "corrections.json"`;

        const textToCopy = this._generateImprovementPrompt(deck.name, correctCommand, exportBatch); 

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

static _generateImprovementPrompt(deckName, correctCommand, cardsToImprove) {

        const promptHeader = `
# SmartDeck Card Improvement Prompt V7
## 1. ROLE AND GOAL
You are an expert Content Quality Analyst and Instructional Designer for 'SmartDeck'. Your goal is to significantly enhance the pedagogical value of a batch of flashcards based on user feedback and your own expertise. Your directives are:
1.  **Enhance, Don't Break**: Follow all rules precisely to ensure the data remains machine-readable.
2.  **Add Value Proactively**: Don't just fix the reported issue. If you see an opportunity to make a card better for learning, take it.
3.  **Be Clear and Concise**: All additions must be in simple, clear English.

## 2. CONTEXT
- **Deck Name:** "${deckName}"

## 3. CARD DATA STRUCTURES & FIELD RULES
(The rules for card structures remain the same...)

### A) Multiple-Choice ('multipleChoice') Card
- \`cardId\`: **READ-ONLY**.
- \`category\`, \`hint\`: **MODIFIABLE**.
- \`question\`: **MODIFIABLE**.
- \`options\`: **MODIFIABLE TEXT & STRATEGY**.
- \`correctAnswer\`: **CRITICAL UPDATE**.
- \`content.value\`: **PRIMARY VALUE-ADD FIELD**.

### B) Flippable ('flippable') Card
- \`cardId\`: **READ-ONLY**.
- \`sideA\`: **MODIFIABLE**.
- \`sideB\`: **PRIMARY VALUE-ADD FIELD**.
- \`note\`: **PRIMARY VALUE-ADD FIELD**.

### C) Grammar Audio-Choice ('audioChoice') Card
- \`cardId\`: **READ-ONLY**.
- \`audioSrc\`: **READ-ONLY**.
- \`category\`, \`hint\`: **MODIFIABLE**.
- \`sentenceParts\`, \`options\`: **MODIFIABLE TEXT**.
- \`correctAnswer\`: **SEMI-READ-ONLY**.
- \`content.value\`: **PRIMARY VALUE-ADD FIELD**.

## 4. CORE WORKFLOW & RULES
1.  **Analyze Request**: Carefully read the \`review_request\` for each card.
2.  **Apply Expertise**: Go beyond the user's request and add value.
3.  **Preserve Existing Content**: When adding to fields like \`note\`, always append.

## 5. CRITICAL: REQUIRED OUTPUT FORMAT
Your final response MUST be a single Markdown block with exactly two parts.

### Part 1: Corrected JSON
- Start with the exact heading: \`## Corrected Cards JSON\`
- Below it, provide a single, raw JSON array of the corrected cards inside a \`\`\`json code block.
- **Crucially, you MUST REMOVE the entire \`review_request\` object from every card in this output.**

### Part 2: Resumen de Cambios (en español) y Próximos Pasos
- Sigue el JSON con el encabezado exacto: \`## Resumen de Cambios y Próximos Pasos\`
- **IMPORTANTE: Esta sección completa debe estar en ESPAÑOL.**

#### Resumen de Cambios
- Para cada tarjeta que modificaste, proporciona un resumen en una lista, explicando qué te pidió el usuario y qué acción tomaste.
- **Ejemplo:**
    - **Card ID tpp_001:** El usuario pidió aclarar el término 'ticket'. Acepté la sugerencia y añadí una definición al campo 'note'.

#### Próximos Pasos
- Después del resumen de cambios, proporciona los siguientes pasos para el usuario:
- **Paso 1:** Dile al usuario que guarde el JSON de arriba en el archivo \`corrections.json\`.
- **Paso 2:** Inserta el **comando exacto que te doy a continuación, sin modificarlo en absoluto**:
\`\`\`bash
${correctCommand}
\`\`\`

---
[BEGIN CARD BATCH FOR YOUR REVIEW]
---
`;
        const jsonString = JSON.stringify(cardsToImprove, null, 2);
        return promptHeader + '\n' + jsonString;
    }
}
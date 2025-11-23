// src\services\ImprovementService.js
// This service encapsulates all logic related to the card improvement workflow.
/**
 * DEVELOPER'S NOTE: CRITICAL INSTRUCTIONS FOR EDITING THIS FILE
 *
 * 1.  JAVASCRIPT SYNTAX WARNING (BACKTICKS):
 * This file contains a large multi-line template string (`...`) in the
 * _generateImprovementPrompt method. This string defines a prompt in Markdown format.
 * Any literal backtick character (`) used inside this string (e.g., for Markdown
 * code blocks ```) MUST be escaped with a backslash (e.g., \`\`\`), otherwise
 * it will break the template string and cause a fatal SyntaxError in the application.
 *
 * 2.  PROMPT VERSIONING:
 * When you modify the logic or text of the prompt, you MUST increment the version
 * number in the prompt's header (e.g., `# SmartDeck Card Improvement Prompt V8.1`
 * -> `V8.2`). This helps in tracking changes and debugging LLM responses.
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

 # SmartDeck Card Improvement Prompt V8.2
## 1. ROLE AND GOAL
You are an expert Content Quality Analyst and Instructional Designer for 'SmartDeck'. Your goal is to significantly enhance the pedagogical value of a batch of flashcards based on user feedback and your own expertise. Your directives are:
1.  **Enhance, Don't Break**: Follow all rules precisely to ensure the data remains machine-readable.
2.  **Add Value Proactively**: Don't just fix the reported issue. If you see an opportunity to make a card better for learning, take it. For example, if a user provides a correct sentence, you can add another one.
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
    - **CRITICAL RULE:** This field may start with a grammar rule ID. The required literal format for this ID is **[ID]** (e.g., **[12]**), which links to a grammar rule. **This syntax MUST NOT be altered, corrected, or removed. (SOLO TOCARAS ESTE NUMERO SI EL USUARIO TE SOLICITA EXPLICITAMENTE QUE LO ELIMINES DE LA TARJETA, POR EJEMPLO EL USUARIO PODRIA DECIRTE "ELIMINA EL MODAL DE LA CARD, NO APLICA", ENTONCES DEBERAS ELIMINAR EL NUMERO Y LOS SIGNOS QUE LE RODEAN, PARA QUE DEJE DE APARECER EL MODAL EN PANTALLA, DEBERAS ELIMINAR COMPLETO LOS 2 SIMBOLOS DE ASTERISCOS QUE RODEAN LAS LLAVES Y EL NUMERO INTERIRO, TODO ESE CONJUTO SERA ELIMIUANDO, CUANDO EL USUARIO SOLICITE ELIMINAR EL MODAL DE LA CARD. **[EJ 15]**)**.
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
3.  **Preserve Existing Content**: When adding to fields like \`note\`, ALWAYS append!.

## 5. SPECIAL RULE: Handling "add_answer" and User Suggestions
This is the most critical rule. When a user request includes the reason \`add_answer\` or provides a new sentence in the \`user_comment\`, you MUST follow this logic(user_comment tiene la mayor relevancia, al ser un comentario directo del usuario de sus intenciones con la card, ya sea agregar nueva oracion, mejorarla con alguna aclaracion, etc.):

### Step 1: Evaluate the User's Suggested Sentence
Analyze the sentence provided in \`review_request.user_comment\`.

### Step 2: If the Suggestion is CORRECT
- **Action:** Add the new, correct sentence to the card's data (e.g., to the \`sideB\` array for flippable cards, or as a new \`option\` for multiple-choice).
    - **Audio Path Generation (for \`sideB\`):** When adding a new sentence object to the \`sideB\` array, you **MUST** also generate its corresponding \`audioSrc\` path. The path follows a strict pattern: \`public/data/audio/{deck_name}/{cardId}_sideB_{index}.mp3\`.
        - \`{deck_name}\`: The deck name from the "CONTEXT" section (e.g., "Common Meeting" becomes "common_meeting").
        - \`{cardId}\`: The ID of the card being edited.
        - \`{index}\`: The new zero-based index of the sentence in the \`sideB\` array. For example, if there are already 3 items (indices 0, 1, 2), the new item's index will be 3.
        
- **Report:** In your "Resumen de Cambios", state that you accepted and added the user's suggestion.

### Step 3: If the Suggestion is INCORRECT
This is a two-part process. You must modify **both** the card data and your summary.

**A) Modify the Card's UI-Visible Note:**
- **Action:** You **MUST** append the user's incorrect suggestion to the card's *UI-visible note field* to serve as a learning opportunity.
    - For \`flippable\` cards, append to the \`note\` field.
    - For \`multipleChoice\` or \`audioChoice\` cards, append to the \`content.value\` field.
- **Format:**
    1.  Start with a double newline \`\\n\\n\` to separate from previous content.
    2.  Write the incorrect sentence wrapped in tildes (\`~...~\`).
    3.  Follow it with a concise, parenthetical explanation of *why* it is incorrect.
- **Example for a \`note\` field:** \`\\n\\n~I am agree with you~ (Incorrect verb form: 'agree' is a verb and does not need 'to be'.)\`

**B) Report in Your "Resumen de Cambios":**
- **Action:** In your summary for that card, you **MUST** first state the user's verbatim suggestion, and then clearly explain your reasoning for the rejection.
- **Example Summary Line:** \`- Card pv_025: User suggested adding "I am agree with you". This was rejected because the verb 'agree' does not require the auxiliary 'to be'. I have added this clarification to the card's note.\`

## 6. CRITICAL: REQUIRED OUTPUT FORMAT
Your final response MUST NOT be wrapped in a single code block. You must output exactly two distinct parts in the following order:

### Part 1: The JSON Block
1. Output the header: \`## Corrected Cards JSON\`
2. **Open a JSON code block** using \`\`\`json.
3. Provide the single, raw JSON array of the corrected cards.
4. **REMOVE** the \`review_request\` object from every card.
5. **CLOSE the JSON code block** using \`\`\` immediately after the array closing bracket (\`]\`).

### Part 2: The Report (Standard Markdown)
**OUTSIDE** of any code block (do not put this inside the JSON block), output the following report:

1. Output the header: \`## 📝 Improvement Report\`

2. **Batch Statistics:** Provide a vertical list exactly like this:
   - **Total Analyzed:** [X]
   - **Modified:** [Y]
   - **Unchanged:** [Z]
   - **Decisions:**
     - ✅ **Accepted:** [A]
     - ⚠️ **Rejected (Notes Updated):** [B]

3. **Definitions for counting:**
   - **Accepted:** The user's suggestion was correct and added.
   - **Rejected:** The user's suggestion was incorrect; note/explanation added.

#### Resumen de Cambios
- Para cada tarjeta que recibiste para modificar en el json, para evaluar, etc, proporciona un resumen en una lista, explicando qué te pidió el usuario (debes explicitamente copiar y pegar lo que escribio el usuario en su solicitud para cada tarjeta, tal cual lo escribio el usuario, con sus errores de ortografia y todo, es necesario mostrar que pidio el usuario) y qué acción tomaste, ya sea cambio 'aceptado', lo que agregaste, o porque se rechazo el cambio, si añadiste algo nuevo etc etc, detalladamente explicar los cambios en cada card.

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

console.log("DEBUG: Contenido de las tarjetas ANTES de stringify:", cardsToImprove);

        const jsonString = JSON.stringify(cardsToImprove, null, 2);
        const jsonBlock = '```json\n' + jsonString + '\n```';
        return promptHeader + '\n' + jsonBlock;
    }
}
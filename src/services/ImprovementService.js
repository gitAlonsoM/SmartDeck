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
        // 1. Determine which Glossary to load based on Deck ID
        // Default to 'english_rules.json' (Grammar) but switch for specific decks.
        let glossaryFilename = 'english_rules.json'; // Default
        
        // Simple detection logic based on deck ID string
        const deckIdLower = deck.id.toLowerCase();
        if (deckIdLower.includes('phrasal')) {
            glossaryFilename = 'phrasal_verbs.json';
        }
        // Future: Add more 'else if' blocks here for other glossary types (e.g. 'collocations.json')

        // 2. Fetch the determined Glossary
        let glossaryContext = "{}";
        try {
            console.log(`DEBUG: [ImprovementService] Detected Glossary '${glossaryFilename}' for deck '${deck.id}'`);
            const response = await fetch(`public/data/glossary/${glossaryFilename}`);
            
            if (response.ok) {
                const json = await response.json();
                glossaryContext = JSON.stringify(json, null, 2);
                console.log(`VERIFY: Glossary '${glossaryFilename}' loaded successfully. Injected ${Object.keys(json).length} items into Prompt.`);
            } else {
                console.warn(`DEBUG: Glossary file '${glossaryFilename}' not found (404). Prompt will use empty glossary.`);
            }
        } catch (error) {
            console.error("DEBUG: Critical error loading glossary:", error);
        }

        const cardMap = new Map(deck.cards.map(c => [c.cardId, c]));
        const exportBatch = markedCardIds.map(cardId => {
            const card = cardMap.get(cardId);
            const review_request = improvementData[cardId];
            return { ...card, review_request };
        });
        const deckFileName = deck.fileName || `${deck.id}.json`;
        const deckRelativePath = `public/data/${deckFileName}`;

        const correctCommand = `py update_deck.py --deck-file "${deckRelativePath}" --input-file "corrections.json"`;

        // Pass glossaryContext to the prompt generator
        const textToCopy = this._generateImprovementPrompt(deck.name, correctCommand, exportBatch, glossaryContext, deckRelativePath);
        
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

static _generateImprovementPrompt(deckName, correctCommand, cardsToImprove, glossaryJson, deckFilePath) {

        const promptHeader = `

# SmartDeck Card Improvement Prompt V9.0 (Glossary Enabled)
## 1. ROLE AND GOAL
You are an expert Content Quality Analyst and Instructional Designer for 'SmartDeck'. Your goal is to significantly enhance the pedagogical value of a batch of flashcards based on user feedback and your own expertise.

## 2. CONTEXT
- **Deck Name:** "${deckName}"

## 3. CARD DATA STRUCTURES & FIELD RULES
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
- \` - **CRITICAL RULE:** This field may start with a grammar rule ID. The required literal format for this ID is **[ID]** (e.g., **[12]**), which links to a grammar rule. **This syntax MUST NOT be altered, corrected, or removed.**
    - **Exception:** Only remove it if the user explicitly asks to "Remove the modal".
    - **Injection:** To add a modal, see Section 6.

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
3.  **Preserve Existing Content**: When adding to fields like \`note\`, ALWAYS append!

### 🚫 4.1 THE "ZERO NOISE" POLICY (MANDATORY)
You must adhere to this strict style guide for all card content:
* **No Meta-Labels:** Do NOT use labels like "Answer:", "Translation:", "Example:", "In English:", or "Meaning:". The user understands the context; just give the content.
* **No Numbered Titles:** Never write titles like ~"10 Examples"~. Just use "Examples". Content matters, not the count.
* **Direct Approach:** Deliver pure educational content. No preambles, no conversational fillers like "Here is the corrected sentence".
* **No Visual Metadata:** Never include the name of the color, style, or formatting in the text title or body (e.g., NEVER write "Title (Green)" or "Word (Bold)"). Just apply the HTML class; do not describe it in text.

## 5. SPECIAL RULE: Handling "add_answer" and User Suggestions
This is the most critical rule. When a user request includes the reason \`add_answer\` or provides a new sentence in the \`user_comment\`, you MUST follow this logic:

### Step 1: Evaluate the User's Suggested Sentence
Analyze the sentence provided in \`review_request.user_comment\`.

### Step 2: If the Suggestion is CORRECT
- **Action:** Add the new, correct sentence to the card's data (e.g., to the \`sideB\` array for flippable cards, or as a new \`option\` for multiple-choice).
    - **Audio Path Generation (for \`sideB\`):** When adding a new sentence object to the \`sideB\` array, you **MUST** also generate its corresponding \`audioSrc\` path. The path follows a strict pattern: \`public/data/audio/{deck_name}/{cardId}_sideB_{index}.mp3\`.
        - \`{deck_name}\`: The deck name from the "CONTEXT" section (e.g., "Common Meeting" becomes "common_meeting").
        - \`{cardId}\`: The ID of the card being edited.
        - \`{index}\`: The new zero-based index of the sentence in the \`sideB\` array.

- **Report:** In your "Improvement Report", state that you accepted and added the user's suggestion.

## 6. SPECIAL RULE: HANDLING "ADD MODAL" REQUESTS (SMART SEARCH & CREATE)
If the user asks to "Add/Create a modal for [Topic]" (e.g., "Add modal for Present Simple", "Crear modal si no existe", "Link modal"):

### STEP A: THE DUPLICATE CHECK (MANDATORY)
Before creating anything, you must rigorously scan the **GLOSSARY DATABASE** (Section 9).
- **Scan:** Look for exact matches, synonyms, or existing rules that cover the requested topic.
- **Decision:**
    - **FOUND?** -> Go to **STEP B (Linking)**. Do NOT create a duplicate.
    - **NOT FOUND?** -> Go to **STEP C (Creation)**.

### STEP B: LINKING (Existing Modal)
1. **Identify ID:** Use the ID found in the database.
2. **Inject:** Prepend \`**[ID]**\\n\\n\` to the card's \`note\` field.
3. **Report:** "Found existing modal **[ID]** ('Title'). Linked successfully."

### STEP C: CREATION (New Modal)
*Only execute this if the topic is completely absent from the database.*
1. **Generate ID:** Find the **highest numeric ID** currently in the Glossary Database and add **+1** (e.g., if max is 124, use 125).
2. **Design:** Create the content adhering strictly to **Rule 7 (The Anti-Shit Protocol)**.
3. **Output:**
    - **JSON:** Add the new object to the **Improved Modals JSON** block (Part 2 of Output).
    - **Card:** Inject the new link \`**[NewID]**\\n\\n\` to the card's \`note\`.
4. **Report:** "Topic not found in DB. Created **NEW Modal [NewID]** and linked it."

### Step 3: If the Suggestion is INCORRECT
This is a two-part process. You must modify **both** the card data and your summary.

**A) Modify the Card's UI-Visible Note:**
- **Action:** You **MUST** append the user's incorrect suggestion to the card's *UI-visible note field* to serve as a learning opportunity.
- **Format:**
    1.  Start with a double newline \`\\n\\n\` to separate from previous content.
    2.  Write the incorrect sentence wrapped in tildes (\`~...~\`).
    3.  Follow it with a concise, parenthetical explanation of *why* it is incorrect.
    - **Example:** \`\\n\\n~I am agree~ (Incorrect: 'Agree' is a verb, use 'I agree'.)\`
    4.  **Demarcation:** Enclose correct keywords in square brackets \`[...]\`.

**B) Report in Your "Improvement Report":**
- **Action:** State the user's verbatim suggestion and explain why it was rejected.

## 6. SPECIAL RULE: HANDLING "ADD MODAL" REQUESTS (NEW GLOSSARY LOGIC)
If the user's \`user_comment\` asks to "Add the modal for [Topic]" (e.g., "Add modal for Present Simple", "Poner modal de phrasal verbs", "Falta link al modal"):

1.  **SEARCH**: Look up the topic in the **GLOSSARY DATABASE** provided in Section 8 below. Match the topic title or keywords.
2.  **IDENTIFY ID**: Find the numerical key (ID) for that entry (e.g., "1", "105", "116").
3.  **INJECT**: You must prepend the ID using the strict syntax \`**[ID]**\` followed by a double newline \`\\n\\n\` to the card's \`note\` field (or \`content.value\`).
    - **Format:** \`"note": "**[105]**\\n\\nExisting note content..."\`
4.  **REPORT**: In the Improvement Report, confirm: "Added Modal Link **[105]** ('Title of Modal') as requested."

## 7. SPECIAL RULE: MODAL CONTENT IMPROVEMENT (THE "ANTI-SHIT" PROTOCOL)
If the user asks to "Improve Modal [ID]", "Fix Modal [ID]", or "Rewrite Modal [ID]" content (e.g., "Mejorar el modal 50", "Rewrite modal content for clarity"), you must regenerate its content following these **MANDATORY DESIGN STANDARDS**:

### A. The "Algorithm of Density" (Quantity)
*Never create basic modals with few examples.*
- **Single Concept (1 Word):** Exactly **6 examples**.
- **Comparison (2 Words):** Minimum **12 examples** (6 per word/case).
- **Complex Topic:** Minimum **18 examples**.
- *Objective:* The user must see enough patterns to understand the rule intuitively.

### B. MOBILE FIRST ARCHITECTURE (NO GRIDS)
**STRICT PROHIBITION:** You must **NEVER** use \`grid-cols-2\`, \`grid-cols-3\`, or any side-by-side layout. The application is used on mobile devices, and tables/grids break the UI.
- **Vertical Only:** All content must be stacked vertically.
- **Comparison Pattern:** Instead of side-by-side columns, use Stacked Groups.
    - *Wrong:* [ Box A ] [ Box B ]
    - *Correct:*
      [ Box A ]
      [ Box B ]

### C. HTML & Tailwind Palette (Visuals & Context)
You must use **ONLY** the following Tailwind classes for highlighting. Do NOT use random colors or hex codes.

**1. The Palette (Your Toolbox):**
- \`text-green-400\`
- \`text-yellow-400\`
- \`text-cyan-400\`
- \`text-violet-400\`
- \`text-orange-400\`

**2. Semantic Assignment (Context-Dependent):**
- **Standard Grammar (Default):** Use Green for Verbs/Correct forms, Yellow for Objects/Focus words, Cyan for Auxiliaries/Negatives, Violet for Wh-Words/Titles.
- **Contextual Adaptation (CRITICAL):** For specific topics (like Connectors, Logical Groups, or Conditionals), you **MUST** adapt the color mapping to distinguish the concepts being taught.
    - *Example (Cause & Effect):* Assign \`text-green-400\` to all "Cause" keywords and \`text-cyan-400\` to all "Result" keywords to create visual logic.
    - *Goal:* Use color to differentiate the **categories** or **logic** of the modal, not just the grammar.

**3. Visual Rules:**
- **Visual Silence:** NEVER write the color name (e.g., "(Green)", "Color: Red") in the text or titles. Apply the class silently.
- **Backgrounds:** Use \`bg-gray-800 p-2 rounded\` for code/structure blocks.

### C. Structure (The Formula)
Unless it is a purely lexical modal (idioms), you **MUST** include a Structure section.
- **HTML:** \`<h3 class='font-semibold text-lg mb-2 text-white'>Structure:</h3>\`
- **Consistency:** If "Verb" is \`text-green-400\` in the Structure, it **MUST** be green in all Examples.

### D. Output Location
You must output the full JSON object for the modified modal(s) in a **separate JSON block** (See Section 10, Part 2).

## 8. SPECIAL RULE: HANDLING META-NOTICES
If the user writes "AVISAR AL USUARIO" or "CAMBIAR APP", listing in Report (Section 10, Part 3).

## 9. GLOSSARY DATABASE (REFERENCE ONLY)
Use this data to resolve IDs, adherir modales a cards (Solo cuando se solicite explicitamente en la card que se agregue un modal existente, se agregara el modal en ella.) or as a base for improvements.
En caso que el mensaje de la card solicite 'agregar modal a la card, o crear uno', se debe revisar el completo listado de modales, y en caso que aun no este creado, podras crear uno nuevo, siguiendo la sintaxis estricta de los modales. 
\`\`\`json
${glossaryJson}
\`\`\`

## 10. CRITICAL: REQUIRED OUTPUT FORMAT & STRUCTURE
Your final response MUST be structured into distinct parts.
⛔ **PROHIBITED:** Do NOT wrap the entire response in a single code block.

### Part 1: The Code Artifact (Cards)
1. Header: \`## 1. Corrected Cards JSON\`
2. JSON Block (\`\`\`json) with the array of corrected cards.
3. **MANDATORY CLEANUP:** You must STRIP/REMOVE the \`review_request\` object and all its contents (\`user_comment\`, \`reasons\`) from every card. The output must be pure card data.
4. **IMMUTABLE STRUCTURE:**
   - **NO NEW FIELDS:** Do NOT add fields like \`content\` if the original card did not have them. Tu no cambias la estructura del JSON, solo cambias el contenido de este.
   - **NO DELETIONS:** Keep all original fields (except the metadata mentioned in step 3).

### Part 2: Improved Modals JSON (Optional)
**ONLY** include this section if you improved/redesigned a modal (Rule 7).
1. Header: \`## 2. Improved Modals JSON\`
2. Create a **Single JSON Block** (\`\`\`json) containing an object where keys are the Modal IDs.
   - **Example:**
   \`\`\`json
   {
     "50": {
       "title": "Improved Title",
       "content": "<p>New HTML content...</p>"
     },
     "102": { ... }
   }
   \`\`\`

### Part 3: The Improvement Report (Markdown)
1. Header: \`## 3. 📝 Improvement Report\`

#### A. Batch Statistics
- **Total Analyzed:** [X]
- **Modified Cards:** [Y]
- **Improved Modals:** [Z]

#### B. Change Log Summary
- **Card [ID] / Modal [ID]:**
  - **User Request:** "..." . IMPORTANTE!: DEBES AÑADIR EL User Request exactamente como el usuario lo solicito en esta seccion. Es necesario ver explicitamente lo que usuario solicito en "User Request", en el punto #### B. Change Log Summary por cada card.
  - **Action Taken:** "..."   IMPORTANTE!: DEBES añadir EN Action Taken, si la solicitud del usuario fue "Rejected, Accepted, others...". Y decir explicatamente que cambio has realizado en la card, ya sea, agregado una nueva sentencia, alguna nota explicativa, se agrego algun nuevo modal, se rechazo a causa de.., etc etc. Esto debe hacerse para cada card.

#### C. 📢 Special User Notices
Si el usario en alguna 'nota' o 'apunte' de card, explicitamente solicito algo como "Avisar al usuario sobre ... " esas notas se añadiran en esta seccion para que el usuario las vea facilmente. Este espacio es para que el usuario que dejo la "Nota" o "apunte" pueda ver esos mensajes especiales en esta seccion. En caso de no encontrarse ningun mensaje especial, se pondra en esta seccion "No special messages to highlight".

#### D. Next Steps
- **Step 1:** Save Card JSON to \`corrections.json\`.
- **Step 2:** (If Modals Changed) Update \`public/data/glossary/YOUR_GLOSSARY_FILE.json\` with the content from Part 2.
- **Step 3:** Run update command:
\`\`\`bash
${correctCommand}
\`\`\`
- **Step 4:** Run audio generator (if needed).
\`\`\`bash
py generate_audios_google.py "${deckFilePath}"
\`\`\`

---
[BEGIN CARD BATCH FOR YOUR REVIEW]
---
`;

        const jsonString = JSON.stringify(cardsToImprove, null, 2);
        const jsonBlock = '```json\n' + jsonString + '\n```';
        return promptHeader + '\n' + jsonBlock;
    }
}
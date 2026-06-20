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
        const markedCardIds = Object.keys(improvementData || {});
        
        const modalImprovements = StorageService.loadAllModalImprovements() || {};
        const markedModalIds = Object.keys(modalImprovements);

        if (markedCardIds.length === 0 && markedModalIds.length === 0) {
            return { success: false, message: 'There are no cards or modals marked for improvement to export.' };
        }
        // Build a Modal Catalog: every modal across every glossary, minified to
        // { title, description } for lookup/dedup. Modals the user marked for
        // improvement are overlaid with the FULL content + user_comment so the
        // LLM has everything it needs to rewrite them.
        const catalog = {};
        for (const [alias, name] of Object.entries(GlossaryService.GLOSSARY_ALIASES)) {
            const g = await GlossaryService.loadGlossary(name);
            if (!g) {
                console.warn(`[ImprovementService] Glossary '${name}' failed to load; skipping in catalog.`);
                continue;
            }
            for (const id of Object.keys(g)) {
                catalog[`${alias}:${id}`] = {
                    title: g[id].title,
                    description: g[id].description || ''
                };
            }
        }
        for (const qid of markedModalIds) {
            const [alias, id] = qid.split(':');
            const name = GlossaryService.aliasToName(alias);
            const g = name ? GlossaryService.getCachedGlossary(name) : null;
            if (g && g[id]) {
                catalog[qid] = {
                    title: g[id].title,
                    description: g[id].description || '',
                    content: g[id].content,
                    user_comment: modalImprovements[qid].user_comment
                };
            } else {
                console.warn(`[ImprovementService] Marked modal '${qid}' not resolvable in any glossary; keeping minified.`);
            }
        }
        const catalogJson = JSON.stringify(catalog, null, 2);
        console.log(`VERIFY: [ImprovementService] Catalog built with ${Object.keys(catalog).length} modals (${markedModalIds.length} with full content).`);

        const cardMap = new Map(deck.cards.map(c => [c.cardId, c]));
        const exportBatch = markedCardIds.map(cardId => {
            const card = cardMap.get(cardId);
            const review_request = improvementData[cardId];
            return { ...card, review_request };
        });
        const deckFileName = deck.fileName || `${deck.id}.json`;
        const deckRelativePath = `public/data/${deckFileName}`;

        const correctCommand = `py update_deck.py --deck-file "${deckRelativePath}" --input-file "corrections.json"`;
        console.log(`VERIFY: [ImprovementService] Exporting deck alongside ${markedModalIds.length} modal improvements.`);
        // Sub-extract for the Modal Improvement Requests section: just qid -> user_comment.
        // The full content/title already live inside the catalog entry; this section just
        // tells the LLM which qids it must regenerate in Part 2.
        const modalImprovementRequests = {};
        markedModalIds.forEach(qid => {
            modalImprovementRequests[qid] = {
                user_comment: modalImprovements[qid].user_comment
            };
        });

        // Build live reference examples for §7G — pulled directly from the cached
        // glossary so the LLM always sees real, up-to-date modal content.
        const EXAMPLE_IDS = { er: ['9', '33', '68', '82'], pv: ['1', '61'] };
        const exampleModals = {};
        for (const [alias, ids] of Object.entries(EXAMPLE_IDS)) {
            const name = GlossaryService.aliasToName(alias);
            const g = name ? GlossaryService.getCachedGlossary(name) : null;
            if (!g) continue;
            for (const id of ids) {
                if (g[id] && g[id].content) {
                    exampleModals[`${alias}:${id}`] = {
                        title: g[id].title,
                        description: g[id].description || '',
                        content: g[id].content
                    };
                }
            }
        }
        console.log(`VERIFY: [ImprovementService] Built ${Object.keys(exampleModals).length} live reference examples for the prompt.`);

        const textToCopy = this._generateImprovementPrompt(deck.name, correctCommand, exportBatch, catalogJson, deckRelativePath, modalImprovementRequests, exampleModals);
        try {
            await navigator.clipboard.writeText(textToCopy);
            return { 
                success: true, 
                cardCount: exportBatch.length, 
                modalCount: markedModalIds.length 
            };
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return { success: false, message: 'Could not copy data to clipboard. See console for details.' };
        }
    }

    /**
     * Generates a definitive, professional-grade prompt for an LLM. (Moved from App.js)
     * @private
     */

static _generateImprovementPrompt(deckName, correctCommand, cardsToImprove, glossaryJson, deckFilePath, modalImprovements, exampleModals = {}) {

        const promptHeader = `

# SmartDeck Card Improvement Prompt V10.8 (New 'misc' glossary for idioms / other uses, alongside er = english_rules and pv = phrasal_verbs)
## 🎯 1. ROLE AND GOAL
You are an expert for 'SmartDeck'. Your goal is to significantly enhance the pedagogical value of a batch of flashcards based on user feedback AND THE NEXT RULES!.


## 📂 2. CONTEXT
- **Deck Name:** "${deckName}"


## 🗂️ 3. CARD DATA STRUCTURES & FIELD RULES
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
    - **CRITICAL RULE (note field):** This field may start with a qualified modal ID. The required literal format is \`**[alias:id]**\` (e.g., \`**[er:12]**\` for english_rules, \`**[pv:188]**\` for phrasal_verbs, \`**[misc:3]**\` for miscellaneous), which links to a modal in the MODAL CATALOG at runtime. **This syntax MUST NOT be altered, corrected, or removed.** Aliases: \`er\` = english_rules, \`pv\` = phrasal_verbs, \`misc\` = miscellaneous (idioms / other uses).
    - **Exception:** Only remove it if the user explicitly asks to "Remove the modal".
    - **Injection:** To add a modal, see Section 6.

### C) Grammar Audio-Choice ('audioChoice') Card
- \`cardId\`: **READ-ONLY**.
- \`audioSrc\`: **READ-ONLY**.
- \`category\`, \`hint\`: **MODIFIABLE**.
- \`sentenceParts\`, \`options\`: **MODIFIABLE TEXT**.
- \`correctAnswer\`: **SEMI-READ-ONLY**.
- \`content.value\`: **PRIMARY VALUE-ADD FIELD**.


## ⚙️ 4. CORE WORKFLOW & RULES
1.  **Analyze Request**: Carefully read the \`review_request\` for each card.
2.  **Preserve Existing Content**: When adding to fields like \`note\`, IMPORTANT: ALWAYS append!. NUNCA BORRES NOTAS EXISTENTES, A NO SER QUE LA INFORMACION PRESENTE YA NO APLIQUE EN ABSOLUTO AL ESTADO ACTUAL DE LA CARD. Always separate each new block of appended content with \`\\n\\n\` — see the "Mandatory Paragraph Break on Append" rule in §4.1.

### 4.1 THE "ZERO NOISE" POLICY (MANDATORY)
You must adhere to this strict style guide for all card content:
* **No Meta-Labels:** Do NOT use labels like "Answer:", "Translation:", "Example:", "In English:", or "Meaning:". The user understands the context; just give the content.
* **No Numbered Titles:** Never write titles like ~"10 Examples"~. Just use "Examples". Content matters, not the count.
* **Direct Approach:** Deliver pure educational content. No preambles, no conversational fillers like "Here is the corrected sentence".
* **No Visual Metadata:** Never include the name of the color, style, or formatting in the text title or body (e.g., NEVER write "Title (Green)" or "Word (Bold)"). Just apply the HTML class; do not describe it in text.
* **Strict Append-Only Rule:** All new content (definitions, corrections, or explanations) MUST be added ONLY at the VERY END of the existing string in the 'note' field. Prepending or inserting at the beginning is strictly prohibited. EXCEPTION: The ONLY element permitted at the beginning of the note field is a qualified modal ID (e.g., **[er:12]**\\n\\n or **[pv:188]**\\n\\n).
* **Mandatory Paragraph Break on Append (CRITICAL):** Whenever you append ANY new content to a \`note\` field that already has existing text, you MUST start with a double newline \`\\n\\n\`. This is NON-NEGOTIABLE — it creates the visual paragraph break the reader needs. A note that already ends with \`\\n\\n\` should NOT get a second one; otherwise always add it. **WRONG:** \`existing note.New explanation here.\` **CORRECT:** \`existing note.\\n\\nNew explanation here.\`


## 🛠️ 5. SPECIAL RULE: Handling "add_answer" and User Suggestions
This is the most critical rule. When a user request includes the reason \`add_answer\` or provides a new sentence in the \`user_comment\`, you MUST follow this logic:

### Step 1: Evaluate the User's Suggested Sentence
Analyze the sentence provided in \`review_request.user_comment\`.
En el campo user_comment (User Request) el usuario puede añadir una o más peticiones, distinguirlas y abordarlas individualmente. Por ejemplo un usuario puede solicitar verificar una nueva posible alternativa correcta, añadir un nuevo modal, u otra peticion y todo en la misma card.
**CRITERIO DE EVALUACIÓN FLEXIBLE:** No busques traducciones directas, literales o 100% perfectas gramaticalmente. Si la oración en inglés propuesta por el usuario es una expresión común, natural, del día a día, y que transmite el mismo significado según el contexto (es decir, "sirve" y se "entiende" por gente común), entonces es VÁLIDA y DEBE ser aceptada como correcta. Se prioriza el inglés natural y práctico sobre la precisión lingüística estricta o experta.

### Step 2: If the Suggestion is CORRECT
- **Action:** Add the new, correct sentence to the card's data (e.g., to the \`sideB\` array for flippable cards, or as a new \`option\` for multiple-choice).
    - **Audio Path Generation (for \`sideB\`):** When adding a new sentence object to the \`sideB\` array, you **MUST** also generate its corresponding \`audioSrc\` path. The path follows a strict pattern: \`public/data/audio/{deck_name}/{cardId}_sideB_{index}.mp3\`.
        - \`{deck_name}\`: The deck name from the "CONTEXT" section (e.g., "Common Meeting" becomes "common_meeting").
        - \`{cardId}\`: The ID of the card being edited.
        - \`{index}\`: The new zero-based index of the sentence in the \`sideB\` array.

- **Report:** In your "Improvement Report", state that you accepted and added the user's suggestion.

### Step 3: If the Suggestion is INCORRECT
This is a two-part process. You must modify **both** the card data and your summary.

**A) Modify the Card's UI-Visible Note:**
- **Action:** You **MUST** append the user's incorrect suggestion to the card's *UI-visible note field* to serve as a learning opportunity. Recuerda no borrar lo que ya habia, a no ser que sea una modificacion general en la card. Si es solo una explicacion, debe añadirse al FINAL del resto de apuntes que ya hayan presentes.
    En caso que la correccion de la card involucre un cambio grande, entonces deben adapatarse las notas de la card, para que la informacion ahora sea consistente. 
- **Format:**
    1.  Start with a double newline \`\\n\\n\` to separate from previous content.
    2.  Write the incorrect sentence wrapped in tildes (\`~...~\`).
    3.  **MANDATORY:** Follow it immediately with the explanation. **DO NOT** use parentheses \`()\` around the explanation and **DO NOT** use labels like "Incorrect:" or "Note:". Just write the text naturally.
    - **CORRECT Format Example:** \`\\n\\n~I am agree~ is not valid because 'agree' is a verb, not an adjective.\`
    - **WRONG Format Example:** \`\\n\\n~I am agree~ (Incorrect: It is a verb)\`
    4.  **Demarcation:** Enclose correct keywords in square brackets \`[...]\`.

**B) Report in Your "Improvement Report":**
- **Action:** State the user's verbatim suggestion and explain why it was rejected.


## 🔍 6. SPECIAL RULE: HANDLING "ADD MODAL" REQUESTS (SMART SEARCH & CREATE)
If the user asks to "Add/Create a modal for [Topic]" (e.g., "Add modal for Present Simple", "Crear modal si no existe", "Link modal"):

### STEP A: THE DUPLICATE CHECK (MANDATORY)
Before creating anything, rigorously scan the **MODAL CATALOG** (Section 9). The catalog is keyed by qualified ID \`alias:id\`. Use the entry's \`title\` and \`description\` to judge relevance.
- **Scan:** Look for exact matches, synonyms, or existing rules that cover the requested topic.
- **Decision:**
    - **FOUND?** -> Go to **STEP B (Linking)**. Do NOT create a duplicate.
    - **NOT FOUND?** -> Go to **STEP C (Creation)**.

### STEP B: LINKING (Existing Modal)
1. **Identify qualified ID:** Use the \`alias:id\` key from the catalog (e.g., \`er:12\`, \`pv:188\`).
2. **Inject:** Prepend \`**[alias:id]**\\n\\n\` to the card's \`note\` field.
3. **Report:** "Found existing modal **[alias:id]** ('Title'). Linked successfully."

### STEP C: CREATION (New Modal)
*Only execute this if the topic is completely absent from the catalog.*

> ⚠️ **GENERALITY PRINCIPLE (NON-NEGOTIABLE — READ FIRST):** A modal is a **reusable reference for the whole topic**, NOT a footnote for the single card that triggered its creation. The card only tells you *which* topic to document — it does NOT define the scope.
> - **WRONG:** The card uses "take off" meaning *to remove clothes*, so you build a modal that ONLY teaches "take off = remove clothes" with clothing examples. This is too narrow and useless for every other card.
> - **RIGHT:** Build a **general "take off" modal** that covers its most common meanings (aircraft departing, removing clothes, leaving suddenly, business success, etc.), naturally **including** the clothing sense the card needed.
> - This applies to **everything**: phrasal verbs, grammar rules, vocabulary, etc. Always design for the **most common real-world uses of the topic**, then make sure the specific case from the card is one of the sections/examples — never the only one.
> - If a topic has several distinct meanings or uses, give each its **own section** (per §7F Clean Architecture) instead of collapsing the modal onto one narrow use.

1. **Pick alias:** Use the alias that matches the topic (\`er\` for grammar rules, \`pv\` for phrasal verbs, \`misc\` for idioms / fixed expressions / other lexical items that are neither a grammar rule nor a phrasal verb).
2. **Generate ID:** Within that alias, find the **highest numeric id** in the catalog and add **+1** (e.g., if the max \`er:\` id is 218, the new one is \`er:219\`). IDs are per-alias — they do NOT collide between aliases.
3. **Design:** Create the content adhering strictly to **Rule 7 (The Anti-Shit Protocol)**. Use the live examples in §7G as your ground-truth format reference.
4. **Output:**
    - **JSON object shape:** Every new modal MUST include exactly these three fields:
      - \`title\`: the topic name (same string you would use as the catalog title).
      - \`description\`: a 1-line plain-English summary, max 30 words — used by the AI to identify the modal in future exports.
      - \`content\`: the full HTML string following the Anti-Shit Protocol.
    - **JSON:** Add the new object to the **Improved Modals JSON** block (Part 2 of Output) inside the section labeled with the matching file (e.g., \`📁 english_rules.json\` for \`er:\`, \`📁 phrasal_verbs.json\` for \`pv:\`, \`📁 miscellaneous.json\` for \`misc:\`). Use the **bare numeric id** as the key (e.g., \`"219": { "title": "...", "description": "...", "content": "<p>...</p>" }\`). **NEVER include the alias prefix in the key.**
    - **Card:** Inject the new link \`**[alias:NewID]**\\n\\n\` to the card's \`note\`.
5. **Report:** "Topic not found in catalog. Created **NEW Modal [alias:NewID]** and linked it."


## 🏗️ 7. SPECIAL RULE: MODAL CONTENT IMPROVEMENT (THE "ANTI-SHIT" PROTOCOL)
If a modal in the MODAL CATALOG (Section 9) appears with full \`content\` and a \`user_comment\` field, the user has flagged it for improvement — you MUST regenerate its content following these **MANDATORY DESIGN STANDARDS**. The qualified id (\`alias:id\`) of each such modal also appears in Section 10 Part 3 D for cross-reference:

### A. The "Algorithm of Density" (Quantity)
*Never create basic modals with few examples.*
- **Single Concept (1 Word):** Exactly **6 examples**.
- **Comparison (2 Words):** Minimum **12 examples** (6 per word/case).
- **Complex Topic:** Minimum **18 examples**.
- *Objective:* The user must see enough patterns to understand the rule intuitively.
- Como se te dara de ejemplos un largo listado de modales, usalos para encontrar patrones y crear el nuevo modal solicitado, hay diferentes tipos de modal segun su naturaleza, algunos que son mas complejos es preferible dividirlo en secciones con unos cuantos ejemplos, para facilitar el aprendizaje. Otros modales no requieren de secciones al ser mas simples. Mira el listado de modales y sabras como proceder con el nuevo modal.

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

### D. Structure (The Formula)
Unless it is a purely lexical modal (idioms), you **MUST** include a Structure section.
- **HTML:** \`<h3 class='font-semibold text-lg mb-2 text-white'>Structure:</h3>\`
- **Consistency:** If "Verb" is \`text-green-400\` in the Structure, it **MUST** be green in all Examples.

### E. Output Location
You must output the full JSON object for the modified modal(s) in a **separate JSON block** (See Section 10, Part 2).

### F. THE "CLEAN ARCHITECTURE" PROTOCOL (STRICT): Cuando crees o mejores un modal especifico:
1. **Complete Decoupling:** If a modal covers multiple concepts/structures, you **MUST** create separate sections for each using HTML dividers.
   - **Order:** [Rule Description] -> [Visual Structure Block] -> [Dedicated Example List].
   - **Prohibition:** Never interleave different rules within a single list of examples.
2. **Anti-Noise Policy:**
   - **No Metadata:** Remove all helper labels like \`(Service)\`, \`(Comparison)\`, or \`(Negative)\` inside lists, SOLO DEBES PONER LAS ORACIOENS DE EJEMPLO, SIN NECESIDAD DE ANUNCIARLAS. 
   - **No Repetition:** In lists of fixed expressions, do NOT use the expression as a title/label. Just write the full sentence.
3. **Smart Coloring (Visual Focus):**
   - **Constraint:** Do NOT colorize every noun, verb, or object. El proposito de usar colores es resaltar la regla, palabras que el modal intenta enseñar, no usarlos libremente para cada noun, verb, adverb presente, si se usan de forma incorrecta pierden su proposito resaltar lo que importa y se vuelven contraproducentes.
   - **Target Only:** ONLY highlight the specific grammar point or keyword being taught (e.g., if teaching "At least", only highlight "at least"). Keep the rest of the sentence plain white/gray to maximize contrast and focus.


### G. LIVE REFERENCE EXAMPLES (from the active glossary)
These are real, complete modals pulled directly from the live glossary at export time. **Study their structure, coloring logic, and density before designing any new or improved modal.** They are your ground truth for correct output format.

When creating a NEW modal (§6 STEP C), your output object MUST share the same shape as these entries: \`{ title, description, content }\`.
\`\`\`json
${JSON.stringify(exampleModals, null, 2)}
\`\`\`


## 📢 8. SPECIAL RULE: HANDLING META-NOTICES
If the user writes "AVISAR AL USUARIO" or "Avisame en el chat sobre esto.. " o algo asi, listing in Report (Section 10, Part 3).


## 📚 9. MODAL CATALOG (REFERENCE ONLY)
The catalog is keyed by qualified id \`alias:id\` (aliases: \`er\` = english_rules, \`pv\` = phrasal_verbs, \`misc\` = miscellaneous / idioms / other uses). It contains EVERY modal across EVERY glossary.

**Entry shape — and what completeness MEANS (read carefully):**
- **Minified entry = REFERENCE ONLY.** The vast majority of entries carry just \`{ title, description }\` and NO \`content\`. This is intentional: they are NOT incomplete by mistake. A modal shown without its body is there purely so you can scan, deduplicate, and link it to a card if the user explicitly asks. You do **NOT** rewrite, regenerate, or touch these in any way.
- **Complete entry (with \`content\` + \`user_comment\`) = MODIFICATION REQUESTED.** ONLY the modals the user has explicitly flagged for improvement are sent complete (full \`content\` plus the user's \`user_comment\`). The presence of a \`user_comment\` is the decisive signal — it means "the user wants this one changed". For each such entry you MUST regenerate its content in Part 2 (see Section 7 Anti-Shit Protocol).
- **In short:** complete in the catalog ⇒ revise it; minified ⇒ leave it alone, it's just a link target.
- ⚠️ Do NOT confuse these with the **live reference examples in §7G**: those also carry full \`content\` but have **no \`user_comment\`** — they are format models to study, never things to modify.

**⚠️ FORMAT DISTINCTION — 3 contexts, 3 different formats (CRITICAL):**
| Context | Format | Example |
|---|---|---|
| Catalog keys (internal, read-only) | \`alias:id\` | \`er:12\`, \`pv:188\`, \`misc:3\` |
| Card \`note\` field (UI reference, app parses at runtime) | \`**[alias:id]**\` | \`**[er:12]**\`, \`**[pv:188]**\`, \`**[misc:3]**\` |
| Glossary JSON file key (Part 2 output) | bare numeric string | \`"12"\`, \`"188"\`, \`"3"\` |

- The catalog keys (\`alias:id\`) are your **internal routing tool only** — they tell you which file a modal belongs to and prevent ID collisions across aliases. They are **NEVER** written as JSON keys in Part 2 or in the actual glossary files.
- The **bare numeric key** in Part 2 mirrors exactly how the entry is stored in \`english_rules.json\`, \`phrasal_verbs.json\`, or \`miscellaneous.json\`.
- The **qualified syntax** \`**[alias:id]**\` in card \`note\` fields is what the app parses and renders as a clickable modal at runtime.

**Linking discipline:** adherir modales a cards solo cuando se solicite explicitamente en la card que se agregue un modal existente del listado. Si el usuario no solicita agregar modal en la card y la card no tiene modal, no agregues modal — es okay tener cards sin modales. No es tu decisión agregarle modales a las cards si no te lo han solicitado.

**Creation discipline:** Si el usuario pide 'agregar modal a la card' o 'crear modal para la card', primero revisa el catalogo. Si no existe nada relevante, crea uno nuevo siguiendo Sección 6 STEP C: nuevo id = (max id dentro del mismo alias) + 1; nunca colisiona con el otro alias.
\`\`\`json
${glossaryJson}
\`\`\`


## 🚨 10. CRITICAL: REQUIRED OUTPUT FORMAT & STRUCTURE
Your final response MUST be structured into distinct parts. Every single section header (Parts 1, 2, and 3) MUST appear in your output exactly as shown below, regardless of whether you have data for them or not. If a section does not apply, you MUST output the header followed by an empty JSON block or a "Not applicable" message.
⛔ **PROHIBITED:** Do NOT wrap the entire response in a single code block.

### Part 1: The Code Artifact (Cards)
1. Header: \`## 1. Corrected Cards JSON\`
2. JSON Block (\`\`\`json) with the array of corrected cards. If no cards were provided or modified, you MUST output an empty array: 
\`\`\`json
[]
\`\`\`
3. **MANDATORY CLEANUP:** You must STRIP/REMOVE the \`review_request\` object and all its contents (\`user_comment\`, \`reasons\`) from every card. The output must be pure card data.
4. **IMMUTABLE STRUCTURE:**
   - **NO NEW FIELDS:** Do NOT add fields like \`content\` if the original card did not have them. Tu no cambias la estructura del JSON, solo cambias el contenido de este.
   - **NO DELETIONS:** Keep all original fields (except the metadata mentioned in step 3).

### 🚨 FATAL ERROR PREVENTION: METADATA PURGE
- **MANDATORY:** You MUST double-check every card object before finalizing Part 1. 
- **STRICT DELETION:** The fields \`review_request\`, \`user_comment\`, and \`reasons\` MUST NOT exist in the final JSON. 
- If Part 1 contains even a single \`review_request\` field, the task is considered a total failure. 
- **CLEAN DATA ONLY:** Your output must be ready to be parsed by a machine that does not know what a "review_request" is.


### 🚨 LOGICAL PURGE ALGORITHM (STRICT ENFORCEMENT)
To avoid structural errors, you MUST process Part 1 using this mental workflow before outputting:
1. **IDENTIFY**: Locate the \`review_request\` key in the input object.
2. **DELETE**: Perform a literal 'Key Deletion'. Do NOT set to \`null\`, do NOT leave as \`{}\`, do NOT leave the key present.
3. **VALIDATE**: If the string "review_request" or "user_comment" appears in your Part 1 OUPUT, the response is INVALID. 

**STRICT NEGATIVE CONSTRAINT**: 
- Setting \`"review_request": null\` is a VIOLATION of your core instructions. 
- The output of Part 1 must be a valid JSON array where each object contains ONLY the functional fields of the card (\`cardId\`, \`sideA\`, \`sideB\`, \`note\`, etc.).


### Part 2: Improved Modals JSON
1. Header: \`## 2. Improved Modals JSON\`
2. **MANDATORY:** You MUST output this header even if no modals were improved.
3. If no modals were improved, output exactly:
   \`No modals to update.\`
4. If modals were improved, output **one labeled JSON block per glossary file**. Never mix IDs from different files in the same block. Use this exact format — one block for \`er:\` modals, one for \`pv:\` modals, one for \`misc:\` modals (omit a block if that alias has no changes):

   \`📁 english_rules.json\`
   \`\`\`json
   {
     "50": {
       "title": "Improved Title",
       "description": "Updated 1-line summary, max 30 words.",
       "content": "<p>New HTML content...</p>"
     }
   }
   \`\`\`

   \`📁 phrasal_verbs.json\`
   \`\`\`json
   {
     "188": { "title": "...", "description": "...", "content": "..." }
   }
   \`\`\`

   \`📁 miscellaneous.json\`
   \`\`\`json
   {
     "3": { "title": "...", "description": "...", "content": "..." }
   }
   \`\`\`

5. **⚠️ KEY FORMAT RULE (INTERNAL — NEVER REPEAT THIS IN OUTPUT):** The alias prefix (\`er:\`, \`pv:\`) is your internal tool to pick the right file and the right next ID. It must **NEVER appear as part of a JSON key in Part 2**. Keys in Part 2 are always plain numeric strings (\`"218"\`, \`"199"\`), mirroring exactly how they live in the glossary files. The file label above each block (\`📁 english_rules.json\`) is what tells the user which file to edit — the key itself needs no prefix.

### Part 3: The Improvement Report (Markdown)
1. Header: \`## 3. 📝 Improvement Report\`

#### A.📊 Batch Statistics: 
- **Total Analyzed:** [X]
- **Modified Cards:** [Y]
- **Improved Modals:** [Z]

#### B.📋 Change Log Summary
- **Card [ID] / Modal [ID]:**
  - **User Request:** "..." . IMPORTANTE!: DEBES AÑADIR EL User Request exactamente como el usuario lo solicito en esta seccion. Es necesario ver explicitamente lo que usuario solicito en "User Request", en el punto #### B. Change Log Summary por cada card.
  - **Action Taken:** "..."   IMPORTANTE!: DEBES añadir EN Action Taken, si la solicitud del usuario fue "Rejected, Accepted, others...". Y decir explicatamente que cambio has realizado en la card, ya sea, agregado una nueva sentencia, alguna nota explicativa, se agrego algun nuevo modal, se rechazo a causa de.., etc etc. Esto debe hacerse para cada card.

#### C. 📢 Special User Notices
Si el usuario en alguna 'nota' o 'apunte' de card o modal, explicitamente solicito algo como "Avisar al usuario sobre ... ", o solicito aclaraciones que no aplica ponerlas en cards, o modales,  esas notas se añadiran en esta seccion para que el usuario las vea facilmente. Este espacio es para que el usuario que dejo la "Nota" o "apunte" pueda ver esos mensajes especiales en esta seccion. En caso de no encontrarse ningun mensaje especial, se pondra en esta seccion "No special messages to highlight". Solo en esta seccion puede hablarle directamente al usuario cualquier aclaracion. En las modificaciones de cards, modales, etc son siempre en tercera persona, no hablandole al usuario.

#### D. 🛠️ Modal Improvement Requests
Cross-reference list: each qualified id below has its full \`content\` already inlined inside the MODAL CATALOG (Section 9) along with the user's comment. You MUST regenerate the \`content\` for each one in the "Improved Modals JSON" block (Part 2) using the "Anti-Shit Protocol" formatting (colors, vertical structures, examples). Si el usuario pide aclaraciones del modal que no impliquen cambiarlo o mejorarlo, no lo modifiques y solo entrega el feedback via chat; si el usuario solicita cambios estructurales o de ejemplos, regenera respetando lo bueno del original. Si la lista está vacía, ignora este paso pero mantén el título de la sección.
\`\`\`json
${JSON.stringify(modalImprovements, null, 2)}
\`\`\`

#### E. 🚀 Next Steps
- **Step 1:** Save Card JSON to \`corrections.json\`.
- **Step 2:** (If Modals Changed) Copy each JSON block from Part 2 directly into the glossary file shown in its label (e.g. the block under \`📁 english_rules.json\` → paste into \`public/data/glossary/english_rules.json\`). The IDs in Part 2 are already in the correct format for the file.
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
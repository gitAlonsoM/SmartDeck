// src/services/GlossaryService.js
class GlossaryService {
    static cachedGlossaries = {};

    /**
     * Loads a glossary file from the server and caches it.
     * @param {string} glossaryName - The name of the glossary file (e.g., 'english_rules').
     * @returns {Promise<object>} A promise that resolves with the glossary data.
     */
    static async loadGlossary(glossaryName) {
        if (this.cachedGlossaries[glossaryName]) {
            console.log(`DEBUG: [GlossaryService] Returning cached glossary: ${glossaryName}`);
            return this.cachedGlossaries[glossaryName];
        }

        console.log(`DEBUG: [GlossaryService] Fetching glossary: ${glossaryName}`);
        try {
            const response = await fetch(`public/data/glossary/${glossaryName}.json`);
            if (!response.ok) {
                throw new Error(`Glossary file not found: ${glossaryName}.json`);
            }
            const data = await response.json();
            this.cachedGlossaries[glossaryName] = data;
            return data;
        } catch (error) {
            console.error(`DEBUG: [GlossaryService] Failed to load glossary '${glossaryName}':`, error);
            return null;
        }
    }

    /**
     * Retrieves a specific term from a loaded glossary.
     * @param {string} glossaryName - The name of the glossary.
     * @param {string} termKey - The key of the term to retrieve.
     * @returns {Promise<object|null>} The term object {title, content} or null if not found.
     */
    static async getTerm(glossaryName, termKey) {
        const glossary = await this.loadGlossary(glossaryName);
        if (glossary && glossary[termKey]) {
            return glossary[termKey];
        }
        console.warn(`DEBUG: [GlossaryService] Term '${termKey}' not found in glossary '${glossaryName}'.`);
        return null;
    }
}
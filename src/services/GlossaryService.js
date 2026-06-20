//src\services\GlossaryService.js
class GlossaryService {
    static cachedGlossaries = {};

    // Short aliases used in card markup (**[alias:id]**) and in modal-improvement
    // storage keys. To add a new glossary: drop the JSON in public/data/glossary/
    // and add one entry here. Aliases are 1-8 lowercase letters.
    static GLOSSARY_ALIASES = {
        er: 'english_rules',
        pv: 'phrasal_verbs',
        misc: 'miscellaneous',
    };

    static aliasToName(alias) {
        return this.GLOSSARY_ALIASES[alias] || null;
    }

    static nameToAlias(name) {
        const entry = Object.entries(this.GLOSSARY_ALIASES).find(([, n]) => n === name);
        return entry ? entry[0] : null;
    }

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
     * Synchronously retrieves a glossary from the cache. ONLY use this if you are sure
     * the glossary has been pre-loaded elsewhere (e.g., in App.js).
     * @param {string} glossaryName - The name of the glossary.
     * @returns {object|null} The cached glossary object or null if not in cache.
     */
    static getCachedGlossary(glossaryName) {
        if (this.cachedGlossaries[glossaryName]) {
            return this.cachedGlossaries[glossaryName];
        }
        console.warn(`[GlossaryService] getCachedGlossary -> Glossary '${glossaryName}' not found in cache. It may not have been pre-loaded.`);
        return null;
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

    /**
     * Loads the glossary manifest file that lists all available glossaries.
     * @returns {Promise<Array<Object>|null>} A promise that resolves to the manifest array or null on error.
     */
    static async loadManifest() {
        if (this.manifest) return this.manifest; // Return from cache if available

        try {
            console.log("DEBUG: [GlossaryService] Fetching glossary manifest...");
            const response = await fetch('public/data/glossary/glossary_manifest.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.manifest = await response.json();
            console.log("DEBUG: [GlossaryService] Manifest loaded successfully.");
            return this.manifest;
        } catch (error) {
            console.error("DEBUG: [GlossaryService] Failed to load glossary manifest:", error);
            return null; // Return null on error
        }
    }
}
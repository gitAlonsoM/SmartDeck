//src\services\UnlockService.js
// Manages loading and validating deck unlock codes.

class UnlockService {
    static codesCache = null;

    /**
     * Loads the deck unlock codes from the JSON file.
     * This should be called once on application startup.
     */
    static async loadCodes() {
        if (this.codesCache) {
            console.log("DEBUG: [UnlockService] loadCodes -> Codes already in cache.");
            return;
        }
        try {
            const response = await fetch('public/data/deck_unlock_codes.json');
            if (!response.ok) {
                // It's okay if the file doesn't exist (e.g., in development)
                if (response.status === 404) {
                    console.warn("DEBUG: [UnlockService] loadCodes -> deck_unlock_codes.json not found. Unlock feature will be disabled.");
                    this.codesCache = {}; // Set empty cache
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const codes = await response.json();
            
            // We store the codes inverted for fast lookup: { '123456': 'plsql_deck' }
            this.codesCache = Object.keys(codes).reduce((acc, deckId) => {
                const code = codes[deckId];
                acc[code] = deckId;
                return acc;
            }, {});

            console.log("DEBUG: [UnlockService] loadCodes -> Successfully loaded and inverted unlock codes.");
        } catch (error) {
            console.error("DEBUG: [UnlockService] loadCodes -> Failed to load unlock codes:", error);
            this.codesCache = {}; // Set empty cache on error
        }
    }

    /**
     * Synchronously checks if a code is valid and returns the corresponding deck ID.
     * Assumes loadCodes() has already been called.
     * @param {string} code The 6-digit code.
     * @returns {string|null} The deckId if found, otherwise null.
     */
    static getDeckIdForCode(code) {
        if (!this.codesCache) {
            console.error("DEBUG: [UnlockService] getDeckIdForCode -> ERROR: Unlock codes not loaded.");
            return null;
        }
        return this.codesCache[code] || null;
    }
}
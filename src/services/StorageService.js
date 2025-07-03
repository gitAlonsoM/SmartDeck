
//src\services\StorageService.js
// src/services/StorageService.js
// Manages all interactions with the browser's localStorage.

class StorageService {
    static STORAGE_KEY_DECKS = 'smart-decks-v3-decks';

     static STORAGE_KEY_PROGRESS_PREFIX = 'smart-decks-v3-progress-';
static STORAGE_KEY_DECK_PROGRESS_PREFIX = 'smart-decks-v3-deck-progress-';

    /**
     * Saves the learning progress for a specific deck.
     * @param {string} deckId The ID of the deck.
     * @param {object} progress The progress object { learned: Set, needsReview: Set }.
     */
    static saveDeckProgress(deckId, progress) {
        if (!deckId) return;
        try {
            const key = `${this.STORAGE_KEY_DECK_PROGRESS_PREFIX}${deckId}`;
            // Convert Sets to Arrays for JSON serialization
            const serializableProgress = {
                learned: Array.from(progress.learned || []),
                needsReview: Array.from(progress.needsReview || [])
            };
            localStorage.setItem(key, JSON.stringify(serializableProgress));
            console.log(`DEBUG: [StorageService] saveDeckProgress -> Saved learning progress for deck ${deckId}.`);
        } catch (error) {
            console.error(`DEBUG: [StorageService] saveDeckProgress -> Error saving deck progress for deck ${deckId}.`, error);
        }
    }

    /**
     * Loads the learning progress for a specific deck.
     * @param {string} deckId The ID of the deck.
     * @returns {object} The progress object with Sets, or a default empty progress object.
     */
    static loadDeckProgress(deckId) {
        if (!deckId) return { learned: new Set(), needsReview: new Set() };
        try {
            const key = `${this.STORAGE_KEY_DECK_PROGRESS_PREFIX}${deckId}`;
            const storedProgress = localStorage.getItem(key);
            if (storedProgress) {
                const parsed = JSON.parse(storedProgress);
                // Convert Arrays back to Sets
                const progress = {
                    learned: new Set(parsed.learned || []),
                    needsReview: new Set(parsed.needsReview || [])
                };
                console.log(`DEBUG: [StorageService] loadDeckProgress -> Loaded learning progress for deck ${deckId}.`);
                return progress;
            }
        } catch (error) {
            console.error(`DEBUG: [StorageService] loadDeckProgress -> Error loading deck progress for deck ${deckId}.`, error);
        }
        // Return a default object if nothing is found or an error occurs
        return { learned: new Set(), needsReview: new Set() };
    }

     /**
     * Loads user-created decks from localStorage.
     * @returns {Object} An object of decks, or an empty object if none are found.
     */
    static loadDecks() {
        console.log("DEBUG: [StorageService] loadDecks -> Attempting to load decks from localStorage.");
        try {
            const storedDecks = localStorage.getItem(this.STORAGE_KEY_DECKS);
            if (storedDecks) {
                const parsedDecks = JSON.parse(storedDecks);
                console.log("DEBUG: [StorageService] loadDecks -> Found and parsed decks:", parsedDecks);
                return parsedDecks;
            }
            console.log("DEBUG: [StorageService] loadDecks -> No decks found in localStorage.");
            return {};
        } catch (error) {
            console.error("DEBUG: [StorageService] loadDecks -> Error parsing decks from localStorage.", error);
            return {}; // Return empty object on error to prevent app crash
        }
    }

    /**
     * Clears the saved learning progress for a specific deck from localStorage.
     * @param {string} deckId The ID of the deck.
     */
    static clearDeckProgress(deckId) {
        if (!deckId) return;
        const key = `${this.STORAGE_KEY_DECK_PROGRESS_PREFIX}${deckId}`;
        localStorage.removeItem(key);
        console.log(`DEBUG: [StorageService] clearDeckProgress -> Cleared learning progress for deck ${deckId}.`);
    }
    
     /**
     * Saves the state of a specific quiz to localStorage.
     * @param {string} deckId The ID of the deck.
     * @param {object} quizState The quiz state object to save.
     */
    static saveQuizProgress(deckId, quizState) {
        if (!deckId) return;
        try {
            const key = `${this.STORAGE_KEY_PROGRESS_PREFIX}${deckId}`;
            const state = JSON.stringify(quizState);
            localStorage.setItem(key, state);
            console.log(`DEBUG: [StorageService] saveQuizProgress -> Saved progress for deck ${deckId}.`);
        } catch (error) {
            console.error(`DEBUG: [StorageService] saveQuizProgress -> Error saving progress for deck ${deckId}.`, error);
        }
    }

    /**
     * Loads the state of a specific quiz from localStorage.
     * @param {string} deckId The ID of the deck.
     * @returns {object|null} The parsed quiz state or null if not found.
     */
    static loadQuizProgress(deckId) {
        if (!deckId) return null;
        try {
            const key = `${this.STORAGE_KEY_PROGRESS_PREFIX}${deckId}`;
            const state = localStorage.getItem(key);
            if (state) {
                console.log(`DEBUG: [StorageService] loadQuizProgress -> Found progress for deck ${deckId}.`);
                return JSON.parse(state);
            }
            return null;
        } catch (error) {
            console.error(`DEBUG: [StorageService] loadQuizProgress -> Error loading progress for deck ${deckId}.`, error);
            return null;
        }
    }

    /**
     * Clears the saved progress for a specific quiz from localStorage.
     * @param {string} deckId The ID of the deck.
     */
    static clearQuizProgress(deckId) {
        if (!deckId) return;
        const key = `${this.STORAGE_KEY_PROGRESS_PREFIX}${deckId}`;
        localStorage.removeItem(key);
        console.log(`DEBUG: [StorageService] clearQuizProgress -> Cleared progress for deck ${deckId}.`);
    }

    /**
     * Saves an object of decks to localStorage.
     * @param {Object} decks - The decks object to save.
     */
    static saveDecks(decks) {
        console.log("DEBUG: [StorageService] saveDecks -> Attempting to save decks:", decks);
        try {
            const stringifiedDecks = JSON.stringify(decks);
            localStorage.setItem(this.STORAGE_KEY_DECKS, stringifiedDecks);
            console.log("DEBUG: [StorageService] saveDecks -> Decks saved successfully.");
        } catch (error) {
            console.error("DEBUG: [StorageService] saveDecks -> Error saving decks to localStorage.", error);
        }
    }


      /**
     * Saves the user's preferred TTS voice name to localStorage.
     * @param {string} voiceName - The name of the voice to save.
     */
    static savePreferredVoice(voiceName) {
        try {
            localStorage.setItem(this.PREFERRED_VOICE_KEY, voiceName);
            console.log(`DEBUG: [StorageService] savePreferredVoice -> Saved voice: ${voiceName}`);
        } catch (error) {
            console.error("DEBUG: [StorageService] savePreferredVoice -> Error saving voice:", error);
        }
    }

    /**
     * Loads the user's preferred TTS voice name from localStorage.
     * @returns {string|null} The name of the saved voice, or null if not found.
     */
    static loadPreferredVoice() {
        try {
            return localStorage.getItem(this.PREFERRED_VOICE_KEY);
        } catch (error) {
            console.error("DEBUG: [StorageService] loadPreferredVoice -> Error loading voice:", error);
            return null;
        }
    }
}
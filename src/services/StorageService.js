
//src\services\StorageService.js
// src/services/StorageService.js
// Manages all interactions with the browser's localStorage.

class StorageService {
    static STORAGE_KEY_DECKS = 'smart-decks-v3-decks';
     static STORAGE_KEY_IMPROVEMENT_PREFIX = 'smart-decks-v3-improvement-';
    static STORAGE_KEY_FAVORITES = 'smart-decks-v3-favorites';
            static STORAGE_KEY_UNLOCKED_DECKS = 'smart-decks-v3-unlocked-decks';
     static STORAGE_KEY_PROGRESS_PREFIX = 'smart-decks-v3-progress-';
        static STORAGE_KEY_DECK_PROGRESS_PREFIX = 'smart-decks-v3-deck-progress-';
        static STORAGE_KEY_METRICS_PREFIX = 'smart-decks-v3-metrics-';
    
 /**
     * Saves the improvement data for a specific deck.
     * @param {string} deckId The ID of the deck.
     * @param {object} improvementData An object where keys are cardIds and values are the review data.
     */
    static saveImprovementData(deckId, improvementData) {
        if (!deckId) return;
        try {
            const key = `${this.STORAGE_KEY_IMPROVEMENT_PREFIX}${deckId}`;
            localStorage.setItem(key, JSON.stringify(improvementData));
            console.log(`DEBUG: [StorageService] saveImprovementData -> Saved improvement data for deck ${deckId}.`);
        } catch (error) {
            console.error(`DEBUG: [StorageService] saveImprovementData -> Error saving improvement data for deck ${deckId}.`, error);
        }
    }

    /**
     * Loads the improvement data for a specific deck.
     * @param {string} deckId The ID of the deck.
     * @returns {object} The improvement data object, or an empty object if not found.
     */
    static loadImprovementData(deckId) {
        if (!deckId) return {};
        try {
            const key = `${this.STORAGE_KEY_IMPROVEMENT_PREFIX}${deckId}`;
            const storedData = localStorage.getItem(key);
            if (storedData) {
                return JSON.parse(storedData);
            }
        } catch (error) {
            console.error(`DEBUG: [StorageService] loadImprovementData -> Error loading improvement data for deck ${deckId}.`, error);
        }
        return {};
    }

      /**
     * Clears the improvement data for a single card within a deck.
     * @param {string} deckId The ID of the deck.
     * @param {string} cardId The ID of the card to clear.
     */
    static clearImprovementForCard(deckId, cardId) {
        if (!deckId || !cardId) return;
        try {
            const improvementData = this.loadImprovementData(deckId);
            if (improvementData[cardId]) {
                delete improvementData[cardId];
                this.saveImprovementData(deckId, improvementData);
                console.log(`DEBUG: [StorageService] clearImprovementForCard -> Cleared improvement data for card ${cardId} in deck ${deckId}.`);
            }
        } catch (error) {
            console.error(`DEBUG: [StorageService] clearImprovementForCard -> Error clearing data for card ${cardId}.`, error);
        }
    }

    /**
     * Updates the performance metric for a specific card.
     * @param {string} deckId - The ID of the deck.
     * @param {string} cardId - The ID of the card.
     * @param {boolean} isMastered - Whether the card was just mastered (correct answer/knew it).
     */
    static updateCardMetric(deckId, cardId, isMastered) {
        if (!deckId || !cardId) return;
        try {
            const key = `${this.STORAGE_KEY_METRICS_PREFIX}${deckId}`;
            const metrics = JSON.parse(localStorage.getItem(key) || '{}');

            if (!metrics[cardId]) {
                metrics[cardId] = { attempts: 0, masteredAt: null };
            }

            // Only increment attempts if it hasn't been mastered yet, 
            // or if we want to track post-mastery reviews (usually we stop tracking mastery efficiency once mastered).
            // For this specific requirement ("at which attempt was it mastered"), we lock 'masteredAt'.
            
            if (metrics[cardId].masteredAt === null) {
                metrics[cardId].attempts += 1;
                
                if (isMastered) {
                    metrics[cardId].masteredAt = metrics[cardId].attempts;
                }
                
                localStorage.setItem(key, JSON.stringify(metrics));
                console.log(`VERIFY: [StorageService] Metric updated for ${cardId}. Attempt #${metrics[cardId].attempts}. Mastered: ${isMastered}`);
            }
        } catch (error) {
            console.error("DEBUG: [StorageService] Error updating metrics.", error);
        }
    }

    /**
     * Loads the metrics for a deck.
     */
    static loadDeckMetrics(deckId) {
        if (!deckId) return {};
        try {
            const key = `${this.STORAGE_KEY_METRICS_PREFIX}${deckId}`;
            return JSON.parse(localStorage.getItem(key) || '{}');
        } catch (error) {
            return {};
        }
    }

    /**
     * Clears metrics for a deck (used during Reset).
     */
    static clearDeckMetrics(deckId) {
        if (!deckId) return;
        const key = `${this.STORAGE_KEY_METRICS_PREFIX}${deckId}`;
        localStorage.removeItem(key);
        console.log(`VERIFY: [StorageService] Metrics cleared for deck ${deckId}.`);
    }
    
    
    /**
     * Saves the learning progress for a specific deck.
     * @param {string} deckId The ID of the deck.
     * @param {object} progress The progress object { learned: Set, needsReview: Set, ignored: Set }.
     */
    static saveDeckProgress(deckId, progress) {
        if (!deckId) return;
        try {
            const key = `${this.STORAGE_KEY_DECK_PROGRESS_PREFIX}${deckId}`;
            // Convert Sets to Arrays for JSON serialization
            const serializableProgress = {
                learned: Array.from(progress.learned || []),
                needsReview: Array.from(progress.needsReview || []),
                ignored: Array.from(progress.ignored || []) // Add ignored set for serialization
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
        if (!deckId) return { learned: new Set(), needsReview: new Set(), ignored: new Set() };
        try {
            const key = `${this.STORAGE_KEY_DECK_PROGRESS_PREFIX}${deckId}`;
            const storedProgress = localStorage.getItem(key);
            if (storedProgress) {
                const parsed = JSON.parse(storedProgress);
                // Convert Arrays back to Sets
                const progress = {
                    learned: new Set(parsed.learned || []),
                    needsReview: new Set(parsed.needsReview || []),
                    ignored: new Set(parsed.ignored || []) // Add ignored set from storage
                };
                console.log(`DEBUG: [StorageService] loadDeckProgress -> Loaded learning progress for deck ${deckId}.`);
                return progress;
            }
        } catch (error) {
            console.error(`DEBUG: [StorageService] loadDeckProgress -> Error loading deck progress for deck ${deckId}.`, error);
        }
        // Return a default object if nothing is found or an error occurs
        return { learned: new Set(), needsReview: new Set(), ignored: new Set() };
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
        this.clearDeckMetrics(deckId);

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
     * Deletes a user-created deck and all its associated progress data from localStorage.
     * @param {string} deckId The ID of the deck to delete.
     */
    static deleteDeck(deckId) {
        if (!deckId) return;
        console.log(`DEBUG: [StorageService] deleteDeck -> Attempting to delete deck ${deckId} and all associated data.`);
        
        try {
            // 1. Delete the deck itself from the main decks object
            const userDecks = this.loadDecks();
            if (userDecks[deckId]) {
                delete userDecks[deckId];
                this.saveDecks(userDecks);
                console.log(`DEBUG: [StorageService] deleteDeck -> Removed deck object for ${deckId}.`);
            }

            // 2. Delete the deck's learning progress
            localStorage.removeItem(`${this.STORAGE_KEY_DECK_PROGRESS_PREFIX}${deckId}`);
            console.log(`DEBUG: [StorageService] deleteDeck -> Removed learning progress for ${deckId}.`);

            // 3. Delete the deck's improvement data
            localStorage.removeItem(`${this.STORAGE_KEY_IMPROVEMENT_PREFIX}${deckId}`);
            console.log(`DEBUG: [StorageService] deleteDeck -> Removed improvement data for ${deckId}.`);

        } catch (error) {
            console.error(`DEBUG: [StorageService] deleteDeck -> Error deleting deck ${deckId}.`, error);
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

    /**
     * Loads the set of favorite deck IDs from localStorage.
     * @returns {Set<string>} A set of favorite deck IDs.
     */
    static loadFavorites() {
        try {
            const storedFavorites = localStorage.getItem(this.STORAGE_KEY_FAVORITES);
            if (storedFavorites) {
                const favoriteIds = JSON.parse(storedFavorites);
                console.log("DEBUG: [StorageService] loadFavorites -> Found and parsed favorites:", favoriteIds);
                return new Set(favoriteIds);
            }
        } catch (error) {
            console.error("DEBUG: [StorageService] loadFavorites -> Error loading favorites.", error);
        }
        return new Set(); // Return empty set if not found or on error
    }

    /**
     * Saves the set of favorite deck IDs to localStorage.
     * @param {Set<string>} favoriteIdsSet - The set of favorite deck IDs to save.
     */
    static saveFavorites(favoriteIdsSet) {
        try {
            const favoriteIdsArray = Array.from(favoriteIdsSet);
            localStorage.setItem(this.STORAGE_KEY_FAVORITES, JSON.stringify(favoriteIdsArray));
            console.log("DEBUG: [StorageService] saveFavorites -> Saved favorites:", favoriteIdsArray);
        } catch (error) {
            console.error("DEBUG: [StorageService] saveFavorites -> Error saving favorites.", error);
        }
    }

    /**
     * Loads the set of unlocked deck IDs from localStorage.
     * @returns {Set<string>} A set of unlocked deck IDs.
     */
    static loadUnlockedDeckIds() {
        try {
            const storedUnlocked = localStorage.getItem(this.STORAGE_KEY_UNLOCKED_DECKS);
            if (storedUnlocked) {
                const unlockedIds = JSON.parse(storedUnlocked);
                console.log("DEBUG: [StorageService] loadUnlockedDeckIds -> Found and parsed unlocked decks:", unlockedIds);
                return new Set(unlockedIds);
            }
        } catch (error) {
            console.error("DEBUG: [StorageService] loadUnlockedDeckIds -> Error loading unlocked decks.", error);
        }
        return new Set(); // Return empty set if not found or on error
    }

    /**
     * Saves the set of unlocked deck IDs to localStorage.
     * @param {Set<string>} unlockedDeckIdsSet - The set of unlocked deck IDs to save.
     */
    static saveUnlockedDeckIds(unlockedDeckIdsSet) {
        try {
            const unlockedIdsArray = Array.from(unlockedDeckIdsSet);
            localStorage.setItem(this.STORAGE_KEY_UNLOCKED_DECKS, JSON.stringify(unlockedIdsArray));
            console.log("DEBUG: [StorageService] saveUnlockedDeckIds -> Saved unlocked decks:", unlockedIdsArray);
        } catch (error) {
            console.error("DEBUG: [StorageService] saveUnlockedDeckIds -> Error saving unlocked decks.", error);
        }
    }


/**
     * Clears the improvement data for a single card within a deck.
     * @param {string} deckId The ID of the deck.
     * @param {string} cardId The ID of the card to clear.
     */
    static clearImprovementForCard(deckId, cardId) {
        if (!deckId || !cardId) return;
        try {
            const improvementData = this.loadImprovementData(deckId);
            if (improvementData[cardId]) {
                delete improvementData[cardId];
                this.saveImprovementData(deckId, improvementData);
                console.log(`DEBUG: [StorageService] clearImprovementForCard -> Cleared improvement data for card ${cardId} in deck ${deckId}.`);
            }
        } catch (error) {
            console.error(`DEBUG: [StorageService] clearImprovementForCard -> Error clearing data for card ${cardId}.`, error);
        }
    }

    /**
     * Completely wipes all improvement data for a specific deck.
     * Used to fix synchronization errors or reset the improvement queue.
     * @param {string} deckId The ID of the deck.
     */
    static clearAllImprovementData(deckId) {
        if (!deckId) return;
        try {
            const key = `${this.STORAGE_KEY_IMPROVEMENT_PREFIX}${deckId}`;
            localStorage.removeItem(key);
            console.log(`DEBUG: [StorageService] clearAllImprovementData -> Wiped all improvement data for deck ${deckId}.`);
        } catch (error) {
            console.error(`DEBUG: [StorageService] clearAllImprovementData -> Error wiping data for deck ${deckId}.`, error);
        }


        
    }

    
}
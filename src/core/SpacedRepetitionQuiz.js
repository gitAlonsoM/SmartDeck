/*src\core\SpacedRepetitionQuiz.js  */

// This class manages the logic of a single self-assessed, spaced repetition session.
class SpacedRepetitionQuiz {
    /**
     * @param {Array} cards - The full array of card objects for the deck.
     * @param {object} progress - The user's progress for this deck. { learned: Set, needsReview: Set }
     */
    constructor(cards, progress) {
        this.allCards = cards;
        this.progress = progress;
        this.currentCards = []; // The final list of cards for this round
        this.currentIndex = 0;
        console.log("DEBUG: [SpacedRepetitionQuiz] constructor -> Instance created.");
    }

    /**
     * Generates a quiz round using only cards that need study.
     * Reuses the same logic as the standard quiz for consistency.
     * @param {number} quizLength - The maximum number of cards for the round.
     */
    generateQuizRound(quizLength = 7) {
        console.log("DEBUG: [SpacedRepetitionQuiz] generateQuizRound -> Generating a new round.");
        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());

        // Use cardId as the unique identifier for flippable cards
        const reviewPool = Array.from(this.progress.needsReview || []);
        console.log(`DEBUG: [SpacedRepetitionQuiz] generateQuizRound -> Found ${reviewPool.length} cards in 'needsReview'.`);

        const seenCardIds = new Set([...Array.from(this.progress.learned || []), ...reviewPool]);
        const newPool = this.allCards
            .map(card => card.cardId)
            .filter(id => !seenCardIds.has(id));
        console.log(`DEBUG: [SpacedRepetitionQuiz] generateQuizRound -> Found ${newPool.length} new (unseen) cards.`);

        const availablePool = [...reviewPool, ...newPool];
        const finalCardPoolIds = shuffle(availablePool).slice(0, quizLength);

        this.currentCards = finalCardPoolIds
            .map(cardId => this.allCards.find(c => c.cardId === cardId))
            .filter(Boolean);
        
        this.currentIndex = 0;
        console.log(`DEBUG: [SpacedRepetitionQuiz] generateQuizRound -> Final round generated with ${this.currentCards.length} cards.`);
    }

    /**
     * Handles the user's self-assessment for the current card.
     * @param {boolean} knewIt - True if the user knew the answer, false otherwise.
     */
    selfAssess(knewIt) {
        const currentCard = this.getCurrentCard();
        if (!currentCard) return;

        const cardId = currentCard.cardId;
        this.progress.needsReview.delete(cardId); // Always remove from needsReview first

        if (knewIt) {
            this.progress.learned.add(cardId);
            console.log(`DEBUG: [SpacedRepetitionQuiz] selfAssess -> Card '${cardId}' marked as 'learned'.`);
        } else {
            this.progress.needsReview.add(cardId);
            console.log(`DEBUG: [SpacedRepetitionQuiz] selfAssess -> Card '${cardId}' marked as 'needs review'.`);
        }
    }

    getCurrentCard() {
        if (this.isQuizOver()) return null;
        return this.currentCards[this.currentIndex];
    }

    moveToNextCard() {
        if (!this.isQuizOver()) {
            this.currentIndex++;
            console.log(`DEBUG: [SpacedRepetitionQuiz] moveToNextCard -> Moved to index ${this.currentIndex}.`);
        }
    }

    isQuizOver() {
        return this.currentIndex >= this.currentCards.length;
    }
}
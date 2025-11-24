// src/core/Quiz.js
// This class manages the logic of a single quiz session. It does not touch the DOM.

class Quiz {
    /**
     * @param {string} deckId - The ID of the deck (Added for metrics).
     * @param {Array} cards - The full array of card objects for the deck.
     * @param {object} progress - The user's progress for this deck. { learned: Set, needsReview: Set }
     */
    constructor(deckId, cards, progress) {
        this.deckId = deckId; // Store deckId
        this.allCards = cards;
        this.progress = progress;
        this.questions = []; // The final list of questions for this round
        this.currentIndex = 0;
        this.score = 0;
        console.log("DEBUG: [Quiz] constructor -> Quiz instance created.");
    }

    /**
     * Loads a previously saved state into the quiz instance.
     * @param {object} state - The state object to load { currentIndex, score, questions }.
     */
    loadState(state) {
        this.questions = state.questions;
        this.currentIndex = state.currentIndex;
        this.score = state.score;
        console.log("DEBUG: [Quiz] loadState -> Quiz state loaded.", state);
    }

    /**
     * Returns the current state of the quiz for persistence.
     * @returns {object} The current quiz state.
     */
    getQuizState() {
        return {
            currentIndex: this.currentIndex,
            score: this.score,
            questions: this.questions
        };
    }
 /**
     * Generates a quiz round using only cards that need study (review and new).
     * The quiz will have at most `quizLength` questions and will be smaller if
     * not enough cards are available. It will NEVER pull from the 'learned' pool.
     * @param {number} quizLength - The maximum number of questions for the round.
     */
    generateQuizRound(quizLength = 7) {
        console.log("DEBUG: [Quiz] generateQuizRound -> Generating a new quiz round.");
        
        const ignoredCardIds = this.progress.ignored || new Set();
        if (ignoredCardIds.size > 0) {
            console.log(`DEBUG: [Quiz] generateQuizRound -> Excluding ${ignoredCardIds.size} ignored card(s).`);
        }

        // Filter out ignored cards from the entire pool first.
        const studyableCards = this.allCards.filter(card => !ignoredCardIds.has(card.cardId));

        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());

        // 1. Identify all cards available for study by their ID.
        // Priority 1: Cards that need review.
        const reviewPoolIds = Array.from(this.progress.needsReview || []);
        console.log(`DEBUG: [Quiz] generateQuizRound -> Found ${reviewPoolIds.length} cards in 'needsReview'.`);

        // Priority 2: New (unseen) cards.
        const seenCardIds = new Set([...Array.from(this.progress.learned || []), ...reviewPoolIds]);
        const newPoolIds = studyableCards
            .map(card => card.cardId)
            .filter(id => !seenCardIds.has(id));
        console.log(`DEBUG: [Quiz] generateQuizRound -> Found ${newPoolIds.length} new (unseen) cards from the studyable pool.`);

        // 2. Combine review and new card IDs into a single pool. Review cards go first.
        const availablePoolIds = [...reviewPoolIds, ...newPoolIds];
        console.log(`DEBUG: [Quiz] generateQuizRound -> Total available study pool size: ${availablePoolIds.length}.`);

        // 3. Shuffle the pool and take the correct number of questions (up to the max length).
        const finalQuestionPoolIds = shuffle(availablePoolIds).slice(0, quizLength);

        // 4. Map card IDs back to full card objects.
        const cardMap = new Map(studyableCards.map(c => [c.cardId, c]));
        this.questions = finalQuestionPoolIds
            .map(id => cardMap.get(id))
            .filter(Boolean); // Ensure no undefined cards are included.

        this.currentIndex = 0;
        this.score = 0;

        console.log(`DEBUG: [Quiz] generateQuizRound -> Final quiz generated with ${this.questions.length} questions.`);
    }
    
    getCurrentQuestion() {
        if (this.isQuizOver()) {
            console.log("DEBUG: [Quiz] getCurrentQuestion -> Attempted to get question, but quiz is over.");
            return null;
        }
        return this.questions[this.currentIndex];
    }

    answer(selectedOption) {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion) return false;
const isCorrect = selectedOption === currentQuestion.correctAnswer;

const cardId = currentQuestion.cardId;

        // Update progress sets using cardId
        this.progress.needsReview.delete(cardId); // Always remove from needsReview first
        if (isCorrect) {
            this.score++;
            this.progress.learned.add(cardId); // Add to learned if correct
        } else {
            this.progress.needsReview.add(cardId); // Add back to needsReview if incorrect
        }

        if (this.deckId) {
            StorageService.updateCardMetric(this.deckId, cardId, isCorrect);
        }

    console.log(`DEBUG: [Quiz] answer -> User answered '${selectedOption}'. Correct: ${isCorrect}. New score: ${this.score}`);
    return isCorrect;
    }

    moveToNextQuestion() {
        if (!this.isQuizOver()) {
            this.currentIndex++;
            console.log(`DEBUG: [Quiz] moveToNextQuestion -> Moved to index ${this.currentIndex}.`);
        }
    }

    isQuizOver() {
        return this.currentIndex >= this.questions.length;
    }
}
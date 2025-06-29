// src/core/Quiz.js
// This class manages the logic of a single quiz session. It does not touch the DOM.

class Quiz {
    /**
     * @param {Array} cards - The full array of card objects for the deck.
     * @param {object} progress - The user's progress for this deck. { learned: Set, needsReview: Set }
     */
    constructor(cards, progress) {
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

    generateQuizRound(quizLength = 10) {
        console.log("DEBUG: [Quiz] generateQuizRound -> Generating a new quiz round.");
        let quizPool = [];
        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());

        // 1. Get question strings from progress sets
        const reviewQuestions = Array.from(this.progress.needsReview || []);
        const learnedQuestions = Array.from(this.progress.learned || []);

        // 2. Add cards that need review to the pool
        quizPool.push(...shuffle(reviewQuestions));
        console.log(`DEBUG: [Quiz] generateQuizRound -> Added ${quizPool.length} cards from 'needsReview' list.`);

        // 3. Get unseen card questions
        const seenQuestions = new Set([...learnedQuestions, ...reviewQuestions]);
        const unseenCardQuestions = this.allCards
            .map(card => card.question)
            .filter(q => !seenQuestions.has(q));

        // 4. Add unseen cards until the quiz is full
        if (quizPool.length < quizLength) {
            const needed = quizLength - quizPool.length;
            quizPool.push(...shuffle(unseenCardQuestions).slice(0, needed));
            console.log(`DEBUG: [Quiz] generateQuizRound -> Added up to ${needed} unseen cards.`);
        }
        
        // 5. If still not full, add learned cards for reinforcement
        if (quizPool.length < quizLength) {
            const needed = quizLength - quizPool.length;
            quizPool.push(...shuffle(learnedQuestions).slice(0, needed));
            console.log(`DEBUG: [Quiz] generateQuizRound -> Added up to ${needed} learned cards for reinforcement.`);
        }

        // 6. Map question texts back to full card objects and shuffle the final list
        this.questions = shuffle(quizPool
            .map(qText => this.allCards.find(c => c.question === qText))
            .filter(Boolean) // Remove any undefined entries if a card wasn't found
        );
        
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
    const questionText = currentQuestion.question;

    // Update progress sets
    this.progress.needsReview.delete(questionText); // Always remove from needsReview first
    if (isCorrect) {
        this.score++;
        this.progress.learned.add(questionText); // Add to learned if correct
    } else {
        this.progress.needsReview.add(questionText); // Add back to needsReview if incorrect
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
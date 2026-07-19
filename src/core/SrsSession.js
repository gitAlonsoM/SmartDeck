/* src\core\SrsSession.js */
// A live spaced-repetition study session. It manages a dynamic queue of cardIds
// and grades cards through SrsService. It intentionally mirrors the small surface
// that App.render() and the quiz screens already expect from the legacy Quiz /
// SpacedRepetitionQuiz instances, so the existing screens can be reused unchanged:
//
//   - getCurrentCard() / getCurrentQuestion()  -> current card (front of queue)
//   - currentIndex                             -> number of cards graded so far
//   - currentCards.length / questions.length   -> dynamic total (graded + remaining)
//   - score                                    -> cards known / answered correctly
//   - isQuizOver()
//   - answer(option)        (multiple-choice / audio: two-step, grade now, advance on next)
//   - moveToNextQuestion()  (multiple-choice / audio: advance the queue)
//   - gradeFlippable(grade) (flippable: grade + advance in one step)
//
// A failed or still-learning card is re-queued so it reappears LATER in the same
// session (Anki-style learning steps). Cards that graduate to a day-level interval
// leave the session. In "extra study" mode nothing is scheduled/persisted and the
// queue is a single pass (pure practice).
class SrsSession {
    /**
     * @param {string} deckId
     * @param {Array} cards Full card objects for the deck.
     * @param {object} settings SRS settings { newPerDay, maxReviewsPerDay, difficulty }.
     * @param {string[]} queue Ordered cardIds to study (from SrsService.computeQueue/computeExtraQueue).
     * @param {boolean} isExtra True for pure-practice extra study (no scheduling side effects).
     */
    constructor(deckId, cards, settings, queue, isExtra = false) {
        this.deckId = deckId;
        this.settings = settings;
        this.isExtra = !!isExtra;
        this.cardMap = new Map(cards.map(c => [c.cardId, c]));
        this.queue = Array.isArray(queue) ? queue.slice() : [];
        this.currentIndex = 0; // cards graded so far (drives the "N / total" indicator)
        this.score = 0;
        this._pendingGrade = null;
        this._lastRecord = null;
        console.log(`DEBUG: [SrsSession] constructor -> ${this.queue.length} card(s) queued. extra=${this.isExtra}.`);
    }

    // --- Screen-compatible accessors -------------------------------------------

    getCurrentCard() {
        if (this.isQuizOver()) return null;
        return this.cardMap.get(this.queue[0]) || null;
    }

    getCurrentQuestion() { return this.getCurrentCard(); }

    // Dynamic total = already graded + still queued. Exposed as array-likes so the
    // screens' `.length` reads work without special-casing.
    get _total() { return this.currentIndex + this.queue.length; }
    get currentCards() { return { length: this._total }; }
    get questions() { return { length: this._total }; }

    isQuizOver() { return this.queue.length === 0; }

    // --- Grading ---------------------------------------------------------------

    /**
     * Multiple-choice / audio-choice grading. Records the result immediately but
     * does NOT advance — the screen shows feedback, then App calls moveToNextQuestion().
     * @returns {boolean} isCorrect
     */
    answer(selectedOption) {
        const card = this.getCurrentQuestion();
        if (!card) return false;
        const isCorrect = selectedOption === card.correctAnswer;
        if (isCorrect) this.score++;
        const grade = isCorrect ? 'good' : 'again';
        this._pendingGrade = grade;
        this._lastRecord = this.isExtra ? null : SrsService.recordGrade(this.deckId, card.cardId, grade, this.settings);
        return isCorrect;
    }

    /** Multiple-choice / audio-choice: advance the queue (with re-queue if still learning). */
    moveToNextQuestion() { this._advance(); }

    /**
     * Flippable grading. Records AND advances in one step (matches the flippable
     * screen's single-tap assessment flow).
     * @param {'again'|'good'|'easy'} grade
     */
    gradeFlippable(grade) {
        const card = this.getCurrentCard();
        if (!card) return;
        if (grade !== 'again') this.score++;
        this._pendingGrade = grade;
        this._lastRecord = this.isExtra ? null : SrsService.recordGrade(this.deckId, card.cardId, grade, this.settings);
        this._advance();
    }

    // --- Internal --------------------------------------------------------------

    /**
     * Pops the current card and decides whether it should reappear this session.
     * Normal mode: a card still in 'learning'/'relearning' after grading is re-queued.
     * Extra mode: single pass, never re-queued.
     */
    _advance() {
        const cardId = this.queue.shift();
        this.currentIndex++;

        let requeue = false;
        if (!this.isExtra && this._lastRecord) {
            requeue = this._lastRecord.state === 'learning' || this._lastRecord.state === 'relearning';
        }
        if (requeue && cardId != null) {
            this.queue.push(cardId); // back of the queue so it doesn't repeat immediately
        }

        this._pendingGrade = null;
        this._lastRecord = null;
    }
}

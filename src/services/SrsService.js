/* src\services\SrsService.js */
// Spaced Repetition scheduling engine (a simplified, Anki-style SM-2 variant).
//
// This service owns the ALGORITHM and the session/queue math. It never touches
// localStorage directly — all persistence is delegated to StorageService, per the
// project convention that StorageService is the single localStorage owner.
//
// A per-card SRS record looks like:
//   {
//     state:     'new' | 'learning' | 'review' | 'relearning',
//     due:       epoch-ms timestamp when the card is next due,
//     interval:  integer number of days (only meaningful once graduated to 'review'),
//     ease:      ease factor (multiplier applied to the interval on 'good'),
//     reps:      how many times the card graduated / was reviewed successfully,
//     lapses:    how many times a graduated card was failed,
//     stepIndex: index into the (re)learning steps while in 'learning'/'relearning'
//   }
// Brand-new cards have NO record until they are first graded.
class SrsService {
    // --- Tunable algorithm constants (v1) ---
    static DAY_MS = 24 * 60 * 60 * 1000;
    static LEARNING_STEPS_MIN = [1, 10];   // minutes; a new card must pass these to graduate
    static RELEARN_STEPS_MIN = [10];       // minutes; a lapsed card must pass these to re-graduate
    static GRADUATE_DAYS = 1;              // interval a card gets when it graduates on 'good'
    static EASY_GRADUATE_DAYS = 4;         // interval a card gets when it graduates on 'easy'
    static START_EASE = 2.5;
    static MIN_EASE = 1.3;
    static EASE_AGAIN = -0.20;             // ease penalty when a review card is failed
    static EASE_EASY = 0.15;               // ease bonus when a review card is graded 'easy'
    static EASY_BONUS = 1.3;               // extra interval multiplier for 'easy'
    static LAPSE_MULT = 0.5;               // interval kept (of the old one) after a lapse

    /**
     * Maps the user-facing difficulty setting to an interval modifier.
     * Higher difficulty => shorter intervals => MORE reviews.
     * @param {'low'|'normal'|'high'} difficulty
     * @returns {number}
     */
    static difficultyModifier(difficulty) {
        switch (difficulty) {
            case 'high': return 0.75; // shorter intervals, more frequent reviews
            case 'low': return 1.3;   // longer intervals, fewer reviews
            case 'normal':
            default: return 1.0;
        }
    }

    /** Local calendar day string 'YYYY-MM-DD'. */
    static todayString(now = Date.now()) {
        const d = new Date(now);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    /** Epoch-ms of the most recent local midnight at or before `now`. */
    static startOfDayMs(now = Date.now()) {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    /** A fresh record for a card about to leave the 'new' pool. */
    static newRecord() {
        return { state: 'new', due: 0, interval: 0, ease: this.START_EASE, reps: 0, lapses: 0, stepIndex: 0 };
    }

    /**
     * Pure grading function. Given the existing record (or null for a brand-new
     * card) and a grade, returns the updated record plus flags used for the
     * daily new/review counters.
     * @param {object|null} existing
     * @param {'again'|'good'|'easy'} grade
     * @param {'low'|'normal'|'high'} difficulty
     * @param {number} now epoch-ms (injectable for testing)
     * @returns {{record: object, introducedNew: boolean, reviewDone: boolean}}
     */
    static grade(existing, grade, difficulty, now = Date.now()) {
        const mod = this.difficultyModifier(difficulty);
        const wasNew = !existing || existing.state === 'new';
        const wasReview = !!existing && existing.state === 'review';
        const r = existing ? { ...existing } : this.newRecord();

        const scheduleDays = (days) => this.startOfDayMs(now) + Math.max(1, days) * this.DAY_MS;
        const scheduleMin = (min) => now + min * 60 * 1000;

        const state = r.state === 'new' ? 'learning' : r.state; // a graded 'new' card enters learning

        if (state === 'learning') {
            if (grade === 'again') {
                r.state = 'learning'; r.stepIndex = 0; r.due = scheduleMin(this.LEARNING_STEPS_MIN[0]);
            } else if (grade === 'easy') {
                r.state = 'review'; r.stepIndex = 0; r.interval = this.EASY_GRADUATE_DAYS; r.reps += 1; r.due = scheduleDays(r.interval);
            } else { // good
                const next = r.stepIndex + 1;
                if (next >= this.LEARNING_STEPS_MIN.length) {
                    r.state = 'review'; r.stepIndex = 0; r.interval = this.GRADUATE_DAYS; r.reps += 1; r.due = scheduleDays(r.interval);
                } else {
                    r.state = 'learning'; r.stepIndex = next; r.due = scheduleMin(this.LEARNING_STEPS_MIN[next]);
                }
            }
        } else if (state === 'relearning') {
            if (grade === 'again') {
                r.state = 'relearning'; r.stepIndex = 0; r.due = scheduleMin(this.RELEARN_STEPS_MIN[0]);
            } else {
                const next = r.stepIndex + 1;
                if (grade === 'easy' || next >= this.RELEARN_STEPS_MIN.length) {
                    r.state = 'review'; r.stepIndex = 0;
                    r.interval = Math.max(1, Math.round((r.interval || 1) * mod));
                    r.reps += 1; r.due = scheduleDays(r.interval);
                } else {
                    r.state = 'relearning'; r.stepIndex = next; r.due = scheduleMin(this.RELEARN_STEPS_MIN[next]);
                }
            }
        } else { // review
            if (grade === 'again') {
                r.lapses += 1;
                r.ease = Math.max(this.MIN_EASE, r.ease + this.EASE_AGAIN);
                r.interval = Math.max(1, Math.round((r.interval || 1) * this.LAPSE_MULT)); // remembered for re-graduation
                r.state = 'relearning'; r.stepIndex = 0; r.due = scheduleMin(this.RELEARN_STEPS_MIN[0]);
            } else if (grade === 'easy') {
                r.ease = r.ease + this.EASE_EASY;
                r.interval = Math.max(1, Math.round((r.interval || 1) * r.ease * this.EASY_BONUS * mod));
                r.reps += 1; r.due = scheduleDays(r.interval);
            } else { // good
                r.interval = Math.max(1, Math.round((r.interval || 1) * r.ease * mod));
                r.reps += 1; r.due = scheduleDays(r.interval);
            }
        }

        return { record: r, introducedNew: wasNew, reviewDone: wasReview };
    }

    /**
     * Loads today's daily counters, resetting them if the stored date is not today.
     * @param {string} deckId
     * @returns {{date:string, newIntroduced:number, reviewsDone:number}}
     */
    static ensureDailyFresh(deckId) {
        const today = this.todayString();
        const daily = StorageService.loadSrsDaily(deckId);
        if (daily.date !== today) {
            const fresh = { date: today, newIntroduced: 0, reviewsDone: 0 };
            StorageService.saveSrsDaily(deckId, fresh);
            return fresh;
        }
        return daily;
    }

    /**
     * Grades a card for real: computes the new schedule, persists the record,
     * bumps the daily counters, and keeps the Progress Report metric in sync.
     * @returns {object} The updated SRS record (so the session can decide re-queueing).
     */
    static recordGrade(deckId, cardId, grade, settings) {
        const records = StorageService.loadSrsRecords(deckId);
        const daily = this.ensureDailyFresh(deckId);
        const existing = records[cardId] || null;

        const { record, introducedNew, reviewDone } = this.grade(existing, grade, settings.difficulty);
        records[cardId] = record;
        StorageService.saveSrsRecords(deckId, records);

        let dailyChanged = false;
        if (introducedNew) { daily.newIntroduced += 1; dailyChanged = true; }
        if (reviewDone) { daily.reviewsDone += 1; dailyChanged = true; }
        if (dailyChanged) StorageService.saveSrsDaily(deckId, daily);

        // Keep the Progress Report metric (attempts until first success) in sync so
        // "which cards are solved on the first try" still works in spaced mode.
        StorageService.updateCardMetric(deckId, cardId, grade !== 'again');

        console.log(`VERIFY: [SrsService] recordGrade -> ${cardId} graded '${grade}' -> state=${record.state}, interval=${record.interval}d, ease=${record.ease.toFixed(2)}.`);
        return record;
    }

    /**
     * Builds the ordered list of cardIds for a fresh study session, honoring the
     * daily new/review caps. Learning/relearning cards that are due are always
     * included (they are time-sensitive and not capped).
     * @returns {string[]} cardIds
     */
    static computeQueue(deckId, cards, ignoredSet, settings, now = Date.now()) {
        const records = StorageService.loadSrsRecords(deckId);
        const daily = this.ensureDailyFresh(deckId);
        const studyable = cards.filter(c => !ignoredSet.has(c.cardId));

        const learning = [], review = [], fresh = [];
        for (const card of studyable) {
            const rec = records[card.cardId];
            if (!rec || rec.state === 'new') { fresh.push(card.cardId); continue; }
            if (rec.state === 'learning' || rec.state === 'relearning') {
                if (rec.due <= now) learning.push({ id: card.cardId, due: rec.due });
            } else if (rec.state === 'review') {
                if (rec.due <= now) review.push({ id: card.cardId, due: rec.due });
            }
        }
        learning.sort((a, b) => a.due - b.due);
        review.sort((a, b) => a.due - b.due);

        const newCap = Math.max(0, settings.newPerDay - daily.newIntroduced);
        const reviewCap = Math.max(0, settings.maxReviewsPerDay - daily.reviewsDone);
        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());

        const chosenNew = shuffle(fresh.slice()).slice(0, newCap);
        const chosenReview = review.slice(0, reviewCap).map(x => x.id);
        const chosenLearning = learning.map(x => x.id);

        // Learning cards first (time-sensitive), then a shuffled mix of reviews + new.
        const queue = [...chosenLearning, ...shuffle([...chosenReview, ...chosenNew])];
        console.log(`DEBUG: [SrsService] computeQueue -> learning=${chosenLearning.length}, review=${chosenReview.length}, new=${chosenNew.length}.`);
        return queue;
    }

    /**
     * Builds an EXTRA STUDY queue: N random already-seen cards for pure practice.
     * This queue is graded in "extra" mode by the session, which does NOT touch the
     * schedule, ease, daily counters or metrics. Falls back to any studyable card
     * if nothing has been seen yet.
     * @returns {string[]} cardIds
     */
    static computeExtraQueue(deckId, cards, ignoredSet, count) {
        const records = StorageService.loadSrsRecords(deckId);
        const studyable = cards.filter(c => !ignoredSet.has(c.cardId));
        let pool = studyable.filter(c => records[c.cardId] && records[c.cardId].state !== 'new').map(c => c.cardId);
        if (pool.length === 0) pool = studyable.map(c => c.cardId);
        const shuffle = (arr) => arr.sort(() => 0.5 - Math.random());
        return shuffle(pool).slice(0, Math.max(1, count || 0));
    }

    /** The soonest future due time across all scheduled records, or null. */
    static getNextDueMs(records, now = Date.now()) {
        let next = null;
        for (const rec of Object.values(records)) {
            if (rec && typeof rec.due === 'number' && rec.due > now) {
                if (next === null || rec.due < next) next = rec.due;
            }
        }
        return next;
    }

    /**
     * Computes the dashboard stats shown on the spaced-mode deck detail screen.
     * @returns {{total:number, seen:number, newToday:number, learningDue:number,
     *            reviewToday:number, dueTotal:number, nextDueMs:number|null}}
     */
    static computeStats(deckId, cards, ignoredSet, settings, now = Date.now()) {
        const records = StorageService.loadSrsRecords(deckId);
        const daily = this.ensureDailyFresh(deckId);
        const studyable = cards.filter(c => !ignoredSet.has(c.cardId));

        let seen = 0, learningDue = 0, reviewDue = 0, newAvailable = 0;
        for (const card of studyable) {
            const rec = records[card.cardId];
            if (!rec || rec.state === 'new') { newAvailable++; continue; }
            seen++;
            if ((rec.state === 'learning' || rec.state === 'relearning') && rec.due <= now) learningDue++;
            else if (rec.state === 'review' && rec.due <= now) reviewDue++;
        }

        const newCap = Math.max(0, settings.newPerDay - daily.newIntroduced);
        const reviewCap = Math.max(0, settings.maxReviewsPerDay - daily.reviewsDone);
        const newToday = Math.min(newAvailable, newCap);
        const reviewToday = Math.min(reviewDue, reviewCap);

        return {
            total: studyable.length,
            seen,
            newToday,
            learningDue,
            reviewToday,
            dueTotal: newToday + learningDue + reviewToday,
            nextDueMs: this.getNextDueMs(records, now)
        };
    }
}

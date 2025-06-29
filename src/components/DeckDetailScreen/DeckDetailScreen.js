/* src\components\DeckDetailScreen\DeckDetailScreen.js */

// Component to display details of a selected deck and offer to start a quiz.

class DeckDetailScreen {
    /**
     * @param {HTMLElement} container The DOM element where the component will be rendered.
     * @param {function} onStartQuiz Callback function when the "Start Quiz" button is clicked.
     * @param {function} onGoBack Callback function to return to the deck list.
     */


    constructor(container, onStartQuiz, onGoBack, onResetDeck) {
        this.container = container;
        this.onStartQuiz = onStartQuiz;
        this.onGoBack = onGoBack;
        this.onResetDeck = onResetDeck;
        console.log("DEBUG: [DeckDetailScreen] constructor -> Component instantiated.");
    }
    /**
     * Renders the deck details into the container.
     * @param {object} deck The full deck object to display.
     * @param {object} progress The progress object for this deck { learned: number, review: number }.
     */
    async render(deck, progress) {
        console.log("DEBUG: [DeckDetailScreen] render -> Rendering details for deck:", deck);
        
        const html = await ComponentLoader.loadHTML('/src/components/DeckDetailScreen/deck-detail-screen.html');
        this.container.innerHTML = html;

        this.populateData(deck, progress);
        this.setupEventListeners();

        console.log("DEBUG: [DeckDetailScreen] render -> Detail screen rendered successfully.");
    }

    populateData(deck, progress) {
        document.getElementById('deck-title').textContent = deck.name;
        document.getElementById('deck-description').textContent = deck.description;

        const totalCount = deck.cards.length;
         const learnedCount = progress.learned;
        const reviewCount = progress.review;
        const unseenCount = totalCount - learnedCount - reviewCount;
        const isCompleted = learnedCount === totalCount;

        const progressStatsContainer = document.getElementById('progress-stats');
        progressStatsContainer.innerHTML = `
            <div><p class="text-4xl font-bold text-emerald-500">${learnedCount}</p><p class="text-sm text-gray-500 dark:text-gray-400">Learned</p></div>
            <div><p class="text-4xl font-bold text-amber-500">${reviewCount}</p><p class="text-sm text-gray-500 dark:text-gray-400">To Review</p></div>
            <div><p class="text-4xl font-bold text-gray-400">${Math.max(0, unseenCount)}</p><p class="text-sm text-gray-500 dark:text-gray-400">New</p></div>
        `;

        document.getElementById('total-progress-text').textContent = `You have mastered ${learnedCount} of ${totalCount} cards.`;
   const startQuizBtn = document.getElementById('start-quiz-btn');
        const resetDeckBtn = document.getElementById('reset-deck-btn');

        if (isCompleted) {
            startQuizBtn.textContent = 'Review Again';
            document.getElementById('total-progress-text').textContent = `Congratulations! You have mastered all ${totalCount} cards.`;
            resetDeckBtn.className += ' font-bold p-3 bg-red-100 dark:bg-red-900/50 rounded-lg';
        }
    }

    setupEventListeners() {
        document.getElementById('start-quiz-btn').addEventListener('click', () => this.onStartQuiz());
        document.getElementById('back-to-decks-btn').addEventListener('click', () => this.onGoBack());
        document.getElementById('reset-deck-btn').addEventListener('click', () => this.onResetDeck());
    }
}
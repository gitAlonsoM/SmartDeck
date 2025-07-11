/* src\components\DeckDetailScreen\DeckDetailScreen.js */

class DeckDetailScreen {
    /**
     * @param {HTMLElement} container The DOM element where the component will be rendered.
     * @param {function} onStartQuiz Callback to start the quiz.
     * @param {function} onGoBack Callback to return to the deck list.
     * @param {function} onReset Callback to reset deck progress.
     * @param {function} onUnignoreCard Callback to restore an ignored card.
     * @param {function} onExportForImprovement Callback to handle the export of marked cards.
     */
    constructor(container, onStartQuiz, onGoBack, onReset, onUnignoreCard, onExportForImprovement) {
        this.container = container;
        this.onStartQuiz = onStartQuiz;
        this.onGoBack = onGoBack;
        this.onResetDeck = onReset;
        this.onUnignoreCard = onUnignoreCard;
        this.onExportForImprovement = onExportForImprovement;
        this.deck = null; // Store the current deck data for internal use
        console.log("DEBUG: [DeckDetailScreen] constructor -> Component instantiated.");
    }

    /**
     * Renders the entire deck detail view.
     * @param {object} deck The full deck object to display.
     * @param {object} progressData The progress object for this deck { learned: Set, needsReview: Set, ignored: Set }.
     * @param {object} improvementData The object of cards marked for improvement.
     */
    async render(deck, progressData, improvementData) {
        console.log("DEBUG: [DeckDetailScreen] render -> Rendering details for deck:", deck.name);
        this.deck = deck;

        const html = await ComponentLoader.loadHTML('/src/components/DeckDetailScreen/deck-detail-screen.html');
        this.container.innerHTML = html;

        // Populate all dynamic sections of the component
        this._populateDeckInfo(deck, progressData);
        this._populateProgressStats(deck.cards.length, progressData);
        this._populateIgnoredCards(deck.cards, progressData.ignored);
        this._populateImprovementList(deck.cards, improvementData);

        // Attach all event listeners
        this.setupEventListeners();
    }

    /**
     * Populates the main deck title, description, and dynamic button text.
     * @param {object} deck The full deck object.
     * @param {object} progressData The progress data for the deck.
     */
    _populateDeckInfo(deck, progressData) {
        const totalCount = deck.cards.length;
        const learnedCount = progressData.learned.size;
        const isCompleted = (learnedCount + progressData.ignored.size) >= totalCount && progressData.needsReview.size === 0;

        document.getElementById('deck-title').textContent = deck.name;
        document.getElementById('deck-description').textContent = deck.description;
        document.getElementById('total-progress-text').textContent = `You have mastered ${learnedCount} of ${totalCount} cards.`;
        
        const startQuizBtn = document.getElementById('start-quiz-btn');
        const resetDeckBtn = document.getElementById('reset-deck-btn');
        if (isCompleted) {
            startQuizBtn.textContent = 'Review Again';
            document.getElementById('total-progress-text').textContent = `Congratulations! You have mastered all ${totalCount} cards.`;
            resetDeckBtn.className += ' font-bold p-3 bg-red-100 dark:bg-red-900/50 rounded-lg';
        }
    }

    /**
     * Populates the main progress stat counters (Learned, To Review, New).
     * @param {number} totalCount The total number of cards in the deck.
     * @param {object} progressData The progress data for the deck.
     */
    _populateProgressStats(totalCount, progressData) {
        const learnedCount = progressData.learned.size;
        const reviewCount = progressData.needsReview.size;
        const ignoredCount = progressData.ignored.size;
        const unseenCount = totalCount - learnedCount - reviewCount - ignoredCount;

        const progressStatsContainer = document.getElementById('progress-stats');
        progressStatsContainer.innerHTML = `
            <div class="flex-1"><p class="text-4xl font-bold text-emerald-500">${learnedCount}</p><p class="text-sm text-gray-500 dark:text-gray-400">Learned</p></div>
            <div class="flex-1"><p class="text-4xl font-bold text-amber-500">${reviewCount}</p><p class="text-sm text-gray-500 dark:text-gray-400">To Review</p></div>
            <div class="flex-1"><p class="text-4xl font-bold text-gray-400">${Math.max(0, unseenCount)}</p><p class="text-sm text-gray-500 dark:text-gray-400">New</p></div>
        `;
    }

    /**
     * Populates the list of ignored cards.
     * @param {Array} allCards The complete array of card objects from the deck.
     * @param {Set} ignoredSet A Set containing the cardIds of ignored cards.
     */
    _populateIgnoredCards(allCards, ignoredSet) {
        const listContainer = document.getElementById('ignored-cards-list');
        const badge = document.getElementById('ignored-count-badge');
        listContainer.innerHTML = '';
        badge.textContent = ignoredSet.size;

        if (ignoredSet.size === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">No ignored cards.</p>';
            return;
        }

        const cardMap = new Map(allCards.map(c => [c.cardId, c]));
        ignoredSet.forEach(cardId => {
            const card = cardMap.get(cardId);
            if (card) {
                const cardText = (card.sideA && typeof card.sideA === 'object') ? card.sideA.text : (card.question || card.sideA);
                const item = document.createElement('div');
                item.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md';
                item.innerHTML = `
                    <p class="text-sm text-gray-700 dark:text-gray-300 truncate pr-4">${cardText}</p>
                    <button data-card-id="${card.cardId}" class="restore-card-btn text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Restore</button>
                `;
                listContainer.appendChild(item);
            }
        });
    }

    /**
     * Populates the list of cards marked for improvement.
     * @param {Array} allCards The complete array of card objects from the deck.
     * @param {object} improvementData An object where keys are cardIds.
     */
    _populateImprovementList(allCards, improvementData) {
        const listContainer = document.getElementById('improvement-cards-list');
        const badge = document.getElementById('improvement-count-badge');
        const footer = document.getElementById('improvement-export-footer');
        listContainer.innerHTML = '';

        const markedCardIds = Object.keys(improvementData);
        badge.textContent = markedCardIds.length;

        if (markedCardIds.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">No cards marked for improvement.</p>';
            footer.classList.add('hidden');
            return;
        }

        const cardMap = new Map(allCards.map(c => [c.cardId, c]));
        markedCardIds.forEach(cardId => {
            const card = cardMap.get(cardId);
            const review = improvementData[cardId];
            if (card) {
                const cardText = (card.sideA && typeof card.sideA === 'object') ? card.sideA.text : (card.question || card.sideA);
                const item = document.createElement('div');
                item.className = 'p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md';
                item.innerHTML = `
                    <p class="font-semibold text-gray-800 dark:text-gray-200 truncate">${cardText}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Reasons: ${review.reasons.join(', ') || 'N/A'}</p>
                    ${review.note ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Note: <span class="italic">${review.note}</span></p>` : ''}
                `;
                listContainer.appendChild(item);
            }
        });

        footer.classList.remove('hidden');
    }

    /**
     * Attaches all necessary event listeners to the component's elements.
     */
    setupEventListeners() {
        document.getElementById('start-quiz-btn').addEventListener('click', () => this.onStartQuiz());
        document.getElementById('back-to-decks-btn').addEventListener('click', () => this.onGoBack());
        document.getElementById('reset-deck-btn').addEventListener('click', () => this.onResetDeck());

        // Use event delegation for the "Restore" buttons in the ignored list
        document.getElementById('ignored-cards-list').addEventListener('click', (event) => {
            if (event.target.classList.contains('restore-card-btn')) {
                const cardId = event.target.dataset.cardId;
                this.onUnignoreCard(cardId);
            }
        });

        // Add event listener for the export button if it exists
        const exportBtn = document.getElementById('export-improve-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.onExportForImprovement());
        }
    }
}
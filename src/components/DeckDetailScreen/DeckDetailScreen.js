/* src\components\DeckDetailScreen\DeckDetailScreen.js */

// Component to display details of a selected deck and offer to start a quiz.

class DeckDetailScreen {
    /**
     * @param {HTMLElement} container The DOM element where the component will be rendered.
     * @param {function} onStartQuiz Callback function when the "Start Quiz" button is clicked.
     * @param {function} onGoBack Callback function to return to the deck list.
     */

constructor(container, onStartQuiz, onGoBack, onResetDeck, onUnignoreCard) {
        this.container = container;
        this.onStartQuiz = onStartQuiz;
        this.onGoBack = onGoBack;
        this.onResetDeck = onResetDeck;
        this.onUnignoreCard = onUnignoreCard;
        console.log("DEBUG: [DeckDetailScreen] constructor -> Component instantiated.");
    }
    /**
     * Renders the deck details into the container.
     * @param {object} deck The full deck object to display.
     * @param {object} progress The progress object for this deck { learned: Set, needsReview: Set, ignored: Set }.
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
      const totalCount = deck.cards.length;
        const learnedCount = progress.learned.size;
        const reviewCount = progress.needsReview.size;
        const ignoredCount = progress.ignored.size;
        const unseenCount = totalCount - learnedCount - reviewCount - ignoredCount;
        const isCompleted = (learnedCount + ignoredCount) >= totalCount && reviewCount === 0;

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

        this.populateIgnoredCards(deck, progress.ignored);
    }

    populateIgnoredCards(deck, ignoredSet) {
        const ignoredCount = ignoredSet.size;
        document.getElementById('ignored-count-badge').textContent = ignoredCount;

        const listContainer = document.getElementById('ignored-cards-list');
        listContainer.innerHTML = '';

        if (ignoredCount === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-sm">No ignored cards.</p>';
            return;
        }

        const ignoredCards = Array.from(ignoredSet)
            .map(id => deck.cards.find(c => (c.cardId || c.question) === id))
            .filter(Boolean);
        
        ignoredCards.forEach(card => {
            const cardIdentifier = card.cardId || card.question;
            const cardText = card.sideA || card.question;
            
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md';
            item.innerHTML = `
                <p class="text-sm text-gray-700 dark:text-gray-300 truncate pr-4">${cardText}</p>
                <button data-card-id="${cardIdentifier}" class="restore-card-btn text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Restore</button>
            `;
            listContainer.appendChild(item);
        });
    }

    setupEventListeners() {
        document.getElementById('start-quiz-btn').addEventListener('click', () => this.onStartQuiz());
        document.getElementById('back-to-decks-btn').addEventListener('click', () => this.onGoBack());
        document.getElementById('reset-deck-btn').addEventListener('click', () => this.onResetDeck());

        const ignoredList = document.getElementById('ignored-cards-list');
        if (ignoredList) {
            ignoredList.addEventListener('click', (event) => {
                if (event.target.classList.contains('restore-card-btn')) {
                    const cardId = event.target.dataset.cardId;
                    this.onUnignoreCard(cardId);
                }
            });
        }
    }
}
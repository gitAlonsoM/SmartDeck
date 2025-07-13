/* src\components\DeckDetailScreen\DeckDetailScreen.js */
class DeckDetailScreen {
    /**
     * @param {HTMLElement} container The DOM element where the component will be rendered.
     * @param {function} onStartQuiz Callback to start the quiz.
     * @param {function} onGoBack Callback to return to the deck list.
     * @param {function} onReset Callback to reset deck progress.
     * @param {function} onUnignoreCard Callback to restore an ignored card.
     * @param {function} onUnmarkCardForImprovement Callback to remove a card from the improvement list.
     * @param {function} onExportForImprovement Callback to handle the export of marked cards.
     */
  constructor(container, onStartQuiz, onGoBack, onReset, onUnignoreCard, onUnmarkCardForImprovement, onExportForImprovement, onDeleteDeck) {
        this.container = container;
        this.onStartQuiz = onStartQuiz;
        this.onGoBack = onGoBack;
        this.onResetDeck = onReset;
        this.onUnignoreCard = onUnignoreCard;
        this.onUnmarkCardForImprovement = onUnmarkCardForImprovement;
        this.onExportForImprovement = onExportForImprovement;
        this.onDeleteDeck = onDeleteDeck; // Store the new callback
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

        // Load the main component HTML only if it's not already there
        if (!this.container.querySelector('#deck-detail-screen')) {
            const html = await ComponentLoader.loadHTML('/src/components/DeckDetailScreen/deck-detail-screen.html');
            this.container.innerHTML = html;
            this.setupEventListeners(); // Setup listeners only once after initial render
        }
        
        // Populate all dynamic sections of the component
        this._populateDeckInfo(deck, progressData);
        this._populateProgressStats(deck.cards.length, progressData);
        this._populateIgnoredCards(deck.cards, progressData.ignored);
        this._populateImprovementList(deck.cards, improvementData);
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

         // Conditionally show the delete button for AI-generated decks
        const deleteBtn = document.getElementById('delete-deck-btn');
        if (deck.isAiGenerated) {
            deleteBtn.classList.remove('hidden');
        } else {
            deleteBtn.classList.add('hidden');
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
     * Extracts a displayable text string from any card type.
     * @param {object} card The card object.
     * @returns {string} A displayable text for the card.
     */
    _getCardDisplayText(card) {
        if (!card) return 'Invalid Card';

        // 1. Standard quiz card with a 'question' property
        if (card.question) return card.question;

        // 2. Flippable cards (text, visual, or conversation)
        if (card.sideA) {
            // 2a. Simple text flippable card
            if (typeof card.sideA === 'string') return card.sideA;

            if (typeof card.sideA === 'object') {
                // 2b. Conversation card: return the first line of the conversation
                if (card.sideA.conversation && card.sideA.conversation.length > 0) {
                    return card.sideA.conversation[0].text;
                }
                // 2c. Standard text/visual card with a 'text' property
                if (card.sideA.text) return card.sideA.text;
            }
        }

        // 3. Fallback for audio-only cards (no text on Side A)
        // Per user request, use the first line of the answer on Side B as a fallback.
        if (card.sideB && card.sideB.length > 0) {
            return card.sideB[0];
        }

        return 'Card content not available'; // Final safety net
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
                const cardText = this._getCardDisplayText(card); // Use the new helper function
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
                const cardText = this._getCardDisplayText(card); // Use the new helper function
                const item = document.createElement('div');
                item.className = 'p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md';
                item.innerHTML = `
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex-grow min-w-0">
                            <p class="font-semibold text-gray-800 dark:text-gray-200 break-words">${cardText}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Reasons: ${review.reasons.join(', ') || 'N/A'}</p>
                            ${review.note ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Note: <span class="italic">${review.note}</span></p>` : ''}
                        </div>
                        <button data-card-id="${cardId}" class="unmark-card-btn text-xs font-semibold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex-shrink-0">&times; </button>
                    </div>
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
        document.getElementById('delete-deck-btn').addEventListener('click', () => this.onDeleteDeck(this.deck.id));

        this.container.addEventListener('click', (event) => {
            const restoreButton = event.target.closest('.restore-card-btn');
            if (restoreButton) {
                const cardId = restoreButton.dataset.cardId;
                this.onUnignoreCard(cardId);
            }
            
            const unmarkButton = event.target.closest('.unmark-card-btn');
            if (unmarkButton) {
                const cardId = unmarkButton.dataset.cardId;
                this.onUnmarkCardForImprovement(cardId);
            }
        });

        const exportBtn = document.getElementById('export-improve-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.onExportForImprovement());
        }
    }
}
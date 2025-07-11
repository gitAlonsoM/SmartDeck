//src\core\App.js
// The main application orchestrator.
// src/core/App.js
// The main application orchestrator.

// src/core/App.js
// The main application orchestrator.

class App {
    constructor() {
        console.log("DEBUG: [App] constructor -> Initializing App.");
        this.appContainer = document.getElementById('app-container');
        if (!this.appContainer) { throw new Error("Fatal Error: Application container '#app-container' not found."); }
        
        this.state = {
            allDecks: {},
            currentScreen: 'deckList', // 'deckList', 'deckDetail', 'quiz', 'results'
            currentDeckId: null,
            quizInstance: null,
        };

        // Component instances are initialized in setupComponents
        this.deckListComponent = null;
        this.aiDeckModal = null;
        this.deckDetailComponent = null;
        this.quizScreenComponent = null;
        this.flippableCardScreen = null; 
        this.notificationModal = null;
        this.improvementModal = null; // Add property for the new modal

    }

    async init() {
        console.log("DEBUG: [App] init -> Starting application initialization.");
        await this.setupComponents();
        await this.loadDecks();
        this.render();
        console.log("DEBUG: [App] init -> Application initialized successfully.");
    }

    async setupComponents() {
      const aiModalContainer = document.getElementById('ai-modal-container'); // This line was missing
       const notificationModalContainer = document.getElementById('notification-modal-container');
        const improvementModalContainer = document.getElementById('improvement-modal-container');

         // Ensure containers exist before proceeding
         if (!aiModalContainer || !notificationModalContainer || !improvementModalContainer) { 
             throw new Error("Fatal Error: Modal container(s) not found."); 
         }
         
         // Initialize each modal with its own dedicated container
         this.aiDeckModal = new AiDeckModal(aiModalContainer, (formData) => this.handleCreateDeck(formData));
         await this.aiDeckModal.init();

         this.notificationModal = new NotificationModal(notificationModalContainer);
         await this.notificationModal.init();

        this.improvementModal = new ImprovementModal(improvementModalContainer, (cardId, reviewData) => this.handleSaveImprovementRequest(cardId, reviewData));
        await this.improvementModal.init();

        console.log("DEBUG: [App] setupComponents -> All components initialized.");
    }

    async loadDecks() {
        console.log("DEBUG: [App] loadDecks -> Loading all decks.");
        let staticDecks = {};
        try {
            const deckFiles = ['plsql_deck.json', 'shell_deck.json', 'ios_android.json', 'http_rest_deep_dive.json', 'english_phrasal_verbs.json','it_commands_deck.json', 'ui_elements_deck.json', 'git_deck.json'];
            // Removed the leading '/' from the fetch path to make it relative
            const fetchPromises = deckFiles.map(file => fetch(`public/data/${file}`).then(res => res.json()));
            const loadedDecks = await Promise.all(fetchPromises);
            
            loadedDecks.forEach(deck => {
                console.log(`DEBUG: [App] loadDecks -> Successfully loaded static deck: ${deck.name}`);
                staticDecks[deck.id] = deck;
            });
        } catch (error) {
            console.error("DEBUG: [App] loadDecks -> CRITICAL ERROR loading static decks:", error);
        }
        
        const userDecks = StorageService.loadDecks();
        this.state.allDecks = { ...staticDecks, ...userDecks };
        console.log("DEBUG: [App] loadDecks -> Final merged state for allDecks:", this.state.allDecks);
    }
    
    render() {
        console.log(`DEBUG: [App] render -> Rendering screen: ${this.state.currentScreen}`);
        this.appContainer.innerHTML = '';

        switch(this.state.currentScreen) {
            case 'deckList':
                if (!this.deckListComponent) { this.deckListComponent = new DeckList(this.appContainer, (id) => this.handleDeckSelected(id), () => this.handleCreateDeckClicked()); }
                this.deckListComponent.render(this.state.allDecks);
                break;
            
            case 'deckDetail':
                if (!this.deckDetailComponent) { 
                this.deckDetailComponent = new DeckDetailScreen(
                    this.appContainer, 
                    () => this.handleStartQuiz(), 
                    () => this.handleGoBackToDecks(),
                   () => this.handleResetDeck(),
                   (cardId) => this.handleUnignoreCard(cardId),
                    () => this.handleExportForImprovement() // Add the new export handler
                ); 
            }
              const selectedDeck = this.state.allDecks[this.state.currentDeckId];
                  const deckProgressData = StorageService.loadDeckProgress(this.state.currentDeckId);
                const improvementData = StorageService.loadImprovementData(this.state.currentDeckId); // Load improvement data
                
                this.deckDetailComponent.render(selectedDeck, deckProgressData, improvementData); // Pass all required data
                break;

            case 'quiz':
                if (!this.quizScreenComponent) { 
                   this.quizScreenComponent = new QuizScreen(
                       this.appContainer, 
                        (option) => this.handleQuizAnswer(option), 
                        () => this.handleQuizNext(),
                        () => this.handleQuizEnd(),
                        () => this.handleIgnoreCurrentCard(),
                            (cardId) => this.handleMarkCardForImprovement(cardId) // Pass the new handler
                    ); 
                }

                const currentQuestion = this.state.quizInstance.getCurrentQuestion();
                if (currentQuestion) {
                    this.quizScreenComponent.render(currentQuestion, this.state.quizInstance.currentIndex, this.state.quizInstance.questions.length, this.state.quizInstance.score);
                } else {
                    console.error("DEBUG: [App] render -> Tried to render quiz, but no current question found.");
                    this.handleGoBackToDecks();
                }
                break;

                 case 'flippableQuiz':
                if (!this.flippableCardScreen) {
                    this.flippableCardScreen = new FlippableCardScreen(

                       this.appContainer,
                     (knewIt) => this.handleCardAssessment(knewIt),
                       () => this.handleQuizEnd(),
                        () => this.handleIgnoreCurrentCard(),
                            (cardId) => this.handleMarkCardForImprovement(cardId) // Pass the new handler
                    );
                }
                const currentCard = this.state.quizInstance.getCurrentCard();
                const deckName = this.state.allDecks[this.state.currentDeckId].name;
                if (currentCard) {
                    this.flippableCardScreen.render(deckName, currentCard, this.state.quizInstance.currentIndex, this.state.quizInstance.currentCards.length);
                } else {
                    this.handleQuizEnd(); // Should not happen if logic is correct, but as a safeguard
                }
                break;

            default:
                console.error(`DEBUG: [App] render -> Unknown screen state: ${this.state.currentScreen}`);
                this.appContainer.innerHTML = `<p class="text-red-500">Application error: Unknown state.</p>`;
        }
    }


    handleMarkCardForImprovement(cardId) {
        if (!cardId) return;
        console.log(`DEBUG: [App] handleMarkCardForImprovement -> User wants to mark card: ${cardId}`);
        this.improvementModal.show(cardId);
    }

    handleSaveImprovementRequest(cardId, reviewData) {
        if (!cardId || !this.state.currentDeckId) return;
        console.log(`DEBUG: [App] handleSaveImprovementRequest -> Saving improvement request for card ${cardId}`, reviewData);

        const improvementData = StorageService.loadImprovementData(this.state.currentDeckId);
        improvementData[cardId] = reviewData;
        StorageService.saveImprovementData(this.state.currentDeckId, improvementData);

        this.notificationModal.show(
            'Card Marked',
            'The card has been successfully marked for improvement.',
            { icon: 'fa-solid fa-flag', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900' }
        );
    }

    // --- State Changers & Event Handlers ---
  async handleExportForImprovement() {
        const deckId = this.state.currentDeckId;
        if (!deckId) return;

        console.log(`DEBUG: [App] handleExportForImprovement -> Preparing export for deck ${deckId}`);
        const deck = this.state.allDecks[deckId];
        const improvementData = StorageService.loadImprovementData(deckId);
        const markedCardIds = Object.keys(improvementData);

        if (markedCardIds.length === 0) {
            this.notificationModal.show('Export', 'There are no cards marked for improvement to export.');
            return;
        }

        const cardMap = new Map(deck.cards.map(c => [c.cardId, c]));
        const exportBatch = markedCardIds.map(cardId => {
            const card = cardMap.get(cardId);
            const review_request = improvementData[cardId];
            return { ...card, review_request }; // Add the review_request object to the card copy
        });

        try {
            await navigator.clipboard.writeText(JSON.stringify(exportBatch, null, 2));
            this.notificationModal.show(
                'Copied to Clipboard!',
                `${exportBatch.length} card(s) have been copied as a JSON array, ready for improvement.`,
                { icon: 'fa-solid fa-copy', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900' }
            );
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.notificationModal.show('Error', 'Could not copy data to clipboard. See console for details.');
        }
    }

     handleIgnoreCurrentCard() {
        if (!this.state.quizInstance) return;
    
        const quiz = this.state.quizInstance;
        const isFlippable = quiz instanceof SpacedRepetitionQuiz;
        const currentCard = isFlippable ? quiz.getCurrentCard() : quiz.getCurrentQuestion();
        
        if (!currentCard) return;
    
        // Standardize on cardId for all card types.
        const cardIdentifier = currentCard.cardId; 
        console.log(`DEBUG: [App] handleIgnoreCurrentCard -> Ignoring card and advancing. ID: ${cardIdentifier}`);

        if (!quiz.progress.ignored) {
            quiz.progress.ignored = new Set();
        }
    
        quiz.progress.ignored.add(cardIdentifier);
        quiz.progress.learned.delete(cardIdentifier);
        quiz.progress.needsReview.delete(cardIdentifier);
    
        StorageService.saveDeckProgress(this.state.currentDeckId, quiz.progress);
    
        // UX Improvement: Immediately move to the next card.
        // We simulate a correct answer just to advance the quiz flow.
        if (isFlippable) {
        // We call the next card logic directly, without assessing/scoring.
            quiz.moveToNextCard();
            if (quiz.isQuizOver()) {
                this.handleQuizEnd();
            } else {
                this.render();
            }
        } else {
            // For multiple choice, we need to show feedback briefly before advancing.
            const correctAnswer = quiz.getCurrentQuestion().correctAnswer;
            this.quizScreenComponent.showFeedback(false, correctAnswer); // Show correct answer
            setTimeout(() => this.handleQuizNext(), 500); // Advance after a short delay
        }
    }

    handleUnignoreCard(cardIdentifier) {
        if (!this.state.currentDeckId) return;
        console.log(`DEBUG: [App] handleUnignoreCard -> Restoring card: ${cardIdentifier}`);
        const progress = StorageService.loadDeckProgress(this.state.currentDeckId);
        progress.ignored.delete(cardIdentifier);
        StorageService.saveDeckProgress(this.state.currentDeckId, progress);
        this.render(); // Re-render the detail screen to reflect the change
    }


    // =========================================================================
    /**
     * Analyzes a deck for duplicate cards based on the 'question' field and logs the results.
     * @param {object} deck - The deck object to analyze.
     */
    analyzeAndLogDuplicates(deck) {
        console.groupCollapsed(`[ANALYSIS] Deck: ${deck.name} (ID: ${deck.id})`);

        if (!deck || !deck.cards || deck.cards.length === 0) {
            console.log("Deck is empty or invalid. Cannot analyze.");
            console.groupEnd();
            return;
        }

        console.log(`Analyzing ${deck.cards.length} total cards...`);

        const seenQuestions = new Map(); // Stores question -> first index found
        const duplicates = new Map(); // Stores question -> array of all indices

        deck.cards.forEach((card, index) => {
            const question = card.question;

            if (seenQuestions.has(question)) {
                // This is a duplicate
                if (!duplicates.has(question)) {
                    // First time we've found a duplicate of this question, so add the original and this one
                    const originalIndex = seenQuestions.get(question);
                    duplicates.set(question, [originalIndex, index]);
                } else {
                    // We've already logged this question as a duplicate, just add the new index
                    duplicates.get(question).push(index);
                }
            } else {
                // First time seeing this question
                seenQuestions.set(question, index);
            }
        });

        if (duplicates.size > 0) {
            let totalDuplicateCards = 0;
            duplicates.forEach(indices => {
                totalDuplicateCards += indices.length - 1; // Count only the "extra" cards
            });
            
            console.warn(`Found ${duplicates.size} unique questions that are duplicated.`);
            console.warn(`Total number of duplicate cards (extras): ${totalDuplicateCards}`);
            console.log("--- DUPLICATE DETAILS ---");

            duplicates.forEach((indices, question) => {
                console.log(`-> Question: "${question}"`);
                console.log(`   Found at indices: ${indices.join(', ')}`);
            });

        } else {
            console.log("No duplicate cards found in this deck. All questions are unique.");
        }

        console.groupEnd();
    }
    // =========================================================================

    handleDeckSelected(deckId) {
        console.log(`DEBUG: [App] handleDeckSelected -> Deck with ID '${deckId}' was selected.`);
        const selectedDeck = this.state.allDecks[deckId];

        // Se ejecuta solo para el mazo que nos interesa
        if (deckId === 'plsql_deck') {
            this.analyzeAndLogDuplicates(selectedDeck);
        }
        
        this.state.currentDeckId = deckId;
        this.state.currentScreen = 'deckDetail';
        this.render();
    }

    handleGoBackToDecks() {
        console.log("DEBUG: [App] handleGoBackToDecks -> Returning to deck list.");
        this.state.currentDeckId = null;
        this.state.quizInstance = null;
        this.state.currentScreen = 'deckList';
        this.render();
    }

    handleStartQuiz() {
        console.log(`DEBUG: [App] handleStartQuiz -> 'Start Quiz' clicked for deck ID: ${this.state.currentDeckId}.`);
        const deck = this.state.allDecks[this.state.currentDeckId];
        if (!deck || deck.cards.length === 0) {
            alert("This deck has no cards to study!");
            return;
        }

    const progress = StorageService.loadDeckProgress(this.state.currentDeckId);

        // --- DECK TYPE ROUTER ---
        if (deck.deckType === 'flippable') {
            console.log("DEBUG: [App] handleStartQuiz -> Starting a 'flippable' quiz.");
            this.state.quizInstance = new SpacedRepetitionQuiz(deck.cards, progress);
            this.state.quizInstance.generateQuizRound(7);
            this.state.currentScreen = 'flippableQuiz';
        } else {
            // Default to multiple choice quiz
            console.log("DEBUG: [App] handleStartQuiz -> Starting a 'multipleChoice' quiz.");
            this.state.quizInstance = new Quiz(deck.cards, progress);
            this.state.quizInstance.generateQuizRound(7);
            this.state.currentScreen = 'quiz';
        }
 // Check if the generated round is empty, using the correct property for each quiz type
        let roundIsEmpty = false;
        if (this.state.quizInstance instanceof SpacedRepetitionQuiz) {
        	roundIsEmpty = this.state.quizInstance.currentCards.length === 0;
        } else { // It's a standard Quiz
        	roundIsEmpty = this.state.quizInstance.questions.length === 0;
        }

        if (roundIsEmpty) {
            alert("Congratulations! You've learned all the cards in this deck. Reset the deck to study again.");
            return;
        }

        this.render();
    }

    handleQuizAnswer(selectedOption) {
        console.log(`DEBUG: [App] handleQuizAnswer -> User selected: ${selectedOption}`);
        this.quizScreenComponent.lastSelectedOption = selectedOption;
        const isCorrect = this.state.quizInstance.answer(selectedOption);
        const correctAnswer = this.state.quizInstance.getCurrentQuestion().correctAnswer;
        
        this.quizScreenComponent.showFeedback(isCorrect, correctAnswer);
        
        const scoreElement = document.getElementById('quiz-score');
        if(scoreElement) {
            scoreElement.textContent = `Score: ${this.state.quizInstance.score}`;
        }
    }

    /**
     * Handles the user's self-assessment from the FlippableCardScreen.
     * @param {boolean} knewIt - The user's assessment (true for 'I Knew It', false for 'Review Again').
     */
    handleCardAssessment(knewIt) {
        console.log(`DEBUG: [App] handleCardAssessment -> User assessed with knewIt: ${knewIt}`);
        this.state.quizInstance.selfAssess(knewIt);
        this.state.quizInstance.moveToNextCard();

        if (this.state.quizInstance.isQuizOver()) {
            console.log("DEBUG: [App] handleCardAssessment -> Flippable quiz is over.");
            this.handleQuizEnd();
        } else {
            this.render();
        }
    }

    handleQuizNext() {
        console.log("DEBUG: [App] handleQuizNext -> Moving to next question.");
        this.state.quizInstance.moveToNextQuestion();
        if (this.state.quizInstance.isQuizOver()) {
        console.log("DEBUG: [App] handleQuizNext -> Quiz is over, handling completion.");
        this.handleQuizEnd(); // Delegate to the new end-of-quiz handler
    } else {
        this.render();
    }
}

/**
 * Handles the logic for when a quiz round is completed.
 */
/**
 * @param {number} total - The total number of questions in the round.
 * @returns {string} A formatted message for the user.
 */
_getRoundEndMessage(score, total) {
    // Calculate the percentage, handling the case of zero total questions to avoid division by zero.
    const percentage = total > 0 ? (score / total) * 100 : 0;
    
    let result = {
        title: '',
        message: '',
        iconStyle: { icon: '', color: '', bgColor: '' }
    };

    // Assign title, message, and icon based on percentage tiers.
    if (percentage === 100) {
        result.title = 'PERFECT SCORE!';
        result.message = total < 10 ? `You nailed all ${total} questions! Perfect round!` : 'Incredible! Flawless victory! You are an expert!';
        result.iconStyle = { icon: 'fa-solid fa-crown', color: 'text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900' };
    } else if (percentage >= 90) {
        result.title = 'Outstanding!';
        result.message = 'Nearly perfect! You have truly mastered this subject.';
        result.iconStyle = { icon: 'fa-solid fa-bolt', color: 'text-indigo-500', bgColor: 'bg-indigo-100 dark:bg-indigo-900' };
    } else if (percentage >= 80) {
        result.title = 'Excellent!';
        result.message = 'Your knowledge is shining through. Fantastic result!';
        result.iconStyle = { icon: 'fa-solid fa-star', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900' };
    } else if (percentage >= 70) {
        result.title = 'Great Work!';
        result.message = "A solid grasp of the material. That's impressive!";
        result.iconStyle = { icon: 'fa-solid fa-thumbs-up', color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900' };
    } else if (percentage >= 60) {
        result.title = 'Well Done!';
        result.message = 'Over half correct! You are demonstrating a good understanding.';
        result.iconStyle = { icon: 'fa-solid fa-award', color: 'text-sky-500', bgColor: 'bg-sky-100 dark:bg-sky-900' };
    } else if (percentage >= 50) {
        result.title = 'Halfway!';
        result.message = 'You hit the 50% mark! Keep up the great momentum!';
        result.iconStyle = { icon: 'fa-solid fa-mountain-sun', color: 'text-teal-500', bgColor: 'bg-teal-100 dark:bg-teal-900' };
    } else if (percentage >= 40) {
        result.title = 'Getting There!';
        result.message = 'Solid work! Consistency is your greatest ally.';
        result.iconStyle = { icon: 'fa-solid fa-chart-line', color: 'text-cyan-500', bgColor: 'bg-cyan-100 dark:bg-cyan-900' };
    } else if (percentage >= 20) {
        result.title = 'Building Blocks!';
        result.message = 'You are laying the foundation for success.';
        result.iconStyle = { icon: 'fa-solid fa-layer-group', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900' };
    } else if (percentage > 0) {
        result.title = 'First Step!';
        result.message = 'You got one! The journey of a thousand miles begins with a single step.';
        result.iconStyle = { icon: 'fa-solid fa-shoe-prints', color: 'text-lime-500', bgColor: 'bg-lime-100 dark:bg-lime-900' };
    } else { // percentage === 0
        result.title = 'Keep Trying!';
        result.message = "Every master was once a beginner. Don't give up!";
        result.iconStyle = { icon: 'fa-solid fa-lightbulb', color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900' };
    }

    return result;
}

async handleQuizEnd() {
  const instance = this.state.quizInstance;
    const isFlippableQuiz = instance instanceof SpacedRepetitionQuiz;
    console.log(`DEBUG: [App] handleQuizEnd -> Ending round. Is Flippable: ${isFlippableQuiz}. Saving progress.`);

    const score = instance.score;
    const total = isFlippableQuiz ? instance.currentCards.length : instance.questions.length;

    // Get the dynamic message object from the recycled function
    const result = this._getRoundEndMessage(score, total);
    
    // Create a context-aware message
    let scoreMessage;
    if (isFlippableQuiz) {
        scoreMessage = `You marked ${score} of ${total} cards as known.\n${result.message}`;
    } else {
        scoreMessage = `You got ${score} out of ${total} correct.\n${result.message}`;
    }

    // Show the final modal
    await this.notificationModal.show(result.title, scoreMessage, result.iconStyle);
    // The Quiz instance has been tracking progress; now we save it.
    StorageService.saveDeckProgress(this.state.currentDeckId, this.state.quizInstance.progress);

    // After saving, check if the entire deck is mastered
    const currentDeck = this.state.allDecks[this.state.currentDeckId];
    const latestProgress = StorageService.loadDeckProgress(this.state.currentDeckId);
    if (currentDeck && latestProgress.learned.size === currentDeck.cards.length) {
        console.log(`DEBUG: [App] handleQuizEnd -> Deck ${this.state.currentDeckId} is fully mastered.`);
        const masteryMessage = "Your persistence and effort have paid off, and you've learned all the cards in this deck.\n\nFeel free to reset it and practice again anytime!";
        await this.notificationModal.show(
            'Deck Mastered!',
            masteryMessage,
            { icon: 'fa-solid fa-trophy', color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900' }
        );
    }

    this.state.quizInstance = null; // Clear the completed quiz instance
    this.state.currentScreen = 'deckDetail'; // Go back to the deck detail screen
    this.render();
}


handleResetDeck() {
    const deckId = this.state.currentDeckId;
    if (confirm("Are you sure you want to reset all progress for this deck? This action cannot be undone.")) {
        console.log(`DEBUG: [App] handleResetDeck -> Resetting progress for deck ${deckId}.`);
        StorageService.clearDeckProgress(deckId); // Assumes you add this method to StorageService
        this.render(); // Re-render the detail screen to show updated progress
    }
}

/**
 * Handles the click event to show the AI Deck creation modal.
 */
handleCreateDeckClicked() {
    console.log("DEBUG: [App] handleCreateDeckClicked -> Opening AI deck creation modal.");
    // This function was missing. It's responsible for showing the modal.
    this.aiDeckModal.show();
}

    async handleCreateDeck(formData) {
        console.log("DEBUG: [App] handleCreateDeck -> Received form data to create a new deck:", formData);
        this.aiDeckModal.setLoading(true);
        localStorage.setItem('smart-decks-v3-apiKey', formData.apiKey); 

        try {
            const newCards = await ApiService.generateCards(formData);
            if (!newCards || newCards.length === 0) { throw new Error("The AI returned no cards."); }
            const newDeckId = `ai_${Date.now()}`;
            const newDeck = {
                id: newDeckId, name: formData.title, description: `Topic: ${formData.prompt}`,
                cards: newCards, isAiGenerated: true,
            };
            this.state.allDecks[newDeckId] = newDeck;
            const aiDecksToSave = Object.values(this.state.allDecks).reduce((acc, deck) => {
                if (deck.isAiGenerated) { acc[deck.id] = deck; }
                return acc;
            }, {});
            StorageService.saveDecks(aiDecksToSave);
            this.aiDeckModal.hide();
            this.render(); 
            alert(`Deck "${formData.title}" created successfully with ${newCards.length} cards!`);
        } catch (error) {
            console.error("DEBUG: [App] handleCreateDeck -> Error during deck creation process:", error);
            alert(`Error generating deck: ${error.message}`);
        } finally {
            this.aiDeckModal.setLoading(false);
        }
    }
}

// --- Application Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        const app = new App();
        app.init();
    } catch (error) {
        console.error("FATAL: Could not start the application.", error);
        document.body.innerHTML = `<div class="text-red-500 p-8">A fatal error occurred. Please check the console.</div>`;
    }
});
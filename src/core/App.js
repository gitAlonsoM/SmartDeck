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
    }

    async init() {
        console.log("DEBUG: [App] init -> Starting application initialization.");
        await this.setupComponents();
        await this.loadDecks();
        this.render();
        console.log("DEBUG: [App] init -> Application initialized successfully.");
    }

    async setupComponents() {
        console.log("DEBUG: [App] setupComponents -> Initializing all components.");
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) { throw new Error("Fatal Error: Modal container '#modal-container' not found."); }
        
        this.aiDeckModal = new AiDeckModal(modalContainer, (formData) => this.handleCreateDeck(formData));
        await this.aiDeckModal.init();
        console.log("DEBUG: [App] setupComponents -> All components initialized.");
    }

    async loadDecks() {
        console.log("DEBUG: [App] loadDecks -> Loading all decks.");
        let staticDecks = {};
        try {
            const deckFiles = ['plsql_deck.json', 'shell_deck.json', 'ios_android.json'];
            const fetchPromises = deckFiles.map(file => fetch(`/public/data/${file}`).then(res => res.json()));
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
                    () => this.handleResetDeck() 
                ); 
            }
                const selectedDeck = this.state.allDecks[this.state.currentDeckId];
                const deckProgressData = StorageService.loadDeckProgress(this.state.currentDeckId);
                const progressStats = {
                    learned: deckProgressData.learned.size,
                    review: deckProgressData.needsReview.size
                };
                this.deckDetailComponent.render(selectedDeck, progressStats);
                break;

             case 'quiz':
                if (!this.quizScreenComponent) { 
                    this.quizScreenComponent = new QuizScreen(
                        this.appContainer, 
                        (option) => this.handleQuizAnswer(option), 
                        () => this.handleQuizNext(),
                        () => this.handleQuizEnd() // Connect the onQuizEnd callback
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

            default:
                console.error(`DEBUG: [App] render -> Unknown screen state: ${this.state.currentScreen}`);
                this.appContainer.innerHTML = `<p class="text-red-500">Application error: Unknown state.</p>`;
        }
    }

    // --- State Changers & Event Handlers ---

    handleDeckSelected(deckId) {
        console.log(`DEBUG: [App] handleDeckSelected -> Deck with ID '${deckId}' was selected.`);
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
            this.state.quizInstance = new Quiz(deck.cards, progress);
        this.state.quizInstance.generateQuizRound(10);

        if (this.state.quizInstance.questions.length === 0) {
            alert("No available cards for a new quiz round!");
            return;
        }

        this.state.currentScreen = 'quiz';
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
handleQuizEnd() {
    console.log(`DEBUG: [App] handleQuizEnd -> Final score: ${this.state.quizInstance.score}/${this.state.quizInstance.questions.length}. Saving progress.`);
    
    // The Quiz instance has been tracking progress; now we just save it.
    StorageService.saveDeckProgress(this.state.currentDeckId, this.state.quizInstance.progress);

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
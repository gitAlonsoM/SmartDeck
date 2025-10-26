//src\core\App.js
class App {
    constructor() {
        console.log("DEBUG: [App] constructor -> Initializing App.");
        this.appContainer = document.getElementById('app-container');

         this.musicService = null; // Property for the music service instance

        if (!this.appContainer) { throw new Error("Fatal Error: Application container '#app-container' not found."); }
        
        this.state = {
            allDecks: {},
            currentScreen: 'deckList', // 'deckList', 'deckDetail', 'quiz', 'results'
            currentDeckId: null,
            quizInstance: null,
                        favoriteDeckIds: new Set(), // Track favorite decks

        };

        // Component instances are initialized in setupComponents
        this.deckListComponent = null;
        this.aiDeckModal = null;
        this.deckDetailComponent = null;
        this.quizScreenComponent = null;
        this.flippableCardScreen = null; 
        this.audioChoiceScreen = null; 
        this.notificationModal = null;
        this.improvementModal = null; 
        this.infoModal = null; 
        this.glossaryScreen = null;

    }

    async init() {
        console.log("DEBUG: [App] init -> Starting application initialization.");
        await this.setupComponents();
        await this.loadDecks();
        this.render();
        console.log("DEBUG: [App] init -> Application initialized successfully.");
    }

    async setupComponents() {
      const aiModalContainer = document.getElementById('ai-modal-container'); 
       const notificationModalContainer = document.getElementById('notification-modal-container');

        console.log("DEBUG: [App] setupComponents -> Initializing MusicService.");
        this.musicService = new MusicService();

        const improvementModalContainer = document.getElementById('improvement-modal-container');


         // Initialize the Text-to-Speech service at the beginning.
        console.log("DEBUG: [App] setupComponents -> Initializing TTSService.");
        await TTSService.init();

        const confirmationModalContainer = document.getElementById('confirmation-modal-container'); 

        // Ensure containers exist before proceeding
        if (!aiModalContainer || !notificationModalContainer || !improvementModalContainer || !confirmationModalContainer) { 
            throw new Error("Fatal Error: Modal container(s) not found."); 
        }
         
         // Initialize each modal with its own dedicated container
         this.aiDeckModal = new AiDeckModal(aiModalContainer, (formData) => this.handleCreateDeck(formData));


            await this.aiDeckModal.init();

         this.notificationModal = new NotificationModal(notificationModalContainer);
         await this.notificationModal.init();



        this.improvementModal = new ImprovementModal(
            improvementModalContainer, 
            (cardId, reviewData) => this.handleSaveImprovementRequest(cardId, reviewData),
            (cardId) => this.handleUnmarkCardForImprovement(cardId) // Pass the remove handler
        );
        
        await this.improvementModal.init();

         // Initialize the new confirmation modal
        this.confirmationModal = new ConfirmationModal(confirmationModalContainer);
        await this.confirmationModal.init();
        
        const infoModalContainer = document.getElementById('info-modal-container');
        if (!infoModalContainer) { throw new Error("Fatal Error: InfoModal container not found."); }
        this.infoModal = new InfoModal(infoModalContainer);
        await this.infoModal.init();
        console.log("DEBUG: [App] setupComponents -> Pre-loading essential glossaries.");

        // Setup for the new GlossaryScreen
        const glossaryScreenContainer = document.getElementById('glossary-screen-container');
        if (!glossaryScreenContainer) { throw new Error("Fatal Error: GlossaryScreen container not found."); }
        
        this.glossaryScreen = new GlossaryScreen(
            glossaryScreenContainer,
            () => this.handleGoBackToDecks() // Re-use the existing handler to return to the dashboard
        );
        await this.glossaryScreen.init();


    await GlossaryService.loadGlossary('english_rules');
    console.log("DEBUG: [App] setupComponents -> Glossaries pre-loaded.");
    
        console.log("DEBUG: [App] setupComponents -> All components initialized.");
    }
    /**
     * Handles the request to show an informational modal for a glossary term.
     * @param {string} termKey - The unique key for the term (e.g., 'subject_question').
     */
    async handleShowInfoModal(termKey) {
        if (!termKey) return;
        console.log(`DEBUG: [App] handleShowInfoModal -> Request to show modal for term: ${termKey}`);
        
        // For now, we assume all terms are in the 'english_rules' glossary.
        // This can be made more dynamic later if needed.
        const termData = await GlossaryService.getTerm('english_rules', termKey);

        if (termData) {
            this.infoModal.show(termData.title, termData.content);
        } else {
            this.notificationModal.show(
                'Not Found',
                `Sorry, the definition for '${termKey.replace('_', ' ')}' could not be found.`,
                { icon: 'fa-solid fa-question-circle', color: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-900' }
            );
        }
    }

      /**
     * Handles the start of card audio playback to lower background music volume.
     */
    handleCardAudioStart() {
        console.log("DEBUG: [App] handleCardAudioStart -> Event received. Lowering music volume.");
        if (this.musicService) {
            this.musicService.lowerVolume();
        }
    }

    /**
     * Handles the end of card audio playback to restore background music volume.
     */
    handleCardAudioEnd() {
        console.log("DEBUG: [App] handleCardAudioEnd -> Event received. Restoring music volume.");
        if (this.musicService) {
            this.musicService.restoreVolume();
        }
    }


     /**
     * Handles the request to delete a user-created deck.
     * @param {string} deckId The ID of the deck to delete.
     */
    async handleDeleteDeckRequest(deckId) {
        if (!deckId) return;
        const deckToDelete = this.state.allDecks[deckId];
        if (!deckToDelete || !deckToDelete.isAiGenerated) {
            console.warn(`[App] handleDeleteDeckRequest -> Attempted to delete a non-AI deck or invalid deck ID: ${deckId}`);
            return;
        }

        console.log(`DEBUG: [App] handleDeleteDeckRequest -> Request to delete deck: ${deckId}`);
        const title = `Delete "${deckToDelete.name}"?`;
        const message = "Are you sure you want to permanently delete this deck? All of its progress and data will be lost. This action cannot be undone.";
        
        const confirmed = await this.confirmationModal.show(title, message);

        if (confirmed) {
            console.log(`DEBUG: [App] handleDeleteDeckRequest -> User confirmed deletion for deck: ${deckId}`);
            StorageService.deleteDeck(deckId);
            
            // Show a success notification
            await this.notificationModal.show(
                'Deck Deleted', 
                `The deck "${deckToDelete.name}" has been successfully deleted.`,
                { icon: 'fa-solid fa-trash-can', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700' }
            );

            // Reload decks from storage and navigate back to the list
            await this.loadDecks();
            this.handleGoBackToDecks();
        } else {
            console.log(`DEBUG: [App] handleDeleteDeckRequest -> User cancelled deletion for deck: ${deckId}`);
        }
    }

      /**
     * Toggles the favorite status of a deck.
     * @param {string} deckId The ID of the deck to toggle.
     */
    handleToggleFavorite(deckId) {
        if (!deckId) return;
        console.log(`DEBUG: [App] handleToggleFavorite -> Toggling favorite for deck ID: ${deckId}`);
        const { favoriteDeckIds } = this.state;
        
        if (favoriteDeckIds.has(deckId)) {
            favoriteDeckIds.delete(deckId);
        } else {
            favoriteDeckIds.add(deckId);
        }

        StorageService.saveFavorites(favoriteDeckIds);
        
        // Re-render the deck list to reflect the change in order
        if (this.state.currentScreen === 'deckList') {
            this.render();
        }
    }

    async loadDecks() {
         console.log("DEBUG: [App] loadDecks -> Loading all decks.");
        let staticDecks = {};
        try {
            const deckFiles = ['plsql_deck.json', 'shell_deck.json', 'ios_android.json', 'phrasal_verbs_audio_choice.json', 'http_rest_deep_dive.json', 'english_phrasal_verbs.json','it_commands_deck_01.json', 'ui_elements_deck.json', 'git_deck.json', 'tech_online_meetings_deck.json', 'tech_conversation_deck_01.json', 'technical_project_plan.json', 'flutter_dart_getx_deck.json', 'common_meeting.json', 'ebs.json' , 'dev_workflow.json'];
            // Modify the fetch process to attach the filename to each loaded deck object.
           const updatedDeckFiles = [...deckFiles, 'english_grammar_audio_choice.json'];
            
            const fetchPromises = updatedDeckFiles.map(file => 
                fetch(`public/data/${file}`)
                    .then(res => res.json())
                    .then(deck => {
                        // Add the actual filename to the deck object for later reference.
                        deck.fileName = file; 
                        return deck;
                    })
            );

            const loadedDecks = await Promise.all(fetchPromises);
            
            loadedDecks.forEach(deck => {
                console.log(`DEBUG: [App] loadDecks -> Successfully loaded static deck: ${deck.name} (File: ${deck.fileName})`);
                staticDecks[deck.id] = deck;
            });
        } catch (error) {
            console.error("DEBUG: [App] loadDecks -> CRITICAL ERROR loading static decks:", error);
        }
        
        const userDecks = StorageService.loadDecks();
        this.state.favoriteDeckIds = StorageService.loadFavorites(); // Load favorites status
        this.state.allDecks = { ...staticDecks, ...userDecks };
        console.log("DEBUG: [App] loadDecks -> Final merged state for allDecks:", this.state.allDecks);
    }
    
    render() {
        console.log(`DEBUG: [App] render -> Rendering screen: ${this.state.currentScreen}`);
        this.appContainer.innerHTML = '';


        // Select containers
        const mainAppContainer = document.getElementById('app-container');
        const glossaryScreenContainer = document.getElementById('glossary-screen-container');
        
        // Default state: show app, hide glossary
        mainAppContainer.style.display = 'block';
        glossaryScreenContainer.style.display = 'none';


        switch(this.state.currentScreen) {
           case 'deckList':
                if (!this.deckListComponent) { 
                    this.deckListComponent = new DeckList(
                        this.appContainer, 
                        (id) => this.handleDeckSelected(id), 
                        () => this.handleCreateDeckClicked(),
                        (id) => this.handleToggleFavorite(id), 
                        this.musicService,
                        () => this.handleShowGlossary() 
                    ); 
                }
                
                // Sort decks: favorites first, then by name
                const sortedDecks = Object.values(this.state.allDecks).sort((a, b) => {
                    const aIsFavorite = this.state.favoriteDeckIds.has(a.id);
                    const bIsFavorite = this.state.favoriteDeckIds.has(b.id);
                    if (aIsFavorite && !bIsFavorite) return -1;
                    if (!aIsFavorite && bIsFavorite) return 1;
                    return a.name.localeCompare(b.name); // Secondary sort by name
                });

                this.deckListComponent.render(sortedDecks, this.state.favoriteDeckIds);
                break;
            case 'deckDetail':
                if (!this.deckDetailComponent) { 
                this.deckDetailComponent = new DeckDetailScreen(
                        this.appContainer, 
                        () => this.handleStartQuiz(), 
                        () => this.handleGoBackToDecks(),
                        () => this.handleResetDeck(),
                        (cardId) => this.handleUnignoreCard(cardId),
                        (cardId) => this.handleUnmarkCardForImprovement(cardId),
                        () => this.handleExportForImprovement(),
                        (deckId) => this.handleDeleteDeckRequest(deckId) // Pass the new delete handler
                    ); 
            }
              const selectedDeck = this.state.allDecks[this.state.currentDeckId];
                  const deckProgressData = StorageService.loadDeckProgress(this.state.currentDeckId);
                const improvementData = StorageService.loadImprovementData(this.state.currentDeckId); // Load improvement data
                
                this.deckDetailComponent.render(selectedDeck, deckProgressData, improvementData); // Pass all required data
                    break; 

 case 'audioChoiceQuiz':
                if (!this.audioChoiceScreen) {
                    this.audioChoiceScreen = new AudioChoiceScreen(
                        this.appContainer,
                        (option) => this.handleQuizAnswer(option),
                        () => this.handleQuizNext(),
                        () => this.handleIgnoreCurrentCard(),
                        (cardId) => this.handleMarkCardForImprovement(cardId),
                        (termKey) => this.handleShowInfoModal(termKey), // <-- LÍNEA AÑADIDA
                        () => this.handleCardAudioStart(),
                        () => this.handleCardAudioEnd()
                    );
                }
                const currentAudioQuestion = this.state.quizInstance.getCurrentQuestion();
                if (currentAudioQuestion) {
                    const improvementData = StorageService.loadImprovementData(this.state.currentDeckId);
                    const isMarked = improvementData.hasOwnProperty(currentAudioQuestion.cardId);
                    this.audioChoiceScreen.render(currentAudioQuestion, this.state.quizInstance.currentIndex, this.state.quizInstance.questions.length, this.state.quizInstance.score, isMarked);
                } else {
                    console.error("DEBUG: [App] render -> Tried to render audio quiz, but no current question found.");
                    this.handleQuizEnd();
                }
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
                 const improvementData = StorageService.loadImprovementData(this.state.currentDeckId);
                const isMarked = improvementData.hasOwnProperty(currentQuestion.cardId);
                    this.quizScreenComponent.render(currentQuestion, this.state.quizInstance.currentIndex, this.state.quizInstance.questions.length, this.state.quizInstance.score, isMarked);
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
                        (cardId) => this.handleMarkCardForImprovement(cardId), // This handler was missing
                        (termKey) => this.handleShowInfoModal(termKey),
                        () => this.handleCardAudioStart(),
                        () => this.handleCardAudioEnd()
                    );
}
                const currentCard = this.state.quizInstance.getCurrentCard();
                const deckName = this.state.allDecks[this.state.currentDeckId].name;
                if (currentCard) {


                 const improvementData = StorageService.loadImprovementData(this.state.currentDeckId);
                     const isMarked = improvementData.hasOwnProperty(currentCard.cardId);
                    this.flippableCardScreen.render(this.state.currentDeckId, deckName, currentCard, this.state.quizInstance.currentIndex, this.state.quizInstance.currentCards.length, isMarked); // Pass deckId
                } else {
                    this.handleQuizEnd(); // Should not happen if logic is correct, but as a safeguard
                }
                break;


                case 'glossary':
                console.log("DEBUG: [App] render -> Rendering 'glossary' screen.");
                // Hide main app container, show glossary container
                mainAppContainer.style.display = 'none';
                glossaryScreenContainer.style.display = 'block';

              // The GlossaryScreen component now manages its own internal state
                // (selection vs. viewer) and data loading.
                // We just need to call render() to make it display its current state.
                this.glossaryScreen.render();
                break;

            default:
                console.error(`DEBUG: [App] render -> Unknown screen state: ${this.state.currentScreen}`);
                this.appContainer.innerHTML = `<p class="text-red-500">Application error: Unknown state.</p>`;
        }
    }

  handleMarkCardForImprovement(cardId) {
        if (!cardId) return;
        console.log(`DEBUG: [App] handleMarkCardForImprovement -> User wants to mark/edit card: ${cardId}`);
        
        // Find the card and its type to make the modal context-aware
        const deck = this.state.allDecks[this.state.currentDeckId];
        if (!deck) return;

        const card = deck.cards.find(c => c.cardId === cardId);
        if (!card) return;

        // Use the deck's type as the definitive source of truth
        const cardType = deck.deckType; 

        // Load existing data for this card to allow for editing
        const existingData = StorageService.loadImprovementData(this.state.currentDeckId)[cardId];
        
        // Pass the card type along with the other data to the modal
        this.improvementModal.show(cardId, cardType, existingData);
    }

     handleUnmarkCardForImprovement(cardId) {
        if (!cardId || !this.state.currentDeckId) return;
        console.log(`DEBUG: [App] handleUnmarkCardForImprovement -> Removing card ${cardId} from improvement list.`);
        StorageService.clearImprovementForCard(this.state.currentDeckId, cardId);
        // Re-render the current screen to reflect the change
        this.render(); 
        
        this.notificationModal.show(
            'Card Unmarked',
            'The card has been removed from the improvement list.',
            { icon: 'fa-solid fa-eraser', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700' }
        );
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
/**
     * Generates a definitive, professional-grade prompt for an LLM, instructing it to return a complete, actionable response.
     * @param {string} deckName - The name of the deck being improved.
     * @param {string} deckId - The ID of the deck, used to construct the final command.
     * @param {Array<object>} cardsToImprove - The array of card objects marked for improvement.
     * @returns {string} A string containing the full prompt and the JSON data.
     */


   

    // --- State Changers & Event Handlers ---
    async handleExportForImprovement() {
       const deckId = this.state.currentDeckId;
        if (!deckId) return;

        const deck = this.state.allDecks[deckId];
        // The complex logic is now delegated to the ImprovementService.
        const result = await ImprovementService.handleExport(deck);

        // App.js is now only responsible for showing the notification based on the result.
        if (result.success) {
            this.notificationModal.show(
                'Copied to Clipboard!',
                `A complete prompt & action plan for your LLM with ${result.count} card(s) has been copied.`,
                { icon: 'fa-solid fa-robot', color: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-900' }
            );
        } else {
            this.notificationModal.show('Export', result.message);
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
        if (isFlippable) {
            // For flippable quizzes, move to the next card without scoring.
            quiz.moveToNextCard();
            if (quiz.isQuizOver()) {
                this.handleQuizEnd();
            } else {
                this.render();
            }
        } else {
            // For any other quiz type (multipleChoice, audioChoice), just advance.
            // This avoids the bug of calling a method on a null component instance
            // and provides a consistent, immediate "skip" behavior.
            this.handleQuizNext();
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
        // More explicit routing based on deckType
        if (deck.deckType === 'flippable') {
          console.log("DEBUG: [App] handleStartQuiz -> Starting a 'flippable' quiz.");
            this.state.quizInstance = new SpacedRepetitionQuiz(deck.cards, progress);
            this.state.quizInstance.generateQuizRound(7);
            this.state.currentScreen = 'flippableQuiz';
        } else if (deck.deckType === 'audioChoice') {
            // Handle the new audio choice deck type
            console.log("DEBUG: [App] handleStartQuiz -> Starting an 'audioChoice' quiz.");
            this.state.quizInstance = new Quiz(deck.cards, progress); // Reuses the standard Quiz logic
            this.state.quizInstance.generateQuizRound(7);
            this.state.currentScreen = 'audioChoiceQuiz'; // Set to the new screen state
        } else if (deck.deckType === 'multipleChoice') {
            // Explicitly handle multiple choice decks
            console.log("DEBUG: [App] handleStartQuiz -> Starting a 'multipleChoice' quiz.");
            this.state.quizInstance = new Quiz(deck.cards, progress);
            this.state.quizInstance.generateQuizRound(7);
            this.state.currentScreen = 'quiz';
        } else {
            // Handle unknown deck types gracefully
            console.error(`[App] handleStartQuiz -> Unknown or undefined deckType: '${deck.deckType}' for deck ID: ${this.state.currentDeckId}.`);
            alert("Error: Cannot start quiz. The deck type is not supported.");
            return;
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

    /**
     * Handles the user's answer for any multiple-choice-based quiz.
     * It updates the quiz state and calls component-specific feedback methods only when appropriate.
     * @param {string} selectedOption The answer selected by the user.
     */
    handleQuizAnswer(selectedOption) {
        if (!this.state.quizInstance) return;

        console.log(`DEBUG: [App] handleQuizAnswer -> User selected: ${selectedOption}`);
        const isCorrect = this.state.quizInstance.answer(selectedOption);

        // This block is ONLY for the original 'multipleChoice' quiz screen.
        // The new 'audioChoiceScreen' handles its own feedback internally.
        if (this.state.currentScreen === 'quiz' && this.quizScreenComponent) {
            const correctAnswer = this.state.quizInstance.getCurrentQuestion().correctAnswer;
            this.quizScreenComponent.showFeedback(isCorrect, correctAnswer);
        }
        
        // This direct DOM manipulation is not ideal, but we keep it for now
        // to maintain the immediate score update on the original quiz screen.
        const scoreElement = document.getElementById('quiz-score');
        if (scoreElement) {
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

          /**
     * Handles switching to the Glossary Viewer screen.
     */
    handleShowGlossary() {
        console.log("DEBUG: [App] handleShowGlossary -> Switching to Glossary Viewer.");
        this.state.currentScreen = 'glossary';
        this.render();
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
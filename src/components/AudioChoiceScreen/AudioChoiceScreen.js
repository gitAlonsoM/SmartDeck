/* src\components\AudioChoiceScreen\AudioChoiceScreen.js */

class AudioChoiceScreen {
    constructor(container, onAnswer, onNext, onIgnore, onMarkForImprovement, onShowInfoModal, onCardAudioStart, onCardAudioEnd) {
        this.container = container;
        this.onAnswer = onAnswer;
        this.onNext = onNext;
        this.onIgnore = onIgnore;
        this.onMarkForImprovement = onMarkForImprovement;
        this.onShowInfoModal = onShowInfoModal; 
        this.onCardAudioStart = onCardAudioStart;
        this.onCardAudioEnd = onCardAudioEnd;
        this.currentCard = null;
        console.log("DEBUG: [AudioChoiceScreen] constructor -> Component instantiated.");
    }
async render(cardData, deckId, currentIndex, totalQuestions, score, isMarkedForImprovement) {
        console.log(`DEBUG: [AudioChoiceScreen] render -> Rendering question ${currentIndex + 1} of ${totalQuestions}.`);
        this.currentCard = cardData;
        this.currentDeckId = deckId; // Store the deckId

        if (!this.container.querySelector('#audio-choice-screen')) {
            const html = await ComponentLoader.loadHTML('/src/components/AudioChoiceScreen/audio-choice-screen.html');
            this.container.innerHTML = html;
        }
        
        document.getElementById('quiz-progress').textContent = `Question ${currentIndex + 1} of ${totalQuestions}`;
        document.getElementById('quiz-score').textContent = `Score: ${score}`;
        
        const markImproveBtn = document.getElementById('mark-improve-btn');
        if (markImproveBtn) {
            const flagIcon = markImproveBtn.querySelector('i');
            if (flagIcon) {
                flagIcon.classList.toggle('text-yellow-400', isMarkedForImprovement);
                flagIcon.classList.toggle('dark:text-yellow-400', isMarkedForImprovement);
                flagIcon.classList.toggle('text-gray-400', !isMarkedForImprovement);
                flagIcon.classList.toggle('dark:text-gray-500', !isMarkedForImprovement);
            }
        }

        const { prefix, suffix } = cardData.sentenceParts;
        document.getElementById('question-text').textContent = `${prefix}___${suffix}`;

        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        
        const shuffledOptions = [...cardData.options].sort(() => Math.random() - 0.5);

        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            const fullSentence = `${prefix}${option.text}${suffix}`;
            button.innerHTML = `<span>${prefix}<strong class="font-bold text-yellow-600 dark:text-yellow-400">${option.text}</strong>${suffix}</span>`;

           // Store specific logic data in the dataset to avoid string comparison errors
            button.dataset.option = fullSentence; // Keep for display/debugging if needed
            button.dataset.isCorrect = option.isCorrect; // The Source of Truth

            button.className = 'option-btn relative w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between';
            optionsContainer.appendChild(button);
        });
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('next-btn').disabled = true;
        document.getElementById('next-btn').onclick = () => this.onNext();
        
        document.getElementById('ignore-btn').onclick = (e) => {
            e.stopPropagation();
            this.onIgnore();
        };

        document.getElementById('mark-improve-btn').onclick = (e) => {
            e.stopPropagation();
            this.onMarkForImprovement(this.currentCard.cardId);
        };

        document.getElementById('options-container').onclick = (event) => {
            const button = event.target.closest('.option-btn');
            if (button) {
                // CRITICAL FIX: Extract the boolean truth from the dataset
                // and PASS IT as the second argument.
                const isCorrect = button.dataset.isCorrect === 'true';
                const selectedText = button.dataset.option;
                
                this.handleOptionClick(selectedText, isCorrect);
            }
        };
        
        // Listener para los modales
        const feedbackContainer = document.getElementById('feedback-container');
        if (feedbackContainer) {
            feedbackContainer.onclick = (event) => {
                const termLink = event.target.closest('.glossary-term');
                if (termLink) {
                    event.preventDefault();
                    const termKey = termLink.dataset.termKey;
                    if (termKey && this.onShowInfoModal) {
                        this.onShowInfoModal(termKey);
                    }
                }
            };
        }
    }



  handleOptionClick(selectedOption, isCorrect) {
        if (!this.currentCard) return;
        
        console.log(`VERIFY: Option clicked. Is Correct? ${isCorrect}. Text: "${selectedOption}"`);
        
        // We pass 'isCorrect' directly, avoiding string comparison issues with spaces
        this.showFeedback(isCorrect, selectedOption);
        this.revealFeedback();
        this.playCorrectAudio();  //ACA LE QUITE EL CONDICIONAL "IF", EL AUDIO DE LA ALTERNATIVA CORRECTA SIEMPRE SUENA, INDEPENDIENTE DEL RESULTADO.
        // Use the boolean to register the answer in the main App logic
        // We pass the text merely for logging/display purposes in the parent
        this.onAnswer(selectedOption, isCorrect); 
    }

    
    
    showFeedback(isUserCorrect, selectedOption) {
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(button => {
            button.disabled = true;
            
            // We check the dataset Truth instead of comparing strings
            const isButtonCorrect = button.dataset.isCorrect === 'true';
            const isButtonSelected = button.dataset.option === selectedOption;

            if (isButtonCorrect) {
                // Determine styling for the CORRECT answer
                button.className += ' !bg-green-200 !border-green-400 !text-green-900 dark:!bg-green-800 dark:!border-green-600 dark:!text-green-100';
                
                const highlightElement = button.querySelector('strong');
                if (highlightElement) {
                    highlightElement.classList.remove('text-yellow-600', 'dark:text-yellow-400');
                    highlightElement.className += ' !text-indigo-700 dark:!text-indigo-300';
                }
                
                const replayIcon = document.createElement('i');
                replayIcon.className = 'fas fa-volume-up ml-4 text-green-700 dark:text-green-200 text-xl cursor-pointer hover:scale-110 transition-transform';
                replayIcon.title = "Replay audio";
                replayIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.playCorrectAudio();
                });
                button.appendChild(replayIcon);

            } else if (!isUserCorrect && isButtonSelected) {
                // Styling for the WRONG selection
                button.className += ' !bg-red-500 !border-red-600 !text-white';
            }
        });
        
        const nextBtn = document.getElementById('next-btn');
        nextBtn.disabled = false;
        
        // Check for end of quiz context
        const progressText = document.getElementById('quiz-progress').textContent;
        // Safety check if progressText exists
        if(progressText) {
             const matches = progressText.match(/\d+/g);
             if(matches && matches.length >= 2) {
                 const [current, total] = matches.map(Number);
                 if (current === total) {
                     nextBtn.textContent = 'Finish Quiz';
                 }
             }
        }
    }

revealFeedback() {
        if (!this.currentCard) return;
        const feedbackContainer = document.getElementById('feedback-container');
        const hintEl = document.getElementById('card-hint');
        const contentEl = document.getElementById('content-container');
        const grammarNoteTitleEl = feedbackContainer.querySelector('#card-content-wrapper h3');

        hintEl.textContent = this.currentCard.hint;
        
        let contentText = this.currentCard.content?.value || '';

        const modalMatch = contentText.match(/^\*\*\[(\d+)\]\*\*\n\n/);
        if (modalMatch) {
            const modalId = modalMatch[1];
            
            // --- Dynamic glossary logic ---
            let glossaryName = 'english_rules'; // Default
            if (this.currentDeckId === 'phrasal_verbs_audio_choice') {
                glossaryName = 'phrasal_verbs';
            }
            
            // VERIFY: This log confirms the component is loading the correct glossary
            console.log(`VERIFY: [AudioChoiceScreen] Using glossary '${glossaryName}' for deck '${this.currentDeckId}'.`);
            const glossary = GlossaryService.getCachedGlossary(glossaryName);
            // --- End dynamic logic ---

            if (glossary && glossary[modalId]) {
                const termTitle = glossary[modalId].title;
                grammarNoteTitleEl.innerHTML = `Tip - <a href="#" class="glossary-term font-bold text-green-400 hover:underline" data-term-key="${modalId}">${termTitle}</a>`;
                contentText = contentText.replace(modalMatch[0], ''); 
            } else {
                // This else block handles if the modal ID is not found in the correct glossary
            	console.warn(`[AudioChoiceScreen] Modal ID ${modalId} not found in glossary '${glossaryName}'. Hiding Tip.`);
                grammarNoteTitleEl.textContent = '';
            }
        } else {
           grammarNoteTitleEl.textContent = ''; 
            // VERIFY: Card has no modal ID. Running default feedback.
            console.log("VERIFY: [AudioChoiceScreen] Card content does not start with a modal ID, proceeding normally.");
        }

        let formattedText = contentText.replace(/\[([^\]]+)\]/g, '<strong class="font-semibold text-indigo-400">$1</strong>');
        formattedText = formattedText.replace(/~([^~]+)~/g, '<strong class="font-semibold text-yellow-200 dark:text-yellow-400">$1</strong>');
        
        contentEl.innerHTML = formattedText;
        feedbackContainer.classList.remove('hidden');
    }
    
    playCorrectAudio() {
        if (this.currentCard && this.currentCard.audioSrc) {
            console.log(`DEBUG: [AudioChoiceScreen] Playing audio: ${this.currentCard.audioSrc}`);
            this.onCardAudioStart();
            const audio = new Audio(this.currentCard.audioSrc);
            const cleanup = () => {
                console.log("DEBUG: [AudioChoiceScreen] Audio playback finished or failed.");
                this.onCardAudioEnd();
            };
            audio.onended = cleanup;
            audio.onerror = cleanup;
            audio.play().catch(e => {
                console.error("Error playing audio:", e);
                cleanup();
            });
        }
    }
}
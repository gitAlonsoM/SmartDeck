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

    async render(cardData, currentIndex, totalQuestions, score, isMarkedForImprovement) {
        console.log(`DEBUG: [AudioChoiceScreen] render -> Rendering question ${currentIndex + 1} of ${totalQuestions}.`);
        this.currentCard = cardData;

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
            button.dataset.option = fullSentence;
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
                this.handleOptionClick(button.dataset.option);
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

    handleOptionClick(selectedOption) {
        if (!this.currentCard) return;
        const isCorrect = selectedOption === this.currentCard.correctAnswer;
        this.showFeedback(isCorrect, this.currentCard.correctAnswer, selectedOption);
        this.revealFeedback();
        this.playCorrectAudio();
        this.onAnswer(selectedOption);
    }
    
    showFeedback(isCorrect, correctAnswer, selectedOption) {
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(button => {
            button.disabled = true;
            const option = button.dataset.option;

            if (option === correctAnswer) {
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
            } else if (!isCorrect && option === selectedOption) {
                button.className += ' !bg-red-500 !border-red-600 !text-white';
            }
        });
        const nextBtn = document.getElementById('next-btn');
        nextBtn.disabled = false;
        const progressText = document.getElementById('quiz-progress').textContent;
        const [current, total] = progressText.match(/\d+/g).map(Number);
        if (current === total) {
            nextBtn.textContent = 'Finish Quiz';
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
            const glossary = GlossaryService.getCachedGlossary('english_rules');
            if (glossary && glossary[modalId]) {
                const termTitle = glossary[modalId].title;
                grammarNoteTitleEl.innerHTML = `Tip - <a href="#" class="glossary-term font-bold text-green-400 hover:underline" data-term-key="${modalId}">${termTitle}</a>`;
                contentText = contentText.replace(modalMatch[0], ''); 
            } else {
                grammarNoteTitleEl.textContent = '';
            }
        } else {
            grammarNoteTitleEl.textContent = ''; 
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
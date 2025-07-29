/* src\components\AudioChoiceScreen\AudioChoiceScreen.js */

class AudioChoiceScreen {
    constructor(container, onAnswer, onNext, onIgnore, onMarkForImprovement) {
        this.container = container;
        this.onAnswer = onAnswer;
        this.onNext = onNext;
        this.onIgnore = onIgnore;
        this.onMarkForImprovement = onMarkForImprovement;
        this.currentCard = null; // To hold the full card data
        console.log("DEBUG: [AudioChoiceScreen] constructor -> Component instantiated.");
    }

        async render(cardData, currentIndex, totalQuestions, score, isMarkedForImprovement) {

        console.log(`DEBUG: [AudioChoiceScreen] render -> Rendering question ${currentIndex + 1} of ${totalQuestions} with new structure.`);
        this.currentCard = cardData; // Store the full card data

        const html = await ComponentLoader.loadHTML('/src/components/AudioChoiceScreen/audio-choice-screen.html');
        this.container.innerHTML = html;

        // Populate static elements
        document.getElementById('quiz-progress').textContent = `Question ${currentIndex + 1} of ${totalQuestions}`;
        document.getElementById('quiz-score').textContent = `Score: ${score}`;
         // Visually update the improvement flag icon based on its status
        const markImproveBtn = document.getElementById('mark-improve-btn');
        if (markImproveBtn) {
            const flagIcon = markImproveBtn.querySelector('i');
            if (flagIcon) {
                flagIcon.classList.remove('text-yellow-400', 'dark:text-yellow-400', 'text-gray-400', 'dark:text-gray-500'); // Reset colors
                if (isMarkedForImprovement) {
                    flagIcon.classList.add('text-yellow-400', 'dark:text-yellow-400'); // Marked state
                } else {
                    flagIcon.classList.add('text-gray-400', 'dark:text-gray-500'); // Default state
                }
            }
        }

        document.getElementById('card-category').textContent = cardData.category;

        // NEW LOGIC: Use the new 'sentenceParts' structure for the question display
        const { prefix, suffix } = cardData.sentenceParts;
        document.getElementById('question-text').textContent = `${prefix}___${suffix}`;

        // Render options from the new structured array
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        
        // Shuffle the options array
        const shuffledOptions = [...cardData.options].sort(() => Math.random() - 0.5);

        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            
            // Construct the full sentence for display and for the dataset
            const fullSentence = `${prefix}${option.text}${suffix}`;

            // Create the button's display with the variable part highlighted
            button.innerHTML = `<span>${prefix}<strong class="font-bold text-yellow-600 dark:text-yellow-400">${option.text}</strong>${suffix}</span>`;
            
            // The dataset now stores the full sentence to check against 'correctAnswer'
            button.dataset.option = fullSentence;
            
            button.className = 'option-btn relative w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between';
            button.addEventListener('click', () => {
                this.handleOptionClick(fullSentence);
            });
            optionsContainer.appendChild(button);
        });
        
        // Setup event listeners for other buttons
        document.getElementById('next-btn').disabled = true;
        document.getElementById('next-btn').addEventListener('click', () => this.onNext());
        
        document.getElementById('ignore-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.onIgnore();
        });

        document.getElementById('mark-improve-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.onMarkForImprovement(cardData.cardId);
        });
    }

    handleOptionClick(selectedOption) {
        if (!this.currentCard) return;

        // The check remains the same, as we preserved 'correctAnswer' for this purpose
        const isCorrect = selectedOption === this.currentCard.correctAnswer;
        
        // 1. Show feedback on buttons
        this.showFeedback(isCorrect, this.currentCard.correctAnswer, selectedOption);
        
        // 2. Reveal hint and content
        this.revealFeedback();
        // 3. Play correct audio
        this.playCorrectAudio();
        
        // 4. Call the main answer handler in App.js to update score and progress
        this.onAnswer(selectedOption);
    }
    
    showFeedback(isCorrect, correctAnswer, selectedOption) {
        console.log(`DEBUG: [AudioChoiceScreen] showFeedback -> User choice correct: ${isCorrect}.`);
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(button => {
            button.disabled = true;
            const option = button.dataset.option;


       if (option === correctAnswer) {
                // Use a high-contrast light green background with dark text
                button.className += ' !bg-green-200 !border-green-400 !text-green-900 dark:!bg-green-800 dark:!border-green-600 dark:!text-green-100';
                
                // Find the highlighted part and change its color to a deep, dark blue
                const highlightElement = button.querySelector('strong');
                if (highlightElement) {
                    highlightElement.classList.remove('text-yellow-600', 'dark:text-yellow-400');
                    highlightElement.className += ' !text-indigo-700 dark:!text-indigo-300'; // Using a very dark and intense indigo
                }

                // Add the replay button
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

        hintEl.textContent = this.currentCard.hint;
        
        // Render content with basic formatting
        
           const contentText = this.currentCard.content?.value || '';
        
        // First, handle the blue highlight for correct terms [word]
        let formattedText = contentText.replace(/\[([^\]]+)\]/g, '<strong class="font-semibold text-indigo-400">$1</strong>');
        
        // Then, handle the new yellow highlight for incorrect terms ~word~
        formattedText = formattedText.replace(/~([^~]+)~/g, '<strong class="font-semibold text-yellow-200 dark:text-yellow-400">$1</strong>');
        
        contentEl.innerHTML = formattedText;
        feedbackContainer.classList.remove('hidden');
        console.log("DEBUG: [AudioChoiceScreen] Hint and content revealed.");
    }
    
    playCorrectAudio() {
        if (this.currentCard && this.currentCard.audioSrc) {
            console.log(`DEBUG: [AudioChoiceScreen] Playing audio: ${this.currentCard.audioSrc}`);
            const audio = new Audio(this.currentCard.audioSrc);
            audio.play().catch(e => console.error("Error playing audio:", e));
        }
    }
}
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

    async render(question, currentIndex, totalQuestions, score) {
        console.log(`DEBUG: [AudioChoiceScreen] render -> Rendering question ${currentIndex + 1} of ${totalQuestions}.`);
        this.currentCard = question; // Store the card data

        const html = await ComponentLoader.loadHTML('/src/components/AudioChoiceScreen/audio-choice-screen.html');
        this.container.innerHTML = html;

        // Populate static elements
        document.getElementById('quiz-progress').textContent = `Question ${currentIndex + 1} of ${totalQuestions}`;
        document.getElementById('quiz-score').textContent = `Score: ${score}`;
        document.getElementById('card-category').textContent = question.category;
        document.getElementById('question-text').textContent = question.question;

        // Render options
        const optionsContainer = document.getElementById('options-container');
 optionsContainer.innerHTML = '';
        const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);

        // Find the static parts of the question to isolate the variable part in options
        const questionParts = question.question.split('___');
        const prefix = questionParts[0];
        const suffix = questionParts.length > 1 ? questionParts[1] : '';
        
        shuffledOptions.forEach(optionText => {
            const button = document.createElement('button');

            // Isolate the variable middle part of the text
            let middlePart = optionText;
            if (optionText.startsWith(prefix)) {
                middlePart = optionText.substring(prefix.length);
            }
            if (optionText.endsWith(suffix)) {
                middlePart = middlePart.substring(0, middlePart.length - suffix.length);
            }
            
            // Use innerHTML to add styling to the variable part
            button.innerHTML = `<span>${prefix}<strong class="font-bold text-yellow-600 dark:text-yellow-400">${middlePart}</strong>${suffix}</span>`;
                        
            button.dataset.option = optionText;
            button.className = 'option-btn relative w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between';
            button.addEventListener('click', () => {
                this.handleOptionClick(optionText);
            });
            optionsContainer.appendChild(button);
        });
        
        document.getElementById('next-btn').disabled = true;
        document.getElementById('next-btn').addEventListener('click', () => this.onNext());
        
        document.getElementById('ignore-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.onIgnore();
        });

        document.getElementById('mark-improve-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.onMarkForImprovement(question.cardId);
        });
    }

    handleOptionClick(selectedOption) {
        if (!this.currentCard) return;

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
                button.className += ' !bg-emerald-500 !border-emerald-600 !text-white';
                // Add the replay button
                const replayIcon = document.createElement('i');
                replayIcon.className = 'fas fa-volume-up ml-4 text-white text-xl cursor-pointer hover:scale-110 transition-transform';
                replayIcon.title = "Replay audio";
                replayIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent the main button click
                    this.playCorrectAudio();
                });
                button.appendChild(replayIcon);
} else if (!isCorrect && option === selectedOption) {                button.className += ' !bg-red-500 !border-red-600 !text-white';
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
        // Replace bracketed words with emphasized spans
        contentEl.innerHTML = contentText.replace(/\[([^\]]+)\]/g, '<strong class="font-semibold text-indigo-400">$1</strong>');

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
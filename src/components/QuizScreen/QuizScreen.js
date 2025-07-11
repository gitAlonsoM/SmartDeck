/* src\components\QuizScreen\QuizScreen.js */
// Component to display a single question and handle user answers.

class QuizScreen {
    /**
     * @param {HTMLElement} container The DOM element where the component will be rendered.
     * @param {function} onAnswer Callback executed when the user selects an answer.
     * @param {function} onNext Callback executed when the user clicks "Next".
     */
  constructor(container, onAnswer, onNext, onQuizEnd, onIgnore, onMarkForImprovement) {
        this.container = container;
        this.onAnswer = onAnswer;
        this.onNext = onNext;
        this.onQuizEnd = onQuizEnd;
        this.onIgnore = onIgnore;
        this.onMarkForImprovement = onMarkForImprovement; // Store the new callback
        this.lastSelectedOption = null;
        console.log("DEBUG: [QuizScreen] constructor -> Component instantiated.");
    }

 async render(question, currentIndex, totalQuestions, score, isDeckCompleted = false) {
        console.log(`DEBUG: [QuizScreen] render -> Rendering question ${currentIndex + 1} of ${totalQuestions}. Deck completed: ${isDeckCompleted}`);

        // If the last card of a fully mastered deck was just answered, show completion screen.
        if (isDeckCompleted && currentIndex >= totalQuestions) {
            const html = await ComponentLoader.loadHTML('/src/components/QuizScreen/QuizScreen.html');
            this.container.innerHTML = html;
            this.renderCompletionView();
            return;
        }

        const html = await ComponentLoader.loadHTML('/src/components/QuizScreen/QuizScreen.html');
        this.container.innerHTML = html;

        // Populate static elements
        document.getElementById('quiz-progress').textContent = `Question ${currentIndex + 1} of ${totalQuestions}`;
        document.getElementById('quiz-score').textContent = `Score: ${score}`;
        document.getElementById('card-category').textContent = question.category;
        document.getElementById('card-hint').textContent = question.hint;
        document.getElementById('question-text').textContent = question.question;

        // Render content (code/image)
        this.renderContent(question.content);

        // Render options
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
        
        shuffledOptions.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.dataset.option = optionText;
            button.className = 'option-btn w-full p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
            button.addEventListener('click', () => {
                this.lastSelectedOption = optionText; // Store the clicked option
                this.onAnswer(optionText);
            });
            optionsContainer.appendChild(button);
        });
        
       document.getElementById('next-btn').disabled = true;
        document.getElementById('next-btn').addEventListener('click', () => this.onNext());
        
        // Setup Ignore button
        document.getElementById('ignore-btn').addEventListener('click', (e) => {
           e.stopPropagation();
            this.onIgnore();
        });

 document.getElementById('mark-improve-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.onMarkForImprovement(question.cardId);
        });
    }
    
    renderContent(content) {
        const container = document.getElementById('content-container');
        container.innerHTML = ''; // Clear previous content
        if (!content || content.type === 'none') {
            console.log("DEBUG: [QuizScreen] renderContent -> No content to display.");
            return;
        }

        if (content.type === 'code' && content.value) {
            console.log("DEBUG: [QuizScreen] renderContent -> Displaying code snippet.");
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = `language-${content.language || 'plaintext'}`;
            code.textContent = content.value;
            pre.appendChild(code);
            container.appendChild(pre);
            // Ensure highlight.js is called after the element is in the DOM
            if (window.hljs) {
                window.hljs.highlightElement(code);
            }
        }
        // Image rendering can be added here later
    }

     renderCompletionView() {
        document.getElementById('quiz-screen').classList.add('hidden');
        const completionView = document.getElementById('quiz-completion-view');
        completionView.classList.remove('hidden');

        document.getElementById('completion-back-btn').addEventListener('click', () => this.onQuizEnd());
        document.getElementById('completion-reset-btn').addEventListener('click', () => this.onResetDeck());
        console.log("DEBUG: [QuizScreen] renderCompletionView -> Displaying deck completion view.");
    }

    /**
     * Shows feedback on the buttons after an answer is selected.
     * @param {boolean} isCorrect - If the user's choice was correct.
     * @param {string} correctAnswer - The text of the correct answer.
     */
    showFeedback(isCorrect, correctAnswer) {
        console.log(`DEBUG: [QuizScreen] showFeedback -> User choice was correct: ${isCorrect}. Correct answer is: ${correctAnswer}`);
        const optionButtons = document.querySelectorAll('.option-btn');
        optionButtons.forEach(button => {
            button.disabled = true; // Disable all buttons
            const option = button.dataset.option;
            
            // Highlight the correct answer in green
            if (option === correctAnswer) {
                button.className += ' !bg-emerald-500 !border-emerald-600 !text-white';
            } 
            // If the user's selected answer was wrong, highlight it in red
            else if (!isCorrect && option === this.lastSelectedOption) {
                 button.className += ' !bg-red-500 !border-red-600 !text-white';
            }
        });
       const nextBtn = document.getElementById('next-btn');
        nextBtn.disabled = false;

        // Check if it's the last question to change button text
        const progressText = document.getElementById('quiz-progress').textContent; // e.g., "Question 10 of 10"
        const [current, total] = progressText.match(/\d+/g).map(Number);
        if (current === total) {
            nextBtn.textContent = 'Finish Quiz';
        } }
}
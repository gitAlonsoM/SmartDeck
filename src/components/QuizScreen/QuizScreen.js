/* src\components\QuizScreen\QuizScreen.js */
// Component to display a single question and handle user answers.

class QuizScreen {
    /**
     * @param {HTMLElement} container The DOM element where the component will be rendered.
     * @param {function} onAnswer Callback executed when the user selects an answer.
     * @param {function} onNext Callback executed when the user clicks "Next".
     */
constructor(container, onAnswer, onNext, onQuizEnd, onIgnore, onMarkForImprovement, onCardAudioStart, onCardAudioEnd) {        this.container = container;
       this.onAnswer = onAnswer;
      this.onNext = onNext;
      this.onQuizEnd = onQuizEnd;
      this.onIgnore = onIgnore;
      this.onMarkForImprovement = onMarkForImprovement;
      this.onCardAudioStart = onCardAudioStart; // Store audio start handler
      this.onCardAudioEnd = onCardAudioEnd; // Store audio end handler
      this.currentCard = null; // Store current card data
      this.lastSelectedOption = null;
        console.log("DEBUG: [QuizScreen] constructor -> Component instantiated.");
    }

 async render(question, currentIndex, totalQuestions, score, isMarkedForImprovement, isDeckCompleted = false) {
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
        this.currentCard = question; // Store the full card object

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

      // --- Audio Logic ---
      this.setupAudioButtons(); // Setup listeners for audio
      this.playQuestionAudio(); // Autoplay question audio
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


                // Add replay button for correct answer audio
              const replayIcon = document.createElement('i');
              replayIcon.className = 'fas fa-volume-up ml-4 text-white text-xl cursor-pointer hover:scale-110 transition-transform';
              replayIcon.title = "Replay answer audio";
              replayIcon.addEventListener('click', (e) => {
                  e.stopPropagation(); // Prevent re-triggering answer logic
                  this.playAnswerAudio();
              });
              
              // Make button a flex container to align text and icon
              button.classList.add('flex', 'items-center', 'justify-between');
              button.appendChild(replayIcon);
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
        } 
 console.log("VERIFY: [QuizScreen] Answer selected, playing correct answer audio.");
      this.playAnswerAudio();   
    
    }

    /**
     * Sets up the event listener for the question audio replay button.
     */
    setupAudioButtons() {
        const qAudioBtn = document.getElementById('question-audio-btn');
        // Ensure all handlers and data are present before showing button
        if (this.currentCard && this.currentCard.questionAudioSrc && this.onCardAudioStart && this.onCardAudioEnd) {
            qAudioBtn.classList.remove('hidden'); // Show the button
            qAudioBtn.onclick = (e) => {
                e.stopPropagation();
                this.playQuestionAudio();
            };
        } else {
            qAudioBtn.classList.add('hidden'); // Hide if no audio
        }
    }

    /**
     * Plays the audio for the current question.
     */
    playQuestionAudio() {
        // Check for handlers to prevent errors if not passed correctly
        if (!this.onCardAudioStart || !this.onCardAudioEnd) {
            console.warn("DEBUG: [QuizScreen] Audio handlers (onCardAudioStart/onCardAudioEnd) are missing.");
            return;
        }

        if (this.currentCard && this.currentCard.questionAudioSrc) {
            console.log(`DEBUG: [QuizScreen] Playing question audio: ${this.currentCard.questionAudioSrc}`);
            this.onCardAudioStart();
            const audio = new Audio(this.currentCard.questionAudioSrc);
            
            const cleanup = () => {
                console.log("DEBUG: [QuizScreen] Question audio playback finished or failed.");
                this.onCardAudioEnd();
            };
            
            audio.onended = cleanup;
            audio.onerror = (e) => {
                console.error("Error playing question audio:", this.currentCard.questionAudioSrc, e);
                // VERIFY: This log confirms the audio file was not found
                console.log(`VERIFY: [QuizScreen] Failed to load question audio. Path: ${this.currentCard.questionAudioSrc}`);
                cleanup();
            };
            
            audio.play().catch(e => {
                // This catch is important for when the user hasn't interacted with the page yet
                console.warn("Error starting question audio playback (user interaction may be required):", e);
                cleanup();
            });
        } else {
            console.log("DEBUG: [QuizScreen] No question audio source found for this card.");
        }
    }

    /**
     * Plays the audio for the correct answer.
     */
    playAnswerAudio() {
        // Check for handlers to prevent errors
        if (!this.onCardAudioStart || !this.onCardAudioEnd) {
            console.warn("DEBUG: [QuizScreen] Audio handlers (onCardAudioStart/onCardAudioEnd) are missing.");
            return;
        }

        if (this.currentCard && this.currentCard.answerAudioSrc) {
            console.log(`DEBUG: [QuizScreen] Playing answer audio: ${this.currentCard.answerAudioSrc}`);
            this.onCardAudioStart();
            const audio = new Audio(this.currentCard.answerAudioSrc);
            
            const cleanup = () => {
                console.log("DEBUG: [QuizScreen] Answer audio playback finished or failed.");
                this.onCardAudioEnd();
            };
            
            audio.onended = cleanup;
            audio.onerror = (e) => {
                console.error("Error playing answer audio:", this.currentCard.answerAudioSrc, e);
                // VERIFY: This log confirms the audio file was not found
                console.log(`VERIFY: [QuizScreen] Failed to load answer audio. Path: ${this.currentCard.answerAudioSrc}`);
                cleanup();
            };
            
            audio.play().catch(e => {
                console.error("Error starting answer audio playback:", e);
                cleanup();
            });
        } else {
            console.log("DEBUG: [QuizScreen] No answer audio source found for this card.");
        }
    }
}
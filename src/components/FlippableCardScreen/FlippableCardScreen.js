/*src\components\FlippableCardScreen\FlippableCardScreen.js  */

// Component to render a flippable, self-assessed card for studying.
// Component to render a flippable, self-assessed card for studying.
class FlippableCardScreen {
   constructor(container, onAssess, onEnd, onIgnore, onMarkForImprovement) {
        this.container = container;
        this.onAssess = onAssess;
        this.onEnd = onEnd;
        this.onIgnore = onIgnore;
        this.onMarkForImprovement = onMarkForImprovement; // Store the new callback
        this.cardData = null;
        console.log("DEBUG: [FlippableCardScreen] constructor -> Component instantiated.");
    }
    async render(deckName, card, currentIndex, total) {
        console.log("DEBUG: [FlippableCardScreen] render -> Rendering card:", card);
        this.cardData = card;

        // Only load the template once
        if (!this.container.querySelector('.flip-card-container')) {
            const html = await ComponentLoader.loadHTML('/src/components/FlippableCardScreen/flippable-card-screen.html');
            this.container.innerHTML = html;
        }

        document.getElementById('deck-title-flippable').textContent = deckName;
        document.getElementById('card-progress-indicator').textContent = `${currentIndex + 1} / ${total}`;
        
        this.populateCard();
        this.resetViewState();
        this.setupEventListeners();
    }


  populateCard() {
        // --- Handle Side A ---
        const textContainer = document.getElementById('side-a-text-content');
        const visualContainer = document.getElementById('visual-content-container');
        textContainer.innerHTML = '';
        visualContainer.innerHTML = '';

        let sideAData = this.cardData.sideA;
        
        // Backward compatibility: if sideA is just a string, convert it to the new object format
        if (typeof sideAData === 'string') {
            sideAData = { text: sideAData, visualContent: null };
        }

        // Render the main text
        textContainer.appendChild(this._createTextLine(sideAData.text, true));

        // Render visual content if it exists
        if (sideAData.visualContent) {
            this._renderVisualContent(sideAData.visualContent, visualContainer);
        }

        // --- Handle Side B (The Back Side) ---
        // Side A content (question text) shown on the back for context
        const sideAOnBackContainer = document.getElementById('side-a-content-on-back');
        sideAOnBackContainer.innerHTML = '';
        sideAOnBackContainer.appendChild(this._createTextLine(sideAData.text, true));
        
        // The actual answers for Side B
        const sideBContainer = document.getElementById('side-b-content');
        sideBContainer.innerHTML = '';
        this.cardData.sideB.forEach(line => {
            // Here, sideB is still expected to be a simple array of strings
            sideBContainer.appendChild(this._createTextLine(line));
        });


        // --- Handle Improvement Note (if it exists) ---
        const noteContainer = document.getElementById('note-content-container');
        noteContainer.innerHTML = ''; // Clear previous note
        noteContainer.classList.add('hidden'); // Hide by default

        // Check if the note property exists and is a non-empty string
        if (this.cardData.note && typeof this.cardData.note === 'string' && this.cardData.note.trim() !== '') {
            // If a note exists, populate the container and make it visible
            noteContainer.innerHTML = `
                <div class="flex items-start gap-2">
                    <i class="fas fa-info-circle text-blue-400 mt-1" title="Reviewer's Note"></i>
                    <p class="text-sm text-gray-400 dark:text-gray-300 italic">${this.cardData.note}</p>
                </div>
            `;
            noteContainer.classList.remove('hidden');
        }
    }

    /**
     * Renders content into the visual canvas based on its type.
     * @param {object} content - The visualContent object {type, value, language?}.
     * @param {HTMLElement} container - The container to inject the content into.
     */
    _renderVisualContent(content, container) {
        let element;
        switch (content.type) {
            case 'icon':
                element = document.createElement('i');
                // Renders a large Font Awesome icon
                element.className = `${content.value} text-6xl md:text-8xl text-indigo-400`;
                break;
            
            case 'ascii':
                element = document.createElement('pre');
                element.className = 'text-lg md:text-2xl text-gray-400';
                element.textContent = content.value;
                break;

            case 'code':
                // For full syntax highlighting, a library like Prism.js or Highlight.js would be needed.
                // This provides the basic structure and styling from the CSS file.
                element = document.createElement('pre');
                element.className = 'code-block';
                const codeElement = document.createElement('code');
                // The language can be used by a syntax highlighter library
                if (content.language) {
                    codeElement.className = `language-${content.language}`;
                }
                codeElement.textContent = content.value;
                element.appendChild(codeElement);
                break;
        }

        if (element) {
            container.appendChild(element);
        }
    }





    /**
     * Creates a DOM element for a line of text with a play button.
     * @param {string} text - The text to display and speak.
     * @param {boolean} isSideA - Flag to apply different styling for Side A.
     * @returns {HTMLElement} The created div element.
     */
    _createTextLine(text, isSideA = false) {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'flex items-center justify-between w-full';

        const textElement = document.createElement('p');
        textElement.textContent = text;
         textElement.className = isSideA ? 'text-lg md:text-xl font-semibold text-center flex-grow' : 'text-lg';
        
        const playButton = document.createElement('button');
        playButton.className = 'play-tts-btn ml-4 text-gray-400 hover:text-indigo-500 transition-colors';
        playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        playButton.dataset.textToSpeak = text;

        lineDiv.appendChild(textElement);
        lineDiv.appendChild(playButton);
        return lineDiv;
    }

    setupEventListeners() {
        // Use .onclick to ensure we don't attach multiple listeners to static buttons
        document.getElementById('flip-card-btn').onclick = () => this.flipCard();
        document.getElementById('knew-it-btn').onclick = () => this.onAssess(true);
        document.getElementById('review-again-btn').onclick = () => this.onAssess(false);
        document.getElementById('ignore-btn-flippable').onclick = () => this.onIgnore();
        document.getElementById('mark-improve-btn-flippable').onclick = () => this.onMarkForImprovement(this.cardData.cardId);

        // Use event delegation for dynamic TTS buttons
        this.container.onclick = (event) => {
            const playButton = event.target.closest('.play-tts-btn');
            if (playButton) {
                const text = playButton.dataset.textToSpeak;
                const preferredVoice = StorageService.loadPreferredVoice();
                TTSService.speak(text, preferredVoice);
            }
        };
    }
    
    flipCard() {
        document.getElementById('flippable-card-header').classList.add('invisible'); // Hide header for clean view
        document.querySelector('.flip-card-inner').classList.add('is-flipped');
        document.getElementById('flip-card-btn').classList.add('hidden');
        document.getElementById('assessment-buttons').classList.remove('hidden');
    }

    resetViewState() {
        document.getElementById('flippable-card-header').classList.remove('invisible'); // Show header again
        const cardInner = document.querySelector('.flip-card-inner');
        if (cardInner) cardInner.classList.remove('is-flipped');
        
        const flipBtn = document.getElementById('flip-card-btn');
        if (flipBtn) flipBtn.classList.remove('hidden');

        const assessBtns = document.getElementById('assessment-buttons');
        if (assessBtns) assessBtns.classList.add('hidden');
    }

     /**
     * Dynamically adjusts the card container's height to fit the content of the visible face.
     * This prevents content from overflowing on cards with variable text length.
     */
    _adjustCardHeight() {
        const cardInner = this.container.querySelector('.flip-card-inner');
        const frontFace = this.container.querySelector('.flip-card-front');
        const backFace = this.container.querySelector('.flip-card-back');

        if (!cardInner || !frontFace || !backFace) return;

        // Check which face is currently visible to determine the target height
        const isFlipped = cardInner.classList.contains('is-flipped');
        
        // Temporarily set height to auto to measure the natural content height
        frontFace.style.height = 'auto';
        backFace.style.height = 'auto';
        
        const frontHeight = frontFace.offsetHeight;
        const backHeight = backFace.offsetHeight;

        // Set the container's height to the height of the currently visible face
        cardInner.style.height = `${isFlipped ? backHeight : frontHeight}px`;

        // Restore face heights to 100% to fill the newly sized container
        frontFace.style.height = '100%';
        backFace.style.height = '100%';
    }


}
/*src\components\FlippableCardScreen\FlippableCardScreen.js  */

// Component to render a flippable, self-assessed card for studying.
// Component to render a flippable, self-assessed card for studying.
class FlippableCardScreen {
    constructor(container, onAssess, onEnd) {
        this.container = container;
        this.onAssess = onAssess; // Callback when user assesses themselves
        this.onEnd = onEnd;     // Callback when the round ends
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
        const sideAContainer = document.getElementById('side-a-content');
        sideAContainer.innerHTML = ''; // Clear previous
        sideAContainer.appendChild(this._createTextLine(this.cardData.sideA, true));

        const sideBContainer = document.getElementById('side-b-content');
        sideBContainer.innerHTML = ''; // Clear previous
        this.cardData.sideB.forEach(line => {
            sideBContainer.appendChild(this._createTextLine(line));
        });
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
        textElement.className = isSideA ? 'text-3xl font-semibold text-center flex-grow' : 'text-lg';
        
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
        document.querySelector('.flip-card-inner').classList.add('is-flipped');
        document.getElementById('flip-card-btn').classList.add('hidden');
        document.getElementById('assessment-buttons').classList.remove('hidden');
    }

    resetViewState() {
        const cardInner = document.querySelector('.flip-card-inner');
        if (cardInner) cardInner.classList.remove('is-flipped');
        
        const flipBtn = document.getElementById('flip-card-btn');
        if (flipBtn) flipBtn.classList.remove('hidden');

        const assessBtns = document.getElementById('assessment-buttons');
        if (assessBtns) assessBtns.classList.add('hidden');
    }
}
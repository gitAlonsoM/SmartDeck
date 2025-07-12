/*src\components\FlippableCardScreen\FlippableCardScreen.js  */
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
        // Get all container elements
        const standardContent = document.getElementById('side-a-content');
        const singleAudioContent = document.getElementById('audio-content-container');
        const conversationContent = document.getElementById('conversation-content-container');

        // Hide all containers by default
        standardContent.classList.add('hidden');
        singleAudioContent.classList.add('hidden');
        conversationContent.classList.add('hidden');

        // --- ROUTER LOGIC to populate Side A ---
        const conversation = this.cardData.sideA?.conversation;

        if (conversation && Array.isArray(conversation)) {
            // 1. This is a Conversation Card
            conversationContent.classList.remove('hidden');
            const wrapper = document.getElementById('conversation-player-wrapper');
            wrapper.innerHTML = ''; // Clear previous players
            conversation.forEach((part, index) => {
                const player = document.createElement('audio');
                player.id = `audio-part-${index}`;
                player.src = part.audioSrc;
                player.controls = true;
                player.className = 'w-full';
                wrapper.appendChild(player);
            });
            this._playConversation(); // Start autoplay chain
            
        } else if (this.cardData.audioSrc) {
            // 2. This is a Single Audio Card
            singleAudioContent.classList.remove('hidden');
            const wrapper = document.getElementById('audio-player-wrapper');
            wrapper.innerHTML = ''; // Clear previous player
            const player = document.createElement('audio');
            player.src = this.cardData.audioSrc;
            player.controls = true;
            player.className = 'w-full';
            wrapper.appendChild(player);
            const playPromise = player.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => console.warn("Autoplay was prevented. This is normal.", e.name, e.message));
            }

        } else {
            // 3. This is a standard Visual/Text Card
            standardContent.classList.remove('hidden');
            const textContainer = document.getElementById('side-a-text-content');
            const visualContainer = document.getElementById('visual-content-container');
            textContainer.innerHTML = '';
            visualContainer.innerHTML = '';
            let sideAData = typeof this.cardData.sideA === 'string' ? { text: this.cardData.sideA } : this.cardData.sideA;
            textContainer.appendChild(this._createTextLine(sideAData.text, true));
            if (sideAData.visualContent) {
                this._renderVisualContent(sideAData.visualContent, visualContainer);
            }
        }

        // --- Handle Side B (The Back Side) ---
        const sideAOnBackContainer = document.getElementById('side-a-content-on-back');
        const sideBContainer = document.getElementById('side-b-content');
        sideAOnBackContainer.innerHTML = '';
        sideBContainer.innerHTML = '';

        if (conversation && Array.isArray(conversation)) {
            // For conversation cards, Side B lists the parts
            conversation.forEach((part, index) => {
                sideBContainer.appendChild(this._createTextLine(part.text, false, index, part.audioSrc));
            });
        } else {
            // For other card types, populate as before
            if (!this.cardData.audioSrc) {
                let text = typeof this.cardData.sideA === 'string' ? this.cardData.sideA : this.cardData.sideA.text;
                sideAOnBackContainer.appendChild(this._createTextLine(text, true));
            }
            this.cardData.sideB.forEach((line, index) => {
                const audioSrcForLine = (this.cardData.audioSrc && index === 0) ? this.cardData.audioSrc : null;
                sideBContainer.appendChild(this._createTextLine(line, false, index, audioSrcForLine));
            });
        }

        // --- Handle Improvement Note (if it exists) ---
        const noteContainer = document.getElementById('note-content-container');
        noteContainer.innerHTML = '';
        noteContainer.classList.add('hidden');
        if (this.cardData.note && typeof this.cardData.note === 'string' && this.cardData.note.trim() !== '') {
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
     * Plays a sequence of audio elements one after the other.
     * @param {number} index The index of the audio element to start playing from.
     */
    _playConversation(index = 0) {
        const player = document.getElementById(`audio-part-${index}`);
        if (!player) {
            console.log("DEBUG: [FlippableCardScreen] Conversation autoplay finished.");
            return; // End of conversation
        }

        // When the current audio finishes, play the next one
        player.onended = () => {
            this._playConversation(index + 1);
        };

        // Play the current audio
        player.play().catch(e => {
            console.warn(`DEBUG: [FlippableCardScreen] Autoplay for part ${index} was prevented.`, e.message);
            // If autoplay fails, stop the chain. The user can play manually.
        });
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
     * @param {string} text - The text to display and speak.
     * @param {boolean} isSideA - Flag to apply different styling for Side A.
     * @param {number} index - The index of the line in the sideB array.
     * @param {string|null} audioSrcOverride - A specific audio source to use for the play button.
     * @returns {HTMLElement} The created div element.
     */
    _createTextLine(text, isSideA = false, index = -1, audioSrcOverride = null) {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'flex items-center justify-between w-full gap-4';

        const textElement = document.createElement('p');
        textElement.textContent = text;
        textElement.className = isSideA ? 'text-lg md:text-xl font-semibold text-center flex-grow' : 'text-lg';
        
        const playButton = document.createElement('button');
        playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        
        // If a specific audio source is provided (for conversation or single-audio cards), use it.
        if (audioSrcOverride) {
            playButton.className = 'play-audio-src-btn text-indigo-400 hover:text-indigo-300 transition-colors';
            playButton.dataset.audioSrc = audioSrcOverride;
            playButton.title = "Play high-quality audio";
        } else {
            // Otherwise, use the standard device TTS.
            playButton.className = 'play-tts-btn text-gray-400 hover:text-indigo-500 transition-colors';
            playButton.dataset.textToSpeak = text;
            playButton.title = "Play with device voice";
        }

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
        
        // Event delegation for dynamic buttons
        this.container.onclick = (event) => {
            const ttsButton = event.target.closest('.play-tts-btn');
            const audioSrcButton = event.target.closest('.play-audio-src-btn');

            if (audioSrcButton) {
                // Handle playing the pre-generated high-quality audio file
                const audioSrc = audioSrcButton.dataset.audioSrc;
                const audio = new Audio(audioSrc);
                audio.play().catch(e => console.error("Error playing audio:", e));
            } else if (ttsButton) {
                // Handle playing with the device's native TTS
                const text = ttsButton.dataset.textToSpeak;
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
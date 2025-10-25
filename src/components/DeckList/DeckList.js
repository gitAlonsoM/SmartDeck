//src\components\DeckList\DeckList.js

class DeckList {
    /**
     * @param {HTMLElement} container - The DOM element where the component will be rendered.
     * @param {function} onDeckSelect - Callback function to execute when a deck is selected.
     * @param {function} onCreateClick - Callback function for the "Create Deck" button.
     */
     constructor(container, onDeckSelect, onCreateClick, onToggleFavorite, musicService, onShowGlossary) {
        this.container = container;
        this.onDeckSelect = onDeckSelect;
        this.onCreateClick = onCreateClick;
        this.onToggleFavorite = onToggleFavorite;
        this.musicService = musicService; // Store the music service instance
        this.musicPlayerUI = null; // To hold the UI component instance
        this.onShowGlossary = onShowGlossary; // Store the new handler
        console.log("DEBUG: [DeckList] constructor -> Component instantiated.");
    }
    /**
     * Renders the list of decks into the container.
     * @param {Object} decks - An object where each key is a deck ID and the value is the deck object.
     */
     render(decks, favoriteDeckIds) { // Now accepts an array of decks and the set of favorite IDs
        console.log("DEBUG: [DeckList] render -> Rendering decks:", decks);
        
        ComponentLoader.loadHTML('/src/components/DeckList/deck-list.html').then(html => {
            this.container.innerHTML = html;

             // Render the music player UI
            const musicPlayerContainer = this.container.querySelector('#music-player-ui-container');
            if (this.musicService && musicPlayerContainer) {
                console.log("DEBUG: [DeckList] render -> Rendering MusicPlayerUI.");
                this.musicPlayerUI = new MusicPlayerUI(musicPlayerContainer, this.musicService);
                this.musicPlayerUI.render();
            } else {
                console.error("DEBUG: [DeckList] render -> MusicService instance or container not found.");
            }

            // Asynchronously load and display the version number
            this._displayVersion();


            // --- Admin Tools Section (e.g., Glossary Viewer) ---
            // Set this flag to 'false' to hide the admin tools section from the UI
            const SHOW_ADMIN_TOOLS = true; 
            const adminToolsContainer = this.container.querySelector('#admin-tools-container');

            if (adminToolsContainer) {
                if (SHOW_ADMIN_TOOLS) {
                    adminToolsContainer.style.display = 'block';
                    // Find and attach the event listener for the glossary link
                    const glossaryLink = this.container.querySelector('#glossary-viewer-link');
                    if (glossaryLink && this.onShowGlossary) {
                        glossaryLink.addEventListener('click', (e) => {
                            e.preventDefault(); // It's an <a> tag
                            this.onShowGlossary();
                        });
                    }
                } else {
                    adminToolsContainer.style.display = 'none';
                }
            }

            // TEMP HIDE: Voice settings feature is a work in progress.
             // this.setupTtsControls(); 

            const deckListContainer = this.container.querySelector('#deck-list-container');
            if (!deckListContainer) {
                console.error("DEBUG: [DeckList] render -> #deck-list-container not found in template.");
                return;
            }

            deckListContainer.innerHTML = '';
            
            if (!decks || decks.length === 0) {
                deckListContainer.innerHTML = `<p class="text-gray-500 col-span-full">No decks found. Try creating one with AI!</p>`;
            } else {
                // Iterate over the sorted array of decks
                for (const deck of decks) {
                    const isFavorite = favoriteDeckIds.has(deck.id);
                    const card = this._createDeckCardElement(deck, isFavorite);
                    
                    // The main card click navigates to deck details
                    card.addEventListener('click', () => {
                        console.log(`DEBUG: [DeckList] render -> Deck card clicked. ID: ${deck.id}`);
                        this.onDeckSelect(deck.id);
                    });

                    deckListContainer.appendChild(card);
                }
            }

           const createBtn = this.container.querySelector('#create-deck-btn');
            if (createBtn) {
                // TEMP HIDE: AI Deck creation feature is a work in progress.
                createBtn.style.display = 'none'; // This line hides the button from the UI.
                createBtn.addEventListener('click', this.onCreateClick);
            } else {
                // If the button is ever removed from HTML, this will prevent errors.
                // console.error("DEBUG: [DeckList] render -> #create-deck-btn not found.");
            }
            console.log("DEBUG: [DeckList] render -> Deck list rendered successfully.");
        });
    }
/**
     * Sets up the Text-to-Speech (TTS) controls on the deck list screen.
     */
    async setupTtsControls() {
        try {
            await TTSService.init();
            const ttsSettings = document.getElementById('tts-settings');
            ttsSettings.style.display = 'block'; // Show the controls

            const voiceSelect = document.getElementById('voice-select');
            const testVoiceBtn = document.getElementById('test-voice-btn');
            const testSentence = 'Hello, this is a test of the selected voice.';

            const englishVoices = TTSService.getEnglishVoices();
            if (englishVoices.length === 0) {
                voiceSelect.innerHTML = '<option>No English voices found</option>';
                voiceSelect.disabled = true;
                testVoiceBtn.disabled = true;
                return;
            }

            // Populate dropdown
            englishVoices.forEach(voice => {
                const option = document.createElement('option');
                option.textContent = `${voice.name} (${voice.lang})`;
                option.value = voice.name;
                voiceSelect.appendChild(option);
            });

            // Load and apply saved voice
            const savedVoice = StorageService.loadPreferredVoice();
            if (savedVoice) {
                voiceSelect.value = savedVoice;
            } else {
                // If no voice is saved, save the first one as default
                StorageService.savePreferredVoice(englishVoices[0].name);
            }

            // Event Listeners
            voiceSelect.addEventListener('change', () => {
                const selectedVoiceName = voiceSelect.value;
                StorageService.savePreferredVoice(selectedVoiceName);
                TTSService.speak(testSentence, selectedVoiceName);
            });

            testVoiceBtn.addEventListener('click', () => {
                TTSService.speak(testSentence, voiceSelect.value);
            });

        } catch (error) {
            console.error("DEBUG: [DeckList] Failed to set up TTS controls:", error);
            document.getElementById('tts-settings').innerHTML = '<p class="text-red-500">Text-to-Speech is not supported or failed to load on this browser.</p>';
        }
    }
 /**
     * Creates a single deck card DOM element, now with a type indicator icon.
     * @param {Object} deck - The deck object to render.
     * @returns {HTMLElement} The created DOM element for the deck card.
     * @private
     */
   _createDeckCardElement(deck, isFavorite) {
        const card = document.createElement('div');
        card.className = 'deck-card relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg cursor-pointer text-left flex flex-col justify-between';
        
        let typeIconHtml = '';
        if (deck.deckType === 'flippable') {
            typeIconHtml = '<i class="fa-solid fa-clone" title="Flippable Deck"></i>';
        } else if (deck.deckType === 'audioChoice') {
            typeIconHtml = '<i class="fa-solid fa-headphones" title="Audio Choice Deck"></i>';
        } else {
            typeIconHtml = '<i class="fa-solid fa-list-check" title="Multiple Choice Deck"></i>';
        }

        // Star icon logic
        const starColorClass = isFavorite ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600';
        const starIconHtml = `
            <button class="favorite-star-button absolute bottom-4 right-5 text-xl ${starColorClass} hover:text-yellow-300 transition-colors duration-200 z-10">
                <i class="fa-solid fa-star"></i>
            </button>
        `;

        const cardContent = `
            <div class="absolute top-4 right-5 text-gray-400 dark:text-gray-500 text-lg">${typeIconHtml}</div>
            ${starIconHtml}
            <div>
                <h2 class="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-2 truncate pr-8" title="${deck.name}">${deck.name}</h2>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 font-medium mt-4">${deck.cards ? deck.cards.length : 0} cards</p>
        `;
        card.innerHTML = cardContent;

        // Add a specific event listener for the star button
        const starButton = card.querySelector('.favorite-star-button');
        if (starButton) {
            starButton.addEventListener('click', (e) => {
                e.stopPropagation(); // VERY IMPORTANT: Prevents the card's main click event
                this.onToggleFavorite(deck.id);
            });
        }

        return card;
    }

     /**
     * Fetches the version and displays it in the designated container.
     * @private
     */
    async _displayVersion() {
        const version = await VersionService.getVersion();
        if (version) {
            const versionContainer = this.container.querySelector('#version-container');
            if (versionContainer) {
                versionContainer.innerHTML = `<p class="font-mono text-xs text-gray-500 dark:text-gray-400">SmartDeck v${version}</p>`;
            }
        }
    }
}
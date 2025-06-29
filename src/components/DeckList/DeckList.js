/*  src\components\DeckList\DeckList.js*/

// Component responsible for rendering the list of available decks.

// src/components/DeckList/DeckList.js
// Component responsible for rendering the list of available decks.

class DeckList {
    /**
     * @param {HTMLElement} container - The DOM element where the component will be rendered.
     * @param {function} onDeckSelect - Callback function to execute when a deck is selected.
     * @param {function} onCreateClick - Callback function for the "Create Deck" button.
     */
    constructor(container, onDeckSelect, onCreateClick) {
        this.container = container;
        this.onDeckSelect = onDeckSelect;
        this.onCreateClick = onCreateClick;
        console.log("DEBUG: [DeckList] constructor -> Component instantiated.");
    }

    /**
     * Renders the list of decks into the container.
     * @param {Object} decks - An object where each key is a deck ID and the value is the deck object.
     */
    render(decks) {
        console.log("DEBUG: [DeckList] render -> Rendering decks:", decks);
        
        // Load the component's HTML structure first.
        // THE FIX IS HERE: Added a leading slash '/' to make the path absolute from the project root.
        ComponentLoader.loadHTML('/src/components/DeckList/deck-list.html').then(html => {
            this.container.innerHTML = html;

            const deckListContainer = this.container.querySelector('#deck-list-container');
            if (!deckListContainer) {
                console.error("DEBUG: [DeckList] render -> #deck-list-container not found in template.");
                return;
            }

            // Clear any previous content
            deckListContainer.innerHTML = '';
            
            if (Object.keys(decks).length === 0) {
                deckListContainer.innerHTML = `<p class="text-gray-500 col-span-full">No decks found. Try creating one with AI!</p>`;
            } else {
                 // Iterate over the decks and create a card for each
                for (const deckId in decks) {
                    const deck = decks[deckId];
                    const card = this._createDeckCardElement(deck);
                    card.addEventListener('click', () => {
                        console.log(`DEBUG: [DeckList] render -> Deck card clicked. ID: ${deck.id}`);
                        this.onDeckSelect(deck.id);
                    });
                    deckListContainer.appendChild(card);
                }
            }

            // Setup the "Create Deck" button listener
            const createBtn = this.container.querySelector('#create-deck-btn');
            if (createBtn) {
                createBtn.addEventListener('click', this.onCreateClick);
            } else {
                console.error("DEBUG: [DeckList] render -> #create-deck-btn not found.");
            }
            console.log("DEBUG: [DeckList] render -> Deck list rendered successfully.");
        });
    }

    /**
     * Creates a single deck card DOM element.
     * @param {Object} deck - The deck object to render.
     * @returns {HTMLElement} The created DOM element for the deck card.
     * @private
     */
    _createDeckCardElement(deck) {
        const card = document.createElement('div');
        card.className = 'deck-card bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg cursor-pointer text-left';
        
        const cardContent = `
            <h2 class="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-2 truncate" title="${deck.name}">${deck.name}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3 h-10 overflow-hidden">${deck.description}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">${deck.cards ? deck.cards.length : 0} cards</p>
        `;
        card.innerHTML = cardContent;
        return card;
    }
}
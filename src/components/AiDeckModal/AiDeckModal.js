// src/components/AiDeckModal/AiDeckModal.js
// Component that controls the AI Deck Creation modal.

class AiDeckModal {
    /**
     * @param {HTMLElement} container - The DOM element where the modal will be injected.
     * @param {function} onSubmit - The callback function to execute when the form is submitted.
     */
    constructor(container, onSubmit) {
        this.container = container;
        this.onSubmit = onSubmit;
        this.element = null; // Will hold the modal's root DOM element
        this.form = null;
        console.log("DEBUG: [AiDeckModal] constructor -> Component instantiated.");
    }

    /**
     * Loads the modal's HTML, injects it into the container, and sets up event listeners.
     */
    async init() {
        console.log("DEBUG: [AiDeckModal] init -> Initializing component.");
        // Use the corrected absolute path for fetching the component template
        const html = await ComponentLoader.loadHTML('/src/components/AiDeckModal/ai-deck-modal.html');
        this.container.innerHTML = html;

        this.element = this.container.querySelector('#ai-deck-modal-wrapper');
        this.form = this.container.querySelector('#ai-deck-form');
        this.spinner = this.container.querySelector('#ai-spinner');
        this.submitText = this.container.querySelector('#ai-submit-text');
        this.submitButton = this.container.querySelector('#submit-ai-deck-btn');
        
        // --- DEFENSIVE CHECK ---
        // Before setting up listeners, ensure the essential elements were found.
        // This prevents the "Cannot read properties of null" error if the HTML fails to load.
        if (!this.form || !this.element) {
            console.error("DEBUG: [AiDeckModal] init -> CRITICAL ERROR: Modal HTML did not load correctly. Essential elements like '#ai-deck-form' are missing. Aborting setup.");
            return; // Stop execution to prevent further errors.
        }

        this._setupEventListeners();
        console.log("DEBUG: [AiDeckModal] init -> Component initialized and listeners are set up.");
    }

    _setupEventListeners() {
        console.log("DEBUG: [AiDeckModal] _setupEventListeners -> Setting up form listener.");
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const values = this._getFormValues();
            console.log("DEBUG: [AiDeckModal] _setupEventListeners -> Form submitted with values:", values);
            this.onSubmit(values); // Pass the form data to the parent controller (App.js)
        });

        const cancelButton = this.container.querySelector('#cancel-ai-deck-btn');
        cancelButton.addEventListener('click', () => {
            console.log("DEBUG: [AiDeckModal] _setupEventListeners -> Cancel button clicked.");
            this.hide();
        });
    }

    show() {
        if (!this.element) {
            console.error("DEBUG: [AiDeckModal] show -> Cannot show modal, it was not initialized correctly.");
            return;
        }
        console.log("DEBUG: [AiDeckModal] show -> Showing modal.");
        this.form.reset();
        // Pre-fill API key if it exists in storage
        const storedApiKey = localStorage.getItem('smart-decks-v3-apiKey'); // Direct key access for simplicity here
        if (storedApiKey) {
            this.form.elements.apiKey.value = storedApiKey;
            console.log("DEBUG: [AiDeckModal] show -> Prefilled API key from localStorage.");
        }
        this.element.classList.remove('hidden');
    }

    hide() {
        if (!this.element) return;
        console.log("DEBUG: [AiDeckModal] hide -> Hiding modal.");
        this.element.classList.add('hidden');
    }

    _getFormValues() {
        const formData = new FormData(this.form);
        const values = Object.fromEntries(formData.entries());
        // Convert checkbox values to boolean, as FormData doesn't handle them nicely
        values.includeCode = this.form.elements.includeCode.checked;
        values.includeImages = this.form.elements.includeImages.checked;
        return values;
    }

    /**
     * Controls the visual loading state of the submit button.
     * @param {boolean} isLoading 
     */
    setLoading(isLoading) {
        if (!this.submitButton) return;
        console.log(`DEBUG: [AiDeckModal] setLoading -> Setting loading state to: ${isLoading}`);
        if (isLoading) {
            this.submitButton.disabled = true;
            this.submitText.classList.add('hidden');
            this.spinner.classList.remove('hidden');
        } else {
            this.submitButton.disabled = false;
            this.submitText.classList.remove('hidden');
            this.spinner.classList.add('hidden');
        }
    }
}
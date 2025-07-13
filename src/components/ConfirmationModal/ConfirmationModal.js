/* src\components\ConfirmationModal\ConfirmationModal.js */
// A reusable, promise-based modal for confirming user actions.
class ConfirmationModal {
    constructor(container) {
        this.container = container;
        this.resolvePromise = null;
        console.log("DEBUG: [ConfirmationModal] constructor -> Component instantiated.");
    }

    async init() {
        console.log("DEBUG: [ConfirmationModal] init -> Initializing component.");
        const html = await ComponentLoader.loadHTML('/src/components/ConfirmationModal/confirmation-modal.html');
        this.container.innerHTML = html;
        this.backdrop = document.getElementById('confirmation-modal-backdrop');
        this.panel = document.getElementById('confirmation-modal-panel');
        this.titleElement = document.getElementById('confirmation-modal-title');
        this.messageElement = document.getElementById('confirmation-modal-message');
        this.confirmButton = document.getElementById('confirmation-modal-confirm-btn');
        this.cancelButton = document.getElementById('confirmation-modal-cancel-btn');
        this._setupEventListeners();
        console.log("DEBUG: [ConfirmationModal] init -> Component initialized.");
    }

    _setupEventListeners() {
        this.confirmButton.addEventListener('click', () => this.hide(true));
        this.cancelButton.addEventListener('click', () => this.hide(false));
        this.backdrop.addEventListener('click', (event) => {
            if (event.target === this.backdrop) {
                this.hide(false);
            }
        });
    }

    /**
     * Shows the modal and returns a promise that resolves with true (confirm) or false (cancel).
     * @param {string} title The title of the confirmation dialog.
     * @param {string} message The message explaining the action.
     * @returns {Promise<boolean>}
     */
    show(title, message) {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;

            this.titleElement.textContent = title;
            this.messageElement.textContent = message;

            this.backdrop.classList.remove('hidden');
            setTimeout(() => {
                this.backdrop.classList.remove('opacity-0');
                this.panel.classList.remove('scale-95');
            }, 10);
        });
    }

    hide(result) {
        this.backdrop.classList.add('opacity-0');
        this.panel.classList.add('scale-95');
        
        setTimeout(() => {
            this.backdrop.classList.add('hidden');
            if (this.resolvePromise) {
                this.resolvePromise(result);
                this.resolvePromise = null;
            }
        }, 300);
    }
}
/* src\components\NotificationModal\NotificationModal.js */

// A reusable, promise-based modal for showing notifications.

class NotificationModal {
    constructor(container) {
        this.container = container;
        this.resolvePromise = null;
        console.log("DEBUG: [NotificationModal] constructor -> Component instantiated.");
    }

    async init() {
        console.log("DEBUG: [NotificationModal] init -> Initializing component.");
        const html = await ComponentLoader.loadHTML('/src/components/NotificationModal/notification-modal.html');
        this.container.innerHTML = html;
        this.backdrop = document.getElementById('notification-modal-backdrop');
        this.panel = document.getElementById('notification-modal-panel');
        this.iconContainer = document.getElementById('notification-modal-icon-container');
        this.iconElement = document.getElementById('notification-modal-icon');
        this.titleElement = document.getElementById('notification-modal-title');
        this.messageElement = document.getElementById('notification-modal-message');
        this.okButton = document.getElementById('notification-modal-ok-btn');
        this._setupEventListeners();
        console.log("DEBUG: [NotificationModal] init -> Component initialized.");
    }

    _setupEventListeners() {
        this.okButton.addEventListener('click', () => this.hide());
        this.backdrop.addEventListener('click', (event) => {
            // Only hide if the click is on the backdrop itself, not the panel
            if (event.target === this.backdrop) {
                this.hide();
            }
        });
    }

    /**
     * Shows the modal with custom content and returns a promise that resolves when the user clicks OK.
     * @param {string} title - The title of the modal.
     * @param {string} message - The body text of the modal.
     * @param {string} iconClass - The Font Awesome class for the icon (e.g., 'fa-solid fa-star').
     * @param {string} colorClass - The Tailwind CSS class for the icon color (e.g., 'text-green-500').
     * @returns {Promise<void>}
     */
    show(title, message, { icon, color, bgColor }) {
        return new Promise((resolve) => {
            this.resolvePromise = resolve;

            this.titleElement.textContent = title;
            this.messageElement.textContent = message;

            // Apply styles for the icon
            this.iconElement.className = `text-4xl ${icon} ${color}`;
            this.iconContainer.className = `mx-auto mb-4 w-16 h-16 flex items-center justify-center rounded-full ${bgColor}`;

            // Show the modal with animations
            this.backdrop.classList.remove('hidden');
            setTimeout(() => {
                this.backdrop.classList.remove('opacity-0');
                this.panel.classList.remove('scale-95');
            }, 10); // Short delay to allow CSS transitions to trigger
        });
    }

    hide() {
        // Hide the modal with animations
        this.backdrop.classList.add('opacity-0');
        this.panel.classList.add('scale-95');
        
        // Wait for animation to finish before hiding completely and resolving the promise
        setTimeout(() => {
            this.backdrop.classList.add('hidden');
            if (this.resolvePromise) {
                this.resolvePromise();
                this.resolvePromise = null;
            }
        }, 300); // Must match the duration in the CSS
    }
}
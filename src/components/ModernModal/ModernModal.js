// Metadata:
// File: src/components/ModernModal/ModernModal.js
// Element: ModernModal Class (Robust Re-initialization Fix)

class ModernModal {
    constructor() {
        this.overlayElement = null;
        this.containerElement = null;
        this.onConfirmCallback = null;
        this.isInitialized = false;

        // SVG Icons defined as strings for direct injection
        this.icons = {
            success: `
                <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>`,
            warning: `
                <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>`
        };
    }

    /**
     * Initializes the modal by injecting HTML into the DOM.
     * Checks if the element already exists to prevent duplicates or missing refs.
     * @param {HTMLElement} parentElement - The container to append the modal to.
     */
    async init(parentElement) {
        // Robust Check: Does the element actually exist in the DOM right now?
        const existingOverlay = document.getElementById('modern-modal-overlay');
        
        if (this.isInitialized && existingOverlay) {
            // If logical state says yes AND DOM element exists, we are safe.
            return; 
        }
        
        // If logical state said yes but DOM is missing (App re-render wiped it), reset state.
        this.isInitialized = false;

        // Use the global ComponentLoader to fetch the template
        // Ensure path matches your project structure
        const html = await ComponentLoader.loadHTML('src/components/ModernModal/modern-modal.html');
        parentElement.insertAdjacentHTML('beforeend', html);

        // Re-bind references to the new DOM elements
        this.overlayElement = document.getElementById('modern-modal-overlay');
        this.containerElement = document.getElementById('modern-modal-container');
        this.isInitialized = true;
    }

    /**
     * Displays the modal with specific content and configuration.
     */
    show({ title, message, type = 'success', onConfirm = null }) {
        // Double check initialization before proceeding to avoid null pointer exceptions
        if (!this.isInitialized || !this.overlayElement) {
            console.error("Modal DOM elements missing. Re-init required.");
            return;
        }

        this.onConfirmCallback = onConfirm;

        // 1. Fill Content
        const titleEl = document.getElementById('modal-title');
        const msgEl = document.getElementById('modal-message');
        
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;

        // 2. Setup Icon
        const iconContainer = document.getElementById('modal-icon-container');
        if (iconContainer) {
            iconContainer.innerHTML = this.icons[type] || this.icons.success;
            // Dynamic styling based on type (Warning = Red / Success = Green)
            iconContainer.className = `flex-shrink-0 mr-4 w-12 h-12 rounded-full flex items-center justify-center bg-opacity-20 ${type === 'warning' ? 'bg-red-900' : 'bg-green-900'}`;
        }

        // 3. Setup Buttons
        this._setupButtons(type);

        // 4. Show with Animation
        this.overlayElement.classList.remove('hidden');
        // Small timeout to allow browser to render 'hidden' removal before transitioning opacity
        setTimeout(() => {
             if(this.overlayElement) this.overlayElement.classList.remove('opacity-0');
             if(this.containerElement) {
                this.containerElement.classList.remove('scale-95', 'opacity-0');
                this.containerElement.classList.add('scale-100', 'opacity-100');
             }
        }, 10);
    }

    hide() {
        if (!this.overlayElement) return;
        
        // Animación de salida (Fade out)
        this.overlayElement.classList.add('opacity-0');
        if(this.containerElement) {
            this.containerElement.classList.add('scale-95', 'opacity-0');
            this.containerElement.classList.remove('scale-100', 'opacity-100');
        }

        // Wait for transition to finish before hiding logic
        setTimeout(() => {
            if(this.overlayElement) this.overlayElement.classList.add('hidden');
            this.onConfirmCallback = null;
        }, 300);
    }

    _setupButtons(type) {
        const actionsContainer = document.getElementById('modal-actions');
        if (!actionsContainer) return;
        
        actionsContainer.innerHTML = ''; // Clean previous buttons

        // Cancel Button (Only needed for warnings/confirmations)
        if (type === 'warning') {
             const cancelButton = document.createElement('button');
             cancelButton.className = "px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500";
             cancelButton.textContent = "Cancel";
             cancelButton.onclick = () => this.hide();
             actionsContainer.appendChild(cancelButton);
        }

        // Confirm/OK Button
        const confirmButton = document.createElement('button');
        const btnBgColor = type === 'warning' 
            ? "bg-red-600 hover:bg-red-700 focus:ring-red-500" 
            : "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500";
            
        confirmButton.className = `px-4 py-2 ${btnBgColor} text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800`;
        confirmButton.textContent = type === 'warning' ? "Yes, Reset It" : "OK, Got it";
        
        confirmButton.onclick = () => {
            if (type === 'warning' && this.onConfirmCallback) {
                this.onConfirmCallback();
            }
            this.hide();
        };
        actionsContainer.appendChild(confirmButton);
    }
}
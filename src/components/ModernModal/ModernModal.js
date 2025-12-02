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
            cycle: `
                <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
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
        
      // SINGLETON FIX: If the HTML already exists in the DOM (created by another instance),
        // just bind to it. Do NOT append it again.
        if (existingOverlay) {
            this.overlayElement = existingOverlay;
            this.containerElement = document.getElementById('modern-modal-container');
            this.isInitialized = true;
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
            
            // Dynamic styling based on type
            let bgClass = 'bg-green-900'; // Default success
            if (type === 'warning') bgClass = 'bg-red-900';
            else if (type === 'cycle') bgClass = 'bg-amber-900/50'; // Golden/Amber background for cycle

            iconContainer.className = `flex-shrink-0 mr-4 w-12 h-12 rounded-full flex items-center justify-center bg-opacity-20 ${bgClass}`;
            
            // Trigger confetti if it's the cycle/mastery type
            if (type === 'cycle') {
                this._triggerConfetti();
            }
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
        let btnBgColor = "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"; // Default
        let btnText = "OK, Got it";

        if (type === 'warning') {
            btnBgColor = "bg-red-600 hover:bg-red-700 focus:ring-red-500";
            btnText = "Yes, Reset It";
        } else if (type === 'cycle') {
            btnBgColor = "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500";
            btnText = "Let's Start!";
        }
            
        confirmButton.className = `px-4 py-2 ${btnBgColor} text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800`;
        confirmButton.textContent = btnText;
        
        confirmButton.onclick = () => {
            // CRITICAL FIX: Allow 'cycle' type to also execute the callback
            if ((type === 'warning' || type === 'cycle') && this.onConfirmCallback) {
                this.onConfirmCallback();
            }
            this.hide();
        };
        actionsContainer.appendChild(confirmButton);
    }


    // Internal helper for simple confetti effect without external libraries
    _triggerConfetti() {
        const colors = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6'];
        const container = document.getElementById('modern-modal-container');
        if (!container) return;

        for (let i = 0; i < 30; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.width = '8px';
            confetti.style.height = '8px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.top = '0';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.opacity = '0.8';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            confetti.style.zIndex = '10';
            confetti.style.pointerEvents = 'none'; // Click-through
            
            // Animate
            const duration = 1000 + Math.random() * 1000;
            const xEnd = (Math.random() - 0.5) * 200;
            
            confetti.animate([
                { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
                { transform: `translate(${xEnd}px, 150px) rotate(720deg)`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
            }).onfinish = () => confetti.remove();

            container.appendChild(confetti);
        }
    }
}
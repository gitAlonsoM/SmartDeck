//src\components\InfoModal\InfoModal.js
class InfoModal {
    constructor(container, onMarkImprovement) {
        this.container = container;
        this.onMarkImprovement = onMarkImprovement; // Callback to open the improvement UI
        this.currentModalId = null;
        this.modalBackdrop = null;
        this.modalContent = null;
        this.modalTitle = null;
        this.modalBody = null;
        this.closeButton = null;
        console.log("DEBUG: [InfoModal] constructor -> Component instantiated.");
    }

    async init() {
        const html = await ComponentLoader.loadHTML('/src/components/InfoModal/info-modal.html');
        this.container.innerHTML = html;
        
        this.modalBackdrop = document.getElementById('info-modal-backdrop');
        this.modalContent = document.getElementById('info-modal-content');
        this.modalTitle = document.getElementById('info-modal-title');
        this.modalBody = document.getElementById('info-modal-body');
        this.closeButton = document.getElementById('info-modal-close-btn');
        this.improveBtn = document.getElementById('info-modal-improve-btn');
        this.closeButton.onclick = () => this.hide();
        this.modalBackdrop.onclick = () => this.hide();
        this.improveBtn.onclick = () => {
            if (this.currentModalId && this.onMarkImprovement) {
                // Extract the title directly from the DOM to ensure 100% accuracy
                this.onMarkImprovement(this.currentModalId, this.modalTitle.textContent);
            }
        };
        console.log("DEBUG: [InfoModal] init -> Component initialized and listeners attached.");
    }

   show(title, contentHTML, modalId, isMarked = false) {
        console.log(`DEBUG: [InfoModal] show -> Showing modal with title: '${title}' (ID: ${modalId})`);
        if (!this.modalContent) {
            console.error("DEBUG: [InfoModal] show -> Cannot show modal, component not initialized.");
            return;
        }

        this.currentModalId = modalId;
        this.modalTitle.textContent = title;
        this.modalBody.innerHTML = contentHTML;
        
        this.updateFlagUI(isMarked);

        this.modalBackdrop.classList.remove('hidden');
        this.modalContent.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Always start reading from the top of the modal, not wherever the
        // scroll happened to land after injecting new content.
        this.modalBody.scrollTop = 0;
        console.log("VERIFY: [InfoModal] show -> Scrolled modal body to top.");
    }

    updateFlagUI(isMarked) {
        if (!this.improveBtn) return;
        const icon = this.improveBtn.querySelector('i');
        if (isMarked) {
            icon.classList.remove('text-gray-400');
            icon.classList.add('text-yellow-400');
        } else {
            icon.classList.add('text-gray-400');
            icon.classList.remove('text-yellow-400');
        }
        console.log(`VERIFY: [InfoModal] Flag icon updated. Marked: ${isMarked}`);
    }

    hide() {
        console.log("DEBUG: [InfoModal] hide -> Hiding modal.");
        this.modalBackdrop.classList.add('hidden');
        this.modalContent.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
}
//src\components\InfoModal\InfoModal.js
class InfoModal {
    constructor(container) {
        this.container = container;
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

        this.closeButton.onclick = () => this.hide();
        this.modalBackdrop.onclick = () => this.hide();
        console.log("DEBUG: [InfoModal] init -> Component initialized and listeners attached.");
    }

    show(title, contentHTML) {
        console.log(`DEBUG: [InfoModal] show -> Showing modal with title: '${title}'`);
        if (!this.modalContent) {
            console.error("DEBUG: [InfoModal] show -> Cannot show modal, component not initialized.");
            return;
        }

        this.modalTitle.textContent = title;
        this.modalBody.innerHTML = contentHTML;

        this.modalBackdrop.classList.remove('hidden');
        this.modalContent.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    hide() {
        console.log("DEBUG: [InfoModal] hide -> Hiding modal.");
        this.modalBackdrop.classList.add('hidden');
        this.modalContent.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
}
/* src\components\ImprovementModal\ImprovementModal.js */

class ImprovementModal {
    constructor(container, onSave) {
        this.container = container;
        this.onSave = onSave;
        this.cardIdToImprove = null;
        console.log("DEBUG: [ImprovementModal] constructor -> Component instantiated.");
    }

    async init() {
        const html = await ComponentLoader.loadHTML('/src/components/ImprovementModal/improvement-modal.html');
        this.container.innerHTML = html;
        this.modalBackdrop = this.container.querySelector('#improvement-modal-backdrop');
        this.modal = this.container.querySelector('#improvement-modal');
        this.form = this.container.querySelector('#improvement-form');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close buttons
        this.modalBackdrop.addEventListener('click', (e) => { if (e.target === this.modalBackdrop) this.hide(); });
        this.container.querySelector('#improvement-modal-close-btn').addEventListener('click', () => this.hide());
        this.container.querySelector('#improvement-modal-cancel-btn').addEventListener('click', () => this.hide());

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(this.form);
            const reasons = formData.getAll('improvement_reason');
            const note = formData.get('notes');

            if (reasons.length === 0 && !note.trim()) {
                alert("Please select at least one reason or provide a note.");
                return;
            }

            this.onSave(this.cardIdToImprove, { reasons, note });
            this.hide();
        });
    }

    show(cardId) {
        this.cardIdToImprove = cardId;
        this.form.reset(); // Clear previous entries
        this.modalBackdrop.classList.remove('hidden');
        this.modalBackdrop.classList.add('flex');
        setTimeout(() => {
            this.modal.classList.remove('scale-95', 'opacity-0');
        }, 10); // Start transition
    }

    hide() {
        this.modal.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.modalBackdrop.classList.add('hidden');
            this.modalBackdrop.classList.remove('flex');
        }, 200); // Match transition duration
    }
}
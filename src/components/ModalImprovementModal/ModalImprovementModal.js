/* src\components\ModalImprovementModal\ModalImprovementModal.js */
class ModalImprovementModal {
    constructor(container, onSave, onRemove) {
        this.container = container;
        this.onSave = onSave;
        this.onRemove = onRemove; 
        console.log("DEBUG: [ModalImprovementModal] constructor -> Component instantiated.");
    }

    async init() {
        const html = await ComponentLoader.loadHTML('/src/components/ModalImprovementModal/modal-improvement-modal.html');
        this.container.innerHTML = html;
        this.modalBackdrop = this.container.querySelector('#modal-improvement-backdrop');
        this.modal = this.container.querySelector('#modal-improvement-modal');
        this.form = this.container.querySelector('#modal-improvement-form');
        this.removeBtn = this.container.querySelector('#modal-improvement-remove-btn'); 

        this.expandBtn = this.container.querySelector('#modal-toggle-expand-btn');
        this.textarea = this.container.querySelector('#modal-improvement-notes');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.modalBackdrop.addEventListener('click', (e) => { if (e.target === this.modalBackdrop) this.hide(); });
        this.container.querySelector('#modal-improvement-close-btn').addEventListener('click', () => this.hide());
        this.container.querySelector('#modal-improvement-cancel-btn').addEventListener('click', () => this.hide());

        this.removeBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to remove the improvement note for this modal?')) {
                console.log(`VERIFY: [ModalImprovementModal] Trash button clicked for modal ${this.modalIdToImprove}.`);
                this.onRemove(this.modalIdToImprove);
                this.hide();
            }
        });
        
        if (this.expandBtn && this.textarea) {
            this.expandBtn.addEventListener('click', () => {
                const isExpanded = this.textarea.classList.contains('h-80');
                if (isExpanded) {
                    this.textarea.classList.remove('h-80');
                    this.textarea.rows = 5; 
                    this.expandBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                } else {
                    this.textarea.classList.add('h-80'); 
                    this.textarea.removeAttribute('rows'); 
                    this.expandBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                }
            });
        }

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(this.form);
            const userCommentValue = formData.get('user_comment'); 
            
            if (userCommentValue.trim() === '') {
                console.log("VERIFY: [ModalImprovementModal] Note is empty, triggering removal.");
                this.onRemove(this.modalIdToImprove);
            } else {
                console.log(`VERIFY: [ModalImprovementModal] Saving note for modal ${this.modalIdToImprove}.`);
                this.onSave(this.modalIdToImprove, { user_comment: userCommentValue });
            }
            this.hide();
        });
    }

    show(modalId, existingData = null) {
        this.modalIdToImprove = modalId;
        this.form.reset(); 

        if (existingData && existingData.user_comment) {
            console.log("DEBUG: [ModalImprovementModal] show -> Populating modal with existing data:", existingData);
            this.textarea.value = existingData.user_comment;
            this.removeBtn.classList.remove('hidden');
        } else {
            this.removeBtn.classList.add('hidden');
        }

        this.modalBackdrop.classList.remove('hidden');
        this.modalBackdrop.classList.add('flex');
        setTimeout(() => {
            this.modal.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    hide() {
        this.modal.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.modalBackdrop.classList.add('hidden');
            this.modalBackdrop.classList.remove('flex');
        }, 200); 
    }
}
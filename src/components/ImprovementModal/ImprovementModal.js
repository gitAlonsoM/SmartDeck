/* src\components\ImprovementModal\ImprovementModal.js */

class ImprovementModal {
     constructor(container, onSave, onRemove) {
        this.container = container;
        this.onSave = onSave;
        this.onRemove = onRemove; 
        console.log("DEBUG: [ImprovementModal] constructor -> Component instantiated.");
    }
async init() {
        const html = await ComponentLoader.loadHTML('/src/components/ImprovementModal/improvement-modal.html');
        this.container.innerHTML = html;
        this.modalBackdrop = this.container.querySelector('#improvement-modal-backdrop');
        this.modal = this.container.querySelector('#improvement-modal');
        this.form = this.container.querySelector('#improvement-form');
        this.removeBtn = this.container.querySelector('#improvement-modal-remove-btn'); 

        // Initialize the expand button and the textarea
        this.expandBtn = this.container.querySelector('#toggle-expand-btn');
        this.textarea = this.container.querySelector('#improvement-notes');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.modalBackdrop.addEventListener('click', (e) => { if (e.target === this.modalBackdrop) this.hide(); });
        this.container.querySelector('#improvement-modal-close-btn').addEventListener('click', () => this.hide());
        this.container.querySelector('#improvement-modal-cancel-btn').addEventListener('click', () => this.hide());

        this.removeBtn.addEventListener('click', () => {R
            if (confirm('Are you sure you want to remove this card from the improvement list?')) {
                this.onRemove(this.cardIdToImprove);
                this.hide();
            }
        });
        
        // Logic to toggle the textarea expansion
        if (this.expandBtn && this.textarea) {
            this.expandBtn.addEventListener('click', () => {
                const isExpanded = this.textarea.classList.contains('h-80');
                
                if (isExpanded) {
                    // Contract
                    this.textarea.classList.remove('h-80');
                    this.textarea.rows = 5; 
                    this.expandBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                    console.log("VERIFY: Textarea restored to default size.");
                } else {
                    // Expand
                    this.textarea.classList.add('h-80'); 
                    this.textarea.removeAttribute('rows'); 
                    this.expandBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                    console.log("VERIFY: Textarea expanded to large view.");
                }
            });
        }

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(this.form);
            const reasons = formData.getAll('improvement_reason');
            const userCommentValue = formData.get('user_comment'); // Read form field into a clearly named variable.
            this.onSave(this.cardIdToImprove, { reasons, user_comment: userCommentValue });

            this.hide();
        });
    }

   

      /**
     * Shows the modal, dynamically adjusting options based on card type and pre-filling with existing data.
     * @param {string} cardId The ID of the card to improve.
     * @param {string} cardType The type of the card ('quiz' or 'flippable').
     * @param {object|null} existingData 
     */
    show(cardId, cardType, existingData = null) {
        this.cardIdToImprove = cardId;
        this.form.reset(); 

        this._updateReasonOptions(cardType);

        if (existingData) {
            console.log("DEBUG: [ImprovementModal] show -> Populating modal with existing data:", existingData);
            (existingData.reasons || []).forEach(reasonValue => {
                const checkbox = this.form.querySelector(`input[name="improvement_reason"][value="${reasonValue}"]`);
                if (checkbox) checkbox.checked = true;
            });
            
            this.form.querySelector('#improvement-notes').value = existingData.user_comment || '';
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

    /**
     * Shows or hides the reason checkboxes based on the card type.
     * @param {string} cardType The type of card ('quiz' or 'flippable').
     * @private
     */
    _updateReasonOptions(cardType) {
        const reasonsContainer = this.container.querySelector('#reasons-container');
        const allReasonLabels = reasonsContainer.querySelectorAll('label');


        const isFlippableType = cardType === 'flippable';

        allReasonLabels.forEach(label => {
            const reasonFor = label.dataset.reasonFor;
            let shouldShow = false;

            if (reasonFor === 'all') {
                shouldShow = true;
            } else if (isFlippableType && reasonFor === 'flippable') {
                shouldShow = true;
            } else if (!isFlippableType && reasonFor === 'quiz') {
                shouldShow = true;
            }

            if (shouldShow) {
                label.classList.remove('hidden');
            } else {
                label.classList.add('hidden');
            }
        });
    }


    hide() {
        this.modal.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.modalBackdrop.classList.add('hidden');
            this.modalBackdrop.classList.remove('flex');
        }, 200); 
    }
}
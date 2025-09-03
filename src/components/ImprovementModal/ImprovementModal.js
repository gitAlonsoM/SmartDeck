/* src\components\ImprovementModal\ImprovementModal.js */

class ImprovementModal {
     constructor(container, onSave, onRemove) {
        this.container = container;
        this.onSave = onSave;
        this.onRemove = onRemove; // Assign the remove callback
        this.cardIdToImprove = null;
        console.log("DEBUG: [ImprovementModal] constructor -> Component instantiated.");
    }
async init() {
        const html = await ComponentLoader.loadHTML('/src/components/ImprovementModal/improvement-modal.html');
        this.container.innerHTML = html;
        this.modalBackdrop = this.container.querySelector('#improvement-modal-backdrop');
        this.modal = this.container.querySelector('#improvement-modal');
        this.form = this.container.querySelector('#improvement-form');
        this.removeBtn = this.container.querySelector('#improvement-modal-remove-btn'); 
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.modalBackdrop.addEventListener('click', (e) => { if (e.target === this.modalBackdrop) this.hide(); });
        this.container.querySelector('#improvement-modal-close-btn').addEventListener('click', () => this.hide());
        this.container.querySelector('#improvement-modal-cancel-btn').addEventListener('click', () => this.hide());

        this.removeBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to remove this card from the improvement list?')) {
                this.onRemove(this.cardIdToImprove);
                this.hide();
            }
        });

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(this.form);
            const reasons = formData.getAll('improvement_reason');
            const note = formData.get('notes');

            // Allow saving with no reasons/note, which effectively just saves an empty state
            this.onSave(this.cardIdToImprove, { reasons, note });
            this.hide();
        });
    }

   

      /**
     * Shows the modal, dynamically adjusting options based on card type and pre-filling with existing data.
     * @param {string} cardId The ID of the card to improve.
     * @param {string} cardType The type of the card ('quiz' or 'flippable').
     * @param {object|null} existingData The existing improvement data for this card {reasons, note}.
     */
    show(cardId, cardType, existingData = null) {
        this.cardIdToImprove = cardId;
        this.form.reset(); // Clear previous entries before populating

        this._updateReasonOptions(cardType);

        if (existingData) {
            console.log("DEBUG: [ImprovementModal] show -> Populating modal with existing data:", existingData);
            (existingData.reasons || []).forEach(reasonValue => {
                const checkbox = this.form.querySelector(`input[name="improvement_reason"][value="${reasonValue}"]`);
                if (checkbox) checkbox.checked = true;
            });
            this.form.querySelector('#improvement-notes').value = existingData.note || '';
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

        // This logic now correctly assumes that any deck type that is NOT 'flippable'
        // should be treated as a 'quiz' for the purpose of showing improvement reasons.
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
        }, 200); // Match transition duration
    }
}
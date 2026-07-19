/* src\components\SrsSettingsModal\SrsSettingsModal.js */
// A self-contained modal for editing a deck's spaced-repetition settings:
// new cards/day, max reviews/day, and difficulty, plus a clickable info panel
// explaining what each control does. Stateless renderer: it reads the current
// settings on show() and hands the edited values back through an onSave callback.
class SrsSettingsModal {
    constructor(container) {
        this.container = container;
        this.onSave = null;
        this.selectedDifficulty = 'normal';
        this.isInitialized = false;
        console.log("DEBUG: [SrsSettingsModal] constructor -> Component instantiated.");
    }

    async init() {
        if (this.isInitialized || document.getElementById('srs-settings-overlay')) {
            this.isInitialized = true;
            return;
        }
        const html = await ComponentLoader.loadHTML('src/components/SrsSettingsModal/srs-settings-modal.html');
        this.container.insertAdjacentHTML('beforeend', html);
        this.overlay = document.getElementById('srs-settings-overlay');
        this.panel = document.getElementById('srs-settings-container');
        this._setupListeners();
        this.isInitialized = true;
    }

    _setupListeners() {
        document.getElementById('srs-settings-close').onclick = () => this.hide();
        document.getElementById('srs-settings-cancel').onclick = () => this.hide();
        document.getElementById('srs-settings-save').onclick = () => this._handleSave();

        document.getElementById('srs-info-toggle').onclick = () => {
            document.getElementById('srs-info-panel').classList.toggle('hidden');
        };

        document.getElementById('srs-difficulty').addEventListener('click', (e) => {
            const btn = e.target.closest('.srs-diff-btn');
            if (!btn) return;
            this.selectedDifficulty = btn.dataset.value;
            this._paintDifficulty();
        });

        // Close when clicking the dimmed backdrop (but not the panel itself).
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });
    }

    /**
     * Shows only the grading explanation that matches the deck type:
     * flip cards get the 3-button (Again/Good/Easy) note; multiple-choice and
     * audio-choice decks get the auto-graded (correct/wrong) note.
     * @param {string} deckType
     */
    _paintDeckTypeInfo(deckType) {
        const flip = document.getElementById('srs-info-flippable');
        const choice = document.getElementById('srs-info-choice');
        if (!flip || !choice) return;
        const isFlippable = deckType === 'flippable';
        flip.classList.toggle('hidden', !isFlippable);
        choice.classList.toggle('hidden', isFlippable);
    }

    _paintDifficulty() {
        document.querySelectorAll('#srs-difficulty .srs-diff-btn').forEach(btn => {
            const active = btn.dataset.value === this.selectedDifficulty;
            btn.classList.toggle('bg-indigo-600', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('border-indigo-500', active);
            btn.classList.toggle('text-gray-300', !active);
            btn.classList.toggle('border-gray-600', !active);
        });
    }

    /**
     * @param {{newPerDay:number, maxReviewsPerDay:number, difficulty:string}} settings
     * @param {string} deckType Deck type ('flippable' | 'multipleChoice' | 'audioChoice'),
     *        used to show the matching grading explanation in the info panel.
     * @param {function} onSave Called with the edited settings object.
     */
    show(settings, deckType, onSave) {
        if (!this.isInitialized) return;
        this.onSave = onSave;

        document.getElementById('srs-new-per-day').value = settings.newPerDay;
        document.getElementById('srs-max-reviews').value = settings.maxReviewsPerDay;
        this.selectedDifficulty = settings.difficulty || 'normal';
        this._paintDifficulty();
        this._paintDeckTypeInfo(deckType);
        document.getElementById('srs-info-panel').classList.add('hidden');

        this.overlay.classList.remove('hidden');
        setTimeout(() => {
            this.overlay.classList.remove('opacity-0');
            this.panel.classList.remove('scale-95', 'opacity-0');
            this.panel.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    hide() {
        if (!this.overlay) return;
        this.overlay.classList.add('opacity-0');
        this.panel.classList.add('scale-95', 'opacity-0');
        this.panel.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => {
            this.overlay.classList.add('hidden');
            this.onSave = null;
        }, 300);
    }

    _handleSave() {
        const newPerDay = this._clampInt(document.getElementById('srs-new-per-day').value, 0, 9999, 10);
        const maxReviewsPerDay = this._clampInt(document.getElementById('srs-max-reviews').value, 0, 99999, 100);
        const settings = { newPerDay, maxReviewsPerDay, difficulty: this.selectedDifficulty };
        console.log("VERIFY: [SrsSettingsModal] Saving settings:", settings);
        if (this.onSave) this.onSave(settings);
        this.hide();
    }

    _clampInt(raw, min, max, fallback) {
        let n = parseInt(raw, 10);
        if (isNaN(n)) n = fallback;
        return Math.max(min, Math.min(max, n));
    }
}

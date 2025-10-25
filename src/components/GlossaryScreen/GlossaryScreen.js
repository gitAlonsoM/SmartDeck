/* src\components\GlossaryScreen\GlossaryScreen.js */

class GlossaryScreen {
    constructor(container, onGoBack) {
        this.container = container;
        this.onGoBack = onGoBack;
        this.glossaryData = null;
        this.entryIds = [];
        this.currentIndex = 0;
        console.log("DEBUG: [GlossaryScreen] constructor -> Component instantiated.");
    }

    async init() {
        console.log("DEBUG: [GlossaryScreen] init -> Initializing.");
        this.html = await ComponentLoader.loadHTML('/src/components/GlossaryScreen/glossary-screen.html');
        console.log("DEBUG: [GlossaryScreen] init -> HTML template loaded.");
    }

    render(glossaryData) {
        console.log("DEBUG: [GlossaryScreen] render -> Rendering GlossaryScreen.");
        this.container.innerHTML = this.html;
        this.glossaryData = glossaryData;
        
        if (!this.glossaryData) {
            this.container.innerHTML = `<p class="text-red-500">Error: Glossary data could not be loaded.</p>`;
            return;
        }

        this.entryIds = Object.keys(this.glossaryData);
        this.currentIndex = 0;
        
        this.titleEl = this.container.querySelector('#glossary-title');
        this.contentEl = this.container.querySelector('#glossary-content');
        this.navStatusEl = this.container.querySelector('#glossary-nav-status');
        this.prevBtn = this.container.querySelector('#glossary-prev-btn');
        this.nextBtn = this.container.querySelector('#glossary-next-btn');
        this.searchInput = this.container.querySelector('#glossary-search-input');
        
        this.container.querySelector('#glossary-back-btn').addEventListener('click', () => this.onGoBack());
        
        this.container.querySelector('#glossary-search-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSearch();
        });

        this.prevBtn.addEventListener('click', () => this._handlePrevious());
        this.nextBtn.addEventListener('click', () => this._handleNext());

        this._displayCurrentEntry();
    }

    _displayCurrentEntry() {
        if (this.currentIndex < 0 || this.currentIndex >= this.entryIds.length) {
            console.error(`[GlossaryScreen] Invalid index: ${this.currentIndex}`);
            return;
        }

        const entryId = this.entryIds[this.currentIndex];
        const entryData = this.glossaryData[entryId];

        console.log(`DEBUG: [GlossaryScreen] _displayCurrentEntry -> Displaying entry ID: ${entryId}, Title: ${entryData.title}`);

        if (entryData) {
            this.titleEl.textContent = `[${entryId}] ${entryData.title}`;
            this.contentEl.innerHTML = entryData.content;
            this.navStatusEl.textContent = `${this.currentIndex + 1} / ${this.entryIds.length}`;
            this.searchInput.value = ''; // Clear search input
        }

        // Update button states
        this.prevBtn.disabled = (this.currentIndex === 0);
        this.nextBtn.disabled = (this.currentIndex === this.entryIds.length - 1);
        
        // Highlight code in the new content
        this.contentEl.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    _handleNext() {
        console.log("DEBUG: [GlossaryScreen] _handleNext -> User clicked 'Next'.");
        if (this.currentIndex < this.entryIds.length - 1) {
            this.currentIndex++;
            this._displayCurrentEntry();
        }
    }

    _handlePrevious() {
        console.log("DEBUG: [GlossaryScreen] _handlePrevious -> User clicked 'Previous'.");
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this._displayCurrentEntry();
        }
    }

    _handleSearch() {
        const searchId = this.searchInput.value.trim();
        console.log(`DEBUG: [GlossaryScreen] _handleSearch -> User searched for ID: '${searchId}'`);
        if (!searchId) return;

        const foundIndex = this.entryIds.indexOf(searchId);

        if (foundIndex !== -1) {
            this.currentIndex = foundIndex;
            this._displayCurrentEntry();
        } else {
            alert(`Error: No glossary entry found with ID: ${searchId}`);
            this.searchInput.value = '';
        }
    }
}
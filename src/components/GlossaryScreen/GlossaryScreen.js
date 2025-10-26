/* src\components\GlossaryScreen\GlossaryScreen.js */
class GlossaryScreen {
    constructor(container, onGoBackToDashboard) {
        this.container = container;
        this.onGoBackToDashboard = onGoBackToDashboard; // This is the callback to App.js
        this.html = null;
        this.internalState = 'selection'; // 'selection' or 'viewer'
        
        // Properties for 'viewer' state
        this.glossaryData = null;
        this.entryIds = [];
        this.currentIndex = 0;
        this.currentGlossaryTitle = "";

        // DOM element cache
        this.selectionContainer = null;
        this.viewerContainer = null;
        this.glossaryListEl = null;

        console.log("DEBUG: [GlossaryScreen] constructor -> Component instantiated.");
    }

    async init() {
        console.log("DEBUG: [GlossaryScreen] init -> Initializing.");
        this.html = await ComponentLoader.loadHTML('/src/components/GlossaryScreen/glossary-screen.html');
        console.log("DEBUG: [GlossaryScreen] init -> HTML template loaded.");
    }

    // Main render method called by App.js
    render() {
        console.log(`DEBUG: [GlossaryScreen] render -> Rendering state: ${this.internalState}`);
        this.container.innerHTML = this.html;
        
        // Cache the main containers
        this.selectionContainer = this.container.querySelector('#glossary-selection-container');
        this.viewerContainer = this.container.querySelector('#glossary-viewer-container');

        if (this.internalState === 'selection') {
            this._renderSelectionScreen();
        } else if (this.internalState === 'viewer') {
            // This should technically be called by _handleGlossarySelected,
            // but we call it here to re-render if App.js triggers a render.
            this._renderViewerScreen(); 
        }
    }

    // --- SELECTION SCREEN LOGIC ---

    async _renderSelectionScreen() {
        console.log("DEBUG: [GlossaryScreen] _renderSelectionScreen -> Rendering selection list.");
        this.internalState = 'selection';
        this.selectionContainer.style.display = 'block';
        this.viewerContainer.style.display = 'none';

        this.glossaryListEl = this.container.querySelector('#glossary-list');
        this.container.querySelector('#glossary-back-btn').addEventListener('click', () => this.onGoBackToDashboard());

        const manifest = await GlossaryService.loadManifest();
        if (!manifest || manifest.length === 0) {
            this.glossaryListEl.innerHTML = `<p class="text-gray-400">No glossaries found.</p>`;
            return;
        }

        this.glossaryListEl.innerHTML = ''; // Clear list
        manifest.forEach(item => {
            const button = document.createElement('button');
            button.className = "w-full text-left p-6 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500";
            button.innerHTML = `
                <h2 class="text-xl font-bold text-indigo-400 mb-2">${item.title}</h2>
                <p class="text-gray-400">${item.description}</p>
            `;
            button.addEventListener('click', () => this._handleGlossarySelected(item.key, item.title));
            this.glossaryListEl.appendChild(button);
        });
    }

    async _handleGlossarySelected(glossaryKey, glossaryTitle) {
        console.log(`DEBUG: [GlossaryScreen] _handleGlossarySelected -> User selected: ${glossaryKey}`);
        
        // Load the specific glossary data
        await GlossaryService.loadGlossary(glossaryKey);
        this.glossaryData = GlossaryService.getCachedGlossary(glossaryKey);
        
        if (!this.glossaryData) {
            alert(`Error: Could not load glossary data for ${glossaryTitle}.`);
            return;
        }

        this.entryIds = Object.keys(this.glossaryData);
        this.currentIndex = 0;
        this.currentGlossaryTitle = glossaryTitle;
        this.internalState = 'viewer';
        
        this._renderViewerScreen();
    }


    // --- VIEWER SCREEN LOGIC ---

    _renderViewerScreen() {
        console.log("DEBUG: [GlossaryScreen] _renderViewerScreen -> Rendering viewer.");
        this.selectionContainer.style.display = 'none';
        this.viewerContainer.style.display = 'block';

        // Wire up viewer-specific elements
        this.container.querySelector('#glossary-viewer-main-title').textContent = this.currentGlossaryTitle;
        this.container.querySelector('#glossary-viewer-back-btn').addEventListener('click', () => this._renderSelectionScreen());

        this.titleEl = this.container.querySelector('#glossary-title');
        this.contentEl = this.container.querySelector('#glossary-content');
        this.navStatusEl = this.container.querySelector('#glossary-nav-status');
        this.prevBtn = this.container.querySelector('#glossary-prev-btn');
        this.nextBtn = this.container.querySelector('#glossary-next-btn');
        this.searchInput = this.container.querySelector('#glossary-search-input');
        
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
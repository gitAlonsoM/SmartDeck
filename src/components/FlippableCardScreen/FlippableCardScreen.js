/*src\components\FlippableCardScreen\FlippableCardScreen.js  */

// Component to render a flippable, self-assessed card for studying.
class FlippableCardScreen {
    constructor(container, onAssess, onEnd) {
        this.container = container;
        this.onAssess = onAssess; // Callback when user assesses themselves
        this.onEnd = onEnd;     // Callback when the round ends
        this.cardData = null;
        console.log("DEBUG: [FlippableCardScreen] constructor -> Component instantiated.");
    }

    async render(deckName, card, currentIndex, total) {
        console.log("DEBUG: [FlippableCardScreen] render -> Rendering card:", card);
        this.cardData = card;

        if (!this.container.innerHTML) {
            const html = await ComponentLoader.loadHTML('/src/components/FlippableCardScreen/flippable-card-screen.html');
            this.container.innerHTML = html;
        }

        document.getElementById('deck-title-flippable').textContent = deckName;
        document.getElementById('card-progress-indicator').textContent = `${currentIndex + 1} / ${total}`;
        
        this.populateCard();
        this.resetViewState();
        this.setupEventListeners();
    }

    populateCard() {
        document.getElementById('side-a-content').textContent = this.cardData.sideA;
        const sideBContainer = document.getElementById('side-b-content');
        sideBContainer.innerHTML = ''; // Clear previous content

        this.cardData.sideB.forEach(line => {
            const p = document.createElement('p');
            p.className = 'text-lg';
            p.textContent = `• ${line}`;
            sideBContainer.appendChild(p);
        });
    }

    setupEventListeners() {
        // Use .onclick to ensure we don't attach multiple listeners
        document.getElementById('flip-card-btn').onclick = () => this.flipCard();
        document.getElementById('knew-it-btn').onclick = () => this.onAssess(true);
        document.getElementById('review-again-btn').onclick = () => this.onAssess(false);
    }
    
    flipCard() {
        document.querySelector('.flip-card-inner').classList.add('is-flipped');
        document.getElementById('flip-card-btn').classList.add('hidden');
        document.getElementById('assessment-buttons').classList.remove('hidden');
    }

    resetViewState() {
        const cardInner = document.querySelector('.flip-card-inner');
        if (cardInner) cardInner.classList.remove('is-flipped');
        
        const flipBtn = document.getElementById('flip-card-btn');
        if (flipBtn) flipBtn.classList.remove('hidden');

        const assessBtns = document.getElementById('assessment-buttons');
        if (assessBtns) assessBtns.classList.add('hidden');
    }
}
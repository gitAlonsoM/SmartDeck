//src\components\MusicPlayer\MusicPlayerUI.js

class MusicPlayerUI {
    constructor(container, musicService) {
        this.container = container;
        this.musicService = musicService;
        this.listenersAttached = false; // Flag to prevent duplicate event listeners
    }

    async render() {
        const html = await ComponentLoader.loadHTML('/src/components/MusicPlayer/music-player.html');
      // Set the innerHTML first
        this.container.innerHTML = html;

        // Use requestAnimationFrame to ensure the DOM has updated
        requestAnimationFrame(() => {
            console.log("DEBUG: [MusicPlayerUI] render -> DOM updated, attempting to cache elements and setup listeners.");
            
            // Cache all necessary DOM elements NOW, after DOM update
            this.playPauseBtn = this.container.querySelector('#play-pause-btn'); 
            this.prevTrackBtn = this.container.querySelector('#prev-track-btn'); 
            this.nextTrackBtn = this.container.querySelector('#next-track-btn'); 
            this.trackNameEl = this.container.querySelector('#track-name');       
            // Removed this.discEl selection logic
            
            // Check if elements were found before proceeding
            // Removed !this.discEl check
            if (!this.playPauseBtn || !this.prevTrackBtn || !this.nextTrackBtn || !this.trackNameEl) {
                console.error("DEBUG: [MusicPlayerUI] render -> Failed to find one or more essential UI elements after DOM update.");
                return; // Stop if elements aren't found
            }

            // Attach event listeners only once
            if (!this.listenersAttached) {
                this._setupEventListeners();
            }

            // Always sync the UI with the service's current state on render
            this._syncUI();
        });
    }

    _setupEventListeners() {
        // Add checks to ensure elements exist before attaching listeners
        if (!this.playPauseBtn || !this.nextTrackBtn || !this.prevTrackBtn) {
            console.error("DEBUG: [MusicPlayerUI] _setupEventListeners -> Cannot attach listeners, button elements not found.");
            return;
        }
        console.log("DEBUG: [MusicPlayerUI] _setupEventListeners -> Attaching button listeners.");
        
        // Listen to clicks on the UI controls
        this.playPauseBtn.onclick = () => this.musicService.togglePlayPause();
        this.nextTrackBtn.onclick = () => this.musicService.playNext(false);
        this.prevTrackBtn.onclick = () => this.musicService.playPrevious();

        // Listen for 'update' events dispatched by the MusicService for real-time changes
        this.musicService.uiUpdater.addEventListener('update', (event) => {
            const { isPlaying, trackName } = event.detail;
            this.update(isPlaying, trackName);
        });
        
        this.listenersAttached = true;
    }

    // This new method fixes the UI state persistence bug
    _syncUI() {
        const state = this.musicService.getCurrentState();
        this.update(state.isPlaying, state.trackName);
    }
    
    update(isPlaying, trackName) {
        // Update Play/Pause icon
        const icon = this.playPauseBtn.querySelector('i');
        icon.classList.toggle('fa-play', !isPlaying);
        icon.classList.toggle('fa-pause', isPlaying);
        // Removed disc animation logic
        // this.discEl.classList.toggle('is-playing', isPlaying);

        // Update track name and marquee animation
        this.trackNameEl.textContent = trackName;
        this.trackNameEl.title = trackName;
        
        this.trackNameEl.classList.toggle('marquee', isPlaying);
        
        console.log(`VERIFY: [MusicPlayerUI] UI Updated. Playing: ${isPlaying}, Track: ${trackName}`);
    }
}
//src\components\MusicPlayer\MusicPlayerUI.js

class MusicPlayerUI {
    constructor(container, musicService) {
        this.container = container;
        this.musicService = musicService;
        this.listenersAttached = false; // Flag to prevent duplicate event listeners
    }

    async render() {
        const html = await ComponentLoader.loadHTML('/src/components/MusicPlayer/music-player.html');
        this.container.innerHTML = html;

        // Cache all necessary DOM elements
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.prevTrackBtn = document.getElementById('prev-track-btn');
        this.nextTrackBtn = document.getElementById('next-track-btn');
        this.trackNameEl = document.getElementById('track-name');
        this.discEl = document.getElementById('music-disc');

        // Attach event listeners only once
        if (!this.listenersAttached) {
            this._setupEventListeners();
        }

        // Always sync the UI with the service's current state on render
        this._syncUI();
    }

    _setupEventListeners() {
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

        // Update spinning disc animation
        this.discEl.classList.toggle('is-playing', isPlaying);

        // Update track name and marquee animation
        this.trackNameEl.textContent = trackName;
        this.trackNameEl.title = trackName;
        
        this.trackNameEl.classList.toggle('marquee', isPlaying);
    }
}
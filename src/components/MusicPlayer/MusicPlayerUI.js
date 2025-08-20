// src\components\MusicPlayer\MusicPlayerUI.js
// Manages the UI elements and event listeners for the music player.

class MusicPlayerUI {
    constructor(container, musicService) {
        this.container = container;
        this.musicService = musicService;
        this.isRendered = false;
    }

    async render() {
        if (this.isRendered) return; // Prevent re-rendering and re-attaching listeners

        const html = await ComponentLoader.loadHTML('/src/components/MusicPlayer/music-player.html');
        this.container.innerHTML = html;

        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.prevTrackBtn = document.getElementById('prev-track-btn');
        this.nextTrackBtn = document.getElementById('next-track-btn');
        this.trackNameEl = document.getElementById('track-name');

        this._setupEventListeners();
        this.isRendered = true;
    }

    _setupEventListeners() {
        // Listen to clicks on the UI
        this.playPauseBtn.onclick = () => this.musicService.togglePlayPause();
        this.nextTrackBtn.onclick = () => this.musicService.playNext(false);
        this.prevTrackBtn.onclick = () => this.musicService.playPrevious();

        // Listen for 'update' events from the MusicService
        this.musicService.uiUpdater.addEventListener('update', (event) => {
            const { isPlaying, trackName } = event.detail;
            this.update(isPlaying, trackName);
        });
    }

    update(isPlaying, trackName) {
        const icon = this.playPauseBtn.querySelector('i');
        icon.classList.toggle('fa-play', !isPlaying);
        icon.classList.toggle('fa-pause', isPlaying);

        this.trackNameEl.textContent = trackName;
        this.trackNameEl.title = trackName;
    }
}
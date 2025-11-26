// src/components/MusicPlayer/MusicPlayerUI.js

class MusicPlayerUI {
    constructor(container, musicService) {
        this.container = container;
        this.musicService = musicService;
        this.listenersAttached = false; 
    }

    async render() {
        const html = await ComponentLoader.loadHTML('/src/components/MusicPlayer/music-player.html');
        this.container.innerHTML = html;

        requestAnimationFrame(() => {
            console.log("DEBUG: [MusicPlayerUI] render -> DOM updated, caching elements.");
            
            this.playPauseBtn = this.container.querySelector('#play-pause-btn'); 
            this.prevTrackBtn = this.container.querySelector('#prev-track-btn'); 
            this.nextTrackBtn = this.container.querySelector('#next-track-btn'); 
            this.trackNameEl = this.container.querySelector('#track-name');  
            this.volumeSlider = this.container.querySelector('#volume-slider');

            if (!this.playPauseBtn || !this.prevTrackBtn || !this.nextTrackBtn || !this.trackNameEl) {
                console.error("DEBUG: [MusicPlayerUI] render -> Critical UI elements missing.");
                return; 
            }

            // Initialize Slider Value
            if (this.volumeSlider) {
                this.volumeSlider.value = this.musicService.userVolume * 100;
            }

            if (!this.listenersAttached) {
                this._setupEventListeners();
            }

            this._syncUI();
        });
    }

    _setupEventListeners() {
        if (!this.playPauseBtn) return;
        
        console.log("DEBUG: [MusicPlayerUI] _setupEventListeners -> Attaching listeners.");
        
        this.playPauseBtn.onclick = () => this.musicService.togglePlayPause();
        this.nextTrackBtn.onclick = () => this.musicService.playNext(false);
        this.prevTrackBtn.onclick = () => this.musicService.playPrevious();

        if (this.volumeSlider) {
            // Remove potential duplicates just in case
            this.volumeSlider.oninput = null;
            this.volumeSlider.oninput = (e) => {
                const val = e.target.value;
                this.musicService.setUserVolume(val / 100);
            };
        }

        this.musicService.uiUpdater.addEventListener('update', (event) => {
            const { isPlaying, trackName } = event.detail;
            this.update(isPlaying, trackName);
        });
        
        this.listenersAttached = true;
    }

    _syncUI() {
        const state = this.musicService.getCurrentState();
        this.update(state.isPlaying, state.trackName);
    }
    
    update(isPlaying, trackName) {
        // Update Play/Pause Icon
        const icon = this.playPauseBtn.querySelector('i');
        if (icon) {
            icon.className = isPlaying ? 'fas fa-pause fa-lg' : 'fas fa-play fa-lg pl-1';
        }

        // Update Track Name and Marquee
        if (this.trackNameEl) {
            this.trackNameEl.textContent = trackName;
            this.trackNameEl.title = trackName;
            
            if (isPlaying) {
                this.trackNameEl.classList.add('marquee');
                this.trackNameEl.classList.remove('truncate');
            } else {
                this.trackNameEl.classList.remove('marquee');
                this.trackNameEl.classList.add('truncate');
            }
        }
        
        // Sync slider visually if it wasn't the trigger
        if (this.volumeSlider && document.activeElement !== this.volumeSlider) {
             this.volumeSlider.value = this.musicService.userVolume * 100;
        }

        console.log(`VERIFY: [MusicPlayerUI] UI Updated. Playing: ${isPlaying}`);
    }
}
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

            // New Elements for Seek Bar
            this.seekSlider = this.container.querySelector('#seek-slider');
            this.currentTimeEl = this.container.querySelector('#current-time');
            this.totalDurationEl = this.container.querySelector('#total-duration');
            this.rewindBtn = this.container.querySelector('#rewind-btn');
            this.forwardBtn = this.container.querySelector('#forward-btn');

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

        // Seek Bar Listeners
        if (this.seekSlider) {
            this.seekSlider.oninput = (e) => {
                const val = e.target.value; 
                this.musicService.seekTo(val);
            };
        }

        // Time Jump Buttons
        if (this.rewindBtn) this.rewindBtn.onclick = () => this.musicService.skipTime(-10);
        if (this.forwardBtn) this.forwardBtn.onclick = () => this.musicService.skipTime(10);

        if (this.volumeSlider) {
            this.volumeSlider.oninput = null; // Clean previous
            this.volumeSlider.oninput = (e) => {
                const val = e.target.value;
                this.musicService.setUserVolume(val / 100);
            };
        }

        this.musicService.uiUpdater.addEventListener('update', (event) => {
            const { isPlaying, trackName, currentTime, duration } = event.detail;
            this.update(isPlaying, trackName, currentTime, duration);
        });
        
        this.listenersAttached = true;
    }

    _syncUI() {
        const state = this.musicService.getCurrentState();
        this.update(state.isPlaying, state.trackName, state.currentTime, state.duration);
    }
    
    update(isPlaying, trackName, currentTime = 0, duration = 0) {
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
        
        // Update Seek Slider & Time
        if (this.seekSlider && this.currentTimeEl && this.totalDurationEl) {
            // Only update slider value if user is NOT currently dragging it
            if (document.activeElement !== this.seekSlider) {
                this.seekSlider.max = duration || 100;
                this.seekSlider.value = currentTime || 0;
            }
            
            this.currentTimeEl.textContent = this._formatTime(currentTime);
            this.totalDurationEl.textContent = this._formatTime(duration);
        }

        // Sync volume slider visually if it wasn't the trigger
        if (this.volumeSlider && document.activeElement !== this.volumeSlider) {
             this.volumeSlider.value = this.musicService.userVolume * 100;
        }
    }

    _formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "00:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }
}
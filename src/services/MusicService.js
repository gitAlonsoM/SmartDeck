//src\services\MusicService.js
// Manages background music playback, playlist, and state persistence.

class MusicService {
    constructor() {
        this.audioElement = new Audio();
        this.playlist = [
            { name: "Chopin - Etude Op. 10 No. 3 (Tristesse)", src: "public/assets/audio/music/Chopin - Etude Op. 10 No. 3 (Tristesse).mp3" },
            { name: "Chopin - Fantaisie-Impromptu (Op. 66)", src: "public/assets/audio/music/Chopin - Fantaisie-Impromptu (Op. 66).mp3" },
            { name: "Chopin - Nocturne in C Sharp Minor", src: "public/assets/audio/music/Chopin - Nocturne in C Sharp Minor (No. 20).mp3" },
            { name: "Chopin - Nocturne in E Flat Major", src: "public/assets/audio/music/Chopin - Nocturne in E Flat Major (Op. 9 No. 2).mp3" },
            { name: "Chopin - Waltz in C Sharp Minor", src: "public/assets/audio/music/Chopin - Waltz in C Sharp Minor (Op. 64 No. 2) ..mp3" },
            { name: "Debussy - Clair de Lune", src: "public/assets/audio/music/Debussy - Clair de Lune.mp3" },
            { name: "Debussy - Rêverie", src: "public/assets/audio/music/Debussy - Rêverie.mp3" },
            { name: "Erik Satie - Gnossiennes 1-6", src: "public/assets/audio/music/Erik Satie - Gnossiennes 1-6 .mp3" },
            { name: "Liszt - Consolation No. 3", src: "public/assets/audio/music/Liszt - Consolation No. 3.mp3" },
            { name: "Liszt - Liebestraum No. 3", src: "public/assets/audio/music/Liszt - Liebestraum No. 3.mp3" },
            { name: "Liszt - Un Sospiro", src: "public/assets/audio/music/Liszt - Un Sospiro.mp3" },
            { name: "Mozart - Twinkle Twinkle Little Star", src: "public/assets/audio/music/Mozart - Twinkle Twinkle Little Star .mp3" },
            { name: "Ravel - Pavane for a Dead Princess", src: "public/assets/audio/music/Ravel - Pavane for a Dead Princess (Pavane pour une infante défunte).mp3" },
            { name: "Schubert - Serenade (arr. Liszt)", src: "public/assets/audio/music/Schubert - Serenade (arr. Liszt).mp3" },
            { name: "Tchaikovsky - Dance of the Sugar Plum Fairy", src: "public/assets/audio/music/Tchaikovsky - Dance of the Sugar Plum Fairy.mp3" },
            { name: "Tchaikovsky - Waltz of the Flowers", src: "public/assets/audio/music/Tchaikovsky - Waltz of the Flowers (The Nutcracker Suite).mp3" },
            { name: "Johann Sebastian Bach - Aria Da Capo", src: "public/assets/audio/music/Johann Sebastian Bach - Aria Da Capo.mp3" },
            { name: "Black Desert -Serendia - Alejandro Farm", src: "public/assets/audio/music/Black Desert -Serendia - Alejandro Farm.mp3" },
            { name: "Olvia  I. Balenos  Black Desert", src: "public/assets/audio/music/Olvia  I. Balenos  Black Desert.mp3" }

            
        ];
        // Start with a random track index instead of always 0
        this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
        this.isPlaying = false;
         // --- CONFIGURATION ---
        // Master volume for the music. Value from 0.0 (silent) to 1.0 (full volume).
        this.userVolume = 0.7; 

        this.isDucked = false; // To track if volume is lowered for ducking
        this.audioElement.volume = this.userVolume;

        // Event listener for when a track ends
        this.audioElement.onended = () => {
            console.log("DEBUG: [MusicService] Track ended, playing next random.");
            this.playNext(true); // Play next track randomly
        };

        // Custom event dispatcher for UI updates
        this.uiUpdater = new EventTarget();
    }

    /**
     * Gets the current state of the music player.
     * This is crucial for the UI to sync itself when it re-renders.
     * @returns {{isPlaying: boolean, trackName: string}} The current player state.
     */
    getCurrentState() {
        const track = this.playlist[this.currentTrackIndex];
        const hasTrackLoaded = !!this.audioElement.src;

        // If music is not playing and no track has ever been loaded, show the initial message.
        if (!this.isPlaying && !hasTrackLoaded) {
            return {
                isPlaying: false,
                trackName: "Select Play to Start"
            };
        }
        
        // Otherwise, return the current state.
        return {
            isPlaying: this.isPlaying,
            trackName: track ? track.name : "Loading..."
        };
    }
    
    // --- Public Control Methods ---

    play() {
        if (!this.audioElement.src) {
            this.setTrack(this.currentTrackIndex);
        }
        this.audioElement.play();
        this.isPlaying = true;
        this._updateUI();
    }

    pause() {
        this.audioElement.pause();
        this.isPlaying = false;
        this._updateUI();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    playNext(isRandom = false) {
        let nextIndex;
        if (isRandom) {
            // Simple random: just pick one that isn't the current one (if possible)
            if (this.playlist.length > 1) {
                do {
                    nextIndex = Math.floor(Math.random() * this.playlist.length);
                } while (nextIndex === this.currentTrackIndex);
            } else {
                nextIndex = 0;
            }
        } else {
            nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        }
        this.setTrack(nextIndex);
        this.play();
    }
    
    playPrevious() {
        const prevIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        this.setTrack(prevIndex);
        this.play();
    }

    setTrack(index) {
        this.currentTrackIndex = index;
        this.audioElement.src = this.playlist[index].src;
        console.log(`DEBUG: [MusicService] Set track to: ${this.playlist[index].name}`);
        this._updateUI();
    }

    // --- Audio Ducking Methods ---

    lowerVolume() {
        if (this.isDucked) return; // Already ducked
        console.log("DEBUG: [MusicService] Lowering volume for audio ducking.");
        this.isDucked = true;
       // --- CONFIGURATION ---
        // The target volume when ducking. 0.1 means the volume will become 10% of the userVolume.
        const duckingMultiplier = 0.3; 
        this._fadeVolume(duckingMultiplier * this.userVolume, 300); // Fade to the target percentage
    }

    restoreVolume() {
        if (!this.isDucked) return; // Not ducked, do nothing
        console.log("DEBUG: [MusicService] Restoring volume after audio ducking.");
        this.isDucked = false;
        this._fadeVolume(this.userVolume, 500); // Fade back to user's volume
    }

    // --- Private Helper Methods ---

    _updateUI() {
        // Dispatches an event that the UI component can listen to
        const detail = {
            isPlaying: this.isPlaying,
            trackName: this.playlist[this.currentTrackIndex].name
        };
        this.uiUpdater.dispatchEvent(new CustomEvent('update', { detail }));
    }

    _fadeVolume(targetVolume, duration) {
        const startVolume = this.audioElement.volume;
        const difference = targetVolume - startVolume;
        const stepTime = 10; // ms per step
        const steps = duration / stepTime;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newVolume = startVolume + (difference * (currentStep / steps));
            this.audioElement.volume = Math.max(0, Math.min(1, newVolume)); // Clamp volume between 0 and 1

            if (currentStep >= steps) {
                clearInterval(timer);
                this.audioElement.volume = targetVolume; // Ensure final value is exact
            }
        }, stepTime);
    }
}
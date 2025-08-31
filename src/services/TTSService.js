/* src\services\TTSService.js */
// Service to handle Text-to-Speech (TTS) functionality using the browser's Web Speech API.
class TTSService {
    static voices = [];
    static isInitialized = false;

    /**
     * Initializes the service by loading the available system voices.
     * This can be asynchronous, so it returns a promise.
     */
    static init() {
        return new Promise((resolve, reject) => {
            if (TTSService.isInitialized) {
                resolve();
                return;
            }

            const loadVoices = () => {
                TTSService.voices = window.speechSynthesis.getVoices();
                if (TTSService.voices.length > 0) {
                    TTSService.isInitialized = true;
                    console.log("DEBUG: [TTSService] Voices loaded successfully.", TTSService.voices);
                    resolve();
                }
            };

            // Voices are loaded asynchronously. We need to wait for the 'voiceschanged' event.
            window.speechSynthesis.onvoiceschanged = loadVoices;
            // Also call it directly in case the voices are already loaded.
            loadVoices();

            // Failsafe timeout
            setTimeout(() => {
                if (!TTSService.isInitialized) {
                    console.error("DEBUG: [TTSService] Failed to load voices in time.");
                    reject("TTS voices could not be loaded.");
                }
            }, 2000);
        });
    }

    /**
     * Gets all available voices filtered by the English language.
     * @returns {Array} An array of SpeechSynthesisVoice objects.
     */
    static getEnglishVoices() {
        if (!TTSService.isInitialized) {
            console.error("DEBUG: [TTSService] getEnglishVoices called before initialization.");
            return [];
        }
        return TTSService.voices.filter(voice => voice.lang.startsWith('en-'));
    }

    /**
     * Speaks a given text using a specified voice.
     * @param {string} text - The text to be spoken.
     * @param {string} [voiceName] - The name of the voice to use. If not provided, a default will be used.
     */

        static speak(text, voiceName, onStart, onEnd) {
             console.log(`DEBUG: [TTSService] speak() called. isInitialized: ${TTSService.isInitialized}`);
       if (!TTSService.isInitialized) {
            alert("Text-to-Speech service is not ready. Please try again.");
            // Ensure end callback is called on failure to prevent volume from getting stuck.
            if (typeof onEnd === 'function') onEnd();
        }

        // Cancel any currently speaking utterance to avoid overlap.
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        if (voiceName) {
            const selectedVoice = TTSService.voices.find(voice => voice.name === voiceName);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            } else {
                console.warn(`DEBUG: [TTSService] Voice '${voiceName}' not found. Using default.`);
            }
        }
        
        // --- AUDIO DUCKING INTEGRATION ---
        utterance.onstart = () => {
            console.log("DEBUG: [TTSService] Speech started.");
            if (typeof onStart === 'function') {
                onStart();
            }
        };

        utterance.onend = () => {
            console.log("DEBUG: [TTSService] Speech ended.");
            if (typeof onEnd === 'function') {
                onEnd();
            }
        };
        
       utterance.onerror = (event) => {
            // Do not log 'interrupted' as an error, it's an expected user action.
            if (event.error !== 'interrupted') {
                console.error("DEBUG: [TTSService] Speech synthesis error.", event);
            }
            
            // Ensure volume is restored even if speech fails or is interrupted.
            if (typeof onEnd === 'function') {
                onEnd(); 
            }
        };

        window.speechSynthesis.speak(utterance);
    }
}
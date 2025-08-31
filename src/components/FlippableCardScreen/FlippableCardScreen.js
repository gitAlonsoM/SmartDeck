// Component to render a flippable, self-assessed card for studying.
class FlippableCardScreen {
    constructor(container, onAssess, onEnd, onIgnore, onMarkForImprovement, onShowInfoModal, onCardAudioStart, onCardAudioEnd) {
        this.container = container;
        this.onAssess = onAssess;
        this.onEnd = onEnd;
        this.onIgnore = onIgnore;
        this.onMarkForImprovement = onMarkForImprovement;
        this.onShowInfoModal = onShowInfoModal;
        this.onCardAudioStart = onCardAudioStart;
        this.onCardAudioEnd = onCardAudioEnd;
        this.cardData = null;
        console.log("DEBUG: [FlippableCardScreen] constructor -> Component instantiated.");
    }

       async render(deckId, deckName, card, currentIndex, total, isMarkedForImprovement) {
        console.log("DEBUG: [FlippableCardScreen] render -> Rendering card:", card);
        this.cardData = card;
        this.deckId = deckId;

        if (!this.container.querySelector('.flip-card-container')) {
            const html = await ComponentLoader.loadHTML('/src/components/FlippableCardScreen/flippable-card-screen.html');
            this.container.innerHTML = html;
        }

        document.getElementById('card-progress-indicator').textContent = `${currentIndex + 1} / ${total}`;
        
        const markImproveBtn = document.getElementById('mark-improve-btn-flippable');
        if (markImproveBtn) {
            const flagIcon = markImproveBtn.querySelector('i');
            if (flagIcon) {
                flagIcon.classList.toggle('text-yellow-400', isMarkedForImprovement);
                flagIcon.classList.toggle('dark:text-yellow-400', isMarkedForImprovement);
                flagIcon.classList.toggle('text-gray-400', !isMarkedForImprovement);
                flagIcon.classList.toggle('dark:text-gray-500', !isMarkedForImprovement);
            }
        }

        this.populateCard();
        this.resetViewState();
        this.setupEventListeners();
    }

    populateCard() {
        const standardContent = document.getElementById('side-a-content');
        const singleAudioContent = document.getElementById('audio-content-container');
        const conversationContent = document.getElementById('conversation-content-container');

        standardContent.classList.add('hidden');
        singleAudioContent.classList.add('hidden');
        conversationContent.classList.add('hidden');

        const conversation = this.cardData.sideA?.conversation;

        if (conversation && Array.isArray(conversation)) {
            conversationContent.classList.remove('hidden');
            const wrapper = document.getElementById('conversation-player-wrapper');
            wrapper.innerHTML = '';
            conversation.forEach((part, index) => {
                const player = document.createElement('audio');
                player.id = `audio-part-${index}`;
                player.src = part.audioSrc;
                player.controls = true;
                player.className = 'w-full';
                wrapper.appendChild(player);
            });
            this._playConversation();
        } else if (this.cardData.audioSrc) {
            singleAudioContent.classList.remove('hidden');
            const wrapper = document.getElementById('audio-player-wrapper');
            wrapper.innerHTML = '';
            const player = document.createElement('audio');
            player.src = this.cardData.audioSrc;
            player.controls = true;
            player.className = 'w-full';
            wrapper.appendChild(player);
            player.play().catch(e => console.warn("Autoplay was prevented.", e.name));
        } else {
            standardContent.classList.remove('hidden');
            const textContainer = document.getElementById('side-a-text-content');
            const visualContainer = document.getElementById('visual-content-container');
            textContainer.innerHTML = '';
            visualContainer.innerHTML = '';
            let sideAData = typeof this.cardData.sideA === 'string' ? { text: this.cardData.sideA } : this.cardData.sideA;
            textContainer.appendChild(this._createTextLine(sideAData.text, true));
            if (sideAData.visualContent) {
                this._renderVisualContent(sideAData.visualContent, visualContainer);
            }
        }

        const sideAOnBackContainer = document.getElementById('side-a-content-on-back');
        const sideBContainer = document.getElementById('side-b-content');
        sideAOnBackContainer.innerHTML = '';
        sideBContainer.innerHTML = '';

        if (conversation && Array.isArray(conversation)) {
            conversation.forEach((part, index) => {
                sideBContainer.appendChild(this._createTextLine(part.text, false, index, part.audioSrc));
            });
        } else {
            if (!this.cardData.audioSrc) {
                let text = typeof this.cardData.sideA === 'string' ? this.cardData.sideA : this.cardData.sideA.text;
                sideAOnBackContainer.appendChild(this._createTextLine(text, true));
            }

            if (Array.isArray(this.cardData.sideB) && this.cardData.sideB.length > 0) {
                if (typeof this.cardData.sideB[0] === 'object' && this.cardData.sideB[0] !== null) {
                    this.cardData.sideB.forEach((item, index) => {
                        sideBContainer.appendChild(this._createTextLine(item.text, false, index, item.audioSrc));
                    });
                } else {
                    this.cardData.sideB.forEach((line, index) => {
                        const audioSrcForLine = (this.cardData.audioSrc && index === 0) ? this.cardData.audioSrc : null;
                        sideBContainer.appendChild(this._createTextLine(line, false, index, audioSrcForLine));
                    });
                }
            }
        }
        
        const noteContainer = document.getElementById('note-content-container');
        noteContainer.innerHTML = '';
        noteContainer.classList.add('hidden');

        if (this.cardData.note && this.cardData.note.trim() !== '') {
            const noteContent = this.cardData.note.split('\n\n').map(paragraph => {
                let formattedPara = paragraph.trim();
                if (formattedPara) {
                    console.log(`DEBUG: [FlippableCardScreen] Processing Note Paragraph: "${formattedPara}"`);
                    
                    // 1. PRIMERO procesar el patrón más específico: **[ID]** o **ID**
                    formattedPara = formattedPara.replace(/\*\*\[?(\d+)\]?\*\*/g, (match, termId) => {
                        console.log(`DEBUG: [FlippableCardScreen] Found Glossary Term ID: ${termId}`);
                        const glossary = GlossaryService.getCachedGlossary('english_rules');
                        if (glossary && glossary[termId]) {
                            const termTitle = glossary[termId].title;
                            console.log(`DEBUG: [FlippableCardScreen] Term found in glossary. Title: "${termTitle}"`);
                            const generatedHtml = `<a href="#" class="glossary-term font-bold text-green-400 hover:underline" data-term-key="${termId}">${termTitle}</a>`;
                            console.log(`DEBUG: [FlippableCardScreen] Generated HTML: ${generatedHtml}`);
                            return generatedHtml;
                        }
                        console.warn(`DEBUG: [FlippableCardScreen] Term ID ${termId} NOT FOUND in cached glossary.`);
                        return `<strong>[Rule ${termId} Not Found]</strong>`;
                    });

                    // 2. DESPUÉS procesar los patrones más generales
                    formattedPara = formattedPara.replace(/\[([^\]]+)\]/g, '<strong class="font-semibold text-indigo-400">$1</strong>');
                    formattedPara = formattedPara.replace(/~([^~]+)~/g, '<strong class="font-semibold text-yellow-400 dark:text-yellow-500">$1</strong>');
                    
                    return `<p class="text-sm text-gray-400 dark:text-gray-300 note-paragraph mb-2 last:mb-0">${formattedPara}</p>`;
                }
                return '';
            }).join('');
            
            if (noteContent) {
                noteContainer.innerHTML = noteContent;
                noteContainer.classList.remove('hidden');
            }
        }
    }

    _playConversation(index = 0) {
        const player = document.getElementById(`audio-part-${index}`);
        if (!player) return;

        const playNext = () => {
            player.onended = null; 
            this._playConversation(index + 1);
        };
        player.onended = playNext;
        player.play().catch(e => {
            console.warn(`Autoplay for part ${index} was prevented.`, e.message);
            player.onended = null;
        });
    }

    _renderVisualContent(content, container) {
        let element;
        switch (content.type) {
            case 'icon':
                element = document.createElement('i');
                element.className = `${content.value} text-6xl md:text-8xl text-indigo-400`;
                break;
            case 'ascii':
                element = document.createElement('pre');
                element.className = 'text-lg md:text-2xl text-gray-400';
                element.textContent = content.value;
                break;
            case 'code':
                element = document.createElement('pre');
                element.className = 'code-block';
                const codeElement = document.createElement('code');
                if (content.language) codeElement.className = `language-${content.language}`;
                codeElement.textContent = content.value;
                element.appendChild(codeElement);
                break;
        }
        if (element) container.appendChild(element);
    }

    _createTextLine(text, isSideA = false, index = -1, audioSrcOverride = null) {
       const lineDiv = document.createElement('div');
        lineDiv.className = 'flex items-center justify-between w-full gap-4';
        const textElement = document.createElement('p');
        textElement.textContent = text;
        textElement.className = isSideA ? 'text-lg md:text-xl font-semibold text-center flex-grow' : 'text-lg';
        
        const playButton = document.createElement('button');
        playButton.innerHTML = '<i class="fas fa-volume-up"></i>';
        playButton.dataset.index = index; // Add index to identify the button later
        playButton.dataset.textToSpeak = text;
        
        if (audioSrcOverride) {
            playButton.className = 'play-audio-src-btn text-indigo-400 hover:text-indigo-300';
            playButton.dataset.audioSrc = audioSrcOverride;
            playButton.title = "Play high-quality audio";
        } else {
            playButton.className = 'play-tts-btn text-gray-400 hover:text-indigo-500';
            playButton.title = "Play with device voice";
        }
        lineDiv.appendChild(textElement);
        lineDiv.appendChild(playButton);
        return lineDiv;
    }

   setupEventListeners() {
        document.getElementById('flip-card-btn').onclick = () => this.flipCard();
        document.getElementById('knew-it-btn').onclick = () => this.onAssess(true);
        document.getElementById('review-again-btn').onclick = () => this.onAssess(false);
        document.getElementById('ignore-btn-flippable').onclick = () => this.onIgnore();
        document.getElementById('mark-improve-btn-flippable').onclick = () => this.onMarkForImprovement(this.cardData.cardId);
        
        this.container.onclick = (event) => {
            const target = event.target;
            const ttsButton = target.closest('.play-tts-btn');
            const audioSrcButton = target.closest('.play-audio-src-btn');
            const glossaryTerm = target.closest('.glossary-term');

            if (glossaryTerm) {
                event.preventDefault();
                const termKey = glossaryTerm.dataset.termKey;
                if (termKey && this.onShowInfoModal) {
                    this.onShowInfoModal(termKey);
                }
                return;
            }

            if (audioSrcButton || ttsButton) {
                const button = audioSrcButton || ttsButton;
                const textForSpeech = button.dataset.textToSpeak;
                const answerIndex = button.dataset.index;
                console.log(`DEBUG: Audio button clicked. Index: ${answerIndex}, Text: "${textForSpeech}"`);

                let audioSrc = button.dataset.audioSrc;
                if (!audioSrc && this.deckId && this.cardData && answerIndex > -1) {
                    audioSrc = `public/data/audio/${this.deckId}/${this.cardData.cardId}_sideB_${answerIndex}.mp3`;
                }

                const playTTSFallback = () => {
                    const preferredVoice = StorageService.loadPreferredVoice();
                    TTSService.speak(textForSpeech, preferredVoice, this.onCardAudioStart, this.onCardAudioEnd);
                };

                if (audioSrc) {
                    console.log(`DEBUG: Checking for audio file at: ${audioSrc}`);
                    fetch(audioSrc, { method: 'HEAD' })
                        .then(response => {
                            if (response.ok) {
                                console.log("DEBUG: Audio file exists. Playing high-quality audio.");
                                this.onCardAudioStart();
                                const audio = new Audio(audioSrc);
                                audio.onended = () => this.onCardAudioEnd();
                                audio.onerror = () => this.onCardAudioEnd(); // Failsafe
                                audio.play();
                            } else {
                                console.log(`INFO: Audio file not found (status: ${response.status}). This is expected. Falling back to TTS.`);
                                playTTSFallback();
                            }
                        })
                        .catch(error => {
                            console.error("DEBUG: Network error during audio check. Falling back to TTS.", error);
                        });
                } else {
                    console.log("DEBUG: No audio source defined. Using TTS directly.");
                    playTTSFallback();
                }
            }
        };
    }
    
    flipCard() {
        document.getElementById('flippable-card-header').classList.add('invisible');
        document.querySelector('.flip-card-inner').classList.add('is-flipped');
        document.getElementById('flip-card-btn').classList.add('hidden');
        document.getElementById('assessment-buttons').classList.remove('hidden');
    }

    resetViewState() {
        document.getElementById('flippable-card-header').classList.remove('invisible');
        const cardInner = document.querySelector('.flip-card-inner');
        if (cardInner) cardInner.classList.remove('is-flipped');
        
        const flipBtn = document.getElementById('flip-card-btn');
        if (flipBtn) flipBtn.classList.remove('hidden');

        const assessBtns = document.getElementById('assessment-buttons');
        if (assessBtns) assessBtns.classList.add('hidden');
    }
}
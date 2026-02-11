class ProfileMusicPlayer {
    constructor() {
        this.currentAudio = null;
        this.currentMusicPath = null;
        this.audioCache = new Map();
        this.isMuted = false;
        this.anthem = null;
        this.isPlayingProfile = false;
        this.fadeOutDuration = 300; // ms
        this.fadeInDuration = 1500; // ms (1.5 seconds)
        this.init();

        window.profileMusicPlayer = this;
    }

    init() {

        this.anthem = new Audio('https://github.com/zoxycontin/rsc-bio/raw/refs/heads/main/assets/songs/anthem.mp3');
        this.anthem.loop = true;
        this.anthem.volume = 0.25;

        document.addEventListener('cardsGenerated', () => this.setupCardListeners());

        this.setupCardListeners();
    }

    setupCardListeners() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {

            if (card.hasAttribute('data-music-listener')) return;
            card.setAttribute('data-music-listener', 'true');
            
            const musicPath = card.dataset.music;
            if (musicPath) {

                this.preloadAudio(musicPath);

                card.addEventListener('mouseenter', () => {
                    this.playMusic(musicPath);
                });
            }
        });
    }

    preloadAudio(musicPath) {
        if (!this.audioCache.has(musicPath)) {
            const audio = new Audio(musicPath);
            audio.preload = 'auto';
            audio.volume = 0.25;
            audio.loop = true;
            this.audioCache.set(musicPath, audio);
        }
    }

    playMusic(musicPath) {
        if (this.isMuted) return;

        if (this.currentMusicPath === musicPath && this.currentAudio && !this.currentAudio.paused) {
            return;
        }

        if (this.currentAudio && !this.currentAudio.paused) {
            this.fadeOut(this.currentAudio);
        }

        if (this.anthem && !this.anthem.paused) {
            this.fadeOut(this.anthem);
        }
        
        const audio = this.audioCache.get(musicPath);
        if (audio) {
            this.currentAudio = audio;
            this.currentMusicPath = musicPath;
            this.isPlayingProfile = true;
            audio.currentTime = 0;

            audio.volume = 0;
            audio.play().catch(error => {
                console.log("Audio play failed:", error);
            });

            this.fadeIn(audio);

            this.updateNowPlaying(musicPath);
        }
    }

    stopMusic() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
            this.currentMusicPath = null;
            this.isPlayingProfile = false;
        }
    }

    fadeOut(audio) {
        const startVolume = audio.volume;
        const startTime = Date.now();
        
        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.fadeOutDuration, 1);
            audio.volume = startVolume * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            } else {
                audio.pause();
                audio.currentTime = 0;
                audio.volume = startVolume; // Reset volume for next play
            }
        };
        
        fade();
    }

    fadeIn(audio) {
        const targetVolume = 0.25;
        const startTime = Date.now();
        
        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.fadeInDuration, 1);
            audio.volume = targetVolume * progress;
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            }
        };
        
        fade();
    }

    returnToAnthem() {
        if (this.isMuted) return;

        if (this.currentAudio && !this.currentAudio.paused) {
            this.fadeOut(this.currentAudio);
        }
        
        if (this.anthem) {
            this.currentAudio = null;
            this.currentMusicPath = null;
            this.isPlayingProfile = false;
            this.anthem.currentTime = 0;
            this.anthem.volume = 0;
            this.anthem.play().catch(error => {
                console.log("Anthem play failed:", error);
            });

            this.fadeIn(this.anthem);
            this.updateNowPlaying('anthem');
        }
    }
    
    updateNowPlaying(musicPath) {
        const npTrack = document.querySelector('.np-track');
        if (npTrack) {
            if (musicPath === 'anthem') {
                npTrack.textContent = 'RSC Anthem';
            } else {

                const trackName = musicPath.split('/').pop().replace('.mp3', '').replace('-theme', '');
                npTrack.textContent = trackName.charAt(0).toUpperCase() + trackName.slice(1) + "'s Theme";
            }
        }
    }
    
    setMuted(muted) {
        this.isMuted = muted;
        if (muted) {
            this.stopMusic();
            if (this.anthem) {
                this.anthem.pause();
            }
        }
    }

    initAnthem() {
        if (!this.isMuted && this.anthem && !this.isPlayingProfile) {
            this.anthem.play().catch(error => {
                console.log("Anthem autoplay failed:", error);
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.profileMusicPlayer = new ProfileMusicPlayer();
});

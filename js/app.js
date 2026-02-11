



class RSCApp {
    constructor() {
        this.currentSection = 'about';
        this.isAudioInitialized = false;
        this.isMuted = false;
        this.currentVolume = 25;
        this.theme = localStorage.getItem('rsc-theme') || 'dark';

        this.init();
    }

    init() {
        this.setupTheme();
        this.setupNavigation();
        this.setupAudioControls();
        this.setupSearch();
        this.setupBackToTop();
        this.setupAnimations();
        this.setupAudioVisualizer();
        this.setupLiveStats();

        document.addEventListener('click', () => this.initAudio(), { once: true });

        document.addEventListener('cardsGenerated', () => {
            this.setupAnimations();
        });
    }

    async setupLiveStats() {
        const membersStat = this.getStatCardByLabel('members');
        const visitsStat = this.getStatCardByLabel('site visits');
        if (!membersStat || !visitsStat) return;

        try {
            const [memberCount, visitCount] = await Promise.all([
                this.fetchDiscordMemberCount(),
                this.fetchSiteVisitCount()
            ]);

            if (memberCount != null) {
                membersStat.setAttribute('data-target', String(memberCount));
                if (document.getElementById('about').classList.contains('active')) {
                    this.animateStats([membersStat]);
                }
            }
            if (visitCount != null) {
                visitsStat.setAttribute('data-target', String(visitCount));
                if (document.getElementById('about').classList.contains('active')) {
                    this.animateStats([visitsStat]);
                }
            }
        } catch (_) {

        }
    }

    getStatCardByLabel(labelText) {
        const cards = document.querySelectorAll('#about .stat-card');
        for (const card of cards) {
            const label = card.querySelector('.stat-label');
            if (label && label.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
                return card.querySelector('.stat-number');
            }
        }
        return null;
    }

    
    async fetchDiscordMemberCount() {
        let inviteUrl = 'https://discord.com/api/v10/invites/442jszx9ae?with_counts=true';
        if (window.configLoader && window.configLoader.loaded) {
            const discord = window.configLoader.config?.config?.discord;
            if (discord && typeof discord === 'string') {
                const match = discord.match(/discord\.gg\/([a-zA-Z0-9]+)/) || discord.match(/invite\/([a-zA-Z0-9]+)/);
                if (match) inviteUrl = `https://discord.com/api/v10/invites/${match[1]}?with_counts=true`;
            }
        }
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(inviteUrl);
        const res = await fetch(proxyUrl);
        if (!res.ok) return null;
        const data = await res.json();
        return data.approximate_member_count ?? null;
    }

    
    async fetchSiteVisitCount() {
        const storageKey = 'rsc-site-visits';
        const sessionKey = 'rsc-visit-counted';

        let visits = parseInt(localStorage.getItem(storageKey)) || 0;

        if (!sessionStorage.getItem(sessionKey)) {
            visits++;
            localStorage.setItem(storageKey, String(visits));
            sessionStorage.setItem(sessionKey, 'true');
        }

        return visits;
    }

    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');

        if (!themeToggle) return;
        
        const sunIcon = themeToggle.querySelector('.sun-icon');
        const moonIcon = themeToggle.querySelector('.moon-icon');
        
        if (!sunIcon || !moonIcon) return;

        if (this.theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }

        themeToggle.addEventListener('click', () => {
            this.theme = this.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('rsc-theme', this.theme);

            if (this.theme === 'light') {
                document.documentElement.setAttribute('data-theme', 'light');
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                document.documentElement.removeAttribute('data-theme');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
        });
    }

    setupNavigation() {
        const sections = document.querySelectorAll('.content-section');
        const navLinks = document.querySelectorAll('.nav-link');

        window.showSection = (sectionId) => {
            sections.forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
                this.currentSection = sectionId;

                navLinks.forEach(link => {
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.style.color = 'var(--primary)';
                    } else if (!link.getAttribute('href').startsWith('http')) {
                        link.style.color = 'var(--text-secondary)';
                    }
                });

                if (sectionId === 'about') {
                    this.animateStats();
                }
            }
        };

        showSection('about');
    }

    animateStats(onlyTheseStats = null) {
        const statNumbers = onlyTheseStats || document.querySelectorAll('.stat-number');
        const list = Array.isArray(onlyTheseStats) ? onlyTheseStats : [...statNumbers];

        list.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'), 10);
            if (isNaN(target)) return;
            const start = parseInt(stat.textContent.replace(/\D/g, ''), 10) || 0;
            const duration = 2000;
            const steps = 60;
            const diff = target - start;
            const increment = diff / steps;
            let current = start;

            const timer = setInterval(() => {
                current += increment;
                if ((increment >= 0 && current >= target) || (increment < 0 && current <= target)) {
                    stat.textContent = target.toLocaleString();
                    clearInterval(timer);
                } else {
                    stat.textContent = Math.floor(current).toLocaleString();
                }
            }, duration / steps);
        });
    }

    setupAudioControls() {
        const muteBtn = document.getElementById('muteBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.querySelector('.volume-value');

        muteBtn.addEventListener('click', () => {
            this.isMuted = !this.isMuted;

            if (this.isMuted) {
                muteBtn.classList.add('muted');
                if (window.profileMusicPlayer) {
                    window.profileMusicPlayer.setMuted(true);
                }
            } else {
                muteBtn.classList.remove('muted');
                if (window.profileMusicPlayer) {
                    window.profileMusicPlayer.setMuted(false);
                    window.profileMusicPlayer.initAnthem();
                }
            }
        });

        volumeSlider.addEventListener('input', (e) => {
            this.currentVolume = parseInt(e.target.value);
            volumeValue.textContent = `${this.currentVolume}%`;

            if (window.profileMusicPlayer) {
                const volume = this.currentVolume / 100;
                if (window.profileMusicPlayer.anthem) {
                    window.profileMusicPlayer.anthem.volume = volume;
                }
                if (window.profileMusicPlayer.currentAudio) {
                    window.profileMusicPlayer.currentAudio.volume = volume;
                }

                window.profileMusicPlayer.audioCache.forEach(audio => {
                    audio.volume = volume;
                });
            }
        });
    }

    initAudio() {
        if (!this.isAudioInitialized && !this.isMuted) {

            if (window.profileMusicPlayer) {
                window.profileMusicPlayer.initAnthem();
            }
            this.isAudioInitialized = true;
        }
    }

    setupSearch() {
        const searchInput = document.getElementById('memberSearch');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('#membersContainer .card');

            cards.forEach(card => {
                const nameTag = card.querySelector('.name-tag h2');
                const memberName = nameTag ? nameTag.textContent.toLowerCase() : '';

                if (memberName.includes(searchTerm)) {
                    card.style.display = '';
                    card.style.animation = 'cardAppear 0.6s ease-out';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    setupBackToTop() {
        const backToTop = document.getElementById('backToTop');

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });

        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    setupAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            observer.observe(card);
        });
    }

    setupAudioVisualizer() {
        const canvas = document.getElementById('audioVisualizer');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = 150;

        let bars = [];
        const barCount = 50;

        for (let i = 0; i < barCount; i++) {
            bars.push({
                x: (canvas.width / barCount) * i,
                height: Math.random() * 50 + 20,
                velocity: Math.random() * 2 - 1
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            bars.forEach((bar, i) => {
                bar.height += bar.velocity;

                if (bar.height > 100 || bar.height < 10) {
                    bar.velocity *= -1;
                }

                const gradient = ctx.createLinearGradient(0, canvas.height - bar.height, 0, canvas.height);
                gradient.addColorStop(0, 'rgba(84, 179, 214, 0.8)');
                gradient.addColorStop(1, 'rgba(199, 125, 255, 0.8)');

                ctx.fillStyle = gradient;
                ctx.fillRect(bar.x, canvas.height - bar.height, canvas.width / barCount - 2, bar.height);
            });

            requestAnimationFrame(animate);
        };

        animate();

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            bars = bars.map((bar, i) => ({
                ...bar,
                x: (canvas.width / barCount) * i
            }));
        });
    }


    selectRandomMember() {
        const cards = Array.from(document.querySelectorAll('#membersContainer .card[data-member]'));
        if (cards.length === 0) return;

        const card = cards[Math.floor(Math.random() * cards.length)];

        if (window.cardClickHandler && typeof window.cardClickHandler.expandCard === 'function') {
            window.cardClickHandler.expandCard(card);
            return;
        }

        card.click();
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new RSCApp();

    window.selectRandomMember = () => app.selectRandomMember();
});

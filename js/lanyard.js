

class LanyardIntegration {
    constructor() {
        this.websockets = new Map();
        this.userStates = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 5;
        this.retryDelay = 3000;

        this.discordIds = {};
        
        this.init();
    }

    async init() {

        if (window.configLoader) {
            await window.configLoader.load();
            this.discordIds = window.configLoader.getAllDiscordIds();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.waitForCards());
        } else {
            this.waitForCards();
        }
    }

    waitForCards() {

        document.addEventListener('cardsGenerated', () => this.setupLanyard());

        const cards = document.querySelectorAll('.card[data-member]');
        if (cards.length > 0) {
            this.setupLanyard();
        }
    }

    setupLanyard() {

        const cards = document.querySelectorAll('.card[data-member]');
        
        cards.forEach(card => {
            const memberName = card.getAttribute('data-member');
            const discordId = this.discordIds[memberName];
            
            if (discordId) {

                this.addStatusIndicator(card);

                this.connectToLanyard(memberName, discordId);
            }
        });
    }

    addStatusIndicator(card) {

        if (card.querySelector('.status-indicator')) return;

        const profileImg = card.querySelector('.profile-img');
        if (!profileImg) return;

        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-indicator';
        statusIndicator.setAttribute('data-status', 'offline');

        let imgContainer = profileImg.parentElement;
        if (!imgContainer.classList.contains('profile-img-container')) {
            imgContainer = document.createElement('div');
            imgContainer.className = 'profile-img-container';
            profileImg.parentNode.insertBefore(imgContainer, profileImg);
            imgContainer.appendChild(profileImg);
        }
        
        imgContainer.appendChild(statusIndicator);
    }

    connectToLanyard(memberName, discordId) {
        const ws = new WebSocket('wss://api.lanyard.rest/socket');
        this.websockets.set(memberName, ws);

        ws.onopen = () => {
            console.log(`[Lanyard] Connected for ${memberName}`);
            this.retryAttempts.set(memberName, 0);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.op) {
                case 1: // Hello

                    ws.send(JSON.stringify({
                        op: 2,
                        d: {
                            subscribe_to_id: discordId
                        }
                    }));

                    const heartbeatInterval = data.d.heartbeat_interval;
                    setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ op: 3 }));
                        }
                    }, heartbeatInterval);
                    break;
                    
                case 0: // Event
                    if (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE') {
                        this.updateUserPresence(memberName, data.d);
                    }
                    break;
            }
        };

        ws.onerror = (error) => {
            console.error(`[Lanyard] Error for ${memberName}:`, error);
        };

        ws.onclose = () => {
            console.log(`[Lanyard] Disconnected for ${memberName}`);
            this.handleReconnect(memberName, discordId);
        };
    }

    handleReconnect(memberName, discordId) {
        const attempts = this.retryAttempts.get(memberName) || 0;
        
        if (attempts < this.maxRetries) {
            this.retryAttempts.set(memberName, attempts + 1);
            console.log(`[Lanyard] Reconnecting for ${memberName} (attempt ${attempts + 1}/${this.maxRetries})`);
            
            setTimeout(() => {
                this.connectToLanyard(memberName, discordId);
            }, this.retryDelay);
        } else {
            console.error(`[Lanyard] Max retries reached for ${memberName}`);
        }
    }

    updateUserPresence(memberName, presenceData) {
        this.userStates.set(memberName, presenceData);

        const status = presenceData.discord_status || 'offline';
        const activities = presenceData.activities || [];

        this.updateCardStatus(memberName, status, activities);
    }

    updateCardStatus(memberName, status, activities) {

        const card = document.querySelector(`.card[data-member="${memberName}"]`);
        if (card) {
            const indicator = card.querySelector('.status-indicator');
            if (indicator) {
                indicator.setAttribute('data-status', status);

                let tooltip = this.getActivityTooltip(status, activities);
                indicator.setAttribute('title', tooltip);
            }
        }

        const expandedCard = document.querySelector('.card-expanded');
        if (expandedCard) {
            const expandedMember = expandedCard.getAttribute('data-member');
            if (expandedMember === memberName) {

                const expandedIndicator = expandedCard.querySelector('.status-indicator');
                if (expandedIndicator) {
                    expandedIndicator.setAttribute('data-status', status);
                    const tooltip = this.getActivityTooltip(status, activities);
                    expandedIndicator.setAttribute('title', tooltip);
                }

                document.dispatchEvent(new CustomEvent('lanyardPresenceUpdate', { detail: { memberName } }));
            }
        }
    }

    getActivityTooltip(status, activities) {
        const statusText = {
            'online': 'Online',
            'idle': 'Idle',
            'dnd': 'Do Not Disturb',
            'offline': 'Offline'
        };
        
        let tooltip = statusText[status] || 'Unknown';

        if (activities && activities.length > 0) {
            const activity = activities[0];
            if (activity.name) {
                tooltip += ` - ${activity.name}`;
                if (activity.details) {
                    tooltip += `: ${activity.details}`;
                }
            }
        }
        
        return tooltip;
    }

    getUserState(memberName) {
        return this.userStates.get(memberName);
    }

    destroy() {
        this.websockets.forEach((ws, memberName) => {
            ws.close();
        });
        this.websockets.clear();
        this.userStates.clear();
    }
}

let lanyardIntegration;
document.addEventListener('DOMContentLoaded', () => {
    lanyardIntegration = new LanyardIntegration();
    window.lanyardIntegration = lanyardIntegration;
});

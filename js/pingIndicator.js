// Ping indicator component
class PingIndicator {
    constructor() {
        this.createElements();
        this.initializeEvents();
		this.startMonitoring();
    }

    createElements() {
        // Create the ping indicator element if it doesn't exist
        if (!document.querySelector('.ping-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'ping-indicator offline';
            indicator.innerHTML = `
                <i class="fas fa-wifi"></i>
                <span id="pingValue">--</span><small>ms</small>
            `;
            document.body.appendChild(indicator);
        }

        this.pingIndicator = document.querySelector('.ping-indicator');
        this.pingValue = document.getElementById('pingValue');

		// Create offline overlay if it doesn't exist
		if (!document.querySelector('.offline-overlay')) {
			const overlay = document.createElement('div');
			overlay.className = 'offline-overlay';
			overlay.innerHTML = `
				<div class="offline-card">
					<div class="offline-art"></div>
					<div class="offline-title">You're offline</div>
					<p class="offline-subtitle">Please check your internet connection.</p>
					<button type="button" class="retry-btn" id="retry-connection-btn">Try again</button>
					<div class="retry-hint">We'll reconnect automatically when you're back online.</div>
				</div>
			`;
			document.body.appendChild(overlay);
		}

		this.offlineOverlay = document.querySelector('.offline-overlay');
		this.retryButton = document.getElementById('retry-connection-btn');
		this.offlineArt = document.querySelector('.offline-art');

		// Inject art: prefer local .lottie if present via Lottie player, else fallback to GIF
		this.injectOfflineArt();
    }

	injectOfflineArt() {
		const videoSrc = window.NO_INTERNET_VIDEO_SRC; // optional mp4
		const lottieSrc = window.NO_INTERNET_LOTTIE_SRC || 'assets/no-internet.lottie';
		// Start with text fallback
		this.showTextFallback();

		// Prefer video if provided
		if (videoSrc && /\.(mp4|webm|ogg)($|\?)/i.test(videoSrc)) {
			const video = document.createElement('video');
			video.className = 'offline-video';
			video.src = videoSrc;
			video.autoplay = true;
			video.loop = true;
			video.muted = true;
			video.playsInline = true;
			video.addEventListener('canplay', () => {
				this.offlineArt.innerHTML = '';
				this.offlineArt.appendChild(video);
			});
			video.addEventListener('error', () => {
				this.showTextFallback();
			});
			return;
		}

		// Else try .lottie
		if (lottieSrc && /\.lottie($|\?)/i.test(lottieSrc)) {
			this.ensureLottiePlayerLoaded().then(() => {
				const player = document.createElement('lottie-player');
				player.setAttribute('src', lottieSrc);
				player.setAttribute('background', 'transparent');
				player.setAttribute('speed', '1');
				player.setAttribute('loop', '');
				player.setAttribute('autoplay', '');
				player.style.width = '220px';
				player.style.height = '220px';
				this.offlineArt.innerHTML = '';
				this.offlineArt.appendChild(player);
			}).catch(() => {
				this.showTextFallback();
			});
		}
	}

	showTextFallback() {
		this.offlineArt.innerHTML = '';
		const text = document.createElement('div');
		text.className = 'offline-text';
		text.textContent = "You're offline. We'll reconnect when internet returns.";
		this.offlineArt.appendChild(text);
	}

	ensureLottiePlayerLoaded() {
		return new Promise((resolve, reject) => {
			if (customElements && customElements.get && customElements.get('lottie-player')) {
				resolve();
				return;
			}
			const existing = document.querySelector('script[data-lottie-player]');
			if (existing) {
				existing.addEventListener('load', () => resolve());
				existing.addEventListener('error', () => reject());
				return;
			}
			const script = document.createElement('script');
			script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
			script.async = true;
			script.setAttribute('data-lottie-player', '');
			script.addEventListener('load', () => resolve());
			script.addEventListener('error', () => reject());
			document.head.appendChild(script);
		});
	}

    async measurePing() {
		if (!navigator.onLine) {
			this.updateStatus('--', 'offline');
			this.showOfflineOverlay();
			return;
		}

        try {
            const start = performance.now();
            const response = await fetch('https://www.google.com/favicon.ico', { 
                cache: 'no-store',
                mode: 'no-cors'
            });
            const end = performance.now();
            const ping = Math.round(end - start);
            
			this.updateStatus(ping, ping <= 100 ? 'good' : 'poor');
			this.hideOfflineOverlay();
        } catch (error) {
			this.updateStatus('--', 'offline');
			this.showOfflineOverlay();
        }
    }

    updateStatus(value, status) {
        this.pingValue.textContent = value;
        this.pingIndicator.className = `ping-indicator ${status}`;
    }

    initializeEvents() {
		window.addEventListener('online', () => {
			this.hideOfflineOverlay();
			this.measurePing();
		});
		window.addEventListener('offline', () => {
			this.updateStatus('--', 'offline');
			this.showOfflineOverlay();
		});

		if (this.retryButton) {
			this.retryButton.addEventListener('click', () => {
				// Re-measure connectivity quickly
				this.measurePing();
			});
		}
    }

    startMonitoring() {
		// Show overlay immediately if currently offline
		if (!navigator.onLine) {
			this.updateStatus('--', 'offline');
			this.showOfflineOverlay();
		} else {
			this.hideOfflineOverlay();
		}

		this.measurePing();
		setInterval(() => this.measurePing(), 3000);
    }

	showOfflineOverlay() {
		if (this.offlineOverlay) {
			this.offlineOverlay.classList.add('show');
		}
	}

	hideOfflineOverlay() {
		if (this.offlineOverlay) {
			this.offlineOverlay.classList.remove('show');
		}
	}
}

// Initialize the ping indicator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PingIndicator();
});
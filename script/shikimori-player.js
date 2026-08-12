// ============================================
// SHIKIMORI ПЛЕЕР ДЛЯ ONIKAANIME
// ============================================

class ShikimoriPlayer {
    constructor(container, options = {}) {
        this.container = container;
        this.animeId = options.animeId || null;
        this.episode = options.episode || 1;
        this.title = options.title || 'Аниме';
        this.totalEpisodes = options.totalEpisodes || 0;
        this.onEpisodeEnd = options.onEpisodeEnd || null;
        this.volume = options.volume || 1;
        this.speed = options.speed || 1;
        
        this.videoUrl = null;
        this.isPlaying = false;
        this.video = null;
        this.qualities = {};
        this.currentQuality = '720p';
        
        this.init();
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    init() {
        this.container.innerHTML = '';
        this.container.classList.add('onika-player-container');
        
        this.container.innerHTML = `
            <div class="onika-player">
                <div class="onika-player-video-wrapper">
                    <video class="onika-player-video" preload="metadata" playsinline></video>
                    <div class="onika-player-loading" style="display:flex;">
                        <div class="onika-loader"></div>
                        <span>Поиск видео через Shikimori...</span>
                    </div>
                    <div class="onika-player-error" style="display:none;">
                        <span class="onika-error-icon">🎬</span>
                        <span class="onika-error-text">Не удалось загрузить видео</span>
                        <button class="onika-error-retry">🔄 Попробовать снова</button>
                    </div>
                </div>
                <div class="onika-player-controls">
                    <div class="onika-player-progress">
                        <div class="onika-player-progress-bar">
                            <div class="onika-player-progress-fill" style="width:0%"></div>
                            <div class="onika-player-progress-buffer" style="width:0%"></div>
                            <div class="onika-player-progress-thumb"></div>
                        </div>
                        <span class="onika-player-time-current">00:00</span>
                        <span class="onika-player-time-total">00:00</span>
                    </div>
                    <div class="onika-player-buttons">
                        <button class="onika-player-btn onika-player-btn-play" title="Воспроизвести/Пауза">
                            <svg width="20" height="20" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>
                        </button>
                        <button class="onika-player-btn onika-player-btn-prev" title="Предыдущая серия">
                            <svg width="20" height="20" viewBox="0 0 24 24"><polygon points="19,3 19,21 5,12" fill="currentColor"/></svg>
                        </button>
                        <button class="onika-player-btn onika-player-btn-next" title="Следующая серия">
                            <svg width="20" height="20" viewBox="0 0 24 24"><polygon points="5,3 5,21 19,12" fill="currentColor"/></svg>
                        </button>
                        <span class="onika-player-episode-info">${this.title} • Серия ${this.episode}</span>
                        <div class="onika-player-right-controls">
                            <button class="onika-player-btn onika-player-btn-speed" title="Скорость">1x</button>
                            <button class="onika-player-btn onika-player-btn-quality" title="Качество">720p</button>
                            <button class="onika-player-btn onika-player-btn-volume" title="Громкость">
                                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M3,9H7L12,4V20L7,15H3V9Z M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.03C15.5,15.29 16.5,13.77 16.5,12Z" fill="currentColor"/></svg>
                            </button>
                            <button class="onika-player-btn onika-player-btn-fullscreen" title="Полный экран">
                                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M7,14H5V19H10V17H7V14M5,10H7V7H10V5H5V10M17,17H14V19H19V14H17V17M14,5V7H17V10H19V5H14Z" fill="currentColor"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.video = this.container.querySelector('.onika-player-video');
        this.loadingEl = this.container.querySelector('.onika-player-loading');
        this.errorEl = this.container.querySelector('.onika-player-error');
        
        this.bindEvents();
        this.showLoading();
    }

    // ===== ПРИВЯЗКА СОБЫТИЙ =====
    bindEvents() {
        const video = this.video;
        const container = this.container;
        
        container.querySelector('.onika-player-btn-play').addEventListener('click', () => this.togglePlay());
        container.querySelector('.onika-player-btn-prev').addEventListener('click', () => this.prevEpisode());
        container.querySelector('.onika-player-btn-next').addEventListener('click', () => this.nextEpisode());
        container.querySelector('.onika-player-btn-speed').addEventListener('click', () => this.toggleSpeed());
        container.querySelector('.onika-player-btn-quality').addEventListener('click', () => this.toggleQuality());
        container.querySelector('.onika-player-btn-volume').addEventListener('click', () => this.toggleMute());
        container.querySelector('.onika-player-btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());
        
        const progress = container.querySelector('.onika-player-progress-bar');
        progress.addEventListener('click', (e) => this.seek(e));
        progress.addEventListener('mousemove', (e) => this.updateThumbPosition(e));
        
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault();
                this.togglePlay();
            }
            if (e.key === 'ArrowRight') this.seekRelative(10);
            if (e.key === 'ArrowLeft') this.seekRelative(-10);
            if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
            if (e.key === 'm' || e.key === 'M') this.toggleMute();
        });
        
        video.addEventListener('timeupdate', () => this.updateProgress());
        video.addEventListener('loadedmetadata', () => this.onLoaded());
        video.addEventListener('canplay', () => this.hideLoading());
        video.addEventListener('error', () => this.showError('Ошибка загрузки видео'));
        video.addEventListener('ended', () => this.onEnded());
        video.addEventListener('waiting', () => this.showLoading());
        video.addEventListener('playing', () => this.hideLoading());
        video.addEventListener('volumechange', () => this.updateVolumeIcon());
        
        container.querySelector('.onika-error-retry').addEventListener('click', () => {
            this.hideError();
            this.loadVideo();
        });
    }

    // ===== ЗАГРУЗКА ВИДЕО ЧЕРЕЗ SHIKIMORI =====
    async loadFromShikimori(animeId, episode = 1) {
        this.animeId = animeId;
        this.episode = episode;
        this.showLoading();
        this.hideError();
        
        try {
            // Получаем данные с Shikimori
            const response = await fetch(`https://shikimori.one/api/animes/${animeId}`);
            if (!response.ok) {
                throw new Error('Shikimori API не отвечает');
            }
            
            const data = await response.json();
            this.title = data.russian || data.name || 'Аниме';
            this.totalEpisodes = data.episodes || 0;
            
            // Получаем ссылку на видео через Kodik API (который использует Shikimori)
            const videoUrl = await this.getVideoFromShikimori(animeId, episode);
            
            if (videoUrl) {
                this.videoUrl = videoUrl;
                this.updateEpisodeInfo();
                await this.loadVideo();
            } else {
                throw new Error('Видео не найдено');
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки из Shikimori:', error);
            // Пробуем через Kodik напрямую
            try {
                await this.loadFromKodik(animeId, episode);
            } catch (e) {
                this.showError(error.message || 'Не удалось загрузить видео');
            }
        }
    }

    // ===== ПОЛУЧЕНИЕ ВИДЕО ЧЕРЕЗ SHIKIMORI =====
    async getVideoFromShikimori(animeId, episode) {
        // Shikimori не даёт прямых ссылок на видео,
        // но мы можем использовать внешние плееры
        
        // Вариант 1: через Kodik
        try {
            // Получаем название аниме
            const response = await fetch(`https://shikimori.one/api/animes/${animeId}`);
            const data = await response.json();
            const title = data.russian || data.name || '';
            
            if (title) {
                // Ищем в Kodik
                const kodikUrl = await this.searchKodik(title, episode);
                if (kodikUrl) return kodikUrl;
            }
        } catch (e) {
            console.log('Kodik через Shikimori не работает');
        }
        
        // Вариант 2: через Anilibria (поиск по названию)
        try {
            const response = await fetch(`https://shikimori.one/api/animes/${animeId}`);
            const data = await response.json();
            const title = data.russian || data.name || '';
            
            if (title) {
                // Ищем в Anilibria
                const searchRes = await fetch(`https://api.anilibria.tv/v3/title/search?query=${encodeURIComponent(title)}`);
                const searchData = await searchRes.json();
                
                if (searchData && searchData.list && searchData.list.length > 0) {
                    const anilibriaId = searchData.list[0].id;
                    const titleRes = await fetch(`https://api.anilibria.tv/v3/title/${anilibriaId}`);
                    const titleData = await titleRes.json();
                    
                    if (titleData && titleData.videos) {
                        // Берём лучшее качество
                        const qualities = ['1080p', '720p', '480p', '360p'];
                        for (const q of qualities) {
                            if (titleData.videos[q]) {
                                return titleData.videos[q];
                            }
                        }
                        if (titleData.videos.hls) {
                            return titleData.videos.hls;
                        }
                    }
                }
            }
        } catch (e) {
            console.log('Anilibria через Shikimori не работает');
        }
        
        return null;
    }

    // ===== ПОИСК В KODIK =====
    async searchKodik(title, episode) {
        try {
            // Используем Kodik API
            const url = `https://kodikapi.com/search?with_material_data=true&types=anime&title=${encodeURIComponent(title)}&limit=5`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Kodik API не отвечает');
            }
            
            const data = await response.json();
            
            if (data && data.results && data.results.length > 0) {
                // Ищем точное совпадение
                let found = data.results.find(item => 
                    (item.title || '').toLowerCase().trim() === title.toLowerCase().trim() ||
                    (item.title_orig || '').toLowerCase().trim() === title.toLowerCase().trim()
                );
                
                if (!found) {
                    found = data.results[0];
                }
                
                if (found && found.link) {
                    // Если есть серии, ищем конкретную
                    if (episode && found.seasons) {
                        for (const season of found.seasons) {
                            if (season.episodes) {
                                const ep = season.episodes.find(e => e.number === episode);
                                if (ep && ep.link) {
                                    return ep.link;
                                }
                            }
                        }
                    }
                    return found.link;
                }
            }
        } catch (e) {
            console.error('Ошибка поиска в Kodik:', e);
        }
        
        return null;
    }

    // ===== ЗАГРУЗКА ВИДЕО =====
    async loadVideo(url = null) {
        if (url) this.videoUrl = url;
        
        if (!this.videoUrl) {
            this.showError('Ссылка на видео не указана');
            return;
        }
        
        this.showLoading();
        this.hideError();
        
        try {
            this.video.src = this.videoUrl;
            this.video.load();
            
            this.video.volume = this.volume;
            this.video.playbackRate = this.speed;
            
            try {
                await this.video.play();
                this.isPlaying = true;
                this.updatePlayButton();
            } catch (e) {
                this.isPlaying = false;
                this.updatePlayButton();
            }
            
        } catch (error) {
            console.error('Ошибка загрузки видео:', error);
            this.showError('Не удалось загрузить видео');
        }
    }

    // ===== ЗАГРУЗКА ИЗ KODIK (ПРЯМОЙ ДОСТУП) =====
    async loadFromKodik(animeId, episode = 1) {
        try {
            // Получаем название аниме из Shikimori
            const response = await fetch(`https://shikimori.one/api/animes/${animeId}`);
            const data = await response.json();
            const title = data.russian || data.name || '';
            
            if (!title) {
                throw new Error('Не удалось определить название аниме');
            }
            
            const url = await this.searchKodik(title, episode);
            
            if (url) {
                this.videoUrl = url;
                this.title = title;
                this.totalEpisodes = data.episodes || 0;
                this.updateEpisodeInfo();
                await this.loadVideo();
            } else {
                throw new Error('Видео не найдено в Kodik');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки из Kodik:', error);
            throw error;
        }
    }

    // ===== УПРАВЛЕНИЕ =====
    togglePlay() {
        if (this.video.paused) {
            this.video.play();
            this.isPlaying = true;
        } else {
            this.video.pause();
            this.isPlaying = false;
        }
        this.updatePlayButton();
    }

    seek(e) {
        const progress = e.currentTarget;
        const rect = progress.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = percent * this.video.duration;
        this.video.currentTime = time;
    }

    updateThumbPosition(e) {
        const progress = e.currentTarget;
        const rect = progress.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const thumb = progress.querySelector('.onika-player-progress-thumb');
        if (thumb) {
            thumb.style.left = (percent * 100) + '%';
        }
    }

    seekRelative(seconds) {
        this.video.currentTime = Math.max(0, Math.min(this.video.duration || 0, this.video.currentTime + seconds));
    }

    toggleSpeed() {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        let index = speeds.indexOf(this.speed);
        index = (index + 1) % speeds.length;
        this.speed = speeds[index];
        this.video.playbackRate = this.speed;
        
        const btn = this.container.querySelector('.onika-player-btn-speed');
        btn.textContent = this.speed + 'x';
    }

    toggleQuality() {
        const qualities = ['1080p', '720p', '480p', '360p'];
        let index = qualities.indexOf(this.currentQuality);
        index = (index + 1) % qualities.length;
        this.currentQuality = qualities[index];
        
        const btn = this.container.querySelector('.onika-player-btn-quality');
        btn.textContent = this.currentQuality;
        
        // TODO: Переключение качества требует перезагрузки видео
        // Для этого нужно иметь ссылки на все качества
        this.showToast('Смена качества на ' + this.currentQuality);
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeIcon();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            const el = this.container.closest('.onika-player-container') || this.container;
            if (el.requestFullscreen) {
                el.requestFullscreen().catch(() => {});
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    }

    prevEpisode() {
        if (this.episode > 1) {
            this.loadFromShikimori(this.animeId, this.episode - 1);
        }
    }

    nextEpisode() {
        if (this.totalEpisodes > 0 && this.episode < this.totalEpisodes) {
            this.loadFromShikimori(this.animeId, this.episode + 1);
        } else if (this.onEpisodeEnd) {
            this.onEpisodeEnd();
        }
    }

    // ===== ОБНОВЛЕНИЯ =====
    updateProgress() {
        const video = this.video;
        if (!video.duration) return;
        
        const percent = (video.currentTime / video.duration) * 100;
        const progressFill = this.container.querySelector('.onika-player-progress-fill');
        const timeCurrent = this.container.querySelector('.onika-player-time-current');
        const timeTotal = this.container.querySelector('.onika-player-time-total');
        
        if (progressFill) progressFill.style.width = percent + '%';
        if (timeCurrent) timeCurrent.textContent = this.formatTime(video.currentTime);
        if (timeTotal) timeTotal.textContent = this.formatTime(video.duration);
    }

    updatePlayButton() {
        const btn = this.container.querySelector('.onika-player-btn-play');
        if (this.isPlaying) {
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>`;
        } else {
            btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>`;
        }
    }

    updateVolumeIcon() {
        const btn = this.container.querySelector('.onika-player-btn-volume');
        const muted = this.video.muted || this.video.volume === 0;
        btn.innerHTML = muted 
            ? `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M3,9H7L12,4V20L7,15H3V9Z M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.03C15.5,15.29 16.5,13.77 16.5,12Z" fill="currentColor"/><line x1="16" y1="3" x2="19" y2="6" stroke="currentColor" stroke-width="2"/><line x1="19" y1="3" x2="16" y2="6" stroke="currentColor" stroke-width="2"/></svg>`
            : `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M3,9H7L12,4V20L7,15H3V9Z M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.03C15.5,15.29 16.5,13.77 16.5,12Z" fill="currentColor"/></svg>`;
    }

    updateEpisodeInfo() {
        const info = this.container.querySelector('.onika-player-episode-info');
        if (info) {
            info.textContent = `${this.title} • Серия ${this.episode}${this.totalEpisodes ? '/' + this.totalEpisodes : ''}`;
        }
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ =====
    formatTime(seconds) {
        if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '00:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    showLoading() {
        if (this.loadingEl) {
            this.loadingEl.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.loadingEl) {
            this.loadingEl.style.display = 'none';
        }
    }

    showError(message = 'Ошибка загрузки видео') {
        if (this.errorEl) {
            this.errorEl.style.display = 'flex';
            const text = this.errorEl.querySelector('.onika-error-text');
            if (text) text.textContent = message;
        }
        this.hideLoading();
    }

    hideError() {
        if (this.errorEl) this.errorEl.style.display = 'none';
    }

    onLoaded() {
        this.hideLoading();
        this.updateProgress();
    }

    onEnded() {
        this.isPlaying = false;
        this.updatePlayButton();
        setTimeout(() => {
            this.nextEpisode();
        }, 2000);
    }

    showToast(message) {
        if (typeof showToast === 'function') {
            showToast(message, 'info');
        }
    }
}

console.log('✅ Shikimori плеер загружен!');

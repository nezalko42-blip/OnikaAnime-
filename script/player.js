// ============================================
// ПЛЕЕР ONIKAANIME НА ОСНОВЕ API ANILIBRIA
// ============================================

class AniLibriaPlayer {
    constructor(container, options = {}) {
        this.container = container;
        this.videoUrl = null;
        this.currentTime = 0;
        this.isPlaying = false;
        this.volume = options.volume || 1;
        this.speed = options.speed || 1;
        this.quality = options.quality || 'best';
        this.title = options.title || 'Аниме';
        this.episode = options.episode || 1;
        this.totalEpisodes = options.totalEpisodes || 0;
        this.onEpisodeEnd = options.onEpisodeEnd || null;
        
        // Хранилище для видео-элемента
        this.video = null;
        this.controls = null;
        
        this.init();
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    init() {
        this.container.innerHTML = '';
        this.container.classList.add('onika-player-container');
        
        // Создаём структуру плеера
        this.container.innerHTML = `
            <div class="onika-player">
                <div class="onika-player-video-wrapper">
                    <video class="onika-player-video" preload="metadata"></video>
                    <div class="onika-player-loading">
                        <div class="onika-loader"></div>
                        <span>Загрузка...</span>
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
        
        // Сохраняем ссылки на элементы
        this.video = this.container.querySelector('.onika-player-video');
        this.loadingEl = this.container.querySelector('.onika-player-loading');
        this.errorEl = this.container.querySelector('.onika-player-error');
        
        // Привязываем обработчики
        this.bindEvents();
        
        // Показываем загрузку
        this.showLoading();
    }

    // ===== ПРИВЯЗКА СОБЫТИЙ =====
    bindEvents() {
        const video = this.video;
        const container = this.container;
        
        // Кнопки управления
        container.querySelector('.onika-player-btn-play').addEventListener('click', () => this.togglePlay());
        container.querySelector('.onika-player-btn-prev').addEventListener('click', () => this.prevEpisode());
        container.querySelector('.onika-player-btn-next').addEventListener('click', () => this.nextEpisode());
        container.querySelector('.onika-player-btn-speed').addEventListener('click', () => this.toggleSpeed());
        container.querySelector('.onika-player-btn-quality').addEventListener('click', () => this.toggleQuality());
        container.querySelector('.onika-player-btn-volume').addEventListener('click', () => this.toggleMute());
        container.querySelector('.onika-player-btn-fullscreen').addEventListener('click', () => this.toggleFullscreen());
        
        // Прогресс-бар
        const progress = container.querySelector('.onika-player-progress-bar');
        progress.addEventListener('click', (e) => this.seek(e));
        
        // Клавиатура
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault();
                this.togglePlay();
            }
            if (e.key === 'ArrowRight') this.seekRelative(10);
            if (e.key === 'ArrowLeft') this.seekRelative(-10);
            if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
        });
        
        // События видео
        video.addEventListener('timeupdate', () => this.updateProgress());
        video.addEventListener('loadedmetadata', () => this.onLoaded());
        video.addEventListener('canplay', () => this.hideLoading());
        video.addEventListener('error', () => this.showError());
        video.addEventListener('ended', () => this.onEnded());
        video.addEventListener('waiting', () => this.showLoading());
        video.addEventListener('playing', () => this.hideLoading());
        video.addEventListener('volumechange', () => this.updateVolumeIcon());
        
        // Обработка ошибки
        container.querySelector('.onika-error-retry').addEventListener('click', () => this.loadVideo());
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
            // Проверяем, что ссылка работает
            const response = await fetch(this.videoUrl, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Загружаем видео
            this.video.src = this.videoUrl;
            this.video.load();
            
            // Восстанавливаем настройки
            this.video.volume = this.volume;
            this.video.playbackRate = this.speed;
            
            // Автовоспроизведение
            try {
                await this.video.play();
                this.isPlaying = true;
                this.updatePlayButton();
            } catch (e) {
                // Автовоспроизведение заблокировано браузером
                console.log('Автовоспроизведение заблокировано');
            }
            
        } catch (error) {
            console.error('Ошибка загрузки видео:', error);
            this.showError('Не удалось загрузить видео. Проверьте ссылку.');
        }
    }

    // ===== ЗАГРУЗКА ИЗ ANILIBRIA =====
    async loadFromAnilibria(animeId, episode = 1) {
        this.showLoading();
        this.hideError();
        
        try {
            // Получаем данные с Anilibria
            const response = await fetch(`https://api.anilibria.tv/v3/title/${animeId}`);
            if (!response.ok) {
                throw new Error('Anilibria API не отвечает');
            }
            
            const data = await response.json();
            
            // Ищем ссылку на серию
            let videoUrl = null;
            
            // Вариант 1: через player.hls
            if (data?.player?.hls) {
                videoUrl = data.player.hls;
            }
            
            // Вариант 2: через videos
            if (!videoUrl && data?.videos) {
                const videos = data.videos;
                // Ищем по качеству
                const qualities = ['1080p', '720p', '480p', '360p'];
                for (const q of qualities) {
                    if (videos[q]) {
                        videoUrl = videos[q];
                        break;
                    }
                }
                if (!videoUrl && videos.hls) {
                    videoUrl = videos.hls;
                }
            }
            
            // Вариант 3: через episodes
            if (!videoUrl && data?.episodes) {
                const ep = data.episodes.find(e => e.episode === episode);
                if (ep?.hls) {
                    videoUrl = ep.hls;
                }
            }
            
            if (!videoUrl) {
                throw new Error('Не найдена ссылка на видео');
            }
            
            this.videoUrl = videoUrl;
            this.title = data?.name?.main || data?.name?.english || 'Аниме';
            this.episode = episode;
            this.totalEpisodes = data?.episodes_total || data?.episodes?.length || 0;
            
            // Обновляем информацию
            this.updateEpisodeInfo();
            
            // Загружаем видео
            await this.loadVideo();
            
        } catch (error) {
            console.error('Ошибка загрузки из Anilibria:', error);
            this.showError(error.message || 'Не удалось загрузить видео из Anilibria');
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
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * this.video.duration;
        this.video.currentTime = time;
    }

    seekRelative(seconds) {
        this.video.currentTime += seconds;
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
        // Пока просто переключаем между 360p, 720p, 1080p
        const qualities = ['360p', '480p', '720p', '1080p'];
        let index = qualities.indexOf(this.quality);
        index = (index + 1) % qualities.length;
        this.quality = qualities[index];
        
        const btn = this.container.querySelector('.onika-player-btn-quality');
        btn.textContent = this.quality;
        
        // TODO: перезагрузить видео с новым качеством
        // Для этого нужно иметь все ссылки на качества
        this.showToast('Смена качества на ' + this.quality);
    }

    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeIcon();
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.container.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    }

    prevEpisode() {
        if (this.episode > 1) {
            this.loadFromAnilibria(this.animeId, this.episode - 1);
        }
    }

    nextEpisode() {
        if (this.totalEpisodes > 0 && this.episode < this.totalEpisodes) {
            this.loadFromAnilibria(this.animeId, this.episode + 1);
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
            ? `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M3,9H7L12,4V20L7,15H3V9M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.03C15.5,15.29 16.5,13.77 16.5,12Z" fill="currentColor"/><line x1="16" y1="3" x2="19" y2="6" stroke="currentColor" stroke-width="2"/><line x1="19" y1="3" x2="16" y2="6" stroke="currentColor" stroke-width="2"/></svg>`
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
        if (!seconds || isNaN(seconds)) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    showLoading() {
        if (this.loadingEl) this.loadingEl.style.display = 'flex';
    }

    hideLoading() {
        if (this.loadingEl) this.loadingEl.style.display = 'none';
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
        this.nextEpisode();
    }

    showToast(message) {
        // Используем существующий toast
        if (typeof showToast === 'function') {
            showToast(message, 'info');
        }
    }
}

// ============================================
// СТИЛИ ДЛЯ ПЛЕЕРА (ДОБАВИТЬ В main.css)
// ============================================

/*
.onika-player-container {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    border-radius: 14px;
    overflow: hidden;
    background: #0a0a1a;
    border: 1px solid rgba(108,92,231,0.15);
    box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}

.onika-player {
    position: relative;
    background: #000;
}

.onika-player-video-wrapper {
    position: relative;
    padding-bottom: 56.25%;
    background: #000;
}

.onika-player-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
}

.onika-player-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.7);
    color: #888;
    gap: 12px;
    z-index: 10;
}

.onika-loader {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(108,92,231,0.1);
    border-top-color: #6c5ce7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.onika-player-error {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.8);
    color: #888;
    gap: 12px;
    z-index: 10;
}

.onika-error-icon { font-size: 48px; }
.onika-error-text { font-size: 16px; color: #aaa; }
.onika-error-retry {
    padding: 10px 24px;
    border-radius: 20px;
    border: 1px solid rgba(108,92,231,0.2);
    background: rgba(108,92,231,0.05);
    color: #fff;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s ease;
}

.onika-error-retry:hover {
    background: rgba(108,92,231,0.1);
    border-color: var(--accent);
}

.onika-player-controls {
    background: linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.7));
    padding: 12px 16px 14px;
    position: relative;
}

.onika-player-progress {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
}

.onika-player-progress-bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.1);
    cursor: pointer;
    position: relative;
    transition: height 0.2s ease;
}

.onika-player-progress-bar:hover {
    height: 6px;
}

.onika-player-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(135deg, var(--accent), var(--accent-secondary));
    width: 0%;
    position: relative;
    transition: width 0.1s linear;
}

.onika-player-progress-buffer {
    height: 100%;
    border-radius: 2px;
    background: rgba(255,255,255,0.2);
    position: absolute;
    top: 0;
    left: 0;
    width: 0%;
}

.onika-player-progress-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
}

.onika-player-progress-bar:hover .onika-player-progress-thumb {
    opacity: 1;
}

.onika-player-time-current,
.onika-player-time-total {
    font-size: 12px;
    color: #aaa;
    min-width: 40px;
    font-variant-numeric: tabular-nums;
}

.onika-player-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.onika-player-btn {
    background: none;
    border: none;
    color: #ccc;
    cursor: pointer;
    padding: 6px;
    border-radius: 6px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
}

.onika-player-btn:hover {
    color: #fff;
    background: rgba(255,255,255,0.05);
}

.onika-player-btn-play {
    background: rgba(108,92,231,0.15);
    border-radius: 50%;
    min-width: 36px;
    height: 36px;
}

.onika-player-btn-play:hover {
    background: rgba(108,92,231,0.25);
}

.onika-player-episode-info {
    flex: 1;
    font-size: 13px;
    color: #aaa;
    margin: 0 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.onika-player-right-controls {
    display: flex;
    align-items: center;
    gap: 4px;
}

.onika-player-btn-speed,
.onika-player-btn-quality {
    font-size: 12px;
    font-weight: 600;
    color: #888;
    padding: 4px 10px;
    border-radius: 12px;
}

.onika-player-btn-speed:hover,
.onika-player-btn-quality:hover {
    color: #fff;
    background: rgba(255,255,255,0.05);
}
*/

console.log('✅ Плеер AniLibria загружен!');

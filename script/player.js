// ============================================
// ПЛЕЕР ONIKAANIME НА ОСНОВЕ API ANILIBRIA (ИСПРАВЛЕННЫЙ)
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
        this.animeId = options.animeId || null;
        
        // Хранилище для видео-элемента
        this.video = null;
        this.controls = null;
        this.qualities = {};
        this.currentQuality = '720p';
        
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
                    <video class="onika-player-video" preload="metadata" playsinline></video>
                    <div class="onika-player-loading" style="display:flex;">
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
        progress.addEventListener('mousemove', (e) => this.updateThumbPosition(e));
        
        // Клавиатура
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
        
        // События видео
        video.addEventListener('timeupdate', () => this.updateProgress());
        video.addEventListener('loadedmetadata', () => this.onLoaded());
        video.addEventListener('canplay', () => this.hideLoading());
        video.addEventListener('error', (e) => this.showError('Ошибка загрузки видео: ' + (e.message || 'неизвестная ошибка')));
        video.addEventListener('ended', () => this.onEnded());
        video.addEventListener('waiting', () => this.showLoading());
        video.addEventListener('playing', () => this.hideLoading());
        video.addEventListener('volumechange', () => this.updateVolumeIcon());
        
        // Обработка ошибки
        container.querySelector('.onika-error-retry').addEventListener('click', () => {
            this.hideError();
            this.loadVideo();
        });
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
                this.isPlaying = false;
                this.updatePlayButton();
            }
            
        } catch (error) {
            console.error('Ошибка загрузки видео:', error);
            this.showError('Не удалось загрузить видео. Проверьте ссылку.');
        }
    }

    // ===== ЗАГРУЗКА ИЗ ANILIBRIA =====
    async loadFromAnilibria(animeId, episode = 1) {
        this.animeId = animeId;
        this.episode = episode;
        this.showLoading();
        this.hideError();
        
        try {
            // Получаем данные с Anilibria через API v2
            const response = await fetch(`https://api.anilibria.tv/v2/getRelease?id=${animeId}&include=episodes,poster,genres,team`);
            if (!response.ok) {
                throw new Error('Anilibria API не отвечает');
            }
            
            const data = await response.json();
            console.log('📡 Данные Anilibria:', data);
            
            if (!data || !data.id) {
                throw new Error('Аниме не найдено на Anilibria');
            }
            
            // Сохраняем информацию
            this.title = data.names?.ru || data.names?.en || data.name || 'Аниме';
            this.totalEpisodes = data.episodes?.total || 0;
            
            // Получаем ссылки на видео
            let videoUrl = null;
            this.qualities = {};
            
            // Вариант 1: через episodes
            if (data.episodes && data.episodes.list) {
                const ep = data.episodes.list.find(e => e.episode === episode || e.number === episode);
                if (ep) {
                    // Проверяем разные форматы
                    if (ep.hls) {
                        videoUrl = ep.hls;
                    } else if (ep.video) {
                        if (typeof ep.video === 'object') {
                            // Сохраняем все качества
                            this.qualities = ep.video;
                            // Выбираем лучшее доступное качество
                            const qualities = ['1080p', '720p', '480p', '360p'];
                            for (const q of qualities) {
                                if (ep.video[q]) {
                                    videoUrl = ep.video[q];
                                    this.currentQuality = q;
                                    break;
                                }
                            }
                            if (!videoUrl && ep.video.hls) {
                                videoUrl = ep.video.hls;
                            }
                        } else if (typeof ep.video === 'string') {
                            videoUrl = ep.video;
                        }
                    } else if (ep.url) {
                        videoUrl = ep.url;
                    }
                }
            }
            
            // Вариант 2: через player
            if (!videoUrl && data.player) {
                if (data.player.hls) {
                    videoUrl = data.player.hls;
                } else if (data.player.video) {
                    if (typeof data.player.video === 'object') {
                        this.qualities = data.player.video;
                        const qualities = ['1080p', '720p', '480p', '360p'];
                        for (const q of qualities) {
                            if (data.player.video[q]) {
                                videoUrl = data.player.video[q];
                                this.currentQuality = q;
                                break;
                            }
                        }
                        if (!videoUrl && data.player.video.hls) {
                            videoUrl = data.player.video.hls;
                        }
                    } else {
                        videoUrl = data.player.video;
                    }
                }
            }
            
            // Вариант 3: через torrent (если есть)
            if (!videoUrl && data.torrents && data.torrents.length > 0) {
                const torrent = data.torrents.find(t => t.episode === episode || t.episode === String(episode));
                if (torrent && torrent.video) {
                    if (typeof torrent.video === 'object') {
                        const qualities = ['1080p', '720p', '480p', '360p'];
                        for (const q of qualities) {
                            if (torrent.video[q]) {
                                videoUrl = torrent.video[q];
                                this.currentQuality = q;
                                break;
                            }
                        }
                        if (!videoUrl && torrent.video.hls) {
                            videoUrl = torrent.video.hls;
                        }
                    } else {
                        videoUrl = torrent.video;
                    }
                }
            }
            
            // Если ссылка найдена - загружаем
            if (videoUrl) {
                this.videoUrl = videoUrl;
                this.updateEpisodeInfo();
                await this.loadVideo();
            } else {
                throw new Error('Не найдена ссылка на видео для серии ' + episode);
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки из Anilibria:', error);
            this.showError(error.message || 'Не удалось загрузить видео из Anilibria');
        }
    }

    // ===== ЗАГРУЗКА ИЗ ANILIBRIA (АЛЬТЕРНАТИВНЫЙ МЕТОД) =====
    async loadFromAnilibriaV3(animeId, episode = 1) {
        this.animeId = animeId;
        this.episode = episode;
        this.showLoading();
        this.hideError();
        
        try {
            // Используем v3 API
            const response = await fetch(`https://api.anilibria.tv/v3/title/${animeId}`);
            if (!response.ok) {
                throw new Error('Anilibria API v3 не отвечает');
            }
            
            const data = await response.json();
            console.log('📡 Данные Anilibria v3:', data);
            
            if (!data || !data.id) {
                throw new Error('Аниме не найдено на Anilibria');
            }
            
            this.title = data.name?.main || data.name?.english || 'Аниме';
            this.totalEpisodes = data.episodes_total || 0;
            
            let videoUrl = null;
            
            // Проверяем структуру данных
            if (data.videos) {
                // Для каждого качества
                const qualities = ['1080p', '720p', '480p', '360p'];
                for (const q of qualities) {
                    if (data.videos[q]) {
                        this.qualities[q] = data.videos[q];
                        if (!videoUrl) {
                            videoUrl = data.videos[q];
                            this.currentQuality = q;
                        }
                    }
                }
                if (!videoUrl && data.videos.hls) {
                    videoUrl = data.videos.hls;
                }
            }
            
            if (!videoUrl && data.player) {
                if (data.player.hls) {
                    videoUrl = data.player.hls;
                }
            }
            
            if (videoUrl) {
                this.videoUrl = videoUrl;
                this.updateEpisodeInfo();
                await this.loadVideo();
            } else {
                // Пробуем альтернативный источник
                await this.loadFromAlternative(animeId, episode);
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки из Anilibria v3:', error);
            // Пробуем альтернативный источник
            await this.loadFromAlternative(animeId, episode);
        }
    }

    // ===== АЛЬТЕРНАТИВНЫЙ ИСТОЧНИК (Kodik) =====
    async loadFromAlternative(animeId, episode = 1) {
        try {
            // Пробуем получить через Kodik
            const anime = allData[animeId];
            const title = anime ? getRussianTitle(anime) : this.title;
            
            if (!title || title === 'Аниме' || title === 'Без названия') {
                throw new Error('Не удалось определить название аниме');
            }
            
            const url = await API.searchKodik(title, episode);
            if (url) {
                this.videoUrl = url;
                this.updateEpisodeInfo();
                await this.loadVideo();
            } else {
                throw new Error('Не найдено видео в альтернативных источниках');
            }
        } catch (error) {
            console.error('❌ Ошибка альтернативного источника:', error);
            this.showError('Не удалось найти видео. Попробуйте другую серию или проверьте подключение.');
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
        // Если есть несколько качеств
        const qualities = ['1080p', '720p', '480p', '360p'];
        const available = qualities.filter(q => this.qualities[q]);
        
        if (available.length > 0) {
            let index = available.indexOf(this.currentQuality);
            index = (index + 1) % available.length;
            this.currentQuality = available[index];
            const newUrl = this.qualities[this.currentQuality];
            
            if (newUrl && newUrl !== this.videoUrl) {
                const currentTime = this.video.currentTime;
                const wasPlaying = !this.video.paused;
                
                this.videoUrl = newUrl;
                this.video.src = newUrl;
                this.video.load();
                this.video.currentTime = currentTime;
                if (wasPlaying) {
                    this.video.play();
                }
            }
        }
        
        const btn = this.container.querySelector('.onika-player-btn-quality');
        btn.textContent = this.currentQuality;
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
            this.loadFromAnilibriaV3(this.animeId, this.episode - 1);
        }
    }

    nextEpisode() {
        if (this.totalEpisodes > 0 && this.episode < this.totalEpisodes) {
            this.loadFromAnilibriaV3(this.animeId, this.episode + 1);
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
        // Автоматически переключаем на следующую серию через 2 секунды
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

console.log('✅ Плеер AniLibria загружен!');

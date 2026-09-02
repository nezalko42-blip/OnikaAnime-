// ============================================
// WEBTORRENT ПЛЕЕР ДЛЯ ONIKAANIME
// ============================================

class WebTorrentPlayer {
    constructor(container, options = {}) {
        this.container = container;
        this.magnet = options.magnet || null;
        this.title = options.title || 'Аниме';
        this.quality = options.quality || '720p';
        this.torrent = null;
        this.client = null;
        this.videoElement = null;
        this.isPlaying = false;
        this.onReady = options.onReady || null;
        this.onError = options.onError || null;
        this.onProgress = options.onProgress || null;
        
        // Устанавливаем WebTorrent
        this._loadWebTorrent();
    }

    // ===== ЗАГРУЗКА WEBTORRENT =====
    _loadWebTorrent() {
        if (typeof WebTorrent === 'undefined') {
            // Загружаем скрипт, если его нет
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/webtorrent@0.128.0/webtorrent.min.js';
            script.onload = () => this.init();
            document.head.appendChild(script);
        } else {
            this.init();
        }
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    init() {
        this.client = new WebTorrent();
        this.render();
    }

    // ===== ОТРИСОВКА ПЛЕЕРА =====
    render() {
        this.container.innerHTML = `
            <div class="webtorrent-player">
                <div class="webtorrent-controls">
                    <div class="webtorrent-info">
                        <span class="webtorrent-title">📺 ${this.title}</span>
                        <span class="webtorrent-quality">🎬 ${this.quality}</span>
                    </div>
                    <div class="webtorrent-buttons">
                        <button class="webtorrent-play-btn" onclick="window._torrentPlayer.togglePlay()">
                            ▶️ Смотреть
                        </button>
                        <button class="webtorrent-stop-btn" onclick="window._torrentPlayer.stop()" style="display:none;">
                            ⏹ Остановить
                        </button>
                    </div>
                    <div class="webtorrent-status" id="torrentStatus">
                        ⏳ Ожидание...
                    </div>
                    <div class="webtorrent-progress">
                        <div class="webtorrent-progress-bar">
                            <div class="webtorrent-progress-fill" id="torrentProgressFill" style="width:0%"></div>
                        </div>
                        <span class="webtorrent-progress-text" id="torrentProgressText">0%</span>
                    </div>
                </div>
                <div class="webtorrent-video-wrapper" id="torrentVideoWrapper" style="display:none;">
                    <video id="torrentVideo" controls playsinline style="width:100%;border-radius:12px;background:#000;"></video>
                    <div class="webtorrent-loading" id="torrentLoading">
                        <div class="spinner-small"></div>
                        <span>Загрузка видео...</span>
                    </div>
                </div>
            </div>
        `;
        
        this.videoElement = document.getElementById('torrentVideo');
        
        // Сохраняем ссылку на плеер в глобальную переменную
        window._torrentPlayer = this;
    }

    // ===== ЗАПУСК ТОРРЕНТА =====
    async start(magnet = null) {
        if (magnet) this.magnet = magnet;
        
        if (!this.magnet) {
            this._setStatus('❌ Magnet-ссылка не найдена', 'error');
            return;
        }
        
        this._setStatus('⏳ Подключение к пирам...', 'loading');
        document.querySelector('.webtorrent-play-btn').disabled = true;
        document.querySelector('.webtorrent-play-btn').textContent = '⏳ Загрузка...';
        
        try {
            // Добавляем торрент
            this.client.add(this.magnet, {
                path: '/tmp/webtorrent/'
            }, (torrent) => {
                this.torrent = torrent;
                this._onTorrentReady(torrent);
            });
            
        } catch (error) {
            console.error('Ошибка загрузки торрента:', error);
            this._setStatus('❌ Ошибка загрузки: ' + error.message, 'error');
            this._enablePlayButton();
        }
    }

    // ===== ТОРРЕНТ ГОТОВ =====
    _onTorrentReady(torrent) {
        // Ищем видео-файл
        const videoFile = torrent.files.find(f => {
            const name = f.name.toLowerCase();
            return name.endsWith('.mp4') || 
                   name.endsWith('.mkv') || 
                   name.endsWith('.avi') ||
                   name.endsWith('.webm');
        });
        
        if (!videoFile) {
            this._setStatus('❌ Видео-файл не найден в торренте', 'error');
            this._enablePlayButton();
            return;
        }
        
        this._setStatus(`📦 Найден файл: ${videoFile.name} (${(videoFile.length / 1024 / 1024 / 1024).toFixed(2)} GB)`, 'info');
        
        // Показываем плеер
        const wrapper = document.getElementById('torrentVideoWrapper');
        if (wrapper) wrapper.style.display = 'block';
        
        // Запускаем стриминг
        this._streamVideo(videoFile);
        
        // Отслеживаем прогресс
        torrent.on('download', (bytes) => {
            const progress = (torrent.progress * 100).toFixed(1);
            const speed = (torrent.downloadSpeed / 1024 / 1024).toFixed(1);
            const peers = torrent.numPeers;
            
            document.getElementById('torrentProgressFill').style.width = progress + '%';
            document.getElementById('torrentProgressText').textContent = `${progress}% (${speed} MB/s) • ${peers} пиров`;
            
            if (this.onProgress) {
                this.onProgress(progress, speed, peers);
            }
        });
        
        torrent.on('done', () => {
            this._setStatus('✅ Торрент полностью загружен!', 'success');
        });
        
        torrent.on('error', (err) => {
            console.error('Ошибка торрента:', err);
            this._setStatus('❌ Ошибка: ' + err.message, 'error');
        });
        
        // Убираем кнопку "Смотреть", показываем "Остановить"
        document.querySelector('.webtorrent-play-btn').style.display = 'none';
        document.querySelector('.webtorrent-stop-btn').style.display = 'inline-block';
        
        if (this.onReady) {
            this.onReady(torrent, videoFile);
        }
    }

    // ===== СТРИМИНГ ВИДЕО =====
    _streamVideo(videoFile) {
        const video = this.videoElement;
        const loading = document.getElementById('torrentLoading');
        
        // Создаём поток
        const stream = videoFile.createReadStream();
        
        // Используем MediaSource для стриминга
        if (window.MediaSource && videoFile.name.endsWith('.mp4')) {
            this._streamWithMediaSource(videoFile, video);
        } else {
            // Обычный способ через blob URL
            videoFile.renderTo(video, {
                autoplay: true,
                muted: false,
                controls: true
            }, (err, elem) => {
                if (err) {
                    console.error('Ошибка воспроизведения:', err);
                    this._setStatus('❌ Ошибка воспроизведения: ' + err.message, 'error');
                    return;
                }
                
                if (loading) loading.style.display = 'none';
                this.isPlaying = true;
                this._setStatus('▶️ Воспроизведение начато!', 'success');
                
                video.onended = () => {
                    this.isPlaying = false;
                    this._setStatus('⏹ Воспроизведение завершено', 'info');
                };
            });
        }
    }

    // ===== СТРИМИНГ ЧЕРЕЗ MEDIA SOURCE (для MP4) =====
    _streamWithMediaSource(videoFile, video) {
        const loading = document.getElementById('torrentLoading');
        const mediaSource = new MediaSource();
        
        video.src = URL.createObjectURL(mediaSource);
        
        mediaSource.addEventListener('sourceopen', () => {
            const mimeType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
            
            if (!MediaSource.isTypeSupported(mimeType)) {
                // Пробуем другой кодек
                const fallbackMime = 'video/mp4';
                if (!MediaSource.isTypeSupported(fallbackMime)) {
                    this._setStatus('❌ Ваш браузер не поддерживает этот кодек', 'error');
                    return;
                }
            }
            
            const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
            let isAppending = false;
            
            const stream = videoFile.createReadStream({
                start: 0,
                end: videoFile.length
            });
            
            stream.on('data', (chunk) => {
                if (isAppending) return;
                
                try {
                    isAppending = true;
                    sourceBuffer.appendBuffer(chunk);
                    
                    sourceBuffer.addEventListener('updateend', () => {
                        isAppending = false;
                        if (loading) loading.style.display = 'none';
                        this.isPlaying = true;
                        this._setStatus('▶️ Воспроизведение начато!', 'success');
                    });
                    
                } catch (e) {
                    console.error('Ошибка добавления буфера:', e);
                    isAppending = false;
                }
            });
            
            stream.on('end', () => {
                if (mediaSource.readyState === 'open') {
                    mediaSource.endOfStream();
                }
            });
            
            stream.on('error', (err) => {
                console.error('Ошибка потока:', err);
                this._setStatus('❌ Ошибка: ' + err.message, 'error');
            });
            
        }, { once: true });
        
        video.onerror = (e) => {
            console.error('Ошибка видео:', e);
            this._setStatus('❌ Ошибка воспроизведения видео', 'error');
        };
    }

    // ===== УПРАВЛЕНИЕ =====
    togglePlay() {
        if (!this.torrent) {
            this.start();
            return;
        }
        
        const video = this.videoElement;
        if (!video) return;
        
        if (video.paused) {
            video.play();
            this.isPlaying = true;
            this._setStatus('▶️ Воспроизведение продолжено', 'info');
        } else {
            video.pause();
            this.isPlaying = false;
            this._setStatus('⏸ Воспроизведение приостановлено', 'info');
        }
    }

    stop() {
        if (this.client) {
            this.client.destroy(() => {
                this.torrent = null;
                this.isPlaying = false;
                
                const video = this.videoElement;
                if (video) {
                    video.pause();
                    video.src = '';
                    video.load();
                }
                
                document.getElementById('torrentVideoWrapper').style.display = 'none';
                document.querySelector('.webtorrent-play-btn').style.display = 'inline-block';
                document.querySelector('.webtorrent-stop-btn').style.display = 'none';
                document.querySelector('.webtorrent-play-btn').disabled = false;
                document.querySelector('.webtorrent-play-btn').textContent = '▶️ Смотреть';
                
                document.getElementById('torrentProgressFill').style.width = '0%';
                document.getElementById('torrentProgressText').textContent = '0%';
                
                this._setStatus('⏹ Плеер остановлен', 'info');
            });
        }
    }

    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
    _setStatus(text, type = 'info') {
        const statusEl = document.getElementById('torrentStatus');
        if (!statusEl) return;
        
        statusEl.textContent = text;
        statusEl.className = 'webtorrent-status';
        
        if (type === 'error') {
            statusEl.style.color = '#e74c3c';
        } else if (type === 'success') {
            statusEl.style.color = '#2ecc71';
        } else if (type === 'loading') {
            statusEl.style.color = '#f1c40f';
        } else {
            statusEl.style.color = 'var(--text-muted)';
        }
    }

    _enablePlayButton() {
        const btn = document.querySelector('.webtorrent-play-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '▶️ Смотреть';
        }
    }

    destroy() {
        if (this.client) {
            this.client.destroy();
        }
        this.container.innerHTML = '';
        window._torrentPlayer = null;
    }
}

console.log('✅ WebTorrent плеер загружен!');

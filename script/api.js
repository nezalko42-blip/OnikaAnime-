// ============================================
// API МОДУЛЬ ONIKAANIME (Jikan API v4 + Fallback)
// ============================================

const API = {
    JIKAN_URL: 'https://api.jikan.moe/v4',
    ANILIBRIA_URL: 'https://anilibria.top/api/v1',
    
    // ===== БАЗОВЫЙ GET-ЗАПРОС =====
    async _fetch(url, options = {}) {
        // Jikan требует задержки между запросами
        await this._delay(400);
        
        try {
            console.log('📡 Запрос:', url);
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'OnikaAnime/2.0',
                    ...options.headers
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            const data = await response.json();
            console.log('📦 Ответ:', data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ============================================
    // 1. ПОИСК И КАТАЛОГ
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        // Сначала пробуем Jikan
        const result = await this._searchJikan(query, genre, page);
        if (result && result.items && result.items.length > 0) {
            console.log('✅ Найдено через Jikan:', result.items.length);
            return result;
        }

        // Если Jikan ничего не нашёл, пробуем Anilibria
        console.log('🔄 Jikan не нашёл, пробуем Anilibria...');
        return await this._searchAnilibria(query, genre, page);
    },

    // ============================================
    // 2. ПОИСК ЧЕРЕЗ JIKAN
    // ============================================
    async _searchJikan(query = '', genre = null, page = 1) {
        const limit = 24;
        let url = `${this.JIKAN_URL}/anime?page=${page}&limit=${limit}`;

        if (query && query.length > 0) {
            // Пробуем с русским запросом
            url += `&q=${encodeURIComponent(query)}`;
        }

        if (genre) {
            const genreMap = {
                '1': '1',   // Action
                '8': '8',   // Drama
                '21': '4',  // Comedy
                '10': '10', // Fantasy
                '22': '22'  // Romance
            };
            const genreId = genreMap[genre];
            if (genreId) {
                url += `&genres=${genreId}`;
            }
        }

        url += `&order_by=popularity&sort=desc`;

        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            const items = data.data.map(item => this._convertJikanItem(item));
            return {
                items: items,
                totalPages: data.pagination?.last_visible_page || 1
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 3. ПОИСК ЧЕРЕЗ ANILIBRIA (запасной)
    // ============================================
    async _searchAnilibria(query = '', genre = null, page = 1) {
        if (!query || query.length < 2) {
            // Если нет поискового запроса, просто показываем последние релизы
            const url = `${this.ANILIBRIA_URL}/anime/releases/latest?limit=24`;
            const data = await this._fetch(url, { headers: { 'Accept': 'application/json' } });
            if (data && Array.isArray(data) && data.length > 0) {
                const items = data.map(item => this._convertAnilibriaItem(item));
                return {
                    items: items,
                    totalPages: 1
                };
            }
            return { items: [], totalPages: 1 };
        }

        // Поиск через Anilibria
        try {
            const url = `${this.ANILIBRIA_URL}/app/search/releases?query=${encodeURIComponent(query)}&limit=24&page=${page}`;
            const data = await this._fetch(url, { headers: { 'Accept': 'application/json' } });
            if (data && data.list && data.list.length > 0) {
                const items = data.list.map(item => this._convertAnilibriaItem(item));
                return {
                    items: items,
                    totalPages: data.pagination?.total_pages || 1
                };
            }
        } catch (e) {
            console.log('⚠️ Anilibria поиск не удался');
        }

        // Если ничего не нашли, пробуем через каталог Anilibria
        try {
            const body = {
                page: page,
                limit: 24,
                f: {
                    search: query,
                    sorting: 'FRESH_AT_DESC'
                }
            };
            const response = await fetch(`${this.ANILIBRIA_URL}/anime/catalog/releases`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (data && data.list && data.list.length > 0) {
                const items = data.list.map(item => this._convertAnilibriaItem(item));
                return {
                    items: items,
                    totalPages: data.pagination?.total_pages || 1
                };
            }
        } catch (e) {
            console.log('⚠️ Anilibria каталог не удался');
        }

        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 4. ДЕТАЛИ (через Jikan)
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('jikan_', '').replace('anilibria_', '');
        
        // Пробуем через Jikan
        const url = `${this.JIKAN_URL}/anime/${cleanId}/full`;
        const data = await this._fetch(url);
        if (data && data.data) {
            return this._convertJikanItem(data.data);
        }

        // Пробуем через Anilibria
        try {
            const anilibriaUrl = `${this.ANILIBRIA_URL}/anime/releases/${cleanId}`;
            const anilibriaData = await this._fetch(anilibriaUrl, { headers: { 'Accept': 'application/json' } });
            if (anilibriaData && anilibriaData.id) {
                return this._convertAnilibriaItem(anilibriaData);
            }
        } catch (e) {}

        return null;
    },

    // ============================================
    // 5. АВТОДОПОЛНЕНИЕ
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        
        // Пробуем Jikan
        const url = `${this.JIKAN_URL}/anime?q=${encodeURIComponent(query)}&limit=${limit}`;
        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => ({
                id: 'jikan_' + item.mal_id,
                title: item.title || item.title_english || 'Без названия',
                poster: item.images?.jpg?.image_url || ''
            }));
        }

        // Пробуем Anilibria
        try {
            const anilibriaUrl = `${this.ANILIBRIA_URL}/app/search/releases?query=${encodeURIComponent(query)}&limit=${limit}`;
            const anilibriaData = await this._fetch(anilibriaUrl, { headers: { 'Accept': 'application/json' } });
            if (anilibriaData && anilibriaData.list && anilibriaData.list.length > 0) {
                return anilibriaData.list.map(item => ({
                    id: 'anilibria_' + item.id,
                    title: item.name?.main || item.name?.english || 'Без названия',
                    poster: item.poster?.optimized?.preview || item.poster?.preview || ''
                }));
            }
        } catch (e) {}

        return [];
    },

    // ============================================
    // 6. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 6) {
        // Пробуем Jikan
        const url = `${this.JIKAN_URL}/top/anime?limit=${limit}&filter=bypopularity`;
        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => this._convertJikanItem(item));
        }

        // Пробуем Anilibria
        try {
            const anilibriaUrl = `${this.ANILIBRIA_URL}/anime/releases/recommended?limit=${limit}`;
            const anilibriaData = await this._fetch(anilibriaUrl, { headers: { 'Accept': 'application/json' } });
            if (anilibriaData && Array.isArray(anilibriaData) && anilibriaData.length > 0) {
                return anilibriaData.map(item => this._convertAnilibriaItem(item));
            }
        } catch (e) {}

        return [];
    },

    // ============================================
    // 7. СЛУЧАЙНОЕ
    // ============================================
    async getRandomReleases(limit = 1) {
        // Пробуем Jikan
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const url = `${this.JIKAN_URL}/anime?page=${randomPage}&limit=${limit}`;
        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => this._convertJikanItem(item));
        }

        // Пробуем Anilibria
        try {
            const anilibriaUrl = `${this.ANILIBRIA_URL}/anime/releases/random?limit=${limit}`;
            const anilibriaData = await this._fetch(anilibriaUrl, { headers: { 'Accept': 'application/json' } });
            if (anilibriaData && Array.isArray(anilibriaData) && anilibriaData.length > 0) {
                return anilibriaData.map(item => this._convertAnilibriaItem(item));
            }
        } catch (e) {}

        return [];
    },

    // ============================================
    // 8. РАСПИСАНИЕ
    // ============================================
    async getSchedule() {
        // Пробуем Anilibria
        try {
            const url = `${this.ANILIBRIA_URL}/anime/schedule/week`;
            const data = await this._fetch(url, { headers: { 'Accept': 'application/json' } });
            if (data && Array.isArray(data) && data.length > 0) {
                return data.map(dayObj => ({
                    day: dayObj.day || 0,
                    list: (dayObj.list || []).map(item => this._convertAnilibriaItem(item))
                }));
            }
        } catch (e) {}

        // Запасной вариант - текущий сезон Jikan
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        let season = 'winter';
        if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'fall';
        else season = 'winter';
        
        const url = `${this.JIKAN_URL}/seasons/${year}/${season}?limit=24`;
        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
            const grouped = {};
            data.data.forEach(item => {
                const dayIndex = item.broadcast?.day ? this._getDayIndex(item.broadcast.day) : Math.floor(Math.random() * 7);
                const dayName = days[dayIndex] || 'Неизвестно';
                if (!grouped[dayName]) grouped[dayName] = [];
                grouped[dayName].push(this._convertJikanItem(item));
            });
            return Object.keys(grouped).map(day => ({
                day: days.indexOf(day),
                list: grouped[day]
            }));
        }
        return [];
    },

    _getDayIndex(day) {
        const map = {
            'Monday': 0, 'Tuesday': 1, 'Wednesday': 2,
            'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
        };
        return map[day] !== undefined ? map[day] : 0;
    },

    // ============================================
    // 9. КОНВЕРТАЦИЯ JIKAN
    // ============================================
    _convertJikanItem(item) {
        let img = '';
        if (item.images) {
            const jpg = item.images.jpg || item.images.webp || {};
            img = jpg.large_image_url || jpg.image_url || '';
        }

        const title = item.title || item.title_english || 'Без названия';
        const year = item.year || item.aired?.prop?.from?.year || '--';
        const episodes = item.episodes || '?';
        const genres = (item.genres || []).map(g => g.name);
        const synopsis = item.synopsis || 'Описание отсутствует';
        const score = item.score || 0;

        return {
            mal_id: 'jikan_' + item.mal_id,
            id: 'jikan_' + item.mal_id,
            title: title,
            title_russian: item.title || '',
            title_english: item.title_english || '',
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: synopsis,
            genres: genres,
            score: score,
            russian: item.title || '',
            source: 'Jikan (MyAnimeList)',
            _raw: item
        };
    },

    // ============================================
    // 10. КОНВЕРТАЦИЯ ANILIBRIA
    // ============================================
    _convertAnilibriaItem(item) {
        let img = '';
        if (item.poster) {
            const poster = item.poster.optimized || item.poster;
            img = poster.preview || poster.thumbnail || poster.src || '';
            if (img && img.startsWith('/')) {
                img = 'https://anilibria.top' + img;
            }
        }

        const title = item.name?.main || item.name?.english || 'Без названия';
        const year = item.year || '--';
        const episodes = item.episodes_total || '?';
        const genres = (item.genres || []).map(g => g.name || g);
        const synopsis = item.description || 'Описание отсутствует';
        const score = item.rating || 0;

        return {
            mal_id: 'anilibria_' + item.id,
            id: 'anilibria_' + item.id,
            title: title,
            title_russian: item.name?.main || '',
            title_english: item.name?.english || '',
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: synopsis,
            genres: genres,
            score: score,
            russian: item.name?.main || '',
            source: 'Anilibria',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Jikan + Anilibria) загружен');

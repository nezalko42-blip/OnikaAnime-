// ============================================
// API МОДУЛЬ ONIKAANIME (УНИВЕРСАЛЬНЫЙ)
// Использует: Anilibria (POST/GET), Jikan, Kodik, Anime365
// Автоматическое переключение между API
// ============================================

const API = {
    // ===== ИСТОЧНИКИ API =====
    ANILIBRIA_POST: 'https://www.anilibria.tv/public/api/index.php',
    ANILIBRIA_GET: 'https://anilibria.top/api/v1',
    JIKAN_URL: 'https://api.jikan.moe/v4',
    KODIK_URL: 'https://kodikapi.com',
    ANIME365_URL: 'https://anime365.ru/api', // через враппер
    
    // ===== КЭШ =====
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000, // 5 минут

    // ============================================
    // 1. ANILIBRIA POST (ОСНОВНОЙ)
    // ============================================
    async _postAnilibria(params = {}) {
        const formData = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null) {
                if (typeof params[key] === 'object') {
                    formData.append(key, JSON.stringify(params[key]));
                } else {
                    formData.append(key, params[key]);
                }
            }
        }

        try {
            console.log('📡 POST Anilibria:', params);
            const response = await fetch(this.ANILIBRIA_POST, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: formData.toString()
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📦 Ответ Anilibria POST:', data);
            return data;
        } catch (error) {
            console.error('❌ Anilibria POST Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 2. БАЗОВЫЙ GET-ЗАПРОС (С КЭШЕМ)
    // ============================================
    async _fetch(url, options = {}) {
        const cacheKey = url;
        if (this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
                console.log('💾 Кэш:', url);
                return cached.data;
            } else {
                this._cache.delete(cacheKey);
            }
        }

        try {
            console.log('📡 GET:', url);
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
            
            if (data) {
                this._cache.set(cacheKey, { data, time: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ GET Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 3. ПОИСК ЧЕРЕЗ ANILIBRIA POST
    // ============================================
    async _searchAnilibriaPost(query = '', genre = null, page = 1) {
        const perPage = 24;
        const params = {
            query: 'catalog',
            page: page,
            perPage: perPage,
            sort: '2',
            xpage: 'catalog'
        };

        if (query && query.length > 1) {
            params.query = 'search';
            params.search = query;
        }

        if (genre) {
            params.search = JSON.stringify({ genre: genre });
        }

        const data = await this._postAnilibria(params);
        if (data && data.status === true && data.data && data.data.items) {
            const items = data.data.items.map(item => this._convertAnilibriaItem(item));
            const pagination = data.data.pagination || {};
            const totalPages = pagination.allPages || 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 4. ПОИСК ЧЕРЕЗ ANILIBRIA GET
    // ============================================
    async _searchAnilibriaGet(query = '', genre = null, page = 1) {
        try {
            let url = `${this.ANILIBRIA_GET}/anime/catalog/releases?page=${page}&limit=24`;
            if (query && query.length > 1) {
                url += `&f[search]=${encodeURIComponent(query)}`;
            }
            if (genre) {
                url += `&f[genres]=${parseInt(genre)}`;
            }
            const data = await this._fetch(url);
            if (data && data.data && data.data.length > 0) {
                const items = data.data.map(item => this._convertAnilibriaGetItem(item));
                const totalPages = data.meta?.pagination?.total_pages || 1;
                return {
                    items: items,
                    totalPages: totalPages
                };
            }
        } catch (e) {
            console.log('⚠️ Anilibria GET не удался');
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 5. ПОИСК ЧЕРЕЗ JIKAN
    // ============================================
    async _searchJikan(query = '', genre = null, page = 1) {
        const limit = 24;
        let url = `${this.JIKAN_URL}/anime?page=${page}&limit=${limit}`;

        if (query && query.length > 1) {
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
    // 6. ПОИСК ВИДЕО ЧЕРЕЗ KODIK
    // ============================================
    async _searchKodik(title, episode = 1) {
        if (!title) return null;
        
        try {
            const url = `${this.KODIK_URL}/search?title=${encodeURIComponent(title)}&types=anime&limit=1`;
            const data = await this._fetch(url);
            if (data && data.results && data.results.length > 0) {
                const result = data.results[0];
                if (result.link) {
                    return result.link;
                }
                if (result.last_episode && result.last_episode.link) {
                    return result.last_episode.link;
                }
            }
        } catch (e) {
            console.log('⚠️ Kodik не найден для:', title);
        }
        return null;
    },

    // ============================================
    // 7. ПОЛУЧЕНИЕ ССЫЛКИ НА ВИДЕО (ВСЕ ИСТОЧНИКИ)
    // ============================================
    async getVideoUrl(title, episode = 1) {
        // 1. Пробуем Kodik
        const kodikUrl = await this._searchKodik(title, episode);
        if (kodikUrl) {
            console.log('✅ Видео найдено через Kodik');
            return kodikUrl;
        }

        // 2. Пробуем Anilibria (если есть external_player)
        try {
            const params = { query: 'search', search: title, page: 1, perPage: 1 };
            const data = await this._postAnilibria(params);
            if (data && data.status === true && data.data && data.data.items && data.data.items.length > 0) {
                const item = data.data.items[0];
                if (item.moon) {
                    console.log('✅ Видео найдено через Anilibria');
                    return item.moon;
                }
            }
        } catch (e) {}

        // 3. Пробуем Jikan (ссылка на MAL)
        try {
            const url = `${this.JIKAN_URL}/anime?q=${encodeURIComponent(title)}&limit=1`;
            const data = await this._fetch(url);
            if (data && data.data && data.data.length > 0) {
                const malId = data.data[0].mal_id;
                console.log('✅ Ссылка на MAL найдена');
                return `https://myanimelist.net/anime/${malId}`;
            }
        } catch (e) {}

        console.log('❌ Видео не найдено');
        return null;
    },

    // ============================================
    // 8. ОСНОВНАЯ ФУНКЦИЯ (ВСЕ API)
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        // 1. Anilibria POST (основной, работает)
        const result1 = await this._searchAnilibriaPost(query, genre, page);
        if (result1 && result1.items && result1.items.length > 0) {
            console.log('✅ Найдено через Anilibria POST:', result1.items.length);
            return result1;
        }

        // 2. Anilibria GET
        const result2 = await this._searchAnilibriaGet(query, genre, page);
        if (result2 && result2.items && result2.items.length > 0) {
            console.log('✅ Найдено через Anilibria GET:', result2.items.length);
            return result2;
        }

        // 3. Jikan
        console.log('🔄 Пробуем Jikan...');
        const result3 = await this._searchJikan(query, genre, page);
        if (result3 && result3.items && result3.items.length > 0) {
            console.log('✅ Найдено через Jikan:', result3.items.length);
            return result3;
        }

        console.log('❌ Ничего не найдено ни в одном API');
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 9. РАСПИСАНИЕ (Anilibria POST)
    // ============================================
    async getSchedule() {
        const params = { query: 'schedule' };
        const data = await this._postAnilibria(params);
        if (data && data.status === true && Array.isArray(data.data)) {
            return data.data.map(dayObj => ({
                day: parseInt(dayObj.day) - 1,
                list: dayObj.items.map(item => this._convertAnilibriaItem(item))
            }));
        }
        return [];
    },

    // ============================================
    // 10. РЕКОМЕНДАЦИИ (Anilibria POST)
    // ============================================
    async getRecommended(limit = 6) {
        const params = {
            query: 'catalog',
            page: 1,
            perPage: limit,
            sort: '1',
            xpage: 'catalog'
        };
        const data = await this._postAnilibria(params);
        if (data && data.status === true && data.data && data.data.items) {
            return data.data.items.map(item => this._convertAnilibriaItem(item));
        }
        return [];
    },

    // ============================================
    // 11. СЛУЧАЙНОЕ (Anilibria POST)
    // ============================================
    async getRandomReleases(limit = 1) {
        const params = { query: 'random_release' };
        const data = await this._postAnilibria(params);
        if (data && data.status === true && data.data && data.data.code) {
            const details = await this.getAnimeDetails(data.data.code);
            if (details) {
                return [details];
            }
        }
        return [];
    },

    // ============================================
    // 12. ДЕТАЛИ (ВСЕ API)
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '').replace('jikan_', '');
        
        // 1. Anilibria POST
        const params = { query: 'release', id: cleanId };
        const data = await this._postAnilibria(params);
        if (data && data.status === true && data.data) {
            return this._convertAnilibriaItem(data.data);
        }

        // 2. Anilibria GET
        try {
            const url = `${this.ANILIBRIA_GET}/anime/releases/${cleanId}`;
            const getData = await this._fetch(url);
            if (getData && getData.id) {
                return this._convertAnilibriaGetItem(getData);
            }
        } catch (e) {}

        // 3. Jikan
        try {
            const url = `${this.JIKAN_URL}/anime/${cleanId}/full`;
            const jikanData = await this._fetch(url);
            if (jikanData && jikanData.data) {
                return this._convertJikanItem(jikanData.data);
            }
        } catch (e) {}

        return null;
    },

    // ============================================
    // 13. АВТОДОПОЛНЕНИЕ (Anilibria POST)
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const params = {
            query: 'search',
            search: query,
            page: 1,
            perPage: limit
        };
        const data = await this._postAnilibria(params);
        if (data && data.status === true && data.data && data.data.items) {
            return data.data.items.map(item => ({
                id: 'anilibria_' + item.id,
                title: item.names?.[0] || item.names?.[1] || 'Без названия',
                poster: item.poster || ''
            }));
        }
        return [];
    },

    // ============================================
    // 14. КОНВЕРТАЦИЯ ANILIBRIA POST
    // ============================================
    _convertAnilibriaItem(item) {
        let img = '';
        if (item.poster) {
            img = item.poster;
            if (img && img.startsWith('/')) {
                img = 'https://www.anilibria.tv' + img;
            }
        }

        const names = item.names || [];
        const title = names[0] || names[1] || 'Без названия';
        const title_russian = names[0] || '';
        const title_english = names[1] || '';

        const genres = item.genres ? item.genres.split(',').map(g => g.trim()) : [];
        const year = item.year || '--';
        const episodes = item.series || '?';

        return {
            mal_id: 'anilibria_' + item.id,
            id: 'anilibria_' + item.id,
            title: title,
            title_russian: title_russian,
            title_english: title_english,
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: item.description || 'Описание отсутствует',
            genres: genres,
            score: 0,
            russian: title_russian,
            source: 'Anilibria POST',
            _raw: item
        };
    },

    // ============================================
    // 15. КОНВЕРТАЦИЯ ANILIBRIA GET
    // ============================================
    _convertAnilibriaGetItem(item) {
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
            score: 0,
            russian: item.name?.main || '',
            source: 'Anilibria GET',
            _raw: item
        };
    },

    // ============================================
    // 16. КОНВЕРТАЦИЯ JIKAN
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
            score: 0,
            russian: item.title || '',
            source: 'Jikan',
            _raw: item
        };
    },

    // ============================================
    // 17. ОЧИСТКА КЭША
    // ============================================
    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (универсальный) загружен');

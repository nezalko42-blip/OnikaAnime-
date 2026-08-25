// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria v1 с кэшированием)
// ============================================

const API = {
    ANILIBRIA_URL: 'https://www.anilibria.tv/public/api/index.php',
    ANILIBRIA_ALT_URL: 'https://api.anilibria.tv/v1',
    
    // Кэш для результатов
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000, // 5 минут

    // ===== БАЗОВЫЙ POST-ЗАПРОС С КЭШИРОВАНИЕМ =====
    async _post(url, params = {}, useCache = true) {
        // Генерируем ключ кэша
        const cacheKey = url + '|' + JSON.stringify(params);
        
        // Проверяем кэш
        if (useCache && this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
                console.log('💾 Кэш:', cacheKey);
                return cached.data;
            } else {
                this._cache.delete(cacheKey);
            }
        }

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
            console.log('📡 POST:', url, params);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: formData.toString()
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📦 Ответ:', data);
            
            // Сохраняем в кэш
            if (useCache && data && data.status === true) {
                this._cache.set(cacheKey, { data, time: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    // ===== БАЗОВЫЙ GET-ЗАПРОС С КЭШИРОВАНИЕМ =====
    async _get(url, useCache = true) {
        if (useCache && this._cache.has(url)) {
            const cached = this._cache.get(url);
            if (Date.now() - cached.time < this._cacheTTL) {
                console.log('💾 Кэш GET:', url);
                return cached.data;
            } else {
                this._cache.delete(url);
            }
        }

        try {
            console.log('📡 GET:', url);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📦 Ответ:', data);
            
            if (useCache && data) {
                this._cache.set(url, { data, time: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ И ПОИСК (с кэшированием)
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        const perPage = 24;

        if (query && query.length > 0) {
            return await this._searchTitles(query, page);
        }

        const params = {
            query: 'catalog',
            page: page,
            perPage: perPage,
            sort: '2',
            xpage: 'catalog'
        };

        if (genre) {
            params.search = JSON.stringify({ genre: genre });
        }

        const data = await this._post(this.ANILIBRIA_URL, params);
        if (data && data.status === true && data.data && data.data.items) {
            const items = data.data.items.map(item => this._convertItem(item));
            const pagination = data.data.pagination || {};
            const totalPages = pagination.allPages || 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }

        return await this._searchAlt(query, genre, page);
    },

    // ============================================
    // 2. ПОИСК ПО НАЗВАНИЮ (с кэшированием)
    // ============================================
    async _searchTitles(query, page = 1) {
        const perPage = 24;
        const params = {
            query: 'search',
            search: query,
            page: page,
            perPage: perPage
        };

        const data = await this._post(this.ANILIBRIA_URL, params);
        if (data && data.status === true && data.data && data.data.items) {
            const items = data.data.items.map(item => this._convertItem(item));
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
    // 3. АЛЬТЕРНАТИВНЫЙ ПОИСК
    // ============================================
    async _searchAlt(query = '', genre = null, page = 1) {
        try {
            let url = `${this.ANILIBRIA_ALT_URL}/anime/catalog/releases?page=${page}&limit=24`;
            if (query && query.length > 0) {
                url += `&f[search]=${encodeURIComponent(query)}`;
            }
            if (genre) {
                url += `&f[genres]=${parseInt(genre)}`;
            }
            const data = await this._get(url);
            if (data && data.data && data.data.length > 0) {
                const items = data.data.map(item => this._convertAltItem(item));
                const totalPages = data.meta?.pagination?.total_pages || 1;
                return {
                    items: items,
                    totalPages: totalPages
                };
            }
        } catch (e) {
            console.log('⚠️ Альтернативный поиск не удался');
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 4. РАСПИСАНИЕ (с кэшированием)
    // ============================================
    async getSchedule() {
        const params = { query: 'schedule' };
        const data = await this._post(this.ANILIBRIA_URL, params);
        if (data && data.status === true && Array.isArray(data.data)) {
            return data.data.map(dayObj => ({
                day: parseInt(dayObj.day) - 1,
                list: dayObj.items.map(item => this._convertItem(item))
            }));
        }
        return [];
    },

    // ============================================
    // 5. ДЕТАЛИ (с кэшированием)
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const params = {
            query: 'release',
            id: cleanId
        };
        const data = await this._post(this.ANILIBRIA_URL, params);
        if (data && data.status === true && data.data) {
            return this._convertItem(data.data);
        }
        return null;
    },

    // ============================================
    // 6. СЛУЧАЙНОЕ
    // ============================================
    async getRandomReleases(limit = 1) {
        const params = { query: 'random_release' };
        const data = await this._post(this.ANILIBRIA_URL, params);
        if (data && data.status === true && data.data && data.data.code) {
            const details = await this.getAnimeDetails(data.data.code);
            if (details) {
                return [details];
            }
        }
        return [];
    },

    // ============================================
    // 7. РЕКОМЕНДАЦИИ (с кэшированием)
    // ============================================
    async getRecommended(limit = 6) {
        const params = {
            query: 'catalog',
            page: 1,
            perPage: limit,
            sort: '1',
            xpage: 'catalog'
        };
        const data = await this._post(this.ANILIBRIA_URL, params);
        if (data && data.status === true && data.data && data.data.items) {
            return data.data.items.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 8. АВТОДОПОЛНЕНИЕ (с кэшированием)
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const params = {
            query: 'search',
            search: query,
            page: 1,
            perPage: limit
        };
        const data = await this._post(this.ANILIBRIA_URL, params);
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
    // 9. КОНВЕРТАЦИЯ (для POST API)
    // ============================================
    _convertItem(item) {
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
            source: 'Anilibria v1',
            _raw: item
        };
    },

    // ============================================
    // 10. КОНВЕРТАЦИЯ (для GET API)
    // ============================================
    _convertAltItem(item) {
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
            source: 'Anilibria v1 (alt)',
            _raw: item
        };
    },

    // ============================================
    // 11. ОЧИСТКА КЭША
    // ============================================
    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Anilibria v1 с кэшем) загружен');

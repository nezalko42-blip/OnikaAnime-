// ============================================
// API МОДУЛЬ ONIKAANIME (Jikan + Anilibria.tv)
// Основной - Anilibria.tv (работает)
// Запасной - Jikan API
// ============================================

const API = {
    // Anilibria v1 (основной, работает)
    ANILIBRIA_V1_URL: 'https://www.anilibria.tv/public/api/index.php',
    // Anilibria v1 (альтернативный)
    ANILIBRIA_ALT_URL: 'https://anilibria.top/api/v1',
    // Jikan API (запасной)
    JIKAN_URL: 'https://api.jikan.moe/v4',
    
    // ===== БАЗОВЫЙ POST-ЗАПРОС (Anilibria v1) =====
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
            console.log('📡 POST Anilibria:', this.ANILIBRIA_V1_URL, params);
            const response = await fetch(this.ANILIBRIA_V1_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: formData.toString()
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📦 Ответ Anilibria:', data);
            return data;
        } catch (error) {
            console.error('❌ Anilibria Error:', error.message);
            return null;
        }
    },

    // ===== БАЗОВЫЙ GET-ЗАПРОС (Anilibria alt / Jikan) =====
    async _fetch(url, options = {}) {
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

    // ============================================
    // 1. КАТАЛОГ И ПОИСК (основной - Anilibria)
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        // Сначала пробуем Anilibria v1 (основной)
        const result = await this._searchAnilibriaV1(query, genre, page);
        if (result && result.items && result.items.length > 0) {
            console.log('✅ Найдено через Anilibria v1:', result.items.length);
            return result;
        }

        // Пробуем Anilibria alt
        console.log('🔄 Пробуем Anilibria alt...');
        const altResult = await this._searchAnilibriaAlt(query, genre, page);
        if (altResult && altResult.items && altResult.items.length > 0) {
            console.log('✅ Найдено через Anilibria alt:', altResult.items.length);
            return altResult;
        }

        // Если ничего не нашли, пробуем Jikan
        console.log('🔄 Пробуем Jikan...');
        return await this._searchJikan(query, genre, page);
    },

    // ============================================
    // 2. ПОИСК ЧЕРЕЗ ANILIBRIA V1 (основной)
    // ============================================
    async _searchAnilibriaV1(query = '', genre = null, page = 1) {
        const perPage = 24;
        const params = {
            query: 'catalog',
            page: page,
            perPage: perPage,
            sort: '2', // сортировка по новизне
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
            const items = data.data.items.map(item => this._convertAnilibriaV1Item(item));
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
    // 3. ПОИСК ЧЕРЕЗ ANILIBRIA ALT (запасной)
    // ============================================
    async _searchAnilibriaAlt(query = '', genre = null, page = 1) {
        try {
            let url = `${this.ANILIBRIA_ALT_URL}/anime/catalog/releases?page=${page}&limit=24`;
            if (query && query.length > 1) {
                url += `&f[search]=${encodeURIComponent(query)}`;
            }
            if (genre) {
                url += `&f[genres]=${parseInt(genre)}`;
            }
            const data = await this._fetch(url);
            if (data && data.data && data.data.length > 0) {
                const items = data.data.map(item => this._convertAnilibriaAltItem(item));
                const totalPages = data.meta?.pagination?.total_pages || 1;
                return {
                    items: items,
                    totalPages: totalPages
                };
            }
        } catch (e) {
            console.log('⚠️ Anilibria alt не удался');
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 4. ПОИСК ЧЕРЕЗ JIKAN (запасной)
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
    // 5. ДЕТАЛИ (Anilibria v1)
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '').replace('jikan_', '');
        
        // Пробуем Anilibria v1
        const params = {
            query: 'release',
            id: cleanId
        };
        const data = await this._postAnilibria(params);
        if (data && data.status === true && data.data) {
            return this._convertAnilibriaV1Item(data.data);
        }

        // Пробуем Anilibria alt
        try {
            const url = `${this.ANILIBRIA_ALT_URL}/anime/releases/${cleanId}`;
            const altData = await this._fetch(url);
            if (altData && altData.id) {
                return this._convertAnilibriaAltItem(altData);
            }
        } catch (e) {}

        // Пробуем Jikan
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
    // 6. РАСПИСАНИЕ (Anilibria v1)
    // ============================================
    async getSchedule() {
        const params = { query: 'schedule' };
        const data = await this._postAnilibria(params);
        if (data && data.status === true && Array.isArray(data.data)) {
            return data.data.map(dayObj => ({
                day: parseInt(dayObj.day) - 1,
                list: dayObj.items.map(item => this._convertAnilibriaV1Item(item))
            }));
        }
        return [];
    },

    // ============================================
    // 7. РЕКОМЕНДАЦИИ (Anilibria v1)
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
            return data.data.items.map(item => this._convertAnilibriaV1Item(item));
        }
        return [];
    },

    // ============================================
    // 8. СЛУЧАЙНОЕ (Anilibria v1)
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
    // 9. АВТОДОПОЛНЕНИЕ (Anilibria v1)
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
    // 10. КОНВЕРТАЦИЯ ANILIBRIA V1
    // ============================================
    _convertAnilibriaV1Item(item) {
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
    // 11. КОНВЕРТАЦИЯ ANILIBRIA ALT
    // ============================================
    _convertAnilibriaAltItem(item) {
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
            source: 'Anilibria alt',
            _raw: item
        };
    },

    // ============================================
    // 12. КОНВЕРТАЦИЯ JIKAN
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

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Jikan + Anilibria.tv) загружен');

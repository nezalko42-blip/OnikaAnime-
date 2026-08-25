// ============================================
// API МОДУЛЬ ONIKAANIME (Shikimori API + Прокси)
// ============================================

const API = {
    PROXY_URL: 'https://cors-anywhere.herokuapp.com/',
    BASE_URL: 'https://shikimori.one/api',

    // ===== БАЗОВЫЙ ЗАПРОС =====
    async _fetch(url, options = {}) {
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'OnikaAnime/2.0',
            ...options.headers
        };
        
        const proxyUrl = this.PROXY_URL + url;
        
        try {
            console.log('📡 Запрос:', proxyUrl);
            const response = await fetch(proxyUrl, { 
                ...options, 
                headers: {
                    ...headers,
                    'Origin': window.location.origin
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📦 Ответ:', data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            try {
                console.log('🔄 Пробуем без прокси...');
                const response = await fetch(url, { ...options, headers });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                console.log('📦 Ответ (без прокси):', data);
                return data;
            } catch (e) {
                console.error('❌ Вторая попытка ошибка:', e.message);
                return null;
            }
        }
    },

    // ============================================
    // 1. КАТАЛОГ И ПОИСК
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        const limit = 24;
        const offset = (page - 1) * limit;

        let url = `${this.BASE_URL}/animes?limit=${limit}&offset=${offset}`;

        if (query && query.length > 1) {
            url += `&search=${encodeURIComponent(query)}`;
        }

        if (genre) {
            const genreMap = {
                '1': 'action',
                '8': 'drama',
                '21': 'comedy',
                '10': 'fantasy',
                '22': 'romance'
            };
            const genreName = genreMap[genre];
            if (genreName) {
                url += `&genre=${genreName}`;
            }
        }

        url += `&order=popularity`;

        const data = await this._fetch(url);

        if (data && Array.isArray(data)) {
            const items = data.map(item => this._convertItem(item));
            const totalPages = data.length < limit ? page : page + 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 2. ПОИСК
    // ============================================
    async _searchTitles(query, page = 1) {
        const limit = 24;
        const offset = (page - 1) * limit;
        const url = `${this.BASE_URL}/animes?search=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            const items = data.map(item => this._convertItem(item));
            const totalPages = data.length < limit ? page : page + 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 3. ДЕТАЛИ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('shikimori_', '');
        const url = `${this.BASE_URL}/animes/${cleanId}`;
        const data = await this._fetch(url);
        if (data && data.id) {
            return this._convertItem(data);
        }
        return null;
    },

    // ============================================
    // 4. СЛУЧАЙНОЕ
    // ============================================
    async getRandomReleases(limit = 1) {
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const offset = (randomPage - 1) * 24;
        const url = `${this.BASE_URL}/animes?limit=${limit}&offset=${offset}`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data) && data.length > 0) {
            return data.slice(0, limit).map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 5. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 6) {
        const url = `${this.BASE_URL}/animes?limit=${limit}&order=popularity`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            return data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 6. АВТОДОПОЛНЕНИЕ
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const url = `${this.BASE_URL}/animes?search=${encodeURIComponent(query)}&limit=${limit}`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            return data.map(item => ({
                id: item.id,
                title: item.russian || item.name || 'Без названия',
                poster: item.poster?.medium?.url || item.poster?.small?.url || ''
            }));
        }
        return [];
    },

    // ============================================
    // 7. КОНВЕРТАЦИЯ
    // ============================================
    _convertItem(item) {
        let img = '';
        if (item.poster) {
            const poster = item.poster.medium || item.poster.small || item.poster.original;
            if (poster && poster.url) {
                img = poster.url;
                if (img.startsWith('/')) {
                    img = 'https://shikimori.one' + img;
                }
            }
        }

        const title = item.russian || item.name || 'Без названия';
        const title_russian = item.russian || '';
        const title_english = item.name || '';

        const genres = (item.genres || []).map(g => g.russian || g.name);
        const year = item.year || item.released_on?.split('-')[0] || '--';
        const episodes = item.episodes || item.episodes_aired || '?';

        return {
            mal_id: 'shikimori_' + item.id,
            id: item.id,
            title: title,
            title_russian: title_russian,
            title_english: title_english,
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: item.description || item.description_en || 'Описание отсутствует',
            genres: genres,
            score: item.score || 0,
            russian: title_russian,
            source: 'Shikimori',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Shikimori + прокси) загружен');

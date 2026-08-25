// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria v2)
// ============================================

const API = {
    BASE_URL: 'https://api.anilibria.tv/v2',

    // ===== БАЗОВЫЙ GET-ЗАПРОС =====
    async _fetch(url) {
        try {
            console.log('📡 Запрос:', url);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📦 Ответ:', data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ – /getUpdates
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        const limit = 24;
        const offset = (page - 1) * limit;
        let url = `${this.BASE_URL}/getUpdates?limit=${limit}&offset=${offset}`;

        if (query && query.length > 1) {
            return await this._searchTitles(query, page);
        }

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
    // 2. ПОИСК – /searchTitles
    // ============================================
    async _searchTitles(query, page = 1) {
        const limit = 24;
        const offset = (page - 1) * limit;
        const url = `${this.BASE_URL}/searchTitles?search=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
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
    // 3. РАСПИСАНИЕ – /getSchedule
    // ============================================
    async getSchedule() {
        const url = `${this.BASE_URL}/getSchedule`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            return data;
        }
        return [];
    },

    // ============================================
    // 4. ДЕТАЛИ – /getTitle
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const url = `${this.BASE_URL}/getTitle?id=${cleanId}`;
        const data = await this._fetch(url);
        if (data && data.id) {
            return this._convertItem(data);
        }
        return null;
    },

    // ============================================
    // 5. СЛУЧАЙНОЕ – /getRandomTitle
    // ============================================
    async getRandomReleases(limit = 1) {
        const url = `${this.BASE_URL}/getRandomTitle`;
        const data = await this._fetch(url);
        if (data && data.id) {
            return [this._convertItem(data)];
        }
        return [];
    },

    // ============================================
    // 6. РЕКОМЕНДАЦИИ – /getUpdates с лимитом
    // ============================================
    async getRecommended(limit = 6) {
        const url = `${this.BASE_URL}/getUpdates?limit=${limit}`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            return data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 7. АВТОДОПОЛНЕНИЕ – /searchTitles
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const url = `${this.BASE_URL}/searchTitles?search=${encodeURIComponent(query)}&limit=${limit}`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            return data.map(item => ({
                id: item.id,
                title: item.names?.ru || item.names?.en || 'Без названия',
                poster: item.posters?.medium?.url || item.posters?.small?.url || ''
            }));
        }
        return [];
    },

    // ============================================
    // 8. КОНВЕРТАЦИЯ
    // ============================================
    _convertItem(item) {
        let img = '';
        if (item.posters) {
            const poster = item.posters.medium || item.posters.small || item.posters.original;
            if (poster && poster.url) {
                img = poster.url;
                if (img.startsWith('/')) {
                    img = 'https://api.anilibria.tv' + img;
                }
            }
        }

        const names = item.names || {};
        const title = names.ru || names.en || 'Без названия';
        const title_russian = names.ru || '';
        const title_english = names.en || '';

        const genres = item.genres || [];
        const year = item.year || '--';
        const episodes = item.episodes?.string || item.episodes_total || '?';

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
            source: 'Anilibria v2',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Anilibria v2) загружен');

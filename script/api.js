// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria API v1)
// Современное REST API: https://anilibria.top/api/v1
// ============================================

const API = {
    BASE_URL: 'https://anilibria.top/api/v1',

    // ===== БАЗОВЫЙ GET-ЗАПРОС =====
    async _get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        
        try {
            console.log('📡 GET:', fullUrl);
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📦 Ответ:', data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    // ===== БАЗОВЫЙ POST-ЗАПРОС =====
    async _post(url, body = {}) {
        try {
            console.log('📡 POST:', url, body);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
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
    // 1. КАТАЛОГ (POST /anime/catalog/releases)
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        const body = {
            page: page,
            limit: 24,
            f: {}
        };

        if (query && query.length > 1) {
            body.f.search = query;
        }

        if (genre) {
            body.f.genres = [parseInt(genre)];
        }

        // Сортировка по умолчанию - свежие
        body.f.sorting = filters.sorting || 'FRESH_AT_DESC';

        // Дополнительные фильтры
        if (filters.types && filters.types.length) {
            body.f.types = filters.types;
        }
        if (filters.seasons && filters.seasons.length) {
            body.f.seasons = filters.seasons;
        }
        if (filters.years) {
            if (filters.years.from) body.f.years = { from_year: filters.years.from };
            if (filters.years.to) body.f.years = { ...body.f.years, to_year: filters.years.to };
        }

        const data = await this._post(`${this.BASE_URL}/anime/catalog/releases`, body);
        
        if (data && data.list && data.list.length > 0) {
            const items = data.list.map(item => this._convertItem(item));
            const totalPages = data.pagination?.total_pages || 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 2. ПОИСК (GET /app/search/releases)
    // ============================================
    async searchTitles(query, page = 1) {
        const params = {
            query: query,
            limit: 24,
            page: page,
            include: 'id,type.genres'
        };
        const data = await this._get(`${this.BASE_URL}/app/search/releases`, params);
        if (data && data.list && data.list.length > 0) {
            const items = data.list.map(item => this._convertItem(item));
            const totalPages = data.pagination?.total_pages || 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 3. РАСПИСАНИЕ (GET /anime/schedule/week)
    // ============================================
    async getSchedule() {
        const data = await this._get(`${this.BASE_URL}/anime/schedule/week`);
        if (data && Array.isArray(data)) {
            return data.map(dayObj => ({
                day: dayObj.day,
                list: dayObj.list.map(item => this._convertItem(item))
            }));
        }
        return [];
    },

    // ============================================
    // 4. ДЕТАЛИ (GET /anime/releases/{id})
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const params = {
            include: 'id,type.genres,description,player,torrents'
        };
        const data = await this._get(`${this.BASE_URL}/anime/releases/${cleanId}`, params);
        if (data && data.id) {
            return this._convertItem(data);
        }
        return null;
    },

    // ============================================
    // 5. СЛУЧАЙНОЕ (GET /anime/releases/random)
    // ============================================
    async getRandomReleases(limit = 1) {
        const params = {
            limit: limit,
            include: 'id,type.genres'
        };
        const data = await this._get(`${this.BASE_URL}/anime/releases/random`, params);
        if (data && Array.isArray(data)) {
            return data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 6. РЕКОМЕНДАЦИИ (GET /anime/releases/recommended)
    // ============================================
    async getRecommended(limit = 6) {
        const params = {
            limit: limit,
            include: 'id,type.genres'
        };
        const data = await this._get(`${this.BASE_URL}/anime/releases/recommended`, params);
        if (data && Array.isArray(data)) {
            return data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 7. АВТОДОПОЛНЕНИЕ (GET /app/search/releases)
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const params = {
            query: query,
            limit: limit,
            include: 'id,type.genres'
        };
        const data = await this._get(`${this.BASE_URL}/app/search/releases`, params);
        if (data && data.list && data.list.length > 0) {
            return data.list.map(item => ({
                id: item.id,
                title: this._convertItem(item).title,
                poster: this._getPosterUrl(item.poster)
            }));
        }
        return [];
    },

    // ============================================
    // 8. СПРАВОЧНИКИ
    // ============================================
    async getGenres() {
        const data = await this._get(`${this.BASE_URL}/anime/catalog/references/genres`);
        return data || [];
    },

    async getTypes() {
        const data = await this._get(`${this.BASE_URL}/anime/catalog/references/types`);
        return data || [];
    },

    async getSeasons() {
        const data = await this._get(`${this.BASE_URL}/anime/catalog/references/seasons`);
        return data || [];
    },

    async getYears() {
        const data = await this._get(`${this.BASE_URL}/anime/catalog/references/years`);
        return data || [];
    },

    // ============================================
    // 9. КОНВЕРТАЦИЯ ЭЛЕМЕНТА
    // ============================================
    _getPosterUrl(poster) {
        if (!poster) return '';
        const optimized = poster.optimized || poster;
        return optimized.preview || optimized.thumbnail || poster.preview || poster.thumbnail || '';
    },

    _convertItem(item) {
        // Постер
        let img = this._getPosterUrl(item.poster);
        if (img && img.startsWith('/')) {
            img = 'https://anilibria.top' + img;
        }

        // Названия
        const name = item.name || {};
        const title = name.main || name.english || name.alternative || 'Без названия';
        const title_russian = name.main || '';
        const title_english = name.english || '';

        // Жанры
        const genres = (item.genres || []).map(g => g.name || g);

        // Год и серии
        const year = item.year || '--';
        const episodes = item.episodes_total || item.episodes?.total || '?';

        // Возрастной рейтинг
        const ageRating = item.age_rating?.label || '0+';

        return {
            mal_id: 'anilibria_' + item.id,
            id: item.id,
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
            age_rating: ageRating,
            source: 'Anilibria v1',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Anilibria v1) загружен');

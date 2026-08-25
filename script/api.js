// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria API v1)
// GET /anime/catalog/releases для каталога (быстрее)
// НОВИНКИ — CREATED_AT_DESC
// ============================================

const API = {
    BASE_URL: 'https://anilibria.top/api/v1',

    // ===== БАЗОВЫЙ GET-ЗАПРОС =====
    async _get(endpoint, params = {}) {
        // Очищаем параметры
        const cleanParams = {};
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                if (Array.isArray(params[key]) && params[key].length === 0) continue;
                cleanParams[key] = params[key];
            }
        }
        
        const queryString = new URLSearchParams(cleanParams).toString();
        const url = queryString ? `${this.BASE_URL}${endpoint}?${queryString}` : `${this.BASE_URL}${endpoint}`;
        
        try {
            console.log('📡 GET:', url);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
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
            console.error('❌ GET Error:', error.message);
            return null;
        }
    },

    // ===== БАЗОВЫЙ POST-ЗАПРОС =====
    async _post(endpoint, body = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        
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
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            const data = await response.json();
            console.log('📦 Ответ:', data);
            return data;
        } catch (error) {
            console.error('❌ POST Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ (GET /anime/catalog/releases) — БЫСТРЫЙ
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        // Формируем параметры для GET-запроса
        const params = {
            page: page,
            limit: 24,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player'
        };

        // Поисковый запрос
        if (query && query.length > 1) {
            params['f[search]'] = query;
        }

        // Жанры
        if (genre) {
            params['f[genres]'] = [parseInt(genre)];
        } else if (filters.genres && filters.genres.length) {
            params['f[genres]'] = filters.genres.map(g => parseInt(g));
        }

        // Типы
        if (filters.types && filters.types.length) {
            params['f[types]'] = filters.types;
        }

        // Сезоны
        if (filters.seasons && filters.seasons.length) {
            params['f[seasons]'] = filters.seasons;
        }

        // Годы
        if (filters.year_from) {
            params['f[years][from_year]'] = filters.year_from;
        }
        if (filters.year_to) {
            params['f[years][to_year]'] = filters.year_to;
        }

        // НОВИНКИ — сортировка по дате создания
        params['f[sorting]'] = filters.sorting || 'CREATED_AT_DESC';

        // Возрастные рейтинги
        if (filters.age_ratings && filters.age_ratings.length) {
            params['f[age_ratings]'] = filters.age_ratings;
        }

        // Статусы публикации
        if (filters.publish_statuses && filters.publish_statuses.length) {
            params['f[publish_statuses]'] = filters.publish_statuses;
        }

        // Статусы производства
        if (filters.production_statuses && filters.production_statuses.length) {
            params['f[production_statuses]'] = filters.production_statuses;
        }

        const data = await this._get('/anime/catalog/releases', params);
        
        if (data && data.data && data.data.length > 0) {
            const items = data.data.map(item => this._convertItem(item));
            const totalPages = data.meta?.pagination?.total_pages || 1;
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
        if (!query || query.length < 2) return { items: [], totalPages: 1 };
        
        const params = {
            query: query,
            limit: 24,
            page: page,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres'
        };
        const data = await this._get('/app/search/releases', params);
        console.log('🔍 Поиск данных:', data);
        
        if (data && data.data && data.data.length > 0) {
            const items = data.data.map(item => this._convertItem(item));
            const totalPages = data.meta?.pagination?.total_pages || 1;
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
        const params = {
            include: 'id,type.genres,name,poster,year,episodes_total'
        };
        const data = await this._get('/anime/schedule/week', params);
        if (data && Array.isArray(data)) {
            return data.map(dayObj => ({
                day: dayObj.day,
                list: (dayObj.list || []).map(item => this._convertItem(item))
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
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player'
        };
        const data = await this._get(`/anime/releases/${cleanId}`, params);
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
            include: 'id,type.genres,name,poster,year,episodes_total'
        };
        const data = await this._get('/anime/releases/random', params);
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
            include: 'id,type.genres,name,poster,year,episodes_total'
        };
        const data = await this._get('/anime/releases/recommended', params);
        console.log('🔥 Рекомендации данные:', data);
        
        if (data && Array.isArray(data) && data.length > 0) {
            return data.map(item => this._convertItem(item));
        }
        
        // Если рекомендаций нет — берём последние релизы (быстро)
        const fallbackParams = {
            page: 1,
            limit: limit,
            'f[sorting]': 'CREATED_AT_DESC',
            include: 'id,type.genres,name,poster,year,episodes_total'
        };
        const fallbackData = await this._get('/anime/catalog/releases', fallbackParams);
        if (fallbackData && fallbackData.data && fallbackData.data.length > 0) {
            return fallbackData.data.map(item => this._convertItem(item));
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
            include: 'id,name,poster'
        };
        const data = await this._get('/app/search/releases', params);
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => ({
                id: 'anilibria_' + item.id,
                title: item.name?.main || item.name?.english || 'Без названия',
                poster: this._getPosterUrl(item.poster)
            }));
        }
        return [];
    },

    // ============================================
    // 8. ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
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
        const ageRating = item.age_rating?.label || item.age_rating?.value || '0+';

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
            age_rating: ageRating,
            russian: title_russian,
            source: 'Anilibria v1',
            external_player: item.external_player || null,
            _raw: item
        };
    },

    // ============================================
    // 9. СПРАВОЧНИКИ ДЛЯ ФИЛЬТРОВ
    // ============================================
    async getGenres() {
        const data = await this._get('/anime/catalog/references/genres');
        return data || [];
    },

    async getTypes() {
        const data = await this._get('/anime/catalog/references/types');
        return data || [];
    },

    async getSeasons() {
        const data = await this._get('/anime/catalog/references/seasons');
        return data || [];
    },

    async getYears() {
        const data = await this._get('/anime/catalog/references/years');
        return data || [];
    },

    async getAgeRatings() {
        const data = await this._get('/anime/catalog/references/age-ratings');
        return data || [];
    },

    async getPublishStatuses() {
        const data = await this._get('/anime/catalog/references/publish-statuses');
        return data || [];
    },

    async getProductionStatuses() {
        const data = await this._get('/anime/catalog/references/production-statuses');
        return data || [];
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (GET каталог) загружен');

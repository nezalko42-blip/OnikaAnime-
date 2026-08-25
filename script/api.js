// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria API v1)
// С ИСПРАВЛЕННЫМИ ЖАНРАМИ И НОВИНКАМИ
// ============================================

const API = {
    BASE_URL: 'https://anilibria.top/api/v1',

    // ===== КЭШ =====
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

    // ===== БАЗОВЫЙ GET-ЗАПРОС С КЭШИРОВАНИЕМ =====
    async _get(endpoint, params = {}, useCache = true) {
        const cacheKey = endpoint + '|' + JSON.stringify(params);
        
        if (useCache && this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
                console.log('💾 Кэш GET:', endpoint);
                return cached.data;
            } else {
                this._cache.delete(cacheKey);
            }
        }

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
            
            if (useCache && data) {
                this._cache.set(cacheKey, { data, time: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ GET Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ (С ПРАВИЛЬНЫМИ ЖАНРАМИ И НОВИНКАМИ)
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        // Если выбраны НОВИНКИ (genre === 'latest')
        if (genre === 'latest') {
            return await this._getLatestReleases(24);
        }

        // Если это первая страница и нет поиска и фильтров — показываем новинки
        if (page === 1 && !query && !genre && Object.keys(filters).length === 0) {
            return await this._getLatestReleases(24);
        }

        const params = {
            page: page,
            limit: 24,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing,player,status'
        };

        // Поисковый запрос
        if (query && query.length > 1) {
            params['f[search]'] = query;
        }

        // ===== ЖАНРЫ — ПРАВИЛЬНЫЙ ФОРМАТ =====
        let genresArray = [];
        
        if (genre && genre !== 'latest') {
            genresArray = [parseInt(genre)];
        } else if (filters.genres && filters.genres.length) {
            genresArray = filters.genres.map(g => parseInt(g));
        }

        if (genresArray.length > 0) {
            genresArray.forEach((g, index) => {
                params[`f[genres][${index}]`] = g;
            });
        }

        // Типы
        if (filters.types && filters.types.length) {
            filters.types.forEach((t, index) => {
                params[`f[types][${index}]`] = t;
            });
        }

        // Сезоны
        if (filters.seasons && filters.seasons.length) {
            filters.seasons.forEach((s, index) => {
                params[`f[seasons][${index}]`] = s;
            });
        }

        // Годы
        if (filters.year_from) {
            params['f[years][from_year]'] = filters.year_from;
        }
        if (filters.year_to) {
            params['f[years][to_year]'] = filters.year_to;
        }

        // Сортировка
        params['f[sorting]'] = filters.sorting || 'CREATED_AT_DESC';

        // Возрастные рейтинги
        if (filters.age_ratings && filters.age_ratings.length) {
            filters.age_ratings.forEach((a, index) => {
                params[`f[age_ratings][${index}]`] = a;
            });
        }

        // Статусы публикации
        if (filters.publish_statuses && filters.publish_statuses.length) {
            filters.publish_statuses.forEach((p, index) => {
                params[`f[publish_statuses][${index}]`] = p;
            });
        }

        // Статусы производства
        if (filters.production_statuses && filters.production_statuses.length) {
            filters.production_statuses.forEach((p, index) => {
                params[`f[production_statuses][${index}]`] = p;
            });
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
    // 1.1. НОВИНКИ (СПЕЦИАЛЬНЫЙ БЫСТРЫЙ ЗАПРОС)
    // ============================================
    async _getLatestReleases(limit = 24) {
        const params = {
            limit: limit,
            'f[sorting]': 'CREATED_AT_DESC',
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing'
        };
        
        const data = await this._get('/anime/releases/latest', params, true);
        
        if (data && Array.isArray(data) && data.length > 0) {
            const items = data.map(item => this._convertItem(item));
            return {
                items: items,
                totalPages: 1
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
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites'
        };
        const data = await this._get('/app/search/releases', params, false);
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
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,publish_day'
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
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing,player,status,torrents'
        };
        const data = await this._get(`/anime/releases/${cleanId}`, params, false);
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
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,publish_day'
        };
        const data = await this._get('/anime/releases/random', params, false);
        if (data && Array.isArray(data)) {
            return data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 6. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 6) {
        const params = {
            limit: limit,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,publish_day,added_in_users_favorites'
        };
        const data = await this._get('/anime/releases/recommended', params, true);
        console.log('🔥 Рекомендации данные:', data);
        
        if (data && Array.isArray(data) && data.length > 0) {
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
            include: 'id,name,poster'
        };
        const data = await this._get('/app/search/releases', params, false);
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
    // 8. КОНВЕРТАЦИЯ
    // ============================================
    _getPosterUrl(poster) {
        if (!poster) return '';
        const optimized = poster.optimized || poster;
        return optimized.preview || optimized.thumbnail || poster.preview || poster.thumbnail || '';
    },

    _convertItem(item) {
        let img = this._getPosterUrl(item.poster);
        if (img && img.startsWith('/')) {
            img = 'https://anilibria.top' + img;
        }

        const name = item.name || {};
        const title = name.main || name.english || name.alternative || 'Без названия';
        const title_russian = name.main || '';
        const title_english = name.english || '';

        const genres = (item.genres || []).map(g => g.name || g);
        const year = item.year || '--';
        const episodes = item.episodes_total || item.episodes?.total || '?';
        const ageRating = item.age_rating?.label || item.age_rating?.value || '0+';
        const status = item.status?.string || item.status || 'Неизвестно';
        const isOngoing = item.is_ongoing || false;

        const publishDay = item.publish_day?.description || null;
        const favoritesCount = item.added_in_users_favorites || 0;
        const duration = item.average_duration_of_episode || null;
        const createdAt = item.created_at || null;
        const updatedAt = item.updated_at || null;
        const externalPlayer = item.external_player || null;

        let videoLinks = null;
        let episodesList = null;
        let totalEpisodes = null;

        if (item.player) {
            totalEpisodes = item.player.episodes || null;
            
            if (item.player.list) {
                episodesList = Object.values(item.player.list).map(ep => ({
                    episode: ep.episode || ep.serie || 0,
                    name: ep.name || null,
                    uuid: ep.uuid || null,
                    created_timestamp: ep.created_timestamp || null,
                    preview: ep.preview || null,
                    hls: ep.hls ? {
                        fhd: ep.hls.fhd || null,
                        hd: ep.hls.hd || null,
                        sd: ep.hls.sd || null
                    } : null,
                    skips: ep.skips || null
                })).sort((a, b) => a.episode - b.episode);
            }

            if (episodesList && episodesList.length > 0) {
                const firstEp = episodesList[0];
                if (firstEp.hls) {
                    videoLinks = firstEp.hls;
                }
            }
        }

        let torrents = null;
        if (item.torrents && item.torrents.list) {
            torrents = item.torrents.list.map(t => ({
                torrent_id: t.torrent_id,
                episodes: t.episodes || null,
                quality: t.quality ? {
                    string: t.quality.string || null,
                    type: t.quality.type || null,
                    resolution: t.quality.resolution || null,
                    encoder: t.quality.encoder || null,
                    lq_audio: t.quality.lq_audio || null
                } : null,
                leechers: t.leechers || 0,
                seeders: t.seeders || 0,
                downloads: t.downloads || 0,
                total_size: t.total_size || 0,
                size_string: t.size_string || null,
                url: t.url || null,
                magnet: t.magnet || null,
                uploaded_timestamp: t.uploaded_timestamp || null,
                hash: t.hash || null
            }));
        }

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
            status: status,
            russian: title_russian,
            source: 'Anilibria v1',
            
            publish_day: publishDay,
            favorites_count: favoritesCount,
            duration: duration,
            created_at: createdAt,
            updated_at: updatedAt,
            is_ongoing: isOngoing,
            external_player: externalPlayer,
            
            video_links: videoLinks,
            episodes_list: episodesList,
            total_episodes: totalEpisodes,
            
            torrents: torrents,
            
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
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (с жанрами и новинками) загружен');

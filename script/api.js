// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria API + Жанры)
// ============================================

const API = {
    BASE_URL: 'https://anilibria.top/api/v1',

    // ===== КЭШ =====
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

    // ===== БАЗОВЫЙ GET-ЗАПРОС =====
    async _get(endpoint, params = {}, useCache = true) {
        const cacheKey = endpoint + '|' + JSON.stringify(params);
        
        if (useCache && this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
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
            
            if (useCache && data) {
                this._cache.set(cacheKey, { data, time: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ GET Error:', error.message);
            return null;
        }
    },

    // ===== БАЗОВЫЙ POST-ЗАПРОС =====
    async _post(endpoint, body = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const cacheKey = endpoint + '|' + JSON.stringify(body);
        
        if (this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
                return cached.data;
            }
        }
        
        try {
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
            
            if (data) {
                this._cache.set(cacheKey, { data, time: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ POST Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ (POST с фильтрацией)
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        if (genre === 'latest') {
            return await this._getLatestReleases(24);
        }

        const body = {
            page: page,
            limit: 24,
            f: {},
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing,player,status'
        };

        if (query && query.length > 1) {
            body.f.search = query;
        }

        // Жанры
        let genresArray = [];
        if (genre && genre !== 'latest') {
            genresArray = [parseInt(genre)];
        } else if (filters.genres && filters.genres.length) {
            genresArray = filters.genres.map(g => parseInt(g));
        }

        if (genresArray.length > 0) {
            body.f.genres = genresArray;
        }

        if (filters.types && filters.types.length) {
            body.f.types = filters.types;
        }

        if (filters.seasons && filters.seasons.length) {
            body.f.seasons = filters.seasons;
        }

        if (filters.year_from || filters.year_to) {
            body.f.years = {};
            if (filters.year_from) body.f.years.from_year = filters.year_from;
            if (filters.year_to) body.f.years.to_year = filters.year_to;
        }

        body.f.sorting = filters.sorting || 'CREATED_AT_DESC';

        if (filters.age_ratings && filters.age_ratings.length) {
            body.f.age_ratings = filters.age_ratings;
        }

        if (filters.publish_statuses && filters.publish_statuses.length) {
            body.f.publish_statuses = filters.publish_statuses;
        }

        if (filters.production_statuses && filters.production_statuses.length) {
            body.f.production_statuses = filters.production_statuses;
        }

        const data = await this._post('/anime/catalog/releases', body);
        
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
    // 2. НОВИНКИ
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
        
        const fallbackBody = {
            page: 1,
            limit: limit,
            f: { sorting: 'CREATED_AT_DESC' },
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites'
        };
        const fallbackData = await this._post('/anime/catalog/releases', fallbackBody);
        if (fallbackData && fallbackData.data && fallbackData.data.length > 0) {
            const items = fallbackData.data.map(item => this._convertItem(item));
            return {
                items: items,
                totalPages: 1
            };
        }
        
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 3. ПОИСК
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
    // 4. РАСПИСАНИЕ
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
    // 5. ДЕТАЛИ АНИМЕ
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
    // 6. СЛУЧАЙНОЕ АНИМЕ
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
    // 7. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 6) {
        const params = {
            limit: limit,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,publish_day,added_in_users_favorites'
        };
        const data = await this._get('/anime/releases/recommended', params, true);
        
        if (data && Array.isArray(data) && data.length > 0) {
            return data.map(item => this._convertItem(item));
        }
        
        return [];
    },

    // ============================================
    // 8. АВТОДОПОЛНЕНИЕ
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
    // 9. РАБОТА С ЖАНРАМИ (НОВЫЕ МЕТОДЫ)
    // ============================================
    
    // 9.1. Получить все жанры
    async getGenres() {
        const data = await this._get('/anime/genres', {}, false);
        if (data && Array.isArray(data)) {
            return data.map(genre => ({
                id: genre.id,
                name: genre.name,
                description: genre.description,
                icon: this._getGenreIcon(genre.name)
            }));
        }
        return [];
    },

    // 9.2. Получить данные по конкретному жанру
    async getGenreDetails(genreId) {
        const data = await this._get(`/anime/genres/${genreId}`, {}, false);
        if (data) {
            return {
                id: data.id,
                name: data.name,
                description: data.description,
                releases_count: data.releases_count || 0
            };
        }
        return null;
    },

    // 9.3. Получить релизы по жанру
    async getReleasesByGenre(genreId, page = 1, limit = 24) {
        const params = {
            page: page,
            limit: limit,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites'
        };
        
        const data = await this._get(`/anime/genres/${genreId}/releases`, params, false);
        
        if (data && data.data && data.data.length > 0) {
            const items = data.data.map(item => this._convertItem(item));
            const totalPages = data.meta?.pagination?.total_pages || 1;
            return {
                items: items,
                totalPages: totalPages,
                genre: data.meta?.genre || null
            };
        }
        return { items: [], totalPages: 1, genre: null };
    },

    // 9.4. Получить случайные жанры
    async getRandomGenres(limit = 3) {
        const params = { limit: limit };
        const data = await this._get('/anime/genres/random', params, false);
        if (data && Array.isArray(data)) {
            return data.map(genre => ({
                id: genre.id,
                name: genre.name,
                description: genre.description,
                icon: this._getGenreIcon(genre.name)
            }));
        }
        return [];
    },

    // 9.5. Получить случайные жанры для главной
    async getRandomGenresForHome(limit = 4) {
        const genres = await this.getGenres();
        if (genres && genres.length > 0) {
            const shuffled = genres.sort(() => 0.5 - Math.random());
            return shuffled.slice(0, limit);
        }
        return [];
    },

    // Вспомогательный метод для иконок жанров
    _getGenreIcon(genreName) {
        const icons = {
            'Экшен': '⚔️',
            'Приключения': '🗺️',
            'Комедия': '😂',
            'Драма': '🎭',
            'Фэнтези': '🧙',
            'Романтика': '💕',
            'Научная фантастика': '🚀',
            'Повседневность': '🏠',
            'Триллер': '🔪',
            'Ужасы': '👻',
            'Мистика': '🔮',
            'Спорт': '⚽',
            'Детектив': '🔍',
            'Психологическое': '🧠',
            'Историческое': '🏯',
            'Музыка': '🎵',
            'Пародия': '🎭',
            'Сёдзё': '👧',
            'Сёнэн': '👦',
            'Дзёсэй': '👩',
            'Сэйнэн': '👨',
            'Меха': '🤖',
            'Киберпанк': '💻',
            'Постапокалипсис': '🌆',
            'Самураи': '⚔️',
            'Вампиры': '🧛',
            'Демоны': '👿',
            'Магия': '🔮'
        };
        return icons[genreName] || '📚';
    },

    // ============================================
    // 10. КОНВЕРТАЦИЯ ДАННЫХ
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
    // 11. СПРАВОЧНИКИ (для фильтров)
    // ============================================
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
console.log('✅ API модуль (с поддержкой жанров) загружен');

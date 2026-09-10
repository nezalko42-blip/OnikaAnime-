// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria + Shikimori GraphQL)
// ============================================

const API = {
    BASE_URL: 'https://anilibria.top/api/v1',
    SHIKIMORI_PROXY: '/api/shikimori',

    _cache: new Map(),
    _cacheTTL: 15 * 60 * 1000,
    
    _shikimoriCache: new Map(),
    _shikimoriCacheTTL: 60 * 60 * 1000, // 1 час

    // ===== БАЗОВЫЙ GET =====
    async _get(endpoint, params = {}, useCache = true) {
        const cacheKey = endpoint + '|' + JSON.stringify(params);
        
        if (useCache && this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
                return cached.data;
            }
            this._cache.delete(cacheKey);
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
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
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

    // ===== БАЗОВЫЙ POST =====
    async _post(endpoint, body = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const cacheKey = 'POST|' + endpoint + '|' + JSON.stringify(body);
        
        if (this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
                return cached.data;
            }
            this._cache.delete(cacheKey);
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            const data = await response.json();
            
            if (data) this._cache.set(cacheKey, { data, time: Date.now() });
            
            return data;
        } catch (error) {
            console.error('❌ POST Error:', error.message);
            return null;
        }
    },

    // ============================================
    // SHIKIMORI GRAPHQL — ПОЛУЧЕНИЕ РУССКИХ НАЗВАНИЙ
    // ============================================
    async getShikimoriTitle(query, year = null) {
        if (!query || query.length < 2) return null;
        
        const cacheKey = query.toLowerCase().trim() + '|' + (year || '');
        if (this._shikimoriCache.has(cacheKey)) {
            const cached = this._shikimoriCache.get(cacheKey);
            if (Date.now() - cached.time < this._shikimoriCacheTTL) {
                return cached.data;
            }
        }
        
        try {
            const graphqlQuery = `{
                animes(search: ${JSON.stringify(query)}, limit: 8) {
                    id
                    malId
                    name
                    russian
                    english
                    japanese
                    synonyms
                    year: airedOn { year }
                    episodes
                    score
                    status
                    kind
                    poster { originalUrl mainUrl }
                    description
                    genres { id name russian kind }
                    studios { id name }
                }
            }`;
            
            const response = await fetch(this.SHIKIMORI_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: graphqlQuery })
            });
            
            if (!response.ok) throw new Error('Proxy HTTP ' + response.status);
            
            const data = await response.json();
            const animes = data?.data?.animes || [];
            
            if (animes.length === 0) {
                console.log('⚠️ Shikimori: ничего не найдено для', query);
                return null;
            }
            
            // Выбираем лучшее совпадение
            let best = animes[0];
            
            // Приоритет по году
            if (year) {
                const yearNum = parseInt(year);
                const withSameYear = animes.find(a => a.year?.year === yearNum);
                if (withSameYear) best = withSameYear;
            }
            
            // Приоритет по названию (точное совпадение)
            const queryLower = query.toLowerCase().trim();
            const exactMatch = animes.find(a => 
                (a.name || '').toLowerCase() === queryLower ||
                (a.russian || '').toLowerCase() === queryLower ||
                (a.english || '').toLowerCase() === queryLower
            );
            if (exactMatch) best = exactMatch;
            
            const result = {
                id: best.id,
                malId: best.malId,
                title: best.russian || best.name,
                titleRussian: best.russian || '',
                titleEnglish: best.english || '',
                titleOriginal: best.name || '',
                titleJapanese: best.japanese || '',
                synonyms: best.synonyms || [],
                year: best.year?.year,
                episodes: best.episodes,
                score: best.score,
                status: best.status,
                kind: best.kind,
                poster: best.poster?.originalUrl || best.poster?.mainUrl,
                description: best.description,
                genres: (best.genres || []).map(g => g.russian || g.name),
                studios: (best.studios || []).map(s => s.name)
            };
            
            console.log('✅ Shikimori:', result.titleRussian || result.title);
            
            this._shikimoriCache.set(cacheKey, { data: result, time: Date.now() });
            return result;
        } catch (e) {
            console.warn('⚠️ Shikimori ошибка:', e.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        if (genre === 'latest') {
            return await this._getLatestReleases(48);
        }

        const body = {
            page: page,
            limit: 24,
            f: {},
            include: 'id,type,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing,player,status,alias,publish_status'
        };

        if (query && query.length > 1) body.f.search = query;

        let genresArray = [];
        if (genre && genre !== 'latest') {
            genresArray = [parseInt(genre)];
        } else if (filters.genres && filters.genres.length) {
            genresArray = filters.genres.map(g => parseInt(g));
        }

        if (genresArray.length > 0) body.f.genres = genresArray;

        if (filters.year_from || filters.year_to) {
            body.f.years = {};
            if (filters.year_from) body.f.years.from_year = filters.year_from;
            if (filters.year_to) body.f.years.to_year = filters.year_to;
        }

        body.f.sorting = filters.sorting || 'CREATED_AT_DESC';
        if (filters.age_ratings && filters.age_ratings.length) body.f.age_ratings = filters.age_ratings;

        const data = await this._post('/anime/catalog/releases', body);
        
        if (data && data.data && data.data.length > 0) {
            const items = data.data.map(item => this._convertItem(item));
            const totalPages = data.meta?.pagination?.total_pages || 1;
            return {
                items: items,
                totalPages: totalPages,
                totalCount: data.meta?.pagination?.total_items || items.length
            };
        }
        return { items: [], totalPages: 1, totalCount: 0 };
    },

    async getByGenre(genreId, page = 1, limit = 24) {
        try {
            const params = {
                page: page,
                limit: limit,
                include: 'id,type,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,alias,status'
            };
            
            const data = await this._get(`/anime/genres/${genreId}/releases`, params, true);
            
            if (data) {
                let items = [];
                if (data.data && Array.isArray(data.data)) items = data.data;
                else if (Array.isArray(data)) items = data;
                
                if (items.length > 0) {
                    const converted = items.map(item => this._convertItem(item));
                    return {
                        items: converted,
                        totalPages: data.meta?.pagination?.total_pages || 1,
                        totalCount: data.meta?.pagination?.total_items || converted.length
                    };
                }
            }
        } catch(e) {}
        
        return await this.searchAll('', genreId, page, {});
    },

    // ============================================
    // 2. ПОИСК
    // ============================================
    async searchTitles(query, page = 1) {
        if (!query || query.length < 1) return { items: [], totalPages: 1, totalCount: 0 };
        
        const params = {
            query: query,
            limit: 48,
            page: page,
            include: 'id,type,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,alias,player,status,publish_status'
        };
        
        const data = await this._get('/app/search/releases', params, true);
        
        if (data && data.data && data.data.length > 0) {
            const items = data.data.map(item => this._convertItem(item));
            return {
                items: items,
                totalPages: data.meta?.pagination?.total_pages || 1,
                totalCount: data.meta?.pagination?.total_items || items.length
            };
        }
        
        return { items: [], totalPages: 1, totalCount: 0 };
    },

    // ============================================
    // 3. НОВИНКИ
    // ============================================
    async _getLatestReleases(limit = 48) {
        const params = {
            limit: limit,
            include: 'id,type,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,alias,player,status,publish_status'
        };
        
        let data = await this._get('/anime/releases/latest', params, true);
        
        if (data && Array.isArray(data) && data.length > 0) {
            const items = data.map(item => this._convertItem(item));
            return { items, totalPages: 1, totalCount: items.length };
        }
        
        return { items: [], totalPages: 1, totalCount: 0 };
    },

    // ============================================
    // 4. ДЕТАЛИ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const params = {
            include: 'id,player,episodes_total,external_player,name,poster,year,description,genres,age_rating,status,torrents,alias,publish_day,added_in_users_favorites,type,publish_status'
        };
        const data = await this._get(`/anime/releases/${cleanId}`, params, false);
        
        if (data && data.id) {
            const item = this._convertItem(data);
            return item;
        }
        return null;
    },

    // ============================================
    // 5. СЛУЧАЙНОЕ
    // ============================================
    async getRandomReleases(limit = 1) {
        const params = {
            limit: limit,
            include: 'id,type,name,poster,year,episodes_total,description,genres,age_rating,publish_day,alias,status'
        };
        const data = await this._get('/anime/releases/random', params, false);
        if (data && Array.isArray(data)) return data.map(item => this._convertItem(item));
        return [];
    },

    // ============================================
    // 6. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 6) {
        const params = {
            limit: limit,
            include: 'id,type,name,poster,year,episodes_total,description,genres,age_rating,publish_day,alias,status'
        };
        const data = await this._get('/anime/releases/recommended', params, true);
        
        if (data && Array.isArray(data) && data.length > 0) {
            return data.map(item => this._convertItem(item));
        }
        
        const fallback = await this._getLatestReleases(limit);
        return fallback.items || [];
    },

    // ============================================
    // 7. АВТОДОПОЛНЕНИЕ
    // ============================================
    async searchAutocomplete(query, limit = 10) {
        if (!query || query.length < 1) return [];
        
        const params = { query, limit, include: 'id,name,poster,year,alias' };
        const data = await this._get('/app/search/releases', params, true);
        
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => {
                let title = 'Без названия';
                if (item.name) {
                    if (typeof item.name === 'string') title = item.name;
                    else if (typeof item.name === 'object') {
                        title = item.name.main || item.name.english || item.name.alternative || 'Без названия';
                    }
                }
                
                let poster = this._getPosterUrl(item.poster);
                if (poster && poster.startsWith('/')) poster = 'https://anilibria.top' + poster;
                
                return {
                    id: 'anilibria_' + item.id,
                    title: title,
                    poster: poster,
                    year: item.year || ''
                };
            });
        }
        return [];
    },

    // ============================================
    // 8. ЖАНРЫ И ВОЗРАСТ
    // ============================================
    async getGenres() {
        const data = await this._get('/anime/genres', {}, true);
        if (data && Array.isArray(data)) {
            return data.map(genre => {
                if (typeof genre === 'object' && genre !== null) {
                    return {
                        id: genre.id,
                        name: genre.name || 'Жанр',
                        icon: this._getGenreIcon(genre.name || '')
                    };
                }
                return { id: genre, name: String(genre), icon: '📚' };
            });
        }
        return [];
    },

    async getAgeRatings() {
        const data = await this._get('/anime/catalog/references/age-ratings', {}, true);
        if (data && Array.isArray(data)) {
            return data.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return {
                        value: item.value || item,
                        label: item.label || item.description || String(item.value || item)
                    };
                }
                return { value: item, label: String(item) };
            });
        }
        return [];
    },

    // ============================================
    // 9. ТОРРЕНТЫ
    // ============================================
    async getTorrentsByRelease(releaseId) {
        try {
            const params = {
                include: 'id,hash,size,type,color,codec,label,quality,magnet,filename,seeders,leechers,bitrate,sort_order'
            };
            const data = await this._get(`/anime/torrents/release/${releaseId}`, params, true);
            
            if (data) {
                let torrents = [];
                if (data.data && Array.isArray(data.data)) torrents = data.data;
                else if (Array.isArray(data)) torrents = data;
                
                if (torrents.length > 0) {
                    return torrents.map(t => ({
                        id: t.id,
                        hash: t.hash,
                        size: t.size || 0,
                        quality: t.quality?.description || 'Неизвестно',
                        magnet: t.magnet,
                        filename: t.filename,
                        seeders: t.seeders || 0,
                        leechers: t.leechers || 0
                    }));
                }
            }
            return [];
        } catch (error) {
            return [];
        }
    },

    // ============================================
    // 10. ВИДЕО ДЛЯ СЕРИЙ
    // ============================================
    async getVideoLinksForEpisode(releaseId, episode = 1) {
        try {
            const params = { include: 'id,player,episodes_total,external_player,name,alias' };
            const data = await this._get(`/anime/releases/${releaseId}`, params, false);
            
            if (!data || !data.id) return null;
            
            let title = 'Аниме';
            if (data.name) {
                if (typeof data.name === 'string') title = data.name;
                else if (typeof data.name === 'object') {
                    title = data.name.main || data.name.english || 'Аниме';
                }
            }
            
            let videoLinks = [];
            let externalPlayer = data.external_player || null;
            
            if (data.player && data.player.list) {
                const episodes = Object.values(data.player.list);
                const foundEp = episodes.find(ep => (ep.episode || ep.serie || ep.ordinal) === episode);
                
                if (foundEp) {
                    if (foundEp.hls) {
                        for (const q of ['fhd', 'hd', 'sd']) {
                            if (foundEp.hls[q]) {
                                videoLinks.push({
                                    quality: q === 'fhd' ? '1080p' : (q === 'hd' ? '720p' : '480p'),
                                    url: foundEp.hls[q],
                                    type: 'hls'
                                });
                            }
                        }
                    }
                    if (foundEp.hls_1080) videoLinks.push({ quality: '1080p', url: foundEp.hls_1080, type: 'hls' });
                    if (foundEp.hls_720) videoLinks.push({ quality: '720p', url: foundEp.hls_720, type: 'hls' });
                    if (foundEp.hls_480) videoLinks.push({ quality: '480p', url: foundEp.hls_480, type: 'hls' });
                }
            }
            
            if (videoLinks.length === 0 && externalPlayer) {
                videoLinks.push({ quality: 'external', url: externalPlayer, type: 'external' });
            }
            
            return {
                episode: episode,
                totalEpisodes: data.episodes_total || 0,
                title: title,
                links: videoLinks,
                externalPlayer: externalPlayer
            };
        } catch (error) {
            return null;
        }
    },

    // ============================================
    // 11. КОНВЕРТАЦИЯ
    // ============================================
    _getGenreIcon(name) {
        const icons = {
            'Экшен': '⚔️', 'Приключения': '🗺️', 'Комедия': '😂', 'Драма': '🎭',
            'Фэнтези': '🧙', 'Романтика': '💕', 'Научная фантастика': '🚀',
            'Повседневность': '🏠', 'Триллер': '🔪', 'Ужасы': '👻',
            'Мистика': '🔮', 'Спорт': '⚽', 'Детектив': '🔍',
            'Психологическое': '🧠', 'Историческое': '🏯', 'Музыка': '🎵'
        };
        return icons[name] || '📚';
    },

    _getPosterUrl(poster) {
        if (!poster) return '';
        if (poster.optimized) return poster.optimized.preview || poster.optimized.thumbnail || '';
        if (poster.preview) return poster.preview;
        if (poster.thumbnail) return poster.thumbnail;
        if (typeof poster === 'string') return poster;
        return '';
    },

    _convertItem(item) {
        let img = this._getPosterUrl(item.poster);
        if (img && img.startsWith('/')) img = 'https://anilibria.top' + img;

        let title = 'Без названия';
        let title_russian = '';
        let title_english = '';
        let title_alternative = '';
        
        if (item.name) {
            if (typeof item.name === 'string') {
                title = item.name;
                title_russian = item.name;
            } else if (typeof item.name === 'object') {
                title_russian = item.name.main || '';
                title_english = item.name.english || '';
                title_alternative = item.name.alternative || '';
                title = title_russian || title_english || title_alternative || 'Без названия';
            }
        }
        
        if (title === 'Без названия') {
            title = item.russian || item.title_russian || item.title || item.alias || 'Без названия';
        }

        const genres = (item.genres || []).map(g => {
            if (typeof g === 'string') return g;
            return g.name || '';
        }).filter(Boolean);

        const year = item.year || '--';
        const episodes = item.episodes_total || item.episodes?.total || '?';
        
        let ageRating = '0+';
        if (item.age_rating) {
            if (typeof item.age_rating === 'object') {
                ageRating = item.age_rating.label || item.age_rating.value || '0+';
            } else if (typeof item.age_rating === 'string') {
                ageRating = item.age_rating;
            }
        }
        
        if (typeof ageRating === 'string') {
            const ageMap = { 'R0_PLUS': '0+', 'R6_PLUS': '6+', 'R12_PLUS': '12+', 'R16_PLUS': '16+', 'R18_PLUS': '18+' };
            if (ageMap[ageRating]) ageRating = ageMap[ageRating];
        }

        let status = 'Неизвестно';
        if (item.publish_status) {
            status = item.publish_status.description || item.publish_status.value || 'Неизвестно';
        }

        let publishDay = null;
        if (item.publish_day && typeof item.publish_day === 'object') {
            publishDay = item.publish_day.description || null;
        }

        const description = item.description || 'Описание отсутствует';

        return {
            mal_id: 'anilibria_' + item.id,
            id: 'anilibria_' + item.id,
            rawId: item.id,
            alias: item.alias || '',
            title: title,
            title_russian: title_russian,
            title_english: title_english,
            title_alternative: title_alternative,
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: description,
            description: description,
            genres: genres,
            score: 0,
            age_rating: ageRating,
            status: status,
            russian: title_russian,
            source: 'Anilibria',
            publish_day: publishDay,
            favorites_count: item.added_in_users_favorites || 0,
            created_at: item.created_at || null,
            updated_at: item.updated_at || null,
            is_ongoing: item.is_ongoing || false,
            external_player: item.external_player || null,
            _raw: item
        };
    },

    clearCache() {
        this._cache.clear();
        this._shikimoriCache.clear();
        console.log('🗑️ Кэш очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (с Shikimori)');

// ============================================
// API МОДУЛЬ ONIKAANIME — SHIKIMORI GRAPHQL (ФИНАЛ)
// ============================================

const API = {
    SHIKIMORI_PROXY: '/api/shikimori',
    
    _cache: new Map(),
    _cacheTTL: 15 * 60 * 1000,

    // ===== БАЗОВЫЙ GRAPHQL ЗАПРОС =====
    async _graphql(query, useCache = true, cacheKey = null) {
        const key = cacheKey || query;
        
        if (useCache && this._cache.has(key)) {
            const cached = this._cache.get(key);
            if (Date.now() - cached.time < this._cacheTTL) {
                return cached.data;
            }
            this._cache.delete(key);
        }
        
        try {
            const response = await fetch(this.SHIKIMORI_PROXY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            
            if (!response.ok) {
                throw new Error('Proxy HTTP ' + response.status);
            }
            
            const data = await response.json();
            
            if (data.errors) {
                console.error('❌ GraphQL errors:', JSON.stringify(data.errors));
                throw new Error(data.errors[0]?.message || 'GraphQL error');
            }
            
            if (useCache && data.data) {
                this._cache.set(key, { data: data.data, time: Date.now() });
            }
            
            return data.data;
        } catch (e) {
            console.error('❌ GraphQL Error:', e.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ
    // ============================================
    async getCatalog(page = 1, limit = 12, order = 'popularity') {
        const query = `{
            animes(page: ${page}, limit: ${limit}, order: ${order}) {
                id
                name
                russian
                english
                kind
                score
                status
                episodes
                episodesAired
                duration
                rating
                year: airedOn { year }
                poster { originalUrl mainUrl }
                genres { id name russian kind }
            }
        }`;
        
        const data = await this._graphql(query, true, `catalog_${page}_${limit}_${order}`);
        if (!data || !data.animes) return { items: [], totalPages: 1, totalCount: 0 };
        
        const items = data.animes.map(a => this._convertAnime(a));
        return { items, totalPages: 1, totalCount: items.length };
    },

    // ============================================
    // 2. ПОИСК
    // ============================================
    async searchAnime(query, page = 1, limit = 12) {
        if (!query || query.length < 2) return { items: [], totalPages: 1, totalCount: 0 };
        
        const gql = `{
            animes(search: ${JSON.stringify(query)}, page: ${page}, limit: ${limit}) {
                id
                name
                russian
                english
                kind
                score
                status
                episodes
                episodesAired
                duration
                rating
                year: airedOn { year }
                poster { originalUrl mainUrl }
                genres { id name russian kind }
            }
        }`;
        
        const data = await this._graphql(gql, true, `search_${query}_${page}_${limit}`);
        if (!data || !data.animes) return { items: [], totalPages: 1, totalCount: 0 };
        
        const items = data.animes.map(a => this._convertAnime(a));
        return { items, totalPages: 1, totalCount: items.length };
    },

    // ============================================
    // 3. НОВИНКИ
    // ============================================
    async getLatest(page = 1, limit = 12) {
        const query = `{
            animes(page: ${page}, limit: ${limit}, order: aired_on) {
                id
                name
                russian
                english
                kind
                score
                status
                episodes
                episodesAired
                duration
                rating
                year: airedOn { year }
                poster { originalUrl mainUrl }
                genres { id name russian kind }
            }
        }`;
        
        const data = await this._graphql(query, true, `latest_${page}_${limit}`);
        if (!data || !data.animes) return { items: [], totalPages: 1, totalCount: 0 };
        
        const items = data.animes.map(a => this._convertAnime(a));
        return { items, totalPages: 1, totalCount: items.length };
    },

    // ============================================
    // 4. ЖАНР
    // ============================================
    async getByGenre(genreId, page = 1, limit = 12) {
        const query = `{
            animes(
                page: ${page}, 
                limit: ${limit}, 
                order: popularity,
                genre: "${genreId}"
            ) {
                id
                name
                russian
                english
                kind
                score
                status
                episodes
                episodesAired
                duration
                rating
                year: airedOn { year }
                poster { originalUrl mainUrl }
                genres { id name russian kind }
            }
        }`;
        
        const data = await this._graphql(query, true, `genre_${genreId}_${page}_${limit}`);
        if (!data || !data.animes) return { items: [], totalPages: 1, totalCount: 0 };
        
        const items = data.animes.map(a => this._convertAnime(a));
        return { items, totalPages: 1, totalCount: items.length };
    },

    // ============================================
    // 5. СЛУЧАЙНОЕ
    // ============================================
    async getRandom(limit = 1) {
        const randomPage = Math.floor(Math.random() * 50) + 1;
        const query = `{
            animes(page: ${randomPage}, limit: ${limit}, order: popularity) {
                id
                name
                russian
                english
                kind
                score
                status
                episodes
                episodesAired
                duration
                rating
                year: airedOn { year }
                poster { originalUrl mainUrl }
                genres { id name russian kind }
            }
        }`;
        
        const data = await this._graphql(query, false);
        if (!data || !data.animes) return [];
        
        return data.animes.map(a => this._convertAnime(a));
    },

    // ============================================
    // 6. ДЕТАЛИ — ИСПРАВЛЕНО (по ID, потом по названию)
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('shikimori_', '');
        console.log('🔍 Детали:', id, '(ID:', cleanId + ')');
        
        // Получаем данные из кэша каталога
        const cached = allData[id];
        
        // ✅ ПЕРВАЯ ПОПЫТКА: по ID (anime(id: X))
        if (cleanId && /^\d+$/.test(cleanId)) {
            try {
                const query = `{
                    anime(id: ${cleanId}) {
                        id
                        malId
                        name
                        russian
                        english
                        japanese
                        kind
                        rating
                        score
                        status
                        episodes
                        episodesAired
                        duration
                        description
                        url
                        season
                        airedOn { year month day date }
                        poster { originalUrl mainUrl }
                        genres { id name russian kind }
                        studios { id name }
                    }
                }`;
                
                const data = await this._graphql(query, false);
                
                if (data && data.anime && (data.anime.russian || data.anime.name)) {
                    console.log('✅ По ID:', data.anime.russian || data.anime.name);
                    return this._convertAnimeDetails(data.anime);
                }
            } catch (e) {
                console.warn('⚠️ По ID не сработало');
            }
        }
        
        // ✅ ВТОРАЯ ПОПЫТКА: по названию из кэша
        if (cached) {
            const searchTitle = cached.title_russian || cached.title;
            
            if (searchTitle && searchTitle.length > 1) {
                try {
                    const searchQuery = `{
                        animes(search: ${JSON.stringify(searchTitle)}, limit: 1) {
                            id
                            malId
                            name
                            russian
                            english
                            japanese
                            kind
                            rating
                            score
                            status
                            episodes
                            episodesAired
                            duration
                            description
                            url
                            season
                            airedOn { year month day date }
                            poster { originalUrl mainUrl }
                            genres { id name russian kind }
                            studios { id name }
                        }
                    }`;
                    
                    const data = await this._graphql(searchQuery, false);
                    
                    if (data && data.animes && data.animes[0] && (data.animes[0].russian || data.animes[0].name)) {
                        console.log('✅ По названию:', data.animes[0].russian || data.animes[0].name);
                        return this._convertAnimeDetails(data.animes[0]);
                    }
                } catch (e) {
                    console.warn('⚠️ По названию не сработало');
                }
            }
            
            // ✅ ТРЕТЬЯ ПОПЫТКА: возвращаем данные из каталога
            console.log('⚠️ Возвращаем данные из каталога');
            return cached;
        }
        
        console.error('❌ Детали не найдены');
        return null;
    },

    // ============================================
    // 7. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 6) {
        const query = `{
            animes(page: 1, limit: ${limit}, order: ranked) {
                id
                name
                russian
                english
                kind
                score
                status
                episodes
                rating
                year: airedOn { year }
                poster { originalUrl mainUrl }
                genres { id name russian kind }
            }
        }`;
        
        const data = await this._graphql(query, true, `recommended_${limit}`);
        if (!data || !data.animes) return [];
        
        return data.animes.map(a => this._convertAnime(a));
    },

    // ============================================
    // 8. АВТОДОПОЛНЕНИЕ
    // ============================================
    async searchAutocomplete(query, limit = 8) {
        if (!query || query.length < 2) return [];
        
        const gql = `{
            animes(search: ${JSON.stringify(query)}, limit: ${limit}) {
                id
                name
                russian
                year: airedOn { year }
                poster { originalUrl mainUrl }
            }
        }`;
        
        const data = await this._graphql(gql, true, `auto_${query}_${limit}`);
        if (!data || !data.animes) return [];
        
        return data.animes.map(a => ({
            id: 'shikimori_' + a.id,
            title: a.russian || a.name,
            poster: a.poster?.originalUrl || a.poster?.mainUrl || '',
            year: a.year?.year || ''
        }));
    },

    // ============================================
    // 9. ЖАНРЫ
    // ============================================
    async getGenres() {
        return [
            { id: 1, name: 'Экшен', icon: '⚔️' },
            { id: 2, name: 'Приключения', icon: '🗺️' },
            { id: 4, name: 'Комедия', icon: '😂' },
            { id: 8, name: 'Драма', icon: '🎭' },
            { id: 10, name: 'Фэнтези', icon: '🧙' },
            { id: 22, name: 'Романтика', icon: '💕' },
            { id: 24, name: 'Фантастика', icon: '🚀' },
            { id: 36, name: 'Повседневность', icon: '🏠' },
            { id: 37, name: 'Триллер', icon: '🔪' },
            { id: 14, name: 'Ужасы', icon: '👻' }
        ];
    },

    async getAgeRatings() {
        return [
            { value: 'g', label: 'G — Для всех' },
            { value: 'pg', label: 'PG — Дети' },
            { value: 'pg_13', label: 'PG-13 — 13+' },
            { value: 'r', label: 'R — 17+' },
            { value: 'r_plus', label: 'R+ — 17+' },
            { value: 'rx', label: 'Rx — 18+' }
        ];
    },

    // ============================================
    // 10. СОВМЕСТИМОСТЬ
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        if (query && query.length > 1) return await this.searchAnime(query, page, 12);
        if (genre === 'latest') return await this.getLatest(page, 12);
        if (genre) return await this.getByGenre(genre, page, 12);
        return await this.getCatalog(page, 12);
    },

    async _getLatestReleases(limit = 12) { return await this.getLatest(1, limit); },
    async getRandomReleases(limit = 1) { return await this.getRandom(limit); },
    async searchTitles(query, page = 1) { return await this.searchAnime(query, page, 12); },
    async getShikimoriTitle() { return null; },

    // ============================================
    // 11. КОНВЕРТАЦИЯ
    // ============================================
    _convertAnime(a) {
        let title = a.russian || a.name || 'Без названия';
        let poster = '';
        if (a.poster) {
            poster = a.poster.originalUrl || a.poster.mainUrl || '';
        }
        
        const genres = (a.genres || [])
            .filter(g => g.kind === 'anime' || !g.kind)
            .map(g => g.russian || g.name)
            .filter(Boolean);
        
        let ageRating = '0+';
        if (a.rating) {
            const ageMap = {
                'g': '0+', 'pg': '6+', 'pg_13': '12+',
                'r': '16+', 'r_plus': '17+', 'rx': '18+'
            };
            ageRating = ageMap[a.rating] || '0+';
        }
        
        let status = 'Неизвестно';
        if (a.status) {
            const statusMap = {
                'anons': 'Анонс', 'ongoing': 'Онгоинг', 'released': 'Завершено'
            };
            status = statusMap[a.status] || a.status;
        }
        
        return {
            mal_id: 'shikimori_' + a.id,
            id: 'shikimori_' + a.id,
            rawId: a.id,
            title: title,
            title_russian: a.russian || '',
            title_english: a.english || '',
            year: a.year?.year || '--',
            episodes: a.episodes || a.episodesAired || '?',
            images: { jpg: { image_url: poster } },
            synopsis: '',
            description: '',
            genres: genres,
            score: a.score || 0,
            age_rating: ageRating,
            status: status,
            kind: a.kind || '',
            duration: a.duration,
            source: 'Shikimori',
            _raw: a
        };
    },

    _convertAnimeDetails(a) {
        const base = this._convertAnime(a);
        
        let description = a.description || '';
        description = description.replace(/<[^>]*>/g, '').trim();
        
        base.synopsis = description || 'Описание отсутствует';
        base.description = description;
        base.title_japanese = a.japanese || '';
        base.studios = (a.studios || []).map(s => s.name);
        base.rating = a.rating || '';
        base.url = a.url || `https://shikimori.one/animes/${a.id}`;
        base.airedOn = a.airedOn || {};
        base.season = a.season || '';
        
        return base;
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Shikimori) загружен');

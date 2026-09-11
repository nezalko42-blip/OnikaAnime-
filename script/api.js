// ============================================
// API МОДУЛЬ ONIKAANIME — SHIKIMORI GRAPHQL
// ============================================

const API = {
    SHIKIMORI_PROXY: '/api/shikimori',
    
    // ===== КЭШИ =====
    _cache: new Map(),
    _cacheTTL: 15 * 60 * 1000, // 15 минут

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
                throw new Error('Shikimori HTTP ' + response.status);
            }
            
            const data = await response.json();
            
            if (data.errors) {
                console.error('❌ GraphQL errors:', data.errors);
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
    // 1. КАТАЛОГ — ПОПУЛЯРНЫЕ АНИМЕ
    // ============================================
    async getCatalog(page = 1, limit = 24, order = 'popularity') {
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
        return {
            items: items,
            totalPages: 1,
            totalCount: items.length
        };
    },

    // ============================================
    // 2. ПОИСК ПО НАЗВАНИЮ
    // ============================================
    async searchAnime(query, page = 1, limit = 24) {
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
        return {
            items: items,
            totalPages: 1,
            totalCount: items.length
        };
    },

    // ============================================
    // 3. НОВИНКИ (по дате выхода)
    // ============================================
    async getLatest(page = 1, limit = 48) {
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
        return {
            items: items,
            totalPages: 1,
            totalCount: items.length
        };
    },

    // ============================================
    // 4. ФИЛЬТР ПО ЖАНРУ
    // ============================================
    async getByGenre(genreId, page = 1, limit = 24) {
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
        return {
            items: items,
            totalPages: 1,
            totalCount: items.length
        };
    },

    // ============================================
    // 5. СЛУЧАЙНОЕ АНИМЕ
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
    // 6. ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('shikimori_', '');
        
        const query = `{
            anime(id: ${cleanId}) {
                id
                malId
                name
                russian
                licenseNameRu
                english
                japanese
                synonyms
                kind
                rating
                score
                status
                episodes
                episodesAired
                duration
                airedOn { year month day date }
                releasedOn { year month day date }
                url
                season
                description
                descriptionHtml
                descriptionSource
                poster { id originalUrl mainUrl }
                genres { id name russian kind }
                studios { id name imageUrl }
                screenshots { id originalUrl x166Url x332Url }
                videos { id url name kind playerUrl imageUrl }
                externalLinks { id kind url }
                related {
                    id
                    anime { id name russian }
                    relationKind
                    relationText
                }
                scoresStats { score count }
                statusesStats { status count }
            }
        }`;
        
        const data = await this._graphql(query, false);
        if (!data || !data.anime) return null;
        
        return this._convertAnimeDetails(data.anime);
    },

    // ============================================
    // 7. РЕКОМЕНДАЦИИ (топ по рейтингу)
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
        
        return data.animes.map(a => {
            let title = a.russian || a.name;
            let poster = '';
            if (a.poster) {
                poster = a.poster.originalUrl || a.poster.mainUrl || '';
            }
            
            return {
                id: 'shikimori_' + a.id,
                title: title,
                poster: poster,
                year: a.year?.year || ''
            };
        });
    },

    // ============================================
    // 9. СПРАВОЧНИК ЖАНРОВ
    // ============================================
    async getGenres() {
        const query = `{
            genres {
                id
                name
                russian
                kind
            }
        }`;
        
        const data = await this._graphql(query, true, 'genres_list');
        if (!data || !data.genres) return [];
        
        return data.genres
            .filter(g => g.kind === 'anime' || !g.kind)
            .map(g => ({
                id: g.id,
                name: g.russian || g.name,
                icon: this._getGenreIcon(g.russian || g.name)
            }));
    },

    // ============================================
    // 10. ВОЗРАСТНЫЕ РЕЙТИНГИ
    // ============================================
    async getAgeRatings() {
        return [
            { value: 'g', label: 'G — Для всех' },
            { value: 'pg', label: 'PG — Дети' },
            { value: 'pg_13', label: 'PG-13 — 13+' },
            { value: 'r', label: 'R — 17+' },
            { value: 'r_plus', label: 'R+ — 17+ (насилие)' },
            { value: 'rx', label: 'Rx — 18+' }
        ];
    },

    // ============================================
    // 11. СОВМЕСТИМОСТЬ СО СТАРЫМ API
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        if (query && query.length > 1) {
            return await this.searchAnime(query, page, 24);
        }
        
        if (genre === 'latest') {
            return await this.getLatest(page, 48);
        }
        
        if (genre) {
            return await this.getByGenre(genre, page, 24);
        }
        
        return await this.getCatalog(page, 24);
    },

    // ============================================
    // 12. SHIKIMORI — ПОИСК НАЗВАНИЯ (заглушка для совместимости)
    // ============================================
    async getShikimoriTitle(query, year = null) {
        // Больше не нужен — названия уже на русском
        return null;
    },

    // ============================================
    // 13. КОНВЕРТАЦИЯ
    // ============================================
    _getGenreIcon(name) {
        const icons = {
            'Экшен': '⚔️', 'Приключения': '🗺️', 'Комедия': '😂', 'Драма': '🎭',
            'Фэнтези': '🧙', 'Романтика': '💕', 'Фантастика': '🚀', 'Sci-Fi': '🚀',
            'Повседневность': '🏠', 'Триллер': '🔪', 'Ужасы': '👻',
            'Мистика': '🔮', 'Спорт': '⚽', 'Детектив': '🔍',
            'Психологическое': '🧠', 'Историческое': '🏯', 'Музыка': '🎵',
            'Меха': '🤖', 'Сёдзё': '🌸', 'Сёнен': '👊', 'Сэйнэн': '🍺',
            'Гурман': '🍜', 'Этти': '💋', 'Гарем': '👥'
        };
        return icons[name] || '📚';
    },

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
                'g': '0+',
                'pg': '6+',
                'pg_13': '12+',
                'r': '16+',
                'r_plus': '17+',
                'rx': '18+'
            };
            ageRating = ageMap[a.rating] || '0+';
        }
        
        let status = 'Неизвестно';
        if (a.status) {
            const statusMap = {
                'anons': 'Анонс',
                'ongoing': 'Онгоинг',
                'released': 'Завершено'
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
        if (!description && a.descriptionHtml) {
            description = a.descriptionHtml.replace(/<[^>]*>/g, '').trim();
        }
        
        base.synopsis = description || 'Описание отсутствует';
        base.description = description;
        base.title_japanese = a.japanese || '';
        base.licenseNameRu = a.licenseNameRu || '';
        base.synonyms = a.synonyms || [];
        base.studios = (a.studios || []).map(s => s.name);
        base.screenshots = (a.screenshots || []).map(s => s.x332Url || s.originalUrl);
        base.videos = a.videos || [];
        base.externalLinks = a.externalLinks || [];
        base.related = a.related || [];
        base.rating = a.rating || '';
        base.url = a.url || `https://shikimori.one/animes/${a.id}`;
        base.airedOn = a.airedOn || {};
        base.releasedOn = a.releasedOn || {};
        base.season = a.season || '';
        
        return base;
    },

    // ============================================
    // 14. ОЧИСТКА КЭША
    // ============================================
    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Shikimori) загружен');

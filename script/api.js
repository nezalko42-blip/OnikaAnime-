// ============================================
// API МОДУЛЬ ONIKAANIME (LOCAL DB + SHIKIMORI GRAPHQL)
// ============================================

const API = {
    SHIKIMORI_GRAPHQL: 'https://shikimori.one/api/graphql',
    ANILIBRIA_V1: 'https://anilibria.top/api/v1',
    ANILIBRIA_V2: 'https://api.anilibria.tv/v2',
    ANILIBRIA_V3: 'https://api.anilibria.tv/v3',
    
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,
    _localAnime: null,

    // ============================================
    // ЗАГРУЗКА ЛОКАЛЬНОЙ БД
    // ============================================
    async loadLocalDB() {
        if (this._localAnime) return this._localAnime;
        
        try {
            const response = await fetch('/data/anime.json');
            if (!response.ok) throw new Error('Не удалось загрузить локальную БД');
            const data = await response.json();
            this._localAnime = data.anime || [];
            console.log('📚 Локальная БД загружена:', this._localAnime.length, 'аниме');
            return this._localAnime;
        } catch (error) {
            console.error('❌ Ошибка загрузки локальной БД:', error);
            this._localAnime = this._getFallbackData();
            return this._localAnime;
        }
    },

    _getFallbackData() {
        return [
            { id: 1, title: 'Атака Титанов', title_russian: 'Атака Титанов', title_english: 'Attack on Titan', year: 2013, episodes: 25, image: '', genres: ['Экшен', 'Драма'], score: 8.7, description: 'Описание отсутствует' },
            { id: 2, title: 'Наруто', title_russian: 'Наруто', title_english: 'Naruto', year: 2002, episodes: 220, image: '', genres: ['Экшен', 'Приключения'], score: 8.5, description: 'Описание отсутствует' },
            { id: 3, title: 'Ван Пис', title_russian: 'Ван Пис', title_english: 'One Piece', year: 1999, episodes: 1000, image: '', genres: ['Экшен', 'Приключения'], score: 8.8, description: 'Описание отсутствует' }
        ];
    },

    // ============================================
    // SHIKIMORI GRAPHQL — ПОИСК
    // ============================================
    async searchShikimoriGraphQL(query, page = 1, limit = 12) {
        const gqlQuery = `
            query SearchAnime($search: String!, $page: Int!, $limit: Int!) {
                animes(search: $search, page: $page, limit: $limit, kind: "!special") {
                    id
                    malId
                    name
                    russian
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
                    poster { id originalUrl mainUrl }
                    genres { id name russian kind }
                    studios { id name imageUrl }
                    description
                    descriptionHtml
                    descriptionSource
                    videos { id url name kind playerUrl imageUrl }
                    screenshots { id originalUrl x166Url x332Url }
                    scoresStats { score count }
                    statusesStats { status count }
                    createdAt
                    updatedAt
                    nextEpisodeAt
                    isCensored
                }
            }
        `;

        const variables = {
            search: query,
            page: page,
            limit: limit
        };

        try {
            const response = await fetch(this.SHIKIMORI_GRAPHQL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'OnikaAnime/2.0'
                },
                body: JSON.stringify({ query: gqlQuery, variables })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data?.data?.animes?.length > 0) {
                return {
                    items: data.data.animes.map(item => ({
                        mal_id: item.id,
                        id: item.id,
                        title: item.russian || item.name || 'Без названия',
                        title_russian: item.russian || '',
                        title_english: item.name || '',
                        year: item.airedOn?.year || '--',
                        episodes: item.episodes || '?',
                        images: { jpg: { image_url: item.poster?.originalUrl || '' } },
                        synopsis: item.description || 'Описание отсутствует',
                        genres: item.genres?.map(g => g.russian || g.name) || [],
                        score: item.score || 0,
                        russian: item.russian || '',
                        source: 'ShikimoriGraphQL'
                    })),
                    totalPages: Math.ceil((data.data.animes.length || 0) / limit) + 1
                };
            }
            return null;
        } catch (error) {
            console.error('❌ Shikimori GraphQL ошибка:', error.message);
            return null;
        }
    },

    // ============================================
    // ПОИСК В ЛОКАЛЬНОЙ БД
    // ============================================
    async searchLocal(query, genre = null, page = 1) {
        const animeList = await this.loadLocalDB();
        let results = [...animeList];
        
        if (query && query.length > 1) {
            const q = query.toLowerCase().trim();
            results = results.filter(item => {
                const title = (item.title || '').toLowerCase();
                const titleRu = (item.title_russian || '').toLowerCase();
                const titleEn = (item.title_english || '').toLowerCase();
                return title.includes(q) || titleRu.includes(q) || titleEn.includes(q);
            });
        }
        
        if (genre) {
            const genreMap = {
                '1': 'экшен', '8': 'драма', '21': 'комедия',
                '10': 'фэнтези', '22': 'романтика'
            };
            const g = genreMap[genre] || genre;
            results = results.filter(item => {
                const genres = item.genres || [];
                return genres.some(gen => gen.toLowerCase().includes(g.toLowerCase()));
            });
        }
        
        const totalPages = Math.ceil(results.length / 12);
        const start = (page - 1) * 12;
        const paginated = results.slice(start, start + 12);
        
        console.log(`📊 Локальный поиск: найдено ${results.length} результатов`);
        
        return {
            items: paginated.map(item => ({
                mal_id: 'local_' + item.id,
                id: item.id,
                title: item.title || item.title_russian || 'Без названия',
                title_russian: item.title_russian || '',
                title_english: item.title_english || '',
                year: item.year || '--',
                episodes: item.episodes || '?',
                images: { jpg: { image_url: item.image || '' } },
                synopsis: item.description || 'Описание отсутствует',
                genres: item.genres || [],
                score: item.score || 0,
                russian: item.title_russian || '',
                source: 'LocalDB'
            })),
            totalPages: Math.max(totalPages, 1)
        };
    },

    // ============================================
    // ОСНОВНАЯ ФУНКЦИЯ
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        // 1. Сначала локальная БД
        console.log('🔍 Поиск в локальной БД:', query || 'все');
        const localResult = await this.searchLocal(query, genre, page);
        
        if (localResult.items.length > 0) {
            console.log('✅ Локальная БД:', localResult.items.length, 'результатов');
            return localResult;
        }
        
        // 2. Если в локальной БД ничего нет — пробуем Shikimori GraphQL
        if (query && query.length > 1) {
            console.log('🔄 Пробуем Shikimori GraphQL...');
            const graphqlResult = await this.searchShikimoriGraphQL(query, page, 24);
            if (graphqlResult?.items?.length > 0) {
                console.log('✅ Shikimori GraphQL:', graphqlResult.items.length, 'результатов');
                return graphqlResult;
            }
        }
        
        console.log('❌ Ничего не найдено');
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('local_', '');
        
        // Локальная БД
        const animeList = await this.loadLocalDB();
        const localItem = animeList.find(item => item.id == cleanId);
        if (localItem) {
            return {
                mal_id: 'local_' + localItem.id,
                id: localItem.id,
                title: localItem.title || localItem.title_russian || 'Без названия',
                title_russian: localItem.title_russian || '',
                title_english: localItem.title_english || '',
                year: localItem.year || '--',
                episodes: localItem.episodes || '?',
                images: { jpg: { image_url: localItem.image || '' } },
                synopsis: localItem.description || 'Описание отсутствует',
                genres: localItem.genres || [],
                score: localItem.score || 0,
                russian: localItem.title_russian || '',
                source: 'LocalDB'
            };
        }
        
        // Shikimori GraphQL
        try {
            const gqlQuery = `
                query GetAnime($id: ID!) {
                    animes(id: $id) {
                        id
                        malId
                        name
                        russian
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
                        poster { id originalUrl mainUrl }
                        genres { id name russian kind }
                        studios { id name imageUrl }
                        description
                        descriptionHtml
                        descriptionSource
                        videos { id url name kind playerUrl imageUrl }
                        screenshots { id originalUrl x166Url x332Url }
                    }
                }
            `;
            
            const response = await fetch(this.SHIKIMORI_GRAPHQL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'OnikaAnime/2.0'
                },
                body: JSON.stringify({
                    query: gqlQuery,
                    variables: { id: cleanId }
                })
            });

            if (response.ok) {
                const data = await response.json();
                const item = data?.data?.animes?.[0];
                if (item) {
                    return {
                        mal_id: item.id,
                        id: item.id,
                        title: item.russian || item.name || 'Без названия',
                        title_russian: item.russian || '',
                        title_english: item.name || '',
                        year: item.airedOn?.year || '--',
                        episodes: item.episodes || '?',
                        images: { jpg: { image_url: item.poster?.originalUrl || '' } },
                        synopsis: item.description || 'Описание отсутствует',
                        genres: item.genres?.map(g => g.russian || g.name) || [],
                        score: item.score || 0,
                        russian: item.russian || '',
                        source: 'ShikimoriGraphQL'
                    };
                }
            }
        } catch (e) {
            console.log('⚠️ Shikimori GraphQL детали ошибка');
        }
        
        return null;
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (локальная БД + Shikimori GraphQL)');

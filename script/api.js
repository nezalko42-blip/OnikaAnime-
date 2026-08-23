// ============================================
// API МОДУЛЬ ONIKAANIME (ТОЛЬКО SHIKIMORI)
// ============================================

const API = {
    SHIKIMORI_GRAPHQL: 'https://shikimori.one/api/graphql',
    SHIKIMORI_REST: 'https://shikimori.one/api/v2',
    
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

    // ============================================
    // SHIKIMORI GRAPHQL — ПОИСК
    // ============================================
    async searchShikimoriGraphQL(query, page = 1, limit = 24) {
        const gqlQuery = `
            query SearchAnime($search: String!, $page: Int!, $limit: Int!) {
                animes(search: $search, page: $page, limit: $limit, kind: "!special") {
                    id
                    name
                    russian
                    english
                    score
                    episodes
                    airedOn { year }
                    poster { originalUrl }
                    genres { name russian }
                    description
                }
            }
        `;

        const variables = {
            search: query,
            page: page,
            limit: limit
        };

        try {
            console.log('📡 Shikimori GraphQL запрос:', query);
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
            console.log('📦 Shikimori ответ:', data);
            
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
    // SHIKIMORI REST — РЕЗЕРВ
    // ============================================
    async searchShikimoriREST(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.SHIKIMORI_REST}/animes?page=${page}&limit=24`;
        
        if (isSearch) {
            url += `&search=${encodeURIComponent(query)}`;
        } else if (genre) {
            const genreMap = {
                '1': 'action', '8': 'drama', '21': 'comedy',
                '10': 'fantasy', '22': 'romance'
            };
            url += `&genre=${genreMap[genre] || ''}`;
        } else {
            url += '&order=popularity';
        }

        try {
            console.log('📡 Shikimori REST запрос:', url);
            const response = await fetch(url, {
                headers: { 'User-Agent': 'OnikaAnime/2.0' }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log('📦 Shikimori REST ответ:', data);
            
            if (data?.length > 0) {
                return {
                    items: data.map(item => ({
                        mal_id: item.id,
                        id: item.id,
                        title: item.russian || item.name || 'Без названия',
                        title_russian: item.russian || '',
                        title_english: item.name || '',
                        year: item.aired_on ? item.aired_on.split('-')[0] : '--',
                        episodes: item.episodes || '?',
                        images: { jpg: { image_url: item.poster?.originalUrl || '' } },
                        synopsis: item.description || 'Описание отсутствует',
                        genres: item.genres?.map(g => g.russian || g.name) || [],
                        score: item.score || 0,
                        russian: item.russian || '',
                        source: 'ShikimoriREST'
                    })),
                    totalPages: Math.ceil((data.length || 0) / 24) + 1
                };
            }
            return null;
        } catch (error) {
            console.error('❌ Shikimori REST ошибка:', error.message);
            return null;
        }
    },

    // ============================================
    // ОСНОВНАЯ ФУНКЦИЯ
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        console.log('🚀 Поиск в Shikimori:', query || 'все');
        
        // Сначала пробуем GraphQL
        if (query && query.length > 1) {
            const result = await this.searchShikimoriGraphQL(query, page);
            if (result?.items?.length > 0) {
                console.log('✅ Shikimori GraphQL:', result.items.length, 'результатов');
                return result;
            }
        }
        
        // Если GraphQL не дал результат — пробуем REST
        console.log('🔄 Пробуем Shikimori REST...');
        const result = await this.searchShikimoriREST(query, genre, page);
        if (result?.items?.length > 0) {
            console.log('✅ Shikimori REST:', result.items.length, 'результатов');
            return result;
        }
        
        console.log('❌ Ничего не найдено');
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('shikimori_', '');
        
        try {
            const response = await fetch(`${this.SHIKIMORI_REST}/animes/${cleanId}`, {
                headers: { 'User-Agent': 'OnikaAnime/2.0' }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data?.id) {
                return {
                    mal_id: data.id,
                    id: data.id,
                    title: data.russian || data.name || 'Без названия',
                    title_russian: data.russian || '',
                    title_english: data.name || '',
                    year: data.aired_on ? data.aired_on.split('-')[0] : '--',
                    episodes: data.episodes || '?',
                    images: { jpg: { image_url: data.poster?.originalUrl || '' } },
                    synopsis: data.description || 'Описание отсутствует',
                    genres: data.genres?.map(g => g.russian || g.name) || [],
                    score: data.score || 0,
                    russian: data.russian || '',
                    source: 'ShikimoriREST'
                };
            }
            return null;
        } catch (error) {
            console.error('❌ Shikimori детали ошибка:', error.message);
            return null;
        }
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (только Shikimori)');

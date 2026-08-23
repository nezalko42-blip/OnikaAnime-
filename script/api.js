// ============================================
// API МОДУЛЬ ONIKAANIME (SHIKIMORI GRAPHQL)
// ============================================

const API = {
    SHIKIMORI_GRAPHQL: 'https://shikimori.one/api/graphql',
    
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

    // ============================================
    // БАЗОВЫЙ ЗАПРОС К GRAPHQL
    // ============================================
    async _graphql(query, variables = {}) {
        const cacheKey = JSON.stringify({ query, variables });
        
        // Проверяем кэш
        if (this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this._cacheTTL) {
                console.log('📦 Кэш:', cacheKey.substring(0, 50) + '...');
                return cached.data;
            }
        }

        try {
            console.log('📡 Запрос к Shikimori GraphQL:', query.substring(0, 100) + '...');
            
            const response = await fetch(this.SHIKIMORI_GRAPHQL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'OnikaAnime/2.0'
                },
                body: JSON.stringify({ query, variables })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Сохраняем в кэш
            this._cache.set(cacheKey, { data, timestamp: Date.now() });
            
            return data;
        } catch (error) {
            console.error('❌ GraphQL ошибка:', error.message);
            return null;
        }
    },

    // ============================================
    // ПОИСК АНИМЕ (ОСНОВНОЙ)
    // ============================================
    async searchAnime(query = '', page = 1, limit = 24) {
        const isSearch = query && query.length > 1;
        
        // GraphQL запрос (как в вашем примере)
        const gqlQuery = `
            query SearchAnime($search: String!, $page: Int!, $limit: Int!) {
                animes(search: $search, page: $page, limit: $limit, kind: "!special") {
                    id
                    malId
                    name
                    russian
                    english
                    score
                    episodes
                    airedOn { year }
                    poster { originalUrl mainUrl }
                    genres { id name russian kind }
                    description
                    rating
                    status
                    duration
                    kind
                }
            }
        `;

        const variables = {
            search: query,
            page: page,
            limit: limit
        };

        // Если нет поискового запроса — используем популярное
        if (!isSearch) {
            const popularQuery = `
                query PopularAnime($page: Int!, $limit: Int!) {
                    animes(page: $page, limit: $limit, kind: "!special", order: "popularity") {
                        id
                        malId
                        name
                        russian
                        english
                        score
                        episodes
                        airedOn { year }
                        poster { originalUrl mainUrl }
                        genres { id name russian kind }
                        description
                    }
                }
            `;
            
            const result = await this._graphql(popularQuery, { page, limit });
            
            if (result?.data?.animes?.length > 0) {
                return {
                    items: result.data.animes.map(item => ({
                        mal_id: item.id,
                        id: item.id,
                        title: item.russian || item.name || 'Без названия',
                        title_russian: item.russian || '',
                        title_english: item.name || '',
                        year: item.airedOn?.year || '--',
                        episodes: item.episodes || '?',
                        images: { 
                            jpg: { 
                                image_url: item.poster?.originalUrl || item.poster?.mainUrl || '' 
                            } 
                        },
                        synopsis: item.description || 'Описание отсутствует',
                        genres: item.genres?.map(g => g.russian || g.name) || [],
                        score: item.score || 0,
                        russian: item.russian || '',
                        source: 'ShikimoriGraphQL'
                    })),
                    totalPages: Math.ceil((result.data.animes.length || 0) / limit) + 1
                };
            }
            return null;
        }

        // Если есть поисковый запрос
        const result = await this._graphql(gqlQuery, variables);
        
        if (result?.data?.animes?.length > 0) {
            return {
                items: result.data.animes.map(item => ({
                    mal_id: item.id,
                    id: item.id,
                    title: item.russian || item.name || 'Без названия',
                    title_russian: item.russian || '',
                    title_english: item.name || '',
                    year: item.airedOn?.year || '--',
                    episodes: item.episodes || '?',
                    images: { 
                        jpg: { 
                            image_url: item.poster?.originalUrl || item.poster?.mainUrl || '' 
                        } 
                    },
                    synopsis: item.description || 'Описание отсутствует',
                    genres: item.genres?.map(g => g.russian || g.name) || [],
                    score: item.score || 0,
                    russian: item.russian || '',
                    source: 'ShikimoriGraphQL'
                })),
                totalPages: Math.ceil((result.data.animes.length || 0) / limit) + 1
            };
        }

        return null;
    },

    // ============================================
    // ОСНОВНАЯ ФУНКЦИЯ
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        console.log('🚀 Поиск в Shikimori GraphQL:', query || 'популярное');
        
        try {
            const result = await this.searchAnime(query, page, 24);
            if (result?.items?.length > 0) {
                // Если есть жанр — фильтруем на клиенте
                let items = result.items;
                if (genre) {
                    const genreMap = {
                        '1': 'экшен', '8': 'драма', '21': 'комедия',
                        '10': 'фэнтези', '22': 'романтика'
                    };
                    const g = genreMap[genre] || genre;
                    items = items.filter(item => {
                        const genres = item.genres || [];
                        return genres.some(gen => gen.toLowerCase().includes(g.toLowerCase()));
                    });
                    console.log(`🎭 Фильтр по жанру "${g}": ${items.length} из ${result.items.length}`);
                }
                return {
                    items: items,
                    totalPages: result.totalPages
                };
            }
        } catch (e) {
            console.error('❌ Shikimori GraphQL ошибка:', e.message);
        }

        // Если Shikimori не работает — возвращаем демо-данные
        console.log('🔄 Возвращаем демо-данные');
        return {
            items: this._getDemoData(),
            totalPages: 1
        };
    },

    // ============================================
    // ДЕМО-ДАННЫЕ
    // ============================================
    _getDemoData() {
        return [
            { 
                mal_id: 'demo_1',
                title: 'Атака Титанов',
                title_russian: 'Атака Титанов',
                title_english: 'Attack on Titan',
                year: 2013,
                episodes: 25,
                images: { jpg: { image_url: '' } },
                genres: ['Экшен', 'Драма'],
                score: 8.7,
                russian: 'Атака Титанов',
                source: 'Demo'
            },
            { 
                mal_id: 'demo_2',
                title: 'Наруто',
                title_russian: 'Наруто',
                title_english: 'Naruto',
                year: 2002,
                episodes: 220,
                images: { jpg: { image_url: '' } },
                genres: ['Экшен', 'Приключения'],
                score: 8.5,
                russian: 'Наруто',
                source: 'Demo'
            },
            { 
                mal_id: 'demo_3',
                title: 'Ван Пис',
                title_russian: 'Ван Пис',
                title_english: 'One Piece',
                year: 1999,
                episodes: 1000,
                images: { jpg: { image_url: '' } },
                genres: ['Экшен', 'Приключения'],
                score: 8.8,
                russian: 'Ван Пис',
                source: 'Demo'
            }
        ];
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('demo_', '');
        
        const gqlQuery = `
            query GetAnime($id: ID!) {
                animes(id: $id) {
                    id
                    malId
                    name
                    russian
                    english
                    score
                    episodes
                    airedOn { year }
                    poster { originalUrl mainUrl }
                    genres { id name russian kind }
                    description
                    descriptionHtml
                    rating
                    status
                    duration
                    season
                    year
                    kind
                    videos { id url name kind playerUrl imageUrl }
                }
            }
        `;

        try {
            const result = await this._graphql(gqlQuery, { id: cleanId });
            const item = result?.data?.animes?.[0];
            
            if (item) {
                return {
                    mal_id: item.id,
                    id: item.id,
                    title: item.russian || item.name || 'Без названия',
                    title_russian: item.russian || '',
                    title_english: item.name || '',
                    year: item.airedOn?.year || '--',
                    episodes: item.episodes || '?',
                    images: { 
                        jpg: { 
                            image_url: item.poster?.originalUrl || item.poster?.mainUrl || '' 
                        } 
                    },
                    synopsis: item.description || 'Описание отсутствует',
                    genres: item.genres?.map(g => g.russian || g.name) || [],
                    score: item.score || 0,
                    russian: item.russian || '',
                    rating: item.rating || '',
                    status: item.status || '',
                    duration: item.duration || '',
                    source: 'ShikimoriGraphQL'
                };
            }
            return null;
        } catch (e) {
            console.error('❌ Ошибка получения деталей:', e.message);
            return null;
        }
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (Shikimori GraphQL)');

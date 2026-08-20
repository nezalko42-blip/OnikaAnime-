// ============================================
// API МОДУЛЬ ONIKAANIME (ANILIBERTY + SHIKIMORI)
// ============================================

const API = {
    ANILIBERTY: 'https://anilibria.top/api/v1',
    SHIKIMORI: 'https://shikimori.one/api/v2',
    
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

    async _fetch(url, options = {}) {
        const headers = {
            'User-Agent': 'OnikaAnime/2.0',
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    // ============================================
    // ANILIBERTY — ОСНОВНОЙ ПОИСК
    // ============================================
    async searchAniliberty(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.ANILIBERTY}/collections/releases?page=${page}&limit=24`;
        
        // Добавляем поиск
        if (isSearch) {
            url += `&f[search]=${encodeURIComponent(query)}`;
        }
        
        // Добавляем жанры
        if (genre) {
            url += `&f[genres]=${genre}`;
        }
        
        // Если нет поиска и нет жанра — показываем популярное
        if (!isSearch && !genre) {
            url += `&f[sorting]=RATING_DESC`;
        }

        // Добавляем include для получения полных данных
        url += `&include=id,name,description,season,year,type,genres,posters,rating,ageRating,episodesTotal`;

        const data = await this._fetch(url);
        
        if (data?.list?.length > 0) {
            return {
                items: data.list.map(item => {
                    let img = '';
                    if (item.posters) {
                        const poster = item.posters.find(p => p.type === 'POSTER') || item.posters[0];
                        if (poster) {
                            img = poster.url || '';
                            if (img && img.startsWith('/')) {
                                img = 'https://anilibria.top' + img;
                            }
                        }
                    }
                    return {
                        mal_id: item.id,
                        title: item.name || item.englishName || 'Без названия',
                        title_russian: item.name || '',
                        title_english: item.englishName || '',
                        year: item.year || '--',
                        episodes: item.episodesTotal || item.episodes || '?',
                        images: { jpg: { image_url: img || '' } },
                        synopsis: item.description || 'Описание отсутствует',
                        genres: item.genres?.map(g => g.name) || [],
                        score: item.rating || 0,
                        russian: item.name || '',
                        source: 'Aniliberty'
                    };
                }),
                totalPages: Math.ceil((data.total || data.list.length) / 24)
            };
        }
        return null;
    },

    // ============================================
    // SHIKIMORI — РЕЗЕРВ
    // ============================================
    async searchShikimori(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.SHIKIMORI}/animes?page=${page}&limit=24`;

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

        const data = await this._fetch(url);
        if (data?.length > 0) {
            return {
                items: data.map(item => ({
                    mal_id: item.id,
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
                    source: 'Shikimori'
                })),
                totalPages: Math.ceil((data.length || 0) / 24) + 1
            };
        }
        return null;
    },

    // ============================================
    // ГИБРИДНЫЙ ПОИСК
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        console.log('🔍 Поиск в Aniliberty:', query || 'все');
        
        // 1. Пробуем Aniliberty
        try {
            const result = await this.searchAniliberty(query, genre, page);
            if (result?.items?.length > 0) {
                console.log('✅ Aniliberty найдено:', result.items.length);
                return result;
            }
        } catch (e) {
            console.log('⚠️ Aniliberty ошибка:', e.message);
        }
        
        // 2. Если Aniliberty не дал результат — пробуем Shikimori
        console.log('🔄 Пробуем Shikimori...');
        try {
            const result = await this.searchShikimori(query, genre, page);
            if (result?.items?.length > 0) {
                console.log('✅ Shikimori найдено:', result.items.length);
                return result;
            }
        } catch (e) {
            console.log('⚠️ Shikimori ошибка:', e.message);
        }
        
        // 3. Если ничего не найдено
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ (ANILIBERTY)
    // ============================================
    async getAnimeDetails(id) {
        // Пробуем Aniliberty
        try {
            const data = await this._fetch(`${this.ANILIBERTY}/releases/${id}?include=id,name,description,season,year,type,genres,posters,rating,ageRating,episodesTotal`);
            if (data?.id) {
                let img = '';
                if (data.posters) {
                    const poster = data.posters.find(p => p.type === 'POSTER') || data.posters[0];
                    if (poster) {
                        img = poster.url || '';
                        if (img && img.startsWith('/')) {
                            img = 'https://anilibria.top' + img;
                        }
                    }
                }
                return {
                    mal_id: data.id,
                    title: data.name || data.englishName || 'Без названия',
                    title_russian: data.name || '',
                    title_english: data.englishName || '',
                    year: data.year || '--',
                    episodes: data.episodesTotal || data.episodes || '?',
                    images: { jpg: { image_url: img || '' } },
                    synopsis: data.description || 'Описание отсутствует',
                    genres: data.genres?.map(g => g.name) || [],
                    score: data.rating || 0,
                    russian: data.name || '',
                    source: 'Aniliberty'
                };
            }
        } catch (e) {
            console.log('⚠️ Aniliberty детали ошибка');
        }
        
        // Пробуем Shikimori
        try {
            const data = await this._fetch(`${this.SHIKIMORI}/animes/${id}`);
            if (data?.id) {
                return {
                    mal_id: data.id,
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
                    source: 'Shikimori'
                };
            }
        } catch (e) {
            console.log('⚠️ Shikimori детали ошибка');
        }

        return null;
    },

    // ============================================
    // ПОИСК ВИДЕО В KODIK (БЕЗ ИЗМЕНЕНИЙ)
    // ============================================
    async searchKodik(animeTitle, episode = 1) {
        if (!animeTitle) throw new Error('Название не указано');

        const url = `https://kodikapi.com/search?with_material_data=true&types=anime&title=${encodeURIComponent(animeTitle)}&limit=5`;
        const data = await this._fetch(url);

        if (data?.results?.length > 0) {
            const found = data.results[0];
            if (found?.link) {
                if (episode && found.seasons) {
                    for (const season of found.seasons) {
                        if (season.episodes) {
                            const ep = season.episodes.find(e => e.number === episode);
                            if (ep?.link) return ep.link;
                        }
                    }
                }
                return found.link;
            }
        }
        throw new Error('Видео не найдено в Kodik');
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (Aniliberty + Shikimori)');

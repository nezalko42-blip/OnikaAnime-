// ============================================
// API МОДУЛЬ ONIKAANIME (С ПОИСКОМ ВСЕХ СЕЗОНОВ)
// ============================================

const API = {
    ANILIBRIA: 'https://api.anilibria.tv/v3',
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
    // ANILIBRIA — ПОИСК ВСЕХ РЕЛИЗОВ
    // ============================================
    async searchAnilibria(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        
        // Используем search вместо catalog для поиска по всем релизам
        let url = `${this.ANILIBRIA}/title/search?page=${page}&limit=24`;
        
        if (isSearch) {
            url += `&query=${encodeURIComponent(query)}`;
        } else if (genre) {
            // Для жанров используем catalog
            const body = { 
                page: page, 
                limit: 12, 
                f: { sorting: 'FRESH_AT_DESC' } 
            };
            if (genre) body.f.genres = [parseInt(genre)];
            
            const data = await this._fetch(
                this.ANILIBRIA + '/anime/catalog/releases',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                }
            );
            
            if (data?.data?.length > 0) {
                return {
                    items: data.data.map(item => this._convertAnilibriaItem(item)),
                    totalPages: data.meta?.pagination?.total_pages || 1
                };
            }
            return null;
        }

        // Поиск по названию — возвращает ВСЕ совпадения
        const data = await this._fetch(url);
        
        if (data?.list?.length > 0) {
            // Фильтруем результаты, чтобы исключить дубли и нерелевантные
            const items = data.list
                .filter(item => {
                    // Проверяем, что это аниме, а не что-то другое
                    return item.type === 'anime' || !item.type;
                })
                .map(item => this._convertAnilibriaItem(item));
            
            // Убираем дубли по названию (оставляем уникальные)
            const uniqueItems = [];
            const seenTitles = new Set();
            for (const item of items) {
                const key = (item.title_russian || item.title || '').toLowerCase().trim();
                if (!seenTitles.has(key) && key) {
                    seenTitles.add(key);
                    uniqueItems.push(item);
                }
            }
            
            return {
                items: uniqueItems,
                totalPages: Math.ceil(uniqueItems.length / 12) + 1
            };
        }
        return null;
    },

    // ===== КОНВЕРТАЦИЯ ДАННЫХ ANILIBRIA =====
    _convertAnilibriaItem(item) {
        let img = '';
        if (item.poster) {
            const p = item.poster.optimized || item.poster;
            img = typeof p === 'string' ? p : (p.preview || p.src || '');
            if (img && img[0] === '/') img = 'https://anilibria.top' + img;
        }
        return {
            mal_id: 'anilibria_' + (item.id || item.code),
            id: item.id || item.code,
            title: item.name?.main || item.name?.english || item.name?.original || 'Без названия',
            title_russian: item.name?.main || '',
            title_english: item.name?.english || '',
            year: item.year || '--',
            episodes: item.episodes_total || item.episodes || '?',
            images: { jpg: { image_url: img || '' } },
            synopsis: item.description || 'Описание отсутствует',
            genres: item.genres || [],
            score: item.rating || 0,
            russian: item.name?.main || '',
            source: 'Anilibria'
        };
    },

    // ============================================
    // SHIKIMORI — РЕЗЕРВ (ТОЖЕ ВСЕ РЕЛИЗЫ)
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
    // ГИБРИДНЫЙ ПОИСК (ВСЕ СЕЗОНЫ)
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        console.log('🔍 Поиск:', query || 'все', 'Жанр:', genre || 'все');
        
        let allItems = [];
        const seenTitles = new Set();

        // 1. Anilibria (все сезоны)
        try {
            const result = await this.searchAnilibria(query, genre, page);
            if (result?.items) {
                for (const item of result.items) {
                    const key = (item.title_russian || item.title || '').toLowerCase().trim();
                    if (!seenTitles.has(key) && key) {
                        seenTitles.add(key);
                        allItems.push(item);
                    }
                }
                console.log('✅ Anilibria найдено:', result.items.length);
            }
        } catch (e) {
            console.log('⚠️ Anilibria ошибка:', e.message);
        }

        // 2. Shikimori (дополнение)
        try {
            const result = await this.searchShikimori(query, genre, page);
            if (result?.items) {
                for (const item of result.items) {
                    const key = (item.title_russian || item.title || '').toLowerCase().trim();
                    if (!seenTitles.has(key) && key) {
                        seenTitles.add(key);
                        allItems.push(item);
                    }
                }
                console.log('✅ Shikimori найдено:', result.items.length);
            }
        } catch (e) {
            console.log('⚠️ Shikimori ошибка:', e.message);
        }

        if (allItems.length === 0) {
            return { items: [], totalPages: 1 };
        }

        // Пагинация
        const totalPages = Math.ceil(allItems.length / 12);
        const start = (page - 1) * 12;
        const paginatedItems = allItems.slice(start, start + 12);

        return {
            items: paginatedItems,
            totalPages: Math.max(totalPages, 1)
        };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ (с поддержкой Anilibria ID)
    // ============================================
    async getAnimeDetails(id) {
        // Если ID начинается с 'anilibria_', убираем префикс
        const cleanId = id.toString().replace('anilibria_', '');
        
        // Пробуем Anilibria
        try {
            const data = await this._fetch(`${this.ANILIBRIA}/title/${cleanId}`);
            if (data?.id) {
                let img = '';
                if (data.poster) {
                    const p = data.poster.optimized || data.poster;
                    img = typeof p === 'string' ? p : (p.preview || p.src || '');
                    if (img && img[0] === '/') img = 'https://anilibria.top' + img;
                }
                return {
                    mal_id: data.id,
                    title: data.name?.main || data.name?.english || 'Без названия',
                    title_russian: data.name?.main || '',
                    title_english: data.name?.english || '',
                    year: data.year || '--',
                    episodes: data.episodes_total || '?',
                    images: { jpg: { image_url: img || '' } },
                    synopsis: data.description || 'Описание отсутствует',
                    genres: data.genres || [],
                    score: data.rating || 0,
                    russian: data.name?.main || '',
                    source: 'Anilibria'
                };
            }
        } catch (e) {
            console.log('⚠️ Anilibria детали ошибка');
        }

        // Пробуем Shikimori
        try {
            const data = await this._fetch(`${this.SHIKIMORI}/animes/${cleanId}`);
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
    // ПОИСК ВИДЕО В KODIK
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
console.log('✅ API модуль загружен (с поиском всех сезонов)');

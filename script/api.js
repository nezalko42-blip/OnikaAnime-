// ============================================
// API МОДУЛЬ ONIKAANIME (ANILIBRIA V1 С ПОИСКОМ ПО ВСЕМ СТРАНИЦАМ)
// ============================================

const API = {
    ANILIBRIA_V1: 'https://anilibria.top/api/v1',
    SHIKIMORI: 'https://shikimori.one/api/v2',
    
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

    async _fetch(url, options = {}) {
        const headers = {
            'User-Agent': 'OnikaAnime/2.0',
            'Accept': 'application/json',
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
    // ANILIBRIA V1 — ПОИСК ПО ВСЕМ СТРАНИЦАМ
    // ============================================
    async searchAnilibriaV1(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.ANILIBRIA_V1}/anime/catalog/releases?page=${page}&limit=24`;
        
        if (isSearch) {
            url += `&search=${encodeURIComponent(query)}`;
        }
        if (genre) {
            url += `&genre=${parseInt(genre)}`;
        }

        const data = await this._fetch(url);
        
        if (data?.data?.length > 0) {
            return {
                items: data.data.map(item => {
                    let img = '';
                    if (item.poster) {
                        const poster = item.poster.optimized || item.poster;
                        img = poster.src || poster.preview || poster.thumbnail || '';
                        if (img && img.startsWith('/')) {
                            img = 'https://anilibria.top' + img;
                        }
                    }
                    return {
                        mal_id: 'anilibria_' + item.id,
                        id: item.id,
                        title: item.name?.main || item.name?.english || item.name?.alternative || 'Без названия',
                        title_russian: item.name?.main || '',
                        title_english: item.name?.english || '',
                        year: item.year || '--',
                        episodes: item.episodes_total || '?',
                        images: { jpg: { image_url: img || '' } },
                        synopsis: item.description || 'Описание отсутствует',
                        genres: item.genres || [],
                        score: item.rating || 0,
                        russian: item.name?.main || '',
                        source: 'AnilibriaV1'
                    };
                }),
                totalPages: data.meta?.pagination?.total_pages || 1
            };
        }
        return null;
    },

    // ============================================
    // ПОИСК ВО ВСЕХ РЕЛИЗАХ (ОБХОД ОГРАНИЧЕНИЙ)
    // ============================================
    async searchAllReleases(query, maxPages = 5) {
        if (!query || query.length < 2) return { items: [], totalPages: 1 };
        
        console.log(`🔍 Глубокий поиск "${query}" по ${maxPages} страницам...`);
        
        let allItems = [];
        const seenTitles = new Set();
        const searchLower = query.toLowerCase().trim();
        
        // Перебираем страницы
        for (let page = 1; page <= maxPages; page++) {
            try {
                const result = await this.searchAnilibriaV1(query, null, page);
                if (!result?.items?.length) break;
                
                // Фильтруем результаты
                for (const item of result.items) {
                    const title = (item.title_russian || item.title || '').toLowerCase().trim();
                    const titleEn = (item.title_english || '').toLowerCase().trim();
                    
                    // Проверяем, содержит ли название искомое слово
                    if (title.includes(searchLower) || titleEn.includes(searchLower)) {
                        const key = title || titleEn;
                        if (!seenTitles.has(key) && key) {
                            seenTitles.add(key);
                            allItems.push(item);
                        }
                    }
                }
                
                // Если на странице меньше 24 результатов — это последняя страница
                if (result.items.length < 24) break;
                
            } catch (e) {
                console.log(`⚠️ Страница ${page} не загружена:`, e.message);
                break;
            }
        }
        
        console.log(`✅ Найдено уникальных релизов: ${allItems.length}`);
        
        return {
            items: allItems,
            totalPages: 1
        };
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
        const isSearch = query && query.length > 1;
        
        // Если это поиск — ищем по всем страницам
        if (isSearch) {
            console.log('🔍 Поиск по всем страницам:', query);
            
            // Сначала пробуем Anilibria V1 с глубоким поиском
            try {
                const result = await this.searchAllReleases(query, 10);
                if (result?.items?.length > 0) {
                    console.log('✅ Anilibria V1 найдено (глубокий поиск):', result.items.length);
                    return {
                        items: result.items,
                        totalPages: Math.ceil(result.items.length / 24) || 1
                    };
                }
            } catch (e) {
                console.log('⚠️ Anilibria V1 глубокий поиск ошибка:', e.message);
            }
            
            // Если Anilibria не дал результат — пробуем Shikimori
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
        }
        
        // Если не поиск — обычный каталог
        try {
            const result = await this.searchAnilibriaV1(query, genre, page);
            if (result?.items?.length > 0) {
                console.log('✅ Anilibria V1 каталог:', result.items.length);
                return result;
            }
        } catch (e) {
            console.log('⚠️ Anilibria V1 каталог ошибка:', e.message);
        }
        
        console.log('❌ Ничего не найдено');
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        
        try {
            const data = await this._fetch(`${this.ANILIBRIA_V1}/anime/releases/${cleanId}`);
            if (data?.id) {
                let img = '';
                if (data.poster) {
                    const poster = data.poster.optimized || data.poster;
                    img = poster.src || poster.preview || poster.thumbnail || '';
                    if (img && img.startsWith('/')) {
                        img = 'https://anilibria.top' + img;
                    }
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
console.log('✅ API модуль загружен (Anilibria V1 + глубокий поиск)');

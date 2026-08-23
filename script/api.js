// ============================================
// API МОДУЛЬ ONIKAANIME (ANILIBRIA V1 - ПОЛНЫЙ)
// ============================================

const API = {
    ANILIBRIA: 'https://anilibria.top/api/v1',
    
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
    // ПОИСК ПО ВСЕМ РЕЛИЗАМ (/app/search/releases)
    // ============================================
    async searchReleases(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        
        let url = `${this.ANILIBRIA}/app/search/releases?page=${page}&limit=24`;
        
        if (isSearch) {
            url += `&query=${encodeURIComponent(query)}`;
        }
        if (genre) {
            url += `&genre=${parseInt(genre)}`;
        }

        console.log('🔍 Anilibria поиск:', url);
        const data = await this._fetch(url);
        
        if (data?.list?.length > 0) {
            console.log('✅ Anilibria поиск найдено:', data.list.length);
            return {
                items: data.list.map(item => {
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
                        source: 'Anilibria'
                    };
                }),
                totalPages: data.pagination?.total_pages || 1
            };
        }
        return null;
    },

    // ============================================
    // КАТАЛОГ (/anime/catalog/releases)
    // ============================================
    async getCatalog(page = 1, genre = null) {
        let url = `${this.ANILIBRIA}/anime/catalog/releases?page=${page}&limit=24`;
        if (genre) {
            url += `&genre=${parseInt(genre)}`;
        }

        console.log('📚 Anilibria каталог:', url);
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
                        source: 'Anilibria'
                    };
                }),
                totalPages: data.meta?.pagination?.total_pages || 1
            };
        }
        return null;
    },

    // ============================================
    // ГЛУБОКИЙ ПОИСК (ПО ВСЕМ СТРАНИЦАМ)
    // ============================================
    async searchAllPages(query, maxPages = 20) {
        if (!query || query.length < 2) {
            return { items: [], totalPages: 1 };
        }
        
        console.log(`🔍 ГЛУБОКИЙ ПОИСК: "${query}" (макс. ${maxPages} стр.)`);
        
        let allItems = [];
        const seenIds = new Set();
        
        for (let page = 1; page <= maxPages; page++) {
            try {
                let url = `${this.ANILIBRIA}/app/search/releases?page=${page}&limit=50&query=${encodeURIComponent(query)}`;
                const data = await this._fetch(url);
                
                if (!data?.list?.length) {
                    console.log(`📄 Страница ${page} пуста, завершаем`);
                    break;
                }
                
                console.log(`📄 Страница ${page}: ${data.list.length} результатов`);
                
                for (const item of data.list) {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        let img = '';
                        if (item.poster) {
                            const poster = item.poster.optimized || item.poster;
                            img = poster.src || poster.preview || poster.thumbnail || '';
                            if (img && img.startsWith('/')) {
                                img = 'https://anilibria.top' + img;
                            }
                        }
                        allItems.push({
                            mal_id: 'anilibria_' + item.id,
                            id: item.id,
                            title: item.name?.main || item.name?.english || 'Без названия',
                            title_russian: item.name?.main || '',
                            title_english: item.name?.english || '',
                            year: item.year || '--',
                            episodes: item.episodes_total || '?',
                            images: { jpg: { image_url: img || '' } },
                            synopsis: item.description || 'Описание отсутствует',
                            genres: item.genres || [],
                            score: item.rating || 0,
                            russian: item.name?.main || '',
                            source: 'Anilibria'
                        });
                    }
                }
                
                if (data.list.length < 50) {
                    console.log(`📄 Страница ${page} последняя (меньше 50 записей)`);
                    break;
                }
                
            } catch (e) {
                console.log(`⚠️ Страница ${page} не загружена:`, e.message);
                break;
            }
        }
        
        console.log(`✅ ВСЕГО НАЙДЕНО: ${allItems.length} аниме`);
        
        return {
            items: allItems,
            totalPages: 1
        };
    },

    // ============================================
    // ОСНОВНАЯ ФУНКЦИЯ
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        
        if (isSearch) {
            console.log('🔍 ПОИСК:', query);
            
            try {
                const result = await this.searchAllPages(query);
                if (result?.items?.length > 0) {
                    console.log('✅ Глубокий поиск:', result.items.length);
                    const totalPages = Math.ceil(result.items.length / 24);
                    const start = (page - 1) * 24;
                    const paginated = result.items.slice(start, start + 24);
                    return {
                        items: paginated,
                        totalPages: Math.max(totalPages, 1)
                    };
                }
            } catch (e) {
                console.log('⚠️ Глубокий поиск ошибка:', e.message);
            }
            
            try {
                const result = await this.searchReleases(query, genre, page);
                if (result?.items?.length > 0) {
                    console.log('✅ Обычный поиск:', result.items.length);
                    return result;
                }
            } catch (e) {
                console.log('⚠️ Поиск ошибка:', e.message);
            }
        }
        
        console.log('📚 КАТАЛОГ');
        try {
            const result = await this.getCatalog(page, genre);
            if (result?.items?.length > 0) {
                console.log('✅ Каталог:', result.items.length);
                return result;
            }
        } catch (e) {
            console.log('⚠️ Каталог ошибка:', e.message);
        }
        
        console.log('❌ Ничего не найдено');
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ (/anime/releases/{idOrAlias})
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        
        try {
            const data = await this._fetch(`${this.ANILIBRIA}/anime/releases/${cleanId}`);
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
                    id: data.id,
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
        return null;
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (Anilibria V1 - полный)');

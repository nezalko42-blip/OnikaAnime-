// ============================================
// API МОДУЛЬ ONIKAANIME (ANILIBRIA V1 - ПОИСК ПО ВСЕМ СТРАНИЦАМ)
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
    // ПОИСК ПО ВСЕМ СТРАНИЦАМ (ДО 20 СТРАНИЦ)
    // ============================================
    async searchAllPages(query, genre = null, maxPages = 20) {
        if (!query || query.length < 2) {
            return { items: [], totalPages: 1 };
        }
        
        console.log(`🔍 ПОИСК ПО ВСЕМ СТРАНИЦАМ: "${query}" (макс. ${maxPages} стр.)`);
        
        let allItems = [];
        const seenIds = new Set();
        const searchLower = query.toLowerCase().trim();
        
        // Перебираем все страницы
        for (let page = 1; page <= maxPages; page++) {
            try {
                let url = `${this.ANILIBRIA}/anime/catalog/releases?page=${page}&limit=50`;
                url += `&search=${encodeURIComponent(query)}`;
                if (genre) {
                    url += `&genre=${parseInt(genre)}`;
                }
                
                const data = await this._fetch(url);
                
                if (!data?.data?.length) {
                    console.log(`📄 Страница ${page} пуста, завершаем поиск`);
                    break;
                }
                
                console.log(`📄 Страница ${page}: ${data.data.length} результатов`);
                
                // Обрабатываем каждый элемент
                for (const item of data.data) {
                    if (!seenIds.has(item.id)) {
                        // Проверяем совпадение по названию
                        const title = (item.name?.main || '').toLowerCase();
                        const titleEn = (item.name?.english || '').toLowerCase();
                        const alias = (item.alias || '').toLowerCase();
                        
                        if (title.includes(searchLower) || 
                            titleEn.includes(searchLower) || 
                            alias.includes(searchLower)) {
                            
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
                }
                
                // Если на странице меньше 50 — это последняя
                if (data.data.length < 50) {
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
    // ОБЫЧНЫЙ ПОИСК (ДЛЯ КАТАЛОГА)
    // ============================================
    async searchAnilibria(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.ANILIBRIA}/anime/catalog/releases?page=${page}&limit=24`;
        
        if (isSearch) {
            url += `&search=${encodeURIComponent(query)}`;
        }
        if (genre) {
            url += `&genre=${parseInt(genre)}`;
        }

        console.log('🔍 Anilibria запрос:', url);
        const data = await this._fetch(url);
        
        if (data?.data?.length > 0) {
            console.log('✅ Anilibria найдено:', data.data.length);
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
    // ОСНОВНАЯ ФУНКЦИЯ
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        
        // Если это поиск — ищем по всем страницам
        if (isSearch) {
            console.log('🔍 ПОИСК ПО ВСЕМ СТРАНИЦАМ:', query);
            
            try {
                const result = await this.searchAllPages(query, genre);
                if (result?.items?.length > 0) {
                    console.log('✅ Найдено результатов:', result.items.length);
                    
                    // Пагинация результатов (24 на страницу)
                    const totalPages = Math.ceil(result.items.length / 24);
                    const start = (page - 1) * 24;
                    const paginated = result.items.slice(start, start + 24);
                    
                    return {
                        items: paginated,
                        totalPages: Math.max(totalPages, 1)
                    };
                }
            } catch (e) {
                console.log('⚠️ Ошибка глубокого поиска:', e.message);
            }
            
            // Если глубокий поиск не дал результат — пробуем обычный
            console.log('🔄 Пробуем обычный поиск...');
            try {
                const result = await this.searchAnilibria(query, genre, page);
                if (result?.items?.length > 0) {
                    console.log('✅ Обычный поиск:', result.items.length);
                    return result;
                }
            } catch (e) {
                console.log('⚠️ Обычный поиск ошибка:', e.message);
            }
        }
        
        // Если не поиск — каталог
        console.log('📚 Каталог Anilibria');
        try {
            const result = await this.searchAnilibria('', genre, page);
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
    // ДЕТАЛИ АНИМЕ
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
console.log('✅ API модуль загружен (Anilibria V1 - поиск по всем страницам)');

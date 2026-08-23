// ============================================
// API МОДУЛЬ ONIKAANIME (ANILIBERTY V1 - ВСЕ АНИМЕ)
// ============================================

const API = {
    ANILIBERTY: 'https://anilibria.top/api/v1',
    
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
    // ПОЛУЧЕНИЕ ВСЕХ АНИМЕ (ПО СТРАНИЦАМ)
    // ============================================
    async getAllAnime(maxPages = 50) {
        console.log(`📡 Сбор всех аниме (до ${maxPages} страниц)...`);
        
        let allItems = [];
        const seenIds = new Set();
        
        for (let page = 1; page <= maxPages; page++) {
            try {
                const url = `${this.ANILIBERTY}/anime/catalog/releases?page=${page}&limit=100`;
                const data = await this._fetch(url);
                
                if (!data?.data?.length) {
                    console.log(`📄 Страница ${page} пуста, завершаем`);
                    break;
                }
                
                console.log(`📄 Страница ${page}: ${data.data.length} аниме`);
                
                for (const item of data.data) {
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
                            source: 'Aniliberty'
                        });
                    }
                }
                
                // Если на странице меньше 100 — это последняя
                if (data.data.length < 100) {
                    console.log(`📄 Последняя страница ${page}`);
                    break;
                }
                
            } catch (e) {
                console.log(`⚠️ Страница ${page} не загружена:`, e.message);
                break;
            }
        }
        
        console.log(`✅ Всего собрано: ${allItems.length} аниме`);
        return allItems;
    },

    // ============================================
    // ПОИСК В СОБРАННЫХ ДАННЫХ (НА КЛИЕНТЕ)
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        // Собираем все аниме (с кэшированием)
        const cacheKey = 'all_anime_data';
        let allAnime = this._cache.get(cacheKey)?.data;
        
        if (!allAnime) {
            allAnime = await this.getAllAnime(50);
            this._cache.set(cacheKey, { data: allAnime, timestamp: Date.now() });
        }
        
        let results = [...allAnime];
        const isSearch = query && query.length > 1;
        
        // Поиск по названию
        if (isSearch) {
            const q = query.toLowerCase().trim();
            results = results.filter(item => {
                const title = (item.title || '').toLowerCase();
                const titleRu = (item.title_russian || '').toLowerCase();
                const titleEn = (item.title_english || '').toLowerCase();
                return title.includes(q) || titleRu.includes(q) || titleEn.includes(q);
            });
            console.log(`🔍 Поиск "${query}": найдено ${results.length} из ${allAnime.length}`);
        }
        
        // Фильтр по жанру
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
            console.log(`🎭 Фильтр по жанру "${g}": ${results.length} из ${allAnime.length}`);
        }
        
        // Пагинация
        const totalPages = Math.max(Math.ceil(results.length / 12), 1);
        const start = (page - 1) * 12;
        const paginated = results.slice(start, start + 12);
        
        if (results.length === 0) {
            console.log('❌ Ничего не найдено');
        }
        
        return {
            items: paginated,
            totalPages: totalPages
        };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        
        try {
            const data = await this._fetch(`${this.ANILIBERTY}/anime/releases/${cleanId}`);
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
                    source: 'Aniliberty'
                };
            }
        } catch (e) {
            console.log('⚠️ Aniliberty детали ошибка');
        }
        return null;
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (Aniliberty V1 - все аниме)');

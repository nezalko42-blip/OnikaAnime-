// ============================================
// API МОДУЛЬ ONIKAANIME (ПОЛНОЦЕННЫЙ ПОИСК)
// ============================================

const API = {
    ANILIBRIA_V1: 'https://anilibria.top/api/v1',
    ANILIBRIA_V2: 'https://api.anilibria.tv/v2',
    ANILIBRIA_V3: 'https://api.anilibria.tv/v3',
    
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
    // ПОИСК В V1 (ПРЯМОЙ ПОИСК)
    // ============================================
    async searchV1(query, page = 1) {
        const url = `${this.ANILIBRIA_V1}/anime/catalog/releases?search=${encodeURIComponent(query)}&page=${page}&limit=50`;
        const data = await this._fetch(url);
        
        if (data?.data?.length > 0) {
            return data.data.map(item => this._convertItem(item, 'V1'));
        }
        return [];
    },

    // ============================================
    // ПОИСК В V2 (ПРЯМОЙ ПОИСК)
    // ============================================
    async searchV2(query, page = 1) {
        const url = `${this.ANILIBRIA_V2}/getReleases?search=${encodeURIComponent(query)}&page=${page}&limit=50`;
        const data = await this._fetch(url);
        
        if (data?.list?.length > 0) {
            return data.list.map(item => this._convertItem(item, 'V2'));
        }
        return [];
    },

    // ============================================
    // ПОИСК В V3 (ПРЯМОЙ ПОИСК)
    // ============================================
    async searchV3(query, page = 1) {
        const body = { 
            page: page, 
            limit: 50,
            f: { 
                sorting: 'FRESH_AT_DESC',
                search: query
            } 
        };

        const data = await this._fetch(
            this.ANILIBRIA_V3 + '/anime/catalog/releases',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );

        if (data?.data?.length > 0) {
            return data.data.map(item => this._convertItem(item, 'V3'));
        }
        return [];
    },

    // ============================================
    // КОНВЕРТАЦИЯ
    // ============================================
    _convertItem(item, version) {
        let img = '';
        let id = item.id || item.code;
        let name = item.name?.main || item.name?.english || item.name || 'Без названия';
        let russian = item.name?.main || item.russian || '';
        let english = item.name?.english || item.english || '';
        let year = item.year || '--';
        let episodes = item.episodes_total || item.episodes || '?';
        let genres = item.genres || [];
        let score = item.rating || item.score || 0;
        let description = item.description || item.synopsis || 'Описание отсутствует';
        
        if (item.poster) {
            const poster = item.poster.optimized || item.poster;
            if (typeof poster === 'string') {
                img = poster;
            } else {
                img = poster.src || poster.preview || poster.thumbnail || poster.url || '';
            }
            if (img && img.startsWith('/')) {
                img = 'https://anilibria.top' + img;
            }
        }

        return {
            mal_id: 'anilibria_' + id,
            id: id,
            title: name,
            title_russian: russian,
            title_english: english,
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: description,
            genres: genres,
            score: score,
            russian: russian,
            source: 'Anilibria' + version,
            version: version
        };
    },

    // ============================================
    // ГЛАВНАЯ ФУНКЦИЯ ПОИСКА
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        // Если это не поиск — показываем каталог
        if (!query || query.length < 2) {
            console.log('📚 Каталог Anilibria');
            return await this.getCatalog(page, genre);
        }

        console.log(`🔍 ПОИСК: "${query}"`);

        let allResults = [];
        const seenIds = new Set();

        // 1. Пробуем V1
        console.log('  ⏳ V1...');
        try {
            const items = await this.searchV1(query, page);
            if (items.length > 0) {
                console.log(`  ✅ V1: ${items.length} результатов`);
                for (const item of items) {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        allResults.push(item);
                    }
                }
            } else {
                console.log('  ❌ V1: ничего не найдено');
            }
        } catch (e) {
            console.log('  ⚠️ V1 ошибка:', e.message);
        }

        // 2. Пробуем V2
        console.log('  ⏳ V2...');
        try {
            const items = await this.searchV2(query, page);
            if (items.length > 0) {
                console.log(`  ✅ V2: ${items.length} результатов`);
                for (const item of items) {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        allResults.push(item);
                    }
                }
            } else {
                console.log('  ❌ V2: ничего не найдено');
            }
        } catch (e) {
            console.log('  ⚠️ V2 ошибка:', e.message);
        }

        // 3. Пробуем V3
        console.log('  ⏳ V3...');
        try {
            const items = await this.searchV3(query, page);
            if (items.length > 0) {
                console.log(`  ✅ V3: ${items.length} результатов`);
                for (const item of items) {
                    if (!seenIds.has(item.id)) {
                        seenIds.add(item.id);
                        allResults.push(item);
                    }
                }
            } else {
                console.log('  ❌ V3: ничего не найдено');
            }
        } catch (e) {
            console.log('  ⚠️ V3 ошибка:', e.message);
        }

        // ФИЛЬТРУЕМ РЕЗУЛЬТАТЫ — оставляем только релевантные
        const searchLower = query.toLowerCase().trim();
        const filteredResults = allResults.filter(item => {
            const title = (item.title_russian || item.title || '').toLowerCase();
            const titleEn = (item.title_english || '').toLowerCase();
            const name = (item.russian || '').toLowerCase();
            
            // Проверяем все возможные поля
            return title.includes(searchLower) || 
                   titleEn.includes(searchLower) || 
                   name.includes(searchLower);
        });

        console.log(`📊 ВСЕГО НАЙДЕНО: ${allResults.length}, ПОСЛЕ ФИЛЬТРАЦИИ: ${filteredResults.length}`);

        if (filteredResults.length === 0) {
            console.log('❌ По вашему запросу ничего не найдено');
            return { items: [], totalPages: 1 };
        }

        // Пагинация (12 на страницу)
        const start = (page - 1) * 12;
        const paginatedItems = filteredResults.slice(start, start + 12);
        const totalPages = Math.ceil(filteredResults.length / 12);

        return {
            items: paginatedItems,
            totalPages: Math.max(totalPages, 1)
        };
    },

    // ============================================
    // КАТАЛОГ (БЕЗ ПОИСКА)
    // ============================================
    async getCatalog(page = 1, genre = null) {
        let url = `${this.ANILIBRIA_V1}/anime/catalog/releases?page=${page}&limit=24`;
        if (genre) {
            url += `&genre=${parseInt(genre)}`;
        }

        const data = await this._fetch(url);
        
        if (data?.data?.length > 0) {
            return {
                items: data.data.map(item => this._convertItem(item, 'V1')),
                totalPages: data.meta?.pagination?.total_pages || 1
            };
        }

        // Если V1 не работает — пробуем V2
        try {
            let url2 = `${this.ANILIBRIA_V2}/getReleases?page=${page}&limit=24`;
            if (genre) {
                url2 += `&genre=${parseInt(genre)}`;
            }
            const data2 = await this._fetch(url2);
            if (data2?.list?.length > 0) {
                return {
                    items: data2.list.map(item => this._convertItem(item, 'V2')),
                    totalPages: data2.meta?.pagination?.total_pages || 1
                };
            }
        } catch (e) {}

        return { items: [], totalPages: 1 };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        
        // Пробуем V1
        try {
            const data = await this._fetch(`${this.ANILIBRIA_V1}/anime/releases/${cleanId}`);
            if (data?.id) return this._convertItem(data, 'V1');
        } catch (e) {}

        // Пробуем V2
        try {
            const data = await this._fetch(`${this.ANILIBRIA_V2}/getRelease?id=${cleanId}`);
            if (data?.id) return this._convertItem(data, 'V2');
        } catch (e) {}

        // Пробуем V3
        try {
            const data = await this._fetch(`${this.ANILIBRIA_V3}/title/${cleanId}`);
            if (data?.id) return this._convertItem(data, 'V3');
        } catch (e) {}

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
console.log('✅ API модуль загружен (полноценный поиск)');

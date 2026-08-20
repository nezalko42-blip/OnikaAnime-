// ============================================
// API МОДУЛЬ ONIKAANIME (ANILIBRIA V1 + V2 + V3)
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
    // ANILIBRIA V1
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

        console.log('🔍 V1:', url);
        const data = await this._fetch(url);
        
        if (data?.data?.length > 0) {
            return {
                items: data.data.map(item => this._convertItem(item, 'V1')),
                totalPages: data.meta?.pagination?.total_pages || 1
            };
        }
        return null;
    },

    // ============================================
    // ANILIBRIA V2
    // ============================================
    async searchAnilibriaV2(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.ANILIBRIA_V2}/getReleases?page=${page}&limit=24`;
        
        if (isSearch) {
            url = `${this.ANILIBRIA_V2}/getReleases?search=${encodeURIComponent(query)}&page=${page}&limit=24`;
        } else if (genre) {
            url += `&genre=${parseInt(genre)}`;
        }

        console.log('🔍 V2:', url);
        const data = await this._fetch(url);
        
        if (data?.list?.length > 0) {
            return {
                items: data.list.map(item => this._convertItem(item, 'V2')),
                totalPages: data.meta?.pagination?.total_pages || 1
            };
        }
        return null;
    },

    // ============================================
    // ANILIBRIA V3
    // ============================================
    async searchAnilibriaV3(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        const body = { 
            page: page, 
            limit: 24, 
            f: { sorting: 'FRESH_AT_DESC' } 
        };

        if (isSearch) {
            body.f.search = query;
        } else if (genre) {
            body.f.genres = [parseInt(genre)];
        }

        console.log('🔍 V3:', this.ANILIBRIA_V3 + '/anime/catalog/releases', body);
        const data = await this._fetch(
            this.ANILIBRIA_V3 + '/anime/catalog/releases',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );

        if (data?.data?.length > 0) {
            return {
                items: data.data.map(item => this._convertItem(item, 'V3')),
                totalPages: data.meta?.pagination?.total_pages || 1
            };
        }
        return null;
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
    // ПОИСК ПО ВСЕМ ВЕРСИЯМ
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        console.log('🔍 Поиск:', query || 'каталог');
        
        let allItems = [];
        const seenIds = new Set();
        
        // Список версий для поиска
        const versions = [
            { name: 'V1', fn: this.searchAnilibriaV1.bind(this) },
            { name: 'V2', fn: this.searchAnilibriaV2.bind(this) },
            { name: 'V3', fn: this.searchAnilibriaV3.bind(this) }
        ];
        
        // Пробуем каждую версию
        for (const version of versions) {
            try {
                const result = await version.fn(query, genre, page);
                if (result?.items?.length > 0) {
                    console.log(`✅ ${version.name} найдено:`, result.items.length);
                    for (const item of result.items) {
                        const key = item.id + '_' + item.title;
                        if (!seenIds.has(key)) {
                            seenIds.add(key);
                            allItems.push(item);
                        }
                    }
                }
            } catch (e) {
                console.log(`⚠️ ${version.name} ошибка:`, e.message);
            }
        }
        
        if (allItems.length === 0) {
            console.log('❌ Ничего не найдено');
            return { items: [], totalPages: 1 };
        }
        
        console.log(`✅ Всего найдено: ${allItems.length}`);
        
        // Пагинация
        const start = (page - 1) * 12;
        const paginatedItems = allItems.slice(start, start + 12);
        const totalPages = Math.ceil(allItems.length / 12);
        
        return {
            items: paginatedItems,
            totalPages: Math.max(totalPages, 1)
        };
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
console.log('✅ API модуль загружен (Anilibria V1 + V2 + V3)');

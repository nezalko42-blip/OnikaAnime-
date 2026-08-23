// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria API v3)
// ============================================

const API = {
    BASE_URL: 'https://api.anilibria.tv/v3',

    // ===== БАЗОВЫЙ ЗАПРОС =====
    async _fetch(url, options = {}) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
        };
        try {
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log(`📡 [${url}]`, data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ (НОВИНКИ) – /title/updates
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        // Если есть поисковый запрос – используем /title/search
        if (query && query.length > 1) {
            return await this._searchTitles(query, page);
        }

        // Иначе – каталог через /title/updates
        const url = `${this.BASE_URL}/title/updates?page=${page}&items_per_page=24&filter=id,names,posters,type,status,year,genres,season,episodes_total`;
        const data = await this._fetch(url);
        if (data?.list?.length) {
            const items = data.list.map(item => this._convertItem(item));
            return {
                items: items,
                totalPages: data.pagination?.pages || 1
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 2. ПОИСК – /title/search
    // ============================================
    async _searchTitles(query, page = 1) {
        const url = `${this.BASE_URL}/title/search?search=${encodeURIComponent(query)}&page=${page}&items_per_page=24&filter=id,names,posters,type,status,year,genres,season,episodes_total`;
        const data = await this._fetch(url);
        if (data?.list?.length) {
            const items = data.list.map(item => this._convertItem(item));
            return {
                items: items,
                totalPages: data.pagination?.pages || 1
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 3. РАСПИСАНИЕ – /title/schedule
    // ============================================
    async getSchedule() {
        const url = `${this.BASE_URL}/title/schedule?filter=id,names,publish_day,publish_time,season`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            return data;
        }
        return [];
    },

    // ============================================
    // 4. ДЕТАЛИ – /title
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const url = `${this.BASE_URL}/title?id=${cleanId}&filter=id,names,posters,type,status,description,year,genres,season,episodes_total,player,torrents,franchises`;
        const data = await this._fetch(url);
        if (data?.id) {
            return this._convertItem(data);
        }
        return null;
    },

    // ============================================
    // 5. СЛУЧАЙНОЕ – /title/random
    // ============================================
    async getRandomReleases(limit = 1) {
        const url = `${this.BASE_URL}/title/random?filter=id,names,posters,type,year,genres,episodes_total`;
        const data = await this._fetch(url);
        if (data) {
            const items = Array.isArray(data) ? data : [data];
            return items.slice(0, limit).map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 6. РЕКОМЕНДАЦИИ (используем /title/updates)
    // ============================================
    async getRecommended(limit = 6) {
        const url = `${this.BASE_URL}/title/updates?limit=${limit}&filter=id,names,posters,type,genres`;
        const data = await this._fetch(url);
        if (data?.list?.length) {
            return data.list.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 7. АВТОДОПОЛНЕНИЕ (используем /title/search с limit)
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const url = `${this.BASE_URL}/title/search?search=${encodeURIComponent(query)}&limit=${limit}&filter=id,names,posters`;
        const data = await this._fetch(url);
        if (data?.list?.length) {
            return data.list.map(item => ({
                id: item.id,
                title: item.names?.ru || item.names?.en || 'Без названия',
                poster: item.posters?.medium?.url || item.posters?.small?.url || ''
            }));
        }
        return [];
    },

    // ============================================
    // 8. КОНВЕРТАЦИЯ ЭЛЕМЕНТА (под v3)
    // ============================================
    _convertItem(item) {
        let img = '';
        if (item.posters) {
            const poster = item.posters.medium || item.posters.small || item.posters.original;
            if (poster && poster.url) {
                img = poster.url;
                if (img.startsWith('/')) {
                    img = 'https://anilibria.tv' + img;
                }
            }
        }

        const names = item.names || {};
        const title = names.ru || names.en || 'Без названия';
        const genres = item.genres || [];
        const season = item.season || {};
        const year = season.year || item.year || '--';
        const episodes = item.episodes_total || item.episodes?.string || '?';

        return {
            mal_id: 'anilibria_' + item.id,
            id: item.id,
            title: title,
            title_russian: names.ru || '',
            title_english: names.en || '',
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: item.description || 'Описание отсутствует',
            genres: genres,
            score: 0,
            russian: names.ru || '',
            source: 'Anilibria v3',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (v3) загружен');

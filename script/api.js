// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria v1)
// Работает через POST-запросы к public/api/index.php
// ============================================

const API = {
    BASE_URL: 'https://www.anilibria.tv/public/api/index.php',

    // ===== БАЗОВЫЙ POST-ЗАПРОС =====
    async _post(params = {}) {
        const formData = new URLSearchParams();
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null) {
                if (typeof params[key] === 'object') {
                    formData.append(key, JSON.stringify(params[key]));
                } else {
                    formData.append(key, params[key]);
                }
            }
        }

        try {
            console.log('📡 Запрос:', this.BASE_URL, params);
            const response = await fetch(this.BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: formData.toString()
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('📦 Ответ:', data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ (query=catalog)
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        const perPage = 24;
        const params = {
            query: 'catalog',
            page: page,
            perPage: perPage,
            sort: '2', // сортировка по новизне
            xpage: 'catalog'
        };

        if (query && query.length > 1) {
            return await this._searchTitles(query, page);
        }

        if (genre) {
            params.search = JSON.stringify({ genre: genre });
        }

        const data = await this._post(params);
        if (data && data.status === true && data.data && data.data.items) {
            const items = data.data.items.map(item => this._convertItem(item));
            const pagination = data.data.pagination || {};
            const totalPages = pagination.allPages || 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 2. ПОИСК (query=search)
    // ============================================
    async _searchTitles(query, page = 1) {
        const perPage = 24;
        const params = {
            query: 'search',
            search: query,
            page: page,
            perPage: perPage
        };
        const data = await this._post(params);
        if (data && data.status === true && data.data && data.data.items) {
            const items = data.data.items.map(item => this._convertItem(item));
            const pagination = data.data.pagination || {};
            const totalPages = pagination.allPages || 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 3. РАСПИСАНИЕ (query=schedule)
    // ============================================
    async getSchedule() {
        const params = { query: 'schedule' };
        const data = await this._post(params);
        if (data && data.status === true && Array.isArray(data.data)) {
            return data.data.map(dayObj => ({
                day: parseInt(dayObj.day) - 1,
                list: dayObj.items.map(item => this._convertItem(item))
            }));
        }
        return [];
    },

    // ============================================
    // 4. ДЕТАЛИ (query=release)
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const params = {
            query: 'release',
            id: cleanId
        };
        const data = await this._post(params);
        if (data && data.status === true && data.data) {
            return this._convertItem(data.data);
        }
        return null;
    },

    // ============================================
    // 5. СЛУЧАЙНОЕ (query=random_release)
    // ============================================
    async getRandomReleases(limit = 1) {
        const params = { query: 'random_release' };
        const data = await this._post(params);
        if (data && data.status === true && data.data && data.data.code) {
            const details = await this.getAnimeDetails(data.data.code);
            if (details) {
                return [details];
            }
        }
        return [];
    },

    // ============================================
    // 6. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 6) {
        const params = {
            query: 'catalog',
            page: 1,
            perPage: limit,
            sort: '1',
            xpage: 'catalog'
        };
        const data = await this._post(params);
        if (data && data.status === true && data.data && data.data.items) {
            return data.data.items.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 7. АВТОДОПОЛНЕНИЕ
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const params = {
            query: 'search',
            search: query,
            page: 1,
            perPage: limit
        };
        const data = await this._post(params);
        if (data && data.status === true && data.data && data.data.items) {
            return data.data.items.map(item => ({
                id: item.id,
                title: item.names?.[0] || item.names?.[1] || 'Без названия',
                poster: item.poster || ''
            }));
        }
        return [];
    },

    // ============================================
    // 8. КОНВЕРТАЦИЯ
    // ============================================
    _convertItem(item) {
        let img = '';
        if (item.poster) {
            img = item.poster;
            if (img && img.startsWith('/')) {
                img = 'https://www.anilibria.tv' + img;
            }
        }

        const names = item.names || [];
        const title = names[0] || names[1] || 'Без названия';
        const title_russian = names[0] || '';
        const title_english = names[1] || '';

        const genres = item.genres ? item.genres.split(',').map(g => g.trim()) : [];
        const year = item.year || '--';
        const episodes = item.series || '?';

        return {
            mal_id: 'anilibria_' + item.id,
            id: 'anilibria_' + item.id,
            title: title,
            title_russian: title_russian,
            title_english: title_english,
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: item.description || 'Описание отсутствует',
            genres: genres,
            score: 0,
            russian: title_russian,
            source: 'Anilibria v1',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Anilibria v1) загружен');

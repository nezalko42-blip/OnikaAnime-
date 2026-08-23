// ============================================
// API МОДУЛЬ ONIKAANIME (Shikimori API)
// Надёжный, публичный, без авторизации
// ============================================

const API = {
    BASE_URL: 'https://shikimori.one/api',

    // ===== БАЗОВЫЙ ЗАПРОС =====
    async _fetch(url, options = {}) {
        const headers = {
            'Accept': 'application/json',
            'User-Agent': 'OnikaAnime/2.0',
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
    // 1. КАТАЛОГ И ПОИСК
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        const limit = 24;
        const offset = (page - 1) * limit;

        // Строим URL с параметрами
        let url = `${this.BASE_URL}/animes?limit=${limit}&offset=${offset}`;

        // Если есть поисковый запрос
        if (query && query.length > 1) {
            url += `&search=${encodeURIComponent(query)}`;
        }

        // Фильтр по жанру (передаём ID жанра, но Shikimori использует строки)
        if (genre) {
            // Shikimori жанры: 'action', 'drama', 'comedy', 'fantasy', 'romance'
            const genreMap = {
                '1': 'action',
                '8': 'drama',
                '21': 'comedy',
                '10': 'fantasy',
                '22': 'romance'
            };
            const genreName = genreMap[genre];
            if (genreName) {
                url += `&genre=${genreName}`;
            }
        }

        // Сортировка – по умолчанию свежие
        url += `&order=released_on`;

        console.log('📡 Shikimori запрос:', url);
        const data = await this._fetch(url);

        if (data && Array.isArray(data)) {
            const items = data.map(item => this._convertItem(item));
            // Для пагинации нужно знать общее количество, но Shikimori не возвращает его в этом эндпоинте
            // Поэтому предположим, что если вернулось меньше лимита, это последняя страница
            const totalPages = data.length < limit ? page : page + 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 2. РАСПИСАНИЕ – /calendar
    // ============================================
    async getSchedule() {
        const url = `${this.BASE_URL}/calendar`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            // data – массив объектов { day: 0..6, animes: [...] }
            return data;
        }
        return [];
    },

    // ============================================
    // 3. ДЕТАЛИ – /animes/{id}
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const url = `${this.BASE_URL}/animes/${cleanId}`;
        const data = await this._fetch(url);
        if (data && data.id) {
            return this._convertItem(data);
        }
        return null;
    },

    // ============================================
    // 4. СЛУЧАЙНОЕ – получаем случайную страницу
    // ============================================
    async getRandomReleases(limit = 1) {
        // Получаем общее количество аниме (приблизительно)
        const countUrl = `${this.BASE_URL}/animes?limit=1`;
        const countData = await this._fetch(countUrl);
        let total = 1000; // запасное значение
        if (countData && countData.length === 1) {
            // Shikimori не возвращает total, поэтому используем фиксированный большой номер
            total = 10000;
        }
        const randomPage = Math.floor(Math.random() * (total / 24)) + 1;
        const offset = (randomPage - 1) * 24;
        const url = `${this.BASE_URL}/animes?limit=${limit}&offset=${offset}`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data) && data.length > 0) {
            // Берём первые `limit` штук
            return data.slice(0, limit).map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 5. РЕКОМЕНДАЦИИ – популярные
    // ============================================
    async getRecommended(limit = 6) {
        const url = `${this.BASE_URL}/animes?limit=${limit}&order=popularity`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            return data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 6. АВТОДОПОЛНЕНИЕ – поиск с лимитом
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const url = `${this.BASE_URL}/animes?search=${encodeURIComponent(query)}&limit=${limit}`;
        const data = await this._fetch(url);
        if (data && Array.isArray(data)) {
            return data.map(item => ({
                id: item.id,
                title: item.russian || item.name || 'Без названия',
                poster: item.poster?.medium?.url || item.poster?.small?.url || ''
            }));
        }
        return [];
    },

    // ============================================
    // 7. КОНВЕРТАЦИЯ ЭЛЕМЕНТА (Shikimori → наш формат)
    // ============================================
    _convertItem(item) {
        // Постер
        let img = '';
        if (item.poster) {
            const poster = item.poster.medium || item.poster.small || item.poster.original;
            if (poster && poster.url) {
                img = poster.url;
                if (img.startsWith('/')) {
                    img = 'https://shikimori.one' + img;
                }
            }
        }

        // Названия
        const title = item.russian || item.name || 'Без названия';
        const title_russian = item.russian || '';
        const title_english = item.name || '';

        // Жанры – Shikimori возвращает массив объектов { id, name, russian }
        const genres = (item.genres || []).map(g => g.russian || g.name);

        // Год
        const year = item.year || item.released_on?.split('-')[0] || '--';

        // Количество серий
        const episodes = item.episodes || item.episodes_aired || '?';

        return {
            mal_id: 'shikimori_' + item.id,
            id: item.id,
            title: title,
            title_russian: title_russian,
            title_english: title_english,
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: item.description || item.description_en || 'Описание отсутствует',
            genres: genres,
            score: item.score || 0,
            russian: title_russian,
            source: 'Shikimori',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Shikimori) загружен');

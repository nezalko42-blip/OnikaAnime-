// ============================================
// API МОДУЛЬ ONIKAANIME (Jikan API v4)
// Официальное некоммерческое API MyAnimeList
// Документация: https://docs.api.jikan.moe/
// ============================================

const API = {
    BASE_URL: 'https://api.jikan.moe/v4',

    // ===== БАЗОВЫЙ GET-ЗАПРОС С ЗАДЕРЖКОЙ =====
    async _fetch(url, options = {}) {
        // Jikan требует задержки между запросами (rate limit)
        await this._delay(400);
        
        try {
            console.log('📡 Запрос:', url);
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'OnikaAnime/2.0',
                    ...options.headers
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            const data = await response.json();
            console.log('📦 Ответ:', data);
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            return null;
        }
    },

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ============================================
    // 1. КАТАЛОГ (поиск аниме)
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        const limit = 24;
        let url = `${this.BASE_URL}/anime?page=${page}&limit=${limit}`;

        if (query && query.length > 1) {
            url += `&q=${encodeURIComponent(query)}`;
        }

        // Жанры в Jikan - это ID
        if (genre) {
            const genreMap = {
                '1': '1',   // Action
                '8': '8',   // Drama
                '21': '4',  // Comedy
                '10': '10', // Fantasy
                '22': '22'  // Romance
            };
            const genreId = genreMap[genre];
            if (genreId) {
                url += `&genres=${genreId}`;
            }
        }

        // Сортировка по популярности
        url += `&order_by=popularity&sort=desc`;

        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            const items = data.data.map(item => this._convertItem(item));
            const totalPages = data.pagination?.last_visible_page || 1;
            return {
                items: items,
                totalPages: totalPages
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 2. ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('jikan_', '');
        const url = `${this.BASE_URL}/anime/${cleanId}/full`;
        const data = await this._fetch(url);
        if (data && data.data) {
            return this._convertItem(data.data);
        }
        return null;
    },

    // ============================================
    // 3. ПОИСК С АВТОДОПОЛНЕНИЕМ
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const url = `${this.BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=${limit}`;
        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => ({
                id: 'jikan_' + item.mal_id,
                title: item.title || item.title_english || 'Без названия',
                poster: item.images?.jpg?.image_url || item.images?.webp?.image_url || ''
            }));
        }
        return [];
    },

    // ============================================
    // 4. РЕКОМЕНДАЦИИ (популярные аниме)
    // ============================================
    async getRecommended(limit = 6) {
        const url = `${this.BASE_URL}/top/anime?limit=${limit}&filter=bypopularity`;
        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 5. СЛУЧАЙНОЕ АНИМЕ
    // ============================================
    async getRandomReleases(limit = 1) {
        // Получаем случайную страницу (от 1 до 100)
        const randomPage = Math.floor(Math.random() * 100) + 1;
        const url = `${this.BASE_URL}/anime?page=${randomPage}&limit=${limit}`;
        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 6. РАСПИСАНИЕ (текущий сезон)
    // ============================================
    async getSchedule() {
        // Jikan не имеет прямого расписания, используем текущий сезон
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        let season = 'winter';
        if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else if (month >= 9 && month <= 11) season = 'fall';
        else season = 'winter';
        
        const url = `${this.BASE_URL}/seasons/${year}/${season}?limit=24`;
        const data = await this._fetch(url);
        if (data && data.data && data.data.length > 0) {
            // Группируем по дням недели (приблизительно)
            const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
            const grouped = {};
            data.data.forEach(item => {
                // Используем broadcast.day для определения дня
                const dayIndex = item.broadcast?.day ? this._getDayIndex(item.broadcast.day) : 0;
                const dayName = days[dayIndex] || 'Неизвестно';
                if (!grouped[dayName]) grouped[dayName] = [];
                grouped[dayName].push(this._convertItem(item));
            });
            // Преобразуем в формат, ожидаемый main.js
            return Object.keys(grouped).map(day => ({
                day: days.indexOf(day),
                list: grouped[day]
            }));
        }
        return [];
    },

    _getDayIndex(day) {
        const map = {
            'Monday': 0, 'Tuesday': 1, 'Wednesday': 2,
            'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
        };
        return map[day] !== undefined ? map[day] : 0;
    },

    // ============================================
    // 7. КОНВЕРТАЦИЯ ЭЛЕМЕНТА (Jikan → наш формат)
    // ============================================
    _convertItem(item) {
        // Постер
        let img = '';
        if (item.images) {
            const jpg = item.images.jpg || item.images.webp || {};
            img = jpg.large_image_url || jpg.image_url || '';
        }

        const title = item.title || item.title_english || 'Без названия';
        const year = item.year || item.aired?.prop?.from?.year || '--';
        const episodes = item.episodes || '?';
        const genres = (item.genres || []).map(g => g.name);
        const synopsis = item.synopsis || 'Описание отсутствует';
        const score = item.score || 0;
        const rating = item.rating || '0+';
        const status = item.status || 'Неизвестно';

        return {
            mal_id: 'jikan_' + item.mal_id,
            id: 'jikan_' + item.mal_id,
            title: title,
            title_russian: item.title || '',
            title_english: item.title_english || '',
            year: year,
            episodes: episodes,
            images: { jpg: { image_url: img || '' } },
            synopsis: synopsis,
            genres: genres,
            score: score,
            rating: rating,
            status: status,
            russian: item.title || '',
            source: 'Jikan (MyAnimeList)',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль (Jikan API v4) загружен');

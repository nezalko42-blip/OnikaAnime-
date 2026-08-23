// ============================================
// API МОДУЛЬ ONIKAANIME (ПОЛНАЯ ВЕРСИЯ С РАСШИРЕННЫМИ МЕТОДАМИ)
// ============================================

const API = {
    BASE_URL: 'https://anilibria.top/api/v1',

    // ===== БАЗОВЫЙ ЗАПРОС =====
    async _fetch(url, options = {}) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Очистка заголовков от невалидных символов
        for (const key in headers) {
            if (typeof headers[key] === 'string') {
                headers[key] = headers[key].replace(/[^\x20-\x7E]/g, '');
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: headers
            });
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
    // 1. ПОИСК И КАТАЛОГ
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        // Если есть поисковый запрос — используем /app/search
        if (query && query.length > 1) {
            const result = await this._searchReleases(query);
            if (result?.length) {
                let items = result.map(item => this._convertItem(item));
                // Добавляем франшизы
                items = await this._addFranchiseReleases(items);
                // Пагинация
                const totalPages = Math.ceil(items.length / 24);
                const start = (page - 1) * 24;
                return {
                    items: items.slice(start, start + 24),
                    totalPages: Math.max(totalPages, 1)
                };
            }
        }

        // Иначе — POST запрос к каталогу с фильтрами
        return await this._catalogRequest(page, genre, query, filters);
    },

    async _searchReleases(query) {
        const url = `${this.BASE_URL}/app/search/releases?query=${encodeURIComponent(query)}&limit=50`;
        return await this._fetch(url);
    },

    async _catalogRequest(page, genre, query, filters = {}) {
        const body = {
            page: page,
            limit: 24,
            f: {}
        };

        if (genre) {
            body.f.genres = [parseInt(genre)];
        }
        if (query && query.length > 1) {
            body.f.search = query;
        }

        // Расширенные фильтры
        if (filters.types && filters.types.length) {
            body.f.types = filters.types;
        }
        if (filters.seasons && filters.seasons.length) {
            body.f.seasons = filters.seasons;
        }
        if (filters.years) {
            if (filters.years.from) body.f.years = { from_year: filters.years.from };
            if (filters.years.to) body.f.years = { ...body.f.years, to_year: filters.years.to };
        }
        if (filters.publish_statuses && filters.publish_statuses.length) {
            body.f.publish_statuses = filters.publish_statuses;
        }
        if (filters.production_statuses && filters.production_statuses.length) {
            body.f.production_statuses = filters.production_statuses;
        }
        if (filters.age_ratings && filters.age_ratings.length) {
            body.f.age_ratings = filters.age_ratings;
        }
        if (filters.sorting) {
            body.f.sorting = filters.sorting;
        } else {
            body.f.sorting = 'FRESH_AT_DESC';
        }

        const response = await this._fetch(`${this.BASE_URL}/anime/catalog/releases`, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        if (response?.list?.length) {
            let items = response.list.map(item => this._convertItem(item));
            items = await this._addFranchiseReleases(items);
            return {
                items: items,
                totalPages: response.pagination?.total_pages || 1
            };
        }
        return { items: [], totalPages: 1 };
    },

    // ============================================
    // 2. ФРАНШИЗЫ
    // ============================================
    async _addFranchiseReleases(items) {
        if (!items?.length) return items;
        const result = [...items];
        const seenIds = new Set(result.map(item => item.id));

        for (const item of items) {
            try {
                const franchiseUrl = `${this.BASE_URL}/anime/franchises/release/${item.id}`;
                const franchiseData = await this._fetch(franchiseUrl);
                if (franchiseData?.releases?.length) {
                    const releaseIds = franchiseData.releases
                        .filter(r => r.id !== item.id)
                        .map(r => r.id);
                    if (releaseIds.length) {
                        const listUrl = `${this.BASE_URL}/anime/releases/list?ids=${releaseIds.join(',')}`;
                        const listData = await this._fetch(listUrl);
                        if (listData?.list) {
                            for (const rel of listData.list) {
                                if (!seenIds.has(rel.id)) {
                                    seenIds.add(rel.id);
                                    result.push(this._convertItem(rel));
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn(`⚠️ Не удалось загрузить франшизу для ${item.id}`);
            }
        }
        console.log(`✅ Добавлено ${result.length - items.length} релизов из франшиз`);
        return result;
    },

    // ============================================
    // 3. СПРАВОЧНИКИ ДЛЯ ФИЛЬТРОВ
    // ============================================
    async getTypes() {
        const url = `${this.BASE_URL}/anime/catalog/references/types`;
        return await this._fetch(url) || [];
    },

    async getSeasons() {
        const url = `${this.BASE_URL}/anime/catalog/references/seasons`;
        return await this._fetch(url) || [];
    },

    async getYears() {
        const url = `${this.BASE_URL}/anime/catalog/references/years`;
        return await this._fetch(url) || [];
    },

    async getPublishStatuses() {
        const url = `${this.BASE_URL}/anime/catalog/references/publish-statuses`;
        return await this._fetch(url) || [];
    },

    async getProductionStatuses() {
        const url = `${this.BASE_URL}/anime/catalog/references/production-statuses`;
        return await this._fetch(url) || [];
    },

    async getAgeRatings() {
        const url = `${this.BASE_URL}/anime/catalog/references/age-ratings`;
        return await this._fetch(url) || [];
    },

    async getGenres() {
        const url = `${this.BASE_URL}/anime/genres`;
        return await this._fetch(url) || [];
    },

    // ============================================
    // 4. СЛУЧАЙНОЕ АНИМЕ
    // ============================================
    async getRandomReleases(limit = 1) {
        const url = `${this.BASE_URL}/anime/releases/random?limit=${limit}`;
        const data = await this._fetch(url);
        if (data?.length) {
            return data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 5. АВТОДОПОЛНЕНИЕ
    // ============================================
    async searchAutocomplete(query, limit = 5) {
        if (!query || query.length < 2) return [];
        const url = `${this.BASE_URL}/app/search/releases?query=${encodeURIComponent(query)}&limit=${limit}`;
        const data = await this._fetch(url);
        if (data?.length) {
            return data.map(item => ({
                id: item.id,
                title: this._convertItem(item).title,
                poster: item.poster?.optimized?.preview || item.poster?.preview || ''
            }));
        }
        return [];
    },

    // ============================================
    // 6. РАСПИСАНИЕ
    // ============================================
    async getSchedule() {
        const url = `${this.BASE_URL}/anime/schedule/week`;
        return await this._fetch(url) || [];
    },

    // ============================================
    // 7. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 5, releaseId = null) {
        let url = `${this.BASE_URL}/anime/releases/recommended?limit=${limit}`;
        if (releaseId) url += `&release_id=${releaseId}`;
        const data = await this._fetch(url);
        return data?.length ? data.map(item => this._convertItem(item)) : [];
    },

    // ============================================
    // 8. ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const url = `${this.BASE_URL}/anime/releases/${cleanId}`;
        const data = await this._fetch(url);
        if (data?.id) {
            return this._convertItem(data);
        }
        return null;
    },

    // ============================================
    // 9. КОНВЕРТАЦИЯ ЭЛЕМЕНТА
    // ============================================
    _convertItem(item) {
        let img = '';
        if (item.poster) {
            const poster = item.poster.optimized || item.poster;
            img = poster.preview || poster.thumbnail || poster.src || '';
            if (img && img.startsWith('/')) {
                img = 'https://anilibria.top' + img;
            }
        }

        let title = item.name?.main || item.name?.english || 'Без названия';
        if (item.name?.ru) title = item.name.ru;

        return {
            mal_id: 'anilibria_' + item.id,
            id: item.id,
            title: title,
            title_russian: item.name?.main || item.name?.ru || '',
            title_english: item.name?.english || '',
            year: item.year || '--',
            episodes: item.episodes_total || '?',
            images: { jpg: { image_url: img || '' } },
            synopsis: item.description || 'Описание отсутствует',
            genres: item.genres || [],
            score: item.rating || 0,
            russian: item.name?.main || item.name?.ru || '',
            source: 'Anilibria',
            _raw: item
        };
    },

    clearCache() {
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль с расширенными методами загружен');

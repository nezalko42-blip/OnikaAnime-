// ============================================
// API МОДУЛЬ ONIKAANIME
// ============================================

const API = {
    // Базовые URL
    ANILIBRIA: 'https://anilibria.top/api/v1',
    SHIKIMORI: 'https://shikimori.one/api',
    KODIK: 'https://kodikapi.com/search',
    
    // Кэш для API-запросов (TTL 5 минут)
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

    // Универсальный fetch с кэшированием
    async _fetchWithCache(url, options = {}, cacheKey = null) {
        if (cacheKey) {
            const cached = this._cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this._cacheTTL) {
                console.log('📦 Кэш:', cacheKey);
                return cached.data;
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'User-Agent': 'OnikaAnime/2.0',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (cacheKey) {
                this._cache.set(cacheKey, { data, timestamp: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ API Error:', error.message);
            throw error;
        }
    },

    // Поиск в Anilibria
    async searchAnilibria(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        const body = { 
            page, 
            limit: 12, 
            f: { sorting: 'FRESH_AT_DESC' } 
        };

        if (isSearch) {
            body.f.search = query;
        } else if (genre) {
            body.f.genres = [parseInt(genre)];
        }

        const cacheKey = `anilibria_${query || 'all'}_${genre || 'all'}_${page}`;
        
        try {
            const data = await this._fetchWithCache(
                this.ANILIBRIA + '/anime/catalog/releases',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                },
                cacheKey
            );

            if (data?.data?.length > 0) {
                return this._convertAnilibriaData(data);
            }
            return null;
        } catch {
            return null;
        }
    },

    // Поиск в Shikimori (резервный)
    async searchShikimori(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.SHIKIMORI}/animes?limit=12&page=${page}`;

        if (isSearch) {
            url += `&search=${encodeURIComponent(query)}`;
        } else if (genre) {
            const genreMap = { '1': 'action', '8': 'drama', '21': 'comedy', '10': 'fantasy', '22': 'romance' };
            url += `&genre=${genreMap[genre] || ''}`;
        } else {
            url += '&order=popularity';
        }

        const cacheKey = `shikimori_${query || 'all'}_${genre || 'all'}_${page}`;

        try {
            const data = await this._fetchWithCache(url, { method: 'GET' }, cacheKey);
            
            if (data?.length > 0) {
                return this._convertShikimoriData(data);
            }
            return null;
        } catch {
            return null;
        }
    },

    // Получение деталей аниме (Anilibria + Shikimori)
    async getAnimeDetails(id) {
        // Пробуем Anilibria
        try {
            const data = await this._fetchWithCache(
                `${this.ANILIBRIA}/app/title/${id}`,
                { method: 'GET' },
                `anilibria_detail_${id}`
            );
            
            if (data?.name) {
                return this._convertAnilibriaDetail(data);
            }
        } catch {
            console.log('🔄 Anilibria не дал данные, пробуем Shikimori...');
        }

        // Пробуем Shikimori
        try {
            const data = await this._fetchWithCache(
                `${this.SHIKIMORI}/animes/${id}`,
                { method: 'GET' },
                `shikimori_detail_${id}`
            );
            
            if (data?.id) {
                return this._convertShikimoriDetail(data);
            }
        } catch {
            console.error('❌ Не удалось загрузить детали аниме');
        }

        return null;
    },

    // Поиск видео в Kodik
    async searchKodik(animeTitle, episode = 1) {
        if (!animeTitle) throw new Error('Название аниме не указано');

        // Варианты названий для поиска
        const searchTitles = this._generateSearchTitles(animeTitle);
        console.log('🔍 Поиск в Kodik по вариантам:', searchTitles);

        for (const title of searchTitles) {
            try {
                const url = `${this.KODIK}?with_material_data=true&types=anime&title=${encodeURIComponent(title)}&limit=5`;
                const data = await this._fetchWithCache(url, { method: 'GET' });
                
                if (data?.results?.length > 0) {
                    // Ищем точное совпадение
                    let found = data.results.find(item => 
                        (item.title || '').toLowerCase().trim() === animeTitle.toLowerCase().trim() ||
                        (item.title_orig || '').toLowerCase().trim() === animeTitle.toLowerCase().trim()
                    );
                    
                    if (!found) {
                        found = data.results[0];
                    }

                    if (found?.link) {
                        // Ищем конкретную серию
                        if (episode && found.seasons) {
                            for (const season of found.seasons) {
                                if (season.episodes) {
                                    const ep = season.episodes.find(e => e.number === episode);
                                    if (ep?.link) {
                                        return ep.link;
                                    }
                                }
                            }
                        }
                        return found.link;
                    }
                }
            } catch (e) {
                console.log(`❌ Не найдено по: ${title}`);
            }
        }

        throw new Error('Видео не найдено в Kodik');
    },

    // Вспомогательные методы
    _generateSearchTitles(animeTitle) {
        const titles = [animeTitle];
        const words = animeTitle.split(' ');
        
        if (words.length > 2) {
            titles.push(words.slice(0, 2).join(' '));
            titles.push(words[0]);
        }

        // Поиск по глобальному каталогу
        if (window.allData) {
            for (const id in window.allData) {
                const a = window.allData[id];
                const title = getRussianTitle(a);
                if (title && title.toLowerCase().trim() === animeTitle.toLowerCase().trim()) {
                    if (a.title_english && a.title_english !== title) {
                        titles.push(a.title_english);
                    }
                    if (a.title_original && a.title_original !== title) {
                        titles.push(a.title_original);
                    }
                    break;
                }
            }
        }

        // Убираем дубликаты
        return titles.filter((v, i, a) => a.indexOf(v) === i);
    },

    _convertAnilibriaData(data) {
        return {
            items: data.data.map(item => {
                let img = '';
                if (item.poster) {
                    const p = item.poster.optimized || item.poster;
                    img = typeof p === 'string' ? p : (p.preview || p.src || '');
                    if (img && img[0] === '/') {
                        img = 'https://anilibria.top' + img;
                    }
                }
                return {
                    mal_id: item.id,
                    title: item.name?.main || item.name?.english || item.name?.original || 'Без названия',
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
    },

    _convertShikimoriData(data) {
        return {
            items: data.map(item => ({
                mal_id: item.id,
                title: item.russian || item.name || 'Без названия',
                title_russian: item.russian || '',
                title_english: item.name || '',
                year: item.aired_on ? item.aired_on.split('-')[0] : '--',
                episodes: item.episodes || '?',
                images: { jpg: { image_url: item.image?.original || '' } },
                synopsis: item.description || 'Описание отсутствует',
                genres: item.genres || [],
                score: item.score || 0,
                russian: item.russian || '',
                source: 'Shikimori'
            })),
            totalPages: Math.ceil(data.length / 12) + 1
        };
    },

    _convertAnilibriaDetail(data) {
        let img = '';
        if (data.poster) {
            const p = data.poster.optimized || data.poster;
            img = typeof p === 'string' ? p : (p.preview || p.src || '');
            if (img && img[0] === '/') {
                img = 'https://anilibria.top' + img;
            }
        }
        return {
            mal_id: data.id,
            title: data.name?.main || data.name?.english || data.name?.original || 'Без названия',
            title_russian: data.name?.main || '',
            title_english: data.name?.english || '',
            year: data.year || '--',
            episodes: data.episodes_total || '?',
            images: { jpg: { image_url: img || '' } },
            synopsis: data.description || 'Описание отсутствует',
            genres: data.genres || [],
            score: data.rating || 0,
            russian: data.name?.main || '',
            rating: data.age_rating || '',
            status: data.status || '',
            duration: data.duration || '',
            source: 'Anilibria'
        };
    },

    _convertShikimoriDetail(data) {
        return {
            mal_id: data.id,
            title: data.russian || data.name || 'Без названия',
            title_russian: data.russian || '',
            title_english: data.name || '',
            year: data.aired_on ? data.aired_on.split('-')[0] : '--',
            episodes: data.episodes || '?',
            images: { jpg: { image_url: data.image?.original || '' } },
            synopsis: data.description || 'Описание отсутствует',
            genres: data.genres || [],
            score: data.score || 0,
            russian: data.russian || '',
            rating: data.rating || '',
            status: data.status || '',
            duration: data.duration || '',
            source: 'Shikimori'
        };
    },

    // Очистка кэша
    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

// Глобальный доступ
window.API = API;
console.log('✅ API модуль загружен');

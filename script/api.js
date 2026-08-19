// ============================================
// API МОДУЛЬ ONIKAANIME (JIKAN + ANILIBRIA + SHIKIMORI)
// ============================================

const API = {
    JIKAN: 'https://api.jikan.moe/v4',
    ANILIBRIA: 'https://api.anilibria.tv/v3',
    SHIKIMORI: 'https://shikimori.one/api',
    
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

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

    // ============================================
    // ПОИСК В JIKAN (MyAnimeList) — ОСНОВНОЙ
    // ============================================
    async searchJikan(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.JIKAN}/anime?page=${page}&limit=12&sfw=true`;

        if (isSearch) {
            url += `&q=${encodeURIComponent(query)}`;
        } else if (genre) {
            // Маппинг жанров Jikan
            const genreMap = {
                '1': '1',      // Action
                '8': '8',      // Drama
                '21': '4',     // Comedy
                '10': '10',    // Fantasy
                '22': '22'     // Romance
            };
            const jikanGenre = genreMap[genre] || genre;
            url += `&genres=${jikanGenre}`;
        } else {
            url += '&order_by=popularity&sort=desc';
        }

        const cacheKey = `jikan_${query || 'all'}_${genre || 'all'}_${page}`;

        try {
            const data = await this._fetchWithCache(url, { method: 'GET' }, cacheKey);
            
            if (data?.data?.length > 0) {
                return {
                    items: data.data.map(item => ({
                        mal_id: item.mal_id,
                        title: item.title || item.title_english || 'Без названия',
                        title_russian: item.title || '',
                        title_english: item.title_english || '',
                        year: item.year || '--',
                        episodes: item.episodes || '?',
                        images: { jpg: { image_url: item.images?.jpg?.image_url || '' } },
                        synopsis: item.synopsis || 'Описание отсутствует',
                        genres: item.genres?.map(g => g.name) || [],
                        score: item.score || 0,
                        russian: item.title || '',
                        source: 'Jikan'
                    })),
                    totalPages: Math.ceil((data.pagination?.items?.total || 0) / 12)
                };
            }
            return null;
        } catch (error) {
            console.log('⚠️ Jikan ошибка:', error.message);
            // Пробуем Anilibria
            return await this.searchAnilibria(query, genre, page);
        }
    },

    // ============================================
    // ПОИСК В ANILIBRIA (РЕЗЕРВ)
    // ============================================
    async searchAnilibria(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        const body = { 
            page: page, 
            limit: 12, 
            f: { sorting: 'FRESH_AT_DESC' } 
        };

        if (isSearch) {
            body.f.search = query;
        } else if (genre) {
            body.f.genres = [parseInt(genre)];
        }

        try {
            const data = await this._fetchWithCache(
                this.ANILIBRIA + '/anime/catalog/releases',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                },
                `anilibria_${query || 'all'}_${genre || 'all'}_${page}`
            );

            if (data?.data?.length > 0) {
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
                            mal_id: 'anilibria_' + item.id,
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
                        };
                    }),
                    totalPages: data.meta?.pagination?.total_pages || 1
                };
            }
            return null;
        } catch {
            return null;
        }
    },

    // ============================================
    // ГИБРИДНЫЙ ПОИСК (Jikan + Anilibria + Shikimori)
    // ============================================
    async searchAll(query, genre = null, page = 1) {
        console.log('🔍 Поиск:', query || 'все', 'Жанр:', genre || 'все');
        
        let allItems = [];
        const seenTitles = new Set();
        
        // 1. Jikan (основной)
        try {
            const result = await this.searchJikan(query, genre, page);
            if (result?.items) {
                for (const item of result.items) {
                    const key = (item.title_russian || item.title || '').toLowerCase().trim();
                    if (!seenTitles.has(key) && key) {
                        seenTitles.add(key);
                        allItems.push(item);
                    }
                }
                console.log('✅ Jikan найдено:', result.items.length);
            }
        } catch (e) {
            console.log('⚠️ Jikan ошибка');
        }
        
        // 2. Anilibria (дополнение)
        try {
            const result = await this.searchAnilibria(query, genre, page);
            if (result?.items) {
                for (const item of result.items) {
                    const key = (item.title_russian || item.title || '').toLowerCase().trim();
                    if (!seenTitles.has(key) && key) {
                        seenTitles.add(key);
                        allItems.push(item);
                    }
                }
                console.log('✅ Anilibria найдено:', result.items.length);
            }
        } catch (e) {
            console.log('⚠️ Anilibria ошибка');
        }
        
        if (allItems.length === 0) {
            return { items: [], totalPages: 1 };
        }
        
        const totalPages = Math.ceil(allItems.length / 12);
        const start = (page - 1) * 12;
        const paginatedItems = allItems.slice(start, start + 12);
        
        return {
            items: paginatedItems,
            totalPages: Math.max(totalPages, 1)
        };
    },

    // ============================================
    // ДЕТАЛИ АНИМЕ (Jikan + Anilibria)
    // ============================================
    async getAnimeDetails(id) {
        // Пробуем Jikan
        try {
            const data = await this._fetchWithCache(
                `${this.JIKAN}/anime/${id}`,
                { method: 'GET' },
                `jikan_detail_${id}`
            );
            
            if (data?.data) {
                const item = data.data;
                return {
                    mal_id: item.mal_id,
                    title: item.title || item.title_english || 'Без названия',
                    title_russian: item.title || '',
                    title_english: item.title_english || '',
                    year: item.year || '--',
                    episodes: item.episodes || '?',
                    images: { jpg: { image_url: item.images?.jpg?.image_url || '' } },
                    synopsis: item.synopsis || 'Описание отсутствует',
                    genres: item.genres?.map(g => g.name) || [],
                    score: item.score || 0,
                    russian: item.title || '',
                    rating: item.rating || '',
                    status: item.status || '',
                    source: 'Jikan'
                };
            }
        } catch (e) {
            console.log('⚠️ Jikan детали ошибка');
        }
        
        // Пробуем Anilibria
        try {
            const data = await this._fetchWithCache(
                `${this.ANILIBRIA}/title/${id}`,
                { method: 'GET' },
                `anilibria_detail_${id}`
            );
            if (data?.id) {
                let img = '';
                if (data.poster) {
                    const p = data.poster.optimized || data.poster;
                    img = typeof p === 'string' ? p : (p.preview || p.src || '');
                    if (img && img[0] === '/') img = 'https://anilibria.top' + img;
                }
                return {
                    mal_id: data.id,
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

    // ============================================
    // ПОИСК ВИДЕО В KODIK (БЕЗ ИЗМЕНЕНИЙ)
    // ============================================
    async searchKodik(animeTitle, episode = 1) {
        if (!animeTitle) throw new Error('Название аниме не указано');

        const searchTitles = this._generateSearchTitles(animeTitle);
        console.log('🔍 Поиск в Kodik по вариантам:', searchTitles);

        for (const title of searchTitles) {
            try {
                const url = `https://kodikapi.com/search?with_material_data=true&types=anime&title=${encodeURIComponent(title)}&limit=5`;
                const data = await this._fetchWithCache(url, { method: 'GET' });
                
                if (data?.results?.length > 0) {
                    let found = data.results.find(item => 
                        (item.title || '').toLowerCase().trim() === animeTitle.toLowerCase().trim() ||
                        (item.title_orig || '').toLowerCase().trim() === animeTitle.toLowerCase().trim()
                    );
                    if (!found) found = data.results[0];

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
            } catch (e) {
                console.log(`❌ Не найдено по: ${title}`);
            }
        }

        throw new Error('Видео не найдено в Kodik');
    },

    _generateSearchTitles(animeTitle) {
        const titles = [animeTitle];
        const words = animeTitle.split(' ');
        if (words.length > 2) {
            titles.push(words.slice(0, 2).join(' '));
            titles.push(words[0]);
        }
        if (window.allData) {
            for (const id in window.allData) {
                const a = window.allData[id];
                const title = getRussianTitle(a);
                if (title && title.toLowerCase().trim() === animeTitle.toLowerCase().trim()) {
                    if (a.title_english && a.title_english !== title) titles.push(a.title_english);
                    if (a.title_original && a.title_original !== title) titles.push(a.title_original);
                    break;
                }
            }
        }
        return titles.filter((v, i, a) => a.indexOf(v) === i);
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (Jikan + Anilibria)');

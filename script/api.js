// ============================================
// API МОДУЛЬ ONIKAANIME (ТОЛЬКО SHIKIMORI)
// ============================================

const API = {
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

    // ===== ПОИСК В SHIKIMORI =====
    async searchShikimori(query, genre = null, page = 1) {
        const isSearch = query && query.length > 1;
        let url = `${this.SHIKIMORI}/animes?limit=12&page=${page}`;

        if (isSearch) {
            url += `&search=${encodeURIComponent(query)}`;
        } else if (genre) {
            const genreMap = { 
                '1': 'action', 
                '8': 'drama', 
                '21': 'comedy', 
                '10': 'fantasy', 
                '22': 'romance' 
            };
            url += `&genre=${genreMap[genre] || ''}`;
        } else {
            url += '&order=popularity';
        }

        const cacheKey = `shikimori_${query || 'all'}_${genre || 'all'}_${page}`;

        try {
            const data = await this._fetchWithCache(url, { method: 'GET' }, cacheKey);
            
            if (data?.length > 0) {
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
            }
            return null;
        } catch {
            return null;
        }
    },

    // ===== ПОЛУЧЕНИЕ ДЕТАЛЕЙ АНИМЕ =====
    async getAnimeDetails(id) {
        try {
            const data = await this._fetchWithCache(
                `${this.SHIKIMORI}/animes/${id}`,
                { method: 'GET' },
                `shikimori_detail_${id}`
            );
            
            if (data?.id) {
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
            }
            return null;
        } catch {
            console.error('❌ Не удалось загрузить детали аниме');
            return null;
        }
    },

    // ===== ПОИСК ВИДЕО В KODIK =====
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
                    
                    if (!found) {
                        found = data.results[0];
                    }

                    if (found?.link) {
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

    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
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

        return titles.filter((v, i, a) => a.indexOf(v) === i);
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен (только Shikimori)');

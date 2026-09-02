// ============================================
// API МОДУЛЬ ONIKAANIME (Anilibria API + Жанры + Видео + Торренты)
// ============================================

const API = {
    BASE_URL: 'https://anilibria.top/api/v1',

    // ===== КЭШ =====
    _cache: new Map(),
    _cacheTTL: 5 * 60 * 1000,

    // ===== БАЗОВЫЙ GET-ЗАПРОС =====
    async _get(endpoint, params = {}, useCache = true) {
        const cacheKey = endpoint + '|' + JSON.stringify(params);
        
        if (useCache && this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
                return cached.data;
            } else {
                this._cache.delete(cacheKey);
            }
        }

        const cleanParams = {};
        for (const key in params) {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                if (Array.isArray(params[key]) && params[key].length === 0) continue;
                cleanParams[key] = params[key];
            }
        }
        
        const queryString = new URLSearchParams(cleanParams).toString();
        const url = queryString ? `${this.BASE_URL}${endpoint}?${queryString}` : `${this.BASE_URL}${endpoint}`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            const data = await response.json();
            
            if (useCache && data) {
                this._cache.set(cacheKey, { data, time: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ GET Error:', error.message);
            return null;
        }
    },

    // ===== БАЗОВЫЙ POST-ЗАПРОС =====
    async _post(endpoint, body = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const cacheKey = endpoint + '|' + JSON.stringify(body);
        
        if (this._cache.has(cacheKey)) {
            const cached = this._cache.get(cacheKey);
            if (Date.now() - cached.time < this._cacheTTL) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
            const data = await response.json();
            
            if (data) {
                this._cache.set(cacheKey, { data, time: Date.now() });
            }
            
            return data;
        } catch (error) {
            console.error('❌ POST Error:', error.message);
            return null;
        }
    },

    // ============================================
    // 1. КАТАЛОГ
    // ============================================
    async searchAll(query = '', genre = null, page = 1, filters = {}) {
        if (genre === 'latest') {
            return await this._getLatestReleases(48);
        }

        const body = {
            page: page,
            limit: 24,
            f: {},
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing,player,status'
        };

        if (query && query.length > 1) {
            body.f.search = query;
        }

        let genresArray = [];
        if (genre && genre !== 'latest') {
            genresArray = [parseInt(genre)];
        } else if (filters.genres && filters.genres.length) {
            genresArray = filters.genres.map(g => parseInt(g));
        }

        if (genresArray.length > 0) {
            body.f.genres = genresArray;
        }

        if (filters.year_from || filters.year_to) {
            body.f.years = {};
            if (filters.year_from) body.f.years.from_year = filters.year_from;
            if (filters.year_to) body.f.years.to_year = filters.year_to;
        }

        body.f.sorting = filters.sorting || 'CREATED_AT_DESC';

        if (filters.age_ratings && filters.age_ratings.length) {
            body.f.age_ratings = filters.age_ratings;
        }

        const data = await this._post('/anime/catalog/releases', body);
        
        if (data && data.data && data.data.length > 0) {
            const items = data.data.map(item => this._convertItem(item));
            const totalPages = data.meta?.pagination?.total_pages || 1;
            return {
                items: items,
                totalPages: totalPages,
                totalCount: data.meta?.pagination?.total_items || items.length
            };
        }
        return { items: [], totalPages: 1, totalCount: 0 };
    },

    // ============================================
    // 2. ПОИСК
    // ============================================
    async searchTitles(query, page = 1) {
        if (!query || query.length < 1) return { items: [], totalPages: 1, totalCount: 0 };
        
        console.log(`🔍 API поиск: "${query}"`);
        
        const searchVariants = [
            query,
            query.toLowerCase(),
            query.toUpperCase(),
            query.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''),
        ];
        
        const uniqueVariants = [...new Set(searchVariants)];
        
        for (const variant of uniqueVariants) {
            try {
                const params = {
                    query: variant,
                    limit: 48,
                    page: page,
                    include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites'
                };
                
                const data = await this._get('/app/search/releases', params, false);
                
                if (data && data.data && data.data.length > 0) {
                    const items = data.data.map(item => this._convertItem(item));
                    const totalCount = data.meta?.pagination?.total_items || items.length;
                    const totalPages = data.meta?.pagination?.total_pages || 1;
                    
                    console.log(`✅ Найдено ${items.length} результатов для "${variant}"`);
                    return {
                        items: items,
                        totalPages: totalPages,
                        totalCount: totalCount
                    };
                }
            } catch(e) {
                console.warn(`❌ Поиск "${variant}" не сработал:`, e.message);
            }
        }
        
        if (query.length > 10) {
            const words = query.split(' ');
            for (const word of words) {
                if (word.length > 3) {
                    try {
                        const params = {
                            query: word,
                            limit: 48,
                            page: page,
                            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites'
                        };
                        
                        const data = await this._get('/app/search/releases', params, false);
                        
                        if (data && data.data && data.data.length > 0) {
                            const items = data.data.map(item => this._convertItem(item));
                            const totalCount = data.meta?.pagination?.total_items || items.length;
                            const totalPages = data.meta?.pagination?.total_pages || 1;
                            
                            console.log(`✅ Найдено ${items.length} результатов по слову "${word}"`);
                            return {
                                items: items,
                                totalPages: totalPages,
                                totalCount: totalCount
                            };
                        }
                    } catch(e) {
                        console.warn(`❌ Поиск по слову "${word}" не сработал:`, e.message);
                    }
                }
            }
        }
        
        return { items: [], totalPages: 1, totalCount: 0 };
    },

    // ============================================
    // 3. НОВИНКИ
    // ============================================
    async _getLatestReleases(limit = 48) {
        const params = {
            limit: limit,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing,player,status'
        };
        
        let data = await this._get('/anime/releases/latest', params, false);
        
        if (!data || !Array.isArray(data) || data.length === 0) {
            const body = {
                page: 1,
                limit: limit,
                f: { 
                    sorting: 'CREATED_AT_DESC'
                },
                include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing,player,status'
            };
            const fallbackData = await this._post('/anime/catalog/releases', body);
            if (fallbackData && fallbackData.data && fallbackData.data.length > 0) {
                data = fallbackData.data;
            }
        }
        
        if (data && Array.isArray(data) && data.length > 0) {
            const items = data.map(item => this._convertItem(item));
            items.sort((a, b) => {
                const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                return dateB - dateA;
            });
            return {
                items: items,
                totalPages: 1,
                totalCount: items.length
            };
        }
        
        return { items: [], totalPages: 1, totalCount: 0 };
    },

    // ============================================
    // 4. РАСПИСАНИЕ
    // ============================================
    async getSchedule() {
        const params = {
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,publish_day'
        };
        const data = await this._get('/anime/schedule/week', params);
        if (data && Array.isArray(data)) {
            return data.map(dayObj => ({
                day: dayObj.day,
                list: (dayObj.list || []).map(item => this._convertItem(item))
            }));
        }
        return [];
    },

    // ============================================
    // 5. ДЕТАЛИ АНИМЕ
    // ============================================
    async getAnimeDetails(id) {
        const cleanId = id.toString().replace('anilibria_', '');
        const params = {
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,external_player,publish_day,added_in_users_favorites,average_duration_of_episode,created_at,updated_at,is_ongoing,player,status,torrents'
        };
        const data = await this._get(`/anime/releases/${cleanId}`, params, false);
        if (data && data.id) {
            return this._convertItem(data);
        }
        return null;
    },

    // ============================================
    // 6. СЛУЧАЙНОЕ АНИМЕ
    // ============================================
    async getRandomReleases(limit = 1) {
        const params = {
            limit: limit,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,publish_day'
        };
        const data = await this._get('/anime/releases/random', params, false);
        if (data && Array.isArray(data)) {
            return data.map(item => this._convertItem(item));
        }
        return [];
    },

    // ============================================
    // 7. РЕКОМЕНДАЦИИ
    // ============================================
    async getRecommended(limit = 6) {
        const params = {
            limit: limit,
            include: 'id,type.genres,name,poster,year,episodes_total,description,genres,age_rating,publish_day,added_in_users_favorites'
        };
        const data = await this._get('/anime/releases/recommended', params, true);
        
        if (data && Array.isArray(data) && data.length > 0) {
            return data.map(item => this._convertItem(item));
        }
        
        return [];
    },

    // ============================================
    // 8. АВТОДОПОЛНЕНИЕ
    // ============================================
    async searchAutocomplete(query, limit = 10) {
        if (!query || query.length < 1) return [];
        
        const params = {
            query: query,
            limit: limit,
            include: 'id,name,poster,year'
        };
        const data = await this._get('/app/search/releases', params, false);
        
        if (data && data.data && data.data.length > 0) {
            return data.data.map(item => ({
                id: 'anilibria_' + item.id,
                title: item.name?.main || item.name?.english || 'Без названия',
                poster: this._getPosterUrl(item.poster),
                year: item.year || ''
            }));
        }
        return [];
    },

    // ============================================
    // 9. РАБОТА С ЖАНРАМИ
    // ============================================
    async getGenres() {
        const data = await this._get('/anime/genres', {}, false);
        if (data && Array.isArray(data)) {
            return data.map(genre => ({
                id: genre.id,
                name: genre.name,
                description: genre.description,
                icon: this._getGenreIcon(genre.name)
            }));
        }
        return [];
    },

    async getAgeRatings() {
        const data = await this._get('/anime/catalog/references/age-ratings', {}, false);
        if (data && Array.isArray(data)) {
            return data.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return {
                        value: item.value || item,
                        label: item.label || item.description || String(item.value || item)
                    };
                }
                return { value: item, label: String(item) };
            });
        }
        return [];
    },

    // ============================================
    // 10. ВИДЕО
    // ============================================
    async getVideos(limit = 12) {
        try {
            const endpoints = [
                async () => {
                    const params = {
                        limit: limit,
                        include: 'id,url,title,views,image,comments,video_id,created_at,updated_at,is_announce,origin'
                    };
                    return await this._get('/media/videos', params, false);
                },
                async () => {
                    const params = { limit: limit };
                    return await this._get('/media/videos', params, false);
                },
                async () => {
                    const params = {
                        limit: limit,
                        sort: '-created_at'
                    };
                    return await this._get('/media/videos', params, false);
                }
            ];

            let data = null;
            for (const method of endpoints) {
                try {
                    const result = await method();
                    if (result && (result.data || Array.isArray(result))) {
                        data = result;
                        break;
                    }
                } catch(e) {
                    console.warn('Метод запроса видео не сработал:', e.message);
                }
            }

            console.log('📡 Ответ видео API:', data);

            if (data) {
                let videos = [];

                if (Array.isArray(data)) {
                    videos = data;
                } else if (data.data && Array.isArray(data.data)) {
                    videos = data.data;
                } else if (data.list && Array.isArray(data.list)) {
                    videos = data.list;
                } else if (data.items && Array.isArray(data.items)) {
                    videos = data.items;
                }

                if (videos.length > 0) {
                    return videos.map(video => ({
                        id: video.id,
                        url: video.url || '',
                        title: video.title || 'Без названия',
                        views: video.views || 0,
                        image: this._getPosterUrl(video.image || video.poster),
                        comments: video.comments || 0,
                        video_id: video.video_id || video.id,
                        created_at: video.created_at,
                        is_announce: video.is_announce || false,
                        origin: video.origin || null
                    }));
                }
            }

            return [];
        } catch (error) {
            console.error('❌ Ошибка получения видео:', error);
            return [];
        }
    },

    // ============================================
    // 11. ТОРРЕНТЫ
    // ============================================
    async getTorrentsByRelease(releaseId) {
        try {
            const params = {
                include: 'id,hash,size,type,color,codec,label,quality,magnet,filename,seeders,leechers,bitrate,sort_order,updated_at,is_hardsub,description,created_at,completed_times,torrent_members'
            };
            const data = await this._get(`/anime/torrents/release/${releaseId}`, params, false);
            
            console.log('🧲 Ответ торрентов API:', data);
            
            if (data) {
                let torrents = [];
                
                if (data.data && Array.isArray(data.data)) {
                    torrents = data.data;
                } else if (Array.isArray(data)) {
                    torrents = data;
                } else if (data.list && Array.isArray(data.list)) {
                    torrents = data.list;
                }
                
                if (torrents.length > 0) {
                    return torrents.map(torrent => ({
                        id: torrent.id,
                        hash: torrent.hash,
                        size: torrent.size || 0,
                        type: torrent.type?.description || 'Неизвестно',
                        codec: torrent.codec?.label || torrent.codec?.value || 'Неизвестно',
                        label: torrent.label || 'Без названия',
                        quality: torrent.quality?.description || 'Неизвестно',
                        magnet: torrent.magnet,
                        filename: torrent.filename,
                        seeders: torrent.seeders || 0,
                        leechers: torrent.leechers || 0,
                        bitrate: torrent.bitrate || 0,
                        is_hardsub: torrent.is_hardsub || false,
                        description: torrent.description || '',
                        created_at: torrent.created_at,
                        completed_times: torrent.completed_times || 0
                    }));
                }
            }
            
            return [];
        } catch (error) {
            console.error('❌ Ошибка получения торрентов:', error);
            return [];
        }
    },

    // ============================================
    // 12. ТОРРЕНТЫ (RSS)
    // ============================================
    async getTorrentsRSS(limit = 20) {
        try {
            const url = `${this.BASE_URL}/anime/torrents/rss?limit=${limit}`;
            console.log('📡 Запрос RSS торрентов:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/xml',
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const xmlText = await response.text();
            console.log('📡 RSS получен, длина:', xmlText.length);
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Ошибка парсинга RSS');
            }
            
            const items = xmlDoc.querySelectorAll('item');
            const torrents = [];
            
            items.forEach(item => {
                const title = item.querySelector('title')?.textContent?.trim() || 'Без названия';
                const guid = item.querySelector('guid')?.textContent?.trim() || '';
                const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
                const torrentId = item.querySelector('torrentId')?.textContent?.trim() || '';
                const releaseId = item.querySelector('releaseId')?.textContent?.trim() || '';
                const description = item.querySelector('description')?.textContent?.trim() || '';
                const enclosure = item.querySelector('enclosure');
                
                let size = 0;
                if (enclosure) {
                    const length = enclosure.getAttribute('length');
                    if (length) size = parseInt(length) || 0;
                }
                
                let quality = 'Неизвестно';
                let codec = 'Неизвестно';
                let type = 'Неизвестно';
                
                if (title) {
                    const qualityMatch = title.match(/(\d{3,4}p)/i);
                    if (qualityMatch) quality = qualityMatch[1];
                    
                    if (title.includes('HEVC') || title.includes('x265')) {
                        codec = 'HEVC';
                    } else if (title.includes('AVC') || title.includes('x264')) {
                        codec = 'AVC';
                    }
                    
                    if (title.includes('BDRip')) type = 'BDRip';
                    else if (title.includes('WEBRip')) type = 'WEBRip';
                    else if (title.includes('WEB-DL')) type = 'WEB-DL';
                }
                
                torrents.push({
                    id: torrentId || guid,
                    hash: guid,
                    title: title,
                    size: size,
                    quality: quality,
                    codec: codec,
                    type: type,
                    releaseId: releaseId,
                    pubDate: pubDate,
                    description: description,
                    enclosureUrl: enclosure ? enclosure.getAttribute('url') : '',
                    animeTitle: title.split('|')[0]?.trim() || title
                });
            });
            
            console.log('✅ Найдено торрентов в RSS:', torrents.length);
            return torrents;
            
        } catch (error) {
            console.error('❌ Ошибка получения RSS торрентов:', error);
            return [];
        }
    },

    // ============================================
    // 13. ПОЛУЧЕНИЕ ВИДЕО ДЛЯ СЕРИЙ
    // ============================================
    async getVideoLinksForEpisode(releaseId, episode = 1) {
        try {
            const params = {
                include: 'id,player,episodes_total,external_player,names'
            };
            const data = await this._get(`/anime/releases/${releaseId}`, params, false);
            
            if (!data || !data.id) {
                console.warn('Релиз не найден');
                return null;
            }
            
            console.log('📡 Данные релиза для видео:', data);
            
            let videoLinks = [];
            let externalPlayer = data.external_player || null;
            
            // Проверяем наличие плеера
            if (data.player && data.player.list) {
                const episodes = Object.values(data.player.list);
                const foundEp = episodes.find(ep => ep.episode === episode || ep.serie === episode);
                
                if (foundEp) {
                    console.log('✅ Найдена серия:', foundEp);
                    
                    if (foundEp.hls) {
                        const hls = foundEp.hls;
                        const qualities = ['fhd', 'hd', 'sd'];
                        for (const q of qualities) {
                            if (hls[q]) {
                                videoLinks.push({
                                    quality: q === 'fhd' ? '1080p' : (q === 'hd' ? '720p' : '480p'),
                                    url: hls[q],
                                    type: 'hls'
                                });
                            }
                        }
                    }
                    
                    if (foundEp.video) {
                        if (typeof foundEp.video === 'object') {
                            const qualityMap = {
                                '1080p': '1080p',
                                '720p': '720p',
                                '480p': '480p',
                                '360p': '360p'
                            };
                            for (const [key, url] of Object.entries(foundEp.video)) {
                                if (url && typeof url === 'string' && url.startsWith('http')) {
                                    videoLinks.push({
                                        quality: qualityMap[key] || key,
                                        url: url,
                                        type: 'direct'
                                    });
                                }
                            }
                        } else if (typeof foundEp.video === 'string' && foundEp.video.startsWith('http')) {
                            videoLinks.push({
                                quality: '720p',
                                url: foundEp.video,
                                type: 'direct'
                            });
                        }
                    }
                    
                    if (foundEp.preview) {
                        videoLinks.push({
                            quality: 'preview',
                            url: foundEp.preview,
                            type: 'preview'
                        });
                    }
                }
            }
            
            if (videoLinks.length === 0 && externalPlayer) {
                if (externalPlayer.includes('youtube.com') || externalPlayer.includes('youtu.be')) {
                    let vid = '';
                    if (externalPlayer.includes('watch?v=')) {
                        vid = externalPlayer.split('v=')[1]?.split('&')[0];
                    } else if (externalPlayer.includes('youtu.be/')) {
                        vid = externalPlayer.split('youtu.be/')[1]?.split('?')[0];
                    }
                    if (vid) {
                        videoLinks.push({
                            quality: '720p',
                            url: `https://www.youtube.com/embed/${vid}`,
                            type: 'youtube'
                        });
                    }
                } else {
                    videoLinks.push({
                        quality: 'external',
                        url: externalPlayer,
                        type: 'external'
                    });
                }
            }
            
            if (videoLinks.length === 0 && data.names) {
                const title = data.names.ru || data.names.en || data.names.main || '';
                if (title) {
                    const kodikUrl = await this.searchKodik(title, episode);
                    if (kodikUrl) {
                        videoLinks.push({
                            quality: '720p',
                            url: kodikUrl,
                            type: 'kodik'
                        });
                    }
                }
            }
            
            console.log('🎬 Найдено ссылок для серии:', videoLinks.length);
            return {
                episode: episode,
                totalEpisodes: data.episodes_total || 0,
                title: data.names?.ru || data.names?.en || 'Аниме',
                links: videoLinks,
                externalPlayer: externalPlayer
            };
            
        } catch (error) {
            console.error('❌ Ошибка получения видео для серии:', error);
            return null;
        }
    },

    // ============================================
    // 14. ПОИСК В KODIK
    // ============================================
    async searchKodik(title, episode) {
        try {
            const url = `https://kodikapi.com/search?with_material_data=true&types=anime&title=${encodeURIComponent(title)}&limit=5`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Kodik API не отвечает');
            }
            
            const data = await response.json();
            
            if (data && data.results && data.results.length > 0) {
                let found = data.results.find(item => 
                    (item.title || '').toLowerCase().trim() === title.toLowerCase().trim() ||
                    (item.title_orig || '').toLowerCase().trim() === title.toLowerCase().trim()
                );
                
                if (!found) {
                    found = data.results[0];
                }
                
                if (found && found.link) {
                    if (episode && found.seasons) {
                        for (const season of found.seasons) {
                            if (season.episodes) {
                                const ep = season.episodes.find(e => e.number === episode);
                                if (ep && ep.link) {
                                    return ep.link;
                                }
                            }
                        }
                    }
                    return found.link;
                }
            }
        } catch (e) {
            console.error('Ошибка поиска в Kodik:', e);
        }
        return null;
    },

    // ============================================
    // 15. СПРАВОЧНИКИ
    // ============================================
    async getTypes() {
        const data = await this._get('/anime/catalog/references/types');
        return data || [];
    },

    async getSeasons() {
        const data = await this._get('/anime/catalog/references/seasons');
        return data || [];
    },

    async getYears() {
        const data = await this._get('/anime/catalog/references/years');
        return data || [];
    },

    async getPublishStatuses() {
        const data = await this._get('/anime/catalog/references/publish-statuses');
        return data || [];
    },

    async getProductionStatuses() {
        const data = await this._get('/anime/catalog/references/production-statuses');
        return data || [];
    },

    // ============================================
    // 16. КОНВЕРТАЦИЯ
    // ============================================
    _getGenreIcon(genreName) {
        const icons = {
            'Экшен': '⚔️',
            'Приключения': '🗺️',
            'Комедия': '😂',
            'Драма': '🎭',
            'Фэнтези': '🧙',
            'Романтика': '💕',
            'Научная фантастика': '🚀',
            'Повседневность': '🏠',
            'Триллер': '🔪',
            'Ужасы': '👻',
            'Мистика': '🔮',
            'Спорт': '⚽',
            'Детектив': '🔍',
            'Психологическое': '🧠',
            'Историческое': '🏯',
            'Музыка': '🎵'
        };
        return icons[genreName] || '📚';
    },

    _getPosterUrl(poster) {
        if (!poster) return '';
        const optimized = poster.optimized || poster;
        return optimized.preview || optimized.thumbnail || poster.preview || poster.thumbnail || '';
    },

    _convertItem(item) {
        let img = this._getPosterUrl(item.poster);
        if (img && img.startsWith('/')) {
            img = 'https://anilibria.top' + img;
        }

        const name = item.name || {};
        const title = name.main || name.english || name.alternative || 'Без названия';
        const title_russian = name.main || '';
        const title_english = name.english || '';

        const genres = (item.genres || []).map(g => g.name || g);
        const year = item.year || '--';
        const episodes = item.episodes_total || item.episodes?.total || '?';
        
        let ageRating = '0+';
        if (item.age_rating) {
            if (typeof item.age_rating === 'object' && item.age_rating !== null) {
                ageRating = item.age_rating.label || item.age_rating.value || '0+';
            } else if (typeof item.age_rating === 'string') {
                ageRating = item.age_rating;
            }
        }
        if (typeof ageRating === 'string' && ageRating.startsWith('R')) {
            const ageMap = {
                'R0_PLUS': '0+',
                'R6_PLUS': '6+',
                'R12_PLUS': '12+',
                'R16_PLUS': '16+',
                'R18_PLUS': '18+'
            };
            ageRating = ageMap[ageRating] || ageRating.replace('R', '').replace('_PLUS', '+');
        }

        const status = item.status?.string || item.status || 'Неизвестно';
        const isOngoing = item.is_ongoing || false;
        const publishDay = item.publish_day?.description || null;
        const favoritesCount = item.added_in_users_favorites || 0;
        const duration = item.average_duration_of_episode || null;
        const createdAt = item.created_at || null;
        const updatedAt = item.updated_at || null;
        const externalPlayer = item.external_player || null;

        let videoLinks = null;
        let episodesList = null;
        let totalEpisodes = null;

        if (item.player) {
            totalEpisodes = item.player.episodes || null;
            
            if (item.player.list) {
                episodesList = Object.values(item.player.list).map(ep => ({
                    episode: ep.episode || ep.serie || 0,
                    name: ep.name || null,
                    uuid: ep.uuid || null,
                    created_timestamp: ep.created_timestamp || null,
                    preview: ep.preview || null,
                    hls: ep.hls ? {
                        fhd: ep.hls.fhd || null,
                        hd: ep.hls.hd || null,
                        sd: ep.hls.sd || null
                    } : null,
                    skips: ep.skips || null
                })).sort((a, b) => a.episode - b.episode);
            }

            if (episodesList && episodesList.length > 0) {
                const firstEp = episodesList[0];
                if (firstEp.hls) {
                    videoLinks = firstEp.hls;
                }
            }
        }

        let torrents = null;
        if (item.torrents && item.torrents.list) {
            torrents = item.torrents.list.map(t => ({
                torrent_id: t.torrent_id,
                episodes: t.episodes || null,
                quality: t.quality ? {
                    string: t.quality.string || null,
                    type: t.quality.type || null,
                    resolution: t.quality.resolution || null,
                    encoder: t.quality.encoder || null,
                    lq_audio: t.quality.lq_audio || null
                } : null,
                leechers: t.leechers || 0,
                seeders: t.seeders || 0,
                downloads: t.downloads || 0,
                total_size: t.total_size || 0,
                size_string: t.size_string || null,
                url: t.url || null,
                magnet: t.magnet || null,
                uploaded_timestamp: t.uploaded_timestamp || null,
                hash: t.hash || null
            }));
        }

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
            age_rating: ageRating,
            status: status,
            russian: title_russian,
            source: 'Anilibria v1',
            publish_day: publishDay,
            favorites_count: favoritesCount,
            duration: duration,
            created_at: createdAt,
            updated_at: updatedAt,
            is_ongoing: isOngoing,
            external_player: externalPlayer,
            video_links: videoLinks,
            episodes_list: episodesList,
            total_episodes: totalEpisodes,
            torrents: torrents,
            _raw: item
        };
    },

    clearCache() {
        this._cache.clear();
        console.log('🗑️ Кэш API очищен');
    }
};

window.API = API;
console.log('✅ API модуль загружен');

// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME
// ============================================

var allData = {};
var currentPage = 'catalog';
var page = 1;
var genre = '';
var query = '';
var currentAnime = null;
var totalPages = 1;
var onlineTimer = null;
var startTime = Date.now();

var ACHIEVEMENTS_LIST = [
    { id: 'ep100', name: '🎬 Зритель 1 уровня', desc: 'Посмотреть 100 серий', icon: '🎬', title: 'Зритель' },
    { id: 'ep200', name: '🎬 Зритель 2 уровня', desc: 'Посмотреть 200 серий', icon: '🎥', title: 'Любопытный' },
    { id: 'ep500', name: '🎬 Зритель 3 уровня', desc: 'Посмотреть 500 серий', icon: '📺', title: 'Заядлый' },
    { id: 'ep750', name: '🎬 Зритель 4 уровня', desc: 'Посмотреть 750 серий', icon: '🌟', title: 'Эксперт' },
    { id: 'ep1000', name: '🎬 Зритель 5 уровня', desc: 'Посмотреть 1000 серий', icon: '🏆', title: 'Легенда' },
    { id: 'cm100', name: '💬 Комментатор 1 уровня', desc: 'Оставить 100 комментариев', icon: '💬', title: 'Говорун' },
    { id: 'cm200', name: '💬 Комментатор 2 уровня', desc: 'Оставить 200 комментариев', icon: '🗣️', title: 'Собеседник' },
    { id: 'cm500', name: '💬 Комментатор 3 уровня', desc: 'Оставить 500 комментариев', icon: '🎙️', title: 'Оратор' },
    { id: 'cm750', name: '💬 Комментатор 4 уровня', desc: 'Оставить 750 комментариев', icon: '📢', title: 'Мастер слова' },
    { id: 'cm1000', name: '💬 Комментатор 5 уровня', desc: 'Оставить 1000 комментариев', icon: '👑', title: 'Глашатай' },
    { id: 'fv100', name: '❤️ Коллекционер 1 уровня', desc: 'Добавить 100 аниме в избранное', icon: '❤️', title: 'Коллекционер' },
    { id: 'fv200', name: '❤️ Коллекционер 2 уровня', desc: 'Добавить 200 аниме в избранное', icon: '💝', title: 'Ценитель' },
    { id: 'fv500', name: '❤️ Коллекционер 3 уровня', desc: 'Добавить 500 аниме в избранное', icon: '💎', title: 'Знаток' },
    { id: 'fv750', name: '❤️ Коллекционер 4 уровня', desc: 'Добавить 750 аниме в избранное', icon: '👑', title: 'Библиофил' },
    { id: 'fv1000', name: '❤️ Коллекционер 5 уровня', desc: 'Добавить 1000 аниме в избранное', icon: '🏆', title: 'Хранитель' }
];

// ============================================
// ПОЛУЧЕНИЕ РУССКОГО НАЗВАНИЯ
// ============================================

function getRussianTitle(anime) {
    if (anime.russian) return anime.russian;
    if (anime.title_russian) return anime.title_russian;
    if (anime.title_ru) return anime.title_ru;
    if (anime.russian_name) return anime.russian_name;
    
    if (anime.title && typeof anime.title === 'string' && /[а-яА-Я]/.test(anime.title)) {
        return anime.title;
    }
    
    if (anime.title && typeof anime.title === 'object') {
        if (anime.title.russian) return anime.title.russian;
        if (anime.title.english) return anime.title.english;
        if (anime.title.romaji) return anime.title.romaji;
    }
    
    if (anime.synonyms && anime.synonyms.length > 0) {
        for (var i = 0; i < anime.synonyms.length; i++) {
            if (/[а-яА-Я]/.test(anime.synonyms[i])) {
                return anime.synonyms[i];
            }
        }
    }
    
    return anime.name || anime.title || 'Без названия';
}

function getRussianDescription(anime) {
    if (anime.description_russian) return anime.description_russian;
    if (anime.description_ru) return anime.description_ru;
    if (anime.russian_description) return anime.russian_description;
    return anime.synopsis || anime.description || 'Описание отсутствует';
}

// ============================================
// НАВИГАЦИЯ
// ============================================

function navigate(page) {
    currentPage = page;
    var pages = ['catalog', 'detail', 'favorites', 'achievements', 'mycomments', 'profile', 'settings'];
    pages.forEach(function(p) {
        var el = document.getElementById('page-' + p);
        if (el) el.style.display = p === page ? 'block' : 'none';
    });
    if (page === 'catalog') loadCatalog();
    if (page === 'favorites') renderFavorites();
    if (page === 'profile') renderProfile();
    if (page === 'achievements') renderAchievements();
    if (page === 'mycomments') renderMyComments();
    closeMenu();
}

function goBack() {
    navigate('catalog');
}

// ============================================
// UI
// ============================================

function updateUI() {
    var user = DB.get('currentUser');
    var navHtml = '';
    var footerHtml = '';
    
    if (user) {
        navHtml = `
            <a class="active" data-page="catalog" onclick="navigate('catalog'); closeMenu();">
                <span class="icon">🏠</span> Главная
            </a>
            <a data-page="favorites" onclick="navigate('favorites'); closeMenu();">
                <span class="icon">❤️</span> Избранное
            </a>
            <a data-page="mycomments" onclick="navigate('mycomments'); closeMenu();">
                <span class="icon">💬</span> Мои комментарии
            </a>
            <a data-page="achievements" onclick="navigate('achievements'); closeMenu();">
                <span class="icon">🏆</span> Достижения
            </a>
            <a data-page="profile" onclick="navigate('profile'); closeMenu();">
                <span class="icon">👤</span> Профиль
            </a>
            <a data-page="settings" onclick="navigate('settings'); closeMenu();">
                <span class="icon">⚙️</span> Настройки
            </a>
        `;
        footerHtml = `<div class="sidebar-user-info">🌟 ${user.name}</div>`;
    } else {
        navHtml = `
            <a class="active" data-page="catalog" onclick="navigate('catalog'); closeMenu();">
                <span class="icon">🏠</span> Главная
            </a>
        `;
        footerHtml = `<button class="sidebar-login-btn" onclick="showLoginModal(); closeMenu();">🚀 Войти</button>`;
    }
    
    var nav = document.getElementById('sidebarNav');
    var footer = document.getElementById('sidebarFooter');
    if (nav) nav.innerHTML = navHtml;
    if (footer) footer.innerHTML = footerHtml;
}

function toggleMenu() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
}

function closeMenu() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// ============================================
// ОТСЛЕЖИВАНИЕ ВРЕМЕНИ
// ============================================

function startOnlineTracking() {
    var user = DB.get('currentUser');
    if (!user) return;
    
    startTime = Date.now();
    
    if (onlineTimer) clearInterval(onlineTimer);
    
    onlineTimer = setInterval(function() {
        var userNow = DB.get('currentUser');
        if (!userNow) {
            clearInterval(onlineTimer);
            return;
        }
        
        var elapsed = Math.floor((Date.now() - startTime) / 1000);
        var totalTime = DB.getUserData(userNow.name, 'onlineTime', 0);
        totalTime += 30;
        DB.setUserData(userNow.name, 'onlineTime', totalTime);
        DB.setUserData(userNow.name, 'lastSeen', Date.now());
        DB.save();
        
        if (elapsed % 120 === 0) {
            renderTopUsers();
        }
    }, 30000);
}

function stopOnlineTracking() {
    if (onlineTimer) {
        clearInterval(onlineTimer);
        onlineTimer = null;
    }
}

window.addEventListener('beforeunload', function() {
    var userExit = DB.get('currentUser');
    if (userExit) {
        var elapsedExit = Math.floor((Date.now() - startTime) / 1000);
        var totalTimeExit = DB.getUserData(userExit.name, 'onlineTime', 0);
        DB.setUserData(userExit.name, 'onlineTime', totalTimeExit + elapsedExit);
        DB.setUserData(userExit.name, 'lastSeen', Date.now());
        DB.save();
    }
});

// ============================================
// КАТАЛОГ (Shikimori + Anime365 + Kodik + Anilibria)
// ============================================

function loadCatalog() {
    var grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка...</div>';
    
    // 1. Shikimori API (Русский)
    loadCatalogShikimori();
}

// ===== 1. SHIKIMORI API (ОСНОВНОЙ) =====
function loadCatalogShikimori() {
    console.log('📡 Shikimori API...');
    var grid = document.getElementById('grid');
    if (!grid) return;
    
    var isSearch = query && query.length > 1;
    var url = 'https://shikimori.one/api/animes?limit=12';
    
    if (isSearch) {
        url += '&search=' + encodeURIComponent(query);
        console.log('🔍 Поиск Shikimori:', query);
    }
    if (genre && !isSearch) {
        var genreMap = { '1': 'action', '8': 'drama', '21': 'comedy', '10': 'fantasy', '22': 'romance' };
        url += '&genre=' + (genreMap[genre] || '');
        console.log('🎭 Жанр Shikimori:', genre);
    }
    if (!isSearch && !genre) {
        url = 'https://shikimori.one/api/animes?order=popularity&limit=12';
        console.log('📊 Топ Shikimori');
    }
    url += '&page=' + page;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('User-Agent', 'OnikaAnime/1.0');
    xhr.timeout = 12000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.length > 0) {
                    totalPages = Math.ceil(data.length / 12) + 1;
                    if (totalPages < 1) totalPages = 1;
                    
                    var converted = data.map(function(item) {
                        return {
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
                            russian: item.russian || ''
                        };
                    });
                    
                    converted.forEach(function(a) { allData[a.mal_id] = a; });
                    renderCatalog(converted);
                    renderPagination();
                    return;
                }
            }
            loadCatalogAnime365();
        } catch(e) {
            loadCatalogAnime365();
        }
    };
    xhr.onerror = function() { loadCatalogAnime365(); };
    xhr.ontimeout = function() { loadCatalogAnime365(); };
    xhr.send();
}

// ===== 2. ANIME365 (ЗАПАСНОЙ) =====
function loadCatalogAnime365() {
    console.log('🔄 Anime365 API...');
    var grid = document.getElementById('grid');
    if (!grid) return;
    
    var isSearch = query && query.length > 1;
    var mirrors = [
        'https://smotret-anime.online/api',
        'https://smotret-anime.app/api',
        'https://anime365.ru/api',
        'https://anime-365.ru/api'
    ];
    
    var url = mirrors[0] + '/series?limit=12';
    
    if (isSearch) {
        url += '&search=' + encodeURIComponent(query);
        console.log('🔍 Поиск Anime365:', query);
    }
    if (!isSearch && !genre) {
        url += '&sort=-rating';
        console.log('📊 Топ Anime365');
    }
    url += '&page=' + page;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('User-Agent', 'OnikaAnime/1.0');
    xhr.timeout = 12000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.data && data.data.length > 0) {
                    totalPages = Math.ceil((data.pagination?.total || 12) / 12);
                    if (totalPages < 1) totalPages = 1;
                    
                    var converted = data.data.map(function(item) {
                        var attrs = item.attributes || {};
                        return {
                            mal_id: item.id,
                            title: attrs.russian || attrs.name || 'Без названия',
                            title_russian: attrs.russian || '',
                            title_english: attrs.name || '',
                            year: attrs.release_date ? attrs.release_date.split('-')[0] : '--',
                            episodes: attrs.episodes_total || '?',
                            images: { jpg: { image_url: attrs.poster?.original || '' } },
                            synopsis: attrs.description || 'Описание отсутствует',
                            genres: attrs.genres || [],
                            score: attrs.rating || 0,
                            russian: attrs.russian || ''
                        };
                    });
                    
                    converted.forEach(function(a) { allData[a.mal_id] = a; });
                    renderCatalog(converted);
                    renderPagination();
                    return;
                }
            }
            // Пробуем следующее зеркало
            if (mirrors.length > 1) {
                var currentMirror = mirrors.shift();
                console.log('🔄 Смена зеркала Anime365...');
                loadCatalogAnime365();
                return;
            }
            loadCatalogKodik();
        } catch(e) {
            loadCatalogKodik();
        }
    };
    xhr.onerror = function() { 
        if (mirrors.length > 1) {
            mirrors.shift();
            console.log('🔄 Смена зеркала Anime365...');
            loadCatalogAnime365();
        } else {
            loadCatalogKodik();
        }
    };
    xhr.ontimeout = function() { 
        if (mirrors.length > 1) {
            mirrors.shift();
            loadCatalogAnime365();
        } else {
            loadCatalogKodik();
        }
    };
    xhr.send();
}

// ===== 3. KODIK API (ТРЕТИЙ ЗАПАСНОЙ) =====
function loadCatalogKodik() {
    console.log('🔄 Kodik API...');
    var grid = document.getElementById('grid');
    if (!grid) return;
    
    var isSearch = query && query.length > 1;
    var url = 'https://kodikapi.com/search?limit=12&with_material_data=true&types=anime';
    
    if (isSearch) {
        url += '&title=' + encodeURIComponent(query);
        console.log('🔍 Поиск Kodik:', query);
    }
    if (genre && !isSearch) {
        var genreMap = { '1': 'боевик', '8': 'драма', '21': 'комедия', '10': 'фэнтези', '22': 'романтика' };
        url += '&genre=' + encodeURIComponent(genreMap[genre] || '');
    }
    url += '&page=' + page;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('User-Agent', 'OnikaAnime/1.0');
    xhr.timeout = 12000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.results && data.results.length > 0) {
                    totalPages = Math.ceil((data.total || 12) / 12);
                    if (totalPages < 1) totalPages = 1;
                    
                    var converted = data.results.map(function(item) {
                        return {
                            mal_id: item.id || item.material_data?.id,
                            title: item.title || item.material_data?.title || 'Без названия',
                            title_russian: item.title || '',
                            title_english: item.title_orig || '',
                            year: item.year || '--',
                            episodes: item.episodes_total || item.episodes || '?',
                            images: { jpg: { image_url: item.poster_url || '' } },
                            synopsis: item.material_data?.description || 'Описание отсутствует',
                            genres: item.material_data?.genres || [],
                            score: item.rating || item.material_data?.rating || 0,
                            russian: item.title || ''
                        };
                    });
                    
                    converted.forEach(function(a) { allData[a.mal_id] = a; });
                    renderCatalog(converted);
                    renderPagination();
                    return;
                }
            }
            loadCatalogAnilibria();
        } catch(e) {
            loadCatalogAnilibria();
        }
    };
    xhr.onerror = function() { loadCatalogAnilibria(); };
    xhr.ontimeout = function() { loadCatalogAnilibria(); };
    xhr.send();
}

// ===== 4. ANILIBRIA (ЧЕТВЕРТЫЙ ЗАПАСНОЙ) =====
function loadCatalogAnilibria() {
    console.log('🔄 Anilibria API...');
    var grid = document.getElementById('grid');
    if (!grid) return;
    
    var isSearch = query && query.length > 1;
    var url = 'https://anilibria.top/api/v1/anime/catalog/releases';
    var body = { page: page, limit: 12, f: { sorting: 'FRESH_AT_DESC' } };
    
    if (isSearch) {
        body.f.search = query;
        console.log('🔍 Поиск Anilibria:', query);
    }
    if (genre && !isSearch) {
        body.f.genres = [parseInt(genre)];
    }
    if (!isSearch && !genre) {
        body.f.sorting = 'FRESH_AT_DESC';
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('User-Agent', 'OnikaAnime/1.0');
    xhr.timeout = 12000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.data && data.data.length > 0) {
                    totalPages = data.meta?.pagination?.total_pages || 1;
                    if (totalPages < 1) totalPages = 1;
                    
                    var converted = data.data.map(function(item) {
                        var img = '';
                        if (item.poster) {
                            var p = item.poster.optimized || item.poster;
                            if (typeof p === 'string') {
                                img = p;
                            } else {
                                img = p.preview || p.src || '';
                            }
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
                            russian: item.name?.main || ''
                        };
                    });
                    
                    converted.forEach(function(a) { allData[a.mal_id] = a; });
                    renderCatalog(converted);
                    renderPagination();
                    return;
                }
            }
            showError('🔍 Ничего не найдено');
        } catch(e) {
            showError('⚠️ Ошибка загрузки');
        }
    };
    xhr.onerror = function() { showError('🌐 Ошибка сети'); };
    xhr.ontimeout = function() { showError('⏱️ Превышено время'); };
    xhr.send(JSON.stringify(body));
}

function showError(msg) {
    var grid = document.getElementById('grid');
    if (grid) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">' + msg + '</div>';
    }
}

// ============================================
// РЕНДЕРИНГ КАТАЛОГА
// ============================================

function renderCatalog(list) {
    var grid = document.getElementById('grid');
    if (!grid) return;
    
    if (!list || list.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">🔍 Ничего не найдено</div>';
        return;
    }
    
    var html = '';
    var colors = ['#6c5ce7', '#fd79a8', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'];
    
    list.forEach(function(a, index) {
        var img = a.images?.jpg?.image_url || '';
        var title = getRussianTitle(a);
        var episodes = a.episodes || a.episodes_total || 'Онгоинг';
        var year = a.year || a.seasonYear || '';
        var color = colors[index % colors.length];
        var id = a.mal_id || a.id;
        
        html += `
            <div class="card" onclick="openDetail('${id}')">
                <div class="card-img" style="${!img ? 'background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:48px;' : ''}">
                    ${img ? '<img src="' + img + '" loading="lazy" onerror="this.style.display=\'none\'">' : '🎬'}
                    ${year ? '<span class="card-year">' + year + '</span>' : ''}
                </div>
                <div class="card-body">
                    <div class="title">${title}</div>
                    <div class="info">${episodes}</div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

// ============================================
// ПАГИНАЦИЯ
// ============================================

function renderPagination() {
    var container = document.getElementById('pagination');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    var html = '';
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">←</button>`;
    
    var start = Math.max(1, page - 2);
    var end = Math.min(totalPages, page + 2);
    
    if (start > 1) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (start > 2) html += `<button disabled>...</button>`;
    }
    
    for (var i = start; i <= end; i++) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (end < totalPages) {
        if (end < totalPages - 1) html += `<button disabled>...</button>`;
        html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `<button ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})">→</button>`;
    
    container.innerHTML = html;
}

function goToPage(p) {
    if (p < 1 || p > totalPages) return;
    page = p;
    loadCatalog();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// ПОИСК
// ============================================

var searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        var q = this.value.trim();
        if (q.length > 1) {
            query = q;
            genre = '';
            page = 1;
            var titleEl = document.getElementById('title');
            if (titleEl) titleEl.textContent = '🔍 Поиск: ' + q;
            loadCatalog();
        } else if (q.length === 0) {
            query = '';
            document.getElementById('title').textContent = '✨ Популярное аниме';
            loadCatalog();
        }
    });
}

// ============================================
// ЖАНРЫ
// ============================================

var genresNav = document.getElementById('genresNav');
if (genresNav) {
    genresNav.onclick = function(e) {
        var a = e.target.closest('a');
        if (!a) return;
        document.querySelectorAll('.genres a').forEach(function(l) {
            l.classList.remove('active');
        });
        a.classList.add('active');
        query = '';
        genre = a.dataset.genre;
        page = 1;
        var searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        var titleEl = document.getElementById('title');
        if (titleEl) titleEl.textContent = genre ? a.textContent : '✨ Популярное аниме';
        loadCatalog();
    };
}

// ============================================
// ДЕТАЛЬНАЯ СТРАНИЦА
// ============================================

function openDetail(id) {
    if (!id) {
        showToast('Ошибка: ID не указан', 'error');
        return;
    }
    
    navigate('detail');
    
    var titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = 'Загрузка...';
    
    if (allData[id]) {
        showDetail(allData[id]);
        return;
    }
    
    openDetailShikimori(id);
}

// ===== 1. SHIKIMORI DETAIL =====
function openDetailShikimori(id) {
    var url = 'https://shikimori.one/api/animes/' + id;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('User-Agent', 'OnikaAnime/1.0');
    xhr.timeout = 12000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.id) {
                    var converted = {
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
                        aired_on: data.aired_on || '',
                        released_on: data.released_on || ''
                    };
                    allData[id] = converted;
                    showDetail(converted);
                    return;
                }
            }
            openDetailAnime365(id);
        } catch(e) {
            openDetailAnime365(id);
        }
    };
    xhr.onerror = function() { openDetailAnime365(id); };
    xhr.ontimeout = function() { openDetailAnime365(id); };
    xhr.send();
}

// ===== 2. ANIME365 DETAIL =====
function openDetailAnime365(id) {
    var mirrors = [
        'https://smotret-anime.online/api',
        'https://smotret-anime.app/api',
        'https://anime365.ru/api'
    ];
    
    var url = mirrors[0] + '/series/' + id;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('User-Agent', 'OnikaAnime/1.0');
    xhr.timeout = 12000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.data) {
                    var attrs = data.data.attributes || {};
                    var converted = {
                        mal_id: data.data.id,
                        title: attrs.russian || attrs.name || 'Без названия',
                        title_russian: attrs.russian || '',
                        title_english: attrs.name || '',
                        year: attrs.release_date ? attrs.release_date.split('-')[0] : '--',
                        episodes: attrs.episodes_total || '?',
                        images: { jpg: { image_url: attrs.poster?.original || '' } },
                        synopsis: attrs.description || 'Описание отсутствует',
                        genres: attrs.genres || [],
                        score: attrs.rating || 0,
                        russian: attrs.russian || '',
                        rating: attrs.age_rating || '',
                        status: attrs.status || '',
                        duration: attrs.duration || '',
                        aired_on: attrs.release_date || '',
                        released_on: attrs.release_date || ''
                    };
                    allData[id] = converted;
                    showDetail(converted);
                    return;
                }
            }
            openDetailKodik(id);
        } catch(e) {
            openDetailKodik(id);
        }
    };
    xhr.onerror = function() { openDetailKodik(id); };
    xhr.ontimeout = function() { openDetailKodik(id); };
    xhr.send();
}

// ===== 3. KODIK DETAIL =====
function openDetailKodik(id) {
    var url = 'https://kodikapi.com/search?with_material_data=true&types=anime&id=' + id;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('User-Agent', 'OnikaAnime/1.0');
    xhr.timeout = 12000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.results && data.results.length > 0) {
                    var item = data.results[0];
                    var converted = {
                        mal_id: item.id || item.material_data?.id,
                        title: item.title || item.material_data?.title || 'Без названия',
                        title_russian: item.title || '',
                        title_english: item.title_orig || '',
                        year: item.year || '--',
                        episodes: item.episodes_total || item.episodes || '?',
                        images: { jpg: { image_url: item.poster_url || '' } },
                        synopsis: item.material_data?.description || 'Описание отсутствует',
                        genres: item.material_data?.genres || [],
                        score: item.rating || item.material_data?.rating || 0,
                        russian: item.title || '',
                        rating: item.material_data?.rating || '',
                        status: item.material_data?.status || '',
                        duration: item.material_data?.duration || '',
                        aired_on: item.material_data?.year || ''
                    };
                    allData[id] = converted;
                    showDetail(converted);
                    return;
                }
            }
            openDetailAnilibria(id);
        } catch(e) {
            openDetailAnilibria(id);
        }
    };
    xhr.onerror = function() { openDetailAnilibria(id); };
    xhr.ontimeout = function() { openDetailAnilibria(id); };
    xhr.send();
}

// ===== 4. ANILIBRIA DETAIL =====
function openDetailAnilibria(id) {
    var url = 'https://anilibria.top/api/v1/app/title/' + id;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('User-Agent', 'OnikaAnime/1.0');
    xhr.timeout = 12000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.name) {
                    var img = '';
                    if (data.poster) {
                        var p = data.poster.optimized || data.poster;
                        if (typeof p === 'string') {
                            img = p;
                        } else {
                            img = p.preview || p.src || '';
                        }
                        if (img && img[0] === '/') {
                            img = 'https://anilibria.top' + img;
                        }
                    }
                    var converted = {
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
                        aired_on: data.year || ''
                    };
                    allData[id] = converted;
                    showDetail(converted);
                    return;
                }
            }
            showToast('❌ Не удалось загрузить данные', 'error');
        } catch(e) {
            showToast('❌ Ошибка загрузки', 'error');
        }
    };
    xhr.onerror = function() { showToast('🌐 Ошибка сети', 'error'); };
    xhr.ontimeout = function() { showToast('⏱️ Превышено время', 'error'); };
    xhr.send();
}

// ============================================
// ОТОБРАЖЕНИЕ ДЕТАЛЕЙ
// ============================================

function showDetail(anime) {
    var img = anime.images?.jpg?.image_url || '';
    
    var posterEl = document.getElementById('detailPoster');
    if (posterEl) {
        posterEl.src = img || '';
        posterEl.alt = anime.title || 'Постер';
        posterEl.style.display = img ? 'block' : 'none';
    }
    
    var title = getRussianTitle(anime);
    var titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = title;
    
    var engEl = document.getElementById('detailEng');
    if (engEl) {
        var engTitle = anime.title_english || '';
        engEl.textContent = engTitle;
    }
    
    var metaEl = document.getElementById('detailMeta');
    if (metaEl) {
        var year = anime.year || '--';
        var episodes = anime.episodes || '?';
        metaEl.textContent = year + ' | ' + episodes + ' эп.';
    }
    
    var descEl = document.getElementById('detailDesc');
    if (descEl) {
        var descText = getRussianDescription(anime);
        var tempDiv = document.createElement('div');
        tempDiv.innerHTML = descText;
        descText = tempDiv.textContent || descText;
        descEl.textContent = descText;
        descEl.classList.remove('expanded');
        
        var toggleBtn = document.getElementById('descToggle');
        if (toggleBtn) {
            if (descText.length > 200) {
                toggleBtn.style.display = 'inline-flex';
            } else {
                toggleBtn.style.display = 'none';
                descEl.classList.add('expanded');
            }
        }
    }
    
    var ageEl = document.getElementById('detailAgeRestriction');
    if (ageEl) {
        var age = 0;
        if (anime.rating) {
            var ratingMap = {
                'G': 0, 'PG': 6, 'PG-13': 12, 'R': 16, 'R+': 16, 'Rx': 18,
                'R18': 18, 'R18+': 18, '18+': 18, '16+': 16, '12+': 12, '6+': 6, '0+': 0
            };
            age = ratingMap[anime.rating] || 0;
        }
        ageEl.innerHTML = '<span class="age-badge age-' + age + '">' + age + '+</span>';
    }
    
    var tagColors = {
        'Action': '#e74c3c', 'Drama': '#3498db', 'Comedy': '#f1c40f',
        'Fantasy': '#9b59b6', 'Romance': '#e91e63', 'Adventure': '#2ecc71',
        'Shounen': '#e67e22', 'Thriller': '#2c3e50', 'Horror': '#c0392b',
        'Sci-Fi': '#1abc9c', 'Slice of Life': '#f39c12', 'Mystery': '#8e44ad',
        'Sports': '#27ae60', 'Экшен': '#e74c3c', 'Драма': '#3498db',
        'Комедия': '#f1c40f', 'Фэнтези': '#9b59b6', 'Романтика': '#e91e63',
        'Приключения': '#2ecc71', 'Сёнен': '#e67e22', 'Триллер': '#2c3e50',
        'Ужасы': '#c0392b', 'Научная фантастика': '#1abc9c'
    };
    
    var tagsHtml = '';
    if (anime.genres && anime.genres.length > 0) {
        anime.genres.forEach(function(g) {
            var name = typeof g === 'string' ? g : (g.name || g.id || '');
            if (name) {
                var color = tagColors[name] || '#6c5ce7';
                tagsHtml += '<span class="detail-tag" style="background:' + color + '20;border-color:' + color + '40;color:' + color + ';">' + name + '</span>';
            }
        });
    }
    var tagsEl = document.getElementById('detailTags');
    if (tagsEl) tagsEl.innerHTML = tagsHtml || '<span class="detail-tag">🎬 Аниме</span>';
    
    var user = DB.get('currentUser');
    var favs = user ? DB.getUserData(user.name, 'favorites', []) : [];
    var isFav = favs.indexOf(title) > -1;
    var btn = document.getElementById('favBtn');
    if (btn) {
        btn.textContent = isFav ? '❤️ В избранном' : '🤍 В избранное';
        btn.className = 'fav-btn' + (isFav ? ' active' : '');
        btn.onclick = function() { toggleFav(title); };
        btn.style.display = 'inline-block';
    }
    
    var videos = DB.get('videos', {});
    var eps = videos[title] || [];
    var epContainer = document.getElementById('episodeBtns');
    if (epContainer) {
        var epHtml = '';
        if (eps.length > 0) {
            eps.forEach(function(ep) {
                epHtml += `<button class="ep-btn" onclick="playVideo('${title}', '${ep.url}')">Серия ${ep.ep}</button>`;
            });
        } else {
            epHtml = '<span style="color:#888;">📺 Нет видео</span>';
        }
        epContainer.innerHTML = epHtml;
    }
    
    renderComments(title);
    checkAchievements(title);
}

// ============================================
// КОММЕНТАРИИ - СЕРВЕРНАЯ ВЕРСИЯ
// ============================================

function renderComments(animeName) {
    var container = document.getElementById('commentsList');
    if (!container) return;
    
    fetch('/api/comments/' + encodeURIComponent(animeName))
        .then(function(res) { return res.json(); })
        .then(function(comments) {
            if (!comments || comments.length === 0) {
                container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">💬 Нет комментариев. Будьте первым!</div>';
                return;
            }
            
            var user = DB.get('currentUser');
            var html = '';
            
            comments.forEach(function(c) {
                var canDelete = user && c.user_name === user.name;
                html += `
                    <div class="comment-item" data-comment-id="${c.id}">
                        <div class="c-user">${c.user_name}</div>
                        <div class="c-text">${c.text}</div>
                        <div class="c-date">${c.date}</div>
                        ${canDelete ? `<button class="c-delete-btn" onclick="deleteComment(${c.id})">✕</button>` : ''}
                    </div>
                `;
            });
            
            container.innerHTML = html;
        })
        .catch(function() {
            container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">⚠️ Ошибка загрузки комментариев</div>';
        });
}

function addComment() {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    var input = document.getElementById('commentInput');
    if (!input) return;
    
    var text = input.value.trim();
    if (!text) {
        showToast('Напишите что-нибудь!', 'warning');
        return;
    }
    
    var titleEl = document.getElementById('detailTitle');
    var title = titleEl ? titleEl.textContent : '';
    if (!title || title === 'Загрузка...' || title === 'Без названия') {
        showToast('Ошибка: аниме не загружено', 'error');
        return;
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/comments');
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            if (data.success) {
                input.value = '';
                renderComments(title);
                checkAchievements(title);
                showToast('💬 Комментарий добавлен!', 'success');
            } else {
                showToast(data.error || 'Ошибка', 'error');
            }
        } catch(e) {
            showToast('Ошибка сервера', 'error');
        }
    };
    
    xhr.onerror = function() {
        showToast('Ошибка сети', 'error');
    };
    
    xhr.send(JSON.stringify({
        anime: title,
        user_name: user.name,
        text: text
    }));
}

function deleteComment(id) {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    showConfirmModal('🗑️ Удалить комментарий', 'Вы уверены?', function() {
        var xhr = new XMLHttpRequest();
        xhr.open('DELETE', '/api/comments/' + id);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
            try {
                var data = JSON.parse(xhr.responseText);
                if (data.success) {
                    var titleEl = document.getElementById('detailTitle');
                    var title = titleEl ? titleEl.textContent : '';
                    if (title) renderComments(title);
                    showToast('🗑️ Комментарий удален', 'success');
                } else {
                    showToast(data.error || 'Ошибка', 'error');
                }
            } catch(e) {
                showToast('Ошибка сервера', 'error');
            }
        };
        
        xhr.onerror = function() {
            showToast('Ошибка сети', 'error');
        };
        
        xhr.send(JSON.stringify({ user_name: user.name }));
    });
}

// ============================================
// МОИ КОММЕНТАРИИ (серверная версия)
// ============================================

function renderMyComments() {
    var user = DB.get('currentUser');
    if (!user) {
        var container = document.getElementById('myCommentsList');
        if (container) {
            container.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>';
        }
        var countEl = document.getElementById('myCommentsCount');
        if (countEl) countEl.textContent = '0 комментариев';
        return;
    }
    
    var container = document.getElementById('myCommentsList');
    if (!container) return;
    
    fetch('/api/comments/all')
        .then(function(res) { return res.json(); })
        .then(function(comments) {
            var myComments = comments.filter(function(c) {
                return c.user_name === user.name;
            });
            
            myComments.sort(function(a, b) {
                return b.date.localeCompare(a.date);
            });
            
            var countEl = document.getElementById('myCommentsCount');
            if (countEl) countEl.textContent = myComments.length + ' комментариев';
            
            if (myComments.length === 0) {
                container.innerHTML = '<div class="empty-state"><span class="empty-icon">💬</span><p>У вас нет комментариев</p></div>';
                return;
            }
            
            var html = '';
            myComments.forEach(function(c) {
                html += `
                    <div class="my-comment-item">
                        <div class="my-comment-header">
                            <span class="my-comment-anime" onclick="searchAndOpen('${c.anime}')">📺 ${c.anime}</span>
                            <button class="c-delete-btn" onclick="deleteComment(${c.id})">✕</button>
                        </div>
                        <div class="my-comment-text">${c.text}</div>
                        <div class="my-comment-date">${c.date}</div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        })
        .catch(function() {
            container.innerHTML = '<div class="empty-state"><p>⚠️ Ошибка загрузки</p></div>';
        });
}

function searchAndOpen(name) {
    if (!name) return;
    query = name;
    page = 1;
    genre = '';
    
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = name;
    
    var titleEl = document.getElementById('title');
    if (titleEl) titleEl.textContent = '🔍 Поиск: ' + name;
    
    navigate('catalog');
    loadCatalog();
}

// ============================================
// ИЗБРАННОЕ
// ============================================

function toggleFav(name) {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    var favs = DB.getUserData(user.name, 'favorites', []);
    var idx = favs.indexOf(name);
    if (idx > -1) {
        favs.splice(idx, 1);
        showToast('Удалено из избранного', 'info');
    } else {
        favs.push(name);
        showToast('Добавлено в избранное ❤️', 'success');
        checkAchievements(name);
    }
    DB.setUserData(user.name, 'favorites', favs);
    DB.save();
    
    var btn = document.getElementById('favBtn');
    if (btn) {
        var isFav = favs.indexOf(name) > -1;
        btn.textContent = isFav ? '❤️ В избранном' : '🤍 В избранное';
        btn.className = 'fav-btn' + (isFav ? ' active' : '');
    }
    
    if (currentPage === 'favorites') {
        renderFavorites();
    }
}

function renderFavorites() {
    var user = DB.get('currentUser');
    if (!user) {
        var grid = document.getElementById('favGrid');
        if (grid) grid.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>';
        return;
    }
    
    var favs = DB.getUserData(user.name, 'favorites', []);
    var countEl = document.getElementById('favCount');
    if (countEl) countEl.textContent = favs.length + ' аниме';
    
    var grid = document.getElementById('favGrid');
    if (!grid) return;
    
    if (favs.length === 0) {
        grid.innerHTML = '<div class="empty-state"><span class="empty-icon">💔</span><p>Пусто</p></div>';
        return;
    }
    
    var html = '';
    var colors = ['#6c5ce7', '#fd79a8', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'];
    
    favs.forEach(function(name, index) {
        var img = '';
        var color = colors[index % colors.length];
        
        for (var id in allData) {
            var a = allData[id];
            var title = getRussianTitle(a);
            if (title === name) {
                img = a.images?.jpg?.image_url || '';
                break;
            }
        }
        
        html += `
            <div class="card" onclick="searchAndOpen('${name}')">
                <div class="card-img" style="${!img ? 'background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:40px;' : ''}">
                    ${img ? '<img src="' + img + '" loading="lazy" onerror="this.style.display=\'none\'">' : '❤️'}
                </div>
                <div class="card-body">
                    <div class="title">${name}</div>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

// ============================================
// ДОСТИЖЕНИЯ
// ============================================

function renderAchievements() {
    var user = DB.get('currentUser');
    
    if (!user) {
        var grid = document.getElementById('achievementsGrid');
        if (grid) {
            grid.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>';
        }
        updateAchievementStats([], ACHIEVEMENTS_LIST.length);
        return;
    }
    
    var earned = DB.getAchievements(user.name);
    var total = ACHIEVEMENTS_LIST.length;
    var activeTitle = DB.getActiveTitle(user.name);
    
    updateAchievementStats(earned, total);
    
    var grid = document.getElementById('achievementsGrid');
    if (!grid) return;
    
    if (ACHIEVEMENTS_LIST.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>🏆 Достижения временно недоступны</p></div>';
        return;
    }
    
    var html = '';
    ACHIEVEMENTS_LIST.forEach(function(ach) {
        var isEarned = earned.indexOf(ach.id) !== -1;
        var isActive = activeTitle === ach.id;
        
        html += `
            <div class="ach-card ${isEarned ? 'earned' : 'locked'}">
                <div class="ach-icon">${ach.icon}</div>
                <div class="ach-name">${ach.name}</div>
                <div class="ach-desc">${ach.desc}</div>
                ${ach.title ? `<div class="ach-title">🎖️ Титул: ${ach.title}</div>` : ''}
                <div class="ach-status">${isEarned ? '✅ Получено' : '🔒 Закрыто'}</div>
                ${isEarned ? `
                    <button class="ach-btn ${isActive ? 'active' : ''}" onclick="setActiveTitle('${ach.id}')">
                        ${isActive ? '✅ Активен' : '👑 Установить титул'}
                    </button>
                ` : ''}
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

function updateAchievementStats(earned, total) {
    var earnedEl = document.getElementById('achEarnedCount');
    var totalEl = document.getElementById('achTotalCount');
    var progressEl = document.getElementById('achProgress');
    var fillEl = document.getElementById('achProgressFill');
    
    if (earnedEl) earnedEl.textContent = earned.length;
    if (totalEl) totalEl.textContent = total;
    if (progressEl) progressEl.textContent = total > 0 ? Math.round((earned.length / total) * 100) + '%' : '0%';
    if (fillEl) fillEl.style.width = total > 0 ? (earned.length / total) * 100 + '%' : '0%';
}

function setActiveTitle(achId) {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    var earned = DB.getAchievements(user.name);
    if (earned.indexOf(achId) === -1) {
        showToast('❌ Достижение не получено!', 'error');
        return;
    }
    
    DB.setActiveTitle(user.name, achId);
    renderAchievements();
    renderProfile();
    showToast('👑 Титул установлен!', 'success');
}

function checkAchievements(animeName) {
    var user = DB.get('currentUser');
    if (!user) return;
    
    var earned = DB.getAchievements(user.name);
    
    var allComments = DB.get('comments', {});
    var commentCount = 0;
    for (var k in allComments) {
        allComments[k].forEach(function(c) {
            if (c.user === user.name) commentCount++;
        });
    }
    
    var favs = DB.getUserData(user.name, 'favorites', []);
    var favCount = favs.length;
    
    var history = DB.getUserData(user.name, 'history', []);
    var continueData = DB.getUserData(user.name, 'continueWatching', {});
    var episodeCount = 0;
    for (var a in continueData) {
        if (continueData[a] && continueData[a].ep) {
            episodeCount += continueData[a].ep || 0;
        }
    }
    if (episodeCount === 0) {
        episodeCount = history.length * 12;
    }
    
    var newAchievements = [];
    ACHIEVEMENTS_LIST.forEach(function(ach) {
        if (earned.indexOf(ach.id) !== -1) return;
        
        var unlocked = false;
        if (ach.id === 'ep100' && episodeCount >= 100) unlocked = true;
        else if (ach.id === 'ep200' && episodeCount >= 200) unlocked = true;
        else if (ach.id === 'ep500' && episodeCount >= 500) unlocked = true;
        else if (ach.id === 'ep750' && episodeCount >= 750) unlocked = true;
        else if (ach.id === 'ep1000' && episodeCount >= 1000) unlocked = true;
        else if (ach.id === 'cm100' && commentCount >= 100) unlocked = true;
        else if (ach.id === 'cm200' && commentCount >= 200) unlocked = true;
        else if (ach.id === 'cm500' && commentCount >= 500) unlocked = true;
        else if (ach.id === 'cm750' && commentCount >= 750) unlocked = true;
        else if (ach.id === 'cm1000' && commentCount >= 1000) unlocked = true;
        else if (ach.id === 'fv100' && favCount >= 100) unlocked = true;
        else if (ach.id === 'fv200' && favCount >= 200) unlocked = true;
        else if (ach.id === 'fv500' && favCount >= 500) unlocked = true;
        else if (ach.id === 'fv750' && favCount >= 750) unlocked = true;
        else if (ach.id === 'fv1000' && favCount >= 1000) unlocked = true;
        
        if (unlocked) {
            DB.addAchievement(user.name, ach.id);
            newAchievements.push(ach);
        }
    });
    
    newAchievements.forEach(function(ach) {
        showAchievementPopup(ach);
    });
    
    if (newAchievements.length > 0) {
        renderAchievements();
        renderProfile();
    }
}

function showAchievementPopup(ach) {
    var popup = document.getElementById('achievementPopup');
    if (!popup) return;
    
    document.getElementById('popupIcon').textContent = ach.icon;
    document.getElementById('popupName').textContent = ach.name;
    document.getElementById('popupDesc').textContent = ach.desc;
    document.getElementById('popupBadge').textContent = '🎖️ ' + (ach.title || 'Новое достижение!');
    
    popup.classList.add('show');
    spawnConfetti();
    
    clearTimeout(window._popupTimer);
    window._popupTimer = setTimeout(function() {
        popup.classList.remove('show');
    }, 5000);
}

function hidePopup() {
    document.getElementById('achievementPopup').classList.remove('show');
}

function spawnConfetti() {
    var container = document.getElementById('confetti');
    if (!container) return;
    
    var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#a29bfe', '#fd79a8'];
    var html = '';
    
    for (var i = 0; i < 30; i++) {
        var x = Math.random() * 100;
        var size = 4 + Math.random() * 8;
        var color = colors[Math.floor(Math.random() * colors.length)];
        var duration = 1.5 + Math.random() * 2;
        var delay = Math.random() * 1.5;
        
        html += `
            <div style="position:absolute;left:${x}vw;top:-20px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};animation:confettiFall ${duration}s ease-out forwards;animation-delay:${delay}s;transform:rotate(${Math.random() * 360}deg);"></div>
        `;
    }
    
    container.innerHTML = html;
    setTimeout(function() { container.innerHTML = ''; }, 4000);
}

// ============================================
// ПРОФИЛЬ
// ============================================

function renderProfile() {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'warning');
        navigate('catalog');
        return;
    }
    
    var profiles = DB.get('profiles', {});
    var profile = profiles[user.name] || { bio: '', avatar: '' };
    
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = '📧 ' + user.email;
    document.getElementById('profileBio').textContent = profile.bio || 'Нажмите чтобы добавить описание';
    
    var profileIdEl = document.getElementById('profileId');
    if (profileIdEl) {
        profileIdEl.textContent = '🆔 ID: ' + user.id;
    }
    
    var img = document.getElementById('avatarImg');
    var letter = document.getElementById('avatarLetter');
    
    var avatarFound = false;
    
    if (profile.avatar && profile.avatar.length > 100) {
        img.src = profile.avatar;
        img.style.display = 'block';
        if (letter) letter.style.display = 'none';
        avatarFound = true;
    }
    
    if (!avatarFound) {
        var backupAvatar = localStorage.getItem('avatar_' + user.name);
        if (backupAvatar && backupAvatar.length > 100) {
            img.src = backupAvatar;
            img.style.display = 'block';
            if (letter) letter.style.display = 'none';
            if (!profiles[user.name]) profiles[user.name] = {};
            profiles[user.name].avatar = backupAvatar;
            DB.set('profiles', profiles);
            DB.save();
            avatarFound = true;
        }
    }
    
    if (!avatarFound) {
        img.style.display = 'none';
        if (letter) {
            letter.style.display = 'flex';
            letter.textContent = user.name[0].toUpperCase();
        }
    }
    
    var favs = DB.getUserData(user.name, 'favorites', []);
    document.getElementById('statFav').textContent = favs.length;
    
    var comments = DB.get('comments', {});
    var count = 0;
    for (var k in comments) {
        comments[k].forEach(function(c) {
            if (c.user === user.name) count++;
        });
    }
    document.getElementById('statComments').textContent = count;
    document.getElementById('statAchievements').textContent = DB.getAchievements(user.name).length;
    
    var activeTitle = DB.getActiveTitle(user.name);
    var titleBadge = document.getElementById('profileTitle');
    if (titleBadge && activeTitle) {
        var ach = ACHIEVEMENTS_LIST.find(function(a) { return a.id === activeTitle; });
        if (ach) {
            titleBadge.textContent = '🎖️ ' + ach.title;
            titleBadge.style.display = 'inline';
            titleBadge.className = 'title-badge';
        } else {
            titleBadge.style.display = 'none';
        }
    } else if (titleBadge) {
        titleBadge.style.display = 'none';
    }
    
    renderProfileAchievements(user.name);
    renderTopUsers();
}

function renderProfileAchievements(user) {
    var grid = document.getElementById('profileAchievementsGrid');
    if (!grid) return;
    
    var earned = DB.getAchievements(user);
    var recent = earned.slice(-3).reverse();
    
    if (recent.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:12px;">Нет достижений</div>';
        return;
    }
    
    var html = '';
    recent.forEach(function(id) {
        var ach = ACHIEVEMENTS_LIST.find(function(a) { return a.id === id; });
        if (ach) {
            html += `
                <div class="profile-ach-item">
                    <span class="ach-icon">${ach.icon}</span>
                    <div class="ach-name">${ach.name}</div>
                    ${ach.title ? `<div class="ach-title">🎖️ ${ach.title}</div>` : ''}
                </div>
            `;
        }
    });
    grid.innerHTML = html;
}

// ============================================
// ТОП ПОЛЬЗОВАТЕЛЕЙ
// ============================================

function renderTopUsers() {
    var container = document.getElementById('topUsers');
    if (!container) return;
    
    var users = DB.get('users', {});
    var allData = {};
    
    for (var u in users) {
        var onlineTime = DB.getUserData(u, 'onlineTime', 0);
        var lastSeen = DB.getUserData(u, 'lastSeen', 0);
        var favs = DB.getUserData(u, 'favorites', []);
        var comments = DB.get('comments', {});
        var commentCount = 0;
        
        for (var k in comments) {
            comments[k].forEach(function(c) {
                if (c.user === u) commentCount++;
            });
        }
        
        var earned = DB.getAchievements(u);
        var activeTitle = DB.getActiveTitle(u);
        var titleName = '';
        if (activeTitle) {
            var ach = ACHIEVEMENTS_LIST.find(function(a) { return a.id === activeTitle; });
            if (ach) titleName = ach.title;
        }
        
        var xp = favs.length * 10 + commentCount * 5 + earned.length * 20 + Math.floor(onlineTime / 60);
        
        allData[u] = {
            name: u,
            email: users[u] || '',
            favs: favs.length,
            comments: commentCount,
            achievements: earned.length,
            onlineTime: onlineTime,
            lastSeen: lastSeen,
            xp: xp,
            title: titleName,
            isOnline: (Date.now() - lastSeen) < 300000
        };
    }
    
    var sorted = Object.values(allData).sort(function(a, b) {
        return b.xp - a.xp;
    }).slice(0, 20);
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div style="color:var(--text-muted);text-align:center;padding:30px;">
                <span style="font-size:48px;display:block;margin-bottom:12px;">👑</span>
                <p>Нет пользователей</p>
                <p style="font-size:12px;">Станьте первым!</p>
            </div>
        `;
        return;
    }
    
    function formatTime(seconds) {
        if (seconds < 60) return Math.floor(seconds) + 'с';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'м';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'ч';
        return Math.floor(seconds / 86400) + 'д';
    }
    
    function formatFullTime(seconds) {
        var days = Math.floor(seconds / 86400);
        var hours = Math.floor((seconds % 86400) / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var parts = [];
        if (days > 0) parts.push(days + 'д');
        if (hours > 0) parts.push(hours + 'ч');
        if (minutes > 0) parts.push(minutes + 'м');
        return parts.join(' ') || '0м';
    }
    
    var medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    var avatarGradients = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 
                           'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6',
                           'avatar-gradient-7', 'avatar-gradient-8', 'avatar-gradient-9', 'avatar-gradient-10'];
    
    var html = `
        <div class="top-users-wrapper">
            <div class="top-users-header">
                <h3>👑 Топ пользователей</h3>
                <span class="top-update-time">🔄 Обновлено: ${new Date().toLocaleTimeString()}</span>
            </div>
            
            <div style="overflow-x:auto;">
                <table class="top-users-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Пользователь</th>
                            <th class="hide-mobile">📚 В изб.</th>
                            <th class="hide-mobile">💬 Комм.</th>
                            <th>🏆 Дост.</th>
                            <th>⏱ Время</th>
                            <th>⭐ XP</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    var maxXP = sorted.length > 0 ? sorted[0].xp : 1;
    
    sorted.forEach(function(user, index) {
        var rankClass = index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : (index === 2 ? 'rank-3' : ''));
        var medal = index < 10 ? medals[index] : '#' + (index + 1);
        var avatarGrad = avatarGradients[index % avatarGradients.length];
        var initial = user.name[0].toUpperCase();
        
        var xpPercent = Math.min((user.xp / maxXP) * 100, 100);
        var statusDot = user.isOnline ? '🟢' : (user.lastSeen > 0 ? '🟡' : '⚪');
        
        html += `
            <tr class="${rankClass}">
                <td class="rank-cell">${medal}</td>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar-mini ${avatarGrad}">
                            ${initial}
                        </div>
                        <div>
                            <div class="user-name-cell">
                                ${user.name} 
                                <span style="font-size:11px;color:${user.isOnline ? '#2ecc71' : '#666'};">
                                    ${statusDot}
                                </span>
                            </div>
                            ${user.title ? `<div class="user-title-cell">🎖️ ${user.title}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="stat-cell hide-mobile">
                    <span class="stat-number">${user.favs}</span>
                    <span class="stat-label">аниме</span>
                </td>
                <td class="stat-cell hide-mobile">
                    <span class="stat-number">${user.comments}</span>
                    <span class="stat-label">комм.</span>
                </td>
                <td class="stat-cell">
                    <span class="stat-number">${user.achievements}</span>
                    <span class="stat-label">достиж.</span>
                </td>
                <td class="time-cell">
                    <div class="time-value">${formatTime(user.onlineTime)}</div>
                    <span class="time-label">${formatFullTime(user.onlineTime)}</span>
                </td>
                <td>
                    <div class="xp-bar-wrapper">
                        <div class="xp-bar-bg">
                            <div class="xp-bar-fill" style="width:${xpPercent}%;"></div>
                        </div>
                        <div class="xp-text">${user.xp} XP</div>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <div class="status-legend">
                <span class="status-legend-item">
                    <span class="dot dot-online"></span> Онлайн
                </span>
                <span class="status-legend-item">
                    <span class="dot dot-idle"></span> Недавно был
                </span>
                <span class="status-legend-item">
                    <span class="dot dot-offline"></span> Не в сети
                </span>
                <span class="status-legend-item">
                    ⭐ XP = Изб×10 + Комм×5 + Дост×20 + Время
                </span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ============================================
// АВАТАР
// ============================================

function uploadAvatar(input) {
    if (!input || !input.files || input.files.length === 0) {
        showToast('Выберите файл!', 'error');
        return;
    }
    
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    var file = input.files[0];
    
    if (file.size > 20 * 1024 * 1024) {
        showToast('Файл слишком большой! Максимум 20MB', 'error');
        return;
    }
    
    var validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (validTypes.indexOf(file.type) === -1) {
        showToast('Поддерживаются только изображения', 'error');
        return;
    }
    
    showToast('⏳ Загрузка...', 'info');
    
    var reader = new FileReader();
    reader.onload = function(e) {
        var avatarData = e.target.result;
        var profiles = DB.get('profiles', {});
        if (!profiles[user.name]) profiles[user.name] = {};
        
        profiles[user.name].avatar = avatarData;
        DB.set('profiles', profiles);
        localStorage.setItem('avatar_' + user.name, avatarData);
        DB.save();
        
        var img = document.getElementById('avatarImg');
        var letter = document.getElementById('avatarLetter');
        if (img) {
            img.src = avatarData;
            img.style.display = 'block';
        }
        if (letter) letter.style.display = 'none';
        
        showToast('✅ Аватар обновлен!', 'success');
    };
    reader.onerror = function() {
        showToast('Ошибка загрузки файла', 'error');
    };
    reader.readAsDataURL(file);
}

// ============================================
// ВИДЕО ПЛЕЕР
// ============================================

function playVideo(name, url) {
    var wrapper = document.getElementById('playerWrapper');
    if (!wrapper) return;
    wrapper.innerHTML = `<iframe src="${url}" allowfullscreen allow="autoplay" style="width:100%;height:100%;border:none;"></iframe>`;
    showToast('▶️ Воспроизведение: ' + name, 'success');
    
    var user = DB.get('currentUser');
    if (user) {
        var history = DB.getUserData(user.name, 'history', []);
        if (history.indexOf(name) === -1) {
            history.push(name);
            DB.setUserData(user.name, 'history', history);
        }
        
        var continueData = DB.getUserData(user.name, 'continueWatching', {});
        if (!continueData[name]) continueData[name] = {};
        continueData[name].ep = (continueData[name].ep || 0) + 1;
        continueData[name].time = Date.now();
        DB.setUserData(user.name, 'continueWatching', continueData);
        
        checkAchievements(name);
    }
}

// ============================================
// TOAST
// ============================================

function showToast(message, type) {
    var old = document.querySelector('.toast-message');
    if (old) old.remove();
    
    var colors = {
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12',
        info: 'rgba(20,20,50,0.95)'
    };
    
    var toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type] || colors.info};
        color: #fff;
        padding: 14px 28px;
        border-radius: 14px;
        font-weight: 600;
        z-index: 99999;
        max-width: 90%;
        text-align: center;
        border: 1px solid rgba(108,92,231,0.2);
        backdrop-filter: blur(20px);
        font-size: 14px;
        animation: fadeInUp 0.4s ease forwards;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(toast);
    
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(function() { if (toast.parentNode) toast.remove(); }, 500);
    }, 3000);
}

// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

function showConfirmModal(title, text, callback, icon) {
    var modal = document.getElementById('confirmModal');
    if (!modal) return;
    
    document.getElementById('confirmTitle').textContent = title || 'Подтверждение';
    document.getElementById('confirmText').textContent = text || 'Вы уверены?';
    document.getElementById('confirmIcon').textContent = icon || '⚠️';
    
    var okBtn = document.getElementById('confirmOkBtn');
    okBtn.onclick = function() {
        closeModal('confirmModal');
        if (callback) callback();
    };
    
    modal.style.display = 'flex';
}

function deleteAccount() {
    if (!DB.get('currentUser')) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    var user = DB.get('currentUser');
    var modal = document.getElementById('deleteAccountModal');
    if (!modal) return;
    
    document.getElementById('deleteCurrentUser').textContent = user.name;
    document.getElementById('deleteConfirmName').value = '';
    modal.style.display = 'flex';
}

function confirmDeleteAccount() {
    var user = DB.get('currentUser');
    var input = document.getElementById('deleteConfirmName');
    if (!user || input.value.trim() !== user.name) {
        showToast('❌ Имя не совпадает!', 'error');
        return;
    }
    
    closeModal('deleteAccountModal');
    showConfirmModal('💀 Удаление аккаунта', 'Вы уверены?', function() {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/delete-account');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            DB.set('currentUser', null);
            localStorage.removeItem('onika_currentUser');
            localStorage.removeItem('onika_data');
            updateUI();
            navigate('catalog');
            showToast('✅ Аккаунт удален', 'success');
            if (typeof stopOnlineTracking === 'function') {
                stopOnlineTracking();
            }
            setTimeout(function() { location.reload(); }, 500);
        };
        xhr.send(JSON.stringify({ userId: user.id }));
    });
}

function closeModal(id) {
    var el = document.getElementById(id);
    if (el) {
        el.style.display = 'none';
    }
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(function(modal) {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }
});

// ============================================
// РЕДАКТИРОВАНИЕ ПРОФИЛЯ
// ============================================

function editProfile(type) {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    window._editType = type;
    var input = document.getElementById('editInput');
    var textarea = document.getElementById('editTextarea');
    var title = document.getElementById('editTitle');
    
    if (!input || !textarea || !title) return;
    
    input.style.display = type === 'bio' ? 'none' : 'block';
    textarea.style.display = type === 'bio' ? 'block' : 'none';
    
    if (type === 'name') {
        title.textContent = '✏️ Изменить никнейм';
        input.value = user.name;
        input.placeholder = 'Введите новый никнейм';
        input.type = 'text';
    } else if (type === 'email') {
        title.textContent = '✏️ Изменить email';
        input.value = user.email;
        input.placeholder = 'Введите новый email';
        input.type = 'email';
    } else if (type === 'pass') {
        title.textContent = '🔑 Изменить пароль';
        input.value = '';
        input.placeholder = 'Введите новый пароль';
        input.type = 'password';
    } else if (type === 'bio') {
        title.textContent = '📝 Изменить описание';
        input.style.display = 'none';
        textarea.style.display = 'block';
        var profiles = DB.get('profiles', {});
        textarea.value = (profiles[user.name] && profiles[user.name].bio) || '';
        textarea.placeholder = 'Введите описание';
    }
    
    document.getElementById('editModal').style.display = 'flex';
}

function saveEdit() {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    var input = document.getElementById('editInput');
    var textarea = document.getElementById('editTextarea');
    var type = window._editType || 'bio';
    var val = type === 'bio' ? textarea.value.trim() : input.value.trim();
    
    if (!val) {
        showToast('Поле не может быть пустым!', 'error');
        return;
    }
    
    if (type === 'name') {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/update-name');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            try {
                var data = JSON.parse(xhr.responseText);
                if (data.success) {
                    var oldName = user.name;
                    user.name = val;
                    localStorage.setItem('onika_currentUser', JSON.stringify(user));
                    DB._data.currentUser = user;
                    
                    if (DB._data.favorites[oldName]) {
                        DB._data.favorites[val] = DB._data.favorites[oldName];
                        delete DB._data.favorites[oldName];
                    }
                    if (DB._data.achievements[oldName]) {
                        DB._data.achievements[val] = DB._data.achievements[oldName];
                        delete DB._data.achievements[oldName];
                    }
                    if (DB._data.activeTitle[oldName]) {
                        DB._data.activeTitle[val] = DB._data.activeTitle[oldName];
                        delete DB._data.activeTitle[oldName];
                    }
                    if (DB._data.profiles[oldName]) {
                        DB._data.profiles[val] = DB._data.profiles[oldName];
                        delete DB._data.profiles[oldName];
                    }
                    if (DB._data.onlineTime && DB._data.onlineTime[oldName]) {
                        DB._data.onlineTime[val] = DB._data.onlineTime[oldName];
                        delete DB._data.onlineTime[oldName];
                    }
                    if (DB._data.lastSeen && DB._data.lastSeen[oldName]) {
                        DB._data.lastSeen[val] = DB._data.lastSeen[oldName];
                        delete DB._data.lastSeen[oldName];
                    }
                    
                    var backupFavs = localStorage.getItem('favorites_' + oldName);
                    if (backupFavs) {
                        localStorage.setItem('favorites_' + val, backupFavs);
                        localStorage.removeItem('favorites_' + oldName);
                    }
                    var backupAvatar = localStorage.getItem('avatar_' + oldName);
                    if (backupAvatar) {
                        localStorage.setItem('avatar_' + val, backupAvatar);
                        localStorage.removeItem('avatar_' + oldName);
                    }
                    
                    DB.save();
                    closeModal('editModal');
                    renderProfile();
                    updateUI();
                    showToast('✅ Никнейм изменен на ' + val, 'success');
                } else {
                    showToast(data.error || 'Ошибка', 'error');
                }
            } catch(e) {
                showToast('Ошибка сервера', 'error');
            }
        };
        xhr.send(JSON.stringify({ userId: user.id, newName: val }));
    } else if (type === 'bio') {
        var profiles = DB.get('profiles', {});
        if (!profiles[user.name]) profiles[user.name] = {};
        profiles[user.name].bio = val;
        DB.set('profiles', profiles);
        closeModal('editModal');
        renderProfile();
        showToast('✅ Описание обновлено!', 'success');
    } else {
        showToast('❌ Изменение этого поля пока не поддерживается', 'warning');
    }
}

// ============================================
// ВОССТАНОВЛЕНИЕ ДАННЫХ
// ============================================

function restoreAllData() {
    console.log('🔄 Восстановление данных...');
    
    var user = DB.get('currentUser');
    if (!user) return;
    
    var backupFavs = localStorage.getItem('favorites_' + user.name);
    if (backupFavs) {
        try {
            var parsed = JSON.parse(backupFavs);
            if (parsed && parsed.length > 0) {
                var currentFavs = DB.getUserData(user.name, 'favorites', []);
                if (currentFavs.length === 0) {
                    DB.setUserData(user.name, 'favorites', parsed);
                    console.log('📚 Восстановлено избранное:', parsed.length);
                }
            }
        } catch(e) {}
    }
    
    var backupAvatar = localStorage.getItem('avatar_' + user.name);
    if (backupAvatar) {
        var profiles = DB.get('profiles', {});
        if (!profiles[user.name]) profiles[user.name] = {};
        if (!profiles[user.name].avatar) {
            profiles[user.name].avatar = backupAvatar;
            DB.set('profiles', profiles);
            console.log('🖼️ Восстановлена аватарка');
        }
    }
    
    DB.save();
    
    if (typeof renderProfile === 'function') renderProfile();
    if (typeof renderFavorites === 'function') renderFavorites();
    if (typeof renderAchievements === 'function') renderAchievements();
    
    console.log('✅ Восстановление завершено');
}

// ============================================
// ЖИВАЯ СТАТИСТИКА СОЦСЕТЕЙ
// ============================================

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function updateSocialStats() {
    console.log('🔄 Обновление статистики соцсетей...');
    
    var tgElement = document.getElementById('tgStats');
    if (tgElement) {
        var tgBase = 1200;
        var tgGrowth = Math.floor(Math.random() * 30);
        var tgCurrent = tgBase + tgGrowth;
        tgElement.textContent = '👥 ' + formatNumber(tgCurrent) + ' подписчиков';
        tgElement.classList.add('pulse');
        setTimeout(function() { tgElement.classList.remove('pulse'); }, 500);
    }
    
    var vkElement = document.getElementById('vkStats');
    if (vkElement) {
        var vkBase = 856;
        var vkGrowth = Math.floor(Math.random() * 20);
        var vkCurrent = vkBase + vkGrowth;
        vkElement.textContent = '👥 ' + formatNumber(vkCurrent) + ' подписчиков';
        vkElement.classList.add('pulse');
        setTimeout(function() { vkElement.classList.remove('pulse'); }, 500);
    }
    
    var ttElement = document.getElementById('ttStats');
    if (ttElement) {
        var ttBase = 2400;
        var ttGrowth = Math.floor(Math.random() * 50);
        var ttCurrent = ttBase + ttGrowth;
        ttElement.textContent = '👥 ' + formatNumber(ttCurrent) + ' подписчиков';
        ttElement.classList.add('pulse');
        setTimeout(function() { ttElement.classList.remove('pulse'); }, 500);
    }
}

function refreshStats() {
    updateSocialStats();
    showToast('📊 Статистика обновлена!', 'success');
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateSocialStats, 1000);
    setInterval(updateSocialStats, 30000);
});

console.log('📊 Система живой статистики запущена!');
console.log('💡 Используйте refreshStats() для ручного обновления');

// ============================================
// ЗАПУСК
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 OnikaAnime загружается...');
    
    restoreAllData();
    
    updateUI();
    navigate('catalog');
    
    var user = DB.get('currentUser');
    if (user) {
        startOnlineTracking();
    }
    
    var videos = DB.get('videos', {});
    if (Object.keys(videos).length === 0) {
        videos = {
            'Атака Титанов': [
                { ep: 1, url: 'https://www.youtube.com/embed/1IOcJ33PjWM' },
                { ep: 2, url: 'https://www.youtube.com/embed/UK_t6Y-q_mk' }
            ],
            'Наруто': [
                { ep: 1, url: 'https://www.youtube.com/embed/5M_FsMBMbeQ' },
                { ep: 2, url: 'https://www.youtube.com/embed/wZWr8dj84So' }
            ]
        };
        DB.set('videos', videos);
    }
    
    console.log('✅ OnikaAnime готов!');
});

console.log('🌟 OnikaAnime загружен!');
console.log('💡 Используйте restoreAllData() для восстановления данных');
console.log('💡 Используйте refreshStats() для обновления статистики соцсетей');

// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME — БЕЗ ПЛЕЕРА
// ============================================

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
const allData = {};
let currentPage = 'home';
let previousPage = null;
let page = 1;
let genre = '';
let query = '';
let totalCount = 0;
let loadedCount = 0;
let allItems = [];
let onlineTimer = null;
let startTime = Date.now();
let isLoading = false;
let activeFilters = {};
let isAllLoaded = false;
let searchQuery = '';
let filterPanelVisible = false;
let searchTimeout = null;
let heroSliderData = [];
let heroCurrentSlide = 0;
let heroAutoSlideTimer = null;

// ===== ДОСТИЖЕНИЯ =====
const ACHIEVEMENTS_LIST = [
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
// НАВИГАЦИЯ
// ============================================
function navigate(pageName) {
    currentPage = pageName;
    const pages = ['home', 'detail', 'favorites', 'achievements', 'mycomments', 'profile', 'settings'];
    
    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if (el) el.style.display = p === pageName ? 'block' : 'none';
    });
    
    if (pageName === 'home') {
        loadRecommendationsForHero();
        loadCatalog();
        loadFilterOptions();
        resetCatalogFiltersSilent();
        
        const panel = document.getElementById('filterPanel');
        const icon = document.getElementById('filterToggleIcon');
        const text = document.getElementById('filterToggleText');
        if (panel) {
            panel.style.display = 'none';
            if (icon) icon.textContent = '🔽';
            if (text) text.textContent = 'Показать фильтры';
        }
    }
    if (pageName === 'favorites') renderFavorites();
    if (pageName === 'profile') renderProfile();
    if (pageName === 'achievements') renderAchievements();
    if (pageName === 'mycomments') renderMyComments();
    
    closeMenu();
}

function goBack() {
    if (previousPage) {
        navigate(previousPage);
        previousPage = null;
    } else {
        navigate('home');
    }
}

// ============================================
// UI
// ============================================
function updateUI() {
    const user = DB.get('currentUser');
    const nav = document.getElementById('sidebarNav');
    const footer = document.getElementById('sidebarFooter');
    
    if (!nav || !footer) return;
    
    if (user) {
        nav.innerHTML = `
            <a class="active" data-page="home" onclick="navigate('home'); closeMenu();">
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
        footer.innerHTML = `<div class="sidebar-user-info">🌟 ${user.name}</div>`;
    } else {
        nav.innerHTML = `
            <a class="active" data-page="home" onclick="navigate('home'); closeMenu();">
                <span class="icon">🏠</span> Главная
            </a>
        `;
        footer.innerHTML = `<button class="sidebar-login-btn" onclick="showLoginModal(); closeMenu();">🚀 Войти</button>`;
    }
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('open');
}

function closeMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
}

// ============================================
// ОТСЛЕЖИВАНИЕ ВРЕМЕНИ
// ============================================
function startOnlineTracking() {
    const user = DB.get('currentUser');
    if (!user) return;
    startTime = Date.now();
    if (onlineTimer) clearInterval(onlineTimer);
    onlineTimer = setInterval(function() {
        const userNow = DB.get('currentUser');
        if (!userNow) {
            clearInterval(onlineTimer);
            return;
        }
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const totalTime = DB.getUserData(userNow.name, 'onlineTime', 0);
        totalTime += 30;
        DB.setUserData(userNow.name, 'onlineTime', totalTime);
        DB.setUserData(userNow.name, 'lastSeen', Date.now());
        DB.save();
        if (elapsed % 120 === 0) renderTopUsers();
    }, 30000);
}

function stopOnlineTracking() {
    if (onlineTimer) {
        clearInterval(onlineTimer);
        onlineTimer = null;
    }
}

window.addEventListener('beforeunload', function() {
    const userExit = DB.get('currentUser');
    if (userExit) {
        const elapsedExit = Math.floor((Date.now() - startTime) / 1000);
        const totalTimeExit = DB.getUserData(userExit.name, 'onlineTime', 0);
        DB.setUserData(userExit.name, 'onlineTime', totalTimeExit + elapsedExit);
        DB.setUserData(userExit.name, 'lastSeen', Date.now());
        DB.save();
    }
});

// ============================================
// 1. КАРУСЕЛЬ РЕКОМЕНДАЦИЙ
// ============================================
async function loadRecommendationsForHero() {
    try {
        const cachedRecs = sessionStorage.getItem('onika_hero_recs');
        if (cachedRecs && heroSliderData.length === 0) {
            try {
                const parsed = JSON.parse(cachedRecs);
                if (parsed && parsed.length > 0) {
                    heroSliderData = parsed;
                    renderHeroSlider(parsed);
                    startHeroAutoSlide();
                }
            } catch(e) {}
        }
        
        const recs = await API.getRecommended(6);
        if (recs && recs.length > 0) {
            heroSliderData = recs;
            renderHeroSlider(recs);
            startHeroAutoSlide();
            sessionStorage.setItem('onika_hero_recs', JSON.stringify(recs.slice(0, 6)));
        }
    } catch (e) {
        console.error('Ошибка загрузки рекомендаций:', e);
    }
}

function renderHeroSlider(items) {
    const slider = document.getElementById('heroSlider');
    const dots = document.getElementById('heroDots');
    if (!slider) return;
    
    heroCurrentSlide = 0;
    let slidesHtml = '';
    let dotsHtml = '';
    
    items.forEach((item, index) => {
        const img = item.images?.jpg?.image_url || '';
        const title = item.title || 'Без названия';
        const genres = (item.genres || []).slice(0, 3).join(' • ');
        const year = item.year || '';
        const id = item.id;
        const age = item.age_rating || '0+';
        const isActive = index === 0 ? ' active' : '';
        const posterBg = img ? `url(${img})` : 'none';
        
        slidesHtml += `
            <div class="hero-slide${isActive}" onclick="openDetail('${id}')" style="background-image: ${posterBg};">
                <div class="hero-slide-overlay"></div>
                <div class="hero-slide-content">
                    <div class="hero-slide-badge">${age} • ${year || 'Новинка'}</div>
                    <h2 class="hero-slide-title">${title}</h2>
                    <p class="hero-slide-desc">${genres || 'Рекомендуем к просмотру'}</p>
                    <button class="hero-slide-btn" onclick="event.stopPropagation(); openDetail('${id}')">
                        🎬 Смотреть сейчас
                    </button>
                </div>
                <div class="hero-slide-poster">
                    ${img ? `<img src="${img}" alt="${title}">` : '<span style="font-size:64px;">🎬</span>'}
                </div>
            </div>
        `;
        
        dotsHtml += `<span class="hero-dot${isActive}" onclick="goToHeroSlide(${index})"></span>`;
    });
    
    slider.innerHTML = slidesHtml;
    if (dots) dots.innerHTML = dotsHtml;
}

function startHeroAutoSlide() {
    if (heroAutoSlideTimer) clearInterval(heroAutoSlideTimer);
    heroAutoSlideTimer = setInterval(() => slideHero(1), 5000);
}

function slideHero(direction) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;
    
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    heroCurrentSlide = (heroCurrentSlide + direction + slides.length) % slides.length;
    
    slides[heroCurrentSlide].classList.add('active');
    if (dots[heroCurrentSlide]) dots[heroCurrentSlide].classList.add('active');
    
    if (heroAutoSlideTimer) {
        clearInterval(heroAutoSlideTimer);
        startHeroAutoSlide();
    }
}

function goToHeroSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length || index === heroCurrentSlide) return;
    
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    heroCurrentSlide = index;
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    
    if (heroAutoSlideTimer) {
        clearInterval(heroAutoSlideTimer);
        startHeroAutoSlide();
    }
}

// ============================================
// 2. КАТАЛОГ
// ============================================
async function loadCatalog() {
    if (isLoading) return;
    isLoading = true;
    
    const grid = document.getElementById('grid');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const stats = document.getElementById('totalCount');
    if (!grid) return;
    
    const searchInput = document.getElementById('catalogSearchInput');
    const searchValue = searchInput ? searchInput.value.trim() : '';
    
    if (!allItems.length && !searchValue && !genre) {
        const cachedCatalog = sessionStorage.getItem('onika_catalog_cache');
        if (cachedCatalog) {
            try {
                const parsed = JSON.parse(cachedCatalog);
                if (parsed.items && parsed.items.length > 0) {
                    allItems = parsed.items;
                    allItems.forEach(item => allItems[item.mal_id] = item);
                    renderCatalog(allItems);
                    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                }
            } catch(e) {}
        }
    }
    
    if (!allItems.length) {
        grid.innerHTML = `
            <div style="text-align:center;padding:40px;color:#888;grid-column:1/-1;">
                <div class="spinner-small"></div>
                <br>⏳ Загрузка...
            </div>
        `;
    }
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    
    try {
        const filters = getCatalogFilters();
        const limit = parseInt(document.getElementById('filterLimit')?.value || 24);
        
        let result;
        if (searchValue && searchValue.length > 0) {
            result = await smartSearch(searchValue, 1);
        } else if (genre === 'latest') {
            result = await API._getLatestReleases(limit || 48);
        } else if (genre && !Object.keys(filters).length) {
            result = await API.getByGenre(genre, 1, limit);
        } else {
            result = await API.searchAll('', genre, 1, filters);
        }
        
        if (result && result.items && result.items.length > 0) {
            allItems = result.items;
            totalCount = result.totalCount || result.items.length;
            allItems.forEach(item => { allData[item.mal_id] = item; });
            
            renderCatalog(allItems);
            
            if (!searchValue && !genre && !Object.keys(filters).length) {
                try {
                    sessionStorage.setItem('onika_catalog_cache', JSON.stringify({
                        items: allItems.slice(0, 24),
                        time: Date.now()
                    }));
                } catch(e) {}
            }
            
            if (stats) {
                const searchText = searchValue ? `по запросу "${searchValue}"` : '';
                stats.textContent = searchText ? `${searchText} (${allItems.length})` : '';
            }
            
            if (loadMoreBtn) {
                if (allItems.length < totalCount && totalCount > limit && limit > 0) {
                    loadMoreBtn.style.display = 'block';
                    loadMoreBtn.textContent = `📥 Загрузить ещё (${allItems.length}/${totalCount})`;
                } else {
                    loadMoreBtn.style.display = 'none';
                }
            }
            
            isAllLoaded = allItems.length >= totalCount || limit === 0;
        } else {
            const searchText = searchValue ? ` "${searchValue}"` : '';
            grid.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--text-muted);grid-column:1/-1;">
                    <div style="font-size:64px;margin-bottom:16px;">🔍</div>
                    <p style="font-size:18px;font-weight:600;margin-bottom:8px;">Ничего не найдено${searchText}</p>
                </div>
            `;
            if (stats) stats.textContent = '';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            allItems = [];
            totalCount = 0;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        if (!allItems.length) {
            grid.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--text-muted);grid-column:1/-1;">
                    <div style="font-size:64px;margin-bottom:16px;">⚠️</div>
                    <p style="font-size:18px;font-weight:600;margin-bottom:8px;">Ошибка загрузки</p>
                    <button onclick="loadCatalog()" class="random-retry-btn" style="margin-top:16px;">🔄 Попробовать снова</button>
                </div>
            `;
        }
    } finally {
        isLoading = false;
    }
}

async function smartSearch(query, page = 1) {
    const searchMethods = [
        async () => await API.searchTitles(query, page),
        async () => await API.searchAll(query, '', page, { search: query })
    ];

    for (const method of searchMethods) {
        try {
            const result = await method();
            if (result && result.items && result.items.length > 0) return result;
        } catch(e) {}
    }
    
    return { items: [], totalPages: 1, totalCount: 0 };
}

async function loadMoreCatalog() {
    if (isLoading || isAllLoaded) return;
    isLoading = true;
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const stats = document.getElementById('totalCount');
    
    if (loadMoreBtn) {
        loadMoreBtn.textContent = '⏳ Загрузка...';
        loadMoreBtn.disabled = true;
    }
    
    try {
        const filters = getCatalogFilters();
        const currentCount = allItems.length;
        const limit = parseInt(document.getElementById('filterLimit')?.value || 24);
        const nextPage = Math.floor(currentCount / Math.max(limit, 24)) + 1;
        
        const searchInput = document.getElementById('catalogSearchInput');
        const searchValue = searchInput ? searchInput.value.trim() : '';
        
        let result;
        if (searchValue && searchValue.length > 0) {
            result = await smartSearch(searchValue, nextPage);
        } else if (genre === 'latest') {
            result = await API._getLatestReleases(limit || 48);
            isAllLoaded = true;
        } else if (genre && !Object.keys(filters).length) {
            result = await API.getByGenre(genre, nextPage, limit);
        } else {
            result = await API.searchAll('', genre, nextPage, filters);
        }
        
        if (result && result.items && result.items.length > 0) {
            const newItems = result.items;
            newItems.forEach(item => {
                if (!allData[item.mal_id]) allData[item.mal_id] = item;
            });
            
            allItems = [...allItems, ...newItems];
            totalCount = result.totalCount || totalCount;
            
            renderCatalog(allItems);
            
            if (stats) {
                const searchText = searchValue ? `по запросу "${searchValue}"` : '';
                stats.textContent = searchText ? `${searchText} (${allItems.length})` : '';
            }
            
            isAllLoaded = allItems.length >= totalCount || newItems.length < Math.max(limit, 24);
            
            if (loadMoreBtn) {
                if (!isAllLoaded) {
                    loadMoreBtn.textContent = `📥 Загрузить ещё (${allItems.length}/${totalCount})`;
                    loadMoreBtn.disabled = false;
                } else {
                    loadMoreBtn.style.display = 'none';
                }
            }
        } else {
            isAllLoaded = true;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        showToast('⚠️ Ошибка загрузки', 'error');
    } finally {
        isLoading = false;
        if (loadMoreBtn) loadMoreBtn.disabled = false;
    }
}

function getCatalogFilters() {
    const filters = {};
    
    const yearFrom = document.getElementById('filterYearFrom');
    const yearTo = document.getElementById('filterYearTo');
    if (yearFrom && yearFrom.value) filters.year_from = parseInt(yearFrom.value);
    if (yearTo && yearTo.value) filters.year_to = parseInt(yearTo.value);
    
    const genreChecks = document.querySelectorAll('#filterGenres input:checked');
    if (genreChecks.length) {
        filters.genres = Array.from(genreChecks).map(cb => parseInt(cb.value));
    }
    
    const ageChecks = document.querySelectorAll('#filterAgeRatings input:checked');
    if (ageChecks.length) {
        filters.age_ratings = Array.from(ageChecks).map(cb => cb.value);
    }
    
    const sortSelect = document.getElementById('filterSorting');
    if (sortSelect && sortSelect.value && sortSelect.value !== 'CREATED_AT_DESC') {
        filters.sorting = sortSelect.value;
    }
    
    return filters;
}

async function loadFilterOptions() {
    const genresContainer = document.getElementById('filterGenres');
    const agesContainer = document.getElementById('filterAgeRatings');
    
    const cachedGenres = sessionStorage.getItem('onika_genres');
    const cachedAges = sessionStorage.getItem('onika_ages');
    
    if (cachedGenres && genresContainer && !genresContainer.innerHTML.trim()) {
        try {
            const genres = JSON.parse(cachedGenres);
            genresContainer.innerHTML = genres.map(g => `
                <label>
                    <input type="checkbox" value="${g.id}" onchange="applyCatalogFilters()">
                    <span>${g.icon || '📚'} ${g.name}</span>
                </label>
            `).join('');
        } catch(e) {}
    }
    
    if (cachedAges && agesContainer && !agesContainer.innerHTML.trim()) {
        try {
            const ages = JSON.parse(cachedAges);
            agesContainer.innerHTML = ages.map(a => `
                <label>
                    <input type="checkbox" value="${a.value}" onchange="applyCatalogFilters()">
                    <span>${a.label}</span>
                </label>
            `).join('');
        } catch(e) {}
    }
    
    try {
        const [genres, ages] = await Promise.all([
            API.getGenres().catch(() => []),
            API.getAgeRatings().catch(() => [])
        ]);
        
        if (genresContainer && genres.length && !genresContainer.innerHTML.trim()) {
            genresContainer.innerHTML = genres.map(g => `
                <label>
                    <input type="checkbox" value="${g.id}" onchange="applyCatalogFilters()">
                    <span>${g.icon || '📚'} ${g.name}</span>
                </label>
            `).join('');
            sessionStorage.setItem('onika_genres', JSON.stringify(genres));
        }
        
        if (agesContainer && ages.length && !agesContainer.innerHTML.trim()) {
            agesContainer.innerHTML = ages.map(a => {
                const label = a.label || a.value || String(a);
                const value = a.value || a;
                return `
                    <label>
                        <input type="checkbox" value="${value}" onchange="applyCatalogFilters()">
                        <span>${label}</span>
                    </label>
                `;
            }).join('');
            sessionStorage.setItem('onika_ages', JSON.stringify(ages));
        }
    } catch (e) {
        console.error('Ошибка загрузки опций фильтров:', e);
    }
}

function applyCatalogFilters() {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }
    searchTimeout = setTimeout(() => {
        allItems = [];
        isAllLoaded = false;
        page = 1;
        loadCatalog();
    }, 300);
}

function resetCatalogFiltersSilent() {
    document.querySelectorAll('#filterPanel input[type="checkbox"]').forEach(cb => cb.checked = false);
    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) {
        searchInput.value = '';
        const clearBtn = document.getElementById('catalogSearchClear');
        if (clearBtn) clearBtn.style.display = 'none';
    }
    const yearFrom = document.getElementById('filterYearFrom');
    const yearTo = document.getElementById('filterYearTo');
    if (yearFrom) yearFrom.value = '';
    if (yearTo) yearTo.value = '';
    const sortSelect = document.getElementById('filterSorting');
    if (sortSelect) sortSelect.value = 'CREATED_AT_DESC';
    const limitSelect = document.getElementById('filterLimit');
    if (limitSelect) limitSelect.value = '24';
    
    if (searchTimeout) { clearTimeout(searchTimeout); searchTimeout = null; }
    
    if (genre && genre !== 'latest') {
        genre = '';
        document.querySelectorAll('.genres a').forEach(el => el.classList.remove('active'));
        const allBtn = document.querySelector('.genres a[data-genre=""]');
        if (allBtn) allBtn.classList.add('active');
        const titleEl = document.getElementById('title');
        if (titleEl) titleEl.textContent = '📚 ВСЕ АНИМЕ';
    }
    
    searchQuery = '';
    allItems = [];
    isAllLoaded = false;
    page = 1;
}

function resetCatalogFilters() {
    resetCatalogFiltersSilent();
    sessionStorage.removeItem('onika_catalog_cache');
    loadCatalog();
}

function renderCatalog(list) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    if (!list || list.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-muted);grid-column:1/-1;">
                <div style="font-size:64px;margin-bottom:16px;">🔍</div>
                <p style="font-size:18px;font-weight:600;margin-bottom:8px;">Ничего не найдено</p>
            </div>
        `;
        return;
    }
    
    const colors = ['#6c5ce7', '#fd79a8', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'];
    const htmlParts = [];
    
    for (let index = 0; index < list.length; index++) {
        const a = list[index];
        const img = a.images?.jpg?.image_url || '';
        
        let title = a.title;
        if (!title || title === 'Без названия' || title.startsWith('anilibria_') || /^\d+$/.test(title)) {
            title = a.title_russian || a.russian || a.title_english || a.alias || 'Без названия';
        }
        
        const episodes = a.episodes || 'Онгоинг';
        const year = a.year || '';
        const color = colors[index % colors.length];
        const id = a.mal_id || a.id;
        const age = a.age_rating || '0+';
        
        htmlParts.push(`
            <div class="card" onclick="openDetail('${id}')">
                <div class="card-img" style="${!img ? 'background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:48px;' : ''}">
                    ${img ? `<img src="${img}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '🎬'}
                    ${year ? `<span class="card-year">${year}</span>` : ''}
                    <span class="card-age">${age}</span>
                </div>
                <div class="card-body">
                    <div class="title">${title}</div>
                    <div class="info">${episodes} эп.</div>
                </div>
            </div>
        `);
    }
    
    grid.innerHTML = htmlParts.join('');
}

// ============================================
// 3. УСТАНОВКА ЖАНРА
// ============================================
function setGenre(genreId, btn) {
    document.querySelectorAll('.genres a').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    window.genre = genreId;
    window.query = '';
    window.page = 1;
    
    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) searchInput.value = '';
    
    const titleEl = document.getElementById('title');
    if (titleEl) {
        if (genreId === 'latest') {
            titleEl.textContent = '🔥 НОВИНКИ АНИМЕ';
        } else if (genreId) {
            const genreObj = window.allGenres?.find(g => g.id == genreId);
            if (genreObj) {
                titleEl.textContent = `${genreObj.icon || '🎭'} ${genreObj.name}`;
            } else {
                titleEl.textContent = '🎭 ' + (btn ? btn.textContent : 'Жанр');
            }
        } else {
            titleEl.textContent = '📚 ВСЕ АНИМЕ';
        }
    }
    
    if (genreId === 'latest') {
        document.querySelectorAll('#filterPanel input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
    
    allItems = [];
    isAllLoaded = false;
    loadCatalog();
}

// ============================================
// 4. РЕКОМЕНДАЦИИ
// ============================================
async function loadRecommendations() {
    await loadRecommendationsForHero();
}

// ============================================
// 5. СЛУЧАЙНОЕ АНИМЕ
// ============================================
async function randomAnime() {
    const resultContainer = document.getElementById('randomResult');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
        <div class="random-loading">
            <div class="random-spinner"></div>
            <span style="color:var(--text-muted);font-size:14px;margin-top:8px;">🌀 Ищем идеальное аниме...</span>
        </div>
    `;
    
    try {
        const items = await API.getRandomReleases(1);
        if (!items || !items.length) {
            resultContainer.innerHTML = `
                <div class="random-error">
                    <span style="font-size:48px;">😅</span>
                    <p style="color:var(--text-secondary);">Не удалось найти аниме</p>
                    <button onclick="randomAnime()" class="random-retry-btn">🔄 Попробовать снова</button>
                </div>
            `;
            return;
        }
        
        const anime = items[0];
        
        setTimeout(() => {
            resultContainer.innerHTML = renderRandomResult(anime);
            const card = resultContainer.querySelector('.random-result-card');
            if (card) card.classList.add('show');
        }, 300);
    } catch (e) {
        console.error('Ошибка:', e);
        resultContainer.innerHTML = `
            <div class="random-error">
                <span style="font-size:48px;">⚠️</span>
                <p>Ошибка загрузки</p>
                <button onclick="randomAnime()" class="random-retry-btn">🔄 Попробовать снова</button>
            </div>
        `;
    }
}

function renderRandomResult(anime) {
    const img = anime.images?.jpg?.image_url || '';
    const title = anime.title || 'Без названия';
    const year = anime.year || '--';
    const episodes = anime.episodes || '?';
    const age = anime.age_rating || '0+';
    const genres = (anime.genres || []).slice(0, 4).join(' • ');
    const synopsis = anime.synopsis || 'Описание отсутствует';
    const id = anime.id;
    const status = anime.status || 'Неизвестно';
    const ageColor = getAgeColor(age);
    
    return `
        <div class="random-result-card" onclick="openDetail('${id}')">
            <div class="random-result-poster">
                ${img ? `<img src="${img}" alt="${title}">` : '<div class="random-no-poster">🎬</div>'}
                <div class="random-result-badge" style="background:${ageColor};">${age}</div>
            </div>
            <div class="random-result-content">
                <div class="random-result-header">
                    <h3 class="random-result-title">${title}</h3>
                    <span class="random-result-year">${year}</span>
                </div>
                <div class="random-result-meta">
                    <span>📺 ${episodes} эп.</span>
                    <span>${status === 'Онгоинг' ? '🔄 Онгоинг' : '✅ Завершено'}</span>
                </div>
                ${genres ? `<div class="random-result-genres">${genres}</div>` : ''}
                <div class="random-result-synopsis">${synopsis.length > 120 ? synopsis.slice(0, 120) + '...' : synopsis}</div>
                <div class="random-result-actions">
                    <button class="random-result-btn primary" onclick="event.stopPropagation(); openDetail('${id}')">🎬 Смотреть</button>
                    <button class="random-result-btn secondary" onclick="event.stopPropagation(); randomAnime()">🎲 Другое</button>
                </div>
            </div>
        </div>
    `;
}

function getAgeColor(age) {
    const colors = { '0+': '#2ecc71', '6+': '#3498db', '12+': '#f1c40f', '16+': '#e67e22', '18+': '#e74c3c' };
    return colors[age] || '#6c5ce7';
}

async function randomAnimeByGenre(genreId) {
    const resultContainer = document.getElementById('randomResult');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
        <div class="random-loading">
            <div class="random-spinner"></div>
            <span style="color:var(--text-muted);font-size:14px;margin-top:8px;">🔍 Ищем в этом жанре...</span>
        </div>
    `;
    
    try {
        const result = await API.getByGenre(genreId, 1, 50);
        if (!result || !result.items || !result.items.length) {
            resultContainer.innerHTML = `
                <div class="random-error">
                    <span style="font-size:48px;">😅</span>
                    <p>В этом жанре пока ничего нет</p>
                    <button onclick="randomAnime()" class="random-retry-btn">🔄 Попробовать другое</button>
                </div>
            `;
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * result.items.length);
        const anime = result.items[randomIndex];
        
        setTimeout(() => {
            resultContainer.innerHTML = renderRandomResult(anime);
            const card = resultContainer.querySelector('.random-result-card');
            if (card) card.classList.add('show');
        }, 300);
    } catch (e) {
        console.error('Ошибка:', e);
        resultContainer.innerHTML = `
            <div class="random-error">
                <span style="font-size:48px;">⚠️</span>
                <p>Ошибка загрузки</p>
                <button onclick="randomAnime()" class="random-retry-btn">🔄 Попробовать снова</button>
            </div>
        `;
    }
}

// ============================================
// 6. АВТОДОПОЛНЕНИЕ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('catalogSearchInput');
    if (!searchInput) return;
    
    const autocompleteContainer = document.createElement('div');
    autocompleteContainer.className = 'search-autocomplete';
    autocompleteContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--bg-card);
        border-radius: var(--radius);
        border: 1px solid rgba(108,92,231,0.1);
        max-height: 300px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        backdrop-filter: blur(20px);
        box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        margin-top: 4px;
    `;
    
    const wrapper = searchInput.closest('.catalog-search-wrapper');
    if (wrapper) {
        wrapper.style.position = 'relative';
        wrapper.appendChild(autocompleteContainer);
    }
    
    let autocompleteTimeout = null;
    
    searchInput.addEventListener('input', function() {
        const value = this.value.trim();
        clearTimeout(autocompleteTimeout);
        autocompleteContainer.style.display = 'none';
        
        if (value.length < 2) return;
        
        autocompleteTimeout = setTimeout(async () => {
            try {
                const suggestions = await API.searchAutocomplete(value, 8);
                if (!suggestions.length) {
                    autocompleteContainer.style.display = 'none';
                    return;
                }
                
                let html = '';
                suggestions.forEach(item => {
                    html += `
                        <div class="autocomplete-item" onclick="selectSearchSuggestion('${item.id}')" style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.03);">
                            ${item.poster ? `<img src="${item.poster}" style="width:30px;height:40px;object-fit:cover;border-radius:4px;">` : '<span style="font-size:20px;width:30px;text-align:center;">🎬</span>'}
                            <div style="flex:1;">
                                <div style="font-weight:600;color:var(--text-primary);">${item.title}</div>
                                ${item.year ? `<div style="font-size:11px;color:var(--text-muted);">${item.year}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
                autocompleteContainer.innerHTML = html;
                autocompleteContainer.style.display = 'block';
            } catch(e) {}
        }, 300);
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.catalog-search-wrapper')) {
            autocompleteContainer.style.display = 'none';
        }
    });
});

function selectSearchSuggestion(id) {
    const autocomplete = document.querySelector('.search-autocomplete');
    if (autocomplete) autocomplete.style.display = 'none';
    openDetail(id);
}

// ============================================
// 7. ОТКРЫТЬ ДЕТАЛИ (С SHIKIMORI FALLBACK)
// ============================================
async function openDetail(id) {
    if (!id) {
        showToast('Ошибка ID', 'error');
        return;
    }
    
    previousPage = currentPage;
    navigate('detail');
    
    const titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = 'Загрузка...';
    
    try {
        const data = await API.getAnimeDetails(id);
        
        if (!data) {
            showToast('❌ Аниме не найдено', 'error');
            setTimeout(() => goBack(), 1500);
            return;
        }
        
        allData[id] = data;
        showDetail(data);
        
        // Shikimori fallback для названия
        const titleBad = !data.title 
            || data.title === 'Без названия' 
            || data.title.startsWith('anilibria_')
            || /^\d+$/.test(data.title);
        
        if (titleBad) {
            const searchQueries = [
                data.title_english,
                data.title_alternative,
                data.alias?.replace(/-/g, ' '),
                data._raw?.name?.english,
                data._raw?.name?.alternative
            ].filter(q => q && q.length > 2);
            
            for (const query of searchQueries) {
                const shiki = await API.getShikimoriTitle(query, data.year);
                
                if (shiki && shiki.titleRussian) {
                    data.title = shiki.titleRussian;
                    data.title_russian = shiki.titleRussian;
                    if (shiki.titleEnglish) data.title_english = shiki.titleEnglish;
                    if (shiki.description && (!data.synopsis || data.synopsis === 'Описание отсутствует')) {
                        data.synopsis = shiki.description;
                    }
                    if (shiki.poster && !data.images?.jpg?.image_url) {
                        data.images = { jpg: { image_url: shiki.poster } };
                    }
                    if (shiki.genres && shiki.genres.length > 0 && (!data.genres || data.genres.length === 0)) {
                        data.genres = shiki.genres;
                    }
                    
                    allData[id] = data;
                    showDetail(data);
                    break;
                }
            }
        }
    } catch (e) {
        console.error('❌ Ошибка:', e);
        if (allData[id]) showDetail(allData[id]);
    }
}

// ============================================
// 8. ПОКАЗАТЬ ДЕТАЛИ
// ============================================
function showDetail(anime) {
    if (!anime) return;
    
    const titleEl = document.getElementById('detailTitle');
    const engEl = document.getElementById('detailEng');
    const metaEl = document.getElementById('detailMeta');
    const descEl = document.getElementById('detailDesc');
    const posterEl = document.getElementById('detailPoster');
    const ageBadge = document.querySelector('.age-badge');
    const tagsEl = document.getElementById('detailTags');
    const favBtn = document.getElementById('favBtn');
    
    // Извлекаем название
    let displayTitle = 'Без названия';
    let engTitle = '';
    
    const possibleTitles = [
        anime.title,
        anime.title_russian,
        anime.russian,
        anime._raw?.name?.main,
        anime._raw?.name?.russian,
        anime._raw?.name,
        anime.name
    ];
    
    for (const t of possibleTitles) {
        if (t && typeof t === 'string' && t.length > 0 && !t.startsWith('anilibria_') && !/^\d+$/.test(t)) {
            displayTitle = t;
            break;
        }
        if (t && typeof t === 'object') {
            const objTitle = t.main || t.russian || t.english || t.alternative;
            if (objTitle) { displayTitle = objTitle; break; }
        }
    }
    
    if (anime.title_english) {
        engTitle = anime.title_english;
    } else if (anime._raw?.name?.english) {
        engTitle = anime._raw.name.english;
    }
    
    if (titleEl) titleEl.textContent = displayTitle;
    if (engEl) engEl.textContent = engTitle;
    if (metaEl) metaEl.textContent = `${anime.year || '--'} | ${anime.episodes || '?'} эп.`;
    if (descEl) descEl.textContent = anime.synopsis || anime.description || 'Описание отсутствует';
    
    const img = anime.images?.jpg?.image_url || '';
    if (posterEl) {
        posterEl.src = img;
        posterEl.style.display = img ? 'block' : 'none';
    }
    
    if (ageBadge) {
        const age = anime.age_rating || '0+';
        ageBadge.textContent = age;
        ageBadge.className = `age-badge age-${age.replace('+', '')}`;
    }
    
    if (tagsEl) {
        tagsEl.innerHTML = (anime.genres || []).map(g => `<span class="detail-tag">${g}</span>`).join('');
    }
    
    const user = DB.get('currentUser');
    const favs = user ? DB.getUserData(user.name, 'favorites', []) : [];
    const isFav = favs.indexOf(displayTitle) > -1;
    
    if (favBtn) {
        favBtn.textContent = isFav ? '❤️ В избранном' : '🤍 В избранное';
        favBtn.className = 'fav-btn' + (isFav ? ' active' : '');
        favBtn.onclick = () => toggleFav(displayTitle);
    }
    
    renderComments(displayTitle);
}

// ============================================
// 9. KODI МОДАЛЬНОЕ ОКНО
// ============================================
function openKodiModal() {
    let modal = document.getElementById('kodiModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'kodiModal';
        modal.className = 'modal';
        modal.onclick = function(e) {
            if (e.target === modal) modal.style.display = 'none';
        };
        modal.innerHTML = `
            <div class="modal-box" style="max-width:520px;">
                <button class="modal-close" onclick="document.getElementById('kodiModal').style.display='none'">
                    <svg width="24" height="24"><use href="icons/icons.svg#icon-close"/></svg>
                </button>
                <div class="modal-icon">🎞️</div>
                <h2>Kodi плеер</h2>
                <p>Смотрите аниме через бесплатное приложение Kodi с аддоном для аниме.</p>
                
                <div class="kodi-instruction">
                    <h3>📥 Как установить:</h3>
                    <ol>
                        <li>Скачайте Kodi с <a href="https://kodi.tv/download" target="_blank" rel="noopener">kodi.tv</a></li>
                        <li>Установите приложение на устройство</li>
                        <li>Откройте Kodi → Дополнения → Установить из репозитория</li>
                        <li>Найдите аддон для аниме (например, AniList)</li>
                        <li>Наслаждайтесь просмотром!</li>
                    </ol>
                </div>
                
                <div class="btn-row">
                    <a href="https://kodi.tv/download" target="_blank" rel="noopener" class="btn-primary" style="text-decoration:none;text-align:center;display:block;flex:1;padding:12px;">
                        📥 Скачать Kodi
                    </a>
                    <button class="btn-cancel" onclick="document.getElementById('kodiModal').style.display='none'">
                        Закрыть
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
}

// ============================================
// 10. КОММЕНТАРИИ
// ============================================
function renderComments(animeName) {
    const container = document.getElementById('commentsList');
    if (!container) return;
    fetch('/api/comments/' + encodeURIComponent(animeName))
        .then(res => res.json())
        .then(comments => {
            if (!comments || !comments.length) {
                container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">💬 Нет комментариев</div>';
                return;
            }
            const user = DB.get('currentUser');
            let html = '';
            comments.forEach(c => {
                const canDelete = user && c.user_name === user.name;
                html += `
                    <div class="comment-item">
                        <div class="c-user">${c.user_name}</div>
                        <div class="c-text">${c.text}</div>
                        <div class="c-date">${c.date}</div>
                        ${canDelete ? `<button class="c-delete-btn" onclick="deleteComment(${c.id})">✕</button>` : ''}
                    </div>
                `;
            });
            container.innerHTML = html;
        })
        .catch(() => {
            container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">⚠️ Ошибка</div>';
        });
}

function addComment() {
    const user = DB.get('currentUser');
    if (!user) { showToast('Войдите в аккаунт!', 'error'); return; }
    
    const input = document.getElementById('commentInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { showToast('Напишите что-нибудь!', 'warning'); return; }
    
    const title = document.getElementById('detailTitle').textContent;
    if (!title || title === 'Загрузка...') { showToast('Ошибка: аниме не загружено', 'error'); return; }
    
    fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anime: title, user_name: user.name, text: text })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            input.value = '';
            renderComments(title);
            addActivity(user.name, 'comment', 'Оставил комментарий к «' + title + '»');
            showToast('💬 Комментарий добавлен!', 'success');
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    })
    .catch(() => showToast('Ошибка сети', 'error'));
}

function deleteComment(id) {
    const user = DB.get('currentUser');
    if (!user) return;
    showConfirmModal('🗑️ Удалить комментарий', 'Вы уверены?', function() {
        fetch('/api/comments/' + id, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: user.name })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const title = document.getElementById('detailTitle').textContent;
                if (title) renderComments(title);
                showToast('🗑️ Комментарий удален', 'success');
            }
        });
    });
}

// ============================================
// 11. ИЗБРАННОЕ
// ============================================
function toggleFav(name) {
    const user = DB.get('currentUser');
    if (!user) { showToast('Войдите в аккаунт!', 'error'); return; }
    
    const favs = DB.getUserData(user.name, 'favorites', []);
    const idx = favs.indexOf(name);
    if (idx > -1) {
        favs.splice(idx, 1);
        showToast('Удалено из избранного', 'info');
    } else {
        favs.push(name);
        addActivity(user.name, 'favorite', 'Добавил в избранное «' + name + '»');
        showToast('Добавлено в избранное ❤️', 'success');
    }
    DB.setUserData(user.name, 'favorites', favs);
    DB.save();
    if (currentPage === 'favorites') renderFavorites();
}

function renderFavorites() {
    const user = DB.get('currentUser');
    const grid = document.getElementById('favGrid');
    if (!grid) return;
    if (!user) {
        grid.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>';
        return;
    }
    const favs = DB.getUserData(user.name, 'favorites', []);
    document.getElementById('favCount').textContent = favs.length + ' аниме';
    if (favs.length === 0) {
        grid.innerHTML = '<div class="empty-state"><span class="empty-icon">💔</span><p>Пусто</p></div>';
        return;
    }
    let html = '';
    favs.forEach((name, index) => {
        let img = '';
        const colors = ['#6c5ce7', '#fd79a8', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'];
        const color = colors[index % colors.length];
        for (const id in allData) {
            if (allData[id] && allData[id].title === name) {
                img = allData[id].images?.jpg?.image_url || '';
                break;
            }
        }
        html += `
            <div class="card" onclick="searchAndOpen('${name}')">
                <div class="card-img" style="${!img ? 'background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:40px;' : ''}">
                    ${img ? '<img src="' + img + '" loading="lazy">' : '❤️'}
                </div>
                <div class="card-body"><div class="title">${name}</div></div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

function searchAndOpen(name) {
    if (!name) return;
    navigate('home');
    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) {
        searchInput.value = name;
        const clearBtn = document.getElementById('catalogSearchClear');
        if (clearBtn) clearBtn.style.display = 'flex';
    }
    applyCatalogFilters();
}

// ============================================
// 12. ДОСТИЖЕНИЯ
// ============================================
function renderAchievements() {
    const user = DB.get('currentUser');
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;
    if (!user) {
        grid.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>';
        updateAchievementStats([], ACHIEVEMENTS_LIST.length);
        return;
    }
    const earned = DB.getAchievements(user.name);
    const total = ACHIEVEMENTS_LIST.length;
    const activeTitle = DB.getActiveTitle(user.name);
    updateAchievementStats(earned, total);
    
    let html = '';
    ACHIEVEMENTS_LIST.forEach(ach => {
        const isEarned = earned.indexOf(ach.id) !== -1;
        const isActive = activeTitle === ach.id;
        html += `
            <div class="ach-card ${isEarned ? 'earned' : 'locked'}">
                <div class="ach-icon">${ach.icon}</div>
                <div class="ach-name">${ach.name}</div>
                <div class="ach-desc">${ach.desc}</div>
                ${ach.title ? `<div class="ach-title">🎖️ Титул: ${ach.title}</div>` : ''}
                <div class="ach-status">${isEarned ? '✅ Получено' : '🔒 Закрыто'}</div>
                ${isEarned ? `<button class="ach-btn ${isActive ? 'active' : ''}" onclick="setActiveTitle('${ach.id}')">${isActive ? '✅ Активен' : '👑 Установить титул'}</button>` : ''}
            </div>
        `;
    });
    grid.innerHTML = html;
}

function updateAchievementStats(earned, total) {
    document.getElementById('achEarnedCount').textContent = earned.length;
    document.getElementById('achTotalCount').textContent = total;
    document.getElementById('achProgress').textContent = total > 0 ? Math.round((earned.length / total) * 100) + '%' : '0%';
    document.getElementById('achProgressFill').style.width = total > 0 ? (earned.length / total) * 100 + '%' : '0%';
}

function setActiveTitle(achId) {
    const user = DB.get('currentUser');
    if (!user) return;
    const earned = DB.getAchievements(user.name);
    if (earned.indexOf(achId) === -1) { showToast('❌ Достижение не получено!', 'error'); return; }
    DB.setActiveTitle(user.name, achId);
    renderAchievements();
    renderProfile();
    showToast('👑 Титул установлен!', 'success');
}

function showAchievementPopup(ach) {
    const popup = document.getElementById('achievementPopup');
    if (!popup) return;
    document.getElementById('popupIcon').textContent = ach.icon;
    document.getElementById('popupName').textContent = ach.name;
    document.getElementById('popupDesc').textContent = ach.desc;
    document.getElementById('popupBadge').textContent = '🎖️ ' + (ach.title || 'Новое достижение!');
    popup.classList.add('show');
    spawnConfetti();
    clearTimeout(window._popupTimer);
    window._popupTimer = setTimeout(() => { popup.classList.remove('show'); }, 5000);
}

function hidePopup() {
    document.getElementById('achievementPopup').classList.remove('show');
}

function spawnConfetti() {
    const container = document.getElementById('confetti');
    if (!container) return;
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#a29bfe', '#fd79a8'];
    let html = '';
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 100;
        const size = 4 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const duration = 1.5 + Math.random() * 2;
        const delay = Math.random() * 1.5;
        html += `<div style="position:absolute;left:${x}vw;top:-20px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};animation:confettiFall ${duration}s ease-out forwards;animation-delay:${delay}s;"></div>`;
    }
    container.innerHTML = html;
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// ============================================
// 13. ПРОФИЛЬ
// ============================================
function renderProfile() {
    const user = DB.get('currentUser');
    if (!user) { navigate('home'); return; }

    const profiles = DB.get('profiles', {});
    const profile = profiles[user.name] || { bio: '', avatar: '' };
    const onlineTime = DB.getUserData(user.name, 'onlineTime', 0);
    const favs = DB.getUserData(user.name, 'favorites', []);
    const earned = DB.getAchievements(user.name);
    
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = '📧 ' + user.email;
    document.getElementById('profileBio').textContent = profile.bio || 'Нажмите чтобы добавить описание';
    document.getElementById('profileJoinDate').textContent = 'Присоединился: ' + (user.created_at || 'недавно');
    
    const xp = calculateXP(user.name);
    const level = Math.floor(xp / 100);
    const nextLevelXp = (level + 1) * 100;
    const progress = Math.min((xp % 100) / 100 * 100, 100);
    
    document.getElementById('profileLevelBadge').textContent = 'Lv.' + level;
    document.getElementById('profileXpFill').style.width = progress + '%';
    document.getElementById('profileXpText').textContent = Math.floor(xp % 100) + ' / ' + nextLevelXp + ' XP';
    
    const lastSeen = DB.getUserData(user.name, 'lastSeen', 0);
    const isOnline = (Date.now() - lastSeen) < 300000;
    const dot = document.getElementById('profileStatusDot');
    if (dot) dot.className = 'avatar-status ' + (isOnline ? 'online' : 'offline');
    document.getElementById('profileStatus').textContent = isOnline ? '🟢 В сети' : '🔴 Не в сети';
    
    const img = document.getElementById('avatarImg');
    const letter = document.getElementById('avatarLetter');
    let avatarFound = false;
    
    if (profile.avatar && profile.avatar.length > 100) {
        img.src = profile.avatar;
        img.style.display = 'block';
        if (letter) letter.style.display = 'none';
        avatarFound = true;
    }
    
    if (!avatarFound) {
        const backupAvatar = localStorage.getItem('avatar_' + user.name);
        if (backupAvatar && backupAvatar.length > 100) {
            img.src = backupAvatar;
            img.style.display = 'block';
            if (letter) letter.style.display = 'none';
            if (!profiles[user.name]) profiles[user.name] = {};
            profiles[user.name].avatar = backupAvatar;
            DB.set('profiles', profiles);
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
    
    document.getElementById('statFav').textContent = favs.length;
    document.getElementById('statComments').textContent = getCommentCount(user.name);
    document.getElementById('statAchievements').textContent = earned.length;
    document.getElementById('statTime').textContent = formatTime(onlineTime);
    
    const activeTitle = DB.getActiveTitle(user.name);
    const titleBadge = document.getElementById('profileTitle');
    if (titleBadge && activeTitle) {
        const ach = ACHIEVEMENTS_LIST.find(a => a.id === activeTitle);
        if (ach) {
            titleBadge.textContent = '🎖️ ' + ach.title;
            titleBadge.style.display = 'inline';
        } else {
            titleBadge.style.display = 'none';
        }
    } else if (titleBadge) {
        titleBadge.style.display = 'none';
    }
    
    renderProfileAchievements(user.name);
    renderContinueWatching(user.name);
    renderActivityFeed(user.name);
    renderGenreStats(user.name);
    renderTopUsers();
}

function calculateXP(user) {
    const favs = DB.getUserData(user, 'favorites', []);
    const comments = getCommentCount(user);
    const achievements = DB.getAchievements(user);
    const onlineTime = DB.getUserData(user, 'onlineTime', 0);
    return favs.length * 10 + comments * 5 + achievements.length * 20 + Math.floor(onlineTime / 60);
}

function getCommentCount(user) {
    const allComments = DB.get('comments', {});
    let count = 0;
    for (const key in allComments) {
        allComments[key].forEach(function(c) {
            if (c.user === user) count++;
        });
    }
    return count;
}

function renderContinueWatching(user) {
    const grid = document.getElementById('continueGrid');
    const count = document.getElementById('continueCount');
    if (!grid) return;
    
    const watching = DB.getUserData(user, 'continueWatching', {});
    const entries = Object.entries(watching);
    
    if (count) count.textContent = entries.length;
    
    if (entries.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:12px;width:100%;">Нет сохранённых серий</div>';
        return;
    }
    
    let html = '';
    entries.slice(0, 6).forEach(([anime, data]) => {
        const progress = data.episode ? (data.episode / (data.total || 1)) * 100 : 0;
        const img = getPosterForAnime(anime);
        
        html += `
            <div class="continue-card" onclick="searchAndOpen('${anime}')">
                ${img ? `<img src="${img}" alt="${anime}">` : `<div style="width:60px;height:80px;background:#333;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">🎬</div>`}
                <div class="continue-info">
                    <h4>${anime}</h4>
                    <div class="meta">Серия ${data.episode || 1}${data.total ? ' / ' + data.total : ''}</div>
                    <div class="continue-progress">
                        <div class="fill" style="width:${Math.min(progress, 100)}%"></div>
                    </div>
                    <span class="continue-time">${data.timestamp ? formatTimeAgo(data.timestamp) : 'Недавно'}</span>
                </div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
}

function renderActivityFeed(user) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    
    const activities = DB.getUserData(user, 'activities', []);
    
    if (activities.length === 0) {
        feed.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:12px;">Активность появится здесь</div>';
        return;
    }
    
    const icons = { 'watch': '▶️', 'favorite': '❤️', 'comment': '💬', 'achievement': '🏆', 'login': '🌐' };
    
    let html = '';
    activities.slice(0, 10).forEach(act => {
        const icon = icons[act.type] || '📌';
        const time = act.timestamp ? formatTimeAgo(act.timestamp) : 'Недавно';
        html += `
            <div class="activity-item">
                <span class="activity-icon">${icon}</span>
                <span class="activity-text">${act.text}</span>
                <span class="activity-time">${time}</span>
            </div>
        `;
    });
    
    feed.innerHTML = html;
}

function renderGenreStats(user) {
    const container = document.getElementById('genreStats');
    if (!container) return;
    
    const favs = DB.getUserData(user, 'favorites', []);
    const genreCount = {};
    const genreColors = {
        'Экшен': '#e74c3c', 'Приключения': '#e67e22', 'Комедия': '#f1c40f',
        'Драма': '#8e44ad', 'Фэнтези': '#3498db', 'Романтика': '#e84393',
        'Научная фантастика': '#00b894', 'Повседневность': '#636e72'
    };
    
    favs.forEach(name => {
        for (const id in allData) {
            if (allData[id] && allData[id].title === name) {
                const genres = allData[id].genres || [];
                genres.forEach(g => { genreCount[g] = (genreCount[g] || 0) + 1; });
                break;
            }
        }
    });
    
    const sorted = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    
    if (sorted.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:12px;">Нет данных</div>';
        return;
    }
    
    let html = '';
    sorted.forEach(([genre, count]) => {
        const color = genreColors[genre] || '#6c5ce7';
        html += `<span class="genre-tag" style="border-color:${color}40;background:${color}10;">${genre}<span class="count">${count}</span></span>`;
    });
    
    container.innerHTML = html;
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'только что';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' мин назад';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' ч назад';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' дн назад';
    return new Date(timestamp).toLocaleDateString();
}

function getPosterForAnime(name) {
    for (const id in allData) {
        if (allData[id] && allData[id].title === name) {
            return allData[id].images?.jpg?.image_url || '';
        }
    }
    return '';
}

function changeBanner() {
    const colors = [
        'linear-gradient(135deg, #1a1a3e, #2d1b69, #6c5ce7)',
        'linear-gradient(135deg, #0c0c1e, #1a0a2e, #4a2b7a)',
        'linear-gradient(135deg, #1a0a0a, #3d1a1a, #7a2b2b)',
        'linear-gradient(135deg, #0a1a0a, #1a3d1a, #2b7a4a)'
    ];
    document.getElementById('profileBanner').style.background = colors[Math.floor(Math.random() * colors.length)];
    showToast('🎨 Баннер обновлён!', 'success');
}

function addActivity(user, type, text) {
    const activities = DB.getUserData(user, 'activities', []);
    activities.unshift({ type, text, timestamp: Date.now() });
    if (activities.length > 50) activities.pop();
    DB.setUserData(user, 'activities', activities);
    DB.save();
}

function saveContinueWatching(user, anime, episode, total) {
    const watching = DB.getUserData(user, 'continueWatching', {});
    watching[anime] = { episode, total: total || 0, timestamp: Date.now() };
    DB.setUserData(user, 'continueWatching', watching);
    DB.save();
}

function renderProfileAchievements(user) {
    const grid = document.getElementById('profileAchievementsGrid');
    if (!grid) return;
    const earned = DB.getAchievements(user);
    const recent = earned.slice(-3).reverse();
    if (recent.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:12px;">Нет достижений</div>';
        return;
    }
    let html = '';
    recent.forEach(id => {
        const ach = ACHIEVEMENTS_LIST.find(a => a.id === id);
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
// 14. ТОП ПОЛЬЗОВАТЕЛЕЙ
// ============================================
function renderTopUsers() {
    const container = document.getElementById('topUsers');
    if (!container) return;

    const users = DB.get('users', {});
    const data = {};

    for (const u in users) {
        const onlineTime = DB.getUserData(u, 'onlineTime', 0);
        const lastSeen = DB.getUserData(u, 'lastSeen', 0);
        const favs = DB.getUserData(u, 'favorites', []);
        const comments = getCommentCount(u);
        const earned = DB.getAchievements(u);
        const activeTitle = DB.getActiveTitle(u);
        
        let titleName = '';
        if (activeTitle) {
            const ach = ACHIEVEMENTS_LIST.find(function(a) { return a.id === activeTitle; });
            if (ach) titleName = ach.title;
        }
        
        const xp = favs.length * 10 + comments * 5 + earned.length * 20 + Math.floor(onlineTime / 60);
        data[u] = {
            name: u, favs: favs.length, comments, achievements: earned.length,
            onlineTime, xp, title: titleName,
            isOnline: (Date.now() - lastSeen) < 300000
        };
    }

    const sorted = Object.values(data).sort((a, b) => b.xp - a.xp).slice(0, 20);

    if (sorted.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:30px;"><span style="font-size:48px;display:block;">👑</span><p>Нет пользователей</p></div>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const avatarGradients = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 
                           'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6',
                           'avatar-gradient-7', 'avatar-gradient-8', 'avatar-gradient-9', 'avatar-gradient-10'];

    let html = `
        <div class="top-users-wrapper">
            <div class="top-users-header">
                <h3>👑 Топ пользователей</h3>
                <span class="top-update-time">🔄 ${new Date().toLocaleTimeString()}</span>
            </div>
            <div style="overflow-x:auto;">
                <table class="top-users-table">
                    <thead><tr><th>#</th><th>Пользователь</th><th class="hide-mobile">📚</th><th class="hide-mobile">💬</th><th>🏆</th><th>⏱</th><th>⭐ XP</th></tr></thead>
                    <tbody>
    `;

    const maxXP = sorted[0].xp || 1;
    sorted.forEach(function(user, index) {
        const rankClass = index < 3 ? 'rank-' + (index + 1) : '';
        const medal = index < 10 ? medals[index] : '#' + (index + 1);
        const avatarGrad = avatarGradients[index % avatarGradients.length];
        const xpPercent = Math.min((user.xp / maxXP) * 100, 100);
        
        html += `
            <tr class="${rankClass}">
                <td class="rank-cell">${medal}</td>
                <td>
                    <div class="user-info-cell">
                        <div class="user-avatar-mini ${avatarGrad}">${user.name[0].toUpperCase()}</div>
                        <div>
                            <div class="user-name-cell">${user.name} <span style="font-size:11px;color:${user.isOnline ? '#2ecc71' : '#666'};">${user.isOnline ? '🟢' : '🟡'}</span></div>
                            ${user.title ? `<div class="user-title-cell">🎖️ ${user.title}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="stat-cell hide-mobile"><span class="stat-number">${user.favs}</span></td>
                <td class="stat-cell hide-mobile"><span class="stat-number">${user.comments}</span></td>
                <td class="stat-cell"><span class="stat-number">${user.achievements}</span></td>
                <td class="time-cell"><div class="time-value">${formatTime(user.onlineTime)}</div></td>
                <td>
                    <div class="xp-bar-wrapper">
                        <div class="xp-bar-bg"><div class="xp-bar-fill" style="width:${xpPercent}%;"></div></div>
                        <div class="xp-text">${user.xp} XP</div>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

// ============================================
// 15. АВАТАР
// ============================================
function uploadAvatar(input) {
    if (!input || !input.files || input.files.length === 0) { showToast('Выберите файл!', 'error'); return; }
    const user = DB.get('currentUser');
    if (!user) { showToast('Войдите в аккаунт!', 'error'); return; }
    const file = input.files[0];
    if (file.size > 20 * 1024 * 1024) { showToast('Файл слишком большой! Максимум 20MB', 'error'); return; }
    showToast('⏳ Загрузка...', 'info');
    const reader = new FileReader();
    reader.onload = function(e) {
        const avatarData = e.target.result;
        const profiles = DB.get('profiles', {});
        if (!profiles[user.name]) profiles[user.name] = {};
        profiles[user.name].avatar = avatarData;
        DB.set('profiles', profiles);
        localStorage.setItem('avatar_' + user.name, avatarData);
        DB.save();
        const img = document.getElementById('avatarImg');
        const letter = document.getElementById('avatarLetter');
        if (img) { img.src = avatarData; img.style.display = 'block'; }
        if (letter) letter.style.display = 'none';
        showToast('✅ Аватар обновлен!', 'success');
    };
    reader.readAsDataURL(file);
}

// ============================================
// 16. TOAST
// ============================================
function showToast(message, type) {
    const old = document.querySelector('.toast-message');
    if (old) old.remove();
    const colors = { success: '#2ecc71', error: '#e74c3c', warning: '#f39c12', info: 'rgba(20,20,50,0.95)' };
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
        background: ${colors[type] || colors.info}; color: #fff; padding: 14px 28px;
        border-radius: 14px; font-weight: 600; z-index: 99999; max-width: 90%;
        text-align: center; border: 1px solid rgba(108,92,231,0.2);
        backdrop-filter: blur(20px); font-size: 14px;
        animation: fadeInUp 0.4s ease forwards; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    }, 3000);
}

// ============================================
// 17. МОДАЛЬНЫЕ ОКНА
// ============================================
function showConfirmModal(title, text, callback, icon) {
    const modal = document.getElementById('confirmModal');
    if (!modal) return;
    document.getElementById('confirmTitle').textContent = title || 'Подтверждение';
    document.getElementById('confirmText').textContent = text || 'Вы уверены?';
    document.getElementById('confirmIcon').textContent = icon || '⚠️';
    document.getElementById('confirmOkBtn').onclick = function() {
        closeModal('confirmModal');
        if (callback) callback();
    };
    modal.style.display = 'flex';
}

function deleteAccount() {
    if (!DB.get('currentUser')) { showToast('Войдите в аккаунт!', 'error'); return; }
    if (confirm('Вы уверены, что хотите удалить аккаунт?')) {
        const user = DB.get('currentUser');
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/delete-account');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            DB.set('currentUser', null);
            localStorage.removeItem('onika_currentUser');
            localStorage.removeItem('onika_data');
            updateUI();
            navigate('home');
            showToast('✅ Аккаунт удален', 'success');
            if (typeof stopOnlineTracking === 'function') stopOnlineTracking();
            setTimeout(() => { location.reload(); }, 500);
        };
        xhr.send(JSON.stringify({ userId: user.id }));
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(function(modal) {
            if (modal.style.display === 'flex') modal.style.display = 'none';
        });
    }
});

// ============================================
// 18. РЕДАКТИРОВАНИЕ ПРОФИЛЯ
// ============================================
function editProfile(type) {
    const user = DB.get('currentUser');
    if (!user) { showToast('Войдите в аккаунт!', 'error'); return; }
    window._editType = type;
    const input = document.getElementById('editInput');
    const textarea = document.getElementById('editTextarea');
    const title = document.getElementById('editTitle');
    if (!input || !textarea || !title) return;
    input.style.display = type === 'bio' ? 'none' : 'block';
    textarea.style.display = type === 'bio' ? 'block' : 'none';
    if (type === 'name') {
        title.textContent = '✏️ Изменить никнейм';
        input.value = user.name;
        input.type = 'text';
    } else if (type === 'email') {
        title.textContent = '✏️ Изменить email';
        input.value = user.email;
        input.type = 'email';
    } else if (type === 'pass') {
        title.textContent = '🔑 Изменить пароль';
        input.value = '';
        input.type = 'password';
    } else if (type === 'bio') {
        title.textContent = '📝 Изменить описание';
        const profiles = DB.get('profiles', {});
        textarea.value = (profiles[user.name] && profiles[user.name].bio) || '';
    }
    document.getElementById('editModal').style.display = 'flex';
}

function saveEdit() {
    const user = DB.get('currentUser');
    if (!user) return;
    const input = document.getElementById('editInput');
    const textarea = document.getElementById('editTextarea');
    const type = window._editType || 'bio';
    const val = type === 'bio' ? textarea.value.trim() : input.value.trim();
    if (!val) { showToast('Поле не может быть пустым!', 'error'); return; }
    
    if (type === 'name') {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/update-name');
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    const oldName = user.name;
                    user.name = val;
                    localStorage.setItem('onika_currentUser', JSON.stringify(user));
                    DB._data.currentUser = user;
                    if (DB._data.favorites[oldName]) { DB._data.favorites[val] = DB._data.favorites[oldName]; delete DB._data.favorites[oldName]; }
                    if (DB._data.achievements[oldName]) { DB._data.achievements[val] = DB._data.achievements[oldName]; delete DB._data.achievements[oldName]; }
                    if (DB._data.activeTitle[oldName]) { DB._data.activeTitle[val] = DB._data.activeTitle[oldName]; delete DB._data.activeTitle[oldName]; }
                    if (DB._data.profiles[oldName]) { DB._data.profiles[val] = DB._data.profiles[oldName]; delete DB._data.profiles[oldName]; }
                    DB.save();
                    closeModal('editModal');
                    renderProfile();
                    updateUI();
                    showToast('✅ Никнейм изменен на ' + val, 'success');
                } else {
                    showToast(data.error || 'Ошибка', 'error');
                }
            } catch(e) { showToast('Ошибка сервера', 'error'); }
        };
        xhr.send(JSON.stringify({ userId: user.id, newName: val }));
    } else if (type === 'bio') {
        const profiles = DB.get('profiles', {});
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
// 19. ВОССТАНОВЛЕНИЕ ДАННЫХ
// ============================================
function restoreAllData() {
    const user = DB.get('currentUser');
    if (!user) return;
    const backupFavs = localStorage.getItem('favorites_' + user.name);
    if (backupFavs) {
        try {
            const parsed = JSON.parse(backupFavs);
            if (parsed && parsed.length > 0) {
                const currentFavs = DB.getUserData(user.name, 'favorites', []);
                if (currentFavs.length === 0) DB.setUserData(user.name, 'favorites', parsed);
            }
        } catch(e) {}
    }
    DB.save();
}

// ============================================
// 20. ЖИВАЯ СТАТИСТИКА СОЦСЕТЕЙ
// ============================================
function updateSocialStats() {
    const tgElement = document.getElementById('tgStats');
    if (tgElement) tgElement.textContent = '👥 ' + formatNumber(1200 + Math.floor(Math.random() * 30)) + ' подписчиков';
    const vkElement = document.getElementById('vkStats');
    if (vkElement) vkElement.textContent = '👥 ' + formatNumber(856 + Math.floor(Math.random() * 20)) + ' подписчиков';
    const ttElement = document.getElementById('ttStats');
    if (ttElement) ttElement.textContent = '👥 ' + formatNumber(2400 + Math.floor(Math.random() * 50)) + ' подписчиков';
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateSocialStats, 1000);
    setInterval(updateSocialStats, 30000);
});

// ============================================
// 21. МОИ КОММЕНТАРИИ
// ============================================
function renderMyComments() {
    const user = DB.get('currentUser');
    const container = document.getElementById('myCommentsList');
    if (!container) return;
    if (!user) { container.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>'; return; }
    
    fetch('/api/comments/all')
        .then(res => res.json())
        .then(comments => {
            const myComments = comments.filter(c => c.user_name === user.name);
            document.getElementById('myCommentsCount').textContent = myComments.length + ' комментариев';
            if (myComments.length === 0) {
                container.innerHTML = '<div class="empty-state"><span class="empty-icon">💬</span><p>У вас нет комментариев</p></div>';
                return;
            }
            let html = '';
            myComments.forEach(c => {
                html += `
                    <div class="my-comment-item">
                        <div class="my-comment-header">
                            <span class="my-comment-anime" onclick="searchAndOpen('${c.anime}')">📺 ${c.anime}</span>
                            <span style="font-size:11px;color:var(--text-muted);">${c.date}</span>
                        </div>
                        <div class="my-comment-text">${c.text}</div>
                    </div>
                `;
            });
            container.innerHTML = html;
        })
        .catch(() => {
            container.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><p>Ошибка загрузки</p></div>';
        });
}

// ============================================
// 22. ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 OnikaAnime загружается...');
    restoreAllData();
    updateUI();
    navigate('home');
    
    const user = DB.get('currentUser');
    if (user) startOnlineTracking();
    console.log('✅ OnikaAnime готов!');
});

// ============================================
// 23. ЭКСПОРТ
// ============================================
window.openDetail = openDetail;
window.navigate = navigate;
window.goBack = goBack;
window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.showLoginModal = showLoginModal;
window.logout = logout;
window.deleteAccount = deleteAccount;
window.editProfile = editProfile;
window.saveEdit = saveEdit;
window.toggleFav = toggleFav;
window.addComment = addComment;
window.deleteComment = deleteComment;
window.renderFavorites = renderFavorites;
window.renderAchievements = renderAchievements;
window.renderProfile = renderProfile;
window.renderMyComments = renderMyComments;
window.loadCatalog = loadCatalog;
window.loadRecommendations = loadRecommendations;
window.randomAnime = randomAnime;
window.applyCatalogFilters = applyCatalogFilters;
window.resetCatalogFilters = resetCatalogFilters;
window.loadMoreCatalog = loadMoreCatalog;
window.scrollToTop = scrollToTop;
window.closeModal = closeModal;
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;
window.formatNumber = formatNumber;
window.formatTime = formatTime;
window.formatFullTime = formatFullTime;
window.uploadAvatar = uploadAvatar;
window.updateSocialStats = updateSocialStats;
window.searchAndOpen = searchAndOpen;
window.toggleCategory = toggleCategory;
window.clearCatalogSearch = clearCatalogSearch;
window.toggleFilterPanel = toggleFilterPanel;
window.setGenre = setGenre;
window.slideHero = slideHero;
window.goToHeroSlide = goToHeroSlide;
window.randomAnimeByGenre = randomAnimeByGenre;
window.changeBanner = changeBanner;
window.addActivity = addActivity;
window.saveContinueWatching = saveContinueWatching;
window.openKodiModal = openKodiModal;

console.log('✅ OnikaAnime полностью загружен!');

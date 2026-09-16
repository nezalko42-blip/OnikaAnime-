// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME
// SHIKIMORI + 3D КАРУСЕЛЬ + ИЗБРАННОЕ v2.0 + КОММЕНТАРИИ v2.0 + ДОСТИЖЕНИЯ v2.0 + ПРОФИЛЬ v2.0 + МЕНЮ v2.0 + АНИМЕ v2.1
// ============================================

const allData = {};
let currentPage = 'home';
let previousPage = null;
let page = 1;
let genre = '';
let query = '';
let totalCount = 0;
let allItems = [];
let onlineTimer = null;
let startTime = Date.now();
let isLoading = false;
let isAllLoaded = false;
let searchTimeout = null;
let heroSliderData = [];
let heroCurrentSlide = 0;
let heroAutoSlideTimer = null;

const CATALOG_LIMIT = 12;

// ===== ГЛОБАЛЬНЫЕ ФЛАГИ ДЛЯ МОИХ КОММЕНТАРИЕВ =====
let mcMassMode = false;
let mcGroupMode = false;
let mcSelectedIds = new Set();
let myCommentsAll = [];
let myCommentsFiltered = [];

// ===== СОРТИРОВКА ДОСТИЖЕНИЙ =====
let achCurrentSort = 'rarity_desc';

const RARITY_ORDER = { legendary: 4, epic: 3, rare: 2, common: 1 };
const RARITY_LABELS = {
    common: '⚪ Обычное',
    rare: '🔵 Редкое',
    epic: '🟣 Эпическое',
    legendary: '🟡 Легендарное'
};

// ===== ДОСТИЖЕНИЯ С РЕДКОСТЬЮ v2.0 =====
const ACHIEVEMENTS_LIST = [
    { id: 'ep100', name: '🎬 Зритель 1 уровня', desc: 'Посмотреть 100 серий', icon: '🎬', title: 'Зритель',
      rarity: 'common', category: 'viewer', target: 100, metric: 'episodes' },
    { id: 'ep200', name: '🎬 Зритель 2 уровня', desc: 'Посмотреть 200 серий', icon: '🎥', title: 'Любопытный',
      rarity: 'common', category: 'viewer', target: 200, metric: 'episodes' },
    { id: 'ep500', name: '🎬 Зритель 3 уровня', desc: 'Посмотреть 500 серий', icon: '📺', title: 'Заядлый',
      rarity: 'rare', category: 'viewer', target: 500, metric: 'episodes' },
    { id: 'ep750', name: '🎬 Зритель 4 уровня', desc: 'Посмотреть 750 серий', icon: '🌟', title: 'Эксперт',
      rarity: 'epic', category: 'viewer', target: 750, metric: 'episodes' },
    { id: 'ep1000', name: '🎬 Зритель 5 уровня', desc: 'Посмотреть 1000 серий', icon: '🏆', title: 'Легенда',
      rarity: 'legendary', category: 'viewer', target: 1000, metric: 'episodes' },
    { id: 'cm100', name: '💬 Комментатор 1 уровня', desc: 'Оставить 100 комментариев', icon: '💬', title: 'Говорун',
      rarity: 'common', category: 'commenter', target: 100, metric: 'comments' },
    { id: 'cm200', name: '💬 Комментатор 2 уровня', desc: 'Оставить 200 комментариев', icon: '🗣️', title: 'Собеседник',
      rarity: 'common', category: 'commenter', target: 200, metric: 'comments' },
    { id: 'cm500', name: '💬 Комментатор 3 уровня', desc: 'Оставить 500 комментариев', icon: '🎙️', title: 'Оратор',
      rarity: 'rare', category: 'commenter', target: 500, metric: 'comments' },
    { id: 'cm750', name: '💬 Комментатор 4 уровня', desc: 'Оставить 750 комментариев', icon: '📢', title: 'Мастер слова',
      rarity: 'epic', category: 'commenter', target: 750, metric: 'comments' },
    { id: 'cm1000', name: '💬 Комментатор 5 уровня', desc: 'Оставить 1000 комментариев', icon: '👑', title: 'Глашатай',
      rarity: 'legendary', category: 'commenter', target: 1000, metric: 'comments' },
    { id: 'fv100', name: '❤️ Коллекционер 1 уровня', desc: 'Добавить 100 аниме в избранное', icon: '❤️', title: 'Коллекционер',
      rarity: 'common', category: 'collector', target: 100, metric: 'favorites' },
    { id: 'fv200', name: '❤️ Коллекционер 2 уровня', desc: 'Добавить 200 аниме в избранное', icon: '💝', title: 'Ценитель',
      rarity: 'common', category: 'collector', target: 200, metric: 'favorites' },
    { id: 'fv500', name: '❤️ Коллекционер 3 уровня', desc: 'Добавить 500 аниме в избранное', icon: '💎', title: 'Знаток',
      rarity: 'rare', category: 'collector', target: 500, metric: 'favorites' },
    { id: 'fv750', name: '❤️ Коллекционер 4 уровня', desc: 'Добавить 750 аниме в избранное', icon: '👑', title: 'Библиофил',
      rarity: 'epic', category: 'collector', target: 750, metric: 'favorites' },
    { id: 'fv1000', name: '❤️ Коллекционер 5 уровня', desc: 'Добавить 1000 аниме в избранное', icon: '🏆', title: 'Хранитель',
      rarity: 'legendary', category: 'collector', target: 1000, metric: 'favorites' }
];

// ===== ЦВЕТА ДЛЯ ЖАНРОВ =====
function getGenreColor(genre) {
    const colorMap = {
        'Экшен': '#ff2d78',
        'Приключения': '#f39c12',
        'Комедия': '#f1c40f',
        'Драма': '#8e44ad',
        'Фэнтези': '#3498db',
        'Романтика': '#e84393',
        'Фантастика': '#00b894',
        'Повседневность': '#636e72',
        'Триллер': '#c0392b',
        'Ужасы': '#6c5ce7',
        'Спорт': '#e67e22',
        'Музыка': '#00cec9',
        'Меха': '#4d8aff',
        'Сёдзё': '#fd79a8',
        'Сёнэн': '#0096ff',
        'Игра': '#a29bfe',
        'Мистика': '#b44aff',
        'Детектив': '#00f5ff'
    };
    return colorMap[genre] || '#6c5ce7';
}

// ============================================
// НАВИГАЦИЯ
// ============================================
function navigate(pageName) {
    currentPage = pageName;

    document.body.setAttribute('data-page', pageName);

    const pages = ['home', 'detail', 'favorites', 'achievements', 'mycomments', 'profile', 'settings'];

    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if (el) el.style.display = p === pageName ? 'block' : 'none';
    });

    document.querySelectorAll('.sidebar-nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.page === pageName);
    });

    if (pageName === 'home') {
        loadRecommendationsForHero();
        loadCatalog();
        resetCatalogFiltersSilent();
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
// UI — ОБНОВЛЁННОЕ МЕНЮ v2.0
// ============================================
function updateUI() {
    const user = DB.get('currentUser');
    const nav = document.getElementById('sidebarNav');
    const footer = document.getElementById('sidebarFooter');

    if (!nav || !footer) return;

    if (user) {
        const favs = DB.getUserData(user.name, 'favorites', []);
        const favCount = favs.length;

        const commentCount = (window._myCommentsCache && window._myCommentsCache.user === user.name)
            ? window._myCommentsCache.count
            : 0;

        const xp = calculateXP(user.name);
        const level = Math.floor(xp / 100);
        const xpProgress = Math.min((xp % 100), 100);

        const profiles = DB.get('profiles', {});
        const profile = profiles[user.name] || {};
        const avatarData = profile.avatar || localStorage.getItem('avatar_' + user.name) || '';
        const letter = user.name[0].toUpperCase();

        const avatarHtml = avatarData && avatarData.length > 100
            ? `<img src="${avatarData}" alt="${user.name}">`
            : `<span>${letter}</span>`;

        nav.innerHTML = `
            <a data-page="home" onclick="navigate('home'); closeMenu();">
                <span class="icon">🏠</span>
                <span>Главная</span>
            </a>
            <a data-page="favorites" onclick="navigate('favorites'); closeMenu();">
                <span class="icon">❤️</span>
                <span>Избранное</span>
                ${favCount > 0 ? `<span class="sidebar-badge">${favCount > 99 ? '99+' : favCount}</span>` : ''}
            </a>
            <a data-page="mycomments" onclick="navigate('mycomments'); closeMenu();">
                <span class="icon">💬</span>
                <span>Мои комментарии</span>
                ${commentCount > 0 ? `<span class="sidebar-badge">${commentCount > 99 ? '99+' : commentCount}</span>` : ''}
            </a>
            <a data-page="achievements" onclick="navigate('achievements'); closeMenu();">
                <span class="icon">🏆</span>
                <span>Достижения</span>
            </a>
            <a data-page="profile" onclick="navigate('profile'); closeMenu();">
                <span class="icon">👤</span>
                <span>Профиль</span>
            </a>
            <a data-page="settings" onclick="navigate('settings'); closeMenu();">
                <span class="icon">⚙️</span>
                <span>Настройки</span>
            </a>
        `;

        footer.innerHTML = `
            <div class="sidebar-user-card" onclick="navigate('profile'); closeMenu();">
                <div class="sidebar-user-avatar">${avatarHtml}</div>
                <div class="sidebar-user-info-block">
                    <div class="sidebar-user-name">${user.name}</div>
                    <div class="sidebar-user-level">Lv.${level}</div>
                    <div class="sidebar-user-xp">
                        <div class="sidebar-user-xp-fill" style="width:${xpProgress}%"></div>
                    </div>
                </div>
            </div>
            <button class="sidebar-logout-btn" onclick="event.stopPropagation(); logout();">
                <span class="logout-icon">🚪</span>
                <span>Выйти</span>
            </button>
        `;

        const activeLink = nav.querySelector(`a[data-page="${currentPage}"]`);
        if (activeLink) activeLink.classList.add('active');
    } else {
        nav.innerHTML = `
            <a class="active" data-page="home" onclick="navigate('home'); closeMenu();">
                <span class="icon">🏠</span>
                <span>Главная</span>
            </a>
        `;
        footer.innerHTML = `
            <button class="sidebar-login-btn" onclick="showLoginModal(); closeMenu();">
                <span>🚀</span>
                <span>Войти в аккаунт</span>
            </button>
        `;
    }
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    const isOpen = sidebar.classList.contains('open');

    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }
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
        if (!userNow) { clearInterval(onlineTimer); return; }
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
    if (onlineTimer) { clearInterval(onlineTimer); onlineTimer = null; }
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
// ХЕДЕР ПРИ СКРОЛЛЕ
// ============================================
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (header) {
        header.classList.toggle('scrolled', window.scrollY > 50);
    }
});

// ============================================
// 1. КАРУСЕЛЬ РЕКОМЕНДАЦИЙ (3D)
// ============================================
async function loadRecommendationsForHero() {
    try {
        const recs = await API.getRecommended(7);

        if (recs && recs.length > 0) {
            heroSliderData = recs;
            renderHeroSlider(recs);
            startHeroAutoSlide();
            console.log('🎲 Загружено', recs.length, 'рекомендаций');
        }
    } catch (e) {
        console.error('Ошибка загрузки рекомендаций:', e);
    }
}

function renderHeroSlider(items) {
    const track = document.getElementById('heroSlider');
    const dots = document.getElementById('heroDots');
    if (!track) return;

    const limitedItems = items.slice(0, 7);

    heroSliderData = limitedItems;
    heroCurrentSlide = 0;

    let cardsHtml = '';
    limitedItems.forEach((item, index) => {
        const img = item.images?.jpg?.image_url || '';
        const title = item.title || 'Без названия';
        const year = item.year || '';
        const episodes = item.episodes || '?';
        const age = item.age_rating || '0+';
        const id = item.id;

        cardsHtml += `
            <div class="hero-3d-card initial" data-index="${index}" onclick="openDetail('${id}')">
                <div class="hero-3d-card-poster" style="background-image: url('${img}');"></div>
                <div class="hero-3d-card-age">${age}</div>
                <div class="hero-3d-card-content">
                    <h3 class="hero-3d-card-title">${title}</h3>
                    <div class="hero-3d-card-info">
                        ${year && year !== '--' ? `<span>📅 ${year}</span>` : ''}
                        <span>📺 ${episodes}</span>
                    </div>
                </div>
            </div>
        `;
    });

    let dotsHtml = '';
    limitedItems.forEach((_, index) => {
        dotsHtml += `<button class="hero-3d-dot${index === 0 ? ' active' : ''}" onclick="goToHeroSlide(${index})" aria-label="Слайд ${index + 1}"></button>`;
    });

    track.innerHTML = cardsHtml;
    if (dots) dots.innerHTML = dotsHtml;

    setTimeout(() => {
        document.querySelectorAll('.hero-3d-card.initial').forEach(c => c.classList.remove('initial'));
    }, 1500);

    updateHeroCards();
}

function updateHeroCards() {
    const cards = document.querySelectorAll('.hero-3d-card');
    const dots = document.querySelectorAll('.hero-3d-dot');
    const total = cards.length;
    if (!total) return;

    cards.forEach((card, i) => {
        card.classList.remove('active', 'prev', 'next', 'far-prev', 'far-next', 'hidden');

        let position = 'hidden';

        if (i === heroCurrentSlide) position = 'active';
        else if (i === (heroCurrentSlide + 1) % total) position = 'next';
        else if (i === (heroCurrentSlide - 1 + total) % total) position = 'prev';
        else if (i === (heroCurrentSlide + 2) % total) position = 'far-next';
        else if (i === (heroCurrentSlide - 2 + total) % total) position = 'far-prev';

        card.classList.add(position);
    });

    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === heroCurrentSlide);
    });
}

function startHeroAutoSlide() {
    if (heroAutoSlideTimer) clearInterval(heroAutoSlideTimer);
    heroAutoSlideTimer = setInterval(() => slideHero(1), 5000);
}

function slideHero(direction) {
    const cards = document.querySelectorAll('.hero-3d-card');
    if (!cards.length) return;

    heroCurrentSlide = (heroCurrentSlide + direction + cards.length) % cards.length;
    updateHeroCards();

    if (heroAutoSlideTimer) {
        clearInterval(heroAutoSlideTimer);
        startHeroAutoSlide();
    }
}

function goToHeroSlide(index) {
    const cards = document.querySelectorAll('.hero-3d-card');
    if (!cards.length || index === heroCurrentSlide) return;

    heroCurrentSlide = index;
    updateHeroCards();

    if (heroAutoSlideTimer) {
        clearInterval(heroAutoSlideTimer);
        startHeroAutoSlide();
    }
}

// ============================================
// 2. СКЕЛЕТОНЫ
// ============================================
function renderSkeletons(count = 12) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-card">
                <div class="skeleton-poster"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-info"></div>
            </div>
        `;
    }
    return html;
}

// ============================================
// 3. КАТАЛОГ
// ============================================
async function loadCatalog(targetPage = null) {
    if (isLoading) return;
    isLoading = true;

    if (targetPage !== null) page = targetPage;

    const grid = document.getElementById('grid');
    const pagination = document.getElementById('pagination');
    const stats = document.getElementById('totalCount');
    if (!grid) { isLoading = false; return; }

    const searchInput = document.getElementById('catalogSearchInput');
    const searchValue = searchInput ? searchInput.value.trim() : '';

    const hasOldContent = grid.querySelector('.card');
    if (hasOldContent) {
        grid.classList.add('fade-out');
        await new Promise(r => setTimeout(r, 200));
    }

    if (!allItems.length) {
        grid.innerHTML = renderSkeletons(CATALOG_LIMIT);
    }

    grid.classList.remove('fade-out');

    if (pagination) pagination.style.display = 'none';

    try {
        let result;
        if (searchValue && searchValue.length > 0) {
            result = await API.searchAnime(searchValue, page, CATALOG_LIMIT);
        } else if (genre === 'latest') {
            result = await API.getLatest(page, CATALOG_LIMIT);
        } else if (genre) {
            result = await API.getByGenre(genre, page, CATALOG_LIMIT);
        } else {
            result = await API.getCatalog(page, CATALOG_LIMIT, 'popularity');
        }

        if (result && result.items && result.items.length > 0) {
            allItems = result.items;
            totalCount = result.totalCount || 0;
            allItems.forEach(item => { allData[item.mal_id] = item; });

            grid.classList.add('fade-in');
            renderCatalog(allItems);
            setTimeout(() => grid.classList.remove('fade-in'), 400);

            if (!searchValue && !genre && page === 1) {
                try {
                    sessionStorage.setItem('onika_catalog_cache', JSON.stringify({
                        items: allItems.slice(0, CATALOG_LIMIT),
                        time: Date.now()
                    }));
                } catch(e) {}
            }

            if (stats) {
                const searchText = searchValue ? `по запросу "${searchValue}"` : '';
                stats.textContent = searchText
                    ? `${searchText} — стр. ${page}`
                    : `📄 Страница ${page}`;
            }

            renderPagination(page, result.items.length);
            isAllLoaded = result.items.length < CATALOG_LIMIT;
        } else {
            if (page > 1) {
                page--;
                isLoading = false;
                return loadCatalog();
            }

            const searchText = searchValue ? ` "${searchValue}"` : '';
            grid.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--text-muted);grid-column:1/-1;">
                    <div style="font-size:64px;margin-bottom:16px;">🔍</div>
                    <p style="font-size:18px;font-weight:600;margin-bottom:8px;">Ничего не найдено${searchText}</p>
                </div>
            `;
            if (stats) stats.textContent = '';
            if (pagination) pagination.style.display = 'none';
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

// ============================================
// ПАГИНАЦИЯ
// ============================================
function renderPagination(currentPageNum, itemsCount) {
    const pagination = document.getElementById('pagination');
    const pagesContainer = document.getElementById('paginationPages');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    if (!pagination || !pagesContainer) return;

    const hasPrev = currentPageNum > 1;
    const hasNext = itemsCount >= CATALOG_LIMIT;

    if (!hasPrev && !hasNext) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';

    if (prevBtn) prevBtn.disabled = !hasPrev;
    if (nextBtn) nextBtn.disabled = !hasNext;

    let pagesHtml = '';
    const startPage = Math.max(1, currentPageNum - 3);
    const endPage = currentPageNum + 3;

    if (startPage > 1) {
        pagesHtml += `<button class="pagination-page" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            pagesHtml += `<span class="pagination-dots">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i < 1) continue;
        if (!hasNext && i > currentPageNum) break;

        const activeClass = i === currentPageNum ? ' active' : '';
        pagesHtml += `<button class="pagination-page${activeClass}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (hasNext) {
        const nextPageNum = endPage + 1;
        if (nextPageNum > endPage + 1) {
            pagesHtml += `<span class="pagination-dots">...</span>`;
        }
        pagesHtml += `<button class="pagination-page" onclick="goToPage(${nextPageNum})">${nextPageNum}</button>`;
    }

    pagesContainer.innerHTML = pagesHtml;
}

function goToPage(pageNum) {
    if (pageNum < 1 || pageNum === page) return;

    page = pageNum;
    allItems = [];
    isAllLoaded = false;
    loadCatalog(pageNum);

    const catalogSection = document.querySelector('.catalog-section');
    if (catalogSection) {
        const offset = catalogSection.offsetTop - 80;
        window.scrollTo({ top: offset, behavior: 'smooth' });
    }
}

function goToPrevPage() {
    if (page > 1) goToPage(page - 1);
}

function goToNextPage() {
    if (!isAllLoaded) goToPage(page + 1);
}

// ============================================
// ПОИСК / СБРОС
// ============================================
function applyCatalogFilters() {
    if (searchTimeout) { clearTimeout(searchTimeout); searchTimeout = null; }
    searchTimeout = setTimeout(() => {
        allItems = [];
        isAllLoaded = false;
        page = 1;
        loadCatalog(1);
    }, 400);
}

function resetCatalogFiltersSilent() {
    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) {
        searchInput.value = '';
        const clearBtn = document.getElementById('catalogSearchClear');
        if (clearBtn) clearBtn.style.display = 'none';
    }

    if (searchTimeout) { clearTimeout(searchTimeout); searchTimeout = null; }

    if (genre && genre !== 'latest') {
        genre = '';
    }

    allItems = [];
    isAllLoaded = false;
    page = 1;
}

function resetCatalogFilters() {
    resetCatalogFiltersSilent();
    sessionStorage.removeItem('onika_catalog_cache');
    loadCatalog(1);
}

// ============================================
// ОТРИСОВКА КАТАЛОГА
// ============================================
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
        const title = a.title || 'Без названия';
        const episodes = a.episodes || '?';
        const year = a.year || '';
        const color = colors[index % colors.length];
        const id = a.mal_id || a.id;
        const age = a.age_rating || '0+';

        htmlParts.push(`
            <div class="card" onclick="openDetail('${id}')" style="--card-index:${index};">
                <div class="card-img" style="${!img ? 'background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:48px;' : ''}">
                    ${img ? `<img src="${img}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '🎬'}
                    ${year && year !== '--' ? `<span class="card-year">${year}</span>` : ''}
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
// 4. ЖАНР
// ============================================
function setGenre(genreId, btn) {
    document.querySelectorAll('.genres a').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');

    genre = genreId;
    page = 1;

    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) searchInput.value = '';

    const titleEl = document.getElementById('catalogTitle');
    if (titleEl) {
        if (genreId === 'latest') titleEl.textContent = '🔥 НОВИНКИ АНИМЕ';
        else if (genreId) titleEl.textContent = '🎭 ' + (btn ? btn.textContent : genreId);
        else titleEl.textContent = '📚 ВСЕ АНИМЕ';
    }

    allItems = [];
    isAllLoaded = false;
    loadCatalog(1);
}

// ✅ НОВАЯ — клик по жанру-чипсу на странице аниме
function onGenreClick(genreName) {
    if (!genreName) return;

    navigate('home');

    const searchInput = document.getElementById('catalogSearchInput');
    if (searchInput) {
        searchInput.value = genreName;
        const clearBtn = document.getElementById('catalogSearchClear');
        if (clearBtn) clearBtn.style.display = 'flex';
    }

    const titleEl = document.getElementById('catalogTitle');
    if (titleEl) titleEl.textContent = '🎭 ' + genreName;

    applyCatalogFilters();
    showToast(`🎭 Ищем: ${genreName}`, 'info');
}

// ============================================
// 5. СЛУЧАЙНОЕ АНИМЕ
// ============================================
async function randomAnime() {
    const resultContainer = document.getElementById('randomResult');
    const triggerBtn = document.querySelector('.random-trigger-btn');
    if (!resultContainer) return;

    if (triggerBtn) triggerBtn.classList.add('loading');

    resultContainer.innerHTML = `
        <div class="random-loading">
            <div class="random-spinner-new"></div>
            <span class="random-loading-text">🌀 Подбираем идеальное аниме...</span>
        </div>
    `;

    try {
        const items = await API.getRandom(1);
        if (!items || !items.length) {
            resultContainer.innerHTML = `
                <div class="random-error-new">
                    <span class="error-icon">😅</span>
                    <p>Не удалось найти аниме. Попробуйте ещё раз!</p>
                </div>
            `;
            if (triggerBtn) triggerBtn.classList.remove('loading');
            return;
        }

        const anime = items[0];

        setTimeout(() => {
            resultContainer.innerHTML = renderRandomCard(anime);
            if (triggerBtn) triggerBtn.classList.remove('loading');
        }, 400);

    } catch (e) {
        console.error('Ошибка получения случайного аниме:', e);
        resultContainer.innerHTML = `
            <div class="random-error-new">
                <span class="error-icon">⚠️</span>
                <p>Ошибка загрузки. Попробуйте позже.</p>
            </div>
        `;
        if (triggerBtn) triggerBtn.classList.remove('loading');
    }
}

function renderRandomCard(anime) {
    const img = anime.images?.jpg?.image_url || '';
    const title = anime.title || 'Без названия';
    const year = anime.year || '';
    const episodes = anime.episodes || '?';
    const age = anime.age_rating || '0+';
    const id = anime.id;
    const ageColor = getAgeColor(age);

    return `
        <div class="random-anime-card" onclick="openDetail('${id}')">
            <div class="random-anime-poster">
                ${img
                    ? `<img src="${img}" alt="${title}" loading="lazy">`
                    : '<div class="random-anime-no-poster">🎬</div>'
                }
                <div class="random-anime-age" style="background:${ageColor}aa;">${age}</div>
            </div>

            <div class="random-anime-info">
                <h3 class="random-anime-title">${title}</h3>

                ${year && year !== '--' ? `<span class="random-anime-year">📅 ${year}</span>` : ''}

                <div class="random-anime-meta">
                    <div class="random-anime-meta-item">
                        <span class="emoji">📺</span>
                        <span>${episodes} ${episodes === '?' ? 'эпизод' : 'эп.'}</span>
                    </div>
                </div>

                <div class="random-anime-actions">
                    <button class="random-action-btn watch" onclick="event.stopPropagation(); openDetail('${id}')">
                        <span class="btn-icon">▶️</span>
                        <span>Смотреть</span>
                    </button>
                    <button class="random-action-btn retry" onclick="event.stopPropagation(); randomAnime()">
                        <span class="btn-icon">🔄</span>
                        <span>Другое</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getAgeColor(age) {
    const colors = { '0+': '#2ecc71', '6+': '#3498db', '12+': '#f1c40f', '16+': '#e67e22', '18+': '#e74c3c' };
    return colors[age] || '#6c5ce7';
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
        position: absolute; top: 100%; left: 0; right: 0;
        background: var(--bg-card); border-radius: var(--radius);
        border: 1px solid rgba(108,92,231,0.1); max-height: 300px;
        overflow-y: auto; z-index: 1000; display: none;
        backdrop-filter: blur(20px); box-shadow: 0 10px 40px rgba(0,0,0,0.5);
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
// 7. ОТКРЫТЬ ДЕТАЛИ
// ============================================
async function openDetail(id) {
    console.log('📖 Открываем детали:', id);

    if (!id) {
        showToast('Ошибка ID', 'error');
        return;
    }

    previousPage = currentPage;
    navigate('detail');

    const titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = 'Загрузка...';

    const posterEl = document.getElementById('detailPoster');
    if (posterEl) posterEl.style.display = 'none';

    try {
        const data = await API.getAnimeDetails(id);
        console.log('📦 Данные:', data);

        if (!data) {
            showToast('❌ Аниме не найдено', 'error');
            const descEl = document.getElementById('detailDesc');
            if (descEl) descEl.textContent = 'Не удалось загрузить данные аниме.';
            if (titleEl) titleEl.textContent = 'Ошибка загрузки';
            return;
        }

        allData[id] = data;
        showDetail(data);
    } catch (e) {
        console.error('❌ Ошибка:', e);
        showToast('❌ Ошибка загрузки', 'error');

        if (allData[id]) {
            showDetail(allData[id]);
        } else {
            if (titleEl) titleEl.textContent = 'Ошибка загрузки';
            const descEl = document.getElementById('detailDesc');
            if (descEl) descEl.textContent = 'Попробуйте открыть другое аниме.';
        }
    }
}

// ============================================
// 8. ПОКАЗАТЬ ДЕТАЛИ v2.1 — ИСПРАВЛЕННАЯ
// ============================================
function showDetail(anime) {
    if (!anime) return;

    try {
        const titleEl = document.getElementById('detailTitle');
        const engEl = document.getElementById('detailEng');
        const metaEl = document.getElementById('detailMeta');
        const descEl = document.getElementById('detailDesc');
        const posterEl = document.getElementById('detailPoster');
        const heroBg = document.getElementById('detailHeroBg');
        const ageBadge = document.querySelector('.age-badge');
        const tagsEl = document.getElementById('detailTags');
        const favBtn = document.getElementById('favBtn');

        const displayTitle = anime.title || anime.title_russian || 'Без названия';
        const engTitle = anime.title_english || '';

        if (titleEl) titleEl.textContent = displayTitle;
        if (engEl) engEl.textContent = engTitle;

        const year = anime.year || '--';
        const episodes = anime.episodes || '?';
        const score = parseFloat(anime.score) || 0;

        // ✅ Мета-строка с рейтингом
        if (metaEl) {
            let scoreClass = 'low';
            if (score >= 9) scoreClass = 'high';
            else if (score >= 7) scoreClass = 'medium';

            let metaHtml = '';

            if (score > 0) {
                metaHtml += `
                    <span class="detail-score ${scoreClass}">
                        <span class="star-icon">⭐</span>
                        <span>${score.toFixed(1)}</span>
                    </span>
                `;
            }

            if (year && year !== '--') {
                metaHtml += `
                    <span class="detail-meta-item">
                        📅 ${year}
                    </span>
                `;
            }

            if (episodes && episodes !== '?') {
                metaHtml += `
                    <span class="detail-meta-item">
                        📺 ${episodes} эп.
                    </span>
                `;
            }

            if (anime.status) {
                metaHtml += `
                    <span class="detail-meta-item">
                        ${anime.status}
                    </span>
                `;
            }

            metaEl.innerHTML = metaHtml;
        }

        if (descEl) descEl.textContent = anime.synopsis || anime.description || 'Описание отсутствует';

        const img = anime.images?.jpg?.image_url || '';
        if (posterEl) {
            if (img) {
                posterEl.src = img;
                posterEl.style.display = 'block';
            } else {
                posterEl.style.display = 'none';
            }
        }

        // ✅ Фон баннера (размытый постер)
        if (heroBg && img) {
            try {
                heroBg.style.backgroundImage = `url('${img}')`;
            } catch(e) {
                console.warn('Hero bg error:', e);
            }
        }

        // ✅ Фоновое свечение от постера
        const ambientGlow = document.getElementById('detailAmbientGlow');
        if (ambientGlow && img) {
            try {
                extractDominantColor(img, function(color) {
                    ambientGlow.style.setProperty('--ambient-color', color);
                    ambientGlow.classList.add('active');
                });
            } catch(e) {
                console.warn('Ambient glow error:', e);
            }
        }

        if (ageBadge) {
            const age = anime.age_rating || '0+';
            ageBadge.textContent = age;
            ageBadge.className = `age-badge age-${age.replace('+', '')}`;
        }

        // ✅ Жанры-чипсы
        if (tagsEl) {
            const genres = Array.isArray(anime.genres) ? anime.genres : [];
            if (genres.length > 0) {
                tagsEl.innerHTML = genres.map((g, i) => {
                    const safeG = String(g).replace(/'/g, "\\'");
                    const color = getGenreColor(g);
                    return `
                        <span class="detail-tag" 
                              style="--tag-color: ${color}; --tag-bg: ${color}15; --tag-border: ${color}40; animation-delay: ${i * 0.05}s;"
                              onclick="event.stopPropagation(); onGenreClick('${safeG}');">
                            ${g}
                        </span>
                    `;
                }).join('');
            } else {
                tagsEl.innerHTML = '';
            }
        }

        // ✅ Кнопка избранного
        const user = DB.get('currentUser');
        const favs = user ? DB.getUserData(user.name, 'favorites', []) : [];
        const isFav = favs.indexOf(displayTitle) > -1;

        if (favBtn) {
            updateFavButton(favBtn, isFav);
            favBtn.onclick = function() {
                if (!user) {
                    showToast('Войдите в аккаунт!', 'error');
                    return;
                }
                toggleFav(displayTitle);
                setTimeout(() => {
                    const favsNow = DB.getUserData(user.name, 'favorites', []);
                    const isFavNow = favsNow.indexOf(displayTitle) > -1;
                    updateFavButton(favBtn, isFavNow);
                    if (isFavNow) {
                        try { spawnFavConfetti(favBtn); } catch(e) {}
                    }
                }, 100);
            };
        }

        // ✅ Прогресс просмотра
        try {
            renderWatchProgress(displayTitle, anime);
        } catch(e) {
            console.warn('Watch progress error:', e);
            const container = document.getElementById('watchEpisodesInfo');
            if (container) container.style.display = 'none';
        }

        renderComments(displayTitle);
        closeWatchEmbed();

    } catch (err) {
        console.error('❌ Ошибка showDetail:', err);
        showToast('Ошибка отображения: ' + err.message, 'error');
    }
}

// ===== ✅ ОБНОВЛЕНИЕ КНОПКИ ИЗБРАННОГО =====
function updateFavButton(btn, isFav) {
    if (!btn) return;
    if (isFav) {
        btn.classList.add('active');
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            В избранном
        `;
    } else {
        btn.classList.remove('active');
        btn.innerHTML = `
            <svg width="20" height="20"><use href="icons/icons.svg#icon-heart-empty"/></svg>
            В избранное
        `;
    }
}

// ===== ✅ КОНФЕТТИ =====
function spawnFavConfetti(btn) {
    if (!btn) return;
    try {
        const rect = btn.getBoundingClientRect();
        if (!rect || rect.width === 0) return;

        const colors = ['#ff2d78', '#fd79a8', '#e84393', '#ff6b9d', '#ffed4e'];
        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;';
        document.body.appendChild(container);

        let html = '';
        for (let i = 0; i < 24; i++) {
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const size = 4 + Math.random() * 8;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const tx = (Math.random() - 0.5) * 300;
            const ty = -Math.random() * 200 - 50;
            const duration = 0.8 + Math.random() * 0.8;
            const delay = Math.random() * 0.2;
            const rotate = Math.random() * 720;
            const borderRadius = Math.random() > 0.5 ? '50%' : '2px';

            html += `
                <div style="
                    position:absolute;
                    left:${x}px;
                    top:${y}px;
                    width:${size}px;
                    height:${size}px;
                    background:${color};
                    border-radius:${borderRadius};
                    opacity:0;
                    animation: favConfettiFly ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                    animation-delay:${delay}s;
                    --tx:${tx}px;
                    --ty:${ty}px;
                    --rot:${rotate}deg;
                "></div>
            `;
        }

        const style = document.createElement('style');
        style.textContent = `
            @keyframes favConfettiFly {
                0% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                }
                50% {
                    opacity: 1;
                }
                100% {
                    opacity: 0;
                    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.6) rotate(var(--rot));
                }
            }
        `;
        container.appendChild(style);
        container.innerHTML += html;
        setTimeout(() => container.remove(), 2000);
    } catch(e) {
        console.warn('Confetti error:', e);
    }
}

// ===== ✅ ИЗВЛЕЧЕНИЕ ДОМИНИРУЮЩЕГО ЦВЕТА =====
function extractDominantColor(imgUrl, callback) {
    if (!imgUrl) {
        callback('rgba(108, 92, 231, 0.3)');
        return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    let called = false;
    const safeCallback = (color) => {
        if (!called) {
            called = true;
            callback(color);
        }
    };

    const timeout = setTimeout(() => {
        safeCallback('rgba(108, 92, 231, 0.3)');
    }, 3000);

    img.onload = function() {
        clearTimeout(timeout);
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);

            const imageData = ctx.getImageData(0, 0, 50, 50).data;
            let r = 0, g = 0, b = 0, count = 0;

            for (let i = 0; i < imageData.length; i += 40) {
                r += imageData[i];
                g += imageData[i + 1];
                b += imageData[i + 2];
                count++;
            }

            if (count === 0) {
                safeCallback('rgba(108, 92, 231, 0.3)');
                return;
            }

            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);

            const max = Math.max(r, g, b);
            const factor = 180 / (max || 1);
            r = Math.min(255, Math.round(r * factor));
            g = Math.min(255, Math.round(g * factor));
            b = Math.min(255, Math.round(b * factor));

            safeCallback(`rgba(${r}, ${g}, ${b}, 0.4)`);
        } catch(e) {
            console.warn('Canvas CORS error');
            safeCallback('rgba(108, 92, 231, 0.3)');
        }
    };

    img.onerror = function() {
        clearTimeout(timeout);
        safeCallback('rgba(108, 92, 231, 0.3)');
    };

    img.src = imgUrl;
}

// ===== ✅ ПРОГРЕСС ПРОСМОТРА СЕРИЙ =====
function renderWatchProgress(animeTitle, anime) {
    const container = document.getElementById('watchEpisodesInfo');
    if (!container) return;

    const user = DB.get('currentUser');
    if (!user || !animeTitle) {
        container.style.display = 'none';
        return;
    }

    const watching = DB.getUserData(user.name, 'continueWatching', {});
    const current = watching[animeTitle];
    const totalEpisodes = parseInt(anime?.episodes) || 0;

    if (!current && totalEpisodes === 0) {
        container.style.display = 'none';
        return;
    }

    const watchedEp = current ? (current.episode || 0) : 0;
    const total = current && current.total ? current.total : totalEpisodes;
    const percent = total > 0 ? Math.round((watchedEp / total) * 100) : 0;

    const titleEl = document.getElementById('watchEpisodesTitle');
    const countEl = document.getElementById('watchEpisodesCount');
    const fillEl = document.getElementById('watchProgressFill');
    const currentEl = document.getElementById('watchProgressCurrent');
    const percentEl = document.getElementById('watchProgressPercent');

    if (titleEl) titleEl.textContent = watchedEp > 0 ? 'Твой прогресс' : 'Доступно серий';
    if (countEl) countEl.textContent = total > 0 ? `${total} серий` : '?';
    if (fillEl) fillEl.style.width = percent + '%';
    if (currentEl) currentEl.textContent = `Просмотрено: ${watchedEp} из ${total || '?'}`;
    if (percentEl) percentEl.textContent = percent + '%';

    container.style.display = 'block';
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
// 10. ПРОСМОТР ИСТОЧНИКОВ
// ============================================
function getCurrentAnimeTitle() {
    const titleEl = document.getElementById('detailTitle');
    if (!titleEl) return '';
    let title = titleEl.textContent.trim();
    title = title.replace(/[«»""]/g, '').trim();
    return title;
}

async function watchOnVK() {
    const title = getCurrentAnimeTitle();
    if (!title) { showToast('Название не найдено', 'error'); return; }

    const container = document.getElementById('watchEmbedContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <div class="watch-embed-wrapper">
            <div class="player-loader">
                <div class="player-loader-ring"></div>
                <div class="player-loader-text">Ищем в базе VK...</div>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/sources/' + encodeURIComponent(title));
        const data = await response.json();

        if (data.success && data.sources && data.sources.vk && data.sources.vk.length > 0) {
            renderSourceEpisodes('vk', data.sources.vk, title);
        } else {
            renderNoSources('vk', title);
        }
    } catch (e) {
        renderNoSources('vk', title);
    }
}

async function watchOnDeep() {
    const title = getCurrentAnimeTitle();
    if (!title) { showToast('Название не найдено', 'error'); return; }

    const container = document.getElementById('watchEmbedContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <div class="watch-embed-wrapper">
            <div class="player-loader">
                <div class="player-loader-ring"></div>
                <div class="player-loader-text">Ищем в базе Deep...</div>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/sources/' + encodeURIComponent(title));
        const data = await response.json();

        if (data.success && data.sources && data.sources.deep && data.sources.deep.length > 0) {
            renderSourceEpisodes('deep', data.sources.deep, title);
        } else {
            renderNoSources('deep', title);
        }
    } catch (e) {
        renderNoSources('deep', title);
    }
}

function renderSourceEpisodes(source, episodes, title) {
    const container = document.getElementById('watchEmbedContainer');
    const sourceNames = { vk: 'VK Video', deep: 'Deep-ent.ru', kodi: 'Kodi' };
    const sourceIcons = { vk: '📺', deep: '🎬', kodi: '🎞️' };

    const firstEp = episodes[0];

    let episodesListHtml = '';
    episodes.forEach((ep, index) => {
        episodesListHtml += `
            <button onclick="playSourceEpisode('${source}', ${index}, '${title.replace(/'/g, "\\'")}')"
                class="source-episode-btn"
                data-index="${index}"
                style="padding:8px 14px;border-radius:10px;border:1px solid ${index === 0 ? 'var(--neon-cyan)' : 'rgba(0,245,255,0.1)'};
                       background:${index === 0 ? 'rgba(0,245,255,0.1)' : 'rgba(0,245,255,0.02)'};
                       color:${index === 0 ? 'var(--neon-cyan)' : 'var(--text-primary)'};
                       cursor:pointer;font-size:13px;font-weight:600;transition:all 0.3s ease;margin:3px;">
                ${sourceIcons[source]} Серия ${ep.episode}
            </button>
        `;
    });

    container.innerHTML = `
        <div class="watch-embed-header">
            <h4><span>${sourceIcons[source]}</span> ${sourceNames[source]} — ${title}</h4>
            <button class="watch-embed-close" onclick="closeWatchEmbed()">✕ Закрыть</button>
        </div>

        <div style="padding:16px 20px;">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">
                📺 Доступно серий: ${episodes.length}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;max-height:200px;overflow-y:auto;">
                ${episodesListHtml}
            </div>
        </div>

        <div id="sourcePlayerArea" class="watch-embed-wrapper">
            <div class="player-loader">
                <div class="player-loader-ring"></div>
                <div class="player-loader-text">Нажмите на серию</div>
            </div>
        </div>

        <div style="margin-top:12px;text-align:center;padding:0 16px 16px;">
            <a href="${firstEp.url}" target="_blank" rel="noopener" style="color:var(--neon-cyan);font-size:13px;text-decoration:none;">
                🔗 Открыть в новой вкладке
            </a>
        </div>
    `;

    playSourceEpisode(source, 0, title);
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function playSourceEpisode(source, index, title) {
    const container = document.getElementById('watchEmbedContainer');

    container.querySelectorAll('.source-episode-btn').forEach((btn, i) => {
        btn.style.background = i === index ? 'rgba(0,245,255,0.1)' : 'rgba(0,245,255,0.02)';
        btn.style.borderColor = i === index ? 'var(--neon-cyan)' : 'rgba(0,245,255,0.1)';
        btn.style.color = i === index ? 'var(--neon-cyan)' : 'var(--text-primary)';
    });

    try {
        const response = await fetch('/api/sources/' + encodeURIComponent(title));
        const data = await response.json();
        const episode = data.sources[source][index];
        const playerArea = document.getElementById('sourcePlayerArea');

        const canEmbed = source === 'vk' && episode.url.includes('vkvideo.ru');

        if (canEmbed) {
            let embedUrl = episode.url;
            const match = episode.url.match(/video(-?\d+)_(\d+)/);
            if (match) {
                const oid = match[1];
                const vid = match[2];
                embedUrl = `https://vk.com/video_ext.php?oid=${oid}&id=${vid}&hd=2&autoplay=1`;
            }

            playerArea.innerHTML = `
                <iframe src="${embedUrl}"
                    frameborder="0"
                    allowfullscreen
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;">
                </iframe>
            `;

            const user = DB.get('currentUser');
            if (user) {
                saveContinueWatching(user.name, title, episode.episode, data.sources[source].length);
                try {
                    renderWatchProgress(title, { episodes: data.sources[source].length });
                } catch(e) {}
            }
        } else {
            playerArea.innerHTML = `
                <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#aaa;flex-direction:column;gap:16px;background:rgba(0,0,0,0.85);">
                    <span style="font-size:56px;">🎬</span>
                    <span style="font-size:16px;font-weight:600;color:#fff;">Серия ${episode.episode}</span>
                    <span style="font-size:13px;color:#888;">Откройте источник в новой вкладке</span>
                    <a href="${episode.url}" target="_blank" rel="noopener"
                       style="padding:12px 32px;border-radius:50px;background:linear-gradient(135deg,var(--neon-cyan),var(--neon-purple));color:#fff;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 20px rgba(0,245,255,0.2);">
                        ▶️ Открыть серию ${episode.episode}
                    </a>
                </div>
            `;
        }
    } catch (e) {
        console.error('Ошибка воспроизведения:', e);
    }
}

function renderNoSources(source, title) {
    const container = document.getElementById('watchEmbedContainer');
    const sourceNames = { vk: 'VK Video', deep: 'Deep-ent.ru' };
    const sourceUrls = {
        vk: `https://vk.com/videos-201142575?q=${encodeURIComponent(title)}`,
        deep: `https://deep-ent.ru/search?q=${encodeURIComponent(title)}`
    };

    container.innerHTML = `
        <div class="watch-embed-header">
            <h4>🔍 ${sourceNames[source]} — ${title}</h4>
            <button class="watch-embed-close" onclick="closeWatchEmbed()">✕ Закрыть</button>
        </div>

        <div style="padding:24px;text-align:center;">
            <div style="padding:16px;background:rgba(255,215,0,0.05);border-radius:14px;border:1px solid rgba(255,215,0,0.2);margin-bottom:16px;">
                <strong style="color:#ffd700;">⚠️ Пока нет ссылок в базе</strong><br>
                <span style="font-size:13px;color:var(--text-secondary);">Мы ищем видео вручную. Попробуйте найти через поиск источника.</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;max-width:400px;margin:0 auto;">
                <a href="${sourceUrls[source]}" target="_blank" rel="noopener" 
                   style="padding:14px 20px;border-radius:14px;background:rgba(0,245,255,0.08);border:1px solid rgba(0,245,255,0.2);color:var(--neon-cyan);text-decoration:none;font-weight:700;font-size:13px;transition:all 0.3s ease;">
                    🔍 Найти «${title}» вручную
                </a>
                <a href="https://vk.com/deep" target="_blank" rel="noopener"
                   style="padding:14px 20px;border-radius:14px;background:rgba(108,92,231,0.08);border:1px solid rgba(108,92,231,0.2);color:var(--accent-glow);text-decoration:none;font-weight:700;font-size:13px;transition:all 0.3s ease;">
                    🌟 Сообщество DEEP
                </a>
            </div>
        </div>
    `;
}

function closeWatchEmbed() {
    const container = document.getElementById('watchEmbedContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

// ============================================
// 11. КОММЕНТАРИИ С АВАТАРАМИ
// ============================================
function renderComments(animeName) {
    const container = document.getElementById('commentsList');
    if (!container) return;

    fetch('/api/comments/' + encodeURIComponent(animeName))
        .then(res => res.json())
        .then(comments => {
            if (!comments || !comments.length) {
                container.innerHTML = `
                    <div style="color:#666;text-align:center;padding:40px 20px;">
                        <div style="font-size:48px;margin-bottom:10px;">💬</div>
                        <div>Нет комментариев</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-top:6px;">Будь первым!</div>
                    </div>
                `;
                return;
            }

            const user = DB.get('currentUser');
            let html = '';
            comments.forEach((c, index) => {
                const canDelete = user && c.user_name === user.name;
                const isMine = user && c.user_name === user.name;
                const letter = c.user_name[0].toUpperCase();

                const profiles = DB.get('profiles', {});
                const userProfile = profiles[c.user_name] || {};
                const avatarData = userProfile.avatar || localStorage.getItem('avatar_' + c.user_name) || '';

                const avatarHtml = avatarData && avatarData.length > 100
                    ? `<img src="${avatarData}" alt="${c.user_name}">`
                    : `<span>${letter}</span>`;

                html += `
                    <div class="comment-item${isMine ? ' mine' : ''}" style="animation-delay: ${index * 0.05}s;">
                        <div class="comment-avatar">${avatarHtml}</div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-user" onclick="openUserFromComment('${c.user_name.replace(/'/g, "\\'")}')">${c.user_name}</span>
                                ${isMine ? '<span class="comment-you-badge">👤 Ты</span>' : ''}
                                <span class="comment-date">${c.date}</span>
                            </div>
                            <div class="comment-text">${c.text}</div>
                        </div>
                        ${canDelete ? `<button class="c-delete-btn" onclick="event.stopPropagation(); deleteComment(${c.id})">✕</button>` : ''}
                    </div>
                `;
            });
            container.innerHTML = html;
        })
        .catch(() => {
            container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">⚠️ Ошибка загрузки</div>';
        });
}

function openUserFromComment(userName) {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    if (user.name === userName) {
        navigate('profile');
    } else {
        showToast(`👤 ${userName}`, 'info');
    }
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

    const btn = document.querySelector('.comment-form button');
    if (btn) {
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.6';
    }

    fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anime: title, user_name: user.name, text: text })
    })
    .then(res => res.json())
    .then(data => {
        if (btn) {
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
        }
        if (data.success) {
            input.value = '';
            renderComments(title);
            addActivity(user.name, 'comment', 'Оставил комментарий к «' + title + '»');
            showToast('💬 Комментарий добавлен!', 'success');

            if (window._myCommentsCache && window._myCommentsCache.user === user.name) {
                window._myCommentsCache.count++;
                updateUI();
            }
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    })
    .catch(err => {
        if (btn) {
            btn.style.pointerEvents = '';
            btn.style.opacity = '';
        }
        console.error('❌ Ошибка отправки:', err);
        showToast('Ошибка сети', 'error');
    });
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

                if (window._myCommentsCache && window._myCommentsCache.user === user.name) {
                    window._myCommentsCache.count = Math.max(0, window._myCommentsCache.count - 1);
                    updateUI();
                }
            }
        });
    });
}

// ============================================
// 12. ИЗБРАННОЕ
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

    updateUI();

    if (currentPage === 'favorites') renderFavorites();
}

function renderFavorites() {
    const user = DB.get('currentUser');
    const container = document.getElementById('favGrouped');
    if (!container) return;

    if (!user) {
        container.innerHTML = `
            <div class="fav-grid">
                <div class="fav-empty">
                    <div class="fav-empty-icon">🔐</div>
                    <h3 class="fav-empty-title">Войдите в аккаунт</h3>
                    <p class="fav-empty-desc">Чтобы сохранять любимые аниме в избранное</p>
                    <button class="fav-empty-btn" onclick="showLoginModal()">🚀 Войти</button>
                </div>
            </div>
        `;
        updateFavStats([]);
        return;
    }

    const favs = DB.getUserData(user.name, 'favorites', []);

    if (favs.length === 0) {
        container.innerHTML = `
            <div class="fav-grid">
                <div class="fav-empty">
                    <div class="fav-empty-icon">💔</div>
                    <h3 class="fav-empty-title">Пока пусто</h3>
                    <p class="fav-empty-desc">Добавляй аниме в избранное, нажимая на сердечко</p>
                    <button class="fav-empty-btn" onclick="navigate('home')">🎬 Найти аниме</button>
                </div>
            </div>
        `;
        updateFavStats([]);
        return;
    }

    updateFavStats(favs);
    applyFavFilters();
}

function applyFavFilters() {
    const user = DB.get('currentUser');
    if (!user) return;

    const container = document.getElementById('favGrouped');
    if (!container) return;

    let favs = DB.getUserData(user.name, 'favorites', []);

    const searchValue = document.getElementById('favSearchInput')?.value?.trim()?.toLowerCase() || '';
    if (searchValue) {
        favs = favs.filter(name => name.toLowerCase().includes(searchValue));
    }

    const sortValue = document.getElementById('favSortSelect')?.value || 'added_desc';
    favs = sortFavorites(favs, sortValue);

    const grouped = groupFavoritesByStatus(favs);

    const isListView = document.getElementById('favViewBtn')?.classList.contains('active');

    let html = '';

    const sectionConfig = [
        { key: 'watching', icon: '▶️', title: 'Смотрю' },
        { key: 'planned', icon: '📅', title: 'В планах' },
        { key: 'completed', icon: '✅', title: 'Просмотрено' },
        { key: 'other', icon: '📌', title: 'Другое' }
    ];

    sectionConfig.forEach(cfg => {
        const sectionItems = grouped[cfg.key] || [];
        if (sectionItems.length === 0) return;

        html += `
            <div class="fav-section">
                <div class="fav-section-header">
                    <span class="fav-section-icon">${cfg.icon}</span>
                    <h3 class="fav-section-title">${cfg.title}</h3>
                    <span class="fav-section-count">${sectionItems.length}</span>
                </div>
                <div class="fav-grid${isListView ? ' list-view' : ''}">
                    ${sectionItems.map((name, i) => renderFavCard(name, i)).join('')}
                </div>
            </div>
        `;
    });

    if (!html) {
        html = `
            <div class="fav-grid">
                <div class="fav-empty">
                    <div class="fav-empty-icon">🔍</div>
                    <h3 class="fav-empty-title">Ничего не найдено</h3>
                    <p class="fav-empty-desc">Попробуйте изменить параметры поиска</p>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
    updateMassCount();
}

function sortFavorites(favs, sortValue) {
    const [field, order] = sortValue.split('_');
    const dir = order === 'desc' ? -1 : 1;

    return [...favs].sort((a, b) => {
        const itemA = findAnimeByName(a);
        const itemB = findAnimeByName(b);

        let valA, valB;

        switch (field) {
            case 'title':
                valA = a.toLowerCase();
                valB = b.toLowerCase();
                break;
            case 'score':
                valA = itemA?.score || 0;
                valB = itemB?.score || 0;
                break;
            case 'episodes':
                valA = parseInt(itemA?.episodes) || 0;
                valB = parseInt(itemB?.episodes) || 0;
                break;
            case 'added':
            default:
                const idxA = favs.indexOf(a);
                const idxB = favs.indexOf(b);
                return (idxA - idxB) * dir;
        }

        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });
}

function groupFavoritesByStatus(favs) {
    const groups = {
        watching: [],
        planned: [],
        completed: [],
        other: []
    };

    favs.forEach(name => {
        const item = findAnimeByName(name);
        const status = item?.status || '';

        if (status.includes('Онгоинг') || status.includes('ongoing')) {
            groups.watching.push(name);
        } else if (status.includes('Завершено') || status.includes('released')) {
            groups.completed.push(name);
        } else if (status.includes('Анонс') || status.includes('anons')) {
            groups.planned.push(name);
        } else {
            groups.other.push(name);
        }
    });

    return groups;
}

function findAnimeByName(name) {
    for (const id in allData) {
        const item = allData[id];
        if (item && item.title === name) {
            return item;
        }
    }
    return null;
}

function renderFavCard(name, index) {
    const item = findAnimeByName(name);

    const img = item?.images?.jpg?.image_url || '';
    const age = item?.age_rating || '0+';
    const score = item?.score || 0;

    const posterContent = img
        ? `<img src="${img}" alt="${name}" loading="lazy" onerror="this.style.display='none';">`
        : '<div style="width:100%;height:100%;background:linear-gradient(135deg, #1a1a3e, #2d1b69, #6c5ce7);display:flex;align-items:center;justify-content:center;font-size:48px;">🎬</div>';

    const scoreHtml = score > 0 ? `<div class="fav-card-score">⭐ ${score.toFixed(1)}</div>` : '';

    return `
        <div class="fav-card"
             data-name="${name.replace(/"/g, '&quot;')}"
             onclick="onFavCardClick(event, '${name.replace(/'/g, "\\'")}')"
             style="animation-delay: ${index * 0.04}s;">
            <div class="fav-card-img">
                ${posterContent}
            </div>
            <div class="fav-card-age">${age}</div>
            ${scoreHtml}
            <div class="fav-card-checkbox"></div>
            <button class="fav-card-remove" onclick="event.stopPropagation(); removeFromFav('${name.replace(/'/g, "\\'")}')" title="Удалить">✕</button>
            <div class="fav-card-heart">❤️</div>
            <div class="fav-card-info">
                <h3 class="fav-card-title">${name}</h3>
            </div>
        </div>
    `;
}

function onFavCardClick(event, name) {
    const card = event.currentTarget;

    if (card.classList.contains('mass-mode')) {
        card.classList.toggle('selected');
        updateMassCount();
        return;
    }

    openDetailFromFav(name);
}

function removeFromFav(name) {
    const user = DB.get('currentUser');
    if (!user) return;

    const favs = DB.getUserData(user.name, 'favorites', []);
    const idx = favs.indexOf(name);
    if (idx > -1) {
        favs.splice(idx, 1);
        DB.setUserData(user.name, 'favorites', favs);
        DB.save();

        updateUI();

        const cards = document.querySelectorAll('.fav-card');

        cards.forEach(card => {
            const cardName = card.getAttribute('data-name');
            if (cardName === name) {
                card.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                card.style.transform = 'scale(0.5) rotate(-15deg) translateY(-50px)';
                card.style.opacity = '0';

                setTimeout(() => {
                    card.remove();
                    updateFavStats(favs);

                    const remaining = document.querySelectorAll('.fav-card').length;
                    if (remaining === 0) {
                        renderFavorites();
                    } else {
                        document.querySelectorAll('.fav-section').forEach(section => {
                            const sectionCards = section.querySelectorAll('.fav-card');
                            if (sectionCards.length === 0) {
                                section.style.transition = 'all 0.4s ease';
                                section.style.opacity = '0';
                                setTimeout(() => section.remove(), 400);
                            } else {
                                const count = section.querySelector('.fav-section-count');
                                if (count) count.textContent = sectionCards.length;
                            }
                        });
                    }
                }, 500);
            }
        });

        showToast('Удалено из избранного 💔', 'info');
    }
}

function openDetailFromFav(name) {
    if (!name) return;

    const item = findAnimeByName(name);
    if (item) {
        openDetail(item.mal_id || item.id);
    } else {
        searchAndOpen(name);
    }
}

function updateFavStats(favs) {
    document.getElementById('favStatTotal').textContent = favs.length;

    if (favs.length === 0) {
        document.getElementById('favStatGenres').textContent = '0';
        document.getElementById('favStatEpisodes').textContent = '0';
        document.getElementById('favStatScore').textContent = '—';
        return;
    }

    const genres = new Set();
    let totalEpisodes = 0;
    let totalScore = 0;
    let scoreCount = 0;

    favs.forEach(name => {
        const item = findAnimeByName(name);
        if (item) {
            (item.genres || []).forEach(g => genres.add(g));
            const eps = parseInt(item.episodes) || 0;
            totalEpisodes += eps;
            if (item.score > 0) {
                totalScore += item.score;
                scoreCount++;
            }
        }
    });

    document.getElementById('favStatGenres').textContent = genres.size;
    document.getElementById('favStatEpisodes').textContent = totalEpisodes;
    document.getElementById('favStatScore').textContent = scoreCount > 0
        ? (totalScore / scoreCount).toFixed(1)
        : '—';
}

function filterFavorites() {
    const searchInput = document.getElementById('favSearchInput');
    const clearBtn = document.getElementById('favSearchClear');

    if (searchInput && clearBtn) {
        clearBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
    }

    applyFavFilters();
}

function clearFavSearch() {
    const input = document.getElementById('favSearchInput');
    const clearBtn = document.getElementById('favSearchClear');
    if (input) {
        input.value = '';
        input.focus();
        if (clearBtn) clearBtn.style.display = 'none';
        applyFavFilters();
    }
}

function toggleFavView() {
    const btn = document.getElementById('favViewBtn');
    if (!btn) return;

    btn.classList.toggle('active');

    if (btn.classList.contains('active')) {
        btn.textContent = '🔲 Сетка';
    } else {
        btn.textContent = '📋 Список';
    }

    applyFavFilters();
}

function randomFromFav() {
    const user = DB.get('currentUser');
    if (!user) { showToast('Войдите в аккаунт!', 'error'); return; }

    const favs = DB.getUserData(user.name, 'favorites', []);
    if (favs.length === 0) {
        showToast('Избранное пусто!', 'warning');
        return;
    }

    const randomName = favs[Math.floor(Math.random() * favs.length)];
    const item = findAnimeByName(randomName);

    if (item) {
        showToast(`🎲 Выбрано: ${randomName}`, 'success');
        openDetail(item.mal_id || item.id);
    } else {
        searchAndOpen(randomName);
    }
}

function toggleMassMode() {
    const panel = document.getElementById('favMassPanel');
    const btn = document.getElementById('favMassBtn');
    const cards = document.querySelectorAll('.fav-card');

    if (!panel || !btn) return;

    const isActive = panel.style.display !== 'none';

    if (isActive) {
        panel.style.display = 'none';
        btn.classList.remove('active');
        btn.innerHTML = '☑️ Выбрать';
        cards.forEach(c => c.classList.remove('mass-mode', 'selected'));
    } else {
        panel.style.display = 'flex';
        btn.classList.add('active');
        btn.innerHTML = '✕ Отмена';
        cards.forEach(c => c.classList.add('mass-mode'));
    }

    updateMassCount();
}

function updateMassCount() {
    const count = document.querySelectorAll('.fav-card.selected').length;
    const countEl = document.getElementById('favMassCount');
    if (countEl) countEl.textContent = count;
}

function selectAllFav() {
    const cards = document.querySelectorAll('.fav-card.mass-mode');
    cards.forEach(c => c.classList.add('selected'));
    updateMassCount();
}

function deselectAllFav() {
    const cards = document.querySelectorAll('.fav-card.selected');
    cards.forEach(c => c.classList.remove('selected'));
    updateMassCount();
}

function deleteSelectedFav() {
    const user = DB.get('currentUser');
    if (!user) return;

    const selected = document.querySelectorAll('.fav-card.selected');
    if (selected.length === 0) {
        showToast('Ничего не выбрано', 'warning');
        return;
    }

    showConfirmModal(
        '🗑 Удалить выбранные?',
        `Удалить ${selected.length} аниме из избранного?`,
        function() {
            const favs = DB.getUserData(user.name, 'favorites', []);

            const namesToRemove = [];
            selected.forEach(card => {
                const name = card.getAttribute('data-name');
                if (name) namesToRemove.push(name);
            });

            const newFavs = favs.filter(name => !namesToRemove.includes(name));
            DB.setUserData(user.name, 'favorites', newFavs);
            DB.save();

            updateUI();

            selected.forEach((card, i) => {
                setTimeout(() => {
                    card.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    card.style.transform = 'scale(0.5) rotate(-15deg) translateY(-50px)';
                    card.style.opacity = '0';
                    setTimeout(() => card.remove(), 400);
                }, i * 30);
            });

            setTimeout(() => {
                updateFavStats(newFavs);
                updateMassCount();

                const remaining = document.querySelectorAll('.fav-card').length;
                if (remaining === 0) {
                    renderFavorites();
                    toggleMassMode();
                } else {
                    document.querySelectorAll('.fav-section').forEach(section => {
                        const sectionCards = section.querySelectorAll('.fav-card');
                        if (sectionCards.length === 0) {
                            section.remove();
                        } else {
                            const count = section.querySelector('.fav-section-count');
                            if (count) count.textContent = sectionCards.length;
                        }
                    });
                }
            }, 600);

            showToast(`🗑 Удалено ${namesToRemove.length} аниме`, 'success');
        }
    );
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
// 13. ДОСТИЖЕНИЯ v2.0
// ============================================
function getUserMetrics(user) {
    const favs = DB.getUserData(user, 'favorites', []);

    let commentsCount = 0;
    if (window._myCommentsCache && window._myCommentsCache.user === user) {
        commentsCount = window._myCommentsCache.count;
    }

    const watching = DB.getUserData(user, 'continueWatching', {});
    let episodesWatched = 0;
    for (const anime in watching) {
        episodesWatched += watching[anime].episode || 0;
    }

    return {
        favorites: favs.length,
        comments: commentsCount,
        episodes: episodesWatched
    };
}

async function renderAchievements() {
    const user = DB.get('currentUser');
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;

    if (!user) {
        grid.innerHTML = `
            <div class="ach-empty-v2">
                <span class="ach-empty-icon-v2">🔐</span>
                <h3 class="ach-empty-title-v2">Войдите в аккаунт</h3>
                <p class="ach-empty-desc-v2">Чтобы видеть свои достижения и прогресс</p>
                <button class="ach-empty-btn-v2" onclick="showLoginModal()">🚀 Войти</button>
            </div>
        `;
        updateAchievementStats([], ACHIEVEMENTS_LIST.length, {});
        return;
    }

    try {
        const res = await fetch('/api/comments/all');
        const comments = await res.json();
        const myComments = comments.filter(c => c.user_name === user.name);
        window._myCommentsCache = { user: user.name, count: myComments.length };
    } catch(e) {
        window._myCommentsCache = { user: user.name, count: 0 };
    }

    const earned = DB.getAchievements(user.name);
    const activeTitle = DB.getActiveTitle(user.name);
    const metrics = getUserMetrics(user.name);

    const achievementsWithProgress = ACHIEVEMENTS_LIST.map(ach => {
        const current = metrics[ach.metric] || 0;
        const progress = Math.min(100, Math.round((current / ach.target) * 100));
        const isEarned = earned.indexOf(ach.id) !== -1;

        if (!isEarned && current >= ach.target) {
            DB.addAchievement(user.name, ach.id);
            setTimeout(() => showAchUnlock(ach), 500);
        }

        return { ...ach, current, progress, isEarned };
    });

    const finalEarned = DB.getAchievements(user.name);

    updateAchievementStats(finalEarned, ACHIEVEMENTS_LIST.length, metrics);
    renderActiveTitle(activeTitle);

    let allAchievements = [...achievementsWithProgress];

    const sortValue = document.getElementById('achSortSelect')?.value || 'rarity_desc';
    achCurrentSort = sortValue;
    allAchievements = sortAchievements(allAchievements, sortValue);

    if (allAchievements.length === 0) {
        grid.innerHTML = `
            <div class="ach-empty-v2">
                <span class="ach-empty-icon-v2">🔍</span>
                <h3 class="ach-empty-title-v2">Пока нет достижений</h3>
                <p class="ach-empty-desc-v2">Смотри аниме, оставляй комментарии и добавляй в избранное!</p>
            </div>
        `;
        return;
    }

    let html = '';
    allAchievements.forEach((ach, index) => {
        html += renderAchCardV2(ach, index, activeTitle);
    });
    grid.innerHTML = html;
}

function sortAchievements(list, sortValue) {
    const [field, order] = sortValue.split('_');
    const dir = order === 'desc' ? -1 : 1;

    return [...list].sort((a, b) => {
        let valA, valB;

        switch (field) {
            case 'rarity':
                valA = RARITY_ORDER[a.rarity] || 0;
                valB = RARITY_ORDER[b.rarity] || 0;
                break;
            case 'earned':
                valA = a.isEarned ? 1 : 0;
                valB = b.isEarned ? 1 : 0;
                break;
            case 'locked':
                valA = a.isEarned ? 0 : 1;
                valB = b.isEarned ? 0 : 1;
                break;
            case 'progress':
                valA = a.progress;
                valB = b.progress;
                break;
            case 'name':
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
                break;
            default:
                valA = 0;
                valB = 0;
        }

        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });
}

function renderAchCardV2(ach, index, activeTitle) {
    const isActive = activeTitle === ach.id;
    const rarityLabel = RARITY_LABELS[ach.rarity] || 'Обычное';

    const progressText = ach.isEarned
        ? `✅ Получено`
        : `${ach.current} / ${ach.target}`;

    const footerHtml = ach.isEarned
        ? `
            <div class="ach-title-info">
                🎖️ <strong>${ach.title}</strong>
            </div>
            <button class="ach-btn-v2 ${isActive ? 'active' : 'set'}"
                    onclick="event.stopPropagation(); setActiveTitle('${ach.id}')">
                ${isActive ? '👑 Активен' : '⭐ Установить'}
            </button>
        `
        : `
            <div class="ach-title-info">
                🔒 <span>Закрыто</span>
            </div>
            <button class="ach-btn-v2 locked" disabled>
                🔒 ${ach.progress}%
            </button>
        `;

    return `
        <div class="ach-card-v2 ${ach.isEarned ? 'earned' : 'locked'} rarity-${ach.rarity}"
             data-index="${index}"
             onclick="openAchModal('${ach.id}')"
             style="animation-delay: ${index * 0.05}s;">

            <div class="ach-shine"></div>

            ${ach.isEarned ? `<div class="ach-earned-check">✓</div>` : ''}

            <div class="ach-card-header">
                <div class="ach-icon-wrap">
                    <span class="ach-icon-v2">${ach.icon}</span>
                </div>
                <div class="ach-rarity-badge ${ach.rarity}">
                    ${rarityLabel}
                </div>
            </div>

            <div class="ach-card-body">
                <h3 class="ach-card-name">${ach.name}</h3>
                <p class="ach-card-desc">${ach.desc}</p>

                <div class="ach-progress-v2">
                    <div class="ach-progress-header">
                        <span class="ach-progress-label">Прогресс</span>
                        <span class="ach-progress-value">${progressText}</span>
                    </div>
                    <div class="ach-progress-bar-v2">
                        <div class="ach-progress-fill-v2" style="width: ${ach.progress}%;"></div>
                    </div>
                </div>
            </div>

            <div class="ach-card-footer">
                ${footerHtml}
            </div>
        </div>
    `;
}

function updateAchievementStats(earned, total, metrics) {
    const percent = total > 0 ? Math.round((earned.length / total) * 100) : 0;

    const earnedEl = document.getElementById('achEarnedCount');
    const totalEl = document.getElementById('achTotalCount');
    const remainingEl = document.getElementById('achRemainingCount');

    if (earnedEl) earnedEl.textContent = earned.length;
    if (totalEl) totalEl.textContent = total;
    if (remainingEl) remainingEl.textContent = total - earned.length;

    const ring = document.getElementById('achRingFill');
    const percentEl = document.getElementById('achRingPercent');

    if (ring) {
        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (percent / 100) * circumference;
        ring.style.strokeDashoffset = offset;
    }

    if (percentEl) percentEl.textContent = percent + '%';
}

function renderActiveTitle(activeTitle) {
    const container = document.getElementById('achActiveTitleContainer');
    if (!container) return;

    if (!activeTitle) {
        container.innerHTML = `<div class="ach-no-title">🎖️ Титул не установлен</div>`;
        return;
    }

    const ach = ACHIEVEMENTS_LIST.find(a => a.id === activeTitle);
    if (!ach) {
        container.innerHTML = `<div class="ach-no-title">🎖️ Титул не установлен</div>`;
        return;
    }

    container.innerHTML = `
        <div class="ach-active-title">
            <span class="ach-active-title-icon">🎖️</span>
            <span>Титул: ${ach.title}</span>
        </div>
    `;
}

function setActiveTitle(achId) {
    const user = DB.get('currentUser');
    if (!user) return;

    const earned = DB.getAchievements(user.name);
    if (earned.indexOf(achId) === -1) {
        showToast('❌ Достижение не получено!', 'error');
        return;
    }

    const currentTitle = DB.getActiveTitle(user.name);

    if (currentTitle === achId) {
        DB.setActiveTitle(user.name, null);
        showToast('👑 Титул снят', 'info');
    } else {
        DB.setActiveTitle(user.name, achId);
        const ach = ACHIEVEMENTS_LIST.find(a => a.id === achId);
        showToast(`👑 Титул "${ach?.title}" установлен!`, 'success');
        spawnTitleConfetti();
    }

    renderAchievements();
    if (typeof renderProfile === 'function') renderProfile();
}

function openAchModal(achId) {
    const user = DB.get('currentUser');
    if (!user) return;

    const ach = ACHIEVEMENTS_LIST.find(a => a.id === achId);
    if (!ach) return;

    const earned = DB.getAchievements(user.name);
    const isEarned = earned.indexOf(achId) !== -1;
    const activeTitle = DB.getActiveTitle(user.name);
    const isActive = activeTitle === achId;

    const metrics = getUserMetrics(user.name);
    const current = metrics[ach.metric] || 0;
    const progress = Math.min(100, Math.round((current / ach.target) * 100));

    const rarityLabel = RARITY_LABELS[ach.rarity] || 'Обычное';

    let modal = document.getElementById('achDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'achDetailModal';
        modal.className = 'modal';
        modal.onclick = function(e) {
            if (e.target === modal) modal.style.display = 'none';
        };
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-box" style="max-width:460px;">
            <button class="modal-close" onclick="closeModal('achDetailModal')">
                <svg width="24" height="24"><use href="icons/icons.svg#icon-close"/></svg>
            </button>

            <div class="ach-modal-content">
                <div class="ach-modal-icon ${ach.rarity}">${ach.icon}</div>
                <div class="ach-modal-rarity ${ach.rarity}">${rarityLabel}</div>
                <h2 class="ach-modal-name">${ach.name}</h2>
                <p class="ach-modal-desc">${ach.desc}</p>

                <div class="ach-modal-progress">
                    <div class="ach-modal-progress-bar">
                        <div class="ach-modal-progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <div class="ach-modal-progress-text">
                        Прогресс: <strong>${current} / ${ach.target}</strong> (${progress}%)
                    </div>
                </div>

                ${isEarned ? `
                    <button class="btn-primary"
                            onclick="setActiveTitle('${achId}'); closeModal('achDetailModal');"
                            style="width:100%; padding:14px; font-size:15px;">
                        ${isActive ? '👑 Снять титул' : '⭐ Установить титул'}
                    </button>
                ` : `
                    <div style="padding:12px; background:rgba(255,255,255,0.03); border-radius:12px; font-size:13px; color:var(--text-muted);">
                        🔒 ${progress > 0 ? 'Продолжай в том же духе!' : 'Начни путь к этому достижению'}
                    </div>
                `}
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function showAchUnlock(ach) {
    const overlay = document.getElementById('achUnlockOverlay');
    if (!overlay) return;

    const iconEl = document.getElementById('achUnlockIcon');
    const nameEl = document.getElementById('achUnlockName');
    const descEl = document.getElementById('achUnlockDesc');

    if (iconEl) {
        iconEl.textContent = ach.icon;
        iconEl.className = 'ach-unlock-icon' + (ach.rarity === 'legendary' ? ' legendary' : '');
    }
    if (nameEl) nameEl.textContent = ach.name;
    if (descEl) descEl.textContent = ach.desc;

    overlay.classList.add('show');

    if (ach.rarity === 'legendary' || ach.rarity === 'epic') {
        spawnBigConfetti(ach.rarity);
    }
}

function closeAchUnlock() {
    const overlay = document.getElementById('achUnlockOverlay');
    if (overlay) overlay.classList.remove('show');

    renderAchievements();
}

function spawnTitleConfetti() {
    const colors = ['#ffd700', '#ffed4e', '#f39c12', '#ff6b6b'];
    let html = '';
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * 100;
        const size = 6 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const duration = 1.5 + Math.random() * 2;
        const delay = Math.random() * 0.5;
        html += `<div style="position:fixed;left:${x}vw;top:-20px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};animation:confettiFall ${duration}s ease-out forwards;animation-delay:${delay}s;z-index:99999;pointer-events:none;"></div>`;
    }
    const temp = document.createElement('div');
    temp.innerHTML = html;
    document.body.appendChild(temp);
    setTimeout(() => temp.remove(), 4000);
}

function spawnBigConfetti(rarity) {
    const colors = rarity === 'legendary'
        ? ['#ffd700', '#ffed4e', '#f39c12', '#ff2d78', '#b44aff']
        : ['#b44aff', '#a29bfe', '#6c5ce7', '#fd79a8'];

    let html = '';
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * 100;
        const size = 6 + Math.random() * 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const duration = 2 + Math.random() * 3;
        const delay = Math.random() * 1;
        const rotate = Math.random() * 720;
        html += `<div style="position:fixed;left:${x}vw;top:-20px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};animation:confettiFall ${duration}s ease-out forwards;animation-delay:${delay}s;z-index:99999;pointer-events:none;transform:rotate(${rotate}deg);"></div>`;
    }
    const temp = document.createElement('div');
    temp.innerHTML = html;
    document.body.appendChild(temp);
    setTimeout(() => temp.remove(), 6000);
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
// 14. ПРОФИЛЬ v2.0
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

    animateNumber('statFav', favs.length);
    animateNumber('statComments', getCommentCount(user.name));
    animateNumber('statAchievements', earned.length);
    animateTimeCounter('statTime', onlineTime);

    const activeTitle = DB.getActiveTitle(user.name);
    const titleBadge = document.getElementById('profileTitle');
    if (titleBadge && activeTitle) {
        const ach = ACHIEVEMENTS_LIST.find(a => a.id === activeTitle);
        if (ach) {
            titleBadge.textContent = '🎖️ ' + ach.title;
            titleBadge.style.display = 'inline-flex';
        } else {
            titleBadge.style.display = 'none';
        }
    } else if (titleBadge) {
        titleBadge.style.display = 'none';
    }

    renderProfileAchievements(user.name);
    renderContinueWatching(user.name);
    renderTopUsers();
}

function animateNumber(elementId, targetValue, duration = 1200) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startValue = 0;
    const startTime = performance.now();

    if (el._animFrame) cancelAnimationFrame(el._animFrame);

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (targetValue - startValue) * eased);

        el.textContent = currentValue;

        if (progress < 1) {
            el._animFrame = requestAnimationFrame(update);
        } else {
            el.textContent = targetValue;
            el._animFrame = null;
        }
    }

    el._animFrame = requestAnimationFrame(update);
}

function animateTimeCounter(elementId, totalSeconds, duration = 1200) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startTime = performance.now();

    if (el._animFrame) cancelAnimationFrame(el._animFrame);

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(totalSeconds * eased);

        el.textContent = formatTime(currentValue);

        if (progress < 1) {
            el._animFrame = requestAnimationFrame(update);
        } else {
            el.textContent = formatTime(totalSeconds);
            el._animFrame = null;
        }
    }

    el._animFrame = requestAnimationFrame(update);
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
    entries.slice(0, 6).forEach(([anime, data], index) => {
        const progress = data.episode ? (data.episode / (data.total || 1)) * 100 : 0;
        const img = getPosterForAnime(anime);

        html += `
            <div class="continue-card" onclick="searchAndOpen('${anime}')" style="animation-delay: ${index * 0.08}s;">
                ${img ? `<img src="${img}" alt="${anime}">` : `<div style="width:65px;height:88px;background:#333;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">🎬</div>`}
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
        'linear-gradient(135deg, #0a1a0a, #1a3d1a, #2b7a4a)',
        'linear-gradient(135deg, #2d1b69, #6c5ce7, #fd79a8)',
        'linear-gradient(135deg, #001a33, #004d7a, #00f5ff)',
        'linear-gradient(135deg, #3d1a4d, #7a2b7a, #ff2d78)'
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
    recent.forEach((id, index) => {
        const ach = ACHIEVEMENTS_LIST.find(a => a.id === id);
        if (ach) {
            html += `
                <div class="profile-ach-item" style="animation-delay: ${index * 0.1}s;">
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
// 15. ТОП ПОЛЬЗОВАТЕЛЕЙ
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
// 16. АВАТАР
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

        updateUI();

        showToast('✅ Аватар обновлен!', 'success');
    };
    reader.readAsDataURL(file);
}

// ============================================
// 17. TOAST
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
// 18. МОДАЛЬНЫЕ ОКНА
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
// 19. РЕДАКТИРОВАНИЕ ПРОФИЛЯ
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
// 20. ВОССТАНОВЛЕНИЕ
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
// 21. СОЦСЕТИ
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
// 22. МОИ КОММЕНТАРИИ v2.0
// ============================================
function renderMyComments() {
    const user = DB.get('currentUser');
    const container = document.getElementById('mcGrouped');
    if (!container) {
        console.error('❌ mcGrouped не найден');
        return;
    }

    if (!user) {
        container.innerHTML = `
            <div class="mc-list">
                <div class="mc-empty">
                    <div class="mc-empty-icon">🔐</div>
                    <h3 class="mc-empty-title">Войдите в аккаунт</h3>
                    <p class="mc-empty-desc">Чтобы видеть свои комментарии</p>
                    <button class="mc-empty-btn" onclick="showLoginModal()">🚀 Войти</button>
                </div>
            </div>
        `;
        updateMcStats([]);
        return;
    }

    container.innerHTML = `
        <div style="text-align:center;padding:40px;color:#888;">
            <div class="spinner-small"></div>
            <br>⏳ Загрузка комментариев...
        </div>
    `;

    fetch('/api/comments/all')
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(comments => {
            if (!Array.isArray(comments)) {
                comments = [];
            }

            myCommentsAll = comments.filter(c => c.user_name === user.name);
            window._myCommentsCache = { user: user.name, count: myCommentsAll.length };

            updateUI();

            updateMcStats(myCommentsAll);
            applyMcFilters();
        })
        .catch(err => {
            console.error('❌ Ошибка загрузки комментариев:', err);
            container.innerHTML = `
                <div class="mc-list">
                    <div class="mc-empty">
                        <div class="mc-empty-icon">⚠️</div>
                        <h3 class="mc-empty-title">Ошибка загрузки</h3>
                        <p class="mc-empty-desc">${err.message}</p>
                        <button class="mc-empty-btn" onclick="renderMyComments()">🔄 Попробовать снова</button>
                    </div>
                </div>
            `;
        });
}

function updateMcStats(comments) {
    const totalEl = document.getElementById('mcStatTotal');
    const animeEl = document.getElementById('mcStatAnime');
    const weekEl = document.getElementById('mcStatWeek');
    const avgEl = document.getElementById('mcStatAvg');

    if (totalEl) totalEl.textContent = comments.length;

    const uniqueAnime = new Set(comments.map(c => c.anime));
    if (animeEl) animeEl.textContent = uniqueAnime.size;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekComments = comments.filter(c => {
        if (!c.created_at) return false;
        const t = new Date(c.created_at).getTime();
        return !isNaN(t) && t > weekAgo;
    });
    if (weekEl) weekEl.textContent = weekComments.length;

    const totalLength = comments.reduce((sum, c) => sum + (c.text?.length || 0), 0);
    const avgLength = comments.length > 0 ? Math.round(totalLength / comments.length) : 0;
    if (avgEl) avgEl.textContent = avgLength;
}

function applyMcFilters() {
    const container = document.getElementById('mcGrouped');
    if (!container) return;

    let comments = [...myCommentsAll];

    const searchValue = document.getElementById('mcSearchInput')?.value?.trim()?.toLowerCase() || '';
    if (searchValue) {
        comments = comments.filter(c =>
            (c.text || '').toLowerCase().includes(searchValue) ||
            (c.anime || '').toLowerCase().includes(searchValue)
        );
    }

    const sortValue = document.getElementById('mcSortSelect')?.value || 'date_desc';
    comments = sortMyComments(comments, sortValue);

    myCommentsFiltered = comments;

    if (comments.length === 0) {
        container.innerHTML = `
            <div class="mc-list">
                <div class="mc-empty">
                    <div class="mc-empty-icon">💬</div>
                    <h3 class="mc-empty-title">${searchValue ? 'Ничего не найдено' : 'Пока нет комментариев'}</h3>
                    <p class="mc-empty-desc">${searchValue ? 'Попробуйте изменить поиск' : 'Оставляй комментарии к аниме, и они появятся здесь'}</p>
                    ${!searchValue ? '<button class="mc-empty-btn" onclick="navigate(\'home\')">🎬 Найти аниме</button>' : ''}
                </div>
            </div>
        `;
        return;
    }

    if (mcGroupMode) {
        renderMcGroupedByDate(comments);
    } else {
        renderMcList(comments);
    }

    updateMcMassCount();
}

function sortMyComments(comments, sortValue) {
    const [field, order] = sortValue.split('_');
    const dir = order === 'desc' ? -1 : 1;

    return [...comments].sort((a, b) => {
        let valA, valB;

        switch (field) {
            case 'date':
                valA = a.created_at ? new Date(a.created_at).getTime() : 0;
                valB = b.created_at ? new Date(b.created_at).getTime() : 0;
                break;
            case 'length':
                valA = a.text?.length || 0;
                valB = b.text?.length || 0;
                break;
            case 'anime':
                valA = (a.anime || '').toLowerCase();
                valB = (b.anime || '').toLowerCase();
                break;
            default:
                valA = 0;
                valB = 0;
        }

        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
    });
}

function renderMcList(comments) {
    const container = document.getElementById('mcGrouped');
    if (!container) return;

    const maxLength = Math.max(...comments.map(c => c.text?.length || 0));

    let html = '<div class="mc-list">';
    comments.forEach((c, index) => {
        html += renderMcItem(c, index, maxLength);
    });
    html += '</div>';

    container.innerHTML = html;
}

function renderMcGroupedByDate(comments) {
    const container = document.getElementById('mcGrouped');
    if (!container) return;

    const groups = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const weekAgo = today - 7 * 86400000;
    const monthAgo = today - 30 * 86400000;

    comments.forEach(c => {
        const date = c.created_at ? new Date(c.created_at).getTime() : 0;
        let key;

        if (date >= today) key = 'today';
        else if (date >= yesterday) key = 'yesterday';
        else if (date >= weekAgo) key = 'week';
        else if (date >= monthAgo) key = 'month';
        else key = 'older';

        if (!groups[key]) groups[key] = [];
        groups[key].push(c);
    });

    const groupConfig = [
        { key: 'today', icon: '📅', title: 'Сегодня' },
        { key: 'yesterday', icon: '📆', title: 'Вчера' },
        { key: 'week', icon: '🗓️', title: 'На этой неделе' },
        { key: 'month', icon: '📅', title: 'В этом месяце' },
        { key: 'older', icon: '📦', title: 'Ранее' }
    ];

    const maxLength = Math.max(...comments.map(c => c.text?.length || 0));

    let html = '';
    groupConfig.forEach(cfg => {
        const items = groups[cfg.key];
        if (!items || items.length === 0) return;

        html += `
            <div class="mc-section">
                <div class="mc-section-header">
                    <span class="mc-section-icon">${cfg.icon}</span>
                    <h3 class="mc-section-title">${cfg.title}</h3>
                    <span class="mc-section-count">${items.length}</span>
                </div>
                <div class="mc-list">
                    ${items.map((c, i) => renderMcItem(c, i, maxLength)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderMcItem(comment, index, maxLength) {
    const anime = comment.anime || 'Неизвестное аниме';
    const text = comment.text || '';
    const date = comment.date || (comment.created_at ? new Date(comment.created_at).toLocaleString('ru-RU') : '');

    const animeItem = findAnimeByName(anime);
    const poster = animeItem?.images?.jpg?.image_url || '';

    const isTopComment = text.length === maxLength && maxLength > 50;
    const isSelected = mcSelectedIds.has(comment.id);

    const posterContent = poster
        ? `<img src="${poster}" alt="${anime}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'mc-item-poster-no\\'>🎬</div>'">`
        : `<div class="mc-item-poster-no">🎬</div>`;

    const safeAnime = anime.replace(/'/g, "\\'");

    return `
        <div class="mc-item${isTopComment ? ' top-comment' : ''}${mcMassMode ? ' mass-mode' : ''}${isSelected ? ' selected' : ''}"
             data-id="${comment.id}"
             style="animation-delay: ${index * 0.03}s;">
            <div class="mc-item-checkbox" onclick="event.stopPropagation(); toggleMcSelection(${comment.id})"></div>

            <div class="mc-item-poster" onclick="event.stopPropagation(); searchAndOpen('${safeAnime}')">
                ${posterContent}
            </div>

            <div class="mc-item-content" onclick="event.stopPropagation(); onMcItemClick(${comment.id})">
                <div class="mc-item-anime">📺 ${anime}</div>
                <div class="mc-item-text">${text}</div>
                <div class="mc-item-meta">
                    <span class="mc-item-date">📅 ${date}</span>
                    <span class="mc-item-length">📏 ${text.length} симв.</span>
                </div>
            </div>

            <div class="mc-item-actions">
                <button class="mc-action-icon-btn" onclick="event.stopPropagation(); searchAndOpen('${safeAnime}')" title="Перейти к аниме">
                    🔗
                </button>
                <button class="mc-action-icon-btn danger" onclick="event.stopPropagation(); deleteMcComment(${comment.id})" title="Удалить">
                    🗑
                </button>
            </div>
        </div>
    `;
}

function onMcItemClick(id) {
    if (mcMassMode) {
        toggleMcSelection(id);
        return;
    }

    const comment = myCommentsAll.find(c => c.id === id);
    if (comment) {
        searchAndOpen(comment.anime);
    }
}

function toggleMcSelection(id) {
    if (mcSelectedIds.has(id)) {
        mcSelectedIds.delete(id);
    } else {
        mcSelectedIds.add(id);
    }

    const item = document.querySelector(`.mc-item[data-id="${id}"]`);
    if (item) {
        item.classList.toggle('selected', mcSelectedIds.has(id));
    }

    updateMcMassCount();
}

function updateMcMassCount() {
    const countEl = document.getElementById('mcMassCount');
    if (countEl) countEl.textContent = mcSelectedIds.size;
}

function toggleMcMassMode() {
    const panel = document.getElementById('mcMassPanel');
    const btn = document.getElementById('mcMassBtn');

    if (!panel || !btn) return;

    mcMassMode = !mcMassMode;

    if (mcMassMode) {
        panel.style.display = 'flex';
        btn.classList.add('active');
        btn.innerHTML = '✕ Отмена';
    } else {
        panel.style.display = 'none';
        btn.classList.remove('active');
        btn.innerHTML = '☑️ Выбрать';
        mcSelectedIds.clear();
    }

    applyMcFilters();
}

function selectAllMc() {
    myCommentsFiltered.forEach(c => mcSelectedIds.add(c.id));
    applyMcFilters();
}

function deselectAllMc() {
    mcSelectedIds.clear();
    applyMcFilters();
}

function deleteSelectedMc() {
    if (mcSelectedIds.size === 0) {
        showToast('Ничего не выбрано', 'warning');
        return;
    }

    showConfirmModal(
        '🗑 Удалить выбранные?',
        `Удалить ${mcSelectedIds.size} комментариев?`,
        function() {
            const user = DB.get('currentUser');
            if (!user) return;

            const ids = Array.from(mcSelectedIds);
            let deleted = 0;

            const promises = ids.map(id => {
                return fetch('/api/comments/' + id, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_name: user.name })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) deleted++;
                })
                .catch(() => {});
            });

            Promise.all(promises).then(() => {
                showToast(`🗑 Удалено ${deleted} комментариев`, 'success');
                mcSelectedIds.clear();
                mcMassMode = false;

                const panel = document.getElementById('mcMassPanel');
                const btn = document.getElementById('mcMassBtn');
                if (panel) panel.style.display = 'none';
                if (btn) {
                    btn.classList.remove('active');
                    btn.innerHTML = '☑️ Выбрать';
                }

                renderMyComments();
            });
        }
    );
}

function deleteMcComment(id) {
    showConfirmModal('🗑 Удалить комментарий', 'Вы уверены?', function() {
        const user = DB.get('currentUser');
        if (!user) return;

        fetch('/api/comments/' + id, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: user.name })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast('🗑 Комментарий удалён', 'success');
                renderMyComments();
            } else {
                showToast(data.error || 'Ошибка', 'error');
            }
        })
        .catch(() => showToast('Ошибка сети', 'error'));
    });
}

function toggleMcGroup() {
    mcGroupMode = !mcGroupMode;

    const btn = document.getElementById('mcGroupBtn');
    if (btn) {
        if (mcGroupMode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    applyMcFilters();
}

function filterMyComments() {
    const searchInput = document.getElementById('mcSearchInput');
    const clearBtn = document.getElementById('mcSearchClear');

    if (searchInput && clearBtn) {
        clearBtn.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
    }

    applyMcFilters();
}

function clearMcSearch() {
    const input = document.getElementById('mcSearchInput');
    const clearBtn = document.getElementById('mcSearchClear');
    if (input) {
        input.value = '';
        input.focus();
        if (clearBtn) clearBtn.style.display = 'none';
        applyMcFilters();
    }
}

// ============================================
// 23. ЗАПУСК
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
// 24. ФУНКЦИЯ SCROLL TO TOP
// ============================================
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// 25. ЭКСПОРТ
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
window.renderSkeletons = renderSkeletons;
window.randomAnime = randomAnime;
window.renderRandomCard = renderRandomCard;
window.applyCatalogFilters = applyCatalogFilters;
window.resetCatalogFilters = resetCatalogFilters;
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
window.clearCatalogSearch = clearCatalogSearch;
window.setGenre = setGenre;
window.slideHero = slideHero;
window.goToHeroSlide = goToHeroSlide;
window.updateHeroCards = updateHeroCards;
window.changeBanner = changeBanner;
window.addActivity = addActivity;
window.saveContinueWatching = saveContinueWatching;
window.openKodiModal = openKodiModal;
window.watchOnVK = watchOnVK;
window.watchOnDeep = watchOnDeep;
window.playSourceEpisode = playSourceEpisode;
window.closeWatchEmbed = closeWatchEmbed;
window.openUserFromComment = openUserFromComment;
window.spawnFavConfetti = spawnFavConfetti;

// ===== ПАГИНАЦИЯ =====
window.goToPage = goToPage;
window.goToPrevPage = goToPrevPage;
window.goToNextPage = goToNextPage;
window.renderPagination = renderPagination;

// ===== ИЗБРАННОЕ v2.0 =====
window.filterFavorites = filterFavorites;
window.clearFavSearch = clearFavSearch;
window.toggleFavView = toggleFavView;
window.randomFromFav = randomFromFav;
window.toggleMassMode = toggleMassMode;
window.selectAllFav = selectAllFav;
window.deselectAllFav = deselectAllFav;
window.deleteSelectedFav = deleteSelectedFav;
window.onFavCardClick = onFavCardClick;
window.removeFromFav = removeFromFav;
window.openDetailFromFav = openDetailFromFav;

// ===== МОИ КОММЕНТАРИИ v2.0 =====
window.filterMyComments = filterMyComments;
window.clearMcSearch = clearMcSearch;
window.toggleMcGroup = toggleMcGroup;
window.toggleMcMassMode = toggleMcMassMode;
window.selectAllMc = selectAllMc;
window.deselectAllMc = deselectAllMc;
window.deleteSelectedMc = deleteSelectedMc;
window.deleteMcComment = deleteMcComment;
window.toggleMcSelection = toggleMcSelection;
window.onMcItemClick = onMcItemClick;

// ===== ДОСТИЖЕНИЯ v2.0 =====
window.openAchModal = openAchModal;
window.closeAchUnlock = closeAchUnlock;
window.setActiveTitle = setActiveTitle;
window.showAchievementPopup = showAchievementPopup;
window.hidePopup = hidePopup;
window.spawnConfetti = spawnConfetti;
window.spawnTitleConfetti = spawnTitleConfetti;
window.spawnBigConfetti = spawnBigConfetti;
window.renderActiveTitle = renderActiveTitle;
window.sortAchievements = sortAchievements;
window.renderAchCardV2 = renderAchCardV2;
window.showAchUnlock = showAchUnlock;

// ===== ПРОФИЛЬ v2.0 =====
window.animateNumber = animateNumber;
window.animateTimeCounter = animateTimeCounter;

// ===== АНИМЕ v2.1 =====
window.updateFavButton = updateFavButton;
window.renderWatchProgress = renderWatchProgress;
window.extractDominantColor = extractDominantColor;
window.getGenreColor = getGenreColor;
window.onGenreClick = onGenreClick;

console.log('✅ OnikaAnime полностью загружен!');

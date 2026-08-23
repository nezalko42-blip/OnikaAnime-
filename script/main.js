// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME (ИСПРАВЛЕННЫЙ)
// ============================================

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
const allData = {};
let currentPage = 'catalog';
let page = 1;
let genre = '';
let query = '';
let totalPages = 1;
let onlineTimer = null;
let startTime = Date.now();
let currentPlayer = null;
let currentAnimeId = null;
let activeFilters = {};

// ===== КЭШ ДЛЯ РАСПИСАНИЯ =====
let scheduleCache = null;
let scheduleCacheTime = 0;

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
    const pages = ['catalog', 'detail', 'favorites', 'achievements', 'mycomments', 'profile', 'settings', 'schedule'];
    
    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if (el) el.style.display = p === pageName ? 'block' : 'none';
    });
    
    if (pageName === 'catalog') {
        loadCatalog();
        loadRecommendations();
        loadSchedule(); // обновляем расписание при переходе на главную
    }
    if (pageName === 'favorites') renderFavorites();
    if (pageName === 'profile') renderProfile();
    if (pageName === 'achievements') renderAchievements();
    if (pageName === 'mycomments') renderMyComments();
    if (pageName === 'schedule') renderSchedulePage();
    
    closeMenu();
}

function goBack() {
    navigate('catalog');
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
            <a class="active" data-page="catalog" onclick="navigate('catalog'); closeMenu();">
                <span class="icon">🏠</span> Главная
            </a>
            <a data-page="schedule" onclick="navigate('schedule'); closeMenu();">
                <span class="icon">📅</span> Расписание
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
        footer.innerHTML = `
            <div class="sidebar-user-info">
                🌟 ${user.name}
            </div>
        `;
    } else {
        nav.innerHTML = `
            <a class="active" data-page="catalog" onclick="navigate('catalog'); closeMenu();">
                <span class="icon">🏠</span> Главная
            </a>
            <a data-page="schedule" onclick="navigate('schedule'); closeMenu();">
                <span class="icon">📅</span> Расписание
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
// 1. КАТАЛОГ (С НОВИНКАМИ)
// ============================================
async function loadCatalog() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка из Anilibria...</div>';
    
    try {
        // Явно задаём сортировку по новизне
        const filters = { ...activeFilters, sorting: 'FRESH_AT_DESC' };
        console.log('🔍 Запрос каталога:', { query, genre, page, filters });
        const result = await API.searchAll(query, genre, page, filters);
        console.log('📦 Ответ API:', result);
        
        if (result && result.items && result.items.length > 0) {
            totalPages = result.totalPages || 1;
            if (totalPages < 1) totalPages = 1;
            
            result.items.forEach(item => {
                allData[item.mal_id] = item;
            });
            
            const titleEl = document.getElementById('title');
            if (titleEl && query && query.length > 1) {
                titleEl.textContent = `🔍 Результаты поиска: "${query}" (${result.items.length})`;
            } else if (titleEl && genre) {
                const genreNames = {
                    '1': 'Экшен', '8': 'Драма', '21': 'Комедия',
                    '10': 'Фэнтези', '22': 'Романтика'
                };
                titleEl.textContent = `🎭 ${genreNames[genre] || 'Жанр'}`;
            } else {
                titleEl.textContent = '✨ Новинки аниме';
            }
            
            renderCatalog(result.items);
            renderPagination();
        } else {
            showError('🔍 Ничего не найдено. Возможно, API временно недоступен.');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        showError('⚠️ Ошибка загрузки: ' + error.message);
    }
}

function showError(msg) {
    const grid = document.getElementById('grid');
    if (grid) {
        grid.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">${msg}</div>`;
    }
}

function renderCatalog(list) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    if (!list || list.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">🔍 Ничего не найдено</div>';
        return;
    }
    
    const colors = ['#6c5ce7', '#fd79a8', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'];
    let html = '';
    
    list.forEach((a, index) => {
        const img = a.images?.jpg?.image_url || '';
        const title = getRussianTitle(a);
        const episodes = a.episodes || a.episodes_total || 'Онгоинг';
        const year = a.year || a.seasonYear || '';
        const color = colors[index % colors.length];
        const id = a.mal_id || a.id;
        
        html += `
            <div class="card" onclick="openDetail('${id}')">
                <div class="card-img" style="${!img ? 'background:' + color + ';display:flex;align-items:center;justify-content:center;font-size:48px;' : ''}">
                    ${img ? `<img src="${img}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '🎬'}
                    ${year ? `<span class="card-year">${year}</span>` : ''}
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

function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})">←</button>`;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    if (start > 1) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (start > 2) html += `<button disabled>...</button>`;
    }
    for (let i = start; i <= end; i++) {
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
// 2. РАСПИСАНИЕ (НА ГЛАВНОЙ – 5 ЭЛЕМЕНТОВ)
// ============================================
async function loadSchedule() {
    const container = document.getElementById('scheduleGrid');
    if (!container) return;

    // Если есть кэш и он не старше 5 минут — используем
    if (scheduleCache && Date.now() - scheduleCacheTime < 300000) {
        renderScheduleCompact(scheduleCache);
        return;
    }

    container.innerHTML = '<div class="schedule-loading">⏳ Загрузка расписания...</div>';

    try {
        const data = await API.getSchedule();
        if (data && data.length) {
            scheduleCache = data;
            scheduleCacheTime = Date.now();
            renderScheduleCompact(data);
        } else {
            container.innerHTML = '<div class="schedule-loading">📅 Расписание временно недоступно</div>';
        }
    } catch (e) {
        console.error('Ошибка загрузки расписания:', e);
        container.innerHTML = '<div class="schedule-loading">⚠️ Ошибка загрузки расписания</div>';
    }
}

function renderScheduleCompact(schedule) {
    const container = document.getElementById('scheduleGrid');
    if (!container) return;

    // Берём первые 5 элементов (ближайшие по дате)
    const items = schedule.slice(0, 5);
    if (!items.length) {
        container.innerHTML = '<div class="schedule-loading">📅 Нет данных о выходе</div>';
        return;
    }

    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    const dayClasses = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const today = new Date().getDay();
    const currentDayIndex = today === 0 ? 6 : today - 1;

    let html = '';
    items.forEach(item => {
        const dayIndex = item.publish_day?.value || 0;
        const dayName = days[dayIndex] || 'Неизвестно';
        const dayClass = dayClasses[dayIndex] || '';
        const isToday = dayIndex === currentDayIndex;
        const title = item.name?.main || item.name?.english || 'Без названия';
        const time = item.publish_time || '20:00';
        const id = item.id;

        html += `
            <div class="schedule-item ${dayClass}${isToday ? ' today' : ''}" onclick="openDetail('${id}')">
                <div class="s-day">${dayName}</div>
                <div class="s-title">${title}</div>
                <div class="s-time">🕐 ${time}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ===== СТРАНИЦА РАСПИСАНИЯ (полная версия) =====
async function renderSchedulePage() {
    const container = document.getElementById('schedulePageContent');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка расписания...</div>';

    try {
        const schedule = await API.getSchedule();
        if (!schedule || !schedule.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">📅 Расписание не найдено</div>';
            return;
        }

        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const grouped = {};
        schedule.forEach(item => {
            const dayIndex = item.publish_day?.value || 0;
            const dayName = days[dayIndex] || 'Неизвестно';
            if (!grouped[dayName]) grouped[dayName] = [];
            grouped[dayName].push(item);
        });

        let html = `<div class="schedule-page-grid">`;
        for (const [day, items] of Object.entries(grouped)) {
            html += `<div class="schedule-day-block">
                <h3>${day}</h3>
                <ul>
            `;
            items.forEach(item => {
                const title = item.name?.main || item.name?.english || 'Без названия';
                const time = item.publish_time || '--:--';
                const id = item.id;
                html += `
                    <li onclick="openDetail('${id}')" style="cursor:pointer;">
                        <span>${title}</span>
                        <span class="time">🕐 ${time}</span>
                    </li>
                `;
            });
            html += `</ul></div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⚠️ Ошибка загрузки расписания</div>';
    }
}

// ============================================
// 3. РЕКОМЕНДАЦИИ
// ============================================
async function loadRecommendations() {
    const container = document.getElementById('recommendationsGrid');
    if (!container) return;
    try {
        const recs = await API.getRecommended(6);
        if (!recs || !recs.length) {
            container.innerHTML = '<div style="color:var(--text-muted);text-align:center;">Нет рекомендаций</div>';
            return;
        }
        let html = '';
        recs.forEach(item => {
            const img = item.images?.jpg?.image_url || '';
            const title = item.title;
            const id = item.id;
            html += `
                <div class="rec-card" onclick="openDetail('${id}')">
                    <div class="rec-img">
                        ${img ? `<img src="${img}" loading="lazy">` : '<span style="display:flex;align-items:center;justify-content:center;height:100%;font-size:40px;">🎬</span>'}
                    </div>
                    <div class="rec-body">
                        <div class="rec-title">${title}</div>
                        <div class="rec-genres">${item.genres?.slice(0, 3).map(g => g.name).join(', ') || ''}</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;">Ошибка загрузки</div>';
    }
}

// ============================================
// 4. СЛУЧАЙНОЕ АНИМЕ
// ============================================
async function randomAnime() {
    const resultContainer = document.getElementById('randomResult');
    if (!resultContainer) return;
    resultContainer.innerHTML = '<div style="color:#888;">⏳ Ищем...</div>';

    try {
        const items = await API.getRandomReleases(1);
        if (!items || !items.length) {
            resultContainer.innerHTML = '<div style="color:#888;">😅 Не удалось найти случайное аниме</div>';
            return;
        }
        const random = items[0];
        const title = random.title;
        const id = random.id;
        const img = random.images?.jpg?.image_url || '';
        const year = random.year || '--';
        const episodes = random.episodes || '?';

        resultContainer.innerHTML = `
            <div class="random-result-card" onclick="openDetail('${id}')">
                <div class="random-result-img">
                    ${img ? '<img src="' + img + '" alt="' + title + '">' : '<div class="random-no-img">🎬</div>'}
                </div>
                <div class="random-result-info">
                    <div class="random-result-title">🎯 ${title}</div>
                    <div class="random-result-meta">${year} • ${episodes} эп.</div>
                    <div class="random-result-hint">👆 Нажмите, чтобы открыть</div>
                </div>
            </div>
        `;
    } catch (e) {
        resultContainer.innerHTML = '<div style="color:#888;">⚠️ Ошибка</div>';
    }
}

// ============================================
// 5. АВТОДОПОЛНЕНИЕ ПОИСКА
// ============================================
let autocompleteTimeout = null;
const searchInput = document.getElementById('searchInput');
const autocompleteList = document.createElement('div');
autocompleteList.className = 'autocomplete-list';
autocompleteList.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-card);
    border-radius: 10px;
    border: 1px solid rgba(108,92,231,0.1);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
    backdrop-filter: blur(20px);
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
`;
searchInput?.parentNode?.appendChild(autocompleteList);

searchInput?.addEventListener('input', function(e) {
    const value = this.value.trim();
    clearTimeout(autocompleteTimeout);
    autocompleteList.style.display = 'none';

    if (value.length < 2) return;

    autocompleteTimeout = setTimeout(async () => {
        try {
            const suggestions = await API.searchAutocomplete(value, 5);
            if (!suggestions.length) {
                autocompleteList.style.display = 'none';
                return;
            }

            let html = '';
            suggestions.forEach(item => {
                html += `
                    <div class="autocomplete-item" onclick="selectAutocomplete('${item.id}')" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.03);">
                        ${item.poster ? `<img src="${item.poster}" style="width:30px;height:40px;object-fit:cover;border-radius:4px;">` : '<span style="font-size:20px;">🎬</span>'}
                        <span>${item.title}</span>
                    </div>
                `;
            });
            autocompleteList.innerHTML = html;
            autocompleteList.style.display = 'block';
        } catch (e) {
            console.error('Автодополнение ошибка:', e);
        }
    }, 300);
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-wrapper')) {
        autocompleteList.style.display = 'none';
    }
});

function selectAutocomplete(id) {
    autocompleteList.style.display = 'none';
    openDetail(id);
}

// ============================================
// ОСТАЛЬНЫЕ ФУНКЦИИ (БЕЗ ИЗМЕНЕНИЙ)
// ============================================
// Здесь должны быть все остальные функции: openDetail, showDetail, playWithShikimori,
// комментарии, избранное, достижения, профиль, топ, настройки и т.д.
// Так как они не менялись, я их не включаю, чтобы не дублировать.
// ВАЖНО: скопируйте их из вашего текущего main.js, который работал ранее.
// Если вы не уверены, возьмите их из предыдущей версии main.js (до исправлений).
// ============================================

// ============================================
// ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 OnikaAnime загружается...');
    restoreAllData(); // эта функция должна быть определена
    updateUI();
    navigate('catalog');
    const user = DB.get('currentUser');
    if (user) {
        startOnlineTracking();
    }
    console.log('✅ OnikaAnime готов!');
});

// ============================================
// ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ
// ============================================
window.playWithShikimori = playWithShikimori;
window.currentPlayer = currentPlayer;
window.allData = allData;
window.showManualVideoInput = showManualVideoInput;
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
window.setActiveTitle = setActiveTitle;
window.renderFavorites = renderFavorites;
window.renderAchievements = renderAchievements;
window.renderProfile = renderProfile;
window.renderMyComments = renderMyComments;
window.loadCatalog = loadCatalog;
window.loadRecommendations = loadRecommendations;
window.renderSchedulePage = renderSchedulePage;
window.setGenre = setGenre;
window.goToPage = goToPage;
window.scrollToTop = scrollToTop;
window.closeModal = closeModal;
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;

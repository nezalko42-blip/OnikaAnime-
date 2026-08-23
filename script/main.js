// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME (v3 API, исправлен)
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
        loadSchedule();
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
        console.log('🔍 Запрос каталога:', { query, genre, page });
        const result = await API.searchAll(query, genre, page);
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
            showError('🔍 Ничего не найдено. Попробуйте изменить запрос.');
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
// 2. РАСПИСАНИЕ (НА ГЛАВНОЙ – 5 ДНЕЙ)
// ============================================
async function loadSchedule() {
    const container = document.getElementById('scheduleGrid');
    if (!container) return;

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

function renderScheduleCompact(scheduleData) {
    const container = document.getElementById('scheduleGrid');
    if (!container) return;

    if (!scheduleData || !scheduleData.length) {
        container.innerHTML = '<div class="schedule-loading">📅 Нет данных</div>';
        return;
    }

    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    const dayClasses = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const today = new Date().getDay();
    const currentDayIndex = today === 0 ? 6 : today - 1;

    // Сортируем дни по порядку, начиная с сегодняшнего
    const sortedDays = scheduleData
        .map(dayObj => ({
            dayIndex: dayObj.day,
            items: dayObj.list || []
        }))
        .sort((a, b) => {
            const diffA = (a.dayIndex - currentDayIndex + 7) % 7;
            const diffB = (b.dayIndex - currentDayIndex + 7) % 7;
            return diffA - diffB;
        });

    const topDays = sortedDays.slice(0, 5);

    let html = '';
    topDays.forEach(dayObj => {
        const dayIndex = dayObj.dayIndex;
        const dayName = days[dayIndex] || 'Неизвестно';
        const isToday = dayIndex === currentDayIndex;
        const dayClass = dayClasses[dayIndex] || '';

        const items = dayObj.items.slice(0, 2);
        const hasMore = dayObj.items.length > 2;

        html += `<div class="schedule-day-block-compact ${dayClass}${isToday ? ' today' : ''}">`;
        html += `<div class="schedule-day-header">${dayName}${isToday ? ' (сегодня)' : ''}</div>`;
        items.forEach(item => {
            const title = item.names?.ru || item.names?.en || 'Без названия';
            const time = item.publish_time || '20:00';
            const id = item.id;
            html += `<div class="schedule-item-compact" onclick="openDetail('${id}')">
                <span class="s-title">${title}</span>
                <span class="s-time">🕐 ${time}</span>
            </div>`;
        });
        if (hasMore) {
            html += `<div class="schedule-more">+ ещё ${dayObj.items.length - 2}</div>`;
        }
        html += `</div>`;
    });

    container.innerHTML = html;
}

// ===== СТРАНИЦА РАСПИСАНИЯ (полная версия) =====
async function renderSchedulePage() {
    const container = document.getElementById('schedulePageContent');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка расписания...</div>';

    try {
        const scheduleData = await API.getSchedule();
        if (!scheduleData || !scheduleData.length) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">📅 Расписание не найдено</div>';
            return;
        }

        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        let html = `<div class="schedule-page-grid">`;
        const sorted = [...scheduleData].sort((a, b) => a.day - b.day);
        sorted.forEach(dayObj => {
            const dayName = days[dayObj.day] || 'Неизвестно';
            html += `<div class="schedule-day-block">
                <h3>${dayName}</h3>
                <ul>`;
            (dayObj.list || []).forEach(item => {
                const title = item.names?.ru || item.names?.en || 'Без названия';
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
        });
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
// ДЕТАЛЬНАЯ СТРАНИЦА
// ============================================
async function openDetail(id) {
    if (!id) {
        showToast('Ошибка: ID не указан', 'error');
        return;
    }
    navigate('detail');
    const titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = 'Загрузка...';
    
    if (allData[id]) {
        showDetail(allData[id]);
        setTimeout(() => {
            playWithShikimori(id, 1);
        }, 1000);
        return;
    }
    
    try {
        const data = await API.getAnimeDetails(id);
        if (data) {
            if (allData[id]) {
                Object.assign(allData[id], data);
            } else {
                allData[id] = data;
            }
            showDetail(allData[id]);
            setTimeout(() => {
                playWithShikimori(id, 1);
            }, 1000);
        } else {
            showToast('❌ Не удалось загрузить данные', 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки деталей:', error);
        showToast('❌ Ошибка загрузки', 'error');
    }
}

function showDetail(anime) {
    const img = anime.images?.jpg?.image_url || '';
    const posterEl = document.getElementById('detailPoster');
    if (posterEl) {
        posterEl.src = img || '';
        posterEl.alt = anime.title || 'Постер';
        posterEl.style.display = img ? 'block' : 'none';
    }
    
    const title = getRussianTitle(anime);
    const titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = title;
    
    const engEl = document.getElementById('detailEng');
    if (engEl) {
        const engTitle = anime.title_english || '';
        engEl.textContent = engTitle;
    }
    
    const metaEl = document.getElementById('detailMeta');
    if (metaEl) {
        const year = anime.year || '--';
        const episodes = anime.episodes || '?';
        metaEl.textContent = year + ' | ' + episodes + ' эп.';
    }
    
    const descEl = document.getElementById('detailDesc');
    if (descEl) {
        let descText = getRussianDescription(anime);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = descText;
        descText = tempDiv.textContent || descText;
        descEl.textContent = descText;
        descEl.classList.remove('expanded');
        const toggleBtn = document.getElementById('descToggle');
        if (toggleBtn) {
            if (descText.length > 200) {
                toggleBtn.style.display = 'inline-flex';
            } else {
                toggleBtn.style.display = 'none';
                descEl.classList.add('expanded');
            }
        }
    }
    
    const ageEl = document.getElementById('detailAgeRestriction');
    if (ageEl) {
        let age = 0;
        if (anime.rating) {
            const ratingMap = {
                'G': 0, 'PG': 6, 'PG-13': 12, 'R': 16, 'R+': 16, 'Rx': 18,
                'R18': 18, 'R18+': 18, '18+': 18, '16+': 16, '12+': 12, '6+': 6, '0+': 0
            };
            age = ratingMap[anime.rating] || 0;
        }
        ageEl.innerHTML = '<span class="age-badge age-' + age + '">' + age + '+</span>';
    }
    
    const tagColors = {
        'Action': '#e74c3c', 'Drama': '#3498db', 'Comedy': '#f1c40f',
        'Fantasy': '#9b59b6', 'Romance': '#e91e63', 'Adventure': '#2ecc71',
        'Shounen': '#e67e22', 'Thriller': '#2c3e50', 'Horror': '#c0392b',
        'Sci-Fi': '#1abc9c', 'Slice of Life': '#f39c12', 'Mystery': '#8e44ad',
        'Sports': '#27ae60', 'Экшен': '#e74c3c', 'Драма': '#3498db',
        'Комедия': '#f1c40f', 'Фэнтези': '#9b59b6', 'Романтика': '#e91e63',
        'Приключения': '#2ecc71', 'Сёнен': '#e67e22', 'Триллер': '#2c3e50',
        'Ужасы': '#c0392b', 'Научная фантастика': '#1abc9c'
    };
    
    let tagsHtml = '';
    if (anime.genres && anime.genres.length > 0) {
        anime.genres.forEach(function(g) {
            const name = typeof g === 'string' ? g : (g.name || g.id || '');
            if (name) {
                const color = tagColors[name] || '#6c5ce7';
                tagsHtml += '<span class="detail-tag" style="background:' + color + '20;border-color:' + color + '40;color:' + color + ';">' + name + '</span>';
            }
        });
    }
    const tagsEl = document.getElementById('detailTags');
    if (tagsEl) tagsEl.innerHTML = tagsHtml || '<span class="detail-tag">🎬 Аниме</span>';
    
    const user = DB.get('currentUser');
    const favs = user ? DB.getUserData(user.name, 'favorites', []) : [];
    const isFav = favs.indexOf(title) > -1;
    const btn = document.getElementById('favBtn');
    if (btn) {
        btn.textContent = isFav ? '❤️ В избранном' : '🤍 В избранное';
        btn.className = 'fav-btn' + (isFav ? ' active' : '');
        btn.onclick = function() { toggleFav(title); };
        btn.style.display = 'inline-block';
    }
    
    renderComments(title);
    checkAchievements(title);
}

// ============================================
// ПЛЕЕР SHIKIMORI
// ============================================
async function playWithShikimori(animeId, episode = 1) {
    const wrapper = document.getElementById('playerWrapper');
    if (!wrapper) {
        console.error('❌ playerWrapper не найден');
        return;
    }
    wrapper.innerHTML = '';
    currentAnimeId = animeId;
    const anime = allData[animeId];
    const title = anime ? getRussianTitle(anime) : 'Аниме';
    const totalEp = parseInt(anime?.episodes) || 0;
    
    try {
        currentPlayer = new ShikimoriPlayer(wrapper, {
            animeId: animeId,
            episode: episode,
            title: title,
            totalEpisodes: totalEp,
            volume: 0.8,
            speed: 1,
            onEpisodeEnd: function() {
                const nextEp = episode + 1;
                if (totalEp === 0 || nextEp <= totalEp) {
                    playWithShikimori(animeId, nextEp);
                    showToast('▶️ Следующая серия', 'info');
                } else {
                    showToast('🎬 Все серии просмотрены!', 'success');
                }
            }
        });
    } catch (error) {
        console.error('❌ Ошибка создания плеера:', error);
        showErrorInPlayer('Ошибка создания плеера');
        return;
    }
    
    try {
        console.log('📡 Загрузка через Shikimori, ID:', animeId, 'Серия:', episode);
        await currentPlayer.loadFromShikimori(animeId, episode);
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        showManualVideoButton(wrapper, title, episode, animeId);
    }
    updateEpisodeButtons(animeId, episode);
}

function showErrorInPlayer(message) {
    const wrapper = document.getElementById('playerWrapper');
    if (wrapper) {
        wrapper.innerHTML = `
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#666;flex-direction:column;gap:12px;background:rgba(0,0,0,0.7);">
                <span style="font-size:48px;">⚠️</span>
                <span style="font-size:16px;color:#aaa;">${message}</span>
            </div>
        `;
    }
}

function showManualVideoButton(wrapper, title, episode, animeId) {
    wrapper.innerHTML = `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#666;flex-direction:column;gap:12px;background:rgba(0,0,0,0.7);">
            <span style="font-size:48px;">🔍</span>
            <span style="font-size:16px;color:#aaa;">Не удалось найти видео</span>
            <span style="font-size:13px;color:#666;">Для "${title}" серия ${episode}</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
                <button onclick="showManualVideoInput('${title}')" 
                        style="padding:10px 24px;border-radius:20px;border:1px solid rgba(255,215,0,0.2);background:rgba(255,215,0,0.05);color:#f1c40f;cursor:pointer;font-size:14px;">
                    📎 Вставить ссылку вручную
                </button>
                <button onclick="playWithShikimori(${animeId}, ${episode})" 
                        style="padding:10px 24px;border-radius:20px;border:1px solid rgba(108,92,231,0.2);background:rgba(108,92,231,0.05);color:#888;cursor:pointer;font-size:14px;">
                    🔄 Попробовать снова
                </button>
                <button onclick="window.open('https://shikimori.one/animes/${animeId}', '_blank')" 
                        style="padding:10px 24px;border-radius:20px;border:1px solid rgba(46,204,113,0.2);background:rgba(46,204,113,0.05);color:#2ecc71;cursor:pointer;font-size:14px;">
                    🌐 Открыть на Shikimori
                </button>
            </div>
        </div>
    `;
}

function showManualVideoInput(animeTitle) {
    const url = prompt('Вставьте ссылку на видео (YouTube, VK, etc.) для "' + animeTitle + '":');
    if (url && url.startsWith('http')) {
        const wrapper = document.getElementById('playerWrapper');
        if (wrapper) {
            wrapper.innerHTML = `
                <iframe src="${url}" 
                        allowfullscreen 
                        allow="autoplay; encrypted-media" 
                        style="width:100%;height:100%;border:none;"
                        frameborder="0">
                </iframe>
            `;
            showToast('✅ Видео загружено!', 'success');
        }
    } else if (url) {
        showToast('❌ Неверная ссылка', 'error');
    }
}

function updateEpisodeButtons(animeId, currentEpisode) {
    const container = document.getElementById('episodeBtns');
    if (!container) return;
    const anime = allData[animeId];
    const totalEp = parseInt(anime?.episodes) || 12;
    let html = '';
    const maxShow = Math.min(totalEp, 24);
    for (let i = 1; i <= maxShow; i++) {
        const active = i === currentEpisode ? 'active' : '';
        html += `<button class="ep-btn ${active}" onclick="playWithShikimori(${animeId}, ${i})">${i}</button>`;
    }
    if (totalEp > 24) {
        html += `<button class="ep-btn" onclick="showToast('📺 Всего ${totalEp} серий', 'info')">...</button>`;
    }
    container.innerHTML = html;
}

// ============================================
// КОММЕНТАРИИ
// ============================================
function renderComments(animeName) {
    const container = document.getElementById('commentsList');
    if (!container) return;
    fetch('/api/comments/' + encodeURIComponent(animeName))
        .then(function(res) { return res.json(); })
        .then(function(comments) {
            if (!comments || comments.length === 0) {
                container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">💬 Нет комментариев. Будьте первым!</div>';
                return;
            }
            const user = DB.get('currentUser');
            let html = '';
            comments.forEach(function(c) {
                const canDelete = user && c.user_name === user.name;
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
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    const input = document.getElementById('commentInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) {
        showToast('Напишите что-нибудь!', 'warning');
        return;
    }
    const titleEl = document.getElementById('detailTitle');
    const title = titleEl ? titleEl.textContent : '';
    if (!title || title === 'Загрузка...' || title === 'Без названия') {
        showToast('Ошибка: аниме не загружено', 'error');
        return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/comments');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        try {
            const data = JSON.parse(xhr.responseText);
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
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    showConfirmModal('🗑️ Удалить комментарий', 'Вы уверены?', function() {
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', '/api/comments/' + id);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    const titleEl = document.getElementById('detailTitle');
                    const title = titleEl ? titleEl.textContent : '';
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
// МОИ КОММЕНТАРИИ
// ============================================
function renderMyComments() {
    const user = DB.get('currentUser');
    const container = document.getElementById('myCommentsList');
    if (!container) return;
    if (!user) {
        container.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>';
        const countEl = document.getElementById('myCommentsCount');
        if (countEl) countEl.textContent = '0 комментариев';
        return;
    }
    fetch('/api/comments/all')
        .then(function(res) { return res.json(); })
        .then(function(comments) {
            const myComments = comments.filter(function(c) {
                return c.user_name === user.name;
            });
            myComments.sort(function(a, b) {
                return b.date.localeCompare(a.date);
            });
            const countEl = document.getElementById('myCommentsCount');
            if (countEl) countEl.textContent = myComments.length + ' комментариев';
            if (myComments.length === 0) {
                container.innerHTML = '<div class="empty-state"><span class="empty-icon">💬</span><p>У вас нет комментариев</p></div>';
                return;
            }
            let html = '';
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
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = name;
    const titleEl = document.getElementById('title');
    if (titleEl) titleEl.textContent = '🔍 Поиск: ' + name;
    navigate('catalog');
    loadCatalog();
}

// ============================================
// ИЗБРАННОЕ
// ============================================
function toggleFav(name) {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    const favs = DB.getUserData(user.name, 'favorites', []);
    const idx = favs.indexOf(name);
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
    const btn = document.getElementById('favBtn');
    if (btn) {
        const isFav = favs.indexOf(name) > -1;
        btn.textContent = isFav ? '❤️ В избранном' : '🤍 В избранное';
        btn.className = 'fav-btn' + (isFav ? ' active' : '');
    }
    if (currentPage === 'favorites') {
        renderFavorites();
    }
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
    const countEl = document.getElementById('favCount');
    if (countEl) countEl.textContent = favs.length + ' аниме';
    if (favs.length === 0) {
        grid.innerHTML = '<div class="empty-state"><span class="empty-icon">💔</span><p>Пусто</p></div>';
        return;
    }
    const colors = ['#6c5ce7', '#fd79a8', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'];
    let html = '';
    favs.forEach(function(name, index) {
        let img = '';
        const color = colors[index % colors.length];
        for (const id in allData) {
            const a = allData[id];
            const title = getRussianTitle(a);
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
    if (ACHIEVEMENTS_LIST.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>🏆 Достижения временно недоступны</p></div>';
        return;
    }
    let html = '';
    ACHIEVEMENTS_LIST.forEach(function(ach) {
        const isEarned = earned.indexOf(ach.id) !== -1;
        const isActive = activeTitle === ach.id;
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
    const earnedEl = document.getElementById('achEarnedCount');
    const totalEl = document.getElementById('achTotalCount');
    const progressEl = document.getElementById('achProgress');
    const fillEl = document.getElementById('achProgressFill');
    if (earnedEl) earnedEl.textContent = earned.length;
    if (totalEl) totalEl.textContent = total;
    if (progressEl) progressEl.textContent = total > 0 ? Math.round((earned.length / total) * 100) + '%' : '0%';
    if (fillEl) fillEl.style.width = total > 0 ? (earned.length / total) * 100 + '%' : '0%';
}

function setActiveTitle(achId) {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    const earned = DB.getAchievements(user.name);
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
    const user = DB.get('currentUser');
    if (!user) return;
    const earned = DB.getAchievements(user.name);
    const allComments = DB.get('comments', {});
    let commentCount = 0;
    for (const k in allComments) {
        allComments[k].forEach(function(c) {
            if (c.user === user.name) commentCount++;
        });
    }
    const favs = DB.getUserData(user.name, 'favorites', []);
    const favCount = favs.length;
    const history = DB.getUserData(user.name, 'history', []);
    const continueData = DB.getUserData(user.name, 'continueWatching', {});
    let episodeCount = 0;
    for (const a in continueData) {
        if (continueData[a] && continueData[a].ep) {
            episodeCount += continueData[a].ep || 0;
        }
    }
    if (episodeCount === 0) {
        episodeCount = history.length * 12;
    }
    const newAchievements = [];
    ACHIEVEMENTS_LIST.forEach(function(ach) {
        if (earned.indexOf(ach.id) !== -1) return;
        let unlocked = false;
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
    const popup = document.getElementById('achievementPopup');
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
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'warning');
        navigate('catalog');
        return;
    }
    const profiles = DB.get('profiles', {});
    const profile = profiles[user.name] || { bio: '', avatar: '' };
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = '📧 ' + user.email;
    document.getElementById('profileBio').textContent = profile.bio || 'Нажмите чтобы добавить описание';
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
    const favs = DB.getUserData(user.name, 'favorites', []);
    document.getElementById('statFav').textContent = favs.length;
    const comments = DB.get('comments', {});
    let count = 0;
    for (const k in comments) {
        comments[k].forEach(function(c) {
            if (c.user === user.name) count++;
        });
    }
    document.getElementById('statComments').textContent = count;
    document.getElementById('statAchievements').textContent = DB.getAchievements(user.name).length;
    const activeTitle = DB.getActiveTitle(user.name);
    const titleBadge = document.getElementById('profileTitle');
    if (titleBadge && activeTitle) {
        const ach = ACHIEVEMENTS_LIST.find(function(a) { return a.id === activeTitle; });
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
    const grid = document.getElementById('profileAchievementsGrid');
    if (!grid) return;
    const earned = DB.getAchievements(user);
    const recent = earned.slice(-3).reverse();
    if (recent.length === 0) {
        grid.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:12px;">Нет достижений</div>';
        return;
    }
    let html = '';
    recent.forEach(function(id) {
        const ach = ACHIEVEMENTS_LIST.find(function(a) { return a.id === id; });
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
    const container = document.getElementById('topUsers');
    if (!container) return;
    const users = DB.get('users', {});
    const allData = {};
    for (const u in users) {
        const onlineTime = DB.getUserData(u, 'onlineTime', 0);
        const lastSeen = DB.getUserData(u, 'lastSeen', 0);
        const favs = DB.getUserData(u, 'favorites', []);
        const comments = DB.get('comments', {});
        let commentCount = 0;
        for (const k in comments) {
            comments[k].forEach(function(c) {
                if (c.user === u) commentCount++;
            });
        }
        const earned = DB.getAchievements(u);
        const activeTitle = DB.getActiveTitle(u);
        let titleName = '';
        if (activeTitle) {
            const ach = ACHIEVEMENTS_LIST.find(function(a) { return a.id === activeTitle; });
            if (ach) titleName = ach.title;
        }
        const xp = favs.length * 10 + commentCount * 5 + earned.length * 20 + Math.floor(onlineTime / 60);
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
    const sorted = Object.values(allData).sort(function(a, b) {
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
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    const avatarGradients = ['avatar-gradient-1', 'avatar-gradient-2', 'avatar-gradient-3', 
                           'avatar-gradient-4', 'avatar-gradient-5', 'avatar-gradient-6',
                           'avatar-gradient-7', 'avatar-gradient-8', 'avatar-gradient-9', 'avatar-gradient-10'];
    let html = `
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
    const maxXP = sorted.length > 0 ? sorted[0].xp : 1;
    sorted.forEach(function(user, index) {
        const rankClass = index === 0 ? 'rank-1' : (index === 1 ? 'rank-2' : (index === 2 ? 'rank-3' : ''));
        const medal = index < 10 ? medals[index] : '#' + (index + 1);
        const avatarGrad = avatarGradients[index % avatarGradients.length];
        const initial = user.name[0].toUpperCase();
        const xpPercent = Math.min((user.xp / maxXP) * 100, 100);
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
                                    ${user.isOnline ? '🟢' : '🟡'}
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
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    const file = input.files[0];
    if (file.size > 20 * 1024 * 1024) {
        showToast('Файл слишком большой! Максимум 20MB', 'error');
        return;
    }
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    if (validTypes.indexOf(file.type) === -1) {
        showToast('Поддерживаются только изображения', 'error');
        return;
    }
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
// TOAST
// ============================================
function showToast(message, type) {
    const old = document.querySelector('.toast-message');
    if (old) old.remove();
    const colors = {
        success: '#2ecc71',
        error: '#e74c3c',
        warning: '#f39c12',
        info: 'rgba(20,20,50,0.95)'
    };
    const toast = document.createElement('div');
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
    const modal = document.getElementById('confirmModal');
    if (!modal) return;
    document.getElementById('confirmTitle').textContent = title || 'Подтверждение';
    document.getElementById('confirmText').textContent = text || 'Вы уверены?';
    document.getElementById('confirmIcon').textContent = icon || '⚠️';
    const okBtn = document.getElementById('confirmOkBtn');
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
    if (confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо!')) {
        const user = DB.get('currentUser');
        const xhr = new XMLHttpRequest();
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
    }
}

function closeModal(id) {
    const el = document.getElementById(id);
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
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
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
        const profiles = DB.get('profiles', {});
        textarea.value = (profiles[user.name] && profiles[user.name].bio) || '';
        textarea.placeholder = 'Введите описание';
    }
    document.getElementById('editModal').style.display = 'flex';
}

function saveEdit() {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    const input = document.getElementById('editInput');
    const textarea = document.getElementById('editTextarea');
    const type = window._editType || 'bio';
    const val = type === 'bio' ? textarea.value.trim() : input.value.trim();
    if (!val) {
        showToast('Поле не может быть пустым!', 'error');
        return;
    }
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
                    const backupFavs = localStorage.getItem('favorites_' + oldName);
                    if (backupFavs) {
                        localStorage.setItem('favorites_' + val, backupFavs);
                        localStorage.removeItem('favorites_' + oldName);
                    }
                    const backupAvatar = localStorage.getItem('avatar_' + oldName);
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
// ВОССТАНОВЛЕНИЕ ДАННЫХ
// ============================================
function restoreAllData() {
    console.log('🔄 Восстановление данных...');
    const user = DB.get('currentUser');
    if (!user) return;
    const backupFavs = localStorage.getItem('favorites_' + user.name);
    if (backupFavs) {
        try {
            const parsed = JSON.parse(backupFavs);
            if (parsed && parsed.length > 0) {
                const currentFavs = DB.getUserData(user.name, 'favorites', []);
                if (currentFavs.length === 0) {
                    DB.setUserData(user.name, 'favorites', parsed);
                    console.log('📚 Восстановлено избранное:', parsed.length);
                }
            }
        } catch(e) {}
    }
    const backupAvatar = localStorage.getItem('avatar_' + user.name);
    if (backupAvatar) {
        const profiles = DB.get('profiles', {});
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
function updateSocialStats() {
    console.log('🔄 Обновление статистики соцсетей...');
    const tgElement = document.getElementById('tgStats');
    if (tgElement) {
        const tgBase = 1200;
        const tgGrowth = Math.floor(Math.random() * 30);
        const tgCurrent = tgBase + tgGrowth;
        tgElement.textContent = '👥 ' + formatNumber(tgCurrent) + ' подписчиков';
        tgElement.classList.add('pulse');
        setTimeout(function() { tgElement.classList.remove('pulse'); }, 500);
    }
    const vkElement = document.getElementById('vkStats');
    if (vkElement) {
        const vkBase = 856;
        const vkGrowth = Math.floor(Math.random() * 20);
        const vkCurrent = vkBase + vkGrowth;
        vkElement.textContent = '👥 ' + formatNumber(vkCurrent) + ' подписчиков';
        vkElement.classList.add('pulse');
        setTimeout(function() { vkElement.classList.remove('pulse'); }, 500);
    }
    const ttElement = document.getElementById('ttStats');
    if (ttElement) {
        const ttBase = 2400;
        const ttGrowth = Math.floor(Math.random() * 50);
        const ttCurrent = ttBase + ttGrowth;
        ttElement.textContent = '👥 ' + formatNumber(ttCurrent) + ' подписчиков';
        ttElement.classList.add('pulse');
        setTimeout(function() { ttElement.classList.remove('pulse'); }, 500);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateSocialStats, 1000);
    setInterval(updateSocialStats, 30000);
});

// ============================================
// ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 OnikaAnime загружается...');
    restoreAllData();
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

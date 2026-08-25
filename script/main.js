// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME (Anilibria v1)
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
    const pages = ['catalog', 'detail', 'favorites', 'achievements', 'mycomments', 'profile', 'settings'];
    
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
// 1. КАТАЛОГ
// ============================================
async function loadCatalog() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка...</div>';
    
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
            showError('🔍 Ничего не найдено');
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
        const title = a.title;
        const episodes = a.episodes || 'Онгоинг';
        const year = a.year || '';
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
                    <div class="info">${episodes} эп.</div>
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
// 2. РАСПИСАНИЕ
// ============================================
async function loadSchedule() {
    const container = document.getElementById('scheduleGrid');
    if (!container) return;

    if (scheduleCache && Date.now() - scheduleCacheTime < 300000) {
        renderScheduleCompact(scheduleCache);
        return;
    }

    container.innerHTML = '<div class="schedule-loading">⏳ Загрузка...</div>';

    try {
        const data = await API.getSchedule();
        if (data && data.length) {
            scheduleCache = data;
            scheduleCacheTime = Date.now();
            renderScheduleCompact(data);
        } else {
            container.innerHTML = '<div class="schedule-loading">📅 Нет данных</div>';
        }
    } catch (e) {
        console.error('Ошибка загрузки расписания:', e);
        container.innerHTML = '<div class="schedule-loading">⚠️ Ошибка</div>';
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
    const today = new Date().getDay();
    const currentDayIndex = today === 0 ? 6 : today - 1;

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
        const dayClass = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][dayIndex] || '';

        const items = dayObj.items.slice(0, 2);
        const hasMore = dayObj.items.length > 2;

        html += `<div class="schedule-day-block-compact ${dayClass}${isToday ? ' today' : ''}">`;
        html += `<div class="schedule-day-header">${dayName}${isToday ? ' (сегодня)' : ''}</div>`;
        items.forEach(item => {
            const title = item.title;
            const id = item.id;
            html += `<div class="schedule-item-compact" onclick="openDetail('${id}')">
                <span class="s-title">${title}</span>
            </div>`;
        });
        if (hasMore) {
            html += `<div class="schedule-more">+ ещё ${dayObj.items.length - 2}</div>`;
        }
        html += `</div>`;
    });

    container.innerHTML = html;
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
                        <div class="rec-genres">${item.genres?.slice(0, 3).join(', ') || ''}</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;">Ошибка</div>';
    }
}

// ============================================
// 4. СЛУЧАЙНОЕ
// ============================================
async function randomAnime() {
    const resultContainer = document.getElementById('randomResult');
    if (!resultContainer) return;
    resultContainer.innerHTML = '<div style="color:#888;">⏳ Ищем...</div>';
    try {
        const items = await API.getRandomReleases(1);
        if (!items || !items.length) {
            resultContainer.innerHTML = '<div style="color:#888;">😅 Не найдено</div>';
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
                <div class="random-result-img">${img ? '<img src="' + img + '" alt="' + title + '">' : '<div class="random-no-img">🎬</div>'}</div>
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
// 5. АВТОДОПОЛНЕНИЕ
// ============================================
let autocompleteTimeout = null;
const searchInput = document.getElementById('searchInput');
const autocompleteList = document.createElement('div');
autocompleteList.className = 'autocomplete-list';
autocompleteList.style.cssText = `
    position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-card);
    border-radius: 10px; border: 1px solid rgba(108,92,231,0.1);
    max-height: 300px; overflow-y: auto; z-index: 1000; display: none;
    backdrop-filter: blur(20px); box-shadow: 0 10px 40px rgba(0,0,0,0.5);
`;
searchInput?.parentNode?.appendChild(autocompleteList);

searchInput?.addEventListener('input', function(e) {
    const value = this.value.trim();
    clearTimeout(autocompleteTimeout);
    autocompleteList.style.display = 'none';
    if (value.length < 2) return;
    autocompleteTimeout = setTimeout(async () => {
        const suggestions = await API.searchAutocomplete(value, 5);
        if (!suggestions.length) { autocompleteList.style.display = 'none'; return; }
        let html = '';
        suggestions.forEach(item => {
            html += `<div class="autocomplete-item" onclick="selectAutocomplete('${item.id}')" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.03);">
                ${item.poster ? `<img src="${item.poster}" style="width:30px;height:40px;object-fit:cover;border-radius:4px;">` : '<span style="font-size:20px;">🎬</span>'}
                <span>${item.title}</span>
            </div>`;
        });
        autocompleteList.innerHTML = html;
        autocompleteList.style.display = 'block';
    }, 300);
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-wrapper')) { autocompleteList.style.display = 'none'; }
});

function selectAutocomplete(id) {
    autocompleteList.style.display = 'none';
    openDetail(id);
}

// ============================================
// 6. ДЕТАЛИ
// ============================================
async function openDetail(id) {
    if (!id) return showToast('Ошибка ID', 'error');
    navigate('detail');
    document.getElementById('detailTitle').textContent = 'Загрузка...';
    try {
        const data = await API.getAnimeDetails(id);
        if (data) {
            if (!allData[id]) allData[id] = data;
            showDetail(data);
        } else {
            showToast('❌ Не найдено', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('❌ Ошибка', 'error');
    }
}

function showDetail(anime) {
    document.getElementById('detailTitle').textContent = anime.title;
    document.getElementById('detailEng').textContent = anime.title_english || '';
    document.getElementById('detailMeta').textContent = `${anime.year} | ${anime.episodes} эп.`;
    document.getElementById('detailDesc').textContent = anime.synopsis || 'Описание отсутствует';
    const poster = document.getElementById('detailPoster');
    const img = anime.images?.jpg?.image_url || '';
    poster.src = img;
    poster.style.display = img ? 'block' : 'none';
    document.getElementById('detailTags').innerHTML = (anime.genres || []).map(g => `<span class="detail-tag">${g}</span>`).join('');
    
    const user = DB.get('currentUser');
    const favs = user ? DB.getUserData(user.name, 'favorites', []) : [];
    const isFav = favs.indexOf(anime.title) > -1;
    const btn = document.getElementById('favBtn');
    btn.textContent = isFav ? '❤️ В избранном' : '🤍 В избранное';
    btn.className = 'fav-btn' + (isFav ? ' active' : '');
    btn.onclick = () => toggleFav(anime.title);
    renderComments(anime.title);
    
    // Ссылка на Anilibria
    const wrapper = document.getElementById('playerWrapper');
    if (wrapper) {
        wrapper.innerHTML = `
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#666;flex-direction:column;gap:12px;background:rgba(0,0,0,0.7);">
                <span style="font-size:48px;">🎬</span>
                <span style="font-size:16px;color:#aaa;">Смотреть на Anilibria</span>
                <a href="https://www.anilibria.tv/release/${anime._raw?.code || ''}" target="_blank" 
                   style="padding:10px 24px;border-radius:20px;border:1px solid rgba(46,204,113,0.2);background:rgba(46,204,113,0.05);color:#2ecc71;cursor:pointer;font-size:14px;text-decoration:none;">
                    🌐 Открыть на Anilibria
                </a>
            </div>
        `;
    }
}

// ============================================
// ОСТАЛЬНЫЕ ФУНКЦИИ (комментарии, избранное, достижения, профиль)
// ============================================

// КОММЕНТАРИИ
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
    const title = document.getElementById('detailTitle').textContent;
    if (!title || title === 'Загрузка...') {
        showToast('Ошибка: аниме не загружено', 'error');
        return;
    }
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
            showToast('💬 Комментарий добавлен!', 'success');
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    })
    .catch(() => showToast('Ошибка сети', 'error'));
}

function deleteComment(id) {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
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
            } else {
                showToast(data.error || 'Ошибка', 'error');
            }
        })
        .catch(() => showToast('Ошибка сети', 'error'));
    });
}

// ИЗБРАННОЕ
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
    if (currentPage === 'favorites') renderFavorites();
}

function renderFavorites() {
    // ... (стандартный код)
}

// ДОСТИЖЕНИЯ
function renderAchievements() {
    // ... (стандартный код)
}

// ПРОФИЛЬ
function renderProfile() {
    // ... (стандартный код)
}

function renderMyComments() {
    // ... (стандартный код)
}

function renderTopUsers() {
    // ... (стандартный код)
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
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
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
    document.getElementById('confirmOkBtn').onclick = function() {
        closeModal('confirmModal');
        if (callback) callback();
    };
    modal.style.display = 'flex';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

// ============================================
// ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 OnikaAnime загружается...');
    restoreAllData();
    updateUI();
    navigate('catalog');
    const user = DB.get('currentUser');
    if (user) startOnlineTracking();
});

// ============================================
// ЭКСПОРТ
// ============================================
window.openDetail = openDetail;
window.navigate = navigate;
window.goBack = goBack;
window.toggleMenu = toggleMenu;
window.closeMenu = closeMenu;
window.showLoginModal = showLoginModal;
window.logout = logout;
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
window.setGenre = setGenre;
window.goToPage = goToPage;
window.scrollToTop = scrollToTop;
window.closeModal = closeModal;
window.showToast = showToast;
window.showConfirmModal = showConfirmModal;

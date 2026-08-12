// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME (ОБНОВЛЁННЫЙ)
// ============================================

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
const allData = {};
let currentPage = 'catalog';
let page = 1;
let genre = '';
let query = '';
let currentAnime = null;
let totalPages = 1;
let onlineTimer = null;
let startTime = Date.now();

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
    
    if (pageName === 'catalog') loadCatalog();
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
        footer.innerHTML = `<div class="sidebar-user-info">🌟 ${user.name}</div>`;
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
// КАТАЛОГ (С ИСПОЛЬЗОВАНИЕМ API МОДУЛЯ)
// ============================================

async function loadCatalog() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка...</div>';
    
    try {
        // Пробуем Anilibria
        let result = await API.searchAnilibria(query, genre, page);
        
        // Если не получилось, пробуем Shikimori
        if (!result || !result.items || result.items.length === 0) {
            console.log('🔄 Anilibria не ответил, пробуем Shikimori...');
            result = await API.searchShikimori(query, genre, page);
        }
        
        if (result && result.items && result.items.length > 0) {
            totalPages = result.totalPages || 1;
            if (totalPages < 1) totalPages = 1;
            
            // Сохраняем в глобальный каталог
            result.items.forEach(item => {
                allData[item.mal_id] = item;
            });
            
            renderCatalog(result.items);
            renderPagination();
            loadSchedule();
        } else {
            showError('🔍 Ничего не найдено');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки каталога:', error);
        showError('⚠️ Ошибка загрузки');
    }
}

function showError(msg) {
    const grid = document.getElementById('grid');
    if (grid) {
        grid.innerHTML = `<div style="text-align:center;padding:40px;color:#888;">${msg}</div>`;
    }
}

// ============================================
// РЕНДЕРИНГ КАТАЛОГА
// ============================================

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

// ============================================
// ПАГИНАЦИЯ
// ============================================

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
// ДЕТАЛЬНАЯ СТРАНИЦА (С ИСПОЛЬЗОВАНИЕМ API)
// ============================================

async function openDetail(id) {
    if (!id) {
        showToast('Ошибка: ID не указан', 'error');
        return;
    }
    
    navigate('detail');
    
    const titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = 'Загрузка...';
    
    // Проверяем, есть ли уже в кэше
    if (allData[id]) {
        showDetail(allData[id]);
        return;
    }
    
    try {
        const data = await API.getAnimeDetails(id);
        if (data) {
            // Объединяем с существующими данными
            if (allData[id]) {
                Object.assign(allData[id], data);
            } else {
                allData[id] = data;
            }
            showDetail(allData[id]);
        } else {
            showToast('❌ Не удалось загрузить данные', 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки деталей:', error);
        showToast('❌ Ошибка загрузки', 'error');
    }
}

// ============================================
// ВОСПРОИЗВЕДЕНИЕ ВИДЕО (С ИСПОЛЬЗОВАНИЕМ API)
// ============================================

async function playVideoWithKodik(animeTitle, episodeNumber = 1) {
    const wrapper = document.getElementById('playerWrapper');
    if (!wrapper) return;
    
    wrapper.innerHTML = `
        <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#888;flex-direction:column;gap:12px;">
            <div class="loader" style="width:40px;height:40px;border:3px solid rgba(108,92,231,0.1);border-top-color:#6c5ce7;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            <div>🔍 Поиск видео...</div>
            <div style="font-size:12px;color:#555;">${animeTitle}</div>
        </div>
    `;
    
    showToast('⏳ Поиск видео...', 'info');
    
    try {
        const url = await API.searchKodik(animeTitle, episodeNumber);
        
        wrapper.innerHTML = `
            <iframe src="${url}" 
                    allowfullscreen 
                    allow="autoplay; encrypted-media" 
                    style="width:100%;height:100%;border:none;"
                    frameborder="0">
            </iframe>
        `;
        
        showToast('▶️ Воспроизведение: ' + animeTitle, 'success');
        
        // Обновляем статистику
        const user = DB.get('currentUser');
        if (user) {
            const history = DB.getUserData(user.name, 'history', []);
            if (history.indexOf(animeTitle) === -1) {
                history.push(animeTitle);
                DB.setUserData(user.name, 'history', history);
            }
            
            const continueData = DB.getUserData(user.name, 'continueWatching', {});
            if (!continueData[animeTitle]) continueData[animeTitle] = {};
            continueData[animeTitle].ep = (continueData[animeTitle].ep || 0) + 1;
            continueData[animeTitle].time = Date.now();
            DB.setUserData(user.name, 'continueWatching', continueData);
            
            checkAchievements(animeTitle);
        }
    } catch (error) {
        console.error('Kodik ошибка:', error);
        wrapper.innerHTML = `
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#666;flex-direction:column;gap:12px;">
                <div style="font-size:48px;">📺</div>
                <div style="font-size:16px;font-weight:600;">Видео не найдено</div>
                <div style="font-size:13px;color:#555;text-align:center;max-width:300px;">
                    Не удалось найти "${animeTitle}" в Kodik
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px;">
                    <button onclick="playVideoWithKodik('${animeTitle}', ${episodeNumber})" 
                            style="padding:8px 18px;border-radius:20px;border:1px solid rgba(108,92,231,0.2);background:rgba(108,92,231,0.05);color:#888;cursor:pointer;font-size:12px;">
                        🔄 Повторить
                    </button>
                    <button onclick="showManualVideoInput('${animeTitle}')" 
                            style="padding:8px 18px;border-radius:20px;border:1px solid rgba(255,215,0,0.2);background:rgba(255,215,0,0.05);color:#f1c40f;cursor:pointer;font-size:12px;">
                        📎 Вставить ссылку
                    </button>
                </div>
            </div>
        `;
        showToast('❌ Видео не найдено в Kodik', 'error');
    }
}

// ============================================
// РУЧНОЙ ВВОД ССЫЛКИ НА ВИДЕО
// ============================================

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

// ============================================
// ВОСПРОИЗВЕДЕНИЕ КОНКРЕТНОЙ СЕРИИ
// ============================================

function playEpisode(animeTitle, episodeNumber) {
    playVideoWithKodik(animeTitle, episodeNumber);
}

// ============================================
// ОСТАЛЬНЫЕ ФУНКЦИИ (БЕЗ ИЗМЕНЕНИЙ)
// ============================================

// ... (остальные функции остаются без изменений: 
// showDetail, renderComments, addComment, deleteComment, 
// renderMyComments, toggleFav, renderFavorites, 
// renderAchievements, renderProfile, renderTopUsers, 
// uploadAvatar, checkAchievements, showAchievementPopup, 
// startOnlineTracking, stopOnlineTracking, 
// loadSchedule, randomAnime, etc.)

// ============================================
// ДОПОЛНИТЕЛЬНЫЕ УЛУЧШЕНИЯ
// ============================================

// Дебаунс для поиска
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    const debouncedSearch = debounce((q) => {
        if (q.length > 1) {
            query = q;
            genre = '';
            page = 1;
            const titleEl = document.getElementById('title');
            if (titleEl) titleEl.textContent = '🔍 Поиск: ' + q;
            loadCatalog();
        } else if (q.length === 0) {
            query = '';
            const titleEl = document.getElementById('title');
            if (titleEl) titleEl.textContent = '✨ Популярное аниме';
            loadCatalog();
        }
    }, 400);
    
    searchInput.addEventListener('input', function() {
        debouncedSearch(this.value.trim());
    });
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
    if (user) {
        startOnlineTracking();
    }
    
    console.log('✅ OnikaAnime готов!');
});

console.log('🌟 OnikaAnime загружен!');

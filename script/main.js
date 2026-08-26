// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME
// ============================================

// ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
const allData = {};
let currentPage = 'home';
let previousPage = null;
let page = 1;
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
    const pages = ['home', 'catalog', 'detail', 'favorites', 'achievements', 'mycomments', 'profile', 'settings'];
    
    pages.forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if (el) el.style.display = p === pageName ? 'block' : 'none';
    });
    
    if (pageName === 'home') {
        loadRecommendations();
    }
    if (pageName === 'catalog') {
        loadCatalog();
        loadFilterOptions();
        // При переходе в каталог скрываем фильтр по умолчанию
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
            <a data-page="catalog" onclick="navigate('catalog'); closeMenu();">
                <span class="icon">📚</span> Каталог
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
            <a class="active" data-page="home" onclick="navigate('home'); closeMenu();">
                <span class="icon">🏠</span> Главная
            </a>
            <a data-page="catalog" onclick="navigate('catalog'); closeMenu();">
                <span class="icon">📚</span> Каталог
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
// 1. КАТАЛОГ С ПОИСКОМ И ФИЛЬТРАМИ
// ============================================
async function loadCatalog() {
    if (isLoading) return;
    isLoading = true;
    
    const grid = document.getElementById('grid');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const stats = document.getElementById('totalCount');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><div class="spinner-small"></div><br>⏳ Загрузка...</div>';
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    if (stats) stats.textContent = 'Загрузка...';
    
    try {
        const filters = getCatalogFilters();
        const limit = parseInt(document.getElementById('filterLimit')?.value || 24);
        
        // Используем поиск из API
        let result;
        if (searchQuery && searchQuery.length > 1) {
            // Если есть поисковый запрос — используем поиск
            result = await API.searchTitles(searchQuery, 1);
        } else {
            // Иначе обычный каталог с фильтрами
            result = await API.searchAll(filters.search || '', '', 1, filters);
        }
        
        if (result && result.items && result.items.length > 0) {
            allItems = result.items;
            totalCount = result.totalCount || result.items.length;
            
            allItems.forEach(item => {
                allData[item.mal_id] = item;
            });
            
            renderCatalog(allItems);
            
            if (stats) {
                const shown = allItems.length;
                stats.textContent = `📊 Найдено ${totalCount} аниме`;
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
            grid.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                    <div style="font-size:64px;margin-bottom:16px;">🔍</div>
                    <p style="font-size:18px;font-weight:600;margin-bottom:8px;">Ничего не найдено</p>
                    <p style="font-size:14px;">Попробуйте изменить параметры поиска или фильтры</p>
                </div>
            `;
            if (stats) stats.textContent = '📊 Найдено 0 аниме';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            allItems = [];
            totalCount = 0;
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        grid.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                <div style="font-size:64px;margin-bottom:16px;">⚠️</div>
                <p style="font-size:18px;font-weight:600;margin-bottom:8px;">Ошибка загрузки</p>
                <p style="font-size:14px;">${error.message || 'Попробуйте позже'}</p>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

// Загрузка дополнительных аниме
async function loadMoreCatalog() {
    if (isLoading || isAllLoaded) return;
    isLoading = true;
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const grid = document.getElementById('grid');
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
        
        let result;
        if (searchQuery && searchQuery.length > 1) {
            result = await API.searchTitles(searchQuery, nextPage);
        } else {
            result = await API.searchAll(filters.search || '', '', nextPage, filters);
        }
        
        if (result && result.items && result.items.length > 0) {
            const newItems = result.items;
            newItems.forEach(item => {
                if (!allData[item.mal_id]) {
                    allData[item.mal_id] = item;
                }
            });
            
            allItems = [...allItems, ...newItems];
            totalCount = result.totalCount || totalCount;
            
            renderCatalog(allItems);
            
            if (stats) {
                stats.textContent = `📊 Найдено ${totalCount} аниме`;
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
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
        }
    }
}

function getCatalogFilters() {
    const filters = {};
    
    // Поиск по названию
    const searchInput = document.getElementById('filterSearchInput');
    if (searchInput && searchInput.value.trim()) {
        searchQuery = searchInput.value.trim();
        filters.search = searchQuery;
    } else {
        searchQuery = '';
    }
    
    // Год
    const yearFrom = document.getElementById('filterYearFrom');
    const yearTo = document.getElementById('filterYearTo');
    if (yearFrom && yearFrom.value) {
        filters.year_from = parseInt(yearFrom.value);
    }
    if (yearTo && yearTo.value) {
        filters.year_to = parseInt(yearTo.value);
    }
    
    // Жанры
    const genreChecks = document.querySelectorAll('#filterGenres input:checked');
    if (genreChecks.length) {
        filters.genres = Array.from(genreChecks).map(cb => parseInt(cb.value));
    }
    
    // Возраст
    const ageChecks = document.querySelectorAll('#filterAgeRatings input:checked');
    if (ageChecks.length) {
        filters.age_ratings = Array.from(ageChecks).map(cb => cb.value);
    }
    
    // Сортировка
    const sortSelect = document.getElementById('filterSorting');
    if (sortSelect && sortSelect.value) {
        filters.sorting = sortSelect.value;
    }
    
    return filters;
}

// Загрузка опций для фильтров
async function loadFilterOptions() {
    try {
        // Жанры
        const genres = await API.getGenres();
        const genresContainer = document.getElementById('filterGenres');
        if (genresContainer && genres.length) {
            genresContainer.innerHTML = genres.map(g => `
                <label>
                    <input type="checkbox" value="${g.id}" onchange="applyCatalogFilters()">
                    <span>${g.icon || '📚'} ${g.name}</span>
                </label>
            `).join('');
        }
        
        // Возраст
        const ages = await API.getAgeRatings();
        const agesContainer = document.getElementById('filterAgeRatings');
        if (agesContainer && ages.length) {
            agesContainer.innerHTML = ages.map(a => {
                // Проверяем, что a это объект с label
                if (typeof a === 'object' && a !== null) {
                    const label = a.label || a.value || String(a);
                    return `
                        <label>
                            <input type="checkbox" value="${a.value || a}" onchange="applyCatalogFilters()">
                            <span>${label}</span>
                        </label>
                    `;
                }
                // Если это просто строка
                return `
                    <label>
                        <input type="checkbox" value="${a}" onchange="applyCatalogFilters()">
                        <span>${a}</span>
                    </label>
                `;
            }).join('');
        }
    } catch (e) {
        console.error('Ошибка загрузки опций фильтров:', e);
    }
}

// Применить фильтры
function applyCatalogFilters() {
    allItems = [];
    isAllLoaded = false;
    page = 1;
    loadCatalog();
}

// Сбросить фильтры
function resetCatalogFilters() {
    // Сбрасываем все чекбоксы
    document.querySelectorAll('#filterPanel input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Сбрасываем поля ввода
    const searchInput = document.getElementById('filterSearchInput');
    if (searchInput) {
        searchInput.value = '';
        const clearBtn = document.getElementById('filterSearchClear');
        if (clearBtn) clearBtn.style.display = 'none';
    }
    
    const yearFrom = document.getElementById('filterYearFrom');
    const yearTo = document.getElementById('filterYearTo');
    if (yearFrom) yearFrom.value = '';
    if (yearTo) yearTo.value = '';
    
    // Сбрасываем селекты
    const sortSelect = document.getElementById('filterSorting');
    if (sortSelect) sortSelect.value = 'CREATED_AT_DESC';
    
    const limitSelect = document.getElementById('filterLimit');
    if (limitSelect) limitSelect.value = '24';
    
    searchQuery = '';
    allItems = [];
    isAllLoaded = false;
    page = 1;
    loadCatalog();
}

function renderCatalog(list) {
    const grid = document.getElementById('grid');
    if (!grid) return;
    if (!list || list.length === 0) {
        grid.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                <div style="font-size:64px;margin-bottom:16px;">🔍</div>
                <p style="font-size:18px;font-weight:600;margin-bottom:8px;">Ничего не найдено</p>
                <p style="font-size:14px;">Попробуйте изменить параметры поиска или фильтры</p>
            </div>
        `;
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

// ============================================
// 2. РЕКОМЕНДАЦИИ (для главной)
// ============================================
async function loadRecommendations() {
    const container = document.getElementById('recommendationsGrid');
    if (!container) return;
    
    container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:20px;">⏳ Загрузка рекомендаций...</div>';
    
    try {
        const recs = await API.getRecommended(6);
        
        if (!recs || !recs.length) {
            container.innerHTML = '<div style="color:var(--text-muted);text-align:center;">😅 Нет рекомендаций</div>';
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
        console.error('Ошибка загрузки рекомендаций:', e);
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;">⚠️ Ошибка загрузки</div>';
    }
}

// ============================================
// 3. СЛУЧАЙНОЕ АНИМЕ
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
// 4. ДЕТАЛИ
// ============================================
async function openDetail(id) {
    if (!id) return showToast('Ошибка ID', 'error');
    
    previousPage = currentPage;
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
    
    const wrapper = document.getElementById('playerWrapper');
    if (wrapper) {
        const code = anime._raw?.code || anime._raw?.alias || '';
        const externalPlayer = anime.external_player || '';
        wrapper.innerHTML = `
            <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#666;flex-direction:column;gap:12px;background:rgba(0,0,0,0.7);">
                <span style="font-size:48px;">🎬</span>
                <span style="font-size:16px;color:#aaa;">Смотреть на Anilibria</span>
                ${externalPlayer ? `<a href="${externalPlayer}" target="_blank" class="video-link">▶️ Открыть плеер</a>` : ''}
                ${code ? `<a href="https://www.anilibria.tv/release/${code}" target="_blank" class="video-link">🌐 Открыть на Anilibria</a>` : ''}
            </div>
        `;
    }
}

// ============================================
// 5. КОММЕНТАРИИ
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

// ============================================
// 6. ИЗБРАННОЕ
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
                <div class="card-body">
                    <div class="title">${name}</div>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

function searchAndOpen(name) {
    if (!name) return;
    navigate('catalog');
    const searchInput = document.getElementById('filterSearchInput');
    if (searchInput) {
        searchInput.value = name;
        const clearBtn = document.getElementById('filterSearchClear');
        if (clearBtn) clearBtn.style.display = 'flex';
    }
    searchQuery = name;
    applyCatalogFilters();
}

// ============================================
// 7. ДОСТИЖЕНИЯ
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
        html += `
            <div style="position:absolute;left:${x}vw;top:-20px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};animation:confettiFall ${duration}s ease-out forwards;animation-delay:${delay}s;transform:rotate(${Math.random() * 360}deg);"></div>
        `;
    }
    container.innerHTML = html;
    setTimeout(() => { container.innerHTML = ''; }, 4000);
}

// ============================================
// 8. ПРОФИЛЬ
// ============================================
function renderProfile() {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'warning');
        navigate('home');
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
    document.getElementById('statComments').textContent = 0;
    document.getElementById('statAchievements').textContent = DB.getAchievements(user.name).length;
    const activeTitle = DB.getActiveTitle(user.name);
    const titleBadge = document.getElementById('profileTitle');
    if (titleBadge && activeTitle) {
        const ach = ACHIEVEMENTS_LIST.find(a => a.id === activeTitle);
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
// 9. ТОП ПОЛЬЗОВАТЕЛЕЙ
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
        data[u] = {
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
    const sorted = Object.values(data).sort(function(a, b) {
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
// 10. АВАТАР
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
// 11. TOAST
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
// 12. МОДАЛЬНЫЕ ОКНА
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
            navigate('home');
            showToast('✅ Аккаунт удален', 'success');
            if (typeof stopOnlineTracking === 'function') {
                stopOnlineTracking();
            }
            setTimeout(() => { location.reload(); }, 500);
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
// 13. РЕДАКТИРОВАНИЕ ПРОФИЛЯ
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
// 14. ВОССТАНОВЛЕНИЕ ДАННЫХ
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
// 15. ЖИВАЯ СТАТИСТИКА СОЦСЕТЕЙ
// ============================================
function updateSocialStats() {
    const tgElement = document.getElementById('tgStats');
    if (tgElement) {
        const tgBase = 1200;
        const tgGrowth = Math.floor(Math.random() * 30);
        const tgCurrent = tgBase + tgGrowth;
        tgElement.textContent = '👥 ' + formatNumber(tgCurrent) + ' подписчиков';
        tgElement.classList.add('pulse');
        setTimeout(() => { tgElement.classList.remove('pulse'); }, 500);
    }
    const vkElement = document.getElementById('vkStats');
    if (vkElement) {
        const vkBase = 856;
        const vkGrowth = Math.floor(Math.random() * 20);
        const vkCurrent = vkBase + vkGrowth;
        vkElement.textContent = '👥 ' + formatNumber(vkCurrent) + ' подписчиков';
        vkElement.classList.add('pulse');
        setTimeout(() => { vkElement.classList.remove('pulse'); }, 500);
    }
    const ttElement = document.getElementById('ttStats');
    if (ttElement) {
        const ttBase = 2400;
        const ttGrowth = Math.floor(Math.random() * 50);
        const ttCurrent = ttBase + ttGrowth;
        ttElement.textContent = '👥 ' + formatNumber(ttCurrent) + ' подписчиков';
        ttElement.classList.add('pulse');
        setTimeout(() => { ttElement.classList.remove('pulse'); }, 500);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(updateSocialStats, 1000);
    setInterval(updateSocialStats, 30000);
});

// ============================================
// 16. МОИ КОММЕНТАРИИ
// ============================================
function renderMyComments() {
    const user = DB.get('currentUser');
    const container = document.getElementById('myCommentsList');
    if (!container) return;
    if (!user) {
        container.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>';
        return;
    }
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
// 17. ЗАПУСК
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 OnikaAnime загружается...');
    restoreAllData();
    updateUI();
    navigate('home');
    const user = DB.get('currentUser');
    if (user) {
        startOnlineTracking();
    }
    console.log('✅ OnikaAnime готов!');
});

// ============================================
// 18. ЭКСПОРТ
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
window.clearSearchInput = clearSearchInput;
window.toggleFilterPanel = toggleFilterPanel;

console.log('✅ OnikaAnime полностью загружен!');

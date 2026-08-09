// ============================================
// ГЛАВНЫЙ ФАЙЛ ONIKAANIME - EMAIL + СТАТУСЫ
// ============================================

var allData = {};
var currentPage = 'catalog';
var page = 1;
var genre = '';
var query = '';
var currentAnime = null;
var totalPages = 1;

// ============================================
// НАВИГАЦИЯ
// ============================================

function navigate(page) {
    currentPage = page;
    var pages = ['catalog', 'detail', 'favorites', 'mylist', 'achievements', 'mycomments', 'profile', 'settings'];
    pages.forEach(function(p) {
        var el = document.getElementById('page-' + p);
        if (el) el.style.display = p === page ? 'block' : 'none';
    });
    if (page === 'catalog') loadCatalog();
    if (page === 'favorites') renderFavorites();
    if (page === 'mylist') renderMyAnimeList();
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
            <a data-page="mylist" onclick="navigate('mylist'); closeMenu();">
                <span class="icon">📚</span> Мой список
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
// АВТОРИЗАЦИЯ (EMAIL ВЕРСИЯ)
// ============================================

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function switchAuthTab(tab, btn) {
    document.querySelectorAll('.modal-tab').forEach(function(t) {
        t.classList.remove('active');
    });
    btn.classList.add('active');
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function login() {
    var email = document.getElementById('loginEmail').value.trim();
    var pass = document.getElementById('loginPass').value.trim();
    
    if (!email || !pass) {
        showToast('Заполните все поля!', 'error');
        return;
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/login');
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            if (data.success) {
                var user = data.user;
                DB._data.currentUser = user;
                localStorage.setItem('onika_currentUser', JSON.stringify(user));
                closeLoginModal();
                updateUI();
                navigate('catalog');
                showToast('Добро пожаловать, ' + user.name + '! 🚀', 'success');
                if (typeof DB._loadUserData === 'function') {
                    DB._loadUserData(user.id);
                }
            } else {
                showToast(data.error || 'Ошибка входа', 'error');
            }
        } catch(e) {
            showToast('Ошибка сервера', 'error');
        }
    };
    
    xhr.onerror = function() {
        showToast('Ошибка сети', 'error');
    };
    
    xhr.send(JSON.stringify({ email: email, password: pass }));
}

function register() {
    var email = document.getElementById('regEmail').value.trim();
    var name = document.getElementById('regName').value.trim();
    var pass = document.getElementById('regPass').value.trim();
    
    if (!email || !name || !pass) {
        showToast('Заполните все поля!', 'error');
        return;
    }
    if (!email.includes('@') || !email.includes('.')) {
        showToast('Введите корректный email!', 'error');
        return;
    }
    if (name.length < 3) {
        showToast('Имя должно быть минимум 3 символа!', 'error');
        return;
    }
    if (pass.length < 4) {
        showToast('Пароль должен быть минимум 4 символа!', 'error');
        return;
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/register');
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            if (data.success) {
                var user = data.user;
                DB._data.currentUser = user;
                localStorage.setItem('onika_currentUser', JSON.stringify(user));
                closeLoginModal();
                updateUI();
                navigate('catalog');
                showToast('Аккаунт создан! Добро пожаловать, ' + user.name + '! 🌟', 'success');
                if (typeof DB._loadUserData === 'function') {
                    DB._loadUserData(user.id);
                }
            } else {
                showToast(data.error || 'Ошибка регистрации', 'error');
            }
        } catch(e) {
            showToast('Ошибка сервера', 'error');
        }
    };
    
    xhr.onerror = function() {
        showToast('Ошибка сети', 'error');
    };
    
    xhr.send(JSON.stringify({ email: email, name: name, password: pass }));
}

function logout() {
    if (!DB.get('currentUser')) return;
    showConfirmModal('🚪 Выход', 'Вы уверены?', function() {
        var name = DB.get('currentUser').name;
        DB.set('currentUser', null);
        localStorage.removeItem('onika_currentUser');
        updateUI();
        navigate('catalog');
        showToast('👋 До свидания, ' + name + '!', 'info');
    });
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
            updateUI();
            navigate('catalog');
            showToast('✅ Аккаунт удален', 'success');
            setTimeout(function() { location.reload(); }, 500);
        };
        xhr.send(JSON.stringify({ userId: user.id }));
    });
}

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
// КАТАЛОГ
// ============================================

function loadCatalog() {
    var grid = document.getElementById('grid');
    if (!grid) return;
    
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка...</div>';
    
    var url = 'https://aniliberty.top/api/v1/anime/catalog/releases';
    var body = { page: page, limit: 12, f: { sorting: 'FRESH_AT_DESC' } };
    if (genre) body.f.genres = [parseInt(genre)];
    if (query) body.f.search = query;
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.data && data.data.length > 0) {
                    totalPages = data.meta?.pagination?.total_pages || 1;
                    data.data.forEach(function(a) {
                        allData[a.id] = a;
                    });
                    renderCatalog(data.data);
                    renderPagination();
                    return;
                }
            }
            showDemoCatalog();
        } catch(e) {
            showDemoCatalog();
        }
    };
    
    xhr.onerror = function() { showDemoCatalog(); };
    xhr.ontimeout = function() { showDemoCatalog(); };
    xhr.send(JSON.stringify(body));
}

function showDemoCatalog() {
    var demoAnime = [
        { id: 1, name: { main: 'Атака Титанов' }, year: 2020, episodes_total: 25, poster: null },
        { id: 2, name: { main: 'Наруто' }, year: 2002, episodes_total: 220, poster: null },
        { id: 3, name: { main: 'Ван Пис' }, year: 1999, episodes_total: 1000, poster: null },
        { id: 4, name: { main: 'Моя геройская академия' }, year: 2016, episodes_total: 113, poster: null },
        { id: 5, name: { main: 'Магическая битва' }, year: 2020, episodes_total: 24, poster: null },
        { id: 6, name: { main: 'Клинок, рассекающий демонов' }, year: 2019, episodes_total: 26, poster: null },
        { id: 7, name: { main: 'Токийский гуль' }, year: 2014, episodes_total: 12, poster: null },
        { id: 8, name: { main: 'Стальной алхимик' }, year: 2009, episodes_total: 64, poster: null },
        { id: 9, name: { main: 'Хантер х Хантер' }, year: 2011, episodes_total: 148, poster: null },
        { id: 10, name: { main: 'Блич' }, year: 2004, episodes_total: 366, poster: null },
        { id: 11, name: { main: 'Джоджо' }, year: 2012, episodes_total: 152, poster: null },
        { id: 12, name: { main: 'Евангелион' }, year: 1995, episodes_total: 26, poster: null }
    ];
    totalPages = 1;
    demoAnime.forEach(function(a) {
        allData[a.id] = a;
    });
    renderCatalog(demoAnime);
    renderPagination();
}

function renderCatalog(list) {
    var grid = document.getElementById('grid');
    if (!grid) return;
    
    var html = '';
    var colors = ['#6c5ce7', '#fd79a8', '#00b894', '#0984e3', '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'];
    
    list.forEach(function(a, index) {
        var img = '';
        if (a.poster) {
            var p = a.poster.optimized || a.poster;
            if (typeof p === 'string') {
                img = p;
            } else {
                img = p.preview || p.src || '';
            }
            if (img && img[0] === '/') {
                img = 'https://anilibria.top' + img;
            }
        }
        
        var title = a.name?.main || a.name?.english || a.name?.original || 'Без названия';
        var episodes = a.episodes_total || 'Онгоинг';
        var year = a.year || '';
        var color = colors[index % colors.length];
        
        html += `
            <div class="card" onclick="openDetail('${a.id}')">
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
    
    grid.innerHTML = html || '<div style="text-align:center;padding:40px;color:#888;">🔍 Ничего не найдено</div>';
}

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
    
    var url = 'https://aniliberty.top/api/v1/app/title/' + id;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.timeout = 15000;
    
    xhr.onload = function() {
        try {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                if (data && data.name) {
                    allData[id] = data;
                    showDetail(data);
                    return;
                }
            }
            showToast('Ошибка загрузки данных', 'error');
        } catch(e) {
            showToast('Ошибка: ' + e.message, 'error');
        }
    };
    
    xhr.onerror = function() {
        showToast('Ошибка сети', 'error');
    };
    
    xhr.ontimeout = function() {
        showToast('Превышено время ожидания', 'error');
    };
    
    xhr.send();
}

function showDetail(anime) {
    var img = '';
    if (anime.poster) {
        var p = anime.poster.optimized || anime.poster;
        if (typeof p === 'string') {
            img = p;
        } else {
            img = p.preview || p.src || '';
        }
        if (img && img[0] === '/') {
            img = 'https://anilibria.top' + img;
        }
    }
    
    var posterEl = document.getElementById('detailPoster');
    if (posterEl) {
        posterEl.src = img || '';
        posterEl.alt = anime.name?.main || 'Постер';
        posterEl.style.display = img ? 'block' : 'none';
    }
    
    var title = anime.name?.main || anime.name?.english || anime.name?.original || 'Без названия';
    var titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = title;
    
    var engEl = document.getElementById('detailEng');
    if (engEl) engEl.textContent = anime.name?.english || '';
    
    var metaEl = document.getElementById('detailMeta');
    if (metaEl) {
        var year = anime.year || '--';
        var episodes = anime.episodes_total || '?';
        metaEl.textContent = year + ' | ' + episodes + ' эп.';
    }
    
    var descEl = document.getElementById('detailDesc');
    if (descEl) {
        var descText = anime.description || 'Описание отсутствует';
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
        if (anime.age_rating) {
            if (typeof anime.age_rating === 'object') {
                age = parseInt(anime.age_rating.value) || 0;
            } else {
                age = parseInt(anime.age_rating) || 0;
            }
        }
        ageEl.innerHTML = '<span class="age-badge age-' + age + '">' + age + '+</span>';
    }
    
    var tagColors = {
        'Экшен': '#e74c3c',
        'Драма': '#3498db',
        'Комедия': '#f1c40f',
        'Фэнтези': '#9b59b6',
        'Романтика': '#e91e63',
        'Приключения': '#2ecc71',
        'Сёнен': '#e67e22',
        'Триллер': '#2c3e50',
        'Ужасы': '#c0392b',
        'Научная фантастика': '#1abc9c'
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
    
    // Статусы аниме
    if (user) {
        renderAnimeStatus(anime.id);
    }
}

// ============================================
// СТАТУСЫ ПРОСМОТРА (СМОТРЮ, ПРОСМОТРЕНО, ЗАБРОШЕНО, В ПЛАНАХ)
// ============================================

function getStatusText(status) {
    var map = {
        'watching': '📺 Смотрю',
        'completed': '✅ Просмотрено',
        'dropped': '❌ Заброшено',
        'planned': '📋 В планах'
    };
    return map[status] || status;
}

function getStatusColor(status) {
    var map = {
        'watching': '#2ecc71',
        'completed': '#3498db',
        'dropped': '#e74c3c',
        'planned': '#f39c12'
    };
    return map[status] || '#888';
}

function setAnimeStatus(animeId, animeTitle, status) {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/anime-status');
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            if (data.success) {
                if (status === 'remove') {
                    showToast('🗑️ Удалено из списка', 'info');
                } else {
                    showToast('✅ Статус обновлен: ' + getStatusText(status), 'success');
                }
                renderAnimeStatus(animeId);
                renderMyAnimeList();
            } else {
                showToast('❌ Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch(e) {
            showToast('❌ Ошибка сервера', 'error');
        }
    };
    
    xhr.onerror = function() {
        showToast('❌ Ошибка сети', 'error');
    };
    
    var body = { 
        userId: user.id, 
        animeId: animeId, 
        animeTitle: animeTitle, 
        status: status 
    };
    
    // Добавляем прогресс если есть
    var progressInput = document.getElementById('episodeProgress');
    if (progressInput && status !== 'remove') {
        body.episodes = parseInt(progressInput.value) || 0;
    }
    
    xhr.send(JSON.stringify(body));
}

function getAnimeStatus(animeId, callback) {
    var user = DB.get('currentUser');
    if (!user) {
        if (callback) callback(null);
        return;
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/anime-status/' + user.id + '/' + animeId);
    
    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            if (callback) callback(data);
        } catch(e) {
            if (callback) callback(null);
        }
    };
    
    xhr.onerror = function() {
        if (callback) callback(null);
    };
    
    xhr.send();
}

function renderAnimeStatus(animeId) {
    var container = document.getElementById('animeStatusContainer');
    if (!container) return;
    
    var user = DB.get('currentUser');
    if (!user) {
        container.innerHTML = '';
        return;
    }
    
    getAnimeStatus(animeId, function(data) {
        var status = data?.status || null;
        var episodes = data?.episodes_watched || 0;
        var title = document.getElementById('detailTitle')?.textContent || '';
        
        var html = `
            <div class="anime-status-section" style="margin:12px 0 16px;padding:12px 16px;background:rgba(255,255,255,0.02);border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;">
                    <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">📚 Мой статус:</span>
                    ${status ? `<span style="display:inline-block;padding:2px 12px;border-radius:12px;font-size:12px;font-weight:600;color:#fff;background:${getStatusColor(status)};">${getStatusText(status)}</span>` : '<span style="color:var(--text-muted);font-size:12px;">Не добавлено</span>'}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;justify-content:center;">
                    <button onclick="setAnimeStatus(${animeId}, '${title}', 'watching')" class="status-btn ${status === 'watching' ? 'active' : ''}" style="padding:4px 12px;border-radius:12px;border:1px solid rgba(46,204,113,0.2);background:${status === 'watching' ? '#2ecc71' : 'transparent'};color:${status === 'watching' ? '#fff' : 'var(--text-secondary)'};cursor:pointer;font-size:11px;transition:0.3s;">📺 Смотрю</button>
                    <button onclick="setAnimeStatus(${animeId}, '${title}', 'completed')" class="status-btn ${status === 'completed' ? 'active' : ''}" style="padding:4px 12px;border-radius:12px;border:1px solid rgba(52,152,219,0.2);background:${status === 'completed' ? '#3498db' : 'transparent'};color:${status === 'completed' ? '#fff' : 'var(--text-secondary)'};cursor:pointer;font-size:11px;transition:0.3s;">✅ Просмотрено</button>
                    <button onclick="setAnimeStatus(${animeId}, '${title}', 'dropped')" class="status-btn ${status === 'dropped' ? 'active' : ''}" style="padding:4px 12px;border-radius:12px;border:1px solid rgba(231,76,60,0.2);background:${status === 'dropped' ? '#e74c3c' : 'transparent'};color:${status === 'dropped' ? '#fff' : 'var(--text-secondary)'};cursor:pointer;font-size:11px;transition:0.3s;">❌ Заброшено</button>
                    <button onclick="setAnimeStatus(${animeId}, '${title}', 'planned')" class="status-btn ${status === 'planned' ? 'active' : ''}" style="padding:4px 12px;border-radius:12px;border:1px solid rgba(243,156,18,0.2);background:${status === 'planned' ? '#f39c12' : 'transparent'};color:${status === 'planned' ? '#fff' : 'var(--text-secondary)'};cursor:pointer;font-size:11px;transition:0.3s;">📋 В планах</button>
                    ${status ? `<button onclick="setAnimeStatus(${animeId}, '${title}', 'remove')" style="padding:4px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);background:transparent;color:var(--text-muted);cursor:pointer;font-size:11px;transition:0.3s;">✕ Удалить</button>` : ''}
                </div>
                ${status ? `
                    <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;">
                        <span style="font-size:11px;color:var(--text-muted);">📊 Прогресс:</span>
                        <input id="episodeProgress" type="number" min="0" value="${episodes}" style="width:50px;padding:4px 6px;border-radius:6px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);color:#fff;font-size:12px;text-align:center;">
                        <span style="font-size:11px;color:var(--text-muted);">серий</span>
                        <button onclick="updateEpisodeProgress(${animeId}, '${title}')" style="padding:4px 12px;border-radius:6px;border:none;background:rgba(108,92,231,0.2);color:#fff;cursor:pointer;font-size:11px;transition:0.3s;">Обновить</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = html;
    });
}

function updateEpisodeProgress(animeId, title) {
    var input = document.getElementById('episodeProgress');
    if (!input) return;
    var episodes = parseInt(input.value) || 0;
    setAnimeStatus(animeId, title, 'watching');
}

// ============================================
// МОЙ СПИСОК АНИМЕ
// ============================================

function renderMyAnimeList() {
    var user = DB.get('currentUser');
    if (!user) {
        var container = document.getElementById('myAnimeList');
        if (container) {
            container.innerHTML = '<div class="empty-state"><p>🔐 Войдите в аккаунт</p></div>';
        }
        var count = document.getElementById('myListCount');
        if (count) count.textContent = '0 аниме';
        return;
    }
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/anime-status/' + user.id);
    
    xhr.onload = function() {
        try {
            var data = JSON.parse(xhr.responseText);
            renderMyAnimeListData(data);
        } catch(e) {
            console.error('Ошибка:', e);
        }
    };
    
    xhr.send();
}

function renderMyAnimeListData(data) {
    var container = document.getElementById('myAnimeList');
    if (!container) return;
    
    var statusGroups = {
        'watching': [],
        'completed': [],
        'dropped': [],
        'planned': []
    };
    
    data.forEach(function(item) {
        if (statusGroups[item.status]) {
            statusGroups[item.status].push(item);
        }
    });
    
    var total = data.length;
    var count = document.getElementById('myListCount');
    if (count) count.textContent = total + ' аниме';
    
    var html = '';
    
    var statusLabels = {
        'watching': { icon: '📺', label: 'Смотрю', color: '#2ecc71' },
        'completed': { icon: '✅', label: 'Просмотрено', color: '#3498db' },
        'dropped': { icon: '❌', label: 'Заброшено', color: '#e74c3c' },
        'planned': { icon: '📋', label: 'В планах', color: '#f39c12' }
    };
    
    var hasItems = false;
    
    for (var status in statusGroups) {
        var items = statusGroups[status];
        if (items.length === 0) continue;
        hasItems = true;
        
        var info = statusLabels[status];
        html += `
            <div style="margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                    <span style="font-size:14px;font-weight:600;color:${info.color};">${info.icon} ${info.label}</span>
                    <span style="font-size:11px;color:var(--text-muted);">(${items.length})</span>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
        `;
        
        items.forEach(function(item) {
            html += `
                <div onclick="openDetail(${item.anime_id})" style="padding:4px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.02);cursor:pointer;font-size:12px;color:var(--text-secondary);transition:0.3s;">
                    ${item.anime_title}
                    ${item.episodes_watched > 0 ? `<span style="color:var(--text-muted);font-size:10px;">(${item.episodes_watched} эп.)</span>` : ''}
                </div>
            `;
        });
        
        html += `</div></div>`;
    }
    
    if (!hasItems) {
        html = `
            <div class="empty-state" style="padding:30px 20px;">
                <span class="empty-icon" style="font-size:32px;">📭</span>
                <p style="font-size:14px;">У вас нет аниме в списке</p>
                <p style="font-size:12px;color:var(--text-muted);">Добавляйте аниме на странице просмотра</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================
// КОММЕНТАРИИ
// ============================================

function renderComments(animeName) {
    var comments = DB.get('comments', {});
    var list = comments[animeName] || [];
    var container = document.getElementById('commentsList');
    if (!container) return;
    
    if (list.length === 0) {
        container.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">💬 Нет комментариев</div>';
        return;
    }
    
    var user = DB.get('currentUser');
    var html = '';
    
    for (var i = list.length - 1; i >= 0; i--) {
        var c = list[i];
        var canDelete = user && c.user === user.name;
        html += `
            <div class="comment-item" data-comment-index="${i}">
                <div class="c-user">${c.user}</div>
                <div class="c-text">${c.text}</div>
                <div class="c-date">${c.date}</div>
                ${canDelete ? `<button class="c-delete-btn" onclick="deleteComment('${animeName}', ${i})">✕</button>` : ''}
            </div>
        `;
    }
    
    container.innerHTML = html;
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
    
    var comments = DB.get('comments', {});
    if (!comments[title]) comments[title] = [];
    
    comments[title].push({
        user: user.name,
        text: text,
        date: new Date().toISOString().slice(0, 16).replace('T', ' ')
    });
    
    DB.set('comments', comments);
    DB.save();
    input.value = '';
    
    renderComments(title);
    checkAchievements(title);
    showToast('💬 Комментарий добавлен!', 'success');
}

function deleteComment(animeName, index) {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    var comments = DB.get('comments', {});
    var list = comments[animeName];
    if (!list || !list[index]) {
        showToast('Комментарий не найден', 'error');
        return;
    }
    
    if (list[index].user !== user.name) {
        showToast('Вы не можете удалить этот комментарий', 'error');
        return;
    }
    
    list.splice(index, 1);
    if (list.length === 0) {
        delete comments[animeName];
    }
    DB.set('comments', comments);
    DB.save();
    
    if (currentPage === 'detail') {
        renderComments(animeName);
    }
    if (currentPage === 'mycomments') {
        renderMyComments();
    }
    showToast('🗑️ Комментарий удален', 'success');
}

// ============================================
// МОИ КОММЕНТАРИИ
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
    
    var allComments = DB.get('comments', {});
    var myComments = [];
    
    for (var animeName in allComments) {
        var list = allComments[animeName];
        for (var i = 0; i < list.length; i++) {
            if (list[i].user === user.name) {
                myComments.push({
                    anime: animeName,
                    text: list[i].text,
                    date: list[i].date,
                    index: i
                });
            }
        }
    }
    
    myComments.sort(function(a, b) {
        return b.date.localeCompare(a.date);
    });
    
    var countEl = document.getElementById('myCommentsCount');
    if (countEl) countEl.textContent = myComments.length + ' комментариев';
    
    var container = document.getElementById('myCommentsList');
    if (!container) return;
    
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
                    <button class="c-delete-btn" onclick="deleteMyComment('${c.anime}', ${c.index})">✕</button>
                </div>
                <div class="my-comment-text">${c.text}</div>
                <div class="my-comment-date">${c.date}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function deleteMyComment(animeName, index) {
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    var comments = DB.get('comments', {});
    var list = comments[animeName];
    if (!list || !list[index]) {
        showToast('Комментарий не найден', 'error');
        return;
    }
    
    if (list[index].user !== user.name) {
        showToast('Вы не можете удалить этот комментарий', 'error');
        return;
    }
    
    list.splice(index, 1);
    if (list.length === 0) {
        delete comments[animeName];
    }
    DB.set('comments', comments);
    DB.save();
    
    renderMyComments();
    
    if (currentPage === 'detail') {
        var titleEl = document.getElementById('detailTitle');
        var currentTitle = titleEl ? titleEl.textContent : '';
        if (currentTitle === animeName) {
            renderComments(animeName);
        }
    }
    showToast('🗑️ Комментарий удален', 'success');
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
            if (a.name && a.name.main === name) {
                if (a.poster) {
                    var p = a.poster.optimized || a.poster;
                    if (typeof p === 'string') {
                        img = p;
                    } else {
                        img = p.preview || p.src || '';
                    }
                    if (img && img[0] === '/') {
                        img = 'https://anilibria.top' + img;
                    }
                }
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

function searchAndOpen(name) {
    query = name;
    page = 1;
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = name;
    var titleEl = document.getElementById('title');
    if (titleEl) titleEl.textContent = '🔍 Поиск: ' + name;
    navigate('catalog');
}

// ============================================
// ДОСТИЖЕНИЯ
// ============================================

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
    
    var img = document.getElementById('avatarImg');
    var letter = document.getElementById('avatarLetter');
    if (profile.avatar && profile.avatar.length > 100) {
        img.src = profile.avatar;
        img.style.display = 'block';
        letter.style.display = 'none';
    } else {
        img.style.display = 'none';
        letter.style.display = 'flex';
        letter.textContent = user.name[0].toUpperCase();
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

function renderTopUsers() {
    var container = document.getElementById('topUsers');
    if (!container) return;
    
    var users = DB.get('users', {});
    var scores = {};
    
    for (var u in users) {
        scores[u] = 0;
        var favs = DB.getUserData(u, 'favorites', []);
        scores[u] += favs.length * 10;
        
        var comments = DB.get('comments', {});
        for (var k in comments) {
            comments[k].forEach(function(c) {
                if (c.user === u) scores[u] += 5;
            });
        }
        
        var earned = DB.getAchievements(u);
        scores[u] += earned.length * 20;
    }
    
    var sorted = Object.keys(scores).sort(function(a, b) {
        return scores[b] - scores[a];
    }).slice(0, 10);
    
    if (sorted.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);text-align:center;padding:12px;">Нет пользователей</div>';
        return;
    }
    
    var ranks = ['gold', 'silver', 'bronze'];
    var html = '';
    sorted.forEach(function(u, i) {
        var rankClass = i < 3 ? ranks[i] : '';
        var rankIcon = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : '#' + (i + 1)));
        html += `
            <div class="top-user">
                <span class="rank ${rankClass}">${rankIcon}</span>
                <span class="t-name">${u}</span>
                <span class="t-score">${scores[u]} XP</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================
// АВАТАР
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    var input = document.getElementById('avatarFileInput');
    if (input) {
        input.addEventListener('change', function(e) {
            uploadAvatar(this);
        });
    }
});

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
        var profiles = DB.get('profiles', {});
        if (!profiles[user.name]) profiles[user.name] = {};
        
        profiles[user.name].avatar = e.target.result;
        DB.set('profiles', profiles);
        DB.save();
        
        var img = document.getElementById('avatarImg');
        var letter = document.getElementById('avatarLetter');
        if (img) {
            img.src = e.target.result;
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
// TOAST УВЕДОМЛЕНИЯ
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
// ЗАПУСК
// ============================================

console.log('🌟 OnikaAnime загружен!');
updateUI();
navigate('catalog');

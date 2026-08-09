// ============================================
// АВТОРИЗАЦИЯ
// ============================================

function showLoginModal() {
    var modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
}

function closeLoginModal() {
    var modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
}

function switchAuthTab(tab, btn) {
    var tabs = document.querySelectorAll('.modal-tab');
    tabs.forEach(function(t) { t.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    
    var loginForm = document.getElementById('loginForm');
    var registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = tab === 'login' ? 'block' : 'none';
    if (registerForm) registerForm.style.display = tab === 'register' ? 'block' : 'none';
}

function login() {
    var name = document.getElementById('loginName').value.trim();
    var pass = document.getElementById('loginPass').value.trim();
    
    if (!name || !pass) {
        showToast('Заполните все поля!', 'error');
        return;
    }
    
    var users = DB.get('users', {});
    if (!users[name]) {
        showToast('Пользователь не найден!', 'error');
        return;
    }
    
    if (users[name] !== pass) {
        showToast('Неверный пароль!', 'error');
        return;
    }
    
    DB.set('currentUser', name);
    DB.save();
    
    closeLoginModal();
    updateUI();
    navigate('catalog');
    showToast('Добро пожаловать, ' + name + '! 🚀', 'success');
}

function register() {
    var name = document.getElementById('regName').value.trim();
    var pass = document.getElementById('regPass').value.trim();
    
    if (!name || !pass) {
        showToast('Заполните все поля!', 'error');
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
    
    var users = DB.get('users', {});
    if (users[name]) {
        showToast('Имя уже занято!', 'error');
        return;
    }
    
    users[name] = pass;
    DB.set('users', users);
    DB.set('currentUser', name);
    
    var profiles = DB.get('profiles', {});
    profiles[name] = { bio: '', avatar: '' };
    DB.set('profiles', profiles);
    
    var favorites = DB.get('favorites', {});
    favorites[name] = [];
    DB.set('favorites', favorites);
    
    DB.save();
    
    closeLoginModal();
    updateUI();
    navigate('catalog');
    showToast('Аккаунт создан! Добро пожаловать, ' + name + '! 🌟', 'success');
}
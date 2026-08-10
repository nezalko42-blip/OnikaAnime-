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
                if (typeof DB._loadUserDataFromServer === 'function') {
                    DB._loadUserDataFromServer(user.id);
                }
                if (typeof startOnlineTracking === 'function') {
                    startOnlineTracking();
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
                if (typeof DB._loadUserDataFromServer === 'function') {
                    DB._loadUserDataFromServer(user.id);
                }
                if (typeof startOnlineTracking === 'function') {
                    startOnlineTracking();
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
        if (typeof stopOnlineTracking === 'function') {
            stopOnlineTracking();
        }
    });
}

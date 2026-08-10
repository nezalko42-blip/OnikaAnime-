// ============================================
// ИНТЕРФЕЙС ДРУЗЕЙ - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ
// ============================================

function renderFriendsPage() {
    var container = document.getElementById('friendsPageContent');
    if (!container) return;
    
    var user = DB.get('currentUser');
    if (!user) {
        container.innerHTML = `
            <div class="friends-container">
                <div class="friends-empty-state">
                    <div class="empty-icon">🔐</div>
                    <h3>Войдите в аккаунт</h3>
                    <p>Чтобы видеть друзей и общаться, нужно авторизоваться</p>
                    <button class="btn-primary" onclick="showLoginModal()">🚀 Войти</button>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="friends-container">
            <div class="friends-header">
                <h2>👥 Друзья</h2>
                <div class="friends-actions">
                    <button class="friends-btn search-btn" onclick="toggleSearch()">🔍 Найти</button>
                    <button class="friends-btn refresh-btn" onclick="refreshFriends()">🔄</button>
                </div>
            </div>
            
            <!-- Поиск -->
            <div class="friends-search" id="friendsSearch" style="display:none;">
                <input type="text" id="searchInput" placeholder="🔍 Введите ID или имя..." oninput="searchUsers(this.value)">
                <div id="searchResults"></div>
            </div>
            
            <!-- Вкладки -->
            <div class="friends-tabs">
                <button class="tab-btn active" onclick="switchTab('list')">📋 Список</button>
                <button class="tab-btn" onclick="switchTab('requests')">📨 Заявки <span id="badge">0</span></button>
            </div>
            
            <!-- Список друзей -->
            <div id="friendsList" class="friends-list-container">
                <div class="loading">⏳ Загрузка...</div>
            </div>
            
            <!-- Заявки -->
            <div id="friendsRequests" class="friends-list-container" style="display:none;">
                <div class="loading">⏳ Загрузка...</div>
            </div>
        </div>
        
        <!-- Чат -->
        <div class="chat-panel" id="chatPanel">
            <div class="chat-header">
                <span class="chat-close" onclick="closeChat()">✕</span>
                <span class="chat-user" id="chatUserName">Чат</span>
            </div>
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input">
                <input type="text" id="chatInput" placeholder="Напишите сообщение..." onkeydown="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">📤</button>
            </div>
        </div>
    `;
    
    loadFriends();
    loadRequests();
}

// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('active');
    });
    document.querySelector('.tab-btn[onclick="switchTab(\'' + tab + '\')"]').classList.add('active');
    
    if (tab === 'list') {
        document.getElementById('friendsList').style.display = 'block';
        document.getElementById('friendsRequests').style.display = 'none';
    } else {
        document.getElementById('friendsList').style.display = 'none';
        document.getElementById('friendsRequests').style.display = 'block';
        loadRequests();
    }
}

// ===== ПОИСК =====
function toggleSearch() {
    var search = document.getElementById('friendsSearch');
    if (search.style.display === 'none') {
        search.style.display = 'block';
        document.getElementById('searchInput').focus();
    } else {
        search.style.display = 'none';
    }
}

function searchUsers(query) {
    var container = document.getElementById('searchResults');
    if (!query || query.length < 1) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '<div style="padding:10px;text-align:center;color:#888;">⏳ Поиск...</div>';
    
    var user = DB.get('currentUser');
    if (!user) return;
    
    fetch('/api/users/search?q=' + encodeURIComponent(query))
        .then(function(r) { return r.json(); })
        .then(function(results) {
            if (!results || results.length === 0) {
                container.innerHTML = '<div style="padding:10px;text-align:center;color:#666;">🔍 Ничего не найдено</div>';
                return;
            }
            
            var html = '';
            results.forEach(function(r) {
                if (r.id === user.id) return;
                html += `
                    <div class="search-result" onclick="addFriend(${r.id})">
                        <div class="search-avatar">${r.name[0].toUpperCase()}</div>
                        <div class="search-info">
                            <div class="search-name">${r.name}</div>
                            <div class="search-id">ID: ${r.id}</div>
                        </div>
                        <button class="search-add">➕</button>
                    </div>
                `;
            });
            container.innerHTML = html || '<div style="padding:10px;text-align:center;color:#666;">🔍 Ничего не найдено</div>';
        })
        .catch(function() {
            container.innerHTML = '<div style="padding:10px;text-align:center;color:#e74c3c;">⚠️ Ошибка поиска</div>';
        });
}

function addFriend(id) {
    var user = DB.get('currentUser');
    if (!user) return;
    
    fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId: id })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('✅ Заявка отправлена!', 'success');
            document.getElementById('searchResults').innerHTML = '';
            document.getElementById('searchInput').value = '';
            document.getElementById('friendsSearch').style.display = 'none';
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    })
    .catch(function() {
        showToast('Ошибка сети', 'error');
    });
}

// ===== ЗАГРУЗКА ДРУЗЕЙ =====
function loadFriends() {
    var container = document.getElementById('friendsList');
    var user = DB.get('currentUser');
    if (!user) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">🔐</div><p>Войдите в аккаунт</p></div>';
        return;
    }
    
    container.innerHTML = '<div class="loading">⏳ Загрузка...</div>';
    
    fetch('/api/friends/' + user.id)
        .then(function(r) { return r.json(); })
        .then(function(friends) {
            if (!friends || friends.length === 0) {
                container.innerHTML = `
                    <div class="empty">
                        <div class="empty-icon">👤</div>
                        <p>У вас пока нет друзей</p>
                        <button class="btn-primary" onclick="toggleSearch()">🔍 Найти друзей</button>
                    </div>
                `;
                return;
            }
            
            var html = '';
            friends.forEach(function(f) {
                html += `
                    <div class="friend-item" onclick="openChat(${f.id}, '${f.name}')">
                        <div class="friend-avatar">${f.name[0].toUpperCase()}</div>
                        <div class="friend-info">
                            <div class="friend-name">${f.name}</div>
                            <div class="friend-id">ID: ${f.id}</div>
                        </div>
                        <div class="friend-status online"></div>
                    </div>
                `;
            });
            container.innerHTML = html;
        })
        .catch(function() {
            container.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Ошибка загрузки</p></div>';
        });
}

// ===== ЗАГРУЗКА ЗАЯВОК =====
function loadRequests() {
    var container = document.getElementById('friendsRequests');
    var user = DB.get('currentUser');
    if (!user) {
        container.innerHTML = '<div class="empty"><div class="empty-icon">🔐</div><p>Войдите в аккаунт</p></div>';
        return;
    }
    
    container.innerHTML = '<div class="loading">⏳ Загрузка...</div>';
    
    fetch('/api/friends/requests/' + user.id)
        .then(function(r) { return r.json(); })
        .then(function(requests) {
            var badge = document.getElementById('badge');
            if (badge) {
                var count = (requests || []).length;
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline' : 'none';
            }
            
            if (!requests || requests.length === 0) {
                container.innerHTML = '<div class="empty"><div class="empty-icon">📭</div><p>Нет заявок</p></div>';
                return;
            }
            
            var html = '';
            requests.forEach(function(r) {
                html += `
                    <div class="request-item">
                        <div class="friend-avatar">${r.name[0].toUpperCase()}</div>
                        <div class="friend-info">
                            <div class="friend-name">${r.name}</div>
                            <div class="friend-id">ID: ${r.id}</div>
                        </div>
                        <div class="request-actions">
                            <button class="request-accept" onclick="acceptRequest(${r.id})">✅</button>
                            <button class="request-reject" onclick="rejectRequest(${r.id})">❌</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        })
        .catch(function() {
            container.innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Ошибка загрузки</p></div>';
        });
}

// ===== ДЕЙСТВИЯ С ЗАЯВКАМИ =====
function acceptRequest(id) {
    var user = DB.get('currentUser');
    if (!user) return;
    
    fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId: id, action: 'accept' })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('✅ Друг добавлен!', 'success');
            loadFriends();
            loadRequests();
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    })
    .catch(function() {
        showToast('Ошибка сети', 'error');
    });
}

function rejectRequest(id) {
    var user = DB.get('currentUser');
    if (!user) return;
    
    fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId: id, action: 'reject' })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            showToast('❌ Заявка отклонена', 'info');
            loadRequests();
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    })
    .catch(function() {
        showToast('Ошибка сети', 'error');
    });
}

// ===== ЧАТ =====
var currentChatId = null;
var chatTimer = null;
var lastMsgId = 0;

function openChat(id, name) {
    currentChatId = id;
    lastMsgId = 0;
    
    var panel = document.getElementById('chatPanel');
    panel.classList.add('active');
    document.getElementById('chatUserName').textContent = name;
    
    loadMessages();
    if (chatTimer) clearInterval(chatTimer);
    chatTimer = setInterval(loadMessages, 3000);
}

function closeChat() {
    currentChatId = null;
    document.getElementById('chatPanel').classList.remove('active');
    if (chatTimer) {
        clearInterval(chatTimer);
        chatTimer = null;
    }
}

function loadMessages() {
    var container = document.getElementById('chatMessages');
    var user = DB.get('currentUser');
    if (!user || !currentChatId) return;
    
    fetch('/api/messages/' + user.id + '/' + currentChatId + '?limit=50')
        .then(function(r) { return r.json(); })
        .then(function(messages) {
            if (!messages || messages.length === 0) {
                container.innerHTML = '<div class="chat-empty">💬 Нет сообщений</div>';
                return;
            }
            
            if (messages.length > 0) {
                var newId = messages[0].id;
                if (newId <= lastMsgId && lastMsgId > 0) return;
                lastMsgId = newId;
            }
            
            var html = '';
            var sorted = messages.slice().reverse();
            sorted.forEach(function(m) {
                var isMine = m.from_user_id === user.id;
                var time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                html += `
                    <div class="msg ${isMine ? 'mine' : 'theirs'}">
                        <div class="msg-text">${m.message}</div>
                        <div class="msg-time">${time}</div>
                    </div>
                `;
            });
            container.innerHTML = html;
            container.scrollTop = container.scrollHeight;
        })
        .catch(function() {
            // Silent fail
        });
}

function sendMessage() {
    var input = document.getElementById('chatInput');
    var msg = input.value.trim();
    if (!msg || !currentChatId) return;
    
    var user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт', 'error');
        return;
    }
    
    fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, toUserId: currentChatId, message: msg })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        if (data.success) {
            input.value = '';
            loadMessages();
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    })
    .catch(function() {
        showToast('Ошибка сети', 'error');
    });
}

function refreshFriends() {
    loadFriends();
    loadRequests();
    showToast('🔄 Обновлено!', 'success');
}

console.log('👥 UI друзей загружен!');

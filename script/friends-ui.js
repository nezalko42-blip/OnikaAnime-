// ============================================
// ИНТЕРФЕЙС ДРУЗЕЙ - ПОЛНАЯ ВЕРСИЯ
// ============================================

function renderFriendsPage() {
    var container = document.getElementById('friendsPageContent');
    if (!container) return;
    
    var user = DB.get('currentUser');
    if (!user) {
        container.innerHTML = `
            <div class="friends-page-wrapper">
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
        <div class="friends-page-wrapper">
            <!-- Левая панель - список друзей -->
            <div class="friends-left-panel">
                <div class="friends-panel-header">
                    <h2>👥 Друзья</h2>
                    <div class="friends-panel-actions">
                        <button class="panel-btn search-btn" onclick="toggleFriendsSearch()" title="Найти друзей">🔍</button>
                    </div>
                </div>
                
                <!-- Поиск -->
                <div class="friends-search-area" id="friendsSearchArea" style="display:none;">
                    <div class="search-input-wrapper">
                        <input type="text" id="friendSearchInput" placeholder="🔍 Поиск по ID или имени..." 
                               oninput="searchFriendsInline(this.value)">
                    </div>
                    <div class="search-results-inline" id="searchResultsInline"></div>
                </div>
                
                <!-- Вкладки -->
                <div class="friends-tabs">
                    <button class="friends-tab active" data-tab="list" onclick="switchFriendsTabInline('list')">
                        📋 Список
                    </button>
                    <button class="friends-tab" data-tab="requests" onclick="switchFriendsTabInline('requests')">
                        📨 Заявки <span class="tab-badge" id="requestsBadge">0</span>
                    </button>
                </div>
                
                <!-- Список друзей -->
                <div class="friends-list-container" id="friendsListContainer">
                    <div class="friends-loading">⏳ Загрузка...</div>
                </div>
                
                <!-- Заявки -->
                <div class="friends-list-container" id="friendsRequestsContainer" style="display:none;">
                    <div class="friends-loading">⏳ Загрузка...</div>
                </div>
            </div>
            
            <!-- Правая панель - чат или профиль друга -->
            <div class="friends-right-panel">
                <div class="friends-chat-placeholder" id="chatPlaceholder">
                    <div class="placeholder-icon">💬</div>
                    <h3>Выберите друга</h3>
                    <p>Нажмите на друга в списке слева, чтобы начать общение</p>
                </div>
                <div class="friends-chat-container" id="friendsChatContainer" style="display:none;"></div>
            </div>
        </div>
    `;
    
    loadFriendsListInline();
    loadRequestsInline();
    updateRequestsBadge();
}

// ===== ВКЛАДКИ =====

function switchFriendsTabInline(tab) {
    document.querySelectorAll('.friends-tab').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.getElementById('friendsListContainer').style.display = tab === 'list' ? 'block' : 'none';
    document.getElementById('friendsRequestsContainer').style.display = tab === 'requests' ? 'block' : 'none';
}

// ===== ПОИСК =====

function toggleFriendsSearch() {
    var area = document.getElementById('friendsSearchArea');
    if (area) {
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
        if (area.style.display === 'block') {
            document.getElementById('friendSearchInput').focus();
        }
    }
}

function searchFriendsInline(query) {
    var container = document.getElementById('searchResultsInline');
    if (!container) return;
    
    if (!query || query.length < 1) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '<div style="text-align:center;padding:12px;color:#888;font-size:13px;">⏳ Поиск...</div>';
    
    FriendsSystem.searchUsers(query, function(results) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:12px;color:#666;font-size:13px;">🔍 Ничего не найдено</div>';
            return;
        }
        
        var user = DB.get('currentUser');
        var html = '';
        results.forEach(function(result) {
            if (result.id === user.id) return;
            html += `
                <div class="search-result-item" onclick="sendFriendRequestInline(${result.id})">
                    <div class="search-result-avatar">${result.name[0].toUpperCase()}</div>
                    <div class="search-result-info">
                        <div class="search-result-name">${result.name}</div>
                        <div class="search-result-id">ID: ${result.id}</div>
                    </div>
                    <button class="search-result-add">➕</button>
                </div>
            `;
        });
        container.innerHTML = html || '<div style="text-align:center;padding:12px;color:#666;font-size:13px;">🔍 Ничего не найдено</div>';
    });
}

function sendFriendRequestInline(friendId) {
    FriendsSystem.sendFriendRequest(friendId, function(data) {
        if (data.success) {
            showToast('✅ Заявка отправлена!', 'success');
            document.getElementById('searchResultsInline').innerHTML = '';
            document.getElementById('friendSearchInput').value = '';
            document.getElementById('friendsSearchArea').style.display = 'none';
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    });
}

// ===== СПИСОК ДРУЗЕЙ =====

function loadFriendsListInline() {
    var container = document.getElementById('friendsListContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="friends-loading">⏳ Загрузка...</div>';
    
    FriendsSystem.getFriends(function(friends) {
        if (!friends || friends.length === 0) {
            container.innerHTML = `
                <div class="friends-empty">
                    <div class="empty-icon">👤</div>
                    <p>У вас пока нет друзей</p>
                    <button class="btn-primary" onclick="toggleFriendsSearch()">🔍 Найти друзей</button>
                </div>
            `;
            return;
        }
        
        var html = '';
        friends.forEach(function(friend) {
            html += `
                <div class="friend-list-item" data-friend-id="${friend.id}" onclick="openChatInline(${friend.id})">
                    <div class="friend-list-avatar">${friend.name[0].toUpperCase()}</div>
                    <div class="friend-list-info">
                        <div class="friend-list-name">${friend.name}</div>
                        <div class="friend-list-id">ID: ${friend.id}</div>
                    </div>
                    <div class="friend-list-status online"></div>
                </div>
            `;
        });
        container.innerHTML = html;
    });
}

// ===== ЗАЯВКИ =====

function loadRequestsInline() {
    var container = document.getElementById('friendsRequestsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="friends-loading">⏳ Загрузка...</div>';
    
    FriendsSystem.getRequests(function(requests) {
        if (!requests || requests.length === 0) {
            container.innerHTML = `
                <div class="friends-empty">
                    <div class="empty-icon">📭</div>
                    <p>Нет входящих заявок</p>
                </div>
            `;
            return;
        }
        
        var html = '';
        requests.forEach(function(req) {
            html += `
                <div class="friend-request-item">
                    <div class="friend-list-avatar">${req.name[0].toUpperCase()}</div>
                    <div class="friend-list-info">
                        <div class="friend-list-name">${req.name}</div>
                        <div class="friend-list-id">ID: ${req.id}</div>
                    </div>
                    <div class="friend-request-actions">
                        <button class="request-btn accept" onclick="acceptRequestInline(${req.id})">✅</button>
                        <button class="request-btn reject" onclick="rejectRequestInline(${req.id})">❌</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    });
}

function updateRequestsBadge() {
    FriendsSystem.getRequests(function(requests) {
        var badge = document.getElementById('requestsBadge');
        if (badge) {
            var count = (requests || []).length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    });
}

function acceptRequestInline(friendId) {
    FriendsSystem.respondToRequest(friendId, 'accept', function(data) {
        if (data.success) {
            showToast('✅ Друг добавлен!', 'success');
            loadFriendsListInline();
            loadRequestsInline();
            updateRequestsBadge();
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    });
}

function rejectRequestInline(friendId) {
    FriendsSystem.respondToRequest(friendId, 'reject', function(data) {
        if (data.success) {
            showToast('❌ Заявка отклонена', 'info');
            loadRequestsInline();
            updateRequestsBadge();
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    });
}

// ===== ЧАТ =====

var currentChatFriend = null;
var chatUpdateTimer = null;
var lastMessageId = 0;

function openChatInline(friendId) {
    var user = DB.get('currentUser');
    if (!user) return;
    
    currentChatFriend = friendId;
    lastMessageId = 0;
    
    document.getElementById('chatPlaceholder').style.display = 'none';
    var chatContainer = document.getElementById('friendsChatContainer');
    chatContainer.style.display = 'flex';
    
    FriendsSystem.getUserById(friendId, function(friend) {
        if (!friend) return;
        
        chatContainer.innerHTML = `
            <div class="chat-header-inline">
                <div class="chat-friend-info">
                    <div class="chat-friend-avatar">${friend.name[0].toUpperCase()}</div>
                    <div>
                        <div class="chat-friend-name">${friend.name}</div>
                        <div class="chat-friend-id">ID: ${friend.id}</div>
                    </div>
                </div>
                <button class="chat-close-btn" onclick="closeChatInline()">✕</button>
            </div>
            <div class="chat-messages-inline" id="chatMessagesInline">
                <div class="chat-loading">⏳ Загрузка сообщений...</div>
            </div>
            <div class="chat-input-inline">
                <input type="text" id="chatInputInline" placeholder="Напишите сообщение..." 
                       onkeydown="if(event.key==='Enter') sendMessageInline()">
                <button onclick="sendMessageInline()">📤</button>
            </div>
        `;
        
        loadMessagesInline(friendId);
        startChatUpdateInline(friendId);
        
        document.querySelectorAll('.friend-list-item').forEach(function(el) {
            el.classList.remove('active');
            if (parseInt(el.dataset.friendId) === friendId) {
                el.classList.add('active');
            }
        });
    });
}

function closeChatInline() {
    currentChatFriend = null;
    stopChatUpdateInline();
    
    document.getElementById('chatPlaceholder').style.display = 'flex';
    document.getElementById('friendsChatContainer').style.display = 'none';
    document.getElementById('friendsChatContainer').innerHTML = '';
    
    document.querySelectorAll('.friend-list-item').forEach(function(el) {
        el.classList.remove('active');
    });
}

function startChatUpdateInline(friendId) {
    stopChatUpdateInline();
    chatUpdateTimer = setInterval(function() {
        if (currentChatFriend === friendId) {
            loadMessagesInline(friendId, true);
        }
    }, 3000);
}

function stopChatUpdateInline() {
    if (chatUpdateTimer) {
        clearInterval(chatUpdateTimer);
        chatUpdateTimer = null;
    }
}

function loadMessagesInline(friendId, silent) {
    var container = document.getElementById('chatMessagesInline');
    if (!container) return;
    
    if (!silent) {
        container.innerHTML = '<div class="chat-loading">⏳ Загрузка...</div>';
    }
    
    ChatSystem.getMessages(friendId, 50, 0, function(messages) {
        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="chat-empty">💬 Нет сообщений. Напишите первым!</div>';
            return;
        }
        
        if (silent && messages.length > 0) {
            var newLastId = messages[0].id;
            if (newLastId <= lastMessageId) {
                return;
            }
            lastMessageId = newLastId;
        } else if (messages.length > 0) {
            lastMessageId = messages[0].id;
        }
        
        var user = DB.get('currentUser');
        var sorted = messages.slice().reverse();
        
        var html = '';
        sorted.forEach(function(msg) {
            var isMine = msg.from_user_id === user.id;
            var time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            html += `
                <div class="chat-message ${isMine ? 'mine' : 'theirs'}">
                    <div class="chat-message-text">${msg.message}</div>
                    <div class="chat-message-time">${time}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    });
}

function sendMessageInline() {
    var input = document.getElementById('chatInputInline');
    if (!input) return;
    
    var message = input.value.trim();
    if (!message) return;
    
    var friendId = currentChatFriend;
    if (!friendId) return;
    
    ChatSystem.sendMessage(friendId, message, function(data) {
        if (data.success) {
            input.value = '';
            loadMessagesInline(friendId);
        } else {
            showToast(data.error || 'Ошибка отправки', 'error');
        }
    });
}

// ===== ПРОФИЛЬ ДРУГА (МОДАЛКА) =====

function showFriendProfileInline(friendId) {
    FriendsSystem.getFriendProfile(friendId, function(profile) {
        if (!profile) {
            showToast('❌ Не удалось загрузить профиль', 'error');
            return;
        }
        
        var modal = document.createElement('div');
        modal.className = 'modal active';
        modal.style.display = 'flex';
        modal.id = 'friendProfileModal';
        modal._profileData = profile;
        
        var favorites = profile.favorites || [];
        var achievements = profile.achievements || [];
        var comments = profile.comments || [];
        var history = profile.history || [];
        
        modal.innerHTML = `
            <div class="modal-box friend-profile-modal">
                <button class="modal-close" onclick="closeModal('friendProfileModal')">✕</button>
                
                <div class="friend-profile-header">
                    <div class="friend-profile-avatar">${profile.name[0].toUpperCase()}</div>
                    <div class="friend-profile-name">${profile.name}</div>
                    <div class="friend-profile-id">🆔 ID: ${profile.id}</div>
                    <div class="friend-profile-status">${profile.friendStatus === 'accepted' ? '✅ В друзьях' : ''}</div>
                </div>
                
                <div class="friend-profile-stats">
                    <div class="stat-item">
                        <span class="stat-num">${favorites.length}</span>
                        <span class="stat-label">❤️ В избранном</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-num">${achievements.length}</span>
                        <span class="stat-label">🏆 Достижений</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-num">${comments.length}</span>
                        <span class="stat-label">💬 Комментариев</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-num">${history.length}</span>
                        <span class="stat-label">📺 Просмотров</span>
                    </div>
                </div>
                
                <div class="friend-profile-tabs">
                    <button class="profile-tab active" onclick="switchFriendProfileTabInline('history', this, modal)">📺 История</button>
                    <button class="profile-tab" onclick="switchFriendProfileTabInline('favorites', this, modal)">❤️ Избранное</button>
                    <button class="profile-tab" onclick="switchFriendProfileTabInline('comments', this, modal)">💬 Комментарии</button>
                </div>
                
                <div class="friend-profile-content" id="friendProfileContentInline">
                    ${renderFriendHistoryInline(history)}
                </div>
                
                ${profile.friendStatus === 'accepted' ? `
                    <div class="friend-profile-actions">
                        <button class="btn-primary" onclick="closeModal('friendProfileModal'); openChatInline(${profile.id});">💬 Написать</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
    });
}

function renderFriendHistoryInline(history) {
    if (!history || history.length === 0) {
        return '<div class="friend-empty-content">📺 Нет просмотров</div>';
    }
    
    var html = '';
    history.forEach(function(item) {
        var time = new Date(item.updated_at).toLocaleDateString();
        html += `
            <div class="history-item">
                <span class="history-anime">🎬 ${item.anime}</span>
                <span class="history-episode">Серия ${item.episode || '?'}</span>
                <span class="history-time">${time}</span>
            </div>
        `;
    });
    return html;
}

function renderFriendFavoritesInline(favorites) {
    if (!favorites || favorites.length === 0) {
        return '<div class="friend-empty-content">❤️ Нет избранного</div>';
    }
    
    var html = '';
    favorites.forEach(function(anime) {
        html += `
            <div class="favorite-item" onclick="searchAndOpen('${anime}')">
                ❤️ ${anime}
            </div>
        `;
    });
    return html;
}

function renderFriendCommentsInline(comments) {
    if (!comments || comments.length === 0) {
        return '<div class="friend-empty-content">💬 Нет комментариев</div>';
    }
    
    var html = '';
    comments.forEach(function(c) {
        var time = new Date(c.created_at).toLocaleDateString();
        html += `
            <div class="friend-comment-item">
                <div class="comment-anime">📺 ${c.anime}</div>
                <div class="comment-text">${c.text}</div>
                <div class="comment-date">${time}</div>
            </div>
        `;
    });
    return html;
}

function switchFriendProfileTabInline(tab, btn, modal) {
    document.querySelectorAll('.profile-tab').forEach(function(b) {
        b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
    
    var container = document.getElementById('friendProfileContentInline');
    if (!container || !modal) return;
    
    var profile = modal._profileData;
    if (!profile) return;
    
    if (tab === 'history') {
        container.innerHTML = renderFriendHistoryInline(profile.history);
    } else if (tab === 'favorites') {
        container.innerHTML = renderFriendFavoritesInline(profile.favorites);
    } else if (tab === 'comments') {
        container.innerHTML = renderFriendCommentsInline(profile.comments);
    }
}

// ===== КЛИК НА ДРУГА =====

document.addEventListener('click', function(e) {
    var item = e.target.closest('.friend-list-item');
    if (item) {
        var friendId = parseInt(item.dataset.friendId);
        if (friendId) {
            if (e.target.closest('.friend-list-avatar')) {
                showFriendProfileInline(friendId);
            } else {
                openChatInline(friendId);
            }
        }
    }
});

console.log('👥 UI друзей загружен!');

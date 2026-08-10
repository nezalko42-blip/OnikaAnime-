// ============================================
// ИНТЕРФЕЙС ДРУЗЕЙ
// ============================================

function renderFriendsPage() {
    var container = document.getElementById('friendsPageContent');
    if (!container) return;
    
    var user = DB.get('currentUser');
    if (!user) {
        container.innerHTML = `
            <div class="friends-container">
                <div class="empty-state">
                    <span class="empty-icon">🔐</span>
                    <p>Войдите в аккаунт чтобы видеть друзей</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="friends-container">
            <div class="friends-header">
                <h2>👥 Друзья</h2>
                <div class="friends-header-actions">
                    <button class="friends-tab active" data-tab="friends" onclick="switchFriendsTab('friends')">Друзья</button>
                    <button class="friends-tab" data-tab="requests" onclick="switchFriendsTab('requests')">Заявки</button>
                    <button class="friends-tab" data-tab="search" onclick="switchFriendsTab('search')">Поиск</button>
                </div>
            </div>
            
            <div class="friends-tab-content" id="friendsTabFriends"></div>
            <div class="friends-tab-content" id="friendsTabRequests" style="display:none;"></div>
            <div class="friends-tab-content" id="friendsTabSearch" style="display:none;"></div>
        </div>
        
        <div class="chat-container" id="chatContainer"></div>
    `;
    
    loadFriendsTab();
    loadRequestsTab();
}

function switchFriendsTab(tab) {
    document.querySelectorAll('.friends-tab').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.friends-tab-content').forEach(function(el) {
        el.style.display = 'none';
    });
    
    var target = document.getElementById('friendsTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (target) target.style.display = 'block';
    
    if (tab === 'search') {
        renderSearchTab();
    }
}

function loadFriendsTab() {
    var container = document.getElementById('friendsTabFriends');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка...</div>';
    
    FriendsSystem.getFriends(function(friends) {
        if (!friends || friends.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">👤</span>
                    <p>У вас пока нет друзей</p>
                    <button class="btn-primary" onclick="switchFriendsTab('search')">🔍 Найти друзей</button>
                </div>
            `;
            return;
        }
        
        var html = '<div class="friends-list">';
        friends.forEach(function(friend) {
            html += `
                <div class="friend-card" onclick="FriendsSystem.currentFriend = ${friend.id}; showFriendProfile(${friend.id});">
                    <div class="friend-avatar">${friend.name[0].toUpperCase()}</div>
                    <div class="friend-info">
                        <div class="friend-name">${friend.name}</div>
                        <div class="friend-id">ID: ${friend.id}</div>
                    </div>
                    <div class="friend-actions">
                        <button class="friend-chat-btn" onclick="event.stopPropagation(); ChatSystem.startChat(${friend.id});">💬</button>
                        <button class="friend-remove-btn" onclick="event.stopPropagation(); removeFriend(${friend.id});">✕</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    });
}

function loadRequestsTab() {
    var container = document.getElementById('friendsTabRequests');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#888;">⏳ Загрузка...</div>';
    
    FriendsSystem.getRequests(function(requests) {
        if (!requests || requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>Нет входящих заявок</p>
                </div>
            `;
            return;
        }
        
        var html = '<div class="friends-list">';
        requests.forEach(function(req) {
            html += `
                <div class="friend-card request-card">
                    <div class="friend-avatar">${req.name[0].toUpperCase()}</div>
                    <div class="friend-info">
                        <div class="friend-name">${req.name}</div>
                        <div class="friend-id">ID: ${req.id}</div>
                    </div>
                    <div class="friend-actions">
                        <button class="request-accept-btn" onclick="acceptRequest(${req.id})">✅</button>
                        <button class="request-reject-btn" onclick="rejectRequest(${req.id})">❌</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    });
}

function renderSearchTab() {
    var container = document.getElementById('friendsTabSearch');
    if (!container) return;
    
    container.innerHTML = `
        <div class="search-friends">
            <div class="search-input-wrapper">
                <input type="text" id="friendSearchInput" placeholder="🔍 Поиск по ID или имени..." 
                       oninput="searchFriends(this.value)">
            </div>
            <div class="search-results" id="searchResults"></div>
        </div>
    `;
}

function searchFriends(query) {
    var container = document.getElementById('searchResults');
    if (!container) return;
    
    if (!query || query.length < 1) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">⏳ Поиск...</div>';
    
    FriendsSystem.searchUsers(query, function(results) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#666;">🔍 Ничего не найдено</div>';
            return;
        }
        
        var user = DB.get('currentUser');
        var html = '<div class="friends-list">';
        results.forEach(function(result) {
            if (result.id === user.id) return;
            
            html += `
                <div class="friend-card search-result">
                    <div class="friend-avatar">${result.name[0].toUpperCase()}</div>
                    <div class="friend-info">
                        <div class="friend-name">${result.name}</div>
                        <div class="friend-id">ID: ${result.id}</div>
                    </div>
                    <div class="friend-actions">
                        <button class="friend-add-btn" onclick="sendFriendRequest(${result.id})">➕ Добавить</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    });
}

function sendFriendRequest(friendId) {
    FriendsSystem.sendFriendRequest(friendId, function(data) {
        if (data.success) {
            showToast('✅ Заявка отправлена!', 'success');
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    });
}

function acceptRequest(friendId) {
    FriendsSystem.respondToRequest(friendId, 'accept', function(data) {
        if (data.success) {
            showToast('✅ Друг добавлен!', 'success');
            loadFriendsTab();
            loadRequestsTab();
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    });
}

function rejectRequest(friendId) {
    FriendsSystem.respondToRequest(friendId, 'reject', function(data) {
        if (data.success) {
            showToast('❌ Заявка отклонена', 'info');
            loadRequestsTab();
        } else {
            showToast(data.error || 'Ошибка', 'error');
        }
    });
}

function removeFriend(friendId) {
    showConfirmModal('Удалить друга', 'Вы уверены?', function() {
        FriendsSystem.removeFriend(friendId, function(data) {
            if (data.success) {
                showToast('🗑️ Друг удален', 'info');
                loadFriendsTab();
                if (ChatSystem.currentChat === friendId) {
                    ChatSystem.closeChat();
                }
            } else {
                showToast(data.error || 'Ошибка', 'error');
            }
        });
    });
}

function showFriendProfile(friendId) {
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
        
        var achievements = profile.achievements || [];
        var favorites = profile.favorites || [];
        var comments = profile.comments || [];
        var history = profile.history || [];
        
        modal.innerHTML = `
            <div class="modal-box friend-profile-modal">
                <button class="modal-close" onclick="closeModal('friendProfileModal')">✕</button>
                
                <div class="friend-profile-header">
                    <div class="friend-profile-avatar">${profile.name[0].toUpperCase()}</div>
                    <div class="friend-profile-name">${profile.name}</div>
                    <div class="friend-profile-id">ID: ${profile.id}</div>
                    <div class="friend-profile-status">${profile.friendStatus === 'accepted' ? '✅ В друзьях' : ''}</div>
                </div>
                
                <div class="friend-profile-stats">
                    <div class="stat-item">
                        <span class="stat-num">${favorites.length}</span>
                        <span class="stat-label">В избранном</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-num">${achievements.length}</span>
                        <span class="stat-label">Достижений</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-num">${comments.length}</span>
                        <span class="stat-label">Комментариев</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-num">${history.length}</span>
                        <span class="stat-label">Просмотров</span>
                    </div>
                </div>
                
                <div class="friend-profile-tabs">
                    <button class="profile-tab active" onclick="switchFriendProfileTab('history', this, modal)">📺 История</button>
                    <button class="profile-tab" onclick="switchFriendProfileTab('favorites', this, modal)">❤️ Избранное</button>
                    <button class="profile-tab" onclick="switchFriendProfileTab('comments', this, modal)">💬 Комментарии</button>
                </div>
                
                <div class="friend-profile-content" id="friendProfileContent">
                    ${renderFriendHistory(history)}
                </div>
                
                ${profile.friendStatus === 'accepted' ? `
                    <div class="friend-profile-actions">
                        <button class="btn-primary" onclick="closeModal('friendProfileModal'); ChatSystem.startChat(${profile.id});">💬 Написать</button>
                    </div>
                ` : ''}
            </div>
        `;
        
        document.body.appendChild(modal);
    });
}

function renderFriendHistory(history) {
    if (!history || history.length === 0) {
        return '<div style="text-align:center;padding:30px;color:#666;">📺 Нет просмотров</div>';
    }
    
    var html = '<div class="friend-history-list">';
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
    html += '</div>';
    return html;
}

function renderFriendFavorites(favorites) {
    if (!favorites || favorites.length === 0) {
        return '<div style="text-align:center;padding:30px;color:#666;">❤️ Нет избранного</div>';
    }
    
    var html = '<div class="friend-favorites-list">';
    favorites.forEach(function(anime) {
        html += `
            <div class="favorite-item" onclick="searchAndOpen('${anime}')">
                ❤️ ${anime}
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function renderFriendComments(comments) {
    if (!comments || comments.length === 0) {
        return '<div style="text-align:center;padding:30px;color:#666;">💬 Нет комментариев</div>';
    }
    
    var html = '<div class="friend-comments-list">';
    comments.forEach(function(c) {
        var time = new Date(c.created_at).toLocaleDateString();
        html += `
            <div class="comment-item">
                <div class="comment-anime">📺 ${c.anime}</div>
                <div class="comment-text">${c.text}</div>
                <div class="comment-date">${time}</div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function switchFriendProfileTab(tab, btn, modal) {
    document.querySelectorAll('.profile-tab').forEach(function(b) {
        b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
    
    var container = document.getElementById('friendProfileContent');
    if (!container || !modal) return;
    
    var profile = modal._profileData;
    if (!profile) return;
    
    if (tab === 'history') {
        container.innerHTML = renderFriendHistory(profile.history);
    } else if (tab === 'favorites') {
        container.innerHTML = renderFriendFavorites(profile.favorites);
    } else if (tab === 'comments') {
        container.innerHTML = renderFriendComments(profile.comments);
    }
}

console.log('👥 UI друзей загружен!');

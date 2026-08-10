// ============================================
// СИСТЕМА ЧАТА
// ============================================

var ChatSystem = {
    currentChat: null,
    _updateTimer: null,
    _lastMessageId: 0,
    
    sendMessage: function(toUserId, message, callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback({ error: 'Войдите в аккаунт' });
            return;
        }
        
        if (!message || message.trim().length === 0) {
            callback({ error: 'Напишите сообщение' });
            return;
        }
        
        fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fromUserId: user.id,
                toUserId: toUserId,
                message: message.trim()
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(data);
        })
        .catch(function() {
            callback({ error: 'Ошибка сети' });
        });
    },
    
    getMessages: function(friendId, limit, offset, callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback([]);
            return;
        }
        
        limit = limit || 50;
        offset = offset || 0;
        
        fetch('/api/messages/' + user.id + '/' + friendId + '?limit=' + limit + '&offset=' + offset)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                callback(data || []);
            })
            .catch(function() {
                callback([]);
            });
    },
    
    getUnread: function(callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback([]);
            return;
        }
        
        fetch('/api/messages/unread/' + user.id)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                callback(data || []);
            })
            .catch(function() {
                callback([]);
            });
    },
    
    startChat: function(friendId) {
        this.currentChat = friendId;
        this._lastMessageId = 0;
        this.renderChat(friendId);
        this.startAutoUpdate();
    },
    
    closeChat: function() {
        this.currentChat = null;
        this.stopAutoUpdate();
        var container = document.getElementById('chatContainer');
        if (container) container.innerHTML = '';
        var panel = document.getElementById('chatPanel');
        if (panel) panel.classList.remove('active');
    },
    
    startAutoUpdate: function() {
        this.stopAutoUpdate();
        var self = this;
        this._updateTimer = setInterval(function() {
            if (self.currentChat) {
                self.refreshChat(self.currentChat);
            }
        }, 3000);
    },
    
    stopAutoUpdate: function() {
        if (this._updateTimer) {
            clearInterval(this._updateTimer);
            this._updateTimer = null;
        }
    },
    
    refreshChat: function(friendId) {
        var self = this;
        this.getMessages(friendId, 50, 0, function(messages) {
            if (messages && messages.length > 0) {
                var lastId = messages[0].id;
                if (lastId > self._lastMessageId) {
                    self._lastMessageId = lastId;
                    self.renderMessages(messages);
                }
            }
        });
    },
    
    renderChat: function(friendId) {
        var container = document.getElementById('chatContainer');
        if (!container) return;
        
        var self = this;
        var user = DB.get('currentUser');
        if (!user) return;
        
        FriendsSystem.getUserById(friendId, function(friend) {
            if (!friend) return;
            
            container.innerHTML = `
                <div class="chat-header">
                    <button class="chat-back-btn" onclick="ChatSystem.closeChat()">←</button>
                    <div class="chat-friend-info">
                        <span class="chat-friend-name">${friend.name}</span>
                        <span class="chat-friend-id">ID: ${friend.id}</span>
                    </div>
                </div>
                <div class="chat-messages" id="chatMessages"></div>
                <div class="chat-input-area">
                    <input type="text" id="chatInput" placeholder="Напишите сообщение..." 
                           onkeydown="if(event.key==='Enter') ChatSystem.sendMessageFromInput()">
                    <button onclick="ChatSystem.sendMessageFromInput()">📤</button>
                </div>
            `;
            
            container.classList.add('active');
            
            self.getMessages(friendId, 50, 0, function(messages) {
                self.renderMessages(messages);
                if (messages && messages.length > 0) {
                    self._lastMessageId = messages[0].id;
                }
            });
        });
    },
    
    renderMessages: function(messages) {
        var container = document.getElementById('chatMessages');
        if (!container) return;
        
        var user = DB.get('currentUser');
        if (!user) return;
        
        if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="chat-empty">💬 Нет сообщений. Напишите первым!</div>';
            return;
        }
        
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
    },
    
    sendMessageFromInput: function() {
        var input = document.getElementById('chatInput');
        if (!input) return;
        
        var message = input.value.trim();
        if (!message) return;
        
        var friendId = this.currentChat;
        if (!friendId) return;
        
        var self = this;
        this.sendMessage(friendId, message, function(data) {
            if (data.success) {
                input.value = '';
                self.refreshChat(friendId);
            } else {
                showToast(data.error || 'Ошибка отправки', 'error');
            }
        });
    }
};

window.ChatSystem = ChatSystem;
console.log('💬 Система чата загружена!');

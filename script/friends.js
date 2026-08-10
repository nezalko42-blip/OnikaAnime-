// ============================================
// СИСТЕМА ДРУЗЕЙ - ЯДРО
// ============================================

var FriendsSystem = {
    currentFriend: null,
    
    searchUsers: function(query, callback) {
        if (!query || query.length < 1) {
            callback([]);
            return;
        }
        
        fetch('/api/users/search?q=' + encodeURIComponent(query))
            .then(function(res) { return res.json(); })
            .then(function(data) {
                callback(data || []);
            })
            .catch(function() {
                callback([]);
            });
    },
    
    getUserById: function(userId, callback) {
        fetch('/api/users/' + userId)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                callback(data);
            })
            .catch(function() {
                callback(null);
            });
    },
    
    getFriendProfile: function(friendId, callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback(null);
            return;
        }
        
        fetch('/api/users/' + friendId + '/profile?currentUserId=' + user.id)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                callback(data);
            })
            .catch(function() {
                callback(null);
            });
    },
    
    sendFriendRequest: function(friendId, callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback({ error: 'Войдите в аккаунт' });
            return;
        }
        
        fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, friendId: friendId })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(data);
        })
        .catch(function() {
            callback({ error: 'Ошибка сети' });
        });
    },
    
    respondToRequest: function(friendId, action, callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback({ error: 'Войдите в аккаунт' });
            return;
        }
        
        fetch('/api/friends/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, friendId: friendId, action: action })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(data);
        })
        .catch(function() {
            callback({ error: 'Ошибка сети' });
        });
    },
    
    getFriends: function(callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback([]);
            return;
        }
        
        fetch('/api/friends/' + user.id)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                callback(data || []);
            })
            .catch(function() {
                callback([]);
            });
    },
    
    getRequests: function(callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback([]);
            return;
        }
        
        fetch('/api/friends/requests/' + user.id)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                callback(data || []);
            })
            .catch(function() {
                callback([]);
            });
    },
    
    removeFriend: function(friendId, callback) {
        var user = DB.get('currentUser');
        if (!user) {
            callback({ error: 'Войдите в аккаунт' });
            return;
        }
        
        fetch('/api/friends/' + user.id + '/' + friendId, {
            method: 'DELETE'
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            callback(data);
        })
        .catch(function() {
            callback({ error: 'Ошибка сети' });
        });
    }
};

window.FriendsSystem = FriendsSystem;
console.log('👥 Система друзей загружена!');

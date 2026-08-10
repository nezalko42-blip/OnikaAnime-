// ============================================
// ХРАНИЛИЩЕ ONIKAANIME
// ============================================

var DB = {
    _data: null,
    _initialized: false,
    
    init: function() {
        console.log('🚀 Инициализация хранилища...');
        
        var saved = localStorage.getItem('onika_data');
        
        if (saved) {
            try {
                this._data = JSON.parse(saved);
                console.log('✅ Данные загружены из localStorage');
            } catch(e) {
                console.error('❌ Ошибка парсинга данных:', e);
                this._data = this._getDefaultData();
            }
        } else {
            console.log('📦 Создаем новое хранилище');
            this._data = this._getDefaultData();
        }
        
        var user = localStorage.getItem('onika_currentUser');
        if (user) {
            try {
                this._data.currentUser = JSON.parse(user);
                console.log('👤 Восстановлен пользователь:', this._data.currentUser.name);
            } catch(e) {
                console.error('❌ Ошибка восстановления пользователя:', e);
            }
        }
        
        this._initialized = true;
        
        if (this._data.currentUser) {
            this._loadUserDataFromServer(this._data.currentUser.id);
        }
        
        if (window._saveInterval) clearInterval(window._saveInterval);
        window._saveInterval = setInterval(function() {
            DB._saveToLocal();
        }, 5000);
        
        return this;
    },
    
    _getDefaultData: function() {
        return {
            users: {},
            profiles: {},
            favorites: {},
            comments: {},
            continueWatching: {},
            history: {},
            achievements: {},
            activeTitle: {},
            videos: {},
            onlineTime: {},
            lastSeen: {},
            currentUser: null,
            settings: { "3d": true, "vibe": true }
        };
    },
    
    _saveToLocal: function() {
        if (!this._data) return;
        
        try {
            var dataToSave = JSON.parse(JSON.stringify(this._data));
            delete dataToSave.currentUser;
            localStorage.setItem('onika_data', JSON.stringify(dataToSave));
            
            if (this._data.currentUser) {
                localStorage.setItem('onika_currentUser', JSON.stringify(this._data.currentUser));
            }
            
            if (this._data.profiles) {
                for (var name in this._data.profiles) {
                    if (this._data.profiles[name] && this._data.profiles[name].avatar) {
                        localStorage.setItem('avatar_' + name, this._data.profiles[name].avatar);
                    }
                }
            }
            
            if (this._data.favorites && this._data.currentUser) {
                var userName = this._data.currentUser.name;
                if (this._data.favorites[userName]) {
                    localStorage.setItem('favorites_' + userName, JSON.stringify(this._data.favorites[userName]));
                }
            }
            
            console.log('💾 Данные сохранены в localStorage');
        } catch(e) {
            console.error('❌ Ошибка сохранения:', e);
        }
    },
    
    _loadUserDataFromServer: function(userId) {
        var self = this;
        var userName = this._data.currentUser ? this._data.currentUser.name : null;
        
        fetch('/api/user/' + userId)
        .then(function(res) {
            if (!res.ok) throw new Error('Ошибка сервера: ' + res.status);
            return res.json();
        })
        .then(function(data) {
            if (data && data.name) {
                console.log('📡 Данные с сервера получены');
                
                var localFavs = self._data.favorites && self._data.favorites[data.name];
                var localAch = self._data.achievements && self._data.achievements[data.name];
                
                if (!localFavs || localFavs.length === 0) {
                    if (!self._data.favorites) self._data.favorites = {};
                    self._data.favorites[data.name] = data.favorites || [];
                    console.log('📚 Загружено избранное с сервера:', self._data.favorites[data.name].length);
                }
                
                if (!localAch || localAch.length === 0) {
                    if (!self._data.achievements) self._data.achievements = {};
                    self._data.achievements[data.name] = data.achievements || [];
                    console.log('🏆 Загружены достижения с сервера:', self._data.achievements[data.name].length);
                }
                
                if (!self._data.activeTitle) self._data.activeTitle = {};
                if (!self._data.activeTitle[data.name]) {
                    self._data.activeTitle[data.name] = data.activeTitle || null;
                }
                
                self._saveToLocal();
                console.log('✅ Данные синхронизированы с сервером');
            }
        })
        .catch(function(e) {
            console.warn('⚠️ Не удалось синхронизироваться с сервером:', e);
        });
    },
    
    save: function(cb) {
        this._saveToLocal();
        
        var user = this._data.currentUser;
        if (user && user.id) {
            var userId = user.id;
            var name = user.name;
            
            var favs = (this._data.favorites && this._data.favorites[name]) || [];
            fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, favorites: favs })
            }).catch(function(e) { console.error('⚠️ Ошибка сохранения избранного:', e); });
            
            var ach = (this._data.achievements && this._data.achievements[name]) || [];
            fetch('/api/achievements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, achievements: ach })
            }).catch(function(e) { console.error('⚠️ Ошибка сохранения достижений:', e); });
            
            var title = (this._data.activeTitle && this._data.activeTitle[name]) || null;
            fetch('/api/active-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, titleId: title })
            }).catch(function(e) { console.error('⚠️ Ошибка сохранения титула:', e); });
        }
        
        if (cb) cb();
    },
    
    get: function(key, def) {
        if (!this._data) return def;
        return this._data[key] !== undefined ? this._data[key] : def;
    },
    
    set: function(key, val, cb) {
        if (!this._data) this._data = this._getDefaultData();
        this._data[key] = val;
        this.save(cb);
        return true;
    },
    
    getUserData: function(user, key, def) {
        if (!this._data) return def;
        if (!this._data[key]) this._data[key] = {};
        return this._data[key][user] !== undefined ? this._data[key][user] : def;
    },
    
    setUserData: function(user, key, val, cb) {
        if (!this._data) this._data = this._getDefaultData();
        if (!this._data[key]) this._data[key] = {};
        this._data[key][user] = val;
        this.save(cb);
        return true;
    },
    
    getAchievements: function(user) {
        if (!user || !this._data) return [];
        if (!this._data.achievements) this._data.achievements = {};
        if (!this._data.achievements[user]) this._data.achievements[user] = [];
        return this._data.achievements[user];
    },
    
    addAchievement: function(user, achId) {
        if (!user || !this._data) return false;
        if (!this._data.achievements) this._data.achievements = {};
        if (!this._data.achievements[user]) this._data.achievements[user] = [];
        
        if (this._data.achievements[user].indexOf(achId) === -1) {
            this._data.achievements[user].push(achId);
            this.save();
            return true;
        }
        return false;
    },
    
    getActiveTitle: function(user) {
        if (!user || !this._data) return null;
        if (!this._data.activeTitle) this._data.activeTitle = {};
        return this._data.activeTitle[user] || null;
    },
    
    setActiveTitle: function(user, titleId) {
        if (!user || !this._data) return false;
        if (!this._data.activeTitle) this._data.activeTitle = {};
        this._data.activeTitle[user] = titleId;
        this.save();
        return true;
    },
    
    restoreData: function() {
        var user = this._data.currentUser;
        if (!user) return;
        
        var name = user.name;
        
        var backupFavs = localStorage.getItem('favorites_' + name);
        if (backupFavs) {
            try {
                var parsed = JSON.parse(backupFavs);
                if (!this._data.favorites) this._data.favorites = {};
                if (!this._data.favorites[name] || this._data.favorites[name].length === 0) {
                    this._data.favorites[name] = parsed;
                    console.log('🔄 Восстановлено избранное из бэкапа:', parsed.length);
                }
            } catch(e) {}
        }
        
        var backupAvatar = localStorage.getItem('avatar_' + name);
        if (backupAvatar) {
            if (!this._data.profiles) this._data.profiles = {};
            if (!this._data.profiles[name]) this._data.profiles[name] = {};
            if (!this._data.profiles[name].avatar) {
                this._data.profiles[name].avatar = backupAvatar;
                console.log('🔄 Восстановлена аватарка из бэкапа');
            }
        }
        
        this._saveToLocal();
    }
};

DB.init();
DB.restoreData();

window.addEventListener('beforeunload', function() {
    DB.save();
});

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        DB.save();
    }
});

function saveDB() { DB.save(); }
function saveAll() { DB.save(); }
function $(id) { return document.getElementById(id); }

window.checkData = function() {
    var user = DB._data ? DB._data.currentUser : null;
    console.log('📊 СТАТУС ХРАНИЛИЩА:');
    console.log('Инициализировано:', DB._initialized);
    console.log('Текущий пользователь:', user ? user.name : 'Нет');
    if (user) {
        console.log('Избранное:', DB._data.favorites ? DB._data.favorites[user.name] : []);
        console.log('Профиль:', DB._data.profiles ? DB._data.profiles[user.name] : null);
        console.log('Достижения:', DB._data.achievements ? DB._data.achievements[user.name] : []);
        console.log('Время онлайн:', DB._data.onlineTime ? DB._data.onlineTime[user.name] : 0);
    }
    console.log('Все данные:', DB._data);
};

window.forceRestore = function() {
    DB.restoreData();
    DB.save();
    console.log('✅ Данные принудительно восстановлены');
    if (typeof renderProfile === 'function') renderProfile();
    if (typeof renderFavorites === 'function') renderFavorites();
};

window.DB = DB;
window.saveDB = saveDB;
window.saveAll = saveAll;

console.log('✅ Хранилище OnikaAnime инициализировано!');
console.log('💡 Используйте checkData() для проверки данных');
console.log('💡 Используйте forceRestore() для восстановления из бэкапа');

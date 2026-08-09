// ============================================
// ХРАНИЛИЩЕ ONIKAANIME - EMAIL ВЕРСИЯ
// ============================================

var DB = {
    _data: {
        users: {},
        profiles: {},
        favorites: {},
        comments: {},
        continueWatching: {},
        history: {},
        achievements: {},
        activeTitle: {},
        animeStatuses: {},
        currentUser: null,
        settings: { "3d": true, "vibe": true }
    },
    _loaded: false,
    
    init: function() {
        console.log('🚀 Загрузка данных...');
        this._loadFromLocal();
        if (this._data.currentUser) {
            this._loadUserData(this._data.currentUser.id);
        }
        return this;
    },
    
    _loadFromLocal: function() {
        try {
            var saved = localStorage.getItem('onika_data');
            if (saved) {
                var parsed = JSON.parse(saved);
                Object.keys(parsed).forEach(function(key) {
                    if (key !== 'currentUser') {
                        DB._data[key] = parsed[key];
                    }
                });
                var user = localStorage.getItem('onika_currentUser');
                if (user) {
                    DB._data.currentUser = JSON.parse(user);
                }
                DB._loaded = true;
                console.log('✅ Данные загружены из localStorage');
            }
        } catch(e) {
            console.error('❌ Ошибка:', e);
        }
    },
    
    _saveToLocal: function() {
        try {
            var data = JSON.parse(JSON.stringify(this._data));
            delete data.currentUser;
            localStorage.setItem('onika_data', JSON.stringify(data));
            if (this._data.currentUser) {
                localStorage.setItem('onika_currentUser', JSON.stringify(this._data.currentUser));
            }
        } catch(e) {
            console.error('❌ Ошибка сохранения:', e);
        }
    },
    
    _loadUserData: function(userId) {
        var self = this;
        fetch('/api/user/' + userId)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data) {
                var name = data.name;
                self._data.favorites[name] = data.favorites || [];
                self._data.achievements[name] = data.achievements || [];
                self._data.activeTitle[name] = data.activeTitle || null;
                self._data.animeStatuses[name] = data.animeStatuses || [];
                self._saveToLocal();
                console.log('👤 Данные пользователя загружены');
            }
        })
        .catch(function(e) {
            console.warn('⚠️ Не удалось загрузить данные пользователя:', e);
        });
    },
    
    save: function(cb) {
        this._saveToLocal();
        
        var user = this._data.currentUser;
        if (user) {
            var userId = user.id;
            var name = user.name;
            
            var favs = this._data.favorites[name] || [];
            fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, favorites: favs })
            }).catch(function(e) { console.error('Ошибка сохранения избранного:', e); });
            
            var ach = this._data.achievements[name] || [];
            fetch('/api/achievements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, achievements: ach })
            }).catch(function(e) { console.error('Ошибка сохранения достижений:', e); });
            
            var title = this._data.activeTitle[name] || null;
            fetch('/api/active-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, titleId: title })
            }).catch(function(e) { console.error('Ошибка сохранения титула:', e); });
        }
        
        if (cb) cb();
    },
    
    get: function(key, def) {
        return this._data[key] !== undefined ? this._data[key] : def;
    },
    
    set: function(key, val, cb) {
        this._data[key] = val;
        this.save(cb);
        return true;
    },
    
    getUserData: function(user, key, def) {
        if (!this._data[key]) this._data[key] = {};
        return this._data[key][user] !== undefined ? this._data[key][user] : def;
    },
    
    setUserData: function(user, key, val, cb) {
        if (!this._data[key]) this._data[key] = {};
        this._data[key][user] = val;
        this.save(cb);
        return true;
    },
    
    getAchievements: function(user) {
        if (!user) return [];
        if (!this._data.achievements) this._data.achievements = {};
        if (!this._data.achievements[user]) this._data.achievements[user] = [];
        return this._data.achievements[user];
    },
    
    addAchievement: function(user, achId) {
        if (!user) return false;
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
        if (!user) return null;
        if (!this._data.activeTitle) this._data.activeTitle = {};
        return this._data.activeTitle[user] || null;
    },
    
    setActiveTitle: function(user, titleId) {
        if (!user) return false;
        if (!this._data.activeTitle) this._data.activeTitle = {};
        this._data.activeTitle[user] = titleId;
        this.save();
        return true;
    }
};

DB.init();

function saveDB(key) { DB.save(); }
function saveAll() { DB.save(); }
function $(id) { return document.getElementById(id); }

window.DB = DB;
window.saveDB = saveDB;
window.saveAll = saveAll;

console.log('✅ Хранилище OnikaAnime загружено!');

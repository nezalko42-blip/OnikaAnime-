// ============================================
// ХРАНИЛИЩЕ ONIKAANIME - SQLite ВЕРСИЯ
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
        currentUser: null,
        settings: { "3d": true, "vibe": true }
    },
    _loaded: false,
    
    init: function() {
        console.log('🚀 Загрузка данных...');
        this._loadFromLocal();
        this._loadUserData();
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
                DB._data.currentUser = localStorage.getItem('onika_currentUser') || null;
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
                localStorage.setItem('onika_currentUser', this._data.currentUser);
            }
        } catch(e) {
            console.error('❌ Ошибка сохранения:', e);
        }
    },
    
    _loadUserData: function() {
        var user = this._data.currentUser;
        if (!user) return;
        
        var self = this;
        fetch('/api/user/' + encodeURIComponent(user))
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.favorites) {
                self._data.favorites[user] = data.favorites;
            }
            if (data.achievements) {
                self._data.achievements[user] = data.achievements;
            }
            if (data.activeTitle) {
                self._data.activeTitle[user] = data.activeTitle;
            }
            self._saveToLocal();
            console.log('👤 Данные пользователя загружены');
        })
        .catch(function(e) {
            console.warn('⚠️ Не удалось загрузить данные пользователя:', e);
        });
    },
    
    save: function(cb) {
        this._saveToLocal();
        
        var user = this._data.currentUser;
        if (user) {
            // Сохраняем избранное
            var favs = this._data.favorites[user] || [];
            fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: user, favorites: favs })
            }).catch(function(e) { console.error('Ошибка сохранения избранного:', e); });
            
            // Сохраняем достижения
            var ach = this._data.achievements[user] || [];
            fetch('/api/achievements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: user, achievements: ach })
            }).catch(function(e) { console.error('Ошибка сохранения достижений:', e); });
            
            // Сохраняем активный титул
            var title = this._data.activeTitle[user] || null;
            fetch('/api/active-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: user, titleId: title })
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

// ============================================
// ХРАНИЛИЩЕ ONIKAANIME - СЕРВЕРНАЯ ВЕРСИЯ
// ============================================

var DB = {
    _data: {},
    _loaded: false,
    _apiUrl: '/api',
    
    init: function() {
        console.log('🚀 Загрузка данных с сервера...');
        this.loadFromServer();
        return this;
    },
    
    loadFromServer: function() {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.open('GET', this._apiUrl + '/db');
        xhr.timeout = 5000;
        
        xhr.onload = function() {
            try {
                if (xhr.status === 200) {
                    self._data = JSON.parse(xhr.responseText);
                    self._loaded = true;
                    console.log('✅ Данные загружены с сервера');
                    self._onLoaded();
                } else {
                    console.error('❌ Ошибка загрузки данных:', xhr.status);
                    self._loadFromLocal();
                }
            } catch(e) {
                console.error('❌ Ошибка парсинга:', e);
                self._loadFromLocal();
            }
        };
        
        xhr.onerror = function() {
            console.error('❌ Ошибка сети, используем localStorage');
            self._loadFromLocal();
        };
        
        xhr.ontimeout = function() {
            console.error('❌ Таймаут, используем localStorage');
            self._loadFromLocal();
        };
        
        xhr.send();
    },
    
    _loadFromLocal: function() {
        try {
            var saved = localStorage.getItem('onika_data');
            if (saved) {
                this._data = JSON.parse(saved);
                this._loaded = true;
                console.log('✅ Данные загружены из localStorage');
                this.saveToServer();
            } else {
                this._data = {
                    users: {},
                    profiles: {},
                    videos: {},
                    favorites: {},
                    comments: {},
                    continueWatching: {},
                    history: {},
                    achievements: {},
                    activeTitle: {},
                    currentUser: null,
                    settings: { "3d": true, "vibe": true }
                };
                this._loaded = true;
                this.saveToServer();
            }
            this._onLoaded();
        } catch(e) {
            console.error('❌ Ошибка загрузки из localStorage:', e);
            this._data = {};
            this._loaded = true;
        }
    },
    
    _onLoaded: function() {
        var keys = ['users', 'profiles', 'videos', 'favorites', 'comments', 'continueWatching', 'history', 'achievements', 'activeTitle', 'settings'];
        keys.forEach(function(k) {
            if (this._data[k] === undefined) {
                if (k === 'settings') {
                    this._data[k] = { "3d": true, "vibe": true };
                } else {
                    this._data[k] = {};
                }
            }
        }, this);
        if (this._data.currentUser === undefined) {
            this._data.currentUser = null;
        }
        this.save();
    },
    
    saveToServer: function(cb) {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.open('POST', this._apiUrl + '/db');
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                console.log('💾 Данные сохранены на сервере');
            } else {
                console.warn('⚠️ Не удалось сохранить на сервере, сохраняем в localStorage');
                self._saveToLocal();
            }
            if (cb) cb();
        };
        
        xhr.onerror = function() {
            console.warn('⚠️ Ошибка сети, сохраняем в localStorage');
            self._saveToLocal();
            if (cb) cb();
        };
        
        xhr.send(JSON.stringify(this._data));
    },
    
    _saveToLocal: function() {
        try {
            localStorage.setItem('onika_data', JSON.stringify(this._data));
        } catch(e) {
            console.error('❌ Ошибка сохранения в localStorage:', e);
        }
    },
    
    save: function(cb) {
        this._saveToLocal();
        this.saveToServer(cb);
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
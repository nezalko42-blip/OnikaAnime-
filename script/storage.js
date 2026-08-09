// ============================================
// ХРАНИЛИЩЕ ONIKAANIME - SUPABASE ВЕРСИЯ
// ============================================

const SUPABASE_URL = 'https://yxdotffhxortsqtsafpo.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_t8GpU_UCoZ1t3Sk4wrqUhg_0rKF3clj';

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
    _userIdCache: {},
    
    init: function() {
        console.log('🚀 Загрузка данных из Supabase...');
        this.loadFromSupabase();
        return this;
    },
    
    // ============================================
    // ЗАГРУЗКА ДАННЫХ ИЗ SUPABASE
    // ============================================
    
    loadFromSupabase: function() {
        var self = this;
        
        // 1. Загружаем пользователей
        fetch(SUPABASE_URL + '/rest/v1/users?select=*', {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': 'Bearer ' + SUPABASE_KEY
            }
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                data.forEach(function(user) {
                    self._data.users[user.name] = user.password;
                    self._userIdCache[user.name] = user.id;
                });
                console.log('👤 Загружено пользователей:', data.length);
            }
            
            // 2. Загружаем профили
            return fetch(SUPABASE_URL + '/rest/v1/profiles?select=*', {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                data.forEach(function(profile) {
                    var user = self._findUserByUserId(profile.user_id);
                    if (user) {
                        if (!self._data.profiles[user]) self._data.profiles[user] = {};
                        self._data.profiles[user].bio = profile.bio || '';
                        self._data.profiles[user].avatar = profile.avatar || '';
                    }
                });
                console.log('📝 Загружено профилей:', data.length);
            }
            
            // 3. Загружаем избранное
            return fetch(SUPABASE_URL + '/rest/v1/favorites?select=*', {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                data.forEach(function(item) {
                    var user = self._findUserByUserId(item.user_id);
                    if (user) {
                        if (!self._data.favorites[user]) self._data.favorites[user] = [];
                        if (self._data.favorites[user].indexOf(item.anime) === -1) {
                            self._data.favorites[user].push(item.anime);
                        }
                    }
                });
                console.log('❤️ Загружено избранное:', data.length);
            }
            
            // 4. Загружаем комментарии
            return fetch(SUPABASE_URL + '/rest/v1/comments?select=*', {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                data.forEach(function(item) {
                    if (!self._data.comments[item.anime]) self._data.comments[item.anime] = [];
                    self._data.comments[item.anime].push({
                        user: item.user_name,
                        text: item.text,
                        date: item.date
                    });
                });
                console.log('💬 Загружено комментариев:', data.length);
            }
            
            // 5. Загружаем достижения
            return fetch(SUPABASE_URL + '/rest/v1/achievements?select=*', {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                data.forEach(function(item) {
                    var user = self._findUserByUserId(item.user_id);
                    if (user) {
                        if (!self._data.achievements[user]) self._data.achievements[user] = [];
                        if (self._data.achievements[user].indexOf(item.achievement_id) === -1) {
                            self._data.achievements[user].push(item.achievement_id);
                        }
                    }
                });
                console.log('🏆 Загружено достижений:', data.length);
            }
            
            // 6. Загружаем активные титулы
            return fetch(SUPABASE_URL + '/rest/v1/active_titles?select=*', {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY
                }
            });
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                data.forEach(function(item) {
                    var user = self._findUserByUserId(item.user_id);
                    if (user) {
                        self._data.activeTitle[user] = item.title_id;
                    }
                });
                console.log('👑 Загружено титулов:', data.length);
            }
            
            // 7. Загружаем текущего пользователя
            var savedUser = localStorage.getItem('onika_currentUser');
            if (savedUser) {
                self._data.currentUser = savedUser;
            }
            
            self._loaded = true;
            console.log('✅ Все данные загружены из Supabase!');
            self._onLoaded();
        })
        .catch(function(e) {
            console.error('❌ Ошибка загрузки:', e);
            self._loadFromLocal();
        });
    },
    
    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================
    
    _findUserByUserId: function(userId) {
        for (var name in this._userIdCache) {
            if (this._userIdCache[name] == userId) {
                return name;
            }
        }
        return null;
    },
    
    _getUserId: function(name) {
        if (this._userIdCache[name]) return this._userIdCache[name];
        // Если нет в кэше, пробуем найти
        for (var id in this._userIdCache) {
            if (id === name) return this._userIdCache[id];
        }
        return null;
    },
    
    // ============================================
    // РЕЗЕРВНОЕ ХРАНИЛИЩЕ (localStorage)
    // ============================================
    
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
                DB._onLoaded();
                // Отправляем на сервер
                DB.saveToSupabase();
            } else {
                DB._loaded = true;
                DB._onLoaded();
            }
        } catch(e) {
            console.error('❌ Ошибка загрузки из localStorage:', e);
            DB._loaded = true;
            DB._onLoaded();
        }
    },
    
    _saveToLocal: function() {
        try {
            var data = JSON.parse(JSON.stringify(this._data));
            delete data.currentUser;
            localStorage.setItem('onika_data', JSON.stringify(data));
            if (this._data.currentUser) {
                localStorage.setItem('onika_currentUser', this._data.currentUser);
            } else {
                localStorage.removeItem('onika_currentUser');
            }
        } catch(e) {
            console.error('❌ Ошибка сохранения в localStorage:', e);
        }
    },
    
    // ============================================
    // СОХРАНЕНИЕ В SUPABASE
    // ============================================
    
    saveToSupabase: function(cb) {
        var self = this;
        
        // Сохраняем пользователей
        for (var name in this._data.users) {
            var password = this._data.users[name];
            if (!this._userIdCache[name]) {
                // Новый пользователь
                fetch(SUPABASE_URL + '/rest/v1/users', {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ name: name, password: password })
                })
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data && data.length > 0 && data[0].id) {
                        self._userIdCache[name] = data[0].id;
                    }
                })
                .catch(function(e) { console.error('Ошибка:', e); });
            }
        }
        
        // Сохраняем избранное
        for (var user in this._data.favorites) {
            var userId = this._getUserId(user);
            if (userId) {
                this._data.favorites[user].forEach(function(anime) {
                    fetch(SUPABASE_URL + '/rest/v1/favorites', {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ user_id: userId, anime: anime })
                    })
                    .catch(function(e) { console.error('Ошибка:', e); });
                });
            }
        }
        
        // Сохраняем комментарии
        for (var anime in this._data.comments) {
            this._data.comments[anime].forEach(function(c) {
                fetch(SUPABASE_URL + '/rest/v1/comments', {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        anime: anime, 
                        user_name: c.user, 
                        text: c.text, 
                        date: c.date 
                    })
                })
                .catch(function(e) { console.error('Ошибка:', e); });
            });
        }
        
        // Сохраняем достижения
        for (var user in this._data.achievements) {
            var userId = this._getUserId(user);
            if (userId) {
                this._data.achievements[user].forEach(function(achId) {
                    fetch(SUPABASE_URL + '/rest/v1/achievements', {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_KEY,
                            'Authorization': 'Bearer ' + SUPABASE_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ user_id: userId, achievement_id: achId })
                    })
                    .catch(function(e) { console.error('Ошибка:', e); });
                });
            }
        }
        
        // Сохраняем активный титул
        for (var user in this._data.activeTitle) {
            var userId = this._getUserId(user);
            if (userId) {
                var titleId = this._data.activeTitle[user];
                fetch(SUPABASE_URL + '/rest/v1/active_titles', {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': 'Bearer ' + SUPABASE_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user_id: userId, title_id: titleId })
                })
                .catch(function(e) { console.error('Ошибка:', e); });
            }
        }
        
        this._saveToLocal();
        if (cb) cb();
    },
    
    // ============================================
    // ОСНОВНЫЕ МЕТОДЫ
    // ============================================
    
    save: function(cb) {
        this.saveToSupabase(cb);
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

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

DB.init();

function saveDB(key) { DB.save(); }
function saveAll() { DB.save(); }
function $(id) { return document.getElementById(id); }

window.DB = DB;
window.saveDB = saveDB;
window.saveAll = saveAll;

console.log('✅ Хранилище OnikaAnime загружено!');
console.log('📊 Подключено к Supabase');

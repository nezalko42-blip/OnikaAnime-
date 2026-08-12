// ============================================
// ХРАНИЛИЩЕ ONIKAANIME (КЛАССОВАЯ ВЕРСИЯ)
// ============================================

class Storage {
    constructor() {
        this._data = null;
        this._initialized = false;
        this._saveInterval = null;
        this.init();
    }

    init() {
        console.log('🚀 Инициализация хранилища...');
        
        const saved = localStorage.getItem('onika_data');
        
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
        
        // Восстанавливаем пользователя
        const user = localStorage.getItem('onika_currentUser');
        if (user) {
            try {
                this._data.currentUser = JSON.parse(user);
                console.log('👤 Восстановлен пользователь:', this._data.currentUser.name);
            } catch(e) {
                console.error('❌ Ошибка восстановления пользователя:', e);
            }
        }
        
        this._initialized = true;
        
        // Загружаем данные с сервера
        if (this._data.currentUser) {
            this._loadUserDataFromServer(this._data.currentUser.id);
        }
        
        // Автосохранение
        if (this._saveInterval) clearInterval(this._saveInterval);
        this._saveInterval = setInterval(() => this.save(), 5000);
        
        return this;
    }

    _getDefaultData() {
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
    }

    save(cb) {
        this._saveToLocal();
        
        const user = this._data.currentUser;
        if (user && user.id) {
            const userId = user.id;
            const name = user.name;
            
            // Сохраняем избранное на сервер
            const favs = this._getUserData(name, 'favorites', []);
            fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, favorites: favs })
            }).catch(e => console.error('⚠️ Ошибка сохранения избранного:', e));
            
            // Сохраняем достижения на сервер
            const ach = this._getUserData(name, 'achievements', []);
            fetch('/api/achievements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, achievements: ach })
            }).catch(e => console.error('⚠️ Ошибка сохранения достижений:', e));
            
            // Сохраняем титул на сервер
            const title = this._getUserData(name, 'activeTitle', null);
            fetch('/api/active-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, titleId: title })
            }).catch(e => console.error('⚠️ Ошибка сохранения титула:', e));
        }
        
        if (cb) cb();
    }

    _saveToLocal() {
        if (!this._data) return;
        
        try {
            const dataToSave = JSON.parse(JSON.stringify(this._data));
            delete dataToSave.currentUser;
            localStorage.setItem('onika_data', JSON.stringify(dataToSave));
            
            if (this._data.currentUser) {
                localStorage.setItem('onika_currentUser', JSON.stringify(this._data.currentUser));
            }
            
            // Сохраняем аватарки
            const profiles = this._data.profiles || {};
            for (const name in profiles) {
                if (profiles[name] && profiles[name].avatar) {
                    localStorage.setItem('avatar_' + name, profiles[name].avatar);
                }
            }
            
            console.log('💾 Данные сохранены в localStorage');
        } catch(e) {
            console.error('❌ Ошибка сохранения:', e);
        }
    }

    async _loadUserDataFromServer(userId) {
        try {
            const response = await fetch('/api/user/' + userId);
            if (!response.ok) throw new Error('Ошибка сервера: ' + response.status);
            
            const data = await response.json();
            if (data && data.name) {
                console.log('📡 Данные с сервера получены');
                
                const name = data.name;
                
                // Загружаем избранное
                if (data.favorites && data.favorites.length > 0) {
                    const currentFavs = this._getUserData(name, 'favorites', []);
                    if (currentFavs.length === 0) {
                        this._setUserData(name, 'favorites', data.favorites);
                        console.log('📚 Загружено избранное с сервера:', data.favorites.length);
                    }
                }
                
                // Загружаем достижения
                if (data.achievements && data.achievements.length > 0) {
                    const currentAch = this._getUserData(name, 'achievements', []);
                    if (currentAch.length === 0) {
                        this._setUserData(name, 'achievements', data.achievements);
                        console.log('🏆 Загружены достижения с сервера:', data.achievements.length);
                    }
                }
                
                // Загружаем титул
                if (data.activeTitle) {
                    this._setUserData(name, 'activeTitle', data.activeTitle);
                }
                
                this._saveToLocal();
                console.log('✅ Данные синхронизированы с сервером');
            }
        } catch(e) {
            console.warn('⚠️ Не удалось синхронизироваться с сервером:', e.message);
        }
    }

    _getUserData(user, key, def) {
        if (!this._data) return def;
        if (!this._data[key]) this._data[key] = {};
        return this._data[key][user] !== undefined ? this._data[key][user] : def;
    }

    _setUserData(user, key, val) {
        if (!this._data) this._data = this._getDefaultData();
        if (!this._data[key]) this._data[key] = {};
        this._data[key][user] = val;
    }

    // Публичные методы
    get(key, def) {
        if (!this._data) return def;
        return this._data[key] !== undefined ? this._data[key] : def;
    }

    set(key, val, cb) {
        if (!this._data) this._data = this._getDefaultData();
        this._data[key] = val;
        this.save(cb);
        return true;
    }

    getUserData(user, key, def) {
        return this._getUserData(user, key, def);
    }

    setUserData(user, key, val, cb) {
        this._setUserData(user, key, val);
        this.save(cb);
        return true;
    }

    getAchievements(user) {
        return this._getUserData(user, 'achievements', []);
    }

    addAchievement(user, achId) {
        if (!user || !this._data) return false;
        
        const achievements = this._getUserData(user, 'achievements', []);
        
        if (achievements.indexOf(achId) === -1) {
            achievements.push(achId);
            this._setUserData(user, 'achievements', achievements);
            this.save();
            return true;
        }
        return false;
    }

    getActiveTitle(user) {
        return this._getUserData(user, 'activeTitle', null);
    }

    setActiveTitle(user, titleId) {
        if (!user || !this._data) return false;
        this._setUserData(user, 'activeTitle', titleId);
        this.save();
        return true;
    }

    restoreData() {
        const user = this._data?.currentUser;
        if (!user) return;
        
        const name = user.name;
        
        // Восстанавливаем избранное
        const backupFavs = localStorage.getItem('favorites_' + name);
        if (backupFavs) {
            try {
                const parsed = JSON.parse(backupFavs);
                const currentFavs = this._getUserData(name, 'favorites', []);
                if (currentFavs.length === 0 && parsed.length > 0) {
                    this._setUserData(name, 'favorites', parsed);
                    console.log('🔄 Восстановлено избранное из бэкапа:', parsed.length);
                }
            } catch(e) {}
        }
        
        // Восстанавливаем аватар
        const backupAvatar = localStorage.getItem('avatar_' + name);
        if (backupAvatar) {
            const profiles = this._data.profiles || {};
            if (!profiles[name]) profiles[name] = {};
            if (!profiles[name].avatar) {
                profiles[name].avatar = backupAvatar;
                this._data.profiles = profiles;
                console.log('🔄 Восстановлена аватарка из бэкапа');
            }
        }
        
        this._saveToLocal();
    }
}

// Создаём глобальный экземпляр
const DB = new Storage();

// Восстанавливаем данные
DB.restoreData();

// Сохраняем при закрытии
window.addEventListener('beforeunload', () => {
    DB.save();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        DB.save();
    }
});

// Утилиты для совместимости
window.saveDB = () => DB.save();
window.saveAll = () => DB.save();

window.checkData = function() {
    const user = DB._data ? DB._data.currentUser : null;
    console.log('📊 СТАТУС ХРАНИЛИЩА:');
    console.log('Инициализировано:', DB._initialized);
    console.log('Текущий пользователь:', user ? user.name : 'Нет');
    if (user) {
        console.log('Избранное:', DB._getUserData(user.name, 'favorites', []));
        console.log('Профиль:', DB._data.profiles ? DB._data.profiles[user.name] : null);
        console.log('Достижения:', DB.getAchievements(user.name));
        console.log('Время онлайн:', DB._getUserData(user.name, 'onlineTime', 0));
    }
};

window.forceRestore = function() {
    DB.restoreData();
    DB.save();
    console.log('✅ Данные принудительно восстановлены');
    if (typeof renderProfile === 'function') renderProfile();
    if (typeof renderFavorites === 'function') renderFavorites();
};

window.DB = DB;

console.log('✅ Хранилище OnikaAnime инициализировано!');
console.log('💡 Используйте checkData() для проверки данных');
console.log('💡 Используйте forceRestore() для восстановления из бэкапа');

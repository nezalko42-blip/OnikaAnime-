// ============================================
// ХРАНИЛИЩЕ ONIKAANIME (С ПИТОМЦЕМ)
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
        
        if (this._data.currentUser) {
            this._loadUserDataFromServer(this._data.currentUser.id);
        }
        
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
            settings: { "3d": true, "vibe": true },
            pets: {},
            petSkins: {
                'egg': { name: '🥚 Яйцо', level: 0, expNeeded: 0 },
                'baby': { name: '🐣 Малыш', level: 1, expNeeded: 50 },
                'kitten': { name: '🐱 Котёнок', level: 2, expNeeded: 150 },
                'cat': { name: '🐈 Кот', level: 3, expNeeded: 300 },
                'lion': { name: '🦁 Король', level: 4, expNeeded: 500 },
                'dragon': { name: '🐉 Дракон', level: 5, expNeeded: 750 }
            }
        };
    }

    save(cb) {
        this._saveToLocal();
        
        const user = this._data.currentUser;
        if (user && user.id) {
            const userId = user.id;
            const name = user.name;
            
            const favs = this._getUserData(name, 'favorites', []);
            fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, favorites: favs })
            }).catch(e => console.error('⚠️ Ошибка сохранения избранного:', e));
            
            const ach = this._getUserData(name, 'achievements', []);
            fetch('/api/achievements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, achievements: ach })
            }).catch(e => console.error('⚠️ Ошибка сохранения достижений:', e));
            
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
                
                if (data.favorites && data.favorites.length > 0) {
                    const currentFavs = this._getUserData(name, 'favorites', []);
                    if (currentFavs.length === 0) {
                        this._setUserData(name, 'favorites', data.favorites);
                        console.log('📚 Загружено избранное с сервера:', data.favorites.length);
                    }
                }
                
                if (data.achievements && data.achievements.length > 0) {
                    const currentAch = this._getUserData(name, 'achievements', []);
                    if (currentAch.length === 0) {
                        this._setUserData(name, 'achievements', data.achievements);
                        console.log('🏆 Загружены достижения с сервера:', data.achievements.length);
                    }
                }
                
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

    // ===== ПУБЛИЧНЫЕ МЕТОДЫ =====
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

    // ============================================
    // СЕРИЙЧИК - МЕТОДЫ
    // ============================================

    getPet(user) {
        if (!user) return null;
        if (!this._data.pets[user]) {
            this._data.pets[user] = {
                exp: 0,
                skin: 'egg',
                unlockedSkins: ['egg'],
                days: 0,
                lastDaily: null
            };
        }
        return this._data.pets[user];
    }

    addPetExp(user, amount) {
        if (!user) return;
        
        const pet = this.getPet(user);
        pet.exp += amount;
        
        let newSkinUnlocked = false;
        for (const [skinId, skin] of Object.entries(this._data.petSkins)) {
            if (pet.exp >= skin.expNeeded && !pet.unlockedSkins.includes(skinId)) {
                pet.unlockedSkins.push(skinId);
                newSkinUnlocked = true;
            }
        }
        
        let highestSkin = 'egg';
        let highestLevel = 0;
        for (const skinId of pet.unlockedSkins) {
            const skin = this._data.petSkins[skinId];
            if (skin.level > highestLevel) {
                highestLevel = skin.level;
                highestSkin = skinId;
            }
        }
        pet.skin = highestSkin;
        
        this.save();
        
        if (newSkinUnlocked) {
            const skin = this._data.petSkins[pet.skin];
            setTimeout(() => {
                if (typeof showToast === 'function') {
                    showToast(`🎉 Новый облик разблокирован! ${skin.name}`, 'success');
                }
            }, 500);
        }
        
        return pet;
    }

    getPetProgress(user) {
        const pet = this.getPet(user);
        if (!pet) return { current: 0, max: 1, percent: 0, nextSkin: null, currentSkin: null };
        
        const currentSkin = this._data.petSkins[pet.skin];
        let nextSkin = null;
        let nextLevel = currentSkin.level + 1;
        
        for (const [id, skin] of Object.entries(this._data.petSkins)) {
            if (skin.level === nextLevel) {
                nextSkin = skin;
                break;
            }
        }
        
        if (!nextSkin) {
            return { 
                current: pet.exp, 
                max: pet.exp, 
                percent: 100, 
                nextSkin: null, 
                currentSkin: currentSkin,
                isMaxLevel: true
            };
        }
        
        const expInLevel = pet.exp - currentSkin.expNeeded;
        const expNeeded = nextSkin.expNeeded - currentSkin.expNeeded;
        const percent = Math.min(100, Math.round((expInLevel / expNeeded) * 100));
        
        return { 
            current: expInLevel, 
            max: expNeeded, 
            percent: percent,
            nextSkin: nextSkin,
            currentSkin: currentSkin,
            isMaxLevel: false
        };
    }

    claimDailyBonus(user) {
        if (!user) return false;
        
        const pet = this.getPet(user);
        const today = new Date().toDateString();
        
        if (pet.lastDaily === today) {
            return false;
        }
        
        pet.lastDaily = today;
        pet.days = (pet.days || 0) + 1;
        this.addPetExp(user, 5);
        
        return true;
    }

    canClaimDaily(user) {
        if (!user) return false;
        const pet = this.getPet(user);
        const today = new Date().toDateString();
        return pet.lastDaily !== today;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
const DB = new Storage();
DB.restoreData();

window.addEventListener('beforeunload', () => {
    DB.save();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        DB.save();
    }
});

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
        console.log('Питомец:', DB.getPet(user.name));
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

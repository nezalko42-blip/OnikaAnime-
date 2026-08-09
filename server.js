// ============================================
// ONIKAANIME - СЕРВЕР
// ============================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// НАСТРОЙКИ
// ============================================

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// Путь к файлу базы данных
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// ============================================
// ЧТЕНИЕ / ЗАПИСЬ БАЗЫ ДАННЫХ
// ============================================

function readDB() {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const dataDir = path.join(__dirname, 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir);
            }
            const defaultDB = {
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
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
            return defaultDB;
        }
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch(e) {
        console.error('❌ Ошибка чтения БД:', e);
        return {};
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch(e) {
        console.error('❌ Ошибка записи БД:', e);
        return false;
    }
}

// ============================================
// API РОУТЫ
// ============================================

// Получить все данные
app.get('/api/db', (req, res) => {
    const db = readDB();
    res.json(db);
});

// Получить конкретный ключ
app.get('/api/db/:key', (req, res) => {
    const db = readDB();
    const key = req.params.key;
    if (db[key] !== undefined) {
        res.json(db[key]);
    } else {
        res.status(404).json({ error: 'Ключ не найден' });
    }
});

// Обновить все данные
app.post('/api/db', (req, res) => {
    const newData = req.body;
    if (writeDB(newData)) {
        res.json({ success: true, message: 'Данные сохранены' });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Обновить конкретный ключ
app.post('/api/db/:key', (req, res) => {
    const db = readDB();
    const key = req.params.key;
    const value = req.body;
    
    if (key === 'currentUser') {
        db.currentUser = value;
    } else {
        db[key] = value;
    }
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'Данные обновлены' });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Регистрация
app.post('/api/register', (req, res) => {
    const { name, password } = req.body;
    const db = readDB();
    
    if (!name || !password) {
        return res.status(400).json({ error: 'Имя и пароль обязательны' });
    }
    
    if (db.users[name]) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    
    db.users[name] = password;
    if (!db.profiles[name]) {
        db.profiles[name] = { bio: '', avatar: '' };
    }
    if (!db.favorites[name]) {
        db.favorites[name] = [];
    }
    if (!db.history[name]) {
        db.history[name] = [];
    }
    if (!db.continueWatching[name]) {
        db.continueWatching[name] = {};
    }
    if (!db.achievements[name]) {
        db.achievements[name] = [];
    }
    
    db.currentUser = name;
    
    if (writeDB(db)) {
        res.json({ success: true, user: name });
    } else {
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Вход
app.post('/api/login', (req, res) => {
    const { name, password } = req.body;
    const db = readDB();
    
    if (!name || !password) {
        return res.status(400).json({ error: 'Имя и пароль обязательны' });
    }
    
    if (!db.users[name]) {
        return res.status(400).json({ error: 'Пользователь не найден' });
    }
    
    if (db.users[name] !== password) {
        return res.status(400).json({ error: 'Неверный пароль' });
    }
    
    db.currentUser = name;
    writeDB(db);
    res.json({ success: true, user: name });
});

// Выход
app.post('/api/logout', (req, res) => {
    const db = readDB();
    db.currentUser = null;
    writeDB(db);
    res.json({ success: true });
});

// Удаление аккаунта
app.post('/api/delete-account', (req, res) => {
    const { name } = req.body;
    const db = readDB();
    
    if (!name) {
        return res.status(400).json({ error: 'Имя обязательно' });
    }
    
    delete db.users[name];
    delete db.profiles[name];
    delete db.favorites[name];
    delete db.history[name];
    delete db.continueWatching[name];
    delete db.achievements[name];
    delete db.activeTitle[name];
    
    for (let key in db.comments) {
        db.comments[key] = db.comments[key].filter(c => c.user !== name);
        if (db.comments[key].length === 0) {
            delete db.comments[key];
        }
    }
    
    if (db.currentUser === name) {
        db.currentUser = null;
    }
    
    writeDB(db);
    res.json({ success: true });
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

app.listen(PORT, () => {
    console.log('🚀 OnikaAnime сервер запущен!');
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`📁 База данных: ${DB_PATH}`);
});
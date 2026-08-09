// ============================================
// ONIKAANIME - СЕРВЕР С SQLite (EMAIL)
// ============================================

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(function() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS profiles (
        user_id INTEGER PRIMARY KEY,
        bio TEXT,
        avatar TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        anime TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, anime)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anime TEXT NOT NULL,
        user_name TEXT NOT NULL,
        text TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id TEXT NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, achievement_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS active_titles (
        user_id INTEGER PRIMARY KEY,
        title_id TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        anime TEXT NOT NULL,
        watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS continue_watching (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        anime TEXT NOT NULL,
        episode INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, anime)
    )`);

    console.log('✅ Таблицы созданы (или уже существовали)');
});

// ===== РЕГИСТРАЦИЯ =====
app.post('/api/register', (req, res) => {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
        return res.status(400).json({ error: 'Email, имя и пароль обязательны' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        if (user) return res.status(400).json({ error: 'Пользователь с таким email уже существует' });

        db.run('INSERT INTO users (email, name, password) VALUES (?, ?, ?)', 
            [email, name, password], 
            function(err) {
                if (err) return res.status(500).json({ error: 'Ошибка регистрации' });
                
                const userId = this.lastID;
                db.run('INSERT INTO profiles (user_id, bio, avatar) VALUES (?, ?, ?)', [userId, '', '']);
                db.run('INSERT INTO active_titles (user_id, title_id) VALUES (?, ?)', [userId, null]);
                
                res.json({ success: true, user: { id: userId, email, name } });
            }
        );
    });
});

// ===== ВХОД =====
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        if (!user) return res.status(400).json({ error: 'Неверный email или пароль' });
        
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    });
});

// ===== ВЫХОД =====
app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});

// ===== ПОЛУЧИТЬ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ =====
app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    
    db.get('SELECT id, email, name FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'Пользователь не найден' });
        
        const result = { id: user.id, email: user.email, name: user.name, favorites: [], achievements: [], activeTitle: null };
        
        db.all('SELECT anime FROM favorites WHERE user_id = ?', [userId], (err, favs) => {
            if (!err && favs) result.favorites = favs.map(f => f.anime);
            
            db.all('SELECT achievement_id FROM achievements WHERE user_id = ?', [userId], (err, ach) => {
                if (!err && ach) result.achievements = ach.map(a => a.achievement_id);
                
                db.get('SELECT title_id FROM active_titles WHERE user_id = ?', [userId], (err, title) => {
                    if (!err && title) result.activeTitle = title.title_id;
                    res.json(result);
                });
            });
        });
    });
});

// ===== ОБНОВИТЬ ИМЯ =====
app.post('/api/update-name', (req, res) => {
    const { userId, newName } = req.body;
    
    if (!userId || !newName) {
        return res.status(400).json({ error: 'ID пользователя и новое имя обязательны' });
    }
    
    db.run('UPDATE users SET name = ? WHERE id = ?', [newName, userId], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка обновления имени' });
        res.json({ success: true, name: newName });
    });
});

// ===== СОХРАНИТЬ ИЗБРАННОЕ =====
app.post('/api/favorites', (req, res) => {
    const { userId, favorites } = req.body;
    
    db.run('DELETE FROM favorites WHERE user_id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
        
        if (favorites && favorites.length > 0) {
            const stmt = db.prepare('INSERT INTO favorites (user_id, anime) VALUES (?, ?)');
            favorites.forEach(function(anime) { stmt.run([userId, anime]); });
            stmt.finalize();
        }
        res.json({ success: true });
    });
});

// ===== СОХРАНИТЬ ДОСТИЖЕНИЯ =====
app.post('/api/achievements', (req, res) => {
    const { userId, achievements } = req.body;
    
    db.run('DELETE FROM achievements WHERE user_id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
        
        if (achievements && achievements.length > 0) {
            const stmt = db.prepare('INSERT INTO achievements (user_id, achievement_id) VALUES (?, ?)');
            achievements.forEach(function(achId) { stmt.run([userId, achId]); });
            stmt.finalize();
        }
        res.json({ success: true });
    });
});

// ===== СОХРАНИТЬ АКТИВНЫЙ ТИТУЛ =====
app.post('/api/active-title', (req, res) => {
    const { userId, titleId } = req.body;
    
    db.run('INSERT OR REPLACE INTO active_titles (user_id, title_id) VALUES (?, ?)', [userId, titleId], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка сохранения' });
        res.json({ success: true });
    });
});

// ===== УДАЛЕНИЕ АККАУНТА =====
app.post('/api/delete-account', (req, res) => {
    const { userId } = req.body;
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Ошибка удаления' });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log('🚀 OnikaAnime сервер запущен!');
    console.log(`📡 http://localhost:${PORT}`);
});

// ============================================
// ONIKAANIME - СЕРВЕР (БЕЗ ДРУЗЕЙ)
// ============================================

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
        return;
    }
    console.log('✅ Подключение к PostgreSQL успешно!');
    release();
});

async function initDatabase() {
    try {
        await pool.query(`DROP TABLE IF EXISTS continue_watching`);
        await pool.query(`DROP TABLE IF EXISTS active_titles`);
        await pool.query(`DROP TABLE IF EXISTS achievements`);
        await pool.query(`DROP TABLE IF EXISTS comments`);
        await pool.query(`DROP TABLE IF EXISTS favorites`);
        await pool.query(`DROP TABLE IF EXISTS profiles`);
        await pool.query(`DROP TABLE IF EXISTS users`);

        console.log('🗑️ Старые таблицы удалены');

        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE profiles (
                user_id INTEGER PRIMARY KEY,
                bio TEXT,
                avatar TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                anime TEXT NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, anime)
            )
        `);

        await pool.query(`
            CREATE TABLE comments (
                id SERIAL PRIMARY KEY,
                anime TEXT NOT NULL,
                user_name TEXT NOT NULL,
                text TEXT NOT NULL,
                date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE achievements (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                achievement_id TEXT NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, achievement_id)
            )
        `);

        await pool.query(`
            CREATE TABLE active_titles (
                user_id INTEGER PRIMARY KEY,
                title_id TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE continue_watching (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                anime TEXT NOT NULL,
                episode INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, anime)
            )
        `);

        console.log('✅ Все таблицы созданы!');
        console.log('📊 База данных PostgreSQL готова!');
    } catch (err) {
        console.error('❌ Ошибка создания таблиц:', err);
    }
}

initDatabase();

// ===== РЕГИСТРАЦИЯ =====
app.post('/api/register', async (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
        return res.status(400).json({ error: 'Email, имя и пароль обязательны' });
    }
    try {
        const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Email уже используется' });
        }
        const existingName = await pool.query('SELECT id FROM users WHERE name = $1', [name]);
        if (existingName.rows.length > 0) {
            return res.status(400).json({ error: 'Имя уже используется' });
        }
        const result = await pool.query(
            'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id',
            [email, name, password]
        );
        const userId = result.rows[0].id;
        console.log('✅ Новый пользователь:', name, 'ID:', userId);
        await pool.query('INSERT INTO profiles (user_id, bio, avatar) VALUES ($1, $2, $3)', [userId, '', '']);
        await pool.query('INSERT INTO active_titles (user_id, title_id) VALUES ($1, $2)', [userId, null]);
        res.json({ success: true, user: { id: userId, email, name } });
    } catch (err) {
        console.error('❌ Ошибка регистрации:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== ВХОД =====
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        const user = result.rows[0];
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
        console.error('❌ Ошибка входа:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== ВЫХОД =====
app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});

// ===== ПОЛЬЗОВАТЕЛЬ =====
app.get('/api/user/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const userResult = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        const user = userResult.rows[0];
        const result = { id: user.id, email: user.email, name: user.name, favorites: [], achievements: [], activeTitle: null };
        const favs = await pool.query('SELECT anime FROM favorites WHERE user_id = $1', [userId]);
        result.favorites = favs.rows.map(f => f.anime);
        const ach = await pool.query('SELECT achievement_id FROM achievements WHERE user_id = $1', [userId]);
        result.achievements = ach.rows.map(a => a.achievement_id);
        const title = await pool.query('SELECT title_id FROM active_titles WHERE user_id = $1', [userId]);
        if (title.rows.length > 0) result.activeTitle = title.rows[0].title_id;
        res.json(result);
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/update-name', async (req, res) => {
    const { userId, newName } = req.body;
    if (!userId || !newName) return res.status(400).json({ error: 'ID и имя обязательны' });
    try {
        const existing = await pool.query('SELECT id FROM users WHERE name = $1 AND id != $2', [newName, userId]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Имя уже занято' });
        await pool.query('UPDATE users SET name = $1 WHERE id = $2', [newName, userId]);
        res.json({ success: true, name: newName });
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== ИЗБРАННОЕ =====
app.post('/api/favorites', async (req, res) => {
    const { userId, favorites } = req.body;
    if (!userId) return res.status(400).json({ error: 'ID обязателен' });
    try {
        await pool.query('DELETE FROM favorites WHERE user_id = $1', [userId]);
        if (favorites && favorites.length > 0) {
            for (const anime of favorites) {
                await pool.query('INSERT INTO favorites (user_id, anime) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, anime]);
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== ДОСТИЖЕНИЯ =====
app.post('/api/achievements', async (req, res) => {
    const { userId, achievements } = req.body;
    if (!userId) return res.status(400).json({ error: 'ID обязателен' });
    try {
        await pool.query('DELETE FROM achievements WHERE user_id = $1', [userId]);
        if (achievements && achievements.length > 0) {
            for (const achId of achievements) {
                await pool.query('INSERT INTO achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, achId]);
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/active-title', async (req, res) => {
    const { userId, titleId } = req.body;
    if (!userId) return res.status(400).json({ error: 'ID обязателен' });
    try {
        await pool.query('INSERT INTO active_titles (user_id, title_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET title_id = $2', [userId, titleId]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== УДАЛЕНИЕ АККАУНТА =====
app.post('/api/delete-account', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'ID обязателен' });
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error('❌ Ошибка:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== КОММЕНТАРИИ =====
app.get('/api/comments/:anime', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM comments WHERE anime = $1 ORDER BY created_at DESC', [req.params.anime]);
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/comments/all', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM comments ORDER BY created_at DESC');
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/comments', async (req, res) => {
    const { anime, user_name, text } = req.body;
    if (!anime || !user_name || !text) return res.status(400).json({ error: 'Все поля обязательны' });
    const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
    try {
        const result = await pool.query('INSERT INTO comments (anime, user_name, text, date) VALUES ($1, $2, $3, $4) RETURNING id', [anime, user_name, text, date]);
        res.json({ success: true, comment: { id: result.rows[0].id, anime, user_name, text, date } });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/comments/:id', async (req, res) => {
    const { user_name } = req.body;
    if (!user_name) return res.status(400).json({ error: 'Имя обязательно' });
    try {
        await pool.query('DELETE FROM comments WHERE id = $1 AND user_name = $2', [req.params.id, user_name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== ЗАПУСК =====
app.listen(PORT, () => {
    console.log('🚀 OnikaAnime сервер запущен!');
    console.log(`📡 http://localhost:${PORT}`);
});

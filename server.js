// ============================================
// ONIKAANIME - СЕРВЕР (POSTGRESQL)
// ИСПРАВЛЕННАЯ ВЕРСИЯ
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

// ===== ПОДКЛЮЧЕНИЕ К POSTGRESQL =====
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ===== ПРОВЕРКА ПОДКЛЮЧЕНИЯ =====
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
        return;
    }
    console.log('✅ Подключение к PostgreSQL успешно!');
    release();
});

// ===== СОЗДАНИЕ ТАБЛИЦ (ИСПРАВЛЕННОЕ) =====
async function initDatabase() {
    try {
        // УДАЛЯЕМ ВСЕ ТАБЛИЦЫ
        await pool.query(`DROP TABLE IF EXISTS messages`);
        await pool.query(`DROP TABLE IF EXISTS friends`);
        await pool.query(`DROP TABLE IF EXISTS continue_watching`);
        await pool.query(`DROP TABLE IF EXISTS active_titles`);
        await pool.query(`DROP TABLE IF EXISTS achievements`);
        await pool.query(`DROP TABLE IF EXISTS comments`);
        await pool.query(`DROP TABLE IF EXISTS favorites`);
        await pool.query(`DROP TABLE IF EXISTS profiles`);
        await pool.query(`DROP TABLE IF EXISTS users`);

        console.log('🗑️ Старые таблицы удалены');

        // СОЗДАЕМ ТАБЛИЦЫ В ПРАВИЛЬНОМ ПОРЯДКЕ
        // 1. Сначала users
        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Потом все, кто ссылается на users
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

        await pool.query(`
            CREATE TABLE friends (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                friend_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, friend_id)
            )
        `);

        await pool.query(`
            CREATE TABLE messages (
                id SERIAL PRIMARY KEY,
                from_user_id INTEGER NOT NULL,
                to_user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(to_user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Все таблицы созданы!');
        console.log('📊 База данных PostgreSQL готова!');
        console.log('🔢 SERIAL будет давать уникальные ID: 1, 2, 3...');
    } catch (err) {
        console.error('❌ Ошибка создания таблиц:', err);
    }
}

initDatabase();

// ============================================
// API РЕГИСТРАЦИИ
// ============================================

app.post('/api/register', async (req, res) => {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
        return res.status(400).json({ error: 'Email, имя и пароль обязательны' });
    }

    try {
        // Проверка email
        const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingEmail.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Проверка имени
        const existingName = await pool.query('SELECT id FROM users WHERE name = $1', [name]);
        if (existingName.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
        }

        // ВСТАВКА — SERIAL даст уникальный ID!
        const result = await pool.query(
            'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id',
            [email, name, password]
        );
        
        const userId = result.rows[0].id;
        console.log('✅ Новый пользователь создан, ID:', userId);

        // Создаем профиль
        await pool.query('INSERT INTO profiles (user_id, bio, avatar) VALUES ($1, $2, $3)', [userId, '', '']);
        
        // Создаем активный титул
        await pool.query('INSERT INTO active_titles (user_id, title_id) VALUES ($1, $2)', [userId, null]);
        
        res.json({ 
            success: true, 
            user: { id: userId, email, name } 
        });
    } catch (err) {
        console.error('Ошибка регистрации:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================
// API ВХОДА
// ============================================

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        
        const user = result.rows[0];
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
        console.error('Ошибка входа:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================
// ОСТАЛЬНЫЕ API
// ============================================

app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});

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
        console.error('Ошибка:', err);
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
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

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
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

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
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/delete-account', async (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'ID обязателен' });
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ success: true });
    } catch (err) {
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

// ===== ДРУЗЬЯ =====
app.get('/api/users/search', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json([]);
    try {
        const result = await pool.query('SELECT id, name, email FROM users WHERE id::text LIKE $1 OR name LIKE $2 LIMIT 20', ['%' + q + '%', '%' + q + '%']);
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Не найден' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/users/:id/profile', async (req, res) => {
    const userId = req.params.id;
    const currentUserId = req.query.currentUserId;
    try {
        const userResult = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'Не найден' });
        const user = userResult.rows[0];
        user.favorites = [];
        user.comments = [];
        user.achievements = [];
        user.history = [];
        user.friendStatus = 'none';
        
        const favs = await pool.query('SELECT anime FROM favorites WHERE user_id = $1', [userId]);
        user.favorites = favs.rows.map(f => f.anime);
        
        const comments = await pool.query('SELECT * FROM comments WHERE user_name = $1 ORDER BY created_at DESC LIMIT 50', [user.name]);
        user.comments = comments.rows || [];
        
        const ach = await pool.query('SELECT achievement_id FROM achievements WHERE user_id = $1', [userId]);
        user.achievements = ach.rows.map(a => a.achievement_id);
        
        const history = await pool.query('SELECT anime, episode, updated_at FROM continue_watching WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 20', [userId]);
        user.history = history.rows || [];
        
        if (currentUserId) {
            const friend = await pool.query('SELECT status FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [currentUserId, userId]);
            if (friend.rows.length > 0) user.friendStatus = friend.rows[0].status;
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/friends/request', async (req, res) => {
    const { userId, friendId } = req.body;
    if (!userId || !friendId) return res.status(400).json({ error: 'ID обязательны' });
    if (parseInt(userId) === parseInt(friendId)) return res.status(400).json({ error: 'Нельзя себя' });
    try {
        const user = await pool.query('SELECT id FROM users WHERE id = $1', [friendId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
        const existing = await pool.query('SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [userId, friendId]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Заявка уже существует' });
        await pool.query('INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3)', [userId, friendId, 'pending']);
        res.json({ success: true, message: 'Заявка отправлена' });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/friends/respond', async (req, res) => {
    const { userId, friendId, action } = req.body;
    if (!userId || !friendId || !action) return res.status(400).json({ error: 'Все поля обязательны' });
    try {
        if (action === 'accept') {
            const result = await pool.query('UPDATE friends SET status = $1 WHERE user_id = $2 AND friend_id = $3 AND status = $4', ['accepted', friendId, userId, 'pending']);
            if (result.rowCount === 0) return res.status(404).json({ error: 'Заявка не найдена' });
            res.json({ success: true, message: 'Друг добавлен' });
        } else {
            await pool.query('DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = $3', [friendId, userId, 'pending']);
            res.json({ success: true, message: 'Заявка отклонена' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/friends/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT u.id, u.name, u.email FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1 AND f.status = $2', [req.params.userId, 'accepted']);
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/friends/requests/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT u.id, u.name, u.email FROM friends f JOIN users u ON u.id = f.user_id WHERE f.friend_id = $1 AND f.status = $2', [req.params.userId, 'pending']);
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/friends/:userId/:friendId', async (req, res) => {
    try {
        await pool.query('DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [req.params.userId, req.params.friendId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ===== ЧАТ =====
app.post('/api/messages', async (req, res) => {
    const { fromUserId, toUserId, message } = req.body;
    if (!fromUserId || !toUserId || !message) return res.status(400).json({ error: 'Все поля обязательны' });
    try {
        const result = await pool.query('INSERT INTO messages (from_user_id, to_user_id, message) VALUES ($1, $2, $3) RETURNING id', [fromUserId, toUserId, message]);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/messages/:userId/:friendId', async (req, res) => {
    const { userId, friendId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    try {
        const result = await pool.query('SELECT * FROM messages WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1) ORDER BY created_at DESC LIMIT $3', [userId, friendId, limit]);
        await pool.query('UPDATE messages SET is_read = 1 WHERE from_user_id = $1 AND to_user_id = $2', [friendId, userId]);
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/messages/unread/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT from_user_id, COUNT(*) as count FROM messages WHERE to_user_id = $1 AND is_read = 0 GROUP BY from_user_id', [req.params.userId]);
        res.json(result.rows || []);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

app.listen(PORT, () => {
    console.log('🚀 OnikaAnime сервер запущен!');
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`🔢 ID будут создаваться автоматически: 1, 2, 3...`);
});

// ============================================
// ONIKAANIME - СЕРВЕР (С БЕЗОПАСНОСТЬЮ)
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// ===== ПОДКЛЮЧЕНИЕ К POSTGRESQL =====
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ===== ПРОВЕРКА ПОДКЛЮЧЕНИЯ =====
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
        process.exit(1);
    }
    console.log('✅ Подключение к PostgreSQL успешно!');
    release();
});

// ===== СОЗДАНИЕ ТАБЛИЦ =====
async function initDatabase() {
    try {
        console.log('📦 Создание таблиц...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS profiles (
                user_id INTEGER PRIMARY KEY,
                bio TEXT,
                avatar TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS favorites (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                anime TEXT NOT NULL,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, anime)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                anime TEXT NOT NULL,
                user_name TEXT NOT NULL,
                text TEXT NOT NULL,
                date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS achievements (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                achievement_id TEXT NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, achievement_id)
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS active_titles (
                user_id INTEGER PRIMARY KEY,
                title_id TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS continue_watching (
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
            CREATE TABLE IF NOT EXISTS friends (
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
            CREATE TABLE IF NOT EXISTS messages (
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

        // Индексы для производительности
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_name ON users(name)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_anime ON comments(anime)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id)`);

        console.log('✅ Все таблицы и индексы созданы!');
    } catch (err) {
        console.error('❌ Ошибка создания таблиц:', err.message);
        process.exit(1);
    }
}

initDatabase();

// ============================================
// ВАЛИДАЦИЯ
// ============================================

const schemas = {
    register: Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().min(3).max(30).required(),
        password: Joi.string().min(4).required()
    }),
    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),
    comment: Joi.object({
        anime: Joi.string().required(),
        user_name: Joi.string().required(),
        text: Joi.string().min(1).max(2000).required()
    }),
    updateName: Joi.object({
        userId: Joi.number().integer().required(),
        newName: Joi.string().min(3).max(30).required()
    })
};

// ============================================
// ЦЕНТРАЛИЗОВАННЫЙ ОБРАБОТЧИК ОШИБОК
// ============================================

const errorHandler = (err, req, res, next) => {
    console.error('❌ Ошибка:', err.message);
    
    if (err.isJoi) {
        return res.status(400).json({ error: err.details[0].message });
    }
    
    if (err.code === '23505') {
        return res.status(400).json({ error: 'Пользователь с таким email или именем уже существует' });
    }
    
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};

// ============================================
// API РЕГИСТРАЦИИ (С ХЕШИРОВАНИЕМ)
// ============================================

app.post('/api/register', async (req, res, next) => {
    try {
        const { error, value } = schemas.register.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { email, name, password } = value;
        
        // Проверка существования
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR name = $2',
            [email, name]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким email или именем уже существует' });
        }

        // Хеширование пароля
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id',
            [email, name, hashedPassword]
        );
        
        const userId = result.rows[0].id;

        // Создаём профиль и активный титул
        await pool.query('INSERT INTO profiles (user_id, bio, avatar) VALUES ($1, $2, $3)', [userId, '', '']);
        await pool.query('INSERT INTO active_titles (user_id, title_id) VALUES ($1, $2)', [userId, null]);
        
        console.log('✅ Новый пользователь создан, ID:', userId, 'Имя:', name);
        
        res.json({ 
            success: true, 
            user: { id: userId, email, name } 
        });
    } catch (err) {
        next(err);
    }
});

// ============================================
// API ВХОДА (С ПРОВЕРКОЙ ХЕША)
// ============================================

app.post('/api/login', async (req, res, next) => {
    try {
        const { error, value } = schemas.login.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { email, password } = value;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        
        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        
        console.log('✅ Вход:', user.name, 'ID:', user.id);
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
        next(err);
    }
});

// ============================================
// API ПОЛЬЗОВАТЕЛЯ
// ============================================

app.get('/api/user/:id', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }

        const userResult = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const user = userResult.rows[0];
        const result = { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            favorites: [], 
            achievements: [], 
            activeTitle: null
        };
        
        const favs = await pool.query('SELECT anime FROM favorites WHERE user_id = $1', [userId]);
        result.favorites = favs.rows.map(f => f.anime);
        
        const ach = await pool.query('SELECT achievement_id FROM achievements WHERE user_id = $1', [userId]);
        result.achievements = ach.rows.map(a => a.achievement_id);
        
        const title = await pool.query('SELECT title_id FROM active_titles WHERE user_id = $1', [userId]);
        if (title.rows.length > 0) result.activeTitle = title.rows[0].title_id;
        
        res.json(result);
    } catch (err) {
        next(err);
    }
});

app.post('/api/update-name', async (req, res, next) => {
    try {
        const { error, value } = schemas.updateName.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { userId, newName } = value;
        
        const existing = await pool.query('SELECT id FROM users WHERE name = $1 AND id != $2', [newName, userId]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Это имя уже занято' });
        }
        
        await pool.query('UPDATE users SET name = $1 WHERE id = $2', [newName, userId]);
        res.json({ success: true, name: newName });
    } catch (err) {
        next(err);
    }
});

// ============================================
// API ИЗБРАННОГО
// ============================================

app.post('/api/favorites', async (req, res, next) => {
    try {
        const { userId, favorites } = req.body;
        
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }
        
        await pool.query('DELETE FROM favorites WHERE user_id = $1', [userId]);
        
        if (favorites && favorites.length > 0) {
            for (const anime of favorites) {
                await pool.query(
                    'INSERT INTO favorites (user_id, anime) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [userId, anime]
                );
            }
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// ============================================
// API ДОСТИЖЕНИЙ
// ============================================

app.post('/api/achievements', async (req, res, next) => {
    try {
        const { userId, achievements } = req.body;
        
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }
        
        await pool.query('DELETE FROM achievements WHERE user_id = $1', [userId]);
        
        if (achievements && achievements.length > 0) {
            for (const achId of achievements) {
                await pool.query(
                    'INSERT INTO achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [userId, achId]
                );
            }
        }
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

app.post('/api/active-title', async (req, res, next) => {
    try {
        const { userId, titleId } = req.body;
        
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }
        
        await pool.query(
            `INSERT INTO active_titles (user_id, title_id) VALUES ($1, $2) 
             ON CONFLICT (user_id) DO UPDATE SET title_id = $2`,
            [userId, titleId]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// ============================================
// API КОММЕНТАРИЕВ
// ============================================

app.get('/api/comments/:anime', async (req, res, next) => {
    try {
        const anime = req.params.anime;
        const result = await pool.query('SELECT * FROM comments WHERE anime = $1 ORDER BY created_at DESC', [anime]);
        res.json(result.rows || []);
    } catch (err) {
        next(err);
    }
});

app.get('/api/comments/all', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM comments ORDER BY created_at DESC');
        res.json(result.rows || []);
    } catch (err) {
        next(err);
    }
});

app.post('/api/comments', async (req, res, next) => {
    try {
        const { error, value } = schemas.comment.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { anime, user_name, text } = value;
        const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
        
        const result = await pool.query(
            'INSERT INTO comments (anime, user_name, text, date) VALUES ($1, $2, $3, $4) RETURNING id',
            [anime, user_name, text, date]
        );
        
        res.json({ 
            success: true, 
            comment: { 
                id: result.rows[0].id, 
                anime, 
                user_name, 
                text, 
                date 
            } 
        });
    } catch (err) {
        next(err);
    }
});

app.delete('/api/comments/:id', async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { user_name } = req.body;
        
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Неверный ID комментария' });
        }
        if (!user_name) {
            return res.status(400).json({ error: 'Имя пользователя обязательно' });
        }
        
        const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [id]);
        if (comment.rows.length === 0) {
            return res.status(404).json({ error: 'Комментарий не найден' });
        }
        if (comment.rows[0].user_name !== user_name) {
            return res.status(403).json({ error: 'Вы не можете удалить этот комментарий' });
        }
        
        await pool.query('DELETE FROM comments WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// ============================================
// API УДАЛЕНИЯ АККАУНТА
// ============================================

app.post('/api/delete-account', async (req, res, next) => {
    try {
        const { userId } = req.body;
        
        if (!userId || isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }
        
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// ============================================
// API ДРУЗЕЙ
// ============================================

app.get('/api/users/search', async (req, res, next) => {
    try {
        const { q } = req.query;
        
        if (!q || q.length < 1) {
            return res.json([]);
        }
        
        const result = await pool.query(
            `SELECT id, name, email FROM users WHERE name ILIKE $1 LIMIT 20`,
            ['%' + q + '%']
        );
        res.json(result.rows || []);
    } catch (err) {
        next(err);
    }
});

app.get('/api/users/:id', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }

        const result = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

app.post('/api/friends/request', async (req, res, next) => {
    try {
        const { userId, friendId } = req.body;
        
        if (!userId || !friendId || isNaN(userId) || isNaN(friendId)) {
            return res.status(400).json({ error: 'ID пользователей обязательны' });
        }
        if (parseInt(userId) === parseInt(friendId)) {
            return res.status(400).json({ error: 'Нельзя добавить себя в друзья' });
        }
        
        const user = await pool.query('SELECT id FROM users WHERE id = $1', [friendId]);
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const existing = await pool.query(
            `SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
            [userId, friendId]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Заявка уже существует' });
        }
        
        await pool.query(
            'INSERT INTO friends (user_id, friend_id, status) VALUES ($1, $2, $3)',
            [userId, friendId, 'pending']
        );
        res.json({ success: true, message: 'Заявка отправлена' });
    } catch (err) {
        next(err);
    }
});

app.post('/api/friends/respond', async (req, res, next) => {
    try {
        const { userId, friendId, action } = req.body;
        
        if (!userId || !friendId || !action) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }
        
        if (action === 'accept') {
            const result = await pool.query(
                `UPDATE friends SET status = 'accepted' WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
                [friendId, userId]
            );
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Заявка не найдена' });
            }
            res.json({ success: true, message: 'Друг добавлен' });
        } else {
            await pool.query(
                `DELETE FROM friends WHERE user_id = $1 AND friend_id = $2 AND status = 'pending'`,
                [friendId, userId]
            );
            res.json({ success: true, message: 'Заявка отклонена' });
        }
    } catch (err) {
        next(err);
    }
});

app.get('/api/friends/:userId', async (req, res, next) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Неверный ID пользователя' });
        }

        const result = await pool.query(
            `SELECT u.id, u.name, u.email FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = $1 AND f.status = 'accepted'`,
            [userId]
        );
        res.json(result.rows || []);
    } catch (err) {
        next(err);
    }
});

// ============================================
// ОБРАБОТЧИК ОШИБОК (ДОЛЖЕН БЫТЬ ПОСЛЕДНИМ)
// ============================================

app.use(errorHandler);

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

app.listen(PORT, () => {
    console.log('🚀 OnikaAnime сервер запущен!');
    console.log(`📡 http://localhost:${PORT}`);
    console.log('🔒 Пароли защищены с помощью bcrypt');
    console.log('✅ Валидация данных включена');
});

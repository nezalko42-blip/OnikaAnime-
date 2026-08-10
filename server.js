// ============================================
// ONIKAANIME - СЕРВЕР SQLite (ИСПРАВЛЕННАЯ ВЕРСИЯ)
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
    // ===== ПОЛЬЗОВАТЕЛИ =====
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ===== ПРОФИЛИ =====
    db.run(`CREATE TABLE IF NOT EXISTS profiles (
        user_id INTEGER PRIMARY KEY,
        bio TEXT,
        avatar TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // ===== ИЗБРАННОЕ =====
    db.run(`CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        anime TEXT NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, anime)
    )`);

    // ===== КОММЕНТАРИИ =====
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anime TEXT NOT NULL,
        user_name TEXT NOT NULL,
        text TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ===== ДОСТИЖЕНИЯ =====
    db.run(`CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id TEXT NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, achievement_id)
    )`);

    // ===== АКТИВНЫЕ ТИТУЛЫ =====
    db.run(`CREATE TABLE IF NOT EXISTS active_titles (
        user_id INTEGER PRIMARY KEY,
        title_id TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // ===== ПРОДОЛЖЕНИЕ ПРОСМОТРА =====
    db.run(`CREATE TABLE IF NOT EXISTS continue_watching (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        anime TEXT NOT NULL,
        episode INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, anime)
    )`);

    // ===== ДРУЗЬЯ =====
    db.run(`CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, friend_id)
    )`);

    // ===== СООБЩЕНИЯ (ЧАТ) =====
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(to_user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    console.log('✅ Все таблицы созданы (или уже существовали)');
});

// ============================================
// API АВТОРИЗАЦИИ (ИСПРАВЛЕННЫЕ)
// ============================================

// ===== РЕГИСТРАЦИЯ =====
app.post('/api/register', (req, res) => {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
        return res.status(400).json({ error: 'Email, имя и пароль обязательны' });
    }

    // Проверка email
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingEmail) => {
        if (err) {
            console.error('Ошибка базы данных:', err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (existingEmail) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }

        // Проверка имени
        db.get('SELECT id FROM users WHERE name = ?', [name], (err, existingName) => {
            if (err) {
                console.error('Ошибка базы данных:', err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            if (existingName) {
                return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
            }

            // ВСТАВКА БЕЗ УКАЗАНИЯ ID — автоинкремент работает!
            db.run(
                'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
                [email, name, password],
                function(err) {
                    if (err) {
                        console.error('Ошибка регистрации:', err);
                        return res.status(500).json({ error: 'Ошибка регистрации' });
                    }
                    
                    const userId = this.lastID;
                    console.log('✅ Новый пользователь создан, ID:', userId);
                    
                    // Создаем профиль
                    db.run(
                        'INSERT INTO profiles (user_id, bio, avatar) VALUES (?, ?, ?)',
                        [userId, '', ''],
                        function(err) {
                            if (err) console.error('Ошибка создания профиля:', err);
                        }
                    );
                    
                    // Создаем активный титул
                    db.run(
                        'INSERT INTO active_titles (user_id, title_id) VALUES (?, ?)',
                        [userId, null],
                        function(err) {
                            if (err) console.error('Ошибка создания титула:', err);
                        }
                    );
                    
                    res.json({ 
                        success: true, 
                        user: { id: userId, email, name } 
                    });
                }
            );
        });
    });
});

// ===== ВХОД =====
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
        if (err) {
            console.error('Ошибка базы данных:', err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!user) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        
        res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    });
});

// ===== ВЫХОД =====
app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});

// ============================================
// API ПОЛЬЗОВАТЕЛЕЙ
// ============================================

app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    
    db.get('SELECT id, email, name FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Ошибка:', err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const result = { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            favorites: [], 
            achievements: [], 
            activeTitle: null
        };
        
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

app.post('/api/update-name', (req, res) => {
    const { userId, newName } = req.body;
    
    if (!userId || !newName) {
        return res.status(400).json({ error: 'ID пользователя и новое имя обязательны' });
    }
    
    // Проверяем, не занято ли имя
    db.get('SELECT id FROM users WHERE name = ? AND id != ?', [newName, userId], (err, existing) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        if (existing) return res.status(400).json({ error: 'Это имя уже занято' });
        
        db.run('UPDATE users SET name = ? WHERE id = ?', [newName, userId], function(err) {
            if (err) return res.status(500).json({ error: 'Ошибка обновления имени' });
            res.json({ success: true, name: newName });
        });
    });
});

// ============================================
// API ИЗБРАННОГО
// ============================================

app.post('/api/favorites', (req, res) => {
    const { userId, favorites } = req.body;
    
    if (!userId) return res.status(400).json({ error: 'ID пользователя обязателен' });
    
    db.run('DELETE FROM favorites WHERE user_id = ?', [userId], function(err) {
        if (err) {
            console.error('Ошибка удаления:', err);
            return res.status(500).json({ error: 'Ошибка сохранения' });
        }
        
        if (favorites && favorites.length > 0) {
            const stmt = db.prepare('INSERT INTO favorites (user_id, anime) VALUES (?, ?)');
            favorites.forEach(function(anime) { 
                stmt.run([userId, anime], function(err) {
                    if (err) console.error('Ошибка вставки:', err);
                });
            });
            stmt.finalize();
        }
        res.json({ success: true });
    });
});

// ============================================
// API ДОСТИЖЕНИЙ
// ============================================

app.post('/api/achievements', (req, res) => {
    const { userId, achievements } = req.body;
    
    if (!userId) return res.status(400).json({ error: 'ID пользователя обязателен' });
    
    db.run('DELETE FROM achievements WHERE user_id = ?', [userId], function(err) {
        if (err) {
            console.error('Ошибка удаления:', err);
            return res.status(500).json({ error: 'Ошибка сохранения' });
        }
        
        if (achievements && achievements.length > 0) {
            const stmt = db.prepare('INSERT INTO achievements (user_id, achievement_id) VALUES (?, ?)');
            achievements.forEach(function(achId) { 
                stmt.run([userId, achId], function(err) {
                    if (err) console.error('Ошибка вставки:', err);
                });
            });
            stmt.finalize();
        }
        res.json({ success: true });
    });
});

app.post('/api/active-title', (req, res) => {
    const { userId, titleId } = req.body;
    
    if (!userId) return res.status(400).json({ error: 'ID пользователя обязателен' });
    
    db.run('INSERT OR REPLACE INTO active_titles (user_id, title_id) VALUES (?, ?)', [userId, titleId], function(err) {
        if (err) {
            console.error('Ошибка сохранения:', err);
            return res.status(500).json({ error: 'Ошибка сохранения' });
        }
        res.json({ success: true });
    });
});

// ============================================
// API УДАЛЕНИЯ АККАУНТА
// ============================================

app.post('/api/delete-account', (req, res) => {
    const { userId } = req.body;
    
    if (!userId) return res.status(400).json({ error: 'ID пользователя обязателен' });
    
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
            console.error('Ошибка удаления:', err);
            return res.status(500).json({ error: 'Ошибка удаления' });
        }
        res.json({ success: true });
    });
});

// ============================================
// API КОММЕНТАРИЕВ
// ============================================

app.get('/api/comments/:anime', (req, res) => {
    const anime = req.params.anime;
    
    db.all('SELECT * FROM comments WHERE anime = ? ORDER BY created_at DESC', [anime], (err, rows) => {
        if (err) {
            console.error('Ошибка получения комментариев:', err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(rows || []);
    });
});

app.get('/api/comments/all', (req, res) => {
    db.all('SELECT * FROM comments ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            console.error('Ошибка:', err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        res.json(rows || []);
    });
});

app.post('/api/comments', (req, res) => {
    const { anime, user_name, text } = req.body;
    
    if (!anime || !user_name || !text) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
    
    db.run(
        'INSERT INTO comments (anime, user_name, text, date) VALUES (?, ?, ?, ?)',
        [anime, user_name, text, date],
        function(err) {
            if (err) {
                console.error('Ошибка добавления комментария:', err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            res.json({ 
                success: true, 
                comment: { 
                    id: this.lastID, 
                    anime, 
                    user_name, 
                    text, 
                    date 
                } 
            });
        }
    );
});

app.delete('/api/comments/:id', (req, res) => {
    const id = req.params.id;
    const { user_name } = req.body;
    
    if (!user_name) {
        return res.status(400).json({ error: 'Имя пользователя обязательно' });
    }
    
    db.get('SELECT * FROM comments WHERE id = ?', [id], (err, comment) => {
        if (err) {
            console.error('Ошибка:', err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!comment) {
            return res.status(404).json({ error: 'Комментарий не найден' });
        }
        if (comment.user_name !== user_name) {
            return res.status(403).json({ error: 'Вы не можете удалить этот комментарий' });
        }
        
        db.run('DELETE FROM comments WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('Ошибка удаления:', err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            res.json({ success: true });
        });
    });
});

// ============================================
// API ДРУЗЕЙ
// ============================================

// Поиск пользователей
app.get('/api/users/search', (req, res) => {
    const { q } = req.query;
    
    if (!q || q.length < 1) {
        return res.json([]);
    }
    
    db.all(
        'SELECT id, name, email FROM users WHERE id LIKE ? OR name LIKE ? LIMIT 20',
        ['%' + q + '%', '%' + q + '%'],
        (err, rows) => {
            if (err) {
                console.error('Ошибка поиска:', err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            res.json(rows || []);
        }
    );
});

// Получить пользователя по ID
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Ошибка:', err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(user);
    });
});

// Получить профиль друга
app.get('/api/users/:id/profile', (req, res) => {
    const userId = req.params.id;
    const currentUserId = req.query.currentUserId;
    
    db.get('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            console.error('Ошибка:', err);
            return res.status(500).json({ error: 'Ошибка базы данных' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        db.all('SELECT anime FROM favorites WHERE user_id = ?', [userId], (err, favs) => {
            user.favorites = favs ? favs.map(f => f.anime) : [];
            
            db.all('SELECT * FROM comments WHERE user_name = ? ORDER BY created_at DESC LIMIT 50', [user.name], (err, comments) => {
                user.comments = comments || [];
                
                db.all('SELECT achievement_id FROM achievements WHERE user_id = ?', [userId], (err, ach) => {
                    user.achievements = ach ? ach.map(a => a.achievement_id) : [];
                    
                    db.all('SELECT anime, episode, updated_at FROM continue_watching WHERE user_id = ? ORDER BY updated_at DESC LIMIT 20', [userId], (err, history) => {
                        user.history = history || [];
                        
                        if (currentUserId) {
                            db.get(
                                'SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
                                [currentUserId, userId, userId, currentUserId],
                                (err, friend) => {
                                    user.friendStatus = friend ? friend.status : 'none';
                                    res.json(user);
                                }
                            );
                        } else {
                            user.friendStatus = 'none';
                            res.json(user);
                        }
                    });
                });
            });
        });
    });
});

// Отправить заявку в друзья
app.post('/api/friends/request', (req, res) => {
    const { userId, friendId } = req.body;
    
    if (!userId || !friendId) {
        return res.status(400).json({ error: 'ID пользователей обязательны' });
    }
    if (userId === friendId) {
        return res.status(400).json({ error: 'Нельзя добавить себя в друзья' });
    }
    
    db.get('SELECT id FROM users WHERE id = ?', [friendId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        
        db.get(
            'SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
            [userId, friendId, friendId, userId],
            (err, existing) => {
                if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
                if (existing) {
                    return res.status(400).json({ error: 'Заявка уже существует' });
                }
                
                db.run(
                    'INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
                    [userId, friendId, 'pending'],
                    function(err) {
                        if (err) {
                            console.error('Ошибка:', err);
                            return res.status(500).json({ error: 'Ошибка отправки заявки' });
                        }
                        res.json({ success: true, message: 'Заявка отправлена' });
                    }
                );
            }
        );
    });
});

// Ответить на заявку
app.post('/api/friends/respond', (req, res) => {
    const { userId, friendId, action } = req.body;
    
    if (!userId || !friendId || !action) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    if (action === 'accept') {
        db.run(
            'UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ? AND status = ?',
            ['accepted', friendId, userId, 'pending'],
            function(err) {
                if (err) {
                    console.error('Ошибка:', err);
                    return res.status(500).json({ error: 'Ошибка принятия заявки' });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Заявка не найдена' });
                }
                res.json({ success: true, message: 'Друг добавлен' });
            }
        );
    } else if (action === 'reject' || action === 'block') {
        const status = action === 'block' ? 'blocked' : 'rejected';
        db.run(
            'UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ? AND status = ?',
            [status, friendId, userId, 'pending'],
            function(err) {
                if (err) {
                    console.error('Ошибка:', err);
                    return res.status(500).json({ error: 'Ошибка обработки заявки' });
                }
                res.json({ success: true, message: action === 'block' ? 'Пользователь заблокирован' : 'Заявка отклонена' });
            }
        );
    } else {
        res.status(400).json({ error: 'Неизвестное действие' });
    }
});

// Получить список друзей
app.get('/api/friends/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.all(
        `SELECT u.id, u.name, u.email, f.status, f.created_at as friend_since 
         FROM friends f 
         JOIN users u ON (u.id = f.friend_id OR u.id = f.user_id) 
         WHERE (f.user_id = ? OR f.friend_id = ?) 
         AND f.status = 'accepted' 
         AND u.id != ?`,
        [userId, userId, userId],
        (err, rows) => {
            if (err) {
                console.error('Ошибка:', err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            res.json(rows || []);
        }
    );
});

// Получить заявки в друзья
app.get('/api/friends/requests/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.all(
        `SELECT u.id, u.name, u.email, f.created_at 
         FROM friends f 
         JOIN users u ON u.id = f.user_id 
         WHERE f.friend_id = ? AND f.status = 'pending'`,
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Ошибка:', err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            res.json(rows || []);
        }
    );
});

// Удалить друга
app.delete('/api/friends/:userId/:friendId', (req, res) => {
    const { userId, friendId } = req.params;
    
    db.run(
        'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
        [userId, friendId, friendId, userId],
        function(err) {
            if (err) {
                console.error('Ошибка:', err);
                return res.status(500).json({ error: 'Ошибка удаления' });
            }
            res.json({ success: true });
        }
    );
});

// ============================================
// API ЧАТА
// ============================================

// Отправить сообщение
app.post('/api/messages', (req, res) => {
    const { fromUserId, toUserId, message } = req.body;
    
    if (!fromUserId || !toUserId || !message) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (message.length > 2000) {
        return res.status(400).json({ error: 'Сообщение слишком длинное' });
    }
    
    db.run(
        'INSERT INTO messages (from_user_id, to_user_id, message) VALUES (?, ?, ?)',
        [fromUserId, toUserId, message],
        function(err) {
            if (err) {
                console.error('Ошибка:', err);
                return res.status(500).json({ error: 'Ошибка отправки' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Получить сообщения
app.get('/api/messages/:userId/:friendId', (req, res) => {
    const { userId, friendId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    db.all(
        `SELECT * FROM messages 
         WHERE (from_user_id = ? AND to_user_id = ?) 
         OR (from_user_id = ? AND to_user_id = ?) 
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [userId, friendId, friendId, userId, limit, offset],
        (err, rows) => {
            if (err) {
                console.error('Ошибка:', err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            
            db.run(
                'UPDATE messages SET is_read = 1 WHERE from_user_id = ? AND to_user_id = ?',
                [friendId, userId],
                function(err) {}
            );
            
            res.json(rows || []);
        }
    );
});

// Получить непрочитанные сообщения
app.get('/api/messages/unread/:userId', (req, res) => {
    const userId = req.params.userId;
    
    db.all(
        'SELECT from_user_id, COUNT(*) as count FROM messages WHERE to_user_id = ? AND is_read = 0 GROUP BY from_user_id',
        [userId],
        (err, rows) => {
            if (err) {
                console.error('Ошибка:', err);
                return res.status(500).json({ error: 'Ошибка базы данных' });
            }
            res.json(rows || []);
        }
    );
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

app.listen(PORT, () => {
    console.log('🚀 OnikaAnime сервер запущен!');
    console.log(`📡 http://localhost:${PORT}`);
});

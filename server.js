// ============================================
// ONIKAANIME - СЕРВЕР (АДАПТИРОВАН ДЛЯ SPACEWEB)
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

// Настройка CORS для продакшена
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// ===== ПОДКЛЮЧЕНИЕ К POSTGRESQL =====
let pool;
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
} else {
    // Для локальной разработки
    pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'onikaanime',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    });
}

// ===== ПРОВЕРКА ПОДКЛЮЧЕНИЯ =====
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Ошибка подключения к PostgreSQL:', err.message);
        if (process.env.NODE_ENV === 'production') {
            console.error('⚠️ Проверьте переменные окружения DATABASE_URL');
        }
        return;
    }
    console.log('✅ Подключение к PostgreSQL успешно!');
    release();
});

// ===== СОЗДАНИЕ ТАБЛИЦ (ТОЛЬКО ДЛЯ РАЗРАБОТКИ) =====
async function initDatabase() {
    if (process.env.NODE_ENV === 'production') {
        console.log('📦 Production режим - пропускаем создание таблиц');
        return;
    }
    
    try {
        console.log('📦 Создание таблиц...');
        // ... (ваш код создания таблиц)
        console.log('✅ Все таблицы созданы!');
    } catch (err) {
        console.error('❌ Ошибка создания таблиц:', err.message);
    }
}

// Запускаем создание таблиц только в development
if (process.env.NODE_ENV !== 'production') {
    initDatabase();
}

// ============================================
// API МАРШРУТЫ
// ============================================

// ... (все ваши API маршруты)

// ============================================
// ОБРАБОТЧИК ОШИБОК
// ============================================

app.use((err, req, res, next) => {
    console.error('❌ Ошибка:', err.message);
    
    if (err.isJoi) {
        return res.status(400).json({ error: err.details[0].message });
    }
    
    if (err.code === '23505') {
        return res.status(400).json({ error: 'Пользователь с таким email или именем уже существует' });
    }
    
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
            ? 'Внутренняя ошибка сервера' 
            : err.message 
    });
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

app.listen(PORT, () => {
    console.log('🚀 OnikaAnime сервер запущен!');
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`🌍 Режим: ${process.env.NODE_ENV || 'development'}`);
});

// ============================================
// ИНИЦИАЛИЗАЦИЯ ONIKAANIME
// ============================================

(function initApp() {
    console.log('🚀 Запуск OnikaAnime...');
    
    // Проверяем хранилище
    var user = DB.get('currentUser');
    if (user) {
        console.log('👤 Авторизован:', user);
    } else {
        console.log('👤 Не авторизован');
    }
    
    // Применяем настройки
    var settings = DB.get('settings', { "3d": true, "vibe": true });
    window.is3D = settings['3d'] !== false;
    window.isVibe = settings['vibe'] !== false;
    
    // Обновляем UI
    if (typeof updateUI === 'function') {
        try { updateUI(); } catch(e) { console.error('UI Error:', e); }
    }
    
    // Загружаем каталог
    if (typeof loadCatalog === 'function') {
        setTimeout(function() {
            try { loadCatalog(); } catch(e) { console.error('Catalog Error:', e); }
        }, 100);
    }
    
    // Восстанавливаем продолжение
    if (user && typeof renderContinue === 'function') {
        setTimeout(function() {
            try { renderContinue(); } catch(e) { console.error('Continue Error:', e); }
        }, 200);
    }
    
    // Загружаем рекомендации
    if (user && typeof renderRecommendationsOnHome === 'function') {
        setTimeout(function() {
            try { renderRecommendationsOnHome(); } catch(e) { console.error('Recommendations Error:', e); }
        }, 300);
    }
    
    // Автосохранение
    setInterval(function() { DB.save(); }, 5000);
    window.addEventListener('beforeunload', function() { DB.save(); });
    
    console.log('✅ OnikaAnime готов!');
    console.log('🌟 Добро пожаловать!');
})();
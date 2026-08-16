// ============================================
// СЕРИЙЧИК - ВИРТУАЛЬНЫЙ ПИТОМЕЦ (ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ)
// ============================================

// ===== ОТКРЫТЬ МОДАЛЬНОЕ ОКНО =====
function openPetModal() {
    const modal = document.getElementById('petModal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderPetModal();
}

// ===== ЗАКРЫТЬ МОДАЛЬНОЕ ОКНО =====
function closePetModal() {
    const modal = document.getElementById('petModal');
    if (modal) modal.style.display = 'none';
}

// ===== РЕНДЕРИНГ МОДАЛЬНОГО ОКНА =====
function renderPetModal() {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        closePetModal();
        return;
    }
    
    // Создаём питомца если нет
    let pet = DB.getPet(user.name);
    if (!pet) {
        DB._data.pets[user.name] = {
            exp: 0,
            skin: 'egg',
            unlockedSkins: ['egg'],
            days: 0,
            lastDaily: null,
            name: 'Серийчик'
        };
        DB.save();
        pet = DB.getPet(user.name);
    }
    
    const progress = DB.getPetProgress(user.name);
    const skinData = DB._data.petSkins[pet.skin];
    
    // ===== АВАТАР С ИЗОБРАЖЕНИЕМ =====
    const avatarEl = document.getElementById('petModalAvatar');
    if (skinData && skinData.image) {
        avatarEl.innerHTML = `<img src="${skinData.image}" alt="${skinData.name}" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">`;
        avatarEl.style.background = 'transparent';
        avatarEl.style.fontSize = '0';
    } else {
        avatarEl.textContent = skinData ? (skinData.emoji || '🐱') : '🐱';
        avatarEl.style.background = 'transparent';
        avatarEl.style.fontSize = '56px';
    }
    
    // ===== ИМЯ ПИТОМЦА =====
    document.getElementById('petModalName').textContent = pet.name || 'Серийчик';
    document.getElementById('petModalSkin').textContent = skinData ? skinData.name : '❓ Неизвестно';
    
    // ===== ПРОГРЕСС =====
    document.getElementById('petModalProgressText').textContent = `${progress.current} / ${progress.max} очков`;
    document.getElementById('petModalProgressPercent').textContent = `${progress.percent}%`;
    document.getElementById('petModalProgressFill').style.width = `${progress.percent}%`;
    
    const nextText = progress.isMaxLevel 
        ? '🏆 Максимальный уровень!' 
        : `🎯 ${progress.nextSkin ? progress.nextSkin.name : 'Новый облик'} (${progress.max - progress.current} очков)`;
    document.getElementById('petModalNext').textContent = nextText;
    
    // ===== СТАТИСТИКА =====
    document.getElementById('petModalDays').textContent = pet.days || 0;
    document.getElementById('petModalEpisodes').textContent = pet.exp || 0;
    document.getElementById('petModalExp').textContent = pet.exp || 0;
    
    // ===== СКИНЫ =====
    renderPetSkins(pet);
    
    // ===== ЕЖЕДНЕВНЫЙ БОНУС =====
    const dailyBtn = document.getElementById('petDailyBtn');
    if (dailyBtn) {
        const canClaim = DB.canClaimDaily(user.name);
        dailyBtn.className = `pet-modal-btn daily ${canClaim ? '' : 'claimed'}`;
        dailyBtn.innerHTML = canClaim 
            ? '📅 Ежедневный бонус <span class="pet-modal-btn-reward">+5</span>'
            : '✅ Бонус получен сегодня';
        dailyBtn.disabled = !canClaim;
    }
    
    updatePetIcon(user.name);
}

// ===== РЕНДЕРИНГ СКИНОВ =====
function renderPetSkins(pet) {
    const grid = document.getElementById('petModalSkinsGrid');
    if (!grid) return;
    
    let html = '';
    for (const [id, skin] of Object.entries(DB._data.petSkins)) {
        const unlocked = pet.unlockedSkins.includes(id);
        const active = pet.skin === id;
        
        let displayContent;
        if (skin.image) {
            displayContent = `<img src="${skin.image}" alt="${skin.name}" style="width:28px;height:28px;object-fit:contain;border-radius:50%;">`;
        } else {
            displayContent = skin.emoji || '🎨';
        }
        
        html += `
            <div class="pet-modal-skin-item ${unlocked ? '' : 'locked'} ${active ? 'active' : ''}" 
                 onclick="${unlocked ? `changePetSkin('${id}')` : ''}"
                 title="${unlocked ? 'Надеть' : '🔒 Закрыто'}">
                ${displayContent}
            </div>
        `;
    }
    grid.innerHTML = html;
}

// ===== СМЕНА СКИНА =====
function changePetSkin(skinId) {
    const user = DB.get('currentUser');
    if (!user) return;
    
    const pet = DB.getPet(user.name);
    if (!pet.unlockedSkins.includes(skinId)) {
        showToast('🔒 Этот облик ещё не разблокирован!', 'warning');
        return;
    }
    
    pet.skin = skinId;
    DB.save();
    renderPetModal();
    updatePetIcon(user.name);
    showToast('✅ Облик изменён!', 'success');
}

// ===== ОБНОВЛЕНИЕ ИКОНКИ В МЕНЮ =====
function updatePetIcon(userName) {
    const user = DB.get('currentUser');
    if (!user) return;
    
    const pet = DB.getPet(user.name);
    if (!pet) return;
    
    const skinData = DB._data.petSkins[pet.skin];
    const petIcon = document.getElementById('petIcon');
    if (!petIcon) return;
    
    if (skinData && skinData.image) {
        petIcon.innerHTML = `<img src="${skinData.image}" alt="${skinData.name}" style="width:24px;height:24px;object-fit:contain;border-radius:50%;vertical-align:middle;">`;
        petIcon.style.fontSize = '0';
    } else {
        petIcon.textContent = skinData ? (skinData.emoji || '🐱') : '🐱';
        petIcon.style.fontSize = '20px';
    }
}

// ===== ИЗМЕНЕНИЕ ИМЕНИ ПИТОМЦА =====
function changePetName() {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    const pet = DB.getPet(user.name);
    const newName = prompt('Введите новое имя для Серийчика:', pet.name || 'Серийчик');
    if (newName && newName.trim().length > 0) {
        pet.name = newName.trim();
        DB.save();
        renderPetModal();
        showToast(`✅ Имя изменено на "${pet.name}"! 🐱`, 'success');
    } else if (newName !== null) {
        showToast('❌ Имя не может быть пустым!', 'warning');
    }
}

// ===== ДЕЙСТВИЯ =====
function watchAnimeForPet() {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    const title = document.getElementById('detailTitle')?.textContent;
    if (!title || title === 'Загрузка...' || title === 'Без названия') {
        showToast('📺 Сначала откройте аниме!', 'warning');
        closePetModal();
        navigate('catalog');
        return;
    }
    
    DB.addPetExp(user.name, 10);
    renderPetModal();
    updatePetIcon(user.name);
    showToast('📺 +10 очков за просмотр! 🐱', 'success');
}

function claimDailyBonusPet() {
    const user = DB.get('currentUser');
    if (!user) {
        showToast('Войдите в аккаунт!', 'error');
        return;
    }
    
    const claimed = DB.claimDailyBonus(user.name);
    if (claimed) {
        showToast('📅 +5 очков за ежедневный вход! 🐱', 'success');
        renderPetModal();
        updatePetIcon(user.name);
    } else {
        showToast('📅 Бонус уже получен сегодня!', 'warning');
    }
}

function togglePetDetails() {
    const user = DB.get('currentUser');
    if (!user) return;
    
    const pet = DB.getPet(user.name);
    const progress = DB.getPetProgress(user.name);
    const skinData = DB._data.petSkins[pet.skin];
    
    const nextText = progress.isMaxLevel 
        ? '🏆 Максимальный уровень!' 
        : `🎯 ${progress.percent}% до ${progress.nextSkin ? progress.nextSkin.name : 'максимума'}`;
    
    showToast(`
        ${skinData ? skinData.emoji || '🐱' : '🐱'} ${pet.name || 'Серийчик'}
        📊 ${progress.current} / ${progress.max} очков
        ${nextText}
        📅 Дней: ${pet.days || 0}
    `, 'info');
}

// ===== АВТОМАТИЧЕСКОЕ НАЧИСЛЕНИЕ ОЧКОВ =====
function checkDailyBonus() {
    const user = DB.get('currentUser');
    if (!user) return;
    
    // Автоматически начисляем ежедневный бонус
    const claimed = DB.claimDailyBonus(user.name);
    if (claimed) {
        console.log('📅 +5 очков за ежедневный вход! 🐱');
        // Обновляем иконку если нужно
        updatePetIcon(user.name);
    }
}

// ===== ОЧКИ ЗА ПРОСМОТР 12 СЕРИЙ =====
function checkAnimeComplete(animeName) {
    const user = DB.get('currentUser');
    if (!user) return;
    
    const continueData = DB.getUserData(user.name, 'continueWatching', {});
    if (continueData[animeName]) {
        const epCount = continueData[animeName].ep || 0;
        // Если просмотрено 12 серий — даём бонус
        if (epCount >= 12) {
            // Проверяем, не давали ли уже бонус за это аниме
            const completedAnime = DB.getUserData(user.name, 'completedAnime', []);
            if (!completedAnime.includes(animeName)) {
                completedAnime.push(animeName);
                DB.setUserData(user.name, 'completedAnime', completedAnime);
                DB.addPetExp(user.name, 10);
                console.log(`🎉 +10 очков за просмотр всех 12 серий "${animeName}"!`);
                showToast(`🎉 +10 очков за просмотр всех серий! 🐱`, 'success');
                renderPetModal();
                updatePetIcon(user.name);
            }
        }
    }
}

// ===== ПРИНУДИТЕЛЬНАЯ ИНИЦИАЛИЗАЦИЯ =====
function initPet() {
    const user = DB.get('currentUser');
    if (!user) return;
    
    // Создаём питомца если нет
    let pet = DB.getPet(user.name);
    if (!pet) {
        DB._data.pets[user.name] = {
            exp: 0,
            skin: 'egg',
            unlockedSkins: ['egg'],
            days: 0,
            lastDaily: null,
            name: 'Серийчик'
        };
        DB.save();
        pet = DB.getPet(user.name);
    }
    
    // Обновляем имя пользователя в меню
    const userNameEl = document.getElementById('sidebarUserName');
    if (userNameEl) {
        userNameEl.textContent = user.name;
    }
    
    // Обновляем иконку питомца
    updatePetIcon(user.name);
    
    // Проверяем ежедневный бонус
    checkDailyBonus();
    
    console.log('🐱 Серийчик инициализирован!');
    console.log('  Имя:', pet.name || 'Серийчик');
    console.log('  Облик:', DB._data.petSkins[pet.skin].name);
    console.log('  Очки:', pet.exp);
}

// ===== ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ =====
window.openPetModal = openPetModal;
window.closePetModal = closePetModal;
window.renderPetModal = renderPetModal;
window.changePetSkin = changePetSkin;
window.changePetName = changePetName;
window.watchAnimeForPet = watchAnimeForPet;
window.claimDailyBonusPet = claimDailyBonusPet;
window.togglePetDetails = togglePetDetails;
window.initPet = initPet;
window.updatePetIcon = updatePetIcon;
window.checkDailyBonus = checkDailyBonus;
window.checkAnimeComplete = checkAnimeComplete;

console.log('🐱 Серийчик с именем и автоматическими бонусами загружен!');

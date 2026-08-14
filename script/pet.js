// ============================================
// СЕРИЙЧИК - С КАСТОМНЫМИ ИЗОБРАЖЕНИЯМИ
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
    
    let pet = DB.getPet(user.name);
    if (!pet) {
        DB._data.pets[user.name] = {
            exp: 0,
            skin: 'egg',
            unlockedSkins: ['egg'],
            days: 0,
            lastDaily: null
        };
        DB.save();
        pet = DB.getPet(user.name);
    }
    
    const progress = DB.getPetProgress(user.name);
    const skinData = DB._data.petSkins[pet.skin];
    
    // ===== АВАТАР С ИЗОБРАЖЕНИЕМ =====
    const avatarEl = document.getElementById('petModalAvatar');
    if (skinData.image) {
        avatarEl.innerHTML = `<img src="${skinData.image}" alt="${skinData.name}" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">`;
        avatarEl.style.background = 'transparent';
        avatarEl.style.fontSize = '0';
    } else {
        avatarEl.textContent = skinData.emoji || '🐱';
        avatarEl.style.background = 'transparent';
        avatarEl.style.fontSize = '56px';
    }
    
    document.getElementById('petModalName').textContent = 'Серийчик';
    document.getElementById('petModalSkin').textContent = skinData.name;
    
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

// ===== РЕНДЕРИНГ СКИНОВ С ИЗОБРАЖЕНИЯМИ =====
function renderPetSkins(pet) {
    const grid = document.getElementById('petModalSkinsGrid');
    if (!grid) return;
    
    let html = '';
    for (const [id, skin] of Object.entries(DB._data.petSkins)) {
        const unlocked = pet.unlockedSkins.includes(id);
        const active = pet.skin === id;
        
        // Определяем, что показывать: изображение или эмодзи
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

// ===== ОБНОВЛЕНИЕ ИКОНКИ В МЕНЮ С ИЗОБРАЖЕНИЕМ =====
function updatePetIcon(userName) {
    const user = DB.get('currentUser');
    if (!user) return;
    
    const pet = DB.getPet(user.name);
    if (!pet) return;
    
    const skinData = DB._data.petSkins[pet.skin];
    const petIcon = document.getElementById('petIcon');
    if (!petIcon) return;
    
    if (skinData.image) {
        petIcon.innerHTML = `<img src="${skinData.image}" alt="${skinData.name}" style="width:24px;height:24px;object-fit:contain;border-radius:50%;vertical-align:middle;">`;
        petIcon.style.fontSize = '0';
    } else {
        petIcon.textContent = skinData.emoji || '🐱';
        petIcon.style.fontSize = '20px';
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
        ${skinData.emoji || '🐱'} ${skinData.name}
        📊 ${progress.current} / ${progress.max} очков
        ${nextText}
        📅 Дней: ${pet.days || 0}
    `, 'info');
}

function addPetExpForWatching(animeName) {
    const user = DB.get('currentUser');
    if (!user) return;
    
    const continueData = DB.getUserData(user.name, 'continueWatching', {});
    if (continueData[animeName]) {
        const epCount = continueData[animeName].ep || 0;
        if (epCount <= 5) {
            DB.addPetExp(user.name, 5);
            updatePetIcon(user.name);
            const modal = document.getElementById('petModal');
            if (modal && modal.style.display === 'flex') {
                renderPetModal();
            }
        }
    }
}

function initPet() {
    const user = DB.get('currentUser');
    if (user) {
        const pet = DB.getPet(user.name);
        if (!pet) {
            DB._data.pets[user.name] = {
                exp: 0,
                skin: 'egg',
                unlockedSkins: ['egg'],
                days: 0,
                lastDaily: null
            };
            DB.save();
        }
        const userNameEl = document.getElementById('sidebarUserName');
        if (userNameEl) {
            userNameEl.textContent = user.name;
        }
        updatePetIcon(user.name);
    }
}

// ===== ЭКСПОРТ =====
window.openPetModal = openPetModal;
window.closePetModal = closePetModal;
window.renderPetModal = renderPetModal;
window.changePetSkin = changePetSkin;
window.watchAnimeForPet = watchAnimeForPet;
window.claimDailyBonusPet = claimDailyBonusPet;
window.togglePetDetails = togglePetDetails;
window.addPetExpForWatching = addPetExpForWatching;
window.initPet = initPet;
window.updatePetIcon = updatePetIcon;

console.log('🐱 Серийчик с кастомными изображениями загружен!');

/**
 * ====================================================================
 * ГЛАВНЫЙ СЦЕНАРИЙ ДЛЯ GITHUB PAGES (ФРОНТЕНД BOBER SMP)
 * ====================================================================
 */

// 🌐 ЗАПУЩЕННЫЙ БЭКЕНД НА ХОСТИНГЕ WISPBYTE
const API_BASE_URL = 'http://78.154.103.34:14715';

let adminPassword = sessionStorage.getItem('bober_admin_pass') || null;
let currentTopicsData = [];
let selectedCategory = 'all';
let currentActiveTopicId = null;

const CATEGORY_NAMES = {
    announcements: '<i class="fa-solid fa-bullhorn"></i> Новости',
    general: '<i class="fa-solid fa-comments"></i> Общий чат',
    ideas: '<i class="fa-solid fa-lightbulb"></i> Идеи',
    reports: '<i class="fa-solid fa-shield-halved"></i> Жалобы'
};

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initMobileNav();
    initIpCopy();
    highlightActiveNavLink();

    if (document.getElementById('forum-form')) {
        initCustomDropdown();
        initForum();
        initCategoryTabs();
        initAdminPanel();
        initSearchFilter();
        initSkinModal();
    }
});

/* ==========================================
   1. ПЕРЕКЛЮЧЕНИЕ ТЕМЫ
   ========================================== */
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const savedTheme = localStorage.getItem('bober_theme') || 'dark';

    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'light') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('bober_theme', 'dark');
                toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
                showToast('<i class="fa-solid fa-moon"></i> Включена Тёмная тема');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('bober_theme', 'light');
                toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
                showToast('<i class="fa-solid fa-sun"></i> Включена Светлая тема');
            }
        });
    }
}

/* ==========================================
   2. МОБИЛЬНОЕ МЕНЮ
   ========================================== */
function initMobileNav() {
    const toggleBtn = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (toggleBtn && navMenu) {
        toggleBtn.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });
    }
}

/* ==========================================
   3. КОПИРОВАНИЕ IP
   ========================================== */
function initIpCopy() {
    const copyBoxes = document.querySelectorAll('.ip-copy-box, .btn-copy');

    copyBoxes.forEach(box => {
        box.addEventListener('click', (e) => {
            e.stopPropagation();
            const ipBox = box.classList.contains('ip-copy-box') ? box : box.closest('.ip-copy-box');
            const ipText = ipBox ? (ipBox.dataset.ip || ipBox.querySelector('.ip-text')?.innerText || '').trim() : '';

            if (!ipText) {
                showToast('<i class="fa-solid fa-triangle-exclamation"></i> Укажите свой IP-адрес в index.html в атрибуте data-ip или тексте!', true);
                return;
            }

            navigator.clipboard.writeText(ipText).then(() => {
                showToast('<i class="fa-solid fa-check"></i> IP сервера скопирован в буфер обмена!');
            }).catch(() => {
                showToast('<i class="fa-solid fa-xmark"></i> Не удалось скопировать IP', true);
            });
        });
    });
}

/* ==========================================
   4. ПОДСВЕТКА ССЫЛКИ
   ========================================== */
function highlightActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/* ==========================================
   5. КАСТОМНЫЙ ДРОПДАУН ВЫБОРА КАТЕГОРИИ
   ========================================== */
function initCustomDropdown() {
    const dropdown = document.querySelector('.custom-dropdown');
    const trigger = document.getElementById('custom-select-trigger');
    const label = document.getElementById('selected-cat-label');
    const hiddenInput = document.getElementById('category-select');
    const options = document.querySelectorAll('.custom-option');

    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    options.forEach(opt => {
        opt.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            const val = opt.dataset.val;
            hiddenInput.value = val;
            label.innerHTML = opt.innerHTML;

            dropdown.classList.remove('open');
        });
    });

    document.addEventListener('click', () => {
        dropdown.classList.remove('open');
    });
}

/* ==========================================
   6. ЛОГИКА ФОРУМА И ЭФФЕКТ КОНФЕТТИ
   ========================================== */
function initForum() {
    const form = document.getElementById('forum-form');
    const submitBtn = document.getElementById('submit-btn');

    loadTopics();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nickInput = document.getElementById('nickname-input');
        const catSelect = document.getElementById('category-select');
        const titleInput = document.getElementById('title-input');
        const msgInput = document.getElementById('message-input');

        const nickname = nickInput.value.trim();
        const message = msgInput.value.trim();

        if (!nickname || !message) {
            showToast('<i class="fa-solid fa-triangle-exclamation"></i> Заполните все обязательные поля!', true);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Отправка...';

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (adminPassword) {
                headers['X-Admin-Password'] = adminPassword;
            }

            let endpoint = `${API_BASE_URL}/api/messages`;
            let bodyPayload = {};

            if (currentActiveTopicId) {
                endpoint = `${API_BASE_URL}/api/messages/${currentActiveTopicId}/replies`;
                bodyPayload = { nickname, message };
                if (adminPassword) bodyPayload.password = adminPassword;
            } else {
                const category = catSelect.value || 'general';
                const title = titleInput.value.trim();
                if (!title) throw new Error('Укажите название темы!');

                bodyPayload = { nickname, category, title, message };
                if (adminPassword) bodyPayload.password = adminPassword;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(bodyPayload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при отправке');
            }

            msgInput.value = '';
            if (titleInput) titleInput.value = '';

            launchConfetti();

            showToast(currentActiveTopicId ? 
                '<i class="fa-solid fa-check"></i> Ответ опубликован!' : 
                '<i class="fa-solid fa-check"></i> Новая тема создана!'
            );

            if (currentActiveTopicId) {
                await openTopicView(currentActiveTopicId);
            } else {
                await loadTopics();
            }

        } catch (error) {
            console.error('Ошибка отправки:', error);
            showToast(`<i class="fa-solid fa-xmark"></i> ${error.message}`, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = currentActiveTopicId ? 
                '<i class="fa-solid fa-paper-plane"></i> Отправить ответ' : 
                '<i class="fa-solid fa-paper-plane"></i> Опубликовать тему';
        }
    });
}

function launchConfetti() {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'confetti-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '9999';
        document.body.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#ffffff', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
    const particles = [];

    for (let i = 0; i < 75; i++) {
        particles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * 200,
            y: canvas.height / 2,
            w: Math.random() * 9 + 6,
            h: Math.random() * 9 + 6,
            vx: (Math.random() - 0.5) * 14,
            vy: (Math.random() - 0.85) * 16,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rSpeed: (Math.random() - 0.5) * 12,
            opacity: 1
        });
    }

    let startTime = Date.now();
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let elapsed = Date.now() - startTime;

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.38;
            p.rotation += p.rSpeed;
            p.opacity = Math.max(0, 1 - elapsed / 2200);

            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });

        if (elapsed < 2200) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    animate();
}

function initCategoryTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCategory = btn.dataset.cat;
            
            if (currentActiveTopicId) {
                resetFormToCreateTopic();
            }

            loadTopics();
        });
    });
}

async function loadTopics() {
    const feed = document.getElementById('posts-feed');
    if (!feed) return;

    currentActiveTopicId = null;

    try {
        const url = `${API_BASE_URL}/api/messages?category=${selectedCategory}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Не удалось получить список тем');

        currentTopicsData = await response.json();
        renderTopicsList(currentTopicsData);

    } catch (error) {
        console.error('Ошибка загрузки тем:', error);
        feed.innerHTML = `
            <div class="feed-placeholder" style="border-color: rgba(255,255,255,0.3); color: var(--text-primary);">
                <i class="fa-solid fa-triangle-exclamation"></i> Не удалось подключиться к серверу Wispbyte (${API_BASE_URL}).<br>
                <small>Проверьте статус сервера на Wispbyte и настройки CORS</small>
            </div>
        `;
    }
}

function renderTopicsList(topics) {
    const feed = document.getElementById('posts-feed');
    if (!feed) return;

    resetFormToCreateTopic();

    if (topics.length === 0) {
        feed.innerHTML = `
            <div class="feed-placeholder">
                <i class="fa-regular fa-comments"></i> В этой категории пока нет тем. Создайте первую!
            </div>
        `;
        return;
    }

    feed.innerHTML = topics.map(topic => renderTopicCard(topic)).join('');
    attachTopicEvents();
}

function renderTopicCard(topic) {
    const formattedDate = formatDate(topic.timestamp);
    const cleanNick = escapeHTML(topic.nickname);
    const cleanTitle = escapeHTML(topic.title);
    const cleanMsg = escapeHTML(topic.message);

    const primarySkinUrl = `https://mc-heads.net/avatar/${encodeURIComponent(topic.nickname)}/28`;
    const fallbackSkinUrl = `https://minotar.net/helm/${encodeURIComponent(topic.nickname)}/28`;

    const catName = CATEGORY_NAMES[topic.category] || '<i class="fa-solid fa-comments"></i> Общий чат';
    const repliesCount = topic.replies ? topic.replies.length : 0;
    const viewsCount = topic.views || 1;
    const likesCount = topic.likes || 0;

    const isPinned = topic.isPinned || false;
    const isAdmin = topic.isAdmin || false;

    const pinnedBadgeHtml = isPinned ? `<span class="pinned-badge"><i class="fa-solid fa-thumbtack"></i> Закреплено</span>` : '';
    const adminBadgeHtml = isAdmin ? `<span class="admin-badge"><i class="fa-solid fa-shield-halved"></i> АДМИН</span>` : '';

    const adminActionsHtml = adminPassword ? `
        <div class="admin-actions" onclick="event.stopPropagation();">
            <button class="btn-pin-post" data-id="${topic.id}">
                <i class="fa-solid fa-thumbtack"></i> ${isPinned ? 'Открепить' : 'Закрепить'}
            </button>
            <button class="btn-delete-post" data-id="${topic.id}">
                <i class="fa-solid fa-trash"></i> Удалить
            </button>
        </div>
    ` : '';

    return `
        <article class="topic-card ${isPinned ? 'pinned' : ''}" data-topic-id="${topic.id}">
            <div class="topic-header-row">
                <span class="cat-badge">${catName}</span>
                ${pinnedBadgeHtml}
            </div>
            
            <h3 class="topic-title">${cleanTitle}</h3>
            <p class="topic-snippet">${cleanMsg}</p>

            <div class="topic-footer-row">
                <div class="topic-author-box">
                    <img src="${primarySkinUrl}" 
                         alt="${cleanNick}" 
                         class="avatar-skin-head"
                         data-nick="${cleanNick}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='${fallbackSkinUrl}';"
                         width="28" 
                         height="28">
                    <span>${cleanNick}</span>
                    ${adminBadgeHtml}
                </div>

                <div class="topic-stats">
                    <div class="stat-item"><i class="fa-regular fa-comment"></i> ${repliesCount}</div>
                    <div class="stat-item"><i class="fa-regular fa-eye"></i> ${viewsCount}</div>
                    <div class="stat-item"><i class="fa-regular fa-heart"></i> ${likesCount}</div>
                    <div class="stat-item"><i class="fa-regular fa-clock"></i> ${formattedDate}</div>
                    ${adminActionsHtml}
                </div>
            </div>
        </article>
    `;
}

async function openTopicView(topicId) {
    const feed = document.getElementById('posts-feed');
    if (!feed) return;

    currentActiveTopicId = topicId;

    try {
        const response = await fetch(`${API_BASE_URL}/api/messages/${topicId}`);
        if (!response.ok) throw new Error('Тема не найдена');

        const topic = await response.json();

        setFormToReplyMode(topic.title);

        const primarySkinUrl = `https://mc-heads.net/avatar/${encodeURIComponent(topic.nickname)}/32`;
        const fallbackSkinUrl = `https://minotar.net/helm/${encodeURIComponent(topic.nickname)}/32`;

        const formattedDate = formatDate(topic.timestamp);
        const cleanNick = escapeHTML(topic.nickname);
        const cleanTitle = escapeHTML(topic.title);
        const catName = CATEGORY_NAMES[topic.category] || '<i class="fa-solid fa-comments"></i> Общий чат';
        const adminBadgeHtml = topic.isAdmin ? `<span class="admin-badge"><i class="fa-solid fa-shield-halved"></i> АДМИНИСТРАТОР</span>` : '';

        const replies = topic.replies || [];
        const repliesHtml = replies.map(r => renderReplyCard(r)).join('');

        feed.innerHTML = `
            <button id="btn-back-to-topics" class="btn-back-topics">
                <i class="fa-solid fa-arrow-left"></i> Назад к списку тем
            </button>

            <article class="topic-detail-card">
                <div class="topic-header-row" style="margin-bottom: 0.75rem;">
                    <span class="cat-badge">${catName}</span>
                    <time class="post-time">${formattedDate}</time>
                </div>

                <h2 class="topic-title" style="font-size: 1.5rem; margin-bottom: 1rem;">${cleanTitle}</h2>
                
                <div class="topic-author-box" style="margin-bottom: 1rem;">
                    <img src="${primarySkinUrl}" alt="${cleanNick}" class="avatar-skin-head" data-nick="${cleanNick}" width="32" height="32" onerror="this.onerror=null; this.src='${fallbackSkinUrl}';">
                    <span>${cleanNick}</span>
                    ${adminBadgeHtml}
                </div>

                <p class="post-message">${formatMessageText(topic.message)}</p>

                <div class="post-footer" style="margin-top: 1.25rem;">
                    <div class="post-actions-left">
                        <button class="btn-like-post" data-id="${topic.id}">
                            <i class="fa-regular fa-heart"></i>
                            <span class="like-count">${topic.likes || 0}</span>
                        </button>
                        <button class="btn-copy-post" data-msg="${escapeHTML(topic.message)}">
                            <i class="fa-regular fa-copy"></i>
                            <span>Скопировать</span>
                        </button>
                    </div>
                </div>
            </article>

            <h3 class="replies-section-title">
                <i class="fa-regular fa-comments"></i> Ответы в теме (${replies.length})
            </h3>

            <div class="replies-list">
                ${replies.length > 0 ? repliesHtml : '<div class="feed-placeholder">В этой теме пока нет ответов. Напишите первый ответ слева!</div>'}
            </div>
        `;

        document.getElementById('btn-back-to-topics').addEventListener('click', () => {
            loadTopics();
        });

        attachPostEvents();

    } catch (err) {
        showToast(`<i class="fa-solid fa-xmark"></i> ${err.message}`, true);
        loadTopics();
    }
}

function renderReplyCard(reply) {
    const formattedDate = formatDate(reply.timestamp);
    const cleanNick = escapeHTML(reply.nickname);
    const primarySkinUrl = `https://mc-heads.net/avatar/${encodeURIComponent(reply.nickname)}/28`;
    const fallbackSkinUrl = `https://minotar.net/helm/${encodeURIComponent(reply.nickname)}/28`;

    const adminBadgeHtml = reply.isAdmin ? `<span class="admin-badge"><i class="fa-solid fa-shield-halved"></i> АДМИН</span>` : '';

    return `
        <div class="reply-card">
            <div class="post-header">
                <div class="post-author">
                    <img src="${primarySkinUrl}" alt="${cleanNick}" class="avatar-skin-head" data-nick="${cleanNick}" width="28" height="28" onerror="this.onerror=null; this.src='${fallbackSkinUrl}';">
                    <span>${cleanNick}</span>
                    ${adminBadgeHtml}
                </div>
                <time class="post-time">${formattedDate}</time>
            </div>
            <p class="post-message">${formatMessageText(reply.message)}</p>
        </div>
    `;
}

function setFormToReplyMode(topicTitle) {
    const formTitle = document.getElementById('form-card-title');
    const catGroup = document.getElementById('category-group');
    const titleGroup = document.getElementById('title-group');
    const submitBtn = document.getElementById('submit-btn');

    if (formTitle) formTitle.innerHTML = `<i class="fa-solid fa-reply"></i> Ответить в тему`;
    if (catGroup) catGroup.style.display = 'none';
    if (titleGroup) titleGroup.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Отправить ответ`;
}

function resetFormToCreateTopic() {
    const formTitle = document.getElementById('form-card-title');
    const catGroup = document.getElementById('category-group');
    const titleGroup = document.getElementById('title-group');
    const submitBtn = document.getElementById('submit-btn');

    if (formTitle) formTitle.innerHTML = `<i class="fa-solid fa-plus"></i> Создать тему`;
    if (catGroup) catGroup.style.display = 'block';
    if (titleGroup) titleGroup.style.display = 'block';
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Опубликовать тему`;
}

function initSearchFilter() {
    const searchInput = document.getElementById('forum-search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        if (currentActiveTopicId) return;
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderTopicsList(currentTopicsData);
            return;
        }

        const filtered = currentTopicsData.filter(topic => 
            topic.title.toLowerCase().includes(query) ||
            topic.nickname.toLowerCase().includes(query) || 
            topic.message.toLowerCase().includes(query)
        );

        renderTopicsList(filtered);
    });
}

function attachTopicEvents() {
    const topicCards = document.querySelectorAll('.topic-card');
    topicCards.forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.topicId, 10);
            if (id) openTopicView(id);
        });
    });

    attachPostEvents();
}

function attachPostEvents() {
    const likeBtns = document.querySelectorAll('.btn-like-post');
    likeBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const postId = btn.dataset.id;
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/${postId}/like`, { method: 'POST' });
                const data = await response.json();
                if (response.ok) {
                    const countSpan = btn.querySelector('.like-count');
                    if (countSpan) countSpan.innerText = data.likes;
                    btn.classList.add('liked');
                    btn.querySelector('i').className = 'fa-solid fa-heart';
                }
            } catch (err) {
                console.error('Ошибка лайка:', err);
            }
        });
    });

    const copyBtns = document.querySelectorAll('.btn-copy-post');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const text = btn.dataset.msg;
            navigator.clipboard.writeText(text).then(() => {
                showToast('<i class="fa-solid fa-check"></i> Текст скопирован!');
            });
        });
    });

    const skinClickables = document.querySelectorAll('.avatar-skin-head');
    skinClickables.forEach(elem => {
        elem.addEventListener('click', (e) => {
            e.stopPropagation();
            const nick = elem.dataset.nick;
            if (nick) openSkinModal(nick);
        });
    });

    const deleteBtns = document.querySelectorAll('.btn-delete-post');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const postId = btn.dataset.id;
            if (!confirm(`Удалить тему #${postId}?`)) return;

            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/${postId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    }
                });
                if (!response.ok) throw new Error('Ошибка удаления');
                showToast('<i class="fa-solid fa-trash"></i> Тема удалена');
                await loadTopics();
            } catch (err) {
                showToast(`<i class="fa-solid fa-xmark"></i> ${err.message}`, true);
            }
        });
    });

    const pinBtns = document.querySelectorAll('.btn-pin-post');
    pinBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const postId = btn.dataset.id;
            try {
                const response = await fetch(`${API_BASE_URL}/api/messages/${postId}/pin`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Admin-Password': adminPassword
                    }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Ошибка закрепления');
                showToast(`<i class="fa-solid fa-thumbtack"></i> ${data.message}`);
                await loadTopics();
            } catch (err) {
                showToast(`<i class="fa-solid fa-xmark"></i> ${err.message}`, true);
            }
        });
    });
}

function initSkinModal() {
    const skinModal = document.getElementById('skin-modal');
    const closeBtn = document.getElementById('close-skin-modal-btn');
    if (!skinModal) return;

    closeBtn.addEventListener('click', () => skinModal.classList.remove('active'));
    skinModal.addEventListener('click', (e) => {
        if (e.target === skinModal) skinModal.classList.remove('active');
    });
}

function openSkinModal(nickname) {
    const skinModal = document.getElementById('skin-modal');
    const nickTitle = document.getElementById('skin-nick-title');
    const renderImg = document.getElementById('skin-render-img');
    const downloadBtn = document.getElementById('skin-download-btn');
    if (!skinModal) return;

    nickTitle.innerText = nickname;
    renderImg.src = `https://visage.surgeplay.com/full/512/${encodeURIComponent(nickname)}`;
    renderImg.onerror = () => {
        renderImg.onerror = null;
        renderImg.src = `https://mc-heads.net/body/${encodeURIComponent(nickname)}/250`;
    };
    downloadBtn.href = `https://minotar.net/download/${encodeURIComponent(nickname)}`;
    skinModal.classList.add('active');
}

function initAdminPanel() {
    const modal = document.getElementById('admin-modal');
    const toggleBtn = document.getElementById('admin-toggle-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const authForm = document.getElementById('admin-auth-form');
    const clearAllBtn = document.getElementById('admin-clear-all-btn');

    if (adminPassword) {
        updateAdminUI(true);
    }

    toggleBtn.addEventListener('click', () => {
        if (adminPassword) {
            adminPassword = null;
            sessionStorage.removeItem('bober_admin_pass');
            updateAdminUI(false);
            showToast('<i class="fa-solid fa-right-from-bracket"></i> Вы вышли из Админ-панели');
            loadTopics();
        } else {
            modal.classList.add('active');
        }
    });

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const passInput = document.getElementById('admin-password');
        const enteredPass = passInput.value.trim();

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: enteredPass })
            });

            if (!response.ok) throw new Error('Неверный пароль администратора!');

            adminPassword = enteredPass;
            sessionStorage.setItem('bober_admin_pass', enteredPass);

            modal.classList.remove('active');
            passInput.value = '';
            updateAdminUI(true);
            showToast('<i class="fa-solid fa-shield-halved"></i> Авторизация успешна!');
            await loadTopics();

        } catch (err) {
            showToast(`<i class="fa-solid fa-circle-exclamation"></i> ${err.message}`, true);
        }
    });

    clearAllBtn.addEventListener('click', async () => {
        if (!confirm('⚠️ Вы уверены, что хотите ОЧИСТИТЬ ВСЕ темы форума?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/messages`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Password': adminPassword
                }
            });
            if (!response.ok) throw new Error('Ошибка очистки тем');
            showToast('<i class="fa-solid fa-broom"></i> Все темы форума успешно удалены!');
            await loadTopics();
        } catch (err) {
            showToast(`<i class="fa-solid fa-xmark"></i> ${err.message}`, true);
        }
    });
}

function updateAdminUI(isLoggedIn) {
    const toggleBtn = document.getElementById('admin-toggle-btn');
    const clearAllBtn = document.getElementById('admin-clear-all-btn');

    if (isLoggedIn) {
        toggleBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Выйти из Админки';
        clearAllBtn.style.display = 'inline-block';
    } else {
        toggleBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Вход в Админку';
        clearAllBtn.style.display = 'none';
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${hours}:${minutes}, ${day}.${month}.${year}`;
}

function formatMessageText(rawMsg) {
    const escaped = escapeHTML(rawMsg);
    return escaped.replace(/@([a-zA-Z0-9_]{2,24})/g, '<span class="mention">@$1</span>');
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(messageHtml, isError = false) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.innerHTML = messageHtml;
    if (isError) {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

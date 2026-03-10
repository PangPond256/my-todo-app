let allTasks = [];
let allUsers = [];
let allCategories = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser =
        window.reviewerMode?.getCurrentUser?.() ||
        JSON.parse(localStorage.getItem('user') || 'null');

    if (!currentUser) {
        window.location.href = '/login';
        return;
    }

    renderUserProfile(currentUser);
    bindFilterEvents();
    bindAddButtonGuard();

    await initializePage();
});

async function initializePage() {
    try {
        await Promise.all([loadUsers(), loadCategories()]);
        await loadTasks();
    } catch (error) {
        console.error('Initialize page error:', error);
        allTasks = [];
        updateResultCount(0, 0);
        renderTasks([]);
    }
}

function bindAddButtonGuard() {
    const addButton = document.querySelector('.btn-add');
    if (!addButton) return;

    addButton.addEventListener('click', (e) => {
        if (window.reviewerMode?.isReviewerMode?.()) {
            e.preventDefault();
            alert('Reviewer demo เป็นโหมดดูอย่างเดียว');
        }
    });
}

function renderUserProfile(user) {
    const nameEl = document.querySelector('.user-name');
    const emailEl = document.querySelector('.user-email');
    const avatarArea = document.getElementById('user-avatar');

    if (nameEl) nameEl.textContent = user.name || 'User';
    if (emailEl) emailEl.textContent = user.email || '';

    if (avatarArea) {
        avatarArea.innerHTML = `
            <div class="avatar-circle ${user.color || 'bg-blue'}">
                ${(user.name || 'U').charAt(0).toUpperCase()}
            </div>
        `;
    }
}

function bindFilterEvents() {
    const ids = ['searchInput', 'statusFilter', 'priorityFilter', 'categoryFilter', 'ownerFilter'];

    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', applyFilters);
        el.addEventListener('change', applyFilters);
    });
}

async function safeJsonFetch(url, fallback, options = {}) {
    try {
        const res =
            (await window.reviewerMode?.reviewerFetch?.(url, options)) ||
            (await fetch(url, options));

        const contentType = res.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            console.error(`API ${url} ไม่ได้ส่ง JSON`);
            return fallback;
        }

        return await res.json();
    } catch (error) {
        console.error(`Fetch error ${url}:`, error);
        return fallback;
    }
}

async function loadUsers() {
    const users = await safeJsonFetch('/api/users/all', []);
    allUsers = Array.isArray(users) ? users : [];

    ensureCurrentUserInUsers();
    ensureDemoUserInUsers();
}

async function loadCategories() {
    const categories = await safeJsonFetch('/api/categories/all', []);
    allCategories = Array.isArray(categories) ? categories : [];
    renderCategoryFilter();
}

function renderCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    select.innerHTML = `<option value="">ทุกหมวดหมู่</option>`;

    allCategories.forEach((cat) => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

async function loadTasks() {
    const data = await safeJsonFetch(
        `/api/tasks?email=${encodeURIComponent(currentUser.email)}`,
        { success: false, tasks: [] }
    );

    allTasks = data.success && Array.isArray(data.tasks) ? data.tasks : [];

    hydrateUsersFromTasks(allTasks);
    applyFilters();
}

function applyFilters() {
    const search = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
    const status = document.getElementById('statusFilter')?.value || '';
    const priority = document.getElementById('priorityFilter')?.value || '';
    const category = document.getElementById('categoryFilter')?.value || '';
    const ownerType = document.getElementById('ownerFilter')?.value || '';

    let filtered = [...allTasks];

    if (search) {
        filtered = filtered.filter((task) => {
            const title = (task.title || '').toLowerCase();
            const desc = (task.description || '').toLowerCase();
            const cat = (task.categoryName || '').toLowerCase();
            const owner = getOwnerDisplay(task);
            const tagged = getTaggedUsers(task.taggedUsers || []);

            return (
                title.includes(search) ||
                desc.includes(search) ||
                cat.includes(search) ||
                (owner.name || '').toLowerCase().includes(search) ||
                (owner.email || '').toLowerCase().includes(search) ||
                tagged.some((user) => {
                    return (
                        (user.name || '').toLowerCase().includes(search) ||
                        (user.email || '').toLowerCase().includes(search)
                    );
                })
            );
        });
    }

    if (status) {
        filtered = filtered.filter((task) => task.status === status);
    }

    if (priority) {
        filtered = filtered.filter((task) => task.priority === priority);
    }

    if (category) {
        filtered = filtered.filter((task) => (task.categoryName || '') === category);
    }

    if (ownerType === 'mine') {
        filtered = filtered.filter(
            (task) => normalizeText(task.userEmail) === normalizeText(currentUser.email)
        );
    }

    if (ownerType === 'tagged') {
        filtered = filtered.filter(
            (task) =>
                normalizeText(task.userEmail) !== normalizeText(currentUser.email) &&
                Array.isArray(task.taggedUsers) &&
                task.taggedUsers.some(
                    (email) => normalizeText(email) === normalizeText(currentUser.email)
                )
        );
    }

    updateResultCount(filtered.length, allTasks.length);
    renderTasks(filtered);
}

function updateResultCount(filteredCount, totalCount) {
    const result = document.getElementById('resultCount');
    if (!result) return;
    result.textContent = `แสดง ${filteredCount} จาก ${totalCount} งาน`;
}

function renderTasks(tasks) {
    const grid = document.getElementById('tasksGrid');
    if (!grid) return;

    if (!tasks.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>ไม่พบงานที่ตรงกับเงื่อนไข</h3>
                <p>ลองเปลี่ยนคำค้นหาหรือฟิลเตอร์ดูอีกครั้ง</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = tasks
        .map((task) => {
            const owner = getOwnerDisplay(task);
            const taggedUsers = getTaggedUsers(task.taggedUsers || []);
            const isOwner = normalizeText(task.userEmail) === normalizeText(currentUser.email);
            const readOnly = window.reviewerMode?.isReviewerMode?.();
            const overdue = isOverdue(task);

            const priorityClass = `priority-${escapeHtml(task.priority || 'medium')}`;
            const overdueClass = overdue ? 'overdue' : '';

            return `
            <article class="task-card ${priorityClass} ${overdueClass}">
                <div class="task-inner">
                    <div class="task-top">
                        <div class="task-title-block">
                            <h3>${escapeHtml(task.title || '-')}</h3>
                            <p class="task-desc">${escapeHtml(task.description || 'ไม่มีรายละเอียด')}</p>
                        </div>

                        <div class="badge-row">
                            <span class="badge ${priorityClass}">
                                ${mapPriority(task.priority)}
                            </span>
                            <span class="badge category">
                                ${escapeHtml(task.categoryName || 'ไม่ระบุหมวดหมู่')}
                            </span>
                        </div>
                    </div>

                    <div class="task-divider"></div>

                    <div class="task-footer">
                        <div class="footer-left">
                            <div class="meta-row">
                                <span class="meta-item ${overdue ? 'overdue-text' : ''}">
                                    <span class="material-symbols-outlined">calendar_today</span>
                                    ${formatThaiDate(task.dueDate)}
                                </span>
                            </div>

                            <div class="task-people-block">
                                <div class="task-person-row">
                                    <span class="task-person-label">เจ้าของงาน</span>
                                    <div class="task-person-chip">
                                        <div class="task-person-avatar ${owner.color || 'bg-blue'}">
                                            ${getInitial(owner.name || owner.email || 'U')}
                                        </div>
                                        <div class="task-person-info">
                                            <strong>${escapeHtml(owner.name || owner.email || '-')}</strong>
                                            <small>${escapeHtml(owner.email || '-')}</small>
                                        </div>
                                    </div>
                                </div>

                                ${taggedUsers.length
                    ? `
                                    <div class="task-person-row">
                                        <span class="task-person-label">ผู้เกี่ยวข้อง</span>
                                        <div class="task-people-list">
                                            ${taggedUsers
                        .map(
                            (user) => `
                                                <div class="task-person-chip compact">
                                                    <div class="task-person-avatar ${user.color || 'bg-blue'}">
                                                        ${getInitial(user.name || user.email || 'U')}
                                                    </div>
                                                    <div class="task-person-info">
                                                        <strong>${escapeHtml(user.name || user.email || '-')}</strong>
                                                        <small>${escapeHtml(user.email || '-')}</small>
                                                    </div>
                                                </div>
                                            `
                        )
                        .join('')}
                                        </div>
                                    </div>
                                `
                    : ''
                }
                            </div>
                        </div>

                        <div class="footer-right">
                            ${!isOwner ? `<span class="owner-only">ดูได้อย่างเดียว</span>` : ''}

                            <select
                                class="status-select"
                                ${!isOwner || readOnly ? 'disabled' : ''}
                                onchange="updateTaskStatus('${escapeJs(task._id)}', this.value)"
                            >
                                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                                <option value="doing" ${task.status === 'doing' ? 'selected' : ''}>กำลังทำ</option>
                                <option value="done" ${task.status === 'done' ? 'selected' : ''}>เสร็จสิ้น</option>
                            </select>
                        </div>
                    </div>
                </div>
            </article>
        `;
        })
        .join('');
}

async function updateTaskStatus(taskId, status) {
    if (window.reviewerMode?.isReviewerMode?.()) {
        alert('Reviewer demo เป็นโหมดดูอย่างเดียว');
        await loadTasks();
        return;
    }

    const response = await safeJsonFetch(
        `/api/tasks/${taskId}/status`,
        { success: false, message: 'เกิดข้อผิดพลาด' },
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requesterEmail: currentUser.email,
                status
            })
        }
    );

    if (!response.success) {
        alert(response.message || 'อัปเดตสถานะไม่สำเร็จ');
    }

    await loadTasks();
}

function getOwnerDisplay(task) {
    const ownerEmail = task?.userEmail || '';
    const foundUser = getUserByEmail(ownerEmail);

    if (foundUser) {
        return {
            name: foundUser.name || ownerEmail,
            email: foundUser.email || ownerEmail,
            color: foundUser.color || 'bg-blue'
        };
    }

    const currentIsOwner =
        normalizeText(ownerEmail) &&
        normalizeText(ownerEmail) === normalizeText(currentUser?.email);

    if (currentIsOwner) {
        return {
            name: currentUser?.name || ownerEmail,
            email: currentUser?.email || ownerEmail,
            color: currentUser?.color || 'bg-blue'
        };
    }

    const demoUser = getKnownDemoUser();
    const isDemoOwner =
        normalizeText(ownerEmail) === normalizeText(demoUser.email);

    if (isDemoOwner) {
        return {
            name: demoUser.name,
            email: demoUser.email,
            color: demoUser.color
        };
    }

    const fallbackName =
        task?.userName ||
        task?.ownerName ||
        task?.createdByName ||
        task?.owner?.name ||
        ownerEmail ||
        '-';

    const fallbackEmail =
        task?.ownerEmail ||
        task?.owner?.email ||
        ownerEmail ||
        '-';

    const fallbackColor =
        task?.ownerColor ||
        task?.owner?.color ||
        'bg-blue';

    return {
        name: fallbackName,
        email: fallbackEmail,
        color: fallbackColor
    };
}

function getUserByEmail(email) {
    return allUsers.find((user) => normalizeText(user.email) === normalizeText(email));
}

function getTaggedUsers(taggedEmails) {
    if (!Array.isArray(taggedEmails)) return [];

    return taggedEmails
        .map((email) => resolveUserDisplayByEmail(email))
        .filter((user) => Boolean(user?.email));
}

function resolveUserDisplayByEmail(email) {
    const normalizedEmail = normalizeText(email);
    if (!normalizedEmail) return null;

    const foundUser = getUserByEmail(normalizedEmail);
    if (foundUser) {
        return {
            name: foundUser.name || foundUser.email || '-',
            email: foundUser.email || '-',
            color: foundUser.color || 'bg-blue'
        };
    }

    if (normalizeText(currentUser?.email) === normalizedEmail) {
        return {
            name: currentUser?.name || currentUser?.email || '-',
            email: currentUser?.email || '-',
            color: currentUser?.color || 'bg-blue'
        };
    }

    const demoUser = getKnownDemoUser();
    if (normalizeText(demoUser.email) === normalizedEmail) {
        return {
            name: demoUser.name,
            email: demoUser.email,
            color: demoUser.color
        };
    }

    return {
        name: email,
        email,
        color: 'bg-blue'
    };
}

function hydrateUsersFromTasks(tasks) {
    if (!Array.isArray(tasks)) return;

    const emailsFromTasks = new Set();

    tasks.forEach((task) => {
        if (task?.userEmail) {
            emailsFromTasks.add(normalizeText(task.userEmail));
        }

        if (Array.isArray(task?.taggedUsers)) {
            task.taggedUsers.forEach((email) => {
                if (email) emailsFromTasks.add(normalizeText(email));
            });
        }
    });

    emailsFromTasks.forEach((email) => {
        if (!email) return;

        const exists = allUsers.some((user) => normalizeText(user.email) === email);
        if (exists) return;

        const fallback = buildFallbackUser(email);
        if (fallback) {
            allUsers.push(fallback);
        }
    });
}

function buildFallbackUser(email) {
    if (!email) return null;

    if (normalizeText(currentUser?.email) === normalizeText(email)) {
        return {
            name: currentUser?.name || currentUser?.email || email,
            email: currentUser?.email || email,
            color: currentUser?.color || 'bg-blue'
        };
    }

    const demoUser = getKnownDemoUser();
    if (normalizeText(demoUser.email) === normalizeText(email)) {
        return demoUser;
    }

    return {
        name: email,
        email,
        color: 'bg-blue'
    };
}

function ensureCurrentUserInUsers() {
    if (!currentUser?.email) return;

    const exists = allUsers.some(
        (user) => normalizeText(user.email) === normalizeText(currentUser.email)
    );

    if (!exists) {
        allUsers.push({
            name: currentUser.name || currentUser.email,
            email: currentUser.email,
            color: currentUser.color || 'bg-blue'
        });
    }
}

function ensureDemoUserInUsers() {
    const demoUser = getKnownDemoUser();
    const exists = allUsers.some(
        (user) => normalizeText(user.email) === normalizeText(demoUser.email)
    );

    if (!exists) {
        allUsers.push(demoUser);
    }
}

function getKnownDemoUser() {
    return {
        name: 'Demo User',
        email: 'demo@todoapp.com',
        color: 'bg-blue'
    };
}

function isOverdue(task) {
    if (task.status === 'done') return false;
    if (!task.dueDate) return false;

    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return due < today;
}

function formatThaiDate(dateString) {
    try {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '-';

        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        return '-';
    }
}

function mapPriority(priority) {
    const map = {
        low: 'ต่ำ',
        medium: 'ปานกลาง',
        high: 'สูง',
        urgent: 'ด่วนมาก'
    };

    return map[priority] || 'ปานกลาง';
}

function getInitial(name) {
    return String(name || 'U').trim().charAt(0).toUpperCase();
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
}

function escapeHtml(str) {
    return String(str || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function escapeJs(str) {
    return String(str || '')
        .replaceAll('\\', '\\\\')
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"')
        .replaceAll('\n', '\\n')
        .replaceAll('\r', '\\r');
}

function logout() {
    if (window.reviewerMode?.isDemoSession?.()) {
        window.reviewerMode.clearDemoSessionOnly();
        window.location.href = '/login';
        return;
    }

    localStorage.removeItem('user');
    localStorage.removeItem('reviewerMode');
    localStorage.removeItem('demoMode');
    window.location.href = '/login';
}
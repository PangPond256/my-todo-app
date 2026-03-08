let allTasks = [];
let allUsers = [];
let allCategories = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');

    if (!userData) {
        window.location.href = '/login';
        return;
    }

    currentUser = JSON.parse(userData);
    renderUserProfile(currentUser);
    bindFilterEvents();

    await Promise.all([
        loadUsers(),
        loadCategories(),
        loadTasks()
    ]);
});

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

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', applyFilters);
        el.addEventListener('change', applyFilters);
    });
}

async function safeJsonFetch(url, fallback) {
    try {
        const res = await fetch(url);
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
    allUsers = await safeJsonFetch('/api/users/all', []);
}

async function loadCategories() {
    allCategories = await safeJsonFetch('/api/categories/all', []);
    renderCategoryFilter();
}

function renderCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;

    select.innerHTML = `<option value="">ทุกหมวดหมู่</option>`;

    allCategories.forEach(cat => {
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

    allTasks = data.success ? data.tasks : [];
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
        filtered = filtered.filter(task => {
            const title = (task.title || '').toLowerCase();
            const desc = (task.description || '').toLowerCase();
            const cat = (task.categoryName || '').toLowerCase();
            return title.includes(search) || desc.includes(search) || cat.includes(search);
        });
    }

    if (status) {
        filtered = filtered.filter(task => task.status === status);
    }

    if (priority) {
        filtered = filtered.filter(task => task.priority === priority);
    }

    if (category) {
        filtered = filtered.filter(task => (task.categoryName || '') === category);
    }

    if (ownerType === 'mine') {
        filtered = filtered.filter(task => task.userEmail === currentUser.email);
    }

    if (ownerType === 'tagged') {
        filtered = filtered.filter(task => task.userEmail !== currentUser.email);
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
                <p>ลองเปลี่ยนคำค้นหาหรือตัวกรองอีกครั้ง</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = tasks.map(task => createTaskCard(task)).join('');
}

function createTaskCard(task) {
    const isOwner = task.userEmail === currentUser.email;
    const overdue = isOverdue(task);
    const priorityLabel = mapPriority(task.priority);
    const statusLabel = mapStatus(task.status);
    const categoryLabel = task.categoryName || 'ไม่มีหมวดหมู่';
    const taggedUsers = getTaggedUsers(task.taggedUsers || []);
    const owner = getUserByEmail(task.userEmail);

    return `
        <article class="task-card priority-${task.priority || 'medium'} ${overdue ? 'overdue' : ''}">
            <div class="task-inner">
                <div class="task-top">
                    <div class="task-title-block">
                        <h3>${escapeHtml(task.title || '-')}</h3>
                        <p class="task-desc">${escapeHtml(task.description || 'ไม่มีรายละเอียด')}</p>
                    </div>

                    <div class="task-actions">
                        ${isOwner ? `
                            <button class="icon-btn delete" onclick="deleteTask('${task._id}')">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="badge-row">
                    <span class="badge priority-${task.priority || 'medium'}">${priorityLabel}</span>
                    <span class="badge status-${task.status || 'pending'}">${statusLabel}</span>
                    <span class="badge category">${escapeHtml(categoryLabel)}</span>
                </div>

                <div class="tag-row">
                    <span class="hash-tag">
                        <span class="material-symbols-outlined" style="font-size:16px;">sell</span>
                        #${escapeHtml(categoryLabel)}
                    </span>
                </div>

                <div class="task-divider"></div>

                <div class="task-footer">
                    <div class="footer-left">
                        <span class="meta-item ${overdue ? 'overdue-text' : ''}">
                            <span class="material-symbols-outlined" style="font-size:18px;">calendar_today</span>
                            ${overdue ? 'เกินกำหนด: ' : ''}${formatThaiDate(task.dueDate)}
                        </span>

                        <div class="avatar-stack">
                            ${owner ? `
                                <div class="avatar-mini ${owner.color || 'bg-blue'}" title="เจ้าของงาน: ${escapeHtml(owner.name)}">
                                    ${getInitial(owner.name)}
                                </div>
                            ` : ''}

                            ${taggedUsers.map(user => `
                                <div class="avatar-mini ${user.color || 'bg-indigo'}" title="${escapeHtml(user.name)}">
                                    ${getInitial(user.name)}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="footer-right">
                        ${isOwner ? `
                            <select class="status-select" onchange="updateTaskStatus('${task._id}', this.value)">
                                <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                                <option value="doing" ${task.status === 'doing' ? 'selected' : ''}>กำลังทำ</option>
                                <option value="done" ${task.status === 'done' ? 'selected' : ''}>เสร็จสิ้น</option>
                            </select>
                        ` : `
                            <span class="owner-only">เฉพาะเจ้าของงานแก้สถานะได้</span>
                        `}
                    </div>
                </div>
            </div>
        </article>
    `;
}

async function updateTaskStatus(taskId, newStatus) {
    try {
        const res = await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                requesterEmail: currentUser.email
            })
        });

        const result = await res.json();

        if (!result.success) {
            alert(result.message || 'ไม่สามารถเปลี่ยนสถานะได้');
            await loadTasks();
            return;
        }

        await loadTasks();
    } catch (error) {
        console.error('Update status error:', error);
        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
}

async function deleteTask(taskId) {
    const ok = confirm('ต้องการลบงานนี้ใช่หรือไม่?');
    if (!ok) return;

    try {
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requesterEmail: currentUser.email
            })
        });

        const result = await res.json();

        if (!result.success) {
            alert(result.message || 'ไม่สามารถลบงานได้');
            return;
        }

        await loadTasks();
    } catch (error) {
        console.error('Delete task error:', error);
        alert('เกิดข้อผิดพลาดในการลบงาน');
    }
}

function getUserByEmail(email) {
    return allUsers.find(user => user.email === email);
}

function getTaggedUsers(taggedEmails) {
    return taggedEmails
        .map(email => allUsers.find(user => user.email === email))
        .filter(Boolean);
}

function isOverdue(task) {
    if (task.status === 'done') return false;
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
}

function formatThaiDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
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

function mapStatus(status) {
    const map = {
        pending: 'รอดำเนินการ',
        doing: 'กำลังทำ',
        done: 'เสร็จสิ้น'
    };
    return map[status] || 'รอดำเนินการ';
}

function getInitial(name = 'U') {
    return String(name).trim().charAt(0).toUpperCase();
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/login';
}
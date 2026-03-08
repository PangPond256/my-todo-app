document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');

    if (!userData) {
        window.location.href = '/login';
        return;
    }

    const user = JSON.parse(userData);
    renderUserProfile(user);

    const btnAdd = document.querySelector('.btn-add');
    if (btnAdd) {
        btnAdd.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof openTaskModal === 'function') {
                openTaskModal();
            }
        });
    }

    await Promise.all([
        loadDashboardData(user.email),
        loadTeamMembers(user.email),
        loadCategories()
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

async function safeJsonFetch(url, fallback, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            console.error(`API ${url} ไม่ได้ส่ง JSON กลับมา`);
            return fallback;
        }

        return await res.json();
    } catch (error) {
        console.error(`Fetch error ${url}:`, error);
        return fallback;
    }
}

async function loadDashboardData(email) {
    const statsData = await safeJsonFetch(
        `/api/stats?email=${encodeURIComponent(email)}`,
        { success: false, stats: { total: 0, pending: 0, doing: 0, done: 0 } }
    );

    const tasksData = await safeJsonFetch(
        `/api/tasks?email=${encodeURIComponent(email)}`,
        { success: false, tasks: [] }
    );

    const upcomingData = await safeJsonFetch(
        `/api/tasks/upcoming?email=${encodeURIComponent(email)}`,
        { success: false, tasks: [] }
    );

    const overdueData = await safeJsonFetch(
        `/api/tasks/overdue?email=${encodeURIComponent(email)}`,
        { success: false, tasks: [] }
    );

    if (statsData.success) {
        updateStatsCards(statsData.stats);
        renderStatusChart(statsData.stats);
    } else {
        updateStatsCards({ total: 0, pending: 0, doing: 0, done: 0 });
        renderStatusChart({ total: 0, pending: 0, doing: 0, done: 0 });
    }

    if (tasksData.success) {
        renderPriorityChart(tasksData.tasks);
    } else {
        renderPriorityChart([]);
    }

    if (upcomingData.success) {
        renderUpcomingTasks(upcomingData.tasks, email);
    } else if (tasksData.success) {
        renderUpcomingTasksFromTasks(tasksData.tasks, email);
    } else {
        renderUpcomingTasks([], email);
    }

    if (overdueData.success) {
        renderOverdueTasks(overdueData.tasks, email);
    } else if (tasksData.success) {
        renderOverdueTasksFromTasks(tasksData.tasks, email);
    } else {
        renderOverdueTasks([], email);
    }
}

function updateStatsCards(stats) {
    const fields = {
        'total-tasks': stats.total || 0,
        'pending-tasks': stats.pending || 0,
        'doing-tasks': stats.doing || 0,
        'done-tasks': stats.done || 0
    };

    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}

async function loadTeamMembers(ownerEmail) {
    const result = await safeJsonFetch(
        `/api/workspace-members?ownerEmail=${encodeURIComponent(ownerEmail)}`,
        { success: false, members: [] }
    );

    const members = result.success ? result.members : [];
    const list = document.getElementById('team-list');
    const countLabel = document.querySelector('.member-count');

    if (countLabel) countLabel.textContent = `ทั้งหมด ${members.length} คน`;

    if (!list) return;

    if (!members.length) {
        list.innerHTML = `<div class="empty-state">ยังไม่มีสมาชิกในทีม</div>`;
        return;
    }

    list.innerHTML = members.map(u => `
        <div class="member-card">
            <div class="avatar-circle mini ${u.color || 'bg-blue'}">
                ${(u.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="member-details">
                <p class="name">${escapeHtml(u.name || '-')}</p>
                <p class="email">${escapeHtml(u.email || '-')}</p>
            </div>
        </div>
    `).join('');
}

async function loadCategories() {
    const categories = await safeJsonFetch('/api/categories/all', []);
    const list = document.getElementById('category-list');
    const countLabel = document.querySelector('.category-count');

    if (countLabel) countLabel.textContent = `ทั้งหมด ${categories.length} หมวดหมู่`;

    if (!list) return;

    if (!categories.length) {
        list.innerHTML = `<div class="empty-state">ยังไม่มีหมวดหมู่</div>`;
        return;
    }

    list.innerHTML = categories.map(cat => `
        <div class="category-item-card">
            <div class="category-icon ${cat.color || 'bg-blue'}">
                <span class="material-symbols-outlined">${escapeHtml(cat.icon || 'folder')}</span>
            </div>
            <p class="category-name">${escapeHtml(cat.name || '-')}</p>
        </div>
    `).join('');
}

function renderPriorityChart(tasks = []) {
    const canvas = document.getElementById('priorityChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const counts = { low: 0, medium: 0, high: 0, urgent: 0 };

    tasks.forEach(t => {
        if (counts[t.priority] !== undefined) counts[t.priority]++;
    });

    if (window.myPriorityChart) window.myPriorityChart.destroy();

    window.myPriorityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['ต่ำ', 'ปานกลาง', 'สูง', 'ด่วนมาก'],
            datasets: [{
                data: [counts.low, counts.medium, counts.high, counts.urgent],
                backgroundColor: ['#9ca3af', '#3b82f6', '#f59e0b', '#ef4444'],
                borderRadius: 12,
                barThickness: 50
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

function renderStatusChart(stats) {
    const canvas = document.getElementById('statusChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const total = stats.total || (stats.pending + stats.doing + stats.done);
    const getPercent = (value) => total > 0 ? Math.round((value / total) * 100) : 0;

    if (window.myStatusChart) window.myStatusChart.destroy();

    window.myStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [
                `รอดำเนินการ: ${getPercent(stats.pending)}%`,
                `กำลังทำ: ${getPercent(stats.doing)}%`,
                `เสร็จสิ้น: ${getPercent(stats.done)}%`
            ],
            datasets: [{
                data: [stats.pending, stats.doing, stats.done],
                backgroundColor: ['#f97316', '#6366f1', '#22c55e'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '75%',
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function getTaskOwnershipLabel(task, currentEmail) {
    if ((task.userEmail || '').toLowerCase() === String(currentEmail).toLowerCase()) {
        return 'ของฉัน';
    }
    return 'ถูกแท็ก';
}

function renderUpcomingTasks(tasks = [], currentEmail = '') {
    const list = document.getElementById('upcoming-tasks-list');
    if (!list) return;

    if (!tasks.length) {
        list.innerHTML = `<div class="empty-state"><p>ไม่มีงานใกล้กำหนด</p></div>`;
        return;
    }

    list.innerHTML = tasks.map(t => `
        <div class="mini-item">
            <div class="item-info">
                <strong>${escapeHtml(t.title || '-')}</strong>
                <small style="display:block; margin-top:4px;">
                    <span class="material-symbols-outlined" style="font-size:12px;">calendar_today</span>
                    ${new Date(t.dueDate).toLocaleDateString('th-TH')}
                </small>
                <small style="display:block; margin-top:4px; color:#64748b;">
                    ${getTaskOwnershipLabel(t, currentEmail)}
                </small>
            </div>
        </div>
    `).join('');
}

function renderOverdueTasks(tasks = [], currentEmail = '') {
    const list = document.getElementById('overdue-tasks-list');
    if (!list) return;

    if (!tasks.length) {
        list.innerHTML = `<div class="empty-state success"><p>ไม่มีงานเกินกำหนด</p></div>`;
        return;
    }

    list.innerHTML = tasks.map(t => `
        <div class="mini-item overdue">
            <span class="material-symbols-outlined" style="color:#ef4444;">report</span>
            <div class="item-info">
                <strong>${escapeHtml(t.title || '-')}</strong>
                <small style="display:block; color:#ef4444;">
                    เกินกำหนดเมื่อ: ${new Date(t.dueDate).toLocaleDateString('th-TH')}
                </small>
                <small style="display:block; margin-top:4px; color:#64748b;">
                    ${getTaskOwnershipLabel(t, currentEmail)}
                </small>
            </div>
        </div>
    `).join('');
}

function renderUpcomingTasksFromTasks(tasks = [], currentEmail = '') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEnd = new Date();
    upcomingEnd.setDate(upcomingEnd.getDate() + 7);
    upcomingEnd.setHours(23, 59, 59, 999);

    const upcoming = tasks.filter(t => {
        const due = new Date(t.dueDate);
        return due >= today && due <= upcomingEnd && t.status !== 'done';
    });

    renderUpcomingTasks(upcoming, currentEmail);
}

function renderOverdueTasksFromTasks(tasks = [], currentEmail = '') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = tasks.filter(t => {
        const due = new Date(t.dueDate);
        return due < today && t.status !== 'done';
    });

    renderOverdueTasks(overdue, currentEmail);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/login';
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
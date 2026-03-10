function openTaskModal() {
    const modal = document.getElementById('taskModal');
    if (!modal) return;

    modal.style.display = 'flex';

    const dateInput = document.getElementById('taskDueDate');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    loadMembersForTagging();
    loadCategoriesForTaskModal();
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.style.display = 'none';
}

async function loadMembersForTagging() {
    try {
        const currentUser =
            window.reviewerMode?.getCurrentUser?.() ||
            JSON.parse(localStorage.getItem('user') || 'null');

        const res =
            (await window.reviewerMode?.reviewerFetch?.('/api/users/all')) ||
            (await fetch('/api/users/all'));

        const users = await res.json();

        const container = document.getElementById('member-list-tags');
        if (!container) return;

        const filteredUsers = Array.isArray(users)
            ? users.filter((u) => normalizeText(u.email) !== normalizeText(currentUser?.email))
            : [];

        if (!filteredUsers.length) {
            container.innerHTML = `<div class="empty-state">ยังไม่มีสมาชิกคนอื่นในระบบ</div>`;
            return;
        }

        container.innerHTML = filteredUsers
            .map(
                (u) => `
            <label class="tag-chip">
                <input type="checkbox" name="taggedUsers" value="${escapeHtml(u.email)}">
                <div class="chip-content">
                    <span class="avatar-dot ${u.color || 'bg-blue'}"></span>
                    <span>${escapeHtml(u.name || 'Unknown')}</span>
                </div>
            </label>
        `
            )
            .join('');
    } catch (err) {
        console.error('Load members error:', err);
    }
}

async function loadCategoriesForTaskModal() {
    try {
        const res =
            (await window.reviewerMode?.reviewerFetch?.('/api/categories/all')) ||
            (await fetch('/api/categories/all'));

        const categories = await res.json();

        const select = document.getElementById('taskCategory');
        if (!select) return;

        select.innerHTML = `<option value="">เลือกหมวดหมู่</option>`;

        (Array.isArray(categories) ? categories : []).forEach((cat) => {
            const option = document.createElement('option');
            option.value = cat._id;
            option.textContent = cat.name;
            option.dataset.name = cat.name;
            select.appendChild(option);
        });

        const preselectedId = localStorage.getItem('preselectedCategoryId');
        if (preselectedId) {
            select.value = preselectedId;
        }
    } catch (err) {
        console.error('Load categories error:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('addTaskForm');
    if (!taskForm) return;

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const user =
                window.reviewerMode?.getCurrentUser?.() ||
                JSON.parse(localStorage.getItem('user') || 'null');

            if (!user) {
                window.location.href = '/login';
                return;
            }

            const formData = new FormData(taskForm);
            const categorySelect = document.getElementById('taskCategory');
            const selectedOption =
                categorySelect?.options?.[categorySelect.selectedIndex] || null;

            const taggedUsers = Array.from(
                document.querySelectorAll('input[name="taggedUsers"]:checked')
            ).map((input) => input.value);

            const payload = {
                userEmail: user.email,
                title: String(formData.get('title') || '').trim(),
                description: String(formData.get('description') || '').trim(),
                status: String(formData.get('status') || 'pending'),
                priority: String(formData.get('priority') || 'medium'),
                dueDate: formData.get('dueDate'),
                taggedUsers,
                categoryId: formData.get('categoryId') || '',
                categoryName: selectedOption?.dataset?.name || ''
            };

            if (!payload.title || !payload.dueDate) {
                alert('กรุณากรอกข้อมูลงานให้ครบ');
                return;
            }

            const res =
                (await window.reviewerMode?.reviewerFetch?.('/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                })) ||
                (await fetch('/api/tasks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                }));

            const result = await res.json();

            if (!result.success) {
                alert(result.message || 'เพิ่มงานไม่สำเร็จ');
                return;
            }

            alert('เพิ่มงานสำเร็จ');

            taskForm.reset();
            closeTaskModal();

            localStorage.removeItem('preselectedCategoryId');
            localStorage.removeItem('preselectedCategoryName');

            if (typeof loadTasks === 'function') {
                await loadTasks();
            }

            if (typeof loadDashboardData === 'function') {
                await loadDashboardData(user.email);
            }
        } catch (error) {
            console.error('Add task error:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มงาน');
        }
    });

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('taskModal');
        if (e.target === modal) {
            closeTaskModal();
        }
    });
});

function normalizeText(value) {
    return String(value || '').trim().toLowerCase();
}

function escapeHtml(str) {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
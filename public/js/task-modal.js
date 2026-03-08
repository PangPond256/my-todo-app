let taggedMembers = [];

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
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const res = await fetch('/api/users/all');
        const users = await res.json();

        const container = document.getElementById('member-list-tags');
        if (!container) return;

        const filteredUsers = Array.isArray(users)
            ? users.filter(u => u.email !== currentUser?.email)
            : [];

        if (!filteredUsers.length) {
            container.innerHTML = `<div class="empty-state">ยังไม่มีสมาชิกคนอื่นในระบบ</div>`;
            return;
        }

        container.innerHTML = filteredUsers.map(u => `
            <label class="tag-chip">
                <input type="checkbox" name="taggedUsers" value="${u.email}">
                <div class="chip-content">
                    <span class="avatar-dot ${u.color || 'bg-blue'}"></span>
                    <span>${u.name}</span>
                </div>
            </label>
        `).join('');

    } catch (err) {
        console.error('Load members error:', err);
    }
}

async function loadCategoriesForTaskModal() {
    try {
        const res = await fetch('/api/categories/all');
        const categories = await res.json();

        const select = document.getElementById('taskCategory');
        if (!select) return;

        select.innerHTML = `<option value="">เลือกหมวดหมู่</option>`;

        categories.forEach(cat => {
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
            const user = JSON.parse(localStorage.getItem('user'));

            if (!user) {
                alert('กรุณาเข้าสู่ระบบใหม่');
                window.location.href = '/login';
                return;
            }

            const tagged = Array.from(
                document.querySelectorAll('input[name="taggedUsers"]:checked')
            ).map(cb => cb.value);

            const categorySelect = document.getElementById('taskCategory');
            const selectedOption = categorySelect.options[categorySelect.selectedIndex];

            const taskData = {
                userEmail: user.email,
                title: e.target.title.value,
                description: e.target.description.value,
                status: e.target.status.value,
                priority: e.target.priority.value,
                dueDate: e.target.dueDate.value,
                taggedUsers: tagged,
                categoryId: categorySelect.value || null,
                categoryName: categorySelect.value ? selectedOption.dataset.name : ''
            };

            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            const result = await response.json();

            if (!result.success) {
                alert(result.message || 'ไม่สามารถเพิ่มงานได้');
                return;
            }

            closeTaskModal();
            e.target.reset();

            const dateInput = document.getElementById('taskDueDate');
            if (dateInput) {
                dateInput.value = new Date().toISOString().split('T')[0];
            }

            localStorage.removeItem('preselectedCategoryId');
            localStorage.removeItem('preselectedCategoryName');

            if (typeof loadDashboardData === 'function') {
                await loadDashboardData(user.email);
            }

            if (typeof loadCategories === 'function') {
                await loadCategories();
            }

            if (typeof loadTasks === 'function') {
                await loadTasks();
            }

            alert('เพิ่มงานสำเร็จ');

        } catch (err) {
            console.error('Save task error:', err);
            alert('เกิดข้อผิดพลาดในการบันทึกงาน');
        }
    });
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('taskModal');
    if (e.target === modal) {
        closeTaskModal();
    }
});
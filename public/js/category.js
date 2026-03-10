let allCategories = [];
let currentUser = null;
let selectedColor = 'bg-blue';
let selectedIcon = 'work';

document.addEventListener('DOMContentLoaded', async () => {
    currentUser =
        window.reviewerMode?.getCurrentUser?.() ||
        JSON.parse(localStorage.getItem('user') || 'null');

    if (!currentUser) {
        window.location.href = '/login';
        return;
    }

    renderUserProfile(currentUser);
    bindCategoryForm();
    bindColorPicker();
    bindIconPicker();

    const addButton = document.querySelector('.btn-primary');
    if (addButton) {
        addButton.addEventListener('click', (e) => {
            e.preventDefault();
            openCategoryModal();
        });
    }

    await loadCategories();
    updatePreview();
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
        const res =
            (await window.reviewerMode?.reviewerFetch?.(url, options)) ||
            (await fetch(url, options));

        const contentType = res.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
            console.error(`Response from ${url} is not JSON`);
            return fallback;
        }

        return await res.json();
    } catch (error) {
        console.error(`Fetch error ${url}:`, error);
        return fallback;
    }
}

async function loadCategories() {
    const categories = await safeJsonFetch('/api/categories/all', []);
    allCategories = Array.isArray(categories) ? categories : [];
    renderCategories(allCategories);
    updateCategoryCount(allCategories.length);
}

function renderCategories(categories) {
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;

    if (!categories.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>ยังไม่มีหมวดหมู่</h3>
                <p>เริ่มต้นด้วยการเพิ่มหมวดหมู่แรกของคุณ</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = categories
        .map(
            (category) => `
        <article class="category-card">
            <button
                class="delete-icon-btn"
                onclick="deleteCategory('${escapeJs(category._id)}', '${escapeJs(category.name)}')"
                title="ลบหมวดหมู่"
            >
                <span class="material-symbols-outlined">delete</span>
            </button>

            <div class="category-inner">
                <div class="category-icon ${category.color || 'bg-blue'}">
                    <span class="material-symbols-outlined">${escapeHtml(category.icon || 'folder')}</span>
                </div>

                <h3 class="category-name">${escapeHtml(category.name || '-')}</h3>

                <div class="category-divider"></div>

                <div class="category-footer">
                    <span class="category-meta">${escapeHtml(category.color || 'bg-blue')} • ${escapeHtml(category.icon || 'folder')}</span>

                    <button
                        type="button"
                        class="btn-add-task"
                        onclick="goToAddTask('${escapeJs(category._id)}', '${escapeJs(category.name)}')"
                        title="เพิ่มงาน"
                    >
                        <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                        เพิ่มงาน
                    </button>
                </div>
            </div>
        </article>
    `
        )
        .join('');
}

function updateCategoryCount(count) {
    const total = document.getElementById('totalCategoryCount');
    if (total) {
        total.textContent = `${count} หมวดหมู่`;
    }
}

function openCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (!modal) return;

    modal.style.display = 'flex';
    updatePreview();
}

function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (!modal) return;

    modal.style.display = 'none';
}

function bindColorPicker() {
    const buttons = document.querySelectorAll('#colorPicker .color-btn');

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            buttons.forEach((item) => item.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = btn.dataset.color || 'bg-blue';
            updatePreview();
        });
    });
}

function bindIconPicker() {
    const buttons = document.querySelectorAll('#iconPicker .icon-btn');

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            buttons.forEach((item) => item.classList.remove('active'));
            btn.classList.add('active');
            selectedIcon = btn.dataset.icon || 'work';
            updatePreview();
        });
    });
}

function bindCategoryForm() {
    const form = document.getElementById('categoryForm');
    const nameInput = document.getElementById('categoryName');

    if (nameInput) {
        nameInput.addEventListener('input', updatePreview);
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = (document.getElementById('categoryName')?.value || '').trim();

        if (!name) {
            alert('กรุณาระบุชื่อหมวดหมู่');
            return;
        }

        const response = await safeJsonFetch(
            '/api/categories',
            { success: false, message: 'ไม่สามารถสร้างหมวดหมู่ได้' },
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    color: selectedColor,
                    icon: selectedIcon
                })
            }
        );

        if (!response.success) {
            alert(response.message || 'สร้างหมวดหมู่ไม่สำเร็จ');
            return;
        }

        alert('เพิ่มหมวดหมู่สำเร็จ');

        form.reset();
        resetCategoryPicker();
        updatePreview();
        closeCategoryModal();
        await loadCategories();
    });
}

function resetCategoryPicker() {
    selectedColor = 'bg-blue';
    selectedIcon = 'work';

    document.querySelectorAll('#colorPicker .color-btn').forEach((btn) => {
        btn.classList.remove('active');
        if (btn.dataset.color === 'bg-blue') {
            btn.classList.add('active');
        }
    });

    document.querySelectorAll('#iconPicker .icon-btn').forEach((btn) => {
        btn.classList.remove('active');
        if (btn.dataset.icon === 'work') {
            btn.classList.add('active');
        }
    });
}

function updatePreview() {
    const name = (document.getElementById('categoryName')?.value || '').trim();

    const previewIcon = document.getElementById('previewCategoryIcon');
    const previewName = document.getElementById('previewCategoryName');
    const previewMeta = document.getElementById('previewCategoryMeta');

    if (previewIcon) {
        previewIcon.className = `preview-icon ${selectedColor}`;
        previewIcon.innerHTML = `<span class="material-symbols-outlined">${escapeHtml(selectedIcon)}</span>`;
    }

    if (previewName) {
        previewName.textContent = name || 'ชื่อหมวดหมู่';
    }

    if (previewMeta) {
        previewMeta.textContent = `${selectedColor} • ${selectedIcon}`;
    }
}

async function deleteCategory(categoryId, categoryName) {
    const confirmed = window.confirm(`ต้องการลบหมวดหมู่ "${categoryName}" หรือไม่?`);
    if (!confirmed) return;

    const response = await safeJsonFetch(
        `/api/categories/${categoryId}`,
        { success: false, message: 'ไม่สามารถลบหมวดหมู่ได้' },
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.success) {
        alert(response.message || 'ลบหมวดหมู่ไม่สำเร็จ');
        return;
    }

    alert('ลบหมวดหมู่สำเร็จ');
    await loadCategories();
}

function goToAddTask(categoryId, categoryName) {
    localStorage.setItem('preselectedCategoryId', categoryId);
    localStorage.setItem('preselectedCategoryName', categoryName);
    window.location.href = '/tasks-page';
}

function escapeHtml(str) {
    return String(str)
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
        .replaceAll('"', '\\"');
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
let allCategories = [];
let currentUser = null;
let selectedColor = 'bg-blue';
let selectedIcon = 'work';

document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');

    if (!userData) {
        window.location.href = '/login';
        return;
    }

    currentUser = JSON.parse(userData);

    renderUserProfile(currentUser);
    bindCategoryForm();
    bindColorPicker();
    bindIconPicker();

    await loadCategories();
    updatePreview();
});

// show name email avatar
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

// เรียก API
async function safeJsonFetch(url, fallback, options = {}) {
    try {
        const res = await fetch(url, options);
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

// แสดงรายการหมวดหมู่เป็นการ์ดในหน้า category
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

    grid.innerHTML = categories.map(category => `
        <article class="category-card">

            <button 
                class="delete-icon-btn"
                onclick="deleteCategory('${category._id}', '${escapeJs(category.name)}')"
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
                    <span class="category-meta">พร้อมใช้งาน</span>

                    <button
                        type="button"
                        class="btn-add-task"
                        onclick="goToAddTask('${category._id}', '${escapeJs(category.name)}')"
                    >
                        <span class="material-symbols-outlined" style="font-size:18px;">add</span>
                        เพิ่มงาน
                    </button>
                </div>
            </div>
        </article>
    `).join('');
}

// อัปเดตจำนวนหมวดหมู่ที่แสดงบนหน้า
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
    if (modal) {
        modal.style.display = 'none';
    }

    const form = document.getElementById('categoryForm');
    if (form) {
        form.reset();
    }

    selectedColor = 'bg-blue';
    selectedIcon = 'work';

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === 'bg-blue');
    });

    document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.icon === 'work');
    });

    updatePreview();
}

function bindColorPicker() {
    const buttons = document.querySelectorAll('.color-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedColor = btn.dataset.color;
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updatePreview();
        });
    });

    const categoryNameInput = document.getElementById('categoryName');
    if (categoryNameInput) {
        categoryNameInput.addEventListener('input', updatePreview);
    }
}

function bindIconPicker() {
    const buttons = document.querySelectorAll('.icon-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedIcon = btn.dataset.icon;
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updatePreview();
        });
    });
}

function updatePreview() {
    const name = document.getElementById('categoryName')?.value.trim() || 'ชื่อหมวดหมู่';

    const iconBox = document.getElementById('previewCategoryIcon');
    const nameEl = document.getElementById('previewCategoryName');
    const metaEl = document.getElementById('previewCategoryMeta');

    if (iconBox) {
        iconBox.className = `preview-icon ${selectedColor}`;
        iconBox.innerHTML = `
            <span class="material-symbols-outlined">${selectedIcon}</span>
        `;
    }

    if (nameEl) {
        nameEl.textContent = name;
    }

    if (metaEl) {
        metaEl.textContent = `${selectedColor} • ${selectedIcon}`;
    }
}

function bindCategoryForm() {
    const form = document.getElementById('categoryForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('categoryName')?.value.trim();

        if (!name) {
            alert('กรุณากรอกชื่อหมวดหมู่');
            return;
        }

        const response = await safeJsonFetch(
            '/api/categories',
            { success: false, message: 'เกิดข้อผิดพลาด' },
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    color: selectedColor,
                    icon: selectedIcon
                })
            }
        );

        if (!response.success) {
            alert(response.message || 'ไม่สามารถเพิ่มหมวดหมู่ได้');
            return;
        }

        closeCategoryModal();
        await loadCategories();
        alert('เพิ่มหมวดหมู่สำเร็จ');
    });
}

function goToAddTask(categoryId, categoryName) {
    localStorage.setItem('preselectedCategoryId', categoryId);
    localStorage.setItem('preselectedCategoryName', categoryName);
    window.location.href = '/tasks-page';
}

async function deleteCategory(categoryId, categoryName) {

    const confirmed = confirm(`ต้องการลบหมวดหมู่ "${categoryName}" ใช่หรือไม่?`);

    if (!confirmed) return;

    try {

        const response = await fetch(`/api/categories/${categoryId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!result.success) {
            alert(result.message || 'ไม่สามารถลบหมวดหมู่ได้');
            return;
        }

        await loadCategories();

        alert('ลบหมวดหมู่สำเร็จ');

    } catch (error) {

        console.error('Delete category error:', error);
        alert('เกิดข้อผิดพลาดในการลบหมวดหมู่');

    }
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

function escapeJs(str) {
    return String(str)
        .replaceAll('\\', '\\\\')
        .replaceAll("'", "\\'");
}

window.addEventListener('click', (e) => {
    const modal = document.getElementById('categoryModal');
    if (e.target === modal) {
        closeCategoryModal();
    }
});
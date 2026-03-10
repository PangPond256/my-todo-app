let teamMembers = [];
let selectedColor = 'bg-blue';
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
    bindMemberForm();
    bindColorPicker();
    bindPreviewInputs();

    const addButton = document.querySelector('.btn-primary');
    if (addButton) {
        addButton.addEventListener('click', (e) => {
            e.preventDefault();
            openMemberModal();
        });
    }

    await loadWorkspaceMembers();
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
            console.error(`API ${url} ไม่ได้ส่ง JSON`);
            return fallback;
        }

        return await res.json();
    } catch (error) {
        console.error(`Fetch error ${url}:`, error);
        return fallback;
    }
}

async function loadWorkspaceMembers() {
    const result = await safeJsonFetch(
        `/api/workspace-members?ownerEmail=${encodeURIComponent(currentUser.email)}`,
        { success: false, members: [] }
    );

    teamMembers = result.success ? result.members : [];
    renderMembers(teamMembers);
    updateMemberCount(teamMembers.length);
}

function renderMembers(members) {
    const grid = document.getElementById('memberGrid');
    if (!grid) return;

    if (!members.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>ยังไม่มีสมาชิกในทีม</h3>
                <p>เริ่มต้นด้วยการเพิ่มสมาชิกใหม่ผ่านอีเมล</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = members
        .map((member) => {
            const isOwner = normalizeText(member.email) === normalizeText(currentUser.email);

            return `
                <article class="member-card">
                    <div class="member-inner">
                        <div class="member-top">
                            <div class="member-avatar ${member.color || 'bg-blue'}">
                                ${getInitial(member.name)}
                            </div>

                            ${isOwner
                    ? `<span class="owner-badge">เจ้าของทีม</span>`
                    : `
                                        <button
                                            class="delete-btn"
                                            onclick="removeMember('${escapeJs(member.email)}')"
                                            title="ลบสมาชิก"
                                        >
                                            <span class="material-symbols-outlined">delete</span>
                                        </button>
                                    `
                }
                        </div>

                        <h3 class="member-name">${escapeHtml(member.name || '-')}</h3>

                        <div class="member-email">
                            <span class="material-symbols-outlined">mail</span>
                            ${escapeHtml(member.email || '-')}
                        </div>

                        <div class="member-divider"></div>

                        <div class="member-footer">
                            <span class="color-dot ${member.color || 'bg-blue'}"></span>
                            สีสมาชิก: ${escapeHtml(member.color || 'bg-blue')}
                        </div>
                    </div>
                </article>
            `;
        })
        .join('');
}

function updateMemberCount(count) {
    const totalCount = document.getElementById('totalCount');
    if (totalCount) totalCount.textContent = `${count} คน`;
}

function openMemberModal() {
    const modal = document.getElementById('memberModal');
    if (!modal) return;
    modal.style.display = 'flex';
    updatePreview();
}

function closeMemberModal() {
    const modal = document.getElementById('memberModal');
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

function bindPreviewInputs() {
    const nameInput = document.getElementById('memberName');
    const emailInput = document.getElementById('memberEmail');

    if (nameInput) {
        nameInput.addEventListener('input', updatePreview);
    }

    if (emailInput) {
        emailInput.addEventListener('input', updatePreview);
    }
}

function bindMemberForm() {
    const form = document.getElementById('memberForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = (document.getElementById('memberName')?.value || '').trim();
        const email = (document.getElementById('memberEmail')?.value || '').trim();

        if (!name || !email) {
            alert('กรุณากรอกชื่อและอีเมล');
            return;
        }

        const response = await safeJsonFetch(
            '/api/workspace-members',
            { success: false, message: 'ไม่สามารถเพิ่มสมาชิกได้' },
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ownerEmail: currentUser.email,
                    email,
                    name,
                    color: selectedColor
                })
            }
        );

        if (!response.success) {
            alert(response.message || 'เพิ่มสมาชิกไม่สำเร็จ');
            return;
        }

        alert('เพิ่มสมาชิกสำเร็จ');

        form.reset();
        resetColorPicker();
        updatePreview();
        closeMemberModal();
        await loadWorkspaceMembers();
    });
}

function resetColorPicker() {
    selectedColor = 'bg-blue';

    document.querySelectorAll('#colorPicker .color-btn').forEach((btn) => {
        btn.classList.remove('active');
        if (btn.dataset.color === 'bg-blue') {
            btn.classList.add('active');
        }
    });
}

function updatePreview() {
    const previewAvatar = document.getElementById('previewAvatar');
    const previewName = document.getElementById('previewName');
    const previewEmail = document.getElementById('previewEmail');

    const nameValue = (document.getElementById('memberName')?.value || '').trim();
    const emailValue = (document.getElementById('memberEmail')?.value || '').trim();

    if (previewAvatar) {
        previewAvatar.className = `member-avatar ${selectedColor}`;
        previewAvatar.textContent = getInitial(nameValue || '?');
    }

    if (previewName) {
        previewName.textContent = nameValue || 'ชื่อสมาชิก';
    }

    if (previewEmail) {
        previewEmail.textContent = emailValue || 'อีเมล';
    }
}

async function removeMember(memberEmail) {
    const confirmed = window.confirm(`ต้องการลบสมาชิก ${memberEmail} ออกจากทีมหรือไม่?`);
    if (!confirmed) return;

    const response = await safeJsonFetch(
        '/api/workspace-members',
        { success: false, message: 'ไม่สามารถลบสมาชิกได้' },
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ownerEmail: currentUser.email,
                memberEmail
            })
        }
    );

    if (!response.success) {
        alert(response.message || 'ลบสมาชิกไม่สำเร็จ');
        return;
    }

    alert('ลบสมาชิกสำเร็จ');
    await loadWorkspaceMembers();
}

function getInitial(name) {
    return String(name || 'U').trim().charAt(0).toUpperCase();
}

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
let teamMembers = [];
let selectedColor = 'bg-blue';
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('user');

    if (!userData) {
        window.location.href = '/login';
        return;
    }

    currentUser = JSON.parse(userData);
    renderUserProfile(currentUser);
    bindMemberForm();
    bindColorPicker();

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
        const res = await fetch(url, options);
        const contentType = res.headers.get('content-type') || '';

        if (!contentType.includes('application/json')) {
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

    grid.innerHTML = members.map(member => {
        const isOwner = member.email === currentUser.email;

        return `
            <article class="member-card">
                <div class="member-inner">
                    <div class="member-top">
                        <div>
                            <div class="member-avatar ${member.color || 'bg-blue'}">
                                ${getInitial(member.name)}
                            </div>
                        </div>

                        ${isOwner
                ? `<span class="owner-badge">เจ้าของทีม</span>`
                : `
                                <button class="delete-btn" onclick="removeMember('${member.email}')">
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
                        สีในทีมนี้
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function updateMemberCount(count) {
    const totalCount = document.getElementById('totalCount');
    if (totalCount) totalCount.textContent = `${count} คน`;
}

function openMemberModal() {
    const modal = document.getElementById('memberModal');
    if (modal) modal.style.display = 'flex';
}

function closeMemberModal() {
    const modal = document.getElementById('memberModal');
    if (modal) modal.style.display = 'none';

    const form = document.getElementById('memberForm');
    if (form) form.reset();

    selectedColor = 'bg-blue';
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === 'bg-blue');
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

    document.getElementById('memberName')?.addEventListener('input', updatePreview);
    document.getElementById('memberEmail')?.addEventListener('input', updatePreview);
}

function updatePreview() {
    const name = document.getElementById('memberName')?.value.trim() || 'ชื่อสมาชิก';
    const email = document.getElementById('memberEmail')?.value.trim() || 'อีเมล';

    const avatar = document.getElementById('previewAvatar');
    const nameEl = document.getElementById('previewName');
    const emailEl = document.getElementById('previewEmail');

    if (avatar) {
        avatar.className = `member-avatar ${selectedColor}`;
        avatar.textContent = getInitial(name === 'ชื่อสมาชิก' ? '?' : name);
    }

    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email;
}

function bindMemberForm() {
    const form = document.getElementById('memberForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const typedName = document.getElementById('memberName').value.trim();
        const email = document.getElementById('memberEmail').value.trim().toLowerCase();

        if (!typedName || !email) {
            alert('กรุณากรอกชื่อและอีเมล');
            return;
        }

        const check = await safeJsonFetch(
            `/api/users/check?email=${encodeURIComponent(email)}`,
            { exists: false }
        );

        if (!check.exists) {
            alert('ไม่พบผู้ใช้นี้ในระบบ กรุณาให้เขาสมัครก่อน');
            return;
        }

        const response = await safeJsonFetch(
            '/api/workspace-members',
            { success: false, message: 'เกิดข้อผิดพลาด' },
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ownerEmail: currentUser.email,
                    email,
                    color: selectedColor
                })
            }
        );

        if (!response.success) {
            alert(response.message || 'ไม่สามารถเพิ่มสมาชิกเข้าทีมได้');
            return;
        }

        closeMemberModal();
        await loadWorkspaceMembers();
        alert('เพิ่มสมาชิกเข้าทีมสำเร็จ');
    });
}

async function removeMember(memberEmail) {
    const ok = confirm('ต้องการลบสมาชิกคนนี้ออกจากทีมใช่หรือไม่?');
    if (!ok) return;

    const response = await safeJsonFetch(
        '/api/workspace-members',
        { success: false, message: 'เกิดข้อผิดพลาด' },
        {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ownerEmail: currentUser.email,
                memberEmail
            })
        }
    );

    if (!response.success) {
        alert(response.message || 'ไม่สามารถลบสมาชิกได้');
        return;
    }

    await loadWorkspaceMembers();
    alert('ลบสมาชิกออกจากทีมสำเร็จ');
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

window.addEventListener('click', (e) => {
    const modal = document.getElementById('memberModal');
    if (e.target === modal) closeMemberModal();
});
document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // ถ้าเคยอยู่ demo มาก่อนให้ล้าง session demo
    if (window.reviewerMode?.isDemoSession?.()) {
        window.reviewerMode.clearDemoSessionOnly();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        const email = (emailInput?.value || '').trim();
        const password = (passwordInput?.value || '').trim();

        if (!email || !password) {
            alert('กรุณากรอกอีเมลและรหัสผ่าน');
            return;
        }

        try {

            const response =
                (await window.reviewerMode?.reviewerFetch?.('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                })) ||
                (await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email,
                        password
                    })
                }));

            const data = await response.json();

            if (!data.success) {
                alert(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
                return;
            }

            // บันทึก user จริง
            localStorage.setItem('user', JSON.stringify(data.user));

            // ลบ demoMode ถ้ามี
            localStorage.removeItem('demoMode');

            // ไปหน้า dashboard
            window.location.href = '/dashboard';

        } catch (error) {

            console.error('Login error:', error);
            alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');

        }

    });

});

function goToDemo() {

    if (!window.reviewerMode) {
        window.location.href = '/demo';
        return;
    }

    window.reviewerMode.goToDemo();

}
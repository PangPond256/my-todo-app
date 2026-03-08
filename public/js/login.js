document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            Email: e.target.Email.value,
            Password: e.target.Password.value
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!result.success) {
                alert(result.message || 'เข้าสู่ระบบไม่สำเร็จ');
                return;
            }

            localStorage.setItem('user', JSON.stringify(result.user));
            alert('เข้าสู่ระบบสำเร็จ');
            window.location.href = '/dashboard';
        } catch (error) {
            console.error('Login error:', error);
            alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        }
    });
});
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = (e.target.name.value || '').trim();
        const email = (e.target.email.value || '').trim();
        const password = e.target.password.value || '';
        const confirmpassword = e.target.confirmpassword.value || '';

        if (!name || !email || !password || !confirmpassword) {
            alert('กรุณากรอกข้อมูลให้ครบ');
            return;
        }

        if (password !== confirmpassword) {
            alert('❌ รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (!result.success) {
                alert('❌ ' + (result.message || 'สมัครสมาชิกไม่สำเร็จ'));
                return;
            }

            alert('✅ สมัครสมาชิกสำเร็จ');
            window.location.href = '/login';
        } catch (error) {
            console.error('Register error:', error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
    });
});
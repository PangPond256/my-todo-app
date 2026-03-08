document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmpassword = e.target.confirmpassword.value;
    


    if (password !== confirmpassword) {
        alert("❌ รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (result.success) {
            alert("✅ สมัครสมาชิกสำเร็จ! ระบบสุ่มสีโปรไฟล์ให้คุณแล้ว");
            window.location.href = "/HTML/login.html";
        } else {
            alert("❌ " + result.message);
        }
    } catch (error) {
        console.error("Register Error:", error);
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
});
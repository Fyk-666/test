document.addEventListener('DOMContentLoaded', () => {
    const verifyForm = document.getElementById('verifyForm');
    const resetForm = document.getElementById('resetForm');
    const verifySection = document.getElementById('verifySection');
    const resetSection = document.getElementById('resetSection');
    const statusMessage = document.getElementById('statusMessage');
    const backToVerify = document.getElementById('backToVerify');

    const API_BASE = 'https://kczx.pythonanywhere.com';
    let resetToken = null;

    function showMessage(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
    }

    function clearMessage() {
        statusMessage.style.display = 'none';
        statusMessage.textContent = '';
    }

    function setButtonLoading(button, loading, text) {
        if (!button) return;
        button.disabled = loading;
        if (text) {
            button.textContent = text;
        }
    }

    verifyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const submitBtn = verifyForm.querySelector('button[type="submit"]');

        if (!username || !email) {
            showMessage('请填写用户名和邮箱。', 'error');
            return;
        }

        try {
            setButtonLoading(submitBtn, true, '验证中...');
            const response = await fetch(`${API_BASE}/api/auth/verify-identity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '验证失败');
            }

            resetToken = result.reset_token;
            showMessage('验证通过，请设置新密码。', 'success');
            verifySection.style.display = 'none';
            resetSection.style.display = 'block';
        } catch (error) {
            showMessage(error.message || '验证失败，请稍后再试。', 'error');
        } finally {
            setButtonLoading(submitBtn, false, '验证身份');
        }
    });

    resetForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearMessage();

        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const submitBtn = resetForm.querySelector('button[type="submit"]');

        if (!newPassword || !confirmPassword) {
            showMessage('请填写并确认新密码。', 'error');
            return;
        }

        if (newPassword.length < 4) {
            showMessage('密码长度至少为 4 位。', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showMessage('两次输入的密码不一致。', 'error');
            return;
        }

        if (!resetToken) {
            showMessage('验证信息已过期，请重新验证。', 'error');
            verifySection.style.display = 'block';
            resetSection.style.display = 'none';
            return;
        }

        try {
            setButtonLoading(submitBtn, true, '提交中...');
            const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reset_token: resetToken, new_password: newPassword })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '修改失败');
            }

            showMessage('密码已更新，即将跳转到登录页。', 'success');
            setTimeout(() => {
                if (window.smartRedirect) {
                    window.smartRedirect('login.html');
                } else {
                    window.location.href = 'login.html';
                }
            }, 1800);
        } catch (error) {
            showMessage(error.message || '修改失败，请稍后再试。', 'error');
        } finally {
            setButtonLoading(submitBtn, false, '确认修改');
        }
    });

    backToVerify.addEventListener('click', () => {
        resetToken = null;
        resetSection.style.display = 'none';
        verifySection.style.display = 'block';
        clearMessage();
    });
});

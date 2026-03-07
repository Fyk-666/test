// --- 1. 将智能跳转设为全局函数，防止任何地方报 is not defined ---
window.smartRedirect = function(destination) {
    const baseUrl = window.location.origin;
    const pathName = window.location.pathname;
    const targetPage = destination.startsWith('/') ? destination.substring(1) : destination;

    if (pathName.includes('/test/')) {
        window.location.href = `${baseUrl}/test/${targetPage}`;
    } else {
        window.location.href = `${baseUrl}/${targetPage}`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 2. 检查并显示当前用户 ---
    async function checkAuth() {
        const token = localStorage.getItem('token');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const usernameDisplay = document.getElementById('usernameDisplay');
        const welcomeMessage = document.getElementById('welcomeMessage');

        // 如果没有 Token，显示登录按钮
        if (!token) {
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (registerBtn) registerBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (usernameDisplay) usernameDisplay.textContent = '';
            if (welcomeMessage) welcomeMessage.textContent = '请登录';
            return;
        }

        try {
            // 发起验证请求
            const response = await fetch('https://kczx.pythonanywhere.com/api/current-user', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // 只有在明确是 401 权限错误时才删除 Token
            if (response.status === 401) {
                console.warn('Token 已过期或无效，安全清除');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.reload();
                return;
            }

            if (!response.ok) return;

            // 解析后端数据
            const data = await response.json();

            // 更新 UI
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            
            if (usernameDisplay) {
                usernameDisplay.textContent = data.display_name || data.username;
            }
            if (welcomeMessage) {
                welcomeMessage.textContent = '，欢迎回来！';
            }

        } catch (error) {
            console.error('前端运行或网络连接出错:', error);
        }
    }

    // 页面加载时执行验证
    checkAuth();

    // --- 3. 退出登录逻辑 (修复报错版) ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('token');
            
            // 禁用按钮防止连点
            logoutBtn.style.pointerEvents = 'none';
            logoutBtn.textContent = "退出中...";

            if (token) {
                try {
                    // 通知后端注销
                    await fetch('https://kczx.pythonanywhere.com/api/logout', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch (err) {
                    console.log("后端注销请求失败，忽略并强制前端退出...");
                }
            }
            
            // 无论后端是否响应，前端必须清空数据
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // 丝滑跳转到登录页，使用全局的 smartRedirect
            window.smartRedirect('login.html');
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    // 1. 智能跳转函数 (适配 GitHub Pages 和 根目录)
    function smartRedirect(destination) {
        const baseUrl = window.location.origin;
        const pathName = window.location.pathname;
        const targetPage = destination.startsWith('/') ? destination.substring(1) : destination;

        if (pathName.includes('/test/')) {
            window.location.href = `${baseUrl}/test/${targetPage}`;
        } else {
            window.location.href = `${baseUrl}/${targetPage}`;
        }
    }

    // 2. 检查并显示当前用户
    async function checkAuth() {
        const token = localStorage.getItem('token');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const usernameDisplay = document.getElementById('usernameDisplay');
        const welcomeMessage = document.getElementById('welcomeMessage');

        // 如果没有 Token，显示登录按钮，隐藏用户信息
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

            // --- 核心修复：只在明确是 401 权限错误时才删除 Token ---
            if (response.status === 401) {
                console.warn('Token 已过期或无效，安全清除');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // 刷新页面以更新 UI
                window.location.reload();
                return;
            }

            // 如果后端挂了 (500) 或网络断了，直接 return，千万别删 Token！
            if (!response.ok) {
                console.error("服务器异常，状态码:", response.status, "保留 Token");
                return; 
            }

            // 解析后端数据
            const data = await response.json();

            // 更新 UI (加了 if 判断，防止当前页面没有这些元素时报错)
            if (loginBtn) loginBtn.style.display = 'none';
            if (registerBtn) registerBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            
            if (usernameDisplay) {
                // 优先显示昵称，没有则显示用户名
                usernameDisplay.textContent = data.display_name || data.username;
            }
            if (welcomeMessage) {
                welcomeMessage.textContent = '，欢迎回来！';
            }

        } catch (error) {
            // 捕获到 JS 内部错误（如 JSON 解析失败、DOM 操作失败），绝对不能删 Token！
            console.error('前端运行或网络连接出错:', error);
        }
    }

    // 页面加载时执行验证
    checkAuth();

    // 3. 退出登录逻辑
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // 通知后端注销（如果后端有这个接口的话）
                    await fetch('https://kczx.pythonanywhere.com/api/logout', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch (err) {
                    console.log("后端注销请求失败，忽略...");
                }
            }
            
            // 无论如何，清空前端数据并刷新页面
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. 新增：智能跳转函数 (修复报错的核心) ---
    function smartRedirect(destination) {
        const baseUrl = window.location.origin;
        const pathName = window.location.pathname;
        
        // 移除 destination 开头的 / 防止双斜杠
        const targetPage = destination.startsWith('/') ? destination.substring(1) : destination;

        // 检查当前是否在 GitHub 的 /test/ 子目录下
        if (pathName.includes('/test/')) {
            window.location.href = `${baseUrl}/test/${targetPage}`;
        } else {
            // Netlify 或本地环境
            window.location.href = `${baseUrl}/${targetPage}`;
        }
    }

    // 密码可见性切换
    const togglePassword = document.querySelector('.show-password');
    if (togglePassword) {
        const passwordInput = document.getElementById('password');
        togglePassword.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                togglePassword.textContent = 'visibility';
            } else {
                passwordInput.type = 'password';
                togglePassword.textContent = 'visibility_off';
            }
        });
    }

    // 显示当前登录用户信息
    async function displayCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            
            // 如果没有 Token
            if (!token) {
                // 如果当前已经在登录页，什么都不做，静静等待用户登录
                if (window.location.pathname.includes('login.html')) {
                    return; 
                } 
                // 如果在其他页面没 Token，才跳回登录页
                else {
                    smartRedirect('login.html');
                    return;
                }
            }

            const response = await fetch('https://kczx.pythonanywhere.com/api/current-user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // 如果 Token 失效（401），后端会返回错误
            if (!response.ok) {
                console.warn('Token 无效或过期，清除本地存储');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // 如果不在登录页，跳回登录页
                if (!window.location.pathname.includes('login.html')) {
                    smartRedirect('login.html');
                }
                return;
            }

            const data = await response.json();

            // 更新登录页面显示
            const usernameInput = document.getElementById('username');
            if (usernameInput) usernameInput.value = data.display_name;

            // 显示登录信息
            const loginInfo = document.getElementById('loginInfo');
            const userInfo = document.getElementById('userInfo');
            const loginTime = document.getElementById('loginTime');

            if (userInfo) userInfo.textContent = `用户名: ${data.display_name}`;
            if (loginTime) loginTime.textContent = `登录时间: ${new Date().toLocaleString()}`;
            if (loginInfo) loginInfo.style.display = 'block';

            // 隐藏登录表单
            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.style.display = 'none';

            // 显示退出按钮
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) logoutBtn.style.display = 'block';

        } catch (error) {
            console.error('验证用户失败:', error);
            // 网络错误时不强制跳转，避免死循环，只打印日志
        }
    }

    // 初始化显示当前用户
    displayCurrentUser();

    // 登录表单提交
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // 阻止表单默认提交行为

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            try {
                // 禁用按钮防止重复提交
                if(submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "登录中...";
                }

                const response = await fetch('https://kczx.pythonanywhere.com/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ login_id: username, password }),
                });

                const result = await response.json();

                if (response.ok) {
                    // 存储令牌和用户信息
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify({
                        username: result.username,
                        level: result.level,
                        display_name: result.display_name,
                        last_login: result.last_login,
                        is_online: true
                    }));

                    // 登录成功后重定向
                    smartRedirect('index.html');
                } else {
                    // 显示错误消息
                    const errorBox = document.createElement('div');
                    errorBox.className = 'error-message';
                    errorBox.textContent = result.error || '登录失败';
                    // 插入到表单开头
                    loginForm.insertBefore(errorBox, loginForm.firstChild);

                    // 3秒后淡出错误消息
                    setTimeout(() => {
                        errorBox.remove();
                    }, 3000);
                }
            } catch (error) {
                console.error('登录请求失败:', error);
                alert('登录请求失败，请检查网络连接');
            } finally {
                // 恢复按钮状态
                if(submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "登录";
                }
            }
        });
    }

    // 退出登录按钮点击事件
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                // 尝试通知后端注销，但不强求成功
                fetch('https://kczx.pythonanywhere.com/api/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).catch(e => console.log('后端注销通知失败，忽略'));
            }
        } finally {
            // 无论后端是否成功，前端必须清除 Token 并跳转
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // 刷新当前页面（如果在 login.html）或跳转
            window.location.reload(); 
        }
    });
});

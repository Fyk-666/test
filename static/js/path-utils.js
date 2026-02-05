/**
 * 智能路径计算工具
 * 根据当前URL自动计算路径前缀
 * 
 * GitHub 地址示例: https://xxx.github.io/test/
 *   - pathname: /test/index.html
 *   - prefix: /test
 *   - 跳转目标: /test/login.html
 * 
 * 新地址示例: https://kczx.dpdns.org/ 或 https://kczx.netlify.app/
 *   - pathname: /index.html
 *   - prefix: ''
 *   - 跳转目标: /login.html
 */

function getPathPrefix() {
    const pathname = window.location.pathname;
    
    // 检查路径中是否包含 /test/
    if (pathname.includes('/test/')) {
        return '/test';
    }
    
    // 其他情况返回空字符串
    return '';
}

function smartRedirect(targetPage) {
    const prefix = getPathPrefix();
    const baseUrl = window.location.origin;
    const targetUrl = baseUrl + prefix + '/' + targetPage;
    window.location.href = targetUrl;
}

function getFullPath(page) {
    const prefix = getPathPrefix();
    if (prefix) {
        return prefix + '/' + page;
    }
    return '/' + page;
}

// 导出函数供全局使用
window.getPathPrefix = getPathPrefix;
window.smartRedirect = smartRedirect;
window.getFullPath = getFullPath;

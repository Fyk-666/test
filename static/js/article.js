document.addEventListener('DOMContentLoaded', () => {
    // --- 新增：图片压缩工具函数 ---
    async function compressImage(blob, maxWidth = 1200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(blob);
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // 计算缩放比例
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 转为 Blob，注意压缩成 jpeg 格式体积最小
                canvas.toBlob((compressedBlob) => {
                    resolve(compressedBlob);
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        });
    }

    // 初始化 Toast-UI Editor
    const editor = new toastui.Editor({
        el: document.getElementById('editor-content'),
        height: '500px',
        initialEditType: 'markdown',
        previewStyle: 'tab',
        plugins: [toastui.Editor.plugin.codeSyntaxHighlight],
        toolbarItems: [
            ['heading', 'bold', 'italic', 'strike'],
            ['hr', 'quote'],
            ['ul', 'ol', 'task', 'indent', 'outdent'],
            ['table', 'image', 'link'],
            ['code', 'codeblock'],
            ['scrollSync']
        ],
        hooks: {
            // --- 修改：添加压缩步骤 ---
            addImageBlobHook: async (blob, callback) => {
                try {
                    // 1. 压缩图片
                    const compressedBlob = await compressImage(blob);
                    
                    const formData = new FormData();
                    // 压缩后后缀统一设为 .jpg
                    const fileName = 'img_' + new Date().getTime() + '.jpg';
                    formData.append('file', compressedBlob, fileName); 

                    // 2. 上传到后端
                    const response = await fetch('https://kczx.pythonanywhere.com/api/upload', {
                        method: 'POST',
                        headers: { 
                            'Authorization': 'Bearer ' + localStorage.getItem('token')
                        },
                        body: formData
                    });

                    if (!response.ok) throw new Error("Upload failed");
                    const data = await response.json();

                    if (data.url) {
                        callback(data.url, 'image');
                    } else {
                        callback('', '上传成功但无URL');
                    }
                } catch (err) {
                    console.error("图片上传/压缩失败:", err);
                    callback('', '上传失败');
                }
            }
        }
    });

    // 从URL获取文章ID（如果是编辑页面）
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    if (articleId) {
        loadArticleForEdit(articleId, editor);
        document.querySelector('h2').textContent = '编辑文章';
        document.getElementById('publish-article').textContent = '更新文章';
    }

    // 发布/更新文章
    document.getElementById('publish-article').addEventListener('click', function(e) {
        e.preventDefault();
        const title = document.getElementById('article-title').value;
        const content = editor.getMarkdown();
        const status = document.getElementById('article-status').value || 'published'; // 默认发布

        if (!title || !content) {
            showNotification('标题和内容不能为空', 'error');
            return;
        }

        const formData = { title, content, status };
        const url = articleId
            ? `https://kczx.pythonanywhere.com/api/articles/${articleId}`
            : 'https://kczx.pythonanywhere.com/api/articles';
        const method = articleId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || '操作失败') });
            }
            return response.json();
        })
        .then(data => {
            const message = articleId ? '文章更新成功' : '文章发布成功';
            showNotification(message, 'success');
            
            // --- 核心修改：跳转到文章列表页 ---
            setTimeout(() => {
                // 确保这个路径和你设置的文章列表页路由一致
                window.location.href = "/list"; 
            }, 1200);
        })
        .catch(error => {
            console.error('操作失败:', error);
            showNotification(error.message || '操作失败，请检查网络连接', 'error');
        });
    });

    // 保存草稿
    document.querySelector('.draft-btn').addEventListener('click', function(e) {
        e.preventDefault();
        const title = document.getElementById('article-title').value;
        const content = editor.getMarkdown();

        if (!title || !content) {
            showNotification('标题和内容不能为空', 'error');
            return;
        }

        const formData = {
            title: title,
            content: content,
            status: 'draft'
        };

        const url = articleId
            ? `https://kczx.pythonanywhere.com/api/articles/${articleId}`
            : 'https://kczx.pythonanywhere.com/api/articles';
        const method = articleId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) throw new Error('保存失败');
            return response.json();
        })
        .then(data => {
            showNotification('草稿保存成功', 'success');
        })
        .catch(error => {
            console.error('保存草稿失败:', error);
            showNotification('草稿保存失败，请检查网络连接', 'error');
        });
    });

    // 加载文章用于编辑 (保持不变)
    function loadArticleForEdit(articleId, editor) {
        fetch(`https://kczx.pythonanywhere.com/api/articles/${articleId}/raw-md`, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('获取文章失败');
            return response.json();
        })
        .then(data => {
            editor.setMarkdown(data.content);
            return fetch(`https://kczx.pythonanywhere.com/api/articles/${articleId}`, {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });
        })
        .then(response => response.json())
        .then(article => {
            document.getElementById('article-title').value = article.title;
            document.getElementById('article-status').value = article.status;
        })
        .catch(error => {
            console.error('加载文章失败:', error);
            showNotification('加载文章失败，请重试', 'error');
        });
    }

    // 显示通知 (保持不变)
    function showNotification(message, type = 'success') {
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${type === 'success' ? 'fa-check' : 'fa-times'}"></i>
            </div>
            <div class="notification-content">${message}</div>
            <div class="notification-progress-bar"></div>
        `;
        container.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }
});

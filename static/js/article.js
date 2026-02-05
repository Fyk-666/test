document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 图片压缩工具函数 ---
    async function compressImage(blob, maxWidth = 1200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(blob);
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((compressedBlob) => {
                    resolve(compressedBlob);
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        });
    }

    // --- 2. 智能跳转函数 ---
    // 已移至 path-utils.js，这里保留兼容性

    // --- 3. 标签系统逻辑 ---
    let tags = [];
    const keywordMap = {
        '学习': '学习笔记', '作业': '学习笔记', '复习': '学习笔记', '考试': '学习笔记', '笔记': '学习笔记',
        '生活': '生活碎片', '记录': '生活碎片', '日常': '生活碎片', '吃': '生活碎片',
        '技术': '技术分享', '代码': '技术分享', '编程': '技术分享', '教程': '技 术分享',
        '活动': '校园活动', '比赛': '校园活动', '社团': '校园活动',
        '总结': '计划总结', '计划': '计划总结', '目标': '计划总结'
    };

    const selectedTagsContainer = document.getElementById('selected-tags');
    const tagInput = document.getElementById('tag-input');
    const titleInput = document.getElementById('article-title');

    // 添加标签
    // 在你的 JS 代码中 addTag 函数建议修改如下，增加一些控制：
    window.addTag = function(tagName) {
        tagName = tagName.trim();
        if (!tagName) return;

        if (tags.length >= 5) {
            showNotification('最多只能添加5个标签哦', 'error');
            return;
        }
        
        if (tags.includes(tagName)) {
            showNotification('该标签已存在', 'error');
            return;
        }

        tags.push(tagName);
        renderTags();
        document.getElementById('tag-input').value = '';
    };

    // 删除标签
    window.removeTag = function(index) {
        tags.splice(index, 1);
        renderTags();
    };

    // 渲染标签 UI
    function renderTags() {
        if (!selectedTagsContainer) return;
        selectedTagsContainer.innerHTML = '';
        tags.forEach((tag, index) => {
            const span = document.createElement('span');
            span.className = 'tag-badge';
            span.innerHTML = `${tag} <i class="fas fa-times tag-remove" onclick="removeTag(${index})"></i>`;
            selectedTagsContainer.appendChild(span);
        });
    }

    // 自动匹配逻辑
    if (titleInput) {
        titleInput.addEventListener('blur', () => {
            const title = titleInput.value;
            for (const key in keywordMap) {
                if (title.includes(key)) {
                    addTag(keywordMap[key]);
                }
            }
        });
    }

    // 手动输入标签
    if (tagInput) {
        tagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagInput.value);
            }
        });
    }

    // --- 4. 初始化 Toast-UI Editor ---
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
            addImageBlobHook: async (blob, callback) => {
                try {
                    const compressedBlob = await compressImage(blob);
                    const formData = new FormData();
                    const fileName = 'img_' + new Date().getTime() + '.jpg';
                    formData.append('file', compressedBlob, fileName); 

                    const response = await fetch('https://kczx.pythonanywhere.com/api/upload', {
                        method: 'POST',
                        headers: { 
                            'Authorization': 'Bearer ' + localStorage.getItem('token')
                        },
                        body: formData
                    });

                    if (!response.ok) throw new Error("Upload failed");
                    const data = await response.json();
                    if (data.url) callback(data.url, 'image');
                } catch (err) {
                    console.error("图片上传失败:", err);
                    callback('', '上传失败');
                }
            }
        }
    });

    // --- 5. 编辑模式加载 ---
    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    if (articleId) {
        loadArticleForEdit(articleId, editor);
        const h2 = document.querySelector('h2');
        if (h2) h2.textContent = '编辑文章';
        const pubBtn = document.getElementById('publish-article');
        if (pubBtn) pubBtn.textContent = '更新文章';
    }

    // --- 6. 发布/更新文章 ---
    document.getElementById('publish-article').addEventListener('click', function(e) {
        e.preventDefault();
        const title = document.getElementById('article-title').value;
        const content = editor.getMarkdown();
        const status = document.getElementById('article-status').value || 'published';

        if (!title || !content) {
            showNotification('标题和内容不能为空', 'error');
            return;
        }

        // 标签必填校验
        if (tags.length === 0) {
            showNotification('请至少选择或输入一个标签', 'error');
            return;
        }

        const formData = { 
            title, 
            content, 
            status, 
            tags: tags.join(',') // 将标签数组转为逗号分隔字符串
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
            if (!response.ok) return response.json().then(err => { throw new Error(err.error || '操作失败') });
            return response.json();
        })
        .then(data => {
            showNotification(articleId ? '文章更新成功' : '文章发布成功', 'success');
            setTimeout(() => smartRedirect('article_list.html'), 1200);
        })
        .catch(error => {
            console.error('操作失败:', error);
            showNotification(error.message || '操作失败', 'error');
        });
    });

    // --- 7. 保存草稿 ---
    const draftBtn = document.querySelector('.draft-btn');
    if (draftBtn) {
        draftBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const title = document.getElementById('article-title').value;
            const content = editor.getMarkdown();
            const formData = { title, content, status: 'draft', tags: tags.join(',') };
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
            .then(res => res.json())
            .then(() => showNotification('草稿保存成功', 'success'))
            .catch(() => showNotification('草稿保存失败', 'error'));
        });
    }

    // --- 8. 辅助函数 ---
    function loadArticleForEdit(articleId, editor) {
        // 使用更安全的 fetch 方式
        fetch(`https://kczx.pythonanywhere.com/api/articles/${articleId}/raw-md`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        })
        .then(response => {
            if (!response.ok) throw new Error('CORS or Not Found');
            return response.json();
        })
        .then(data => {
            editor.setMarkdown(data.content);
            return fetch(`https://kczx.pythonanywhere.com/api/articles/${articleId}`, {
                method: 'GET',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
        })
        .then(response => response.json())
        .then(article => {
            document.getElementById('article-title').value = article.title;
            document.getElementById('article-status').value = article.status;
            // 加载标签
            if (article.tags) {
                tags = article.tags.split(',');
                renderTags();
            }
        })
        .catch(error => console.error('加载文章失败:', error));
    }

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
            <div class="notification-icon"><i class="fas ${type === 'success' ? 'fa-check' : 'fa-times'}"></i></div>
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

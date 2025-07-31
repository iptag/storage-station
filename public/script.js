const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultDiv = document.getElementById('result');
const progressBar = document.getElementById('progress-bar');
const progress = document.getElementById('progress');

// 触发文件选择
dropZone.addEventListener('click', () => fileInput.click());

// 文件选择事件
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

// 拖拽事件
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files[0]);
    }
});

// 文件上传处理函数
function handleFileUpload(file) {
    resultDiv.style.display = 'none';
    progressBar.style.display = 'block';
    progress.style.width = '0%';
    progress.textContent = '0%';

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    
    // ✨【核心修改】✨
    // 我们不再需要手动设置 x-api-key 请求头了。
    // 因为用户已经通过密码登录，浏览器会自动携带 site_auth cookie，
    // 后端会通过验证这个 cookie 来授权上传。
    
    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progress.style.width = percentComplete.toFixed(2) + '%';
            progress.textContent = percentComplete.toFixed(2) + '%';
        }
    };

    xhr.onload = function() {
        progressBar.style.display = 'none';
        resultDiv.style.display = 'block';
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resultDiv.innerHTML = `上传成功！<br>URL: <a href="${response.url}" target="_blank">${response.url}</a>`;
        } else {
            // 尝试解析JSON错误，如果不行就直接显示文本
            try {
                const errorResponse = JSON.parse(xhr.responseText);
                resultDiv.innerHTML = `上传失败: ${errorResponse.error || '未知错误'}`;
            } catch (e) {
                resultDiv.innerHTML = `上传失败: ${xhr.responseText}`;
            }
        }
    };

    xhr.onerror = function() {
        progressBar.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '上传过程中发生网络错误。';
    };

    xhr.send(formData);
}

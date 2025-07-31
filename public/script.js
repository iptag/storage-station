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
    
    // 从用户处获取 API 密钥（或者硬编码一个用于前端的密钥）
    const apiKey = prompt("请输入您的 API 密钥 (用于前端测试):");
    if (!apiKey) {
        alert("未提供 API 密钥。");
        progressBar.style.display = 'none';
        return;
    }
    xhr.setRequestHeader('x-api-key', apiKey);


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
            const errorResponse = JSON.parse(xhr.responseText);
            resultDiv.innerHTML = `上传失败: ${errorResponse.error || '未知错误'}`;
        }
    };

    xhr.onerror = function() {
        progressBar.style.display = 'none';
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '上传过程中发生网络错误。';
    };

    xhr.send(formData);
}
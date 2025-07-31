# Cloudflare 文件临时中转站

这是一个完全构建在 Cloudflare 全家桶（Pages, Functions, R2）之上的轻量级文件临时存储服务。它旨在提供一个安全、高效且几乎零成本的解决方案，用于上传图片、音频等文件，并生成一个公开的临时URL，特别适合作为多模态AI模型的临时素材中转站。

## ✨ 核心功能

*   **网页上传界面**：提供一个简洁的拖拽式网页，用于手动上传文件。
*   **登录保护**：网页端通过密码进行保护，防止未授权访问。
*   **独立API接口**：提供 `/api/upload` 接口，可通过 API Key 进行验证，方便程序化调用。
*   **双重验证机制**：API 接口同时支持“网页登录Cookie”和“API Key”两种授权方式。
*   **文件自动过期**：利用 R2 生命周期规则，上传的文件会在 **24小时** 后自动删除，无需手动管理。
*   **零成本运营**：完全利用 Cloudflare 的免费额度，对于中低使用量的场景几乎无任何费用。
*   **全球CDN加速**：所有文件通过 Cloudflare 全球网络分发，访问速度快。

## 🏛️ 技术架构

本项目的工作流程非常简单高效：

1.  **前端 (Frontend)**: 用户访问由 **Cloudflare Pages** 托管的静态HTML页面 (`/public`)。
2.  **中间件 (Middleware)**: 一个位于 `/functions` 的 Pages Function (`_middleware.js`) 会拦截所有页面访问请求，要求输入密码进行验证。
3.  **后端 (Backend)**: 另一个 Pages Function (`/functions/api/upload.js`) 作为后端API，负责处理文件上传请求。它会验证请求是来自已登录的浏览器还是携带了有效的API Key。
4.  **存储 (Storage)**: 后端验证通过后，将文件存入 **Cloudflare R2** 存储桶。
5.  **访问 (Access)**: R2 存储桶绑定了一个公开的 `r2.dev` 域名，用于生成文件的公开URL，并配置了生命周期规则使文件在2小时后自动删除。

## 🚀 部署指南

### 前提条件

1.  一个 Cloudflare 账户。
2.  已安装 [Node.js](https://nodejs.org/) 和 npm。
3.  已安装 Git。

### 步骤 1：配置 Cloudflare R2

1.  **创建 R2 存储桶**:
    *   在 Cloudflare 控制台，进入 **R2**。
    *   点击 **创建存储桶**，输入一个名称（例如 `ai-temp-storage`），点击创建。

2.  **获取 R2 公开域名**:
    *   进入刚创建的存储桶的 **设置 (Settings)**。
    *   在 **General** 卡片下，**记下**这个生成的公开域名，即S3 API的地址。
    *   因为系统默认生成的域名过长，最后在 **Custom Domains** 下自定义一个简短好记的域名。

### 步骤 2：部署到 Cloudflare Pages

1.  **克隆或创建你自己的项目仓库**。

2.  **创建 Pages 应用**:
    *   在 Cloudflare 控制台，进入 **Workers & Pages**。
    *   点击 **创建应用程序** -> 选择 **Pages** 标签页 -> **连接到 Git**。
    *   选择你的项目仓库并开始设置。

3.  **配置构建与部署**:
    *   **项目名称**: 自定义。
    *   **生产分支**: `main`。
    *   **框架预设**: 选择 `None`。
    *   **构建命令**: **留空**。
    *   **构建输出目录**: 填写 `/public`。

4.  **添加环境变量和绑定 (最关键的一步)**:
    *   展开 **环境变量 (Environment variables)**，点击 **为生产环境添加**，添加以下三个变量：
        *   `PAGE_PASSWORD`: 设置你自定义的网页访问密码。
        *   `API_KEY`: 设置一个复杂且唯一的密钥，用于程序调用API。
        *   `R2_PUBLIC_URL`: 粘贴你在 **步骤1** 中记下的 R2 公开域名 (`https://xxxx.r2.cloudflarestorage.com/xxxx`)。**注意末尾不要有斜杠**。
    *   向下滚动到 **R2 存储桶绑定 (R2 Bucket Bindings)**，点击 **添加绑定**:
        *   **变量名称**: `MY_R2_BUCKET`
        *   **R2 存储桶**: 从下拉菜单中选择你创建的 R2 存储桶。

5.  **保存并部署**，等待部署完成。

## 🛠️ 如何使用

### 网页端上传

1.  访问你的 Cloudflare Pages 域名 (`https://your-project.pages.dev`)。
2.  在弹出的登录页面中，输入你设置的 `PAGE_PASSWORD`。
3.  登录成功后，直接将文件拖拽到虚线框内，或点击选择文件。
4.  上传成功后，页面将显示文件的临时URL。

### API 调用示例 (Python & Node.js)

<details>
<summary><strong>🐍 Python 示例</strong></summary>

> 需要先安装 `requests` 库: `pip install requests`

```python
import requests
import os

# --- 配置 ---
# 你的 Cloudflare Pages 项目的 URL
CLOUDFLARE_PAGES_URL = "https://your-project.pages.dev" 
# 你在 Cloudflare 中设置的 API Key
API_KEY = "your-super-secret-api-key"
# 要上传的本地文件路径
FILE_PATH = "./cat_image.png" 

# 准备请求
upload_url = f"{CLOUDFLARE_PAGES_URL}/api/upload"
headers = {
    "x-api-key": API_KEY
}

# 检查文件是否存在
if not os.path.exists(FILE_PATH):
    print(f"❌ 错误: 文件未找到于路径 {FILE_PATH}")
else:
    with open(FILE_PATH, 'rb') as f:
        files = {'file': (os.path.basename(FILE_PATH), f)}
        
        print(f"🚀 正在上传文件: {os.path.basename(FILE_PATH)}...")
        try:
            response = requests.post(upload_url, headers=headers, files=files, timeout=60)

            if response.status_code == 200:
                data = response.json()
                print("✅ 上传成功!")
                print(f"   URL: {data['url']}")
            else:
                print(f"❌ 上传失败，状态码: {response.status_code}")
                print(f"   错误信息: {response.text}")

        except requests.exceptions.RequestException as e:
            print(f"发生网络错误: {e}")

```

</details>

<details>
<summary><strong>🟩 Node.js 示例</strong></summary>

> 需要先安装 `axios` 和 `form-data` 库: `npm install axios form-data`

```javascript
// 引入所需的库
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// --- 配置 ---
// 你的 Cloudflare Pages 项目的 URL
const CLOUDFLARE_PAGES_URL = "https://your-project.pages.dev"; 
// 你在 Cloudflare 中设置的 API Key
const API_KEY = "your-super-secret-api-key"; 
// 要上传的本地文件路径
const FILE_PATH = "./your_audio.mp3"; 

/**
 * 上传文件到临时中转站的函数
 * @param {string} filePath - 本地文件的路径
 */
async function uploadFile(filePath) {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
        console.error(`❌ 错误：文件未找到于路径 ${filePath}`);
        return;
    }

    // 准备请求
    const uploadUrl = `${CLOUDFLARE_PAGES_URL}/api/upload`;
    
    // 创建一个 FormData 实例
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    // 准备请求头
    const headers = {
        'x-api-key': API_KEY,
        ...formData.getHeaders() // 自动设置 Content-Type 和 Content-Length
    };

    console.log(`🚀 正在上传文件: ${path.basename(filePath)}...`);

    try {
        const response = await axios.post(uploadUrl, formData, {
            headers: headers,
            timeout: 60000 // 60秒超时
        });

        if (response.status === 200) {
            console.log("✅ 上传成功!");
            console.log(`   URL: ${response.data.url}`);
        }
    } catch (error) {
        console.error("❌ 上传过程中发生错误:");
        if (error.response) {
            console.error(`   状态码: ${error.response.status}`);
            console.error(`   响应数据: ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
            console.error("   未收到服务器响应，请检查网络或URL。");
        } else {
            console.error('   请求设置错误:', error.message);
        }
    }
}

// 执行上传函数
uploadFile(FILE_PATH);
```

</details>

## 📁 项目文件结构

```.
├── functions/
│   ├── _middleware.js     # 页面登录验证的中间件
│   └── api/
│       └── upload.js      # 处理文件上传的核心API
├── public/
│   ├── index.html         # 前端上传页面
│   └── script.js          # 前端页面的交互逻辑
└── README.md              # 你正在阅读的文档
```

---
感谢使用！

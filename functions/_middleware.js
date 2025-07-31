/**
 * 简单的密码验证函数
 * @param {string} password - 用户输入的密码
 * @param {object} env - Cloudflare 环境变量
 * @returns {boolean} - 密码是否正确
 */
function isPasswordCorrect(password, env) {
    // 从环境变量中获取预设的页面访问密码
    const correctPassword = env.PAGE_PASSWORD;
    // 确保环境变量已设置且与用户输入的密码一致
    return correctPassword && password === correctPassword;
}

/**
 * 生成登录页面的 HTML
 * @param {boolean} hasError - 是否显示错误信息
 * @returns {string} - HTML 字符串
 */
function createLoginPage(hasError = false) {
    const errorMessage = hasError ? '<p style="color: red;">密码错误，请重试！</p>' : '';
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>需要验证</title>
        <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background-color: #f0f2f5; margin: 0; }
            .login-box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-align: center; }
            h2 { margin-top: 0; color: #333; }
            input[type="password"] { padding: 10px; font-size: 16px; border-radius: 4px; border: 1px solid #ccc; width: 250px; }
            input[type="submit"] { padding: 10px 20px; font-size: 16px; border-radius: 4px; border: none; background-color: #007bff; color: white; cursor: pointer; margin-top: 20px; }
            input[type="submit"]:hover { background-color: #0056b3; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>请输入访问密码</h2>
            <form method="post">
                <input type="password" name="password" autofocus>
                <br>
                <input type="submit" value="进入">
            </form>
            ${errorMessage}
        </div>
    </body>
    </html>
    `;
}

/**
 * Cloudflare Pages 中间件主函数
 */
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const cookieHeader = request.headers.get('Cookie') || '';

    // 定义一个 cookie 名称
    const AUTH_COOKIE_NAME = 'site_auth';

    // 1. 如果是 API 调用，则直接跳过页面密码验证，让它走自己的 API Key 验证逻辑
    if (url.pathname.startsWith('/api/')) {
        return await next(); // 将请求传递给下一个函数 (例如 /api/upload.js)
    }

    // 2. 检查请求是否为 POST（用户正在提交密码）
    if (request.method === 'POST') {
        const formData = await request.formData();
        const password = formData.get('password');

        if (isPasswordCorrect(password, env)) {
            // 密码正确，创建一个 cookie 并重定向回首页
            const response = new Response('Redirecting...', {
                status: 302,
                headers: {
                    'Location': url.pathname, // 重定向到用户最初想访问的页面
                    // --- ✨ 这里是修改的地方 ---
                    // 增加了 Max-Age=86400，设置有效期为24小时
                    'Set-Cookie': `${AUTH_COOKIE_NAME}=${env.PAGE_PASSWORD}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
                },
            });
            return response;
        } else {
            // 密码错误，返回带错误提示的登录页
            return new Response(createLoginPage(true), {
                headers: { 'Content-Type': 'text/html' },
            });
        }
    }

    // 3. 对于普通 GET 请求，检查 cookie 是否存在且有效
    if (cookieHeader.includes(`${AUTH_COOKIE_NAME}=${env.PAGE_PASSWORD}`)) {
        // Cookie 有效，用户已登录，放行请求到静态页面
        return await next();
    }

    // 4. 如果没有有效的 cookie，显示登录页面
    return new Response(createLoginPage(), {
        headers: { 'Content-Type': 'text/html' },
    });
}

export async function onRequestPost(context) {
    try {
        const { request, env } = context;

        // --- 1. 获取所有可能的凭证 ---
        // 从环境变量中获取预设的密钥
        const SECRET_API_KEY = env.API_KEY;
        const SECRET_PAGE_PASSWORD = env.PAGE_PASSWORD;
        
        // 从请求中获取客户端提供的凭证
        const providedApiKey = request.headers.get('x-api-key');
        const cookieHeader = request.headers.get('Cookie') || '';

        // --- 2. 检查两种验证方式 ---
        // 验证方式一：API Key 是否有效
        const isApiKeyValid = SECRET_API_KEY && providedApiKey === SECRET_API_KEY;

        // 验证方式二：网页登录的 Cookie 是否有效
        const authCookie = `site_auth=${SECRET_PAGE_PASSWORD}`;
        const isCookieValid = SECRET_PAGE_PASSWORD && cookieHeader.includes(authCookie);

        // --- 3. 统一授权检查 ---
        // 如果两种验证方式都无效，则拒绝访问
        if (!isCookieValid && !isApiKeyValid) {
            return new Response(JSON.stringify({ error: 'Unauthorized. Please provide a valid API key or log in.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // --- 文件处理 (如果授权通过，后续逻辑不变) ---
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const fileKey = `${crypto.randomUUID()}-${file.name}`;
        
        await env.MY_R2_BUCKET.put(fileKey, file.stream(), {
            httpMetadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000',
            },
        });

        const publicUrlHost = env.R2_PUBLIC_URL;
        if (!publicUrlHost) {
             return new Response(JSON.stringify({ error: 'R2 public URL not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const url = `${publicUrlHost}/${fileKey}`;

        return new Response(JSON.stringify({ url: url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Upload Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

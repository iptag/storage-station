export async function onRequestPost(context) {
    try {
        const { request, env } = context;

        // --- 安全性检查 ---
        // 从环境变量中获取预设的 API Key
        const SECRET_KEY = env.API_KEY;
        // 从请求头中获取客户端提供的 API Key
        const providedKey = request.headers.get('x-api-key');

        if (!SECRET_KEY || providedKey !== SECRET_KEY) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // --- 文件处理 ---
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // 生成一个随机的文件名，避免冲突
        const fileKey = `${crypto.randomUUID()}-${file.name}`;
        
        // --- 上传到 R2 ---
        // 'MY_R2_BUCKET' 是你在 Cloudflare Pages 中设置的 R2 绑定的名称
        await env.MY_R2_BUCKET.put(fileKey, file.stream(), {
            httpMetadata: {
                contentType: file.type,
                cacheControl: 'public, max-age=31536000', // 可选：设置缓存
            },
        });

        // --- 构建返回的 URL ---
        // 从环境变量获取 R2 的公开访问域名
        const publicUrlHost = env.R2_PUBLIC_URL;
        if (!publicUrlHost) {
             return new Response(JSON.stringify({ error: 'R2 public URL not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        const url = `${publicUrlHost}/${fileKey}`;

        // --- 返回成功响应 ---
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
// api/test-storage.js
import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    try {
        // Тест KV
        await kv.set('test', 'working');
        const kvTest = await kv.get('test');
        
        // Тест Blob
        const blob = await put('test.txt', 'Hello from Vercel Storage!', {
            access: 'public',
            contentType: 'text/plain',
            addRandomSuffix: true
        });

        res.status(200).json({
            status: '✅ Все работает!',
            kv: {
                test: kvTest,
                connection: '✅ OK'
            },
            blob: {
                url: blob.url,
                connection: '✅ OK'
            },
            environment: {
                hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
                hasKvUrl: !!process.env.KV_URL,
                hasKvRestUrl: !!process.env.KV_REST_API_URL,
                hasKvToken: !!process.env.KV_REST_API_TOKEN
            }
        });
    } catch (error) {
        res.status(500).json({
            status: '❌ Ошибка',
            error: error.message,
            stack: error.stack
        });
    }
}
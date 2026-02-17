// api/upload.js
import { put, del } from '@vercel/blob';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // Настройка CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Проверка авторизации (используем переменную окружения)
    const auth = req.headers.authorization;
    // В продакшене используйте process.env.ADMIN_TOKEN
    const validToken = 'Bearer admin-1234-secret'; // Можно заменить на process.env.ADMIN_TOKEN
    
    if (auth !== validToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // GET - получение всех изображений
        if (req.method === 'GET') {
            const images = await kv.get('images') || [];
            return res.status(200).json(images);
        }

        // POST - загрузка нового изображения
        if (req.method === 'POST') {
            const { image, showDate } = req.body;
            
            if (!image || !showDate) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Генерируем уникальное имя файла
            const filename = `image-${Date.now()}.jpg`;
            
            // Сохраняем в Blob Storage
            const blob = await put(filename, image, {
                access: 'public',
                contentType: 'image/jpeg',
                addRandomSuffix: false,
            });

            // Сохраняем метаданные в KV
            const imageData = {
                id: Date.now(),
                url: blob.url,
                showDate,
                active: false,
                filename,
                createdAt: new Date().toISOString()
            };

            let images = await kv.get('images') || [];
            images.push(imageData);
            await kv.set('images', images);

            return res.status(200).json(imageData);
        }

        // DELETE - удаление изображения
        if (req.method === 'DELETE') {
            const { id } = req.query;
            
            if (!id) {
                return res.status(400).json({ error: 'Missing id' });
            }

            let images = await kv.get('images') || [];
            const imageToDelete = images.find(img => img.id == id);
            
            if (imageToDelete) {
                // Удаляем из Blob Storage
                try {
                    await del(imageToDelete.filename);
                } catch (blobError) {
                    console.error('Error deleting from blob:', blobError);
                    // Продолжаем даже если не удалось удалить из blob
                }
            }

            images = images.filter(img => img.id != id);
            await kv.set('images', images);

            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

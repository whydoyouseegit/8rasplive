// api/activate.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Проверка авторизации
    const auth = req.headers.authorization;
    const validToken = 'Bearer admin-1234-secret';
    
    if (auth !== validToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: 'Missing id' });
        }

        let images = await kv.get('images') || [];
        images = images.map(img => ({
            ...img,
            active: img.id === id
        }));
        
        await kv.set('images', images);
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
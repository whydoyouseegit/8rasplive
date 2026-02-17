// app.js
let images = [];
let isAuthenticated = localStorage.getItem('auth') === 'true';

// API токен (в продакшене лучше использовать более сложный)
const API_TOKEN = 'admin-1234-secret';

// Загрузка изображений с сервера
async function loadImagesFromServer() {
    try {
        const response = await fetch('/api/upload', {
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });
        
        if (response.ok) {
            images = await response.json();
            // Кешируем локально для TV страницы
            localStorage.setItem('images', JSON.stringify(images));
            return images;
        } else if (response.status === 401) {
            console.error('Unauthorized - check API_TOKEN');
        }
    } catch (error) {
        console.error('Error loading images:', error);
        // Используем локальный кеш если сервер недоступен
        const cached = localStorage.getItem('images');
        if (cached) {
            images = JSON.parse(cached);
        }
    }
    return [];
}

// Сохранение на сервер
async function saveToServer(imageData) {
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify(imageData)
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            const error = await response.text();
            console.error('Server error:', error);
        }
    } catch (error) {
        console.error('Error saving to server:', error);
    }
    return null;
}

// Активация на сервере
async function activateOnServer(id) {
    try {
        const response = await fetch('/api/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`
            },
            body: JSON.stringify({ id })
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error activating on server:', error);
        return false;
    }
}

// Удаление с сервера
async function deleteFromServer(id) {
    try {
        const response = await fetch(`/api/upload?id=${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`
            }
        });
        
        return response.ok;
    } catch (error) {
        console.error('Error deleting from server:', error);
        return false;
    }
}

// Получение активного изображения для TV
async function getActiveImage() {
    try {
        const response = await fetch('/api/images');
        if (response.ok) {
            const data = await response.json();
            return data.activeImage;
        }
    } catch (error) {
        console.error('Error getting active image:', error);
    }
    return null;
}

// Проверка пути при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    
    // Загружаем изображения с сервера
    await loadImagesFromServer();
    
    if (path === '/tv.html') {
        loadTVPage();
        // Запрос полноэкранного режима
        try {
            await document.documentElement.requestFullscreen();
        } catch (e) {
            console.log('Fullscreen not supported');
        }
    } else if (path === '/dashboard.html') {
        if (!isAuthenticated) {
            window.location.href = '/';
        } else {
            loadDashboard();
        }
    } else {
        if (isAuthenticated) {
            window.location.href = '/dashboard.html';
        }
    }
});

// Функция входа
window.handleLogin = (e) => {
    e.preventDefault();
    const login = document.getElementById('login').value;
    const password = document.getElementById('password').value;
    
    if (login === 'admin' && password === '1234') {
        localStorage.setItem('auth', 'true');
        window.location.href = '/dashboard.html';
    } else {
        alert('Неверный логин или пароль');
    }
};

// Функция выхода
window.logout = () => {
    localStorage.removeItem('auth');
    window.location.href = '/';
};

// Загрузка дашборда
function loadDashboard() {
    const app = document.getElementById('app');
    const imagesList = images.map(img => `
        <div class="image-card" data-id="${img.id}">
            <img src="${img.url}" loading="lazy">
            <p>📅 ${img.showDate}</p>
            ${img.active ? '<b style="color:#22c55e;">✓ Активно</b>' : ''}
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="activate-btn" onclick="activateImage(${img.id})">Активировать</button>
                <button class="delete-btn" onclick="deleteImage(${img.id})">Удалить</button>
            </div>
        </div>
    `).join('');

    app.innerHTML = `
        <div class="dashboard">
            <div class="sidebar">
                <h2>📺 РАСПИСАНИЕ 8 ШК</h2>
                <a href="/tv.html" target="_blank">
                    <button>🖥️ Открыть на ТВ</button>
                </a>
                <button onclick="logout()" style="background:#ef4444;">🚪 Выйти</button>
            </div>
            
            <div class="content">
                <h1>Управление изображениями</h1>
                
                <form id="uploadForm" onsubmit="handleUpload(event)">
                    <div class="drop-zone" id="dropZone">
                        📸 Перетащи изображение сюда или нажми для выбора
                        <input type="file" id="fileInput" accept="image/*" hidden onchange="previewImage(this)">
                        <img id="preview" style="display:none; max-width:100%; margin-top:15px; border-radius:12px;">
                    </div>
                    
                    <input type="date" id="showDate" required>
                    <button type="submit" id="uploadBtn" disabled>📤 Загрузить</button>
                </form>
                
                <div class="image-grid" id="imageGrid">
                    ${imagesList || '<p style="text-align:center; color:#666;">Нет изображений</p>'}
                </div>
            </div>
        </div>
    `;
    
    setupDragAndDrop();
}

// Настройка Drag & Drop
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            previewImage(fileInput);
        }
    });
}

// Предпросмотр изображения
window.previewImage = (input) => {
    const preview = document.getElementById('preview');
    const uploadBtn = document.getElementById('uploadBtn');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            uploadBtn.disabled = false;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// Загрузка изображения
window.handleUpload = async (e) => {
    e.preventDefault();
    const file = document.getElementById('fileInput').files[0];
    const showDate = document.getElementById('showDate').value;
    
    if (file && showDate) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageData = {
                image: e.target.result.split(',')[1], // Убираем метаданные base64
                showDate: showDate
            };
            
            // Сохраняем на сервер
            const savedImage = await saveToServer(imageData);
            
            if (savedImage) {
                images.push(savedImage);
                localStorage.setItem('images', JSON.stringify(images));
                
                // Сброс формы
                document.getElementById('fileInput').value = '';
                document.getElementById('preview').style.display = 'none';
                document.getElementById('uploadBtn').disabled = true;
                document.getElementById('showDate').value = '';
                
                loadDashboard();
                alert('✅ Изображение успешно загружено!');
            } else {
                alert('❌ Ошибка при загрузке на сервер');
            }
        };
        reader.readAsDataURL(file);
    }
};

// Активация изображения
window.activateImage = async (id) => {
    const success = await activateOnServer(id);
    if (success) {
        images = images.map(img => ({
            ...img,
            active: img.id === id
        }));
        localStorage.setItem('images', JSON.stringify(images));
        loadDashboard();
        alert('✅ Изображение активировано!');
    } else {
        alert('❌ Ошибка при активации');
    }
};

// Удаление изображения
window.deleteImage = async (id) => {
    if (confirm('🗑️ Удалить изображение?')) {
        const success = await deleteFromServer(id);
        if (success) {
            images = images.filter(img => img.id !== id);
            localStorage.setItem('images', JSON.stringify(images));
            loadDashboard();
            alert('✅ Изображение удалено');
        } else {
            alert('❌ Ошибка при удалении');
        }
    }
};

// Загрузка ТВ страницы
function loadTVPage() {
    const app = document.getElementById('app');
    const activeImage = images.find(img => img.active);
    
    app.innerHTML = `
        <div class="tv-container">
            ${activeImage ? 
                `<img src="${activeImage.url}" class="tv-image" alt="Расписание">` : 
                '<div class="no-image">📺 Нет активного изображения</div>'
            }
        </div>
    `;
    
    // Запрос полноэкранного режима
    try {
        document.documentElement.requestFullscreen();
    } catch (e) {
        console.log('Fullscreen not supported');
    }
    
    // Скрыть курсор через 3 секунды
    setTimeout(() => {
        document.body.style.cursor = 'none';
    }, 3000);
    
    // Проверка обновлений каждые 10 секунд
    setInterval(async () => {
        const newActive = await getActiveImage();
        const currentImg = document.querySelector('.tv-image');
        
        if (newActive && (!currentImg || currentImg.src !== newActive.url)) {
            console.log('Обновление изображения на ТВ');
            await loadImagesFromServer();
            loadTVPage();
        }
    }, 10000);
}
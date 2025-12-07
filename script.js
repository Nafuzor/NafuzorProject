// Глобальные переменные
let qrcodeInstance = null;
let logoImage = new Image();
const qrCanvasId = 'qrCanvas';
const downloadBtnId = 'downloadBtn';

// ===========================================
// 1. Утилитарные функции
// ===========================================

/**
 * Сбрасывает состояние QR-кода и скрывает Canvas и Логотип.
 */
function resetQrCodeState() {
    const canvas = document.getElementById(qrCanvasId);
    const logoContainer = document.getElementById('logoContainer');

    if (canvas) canvas.classList.remove('visible');
    if (logoContainer) logoContainer.style.display = 'none';

    document.getElementById(downloadBtnId).classList.add('hidden');
    document.getElementById(downloadBtnId).disabled = true;
}

/**
 * Загружает настройки из Local Storage при запуске.
 */
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('qrGeneratorSettings');
        if (!savedSettings) return;

        const settings = JSON.parse(savedSettings);

        // Восстанавливаем UI настройки
        document.getElementById('urlInput').value = settings.url || '';
        document.getElementById('themeSelect').value = settings.theme || 'dark';
        document.getElementById('accentColor').value = settings.accentColor || '#00ffff';
        document.getElementById('bgOpacity').value = settings.bgOpacity || '0.3';

        // Восстанавливаем QR настройки
        document.getElementById('qrSize').value = settings.qrSize || '250';
        document.getElementById('qrQuietZone').value = settings.qrQuietZone || '4';
        document.getElementById('qrPixelRounding').value = settings.qrPixelRounding || '0';
        document.getElementById('qrColor1').value = settings.qrColor1 || '#005e8d';
        document.getElementById('qrBgColor').value = settings.qrBgColor || '#ffffff';
        document.getElementById('qrTransparentBg').checked = settings.qrTransparentBg || false;
        document.getElementById('logoSize').value = settings.logoSize || '20';
        
        // Восстанавливаем логотип
        if (settings.logoSrc) {
            logoImage.onload = generateOrUpdateQrCode; // Генерируем QR после загрузки
            logoImage.src = settings.logoSrc;
        }
        
        // Применяем настройки
        updateUISettings(); 

        if (settings.url) {
            // Запускаем генерацию
            generateOrUpdateQrCode(); 
        }
        console.log('Настройки загружены!');
    } catch (e) {
        console.error('Ошибка при загрузке настроек:', e);
        localStorage.removeItem('qrGeneratorSettings');
    }
}

/**
 * Сохраняет текущие настройки в Local Storage.
 */
function saveSettings() {
    const settings = {
        url: document.getElementById('urlInput').value.trim(),
        theme: document.getElementById('themeSelect').value,
        accentColor: document.getElementById('accentColor').value,
        bgOpacity: document.getElementById('bgOpacity').value,
        qrSize: document.getElementById('qrSize').value,
        qrQuietZone: document.getElementById('qrQuietZone').value,
        qrPixelRounding: document.getElementById('qrPixelRounding').value,
        qrColor1: document.getElementById('qrColor1').value,
        qrBgColor: document.getElementById('qrBgColor').value,
        qrTransparentBg: document.getElementById('qrTransparentBg').checked,
        logoSize: document.getElementById('logoSize').value,
        logoSrc: logoImage.src || '' // Сохраняем логотип (Base64)
    };
    localStorage.setItem('qrGeneratorSettings', JSON.stringify(settings));
    alert('Текущие настройки дизайна успешно сохранены!');
}


// ===========================================
// 2. Генерация/Обновление QR-кода (QRious)
// ===========================================

/**
 * Главная функция генерации и отрисовки.
 */
function generateOrUpdateQrCode() {
    const url = document.getElementById('urlInput').value.trim();
    if (!url) {
        resetQrCodeState();
        return;
    }

    const size = parseInt(document.getElementById('qrSize').value);
    const quietZone = parseInt(document.getElementById('qrQuietZone').value);
    const isBgTransparent = document.getElementById('qrTransparentBg').checked;
    
    // Используем только один цвет для точек (для стабильности)
    const foregroundColor = document.getElementById('qrColor1').value; 
    const backgroundColor = isBgTransparent ? null : document.getElementById('qrBgColor').value;
    
    const canvas = document.getElementById(qrCanvasId);
    
    // 1. Инициализация/Обновление QRious
    if (!qrcodeInstance) {
        // Создаем новый экземпляр
        qrcodeInstance = new QRious({
            element: canvas,
            value: url,
            size: size,
            foreground: foregroundColor,
            background: backgroundColor,
            level: 'H',
            padding: quietZone 
        });
    } else {
        // Обновляем существующий экземпляр
        qrcodeInstance.set({
            value: url,
            size: size,
            foreground: foregroundColor,
            background: backgroundColor,
            padding: quietZone
        });
    }
    
    // 2. Настройка контейнера и стилей
    // QRious включает padding в размер, поэтому контейнеру padding не нужен.
    // document.getElementById('qrCodeContainer').style.padding = `${quietZone * 5}px`; 
    canvas.style.borderRadius = document.getElementById('qrPixelRounding').value + '%';
    
    // 3. Отрисовка Логотипа
    drawLogo(canvas); 

    // 4. Видимость
    canvas.classList.add('visible');
    document.getElementById(downloadBtnId).classList.remove('hidden');
    document.getElementById(downloadBtnId).disabled = false;
    
    // Обновление отображаемых значений
    document.getElementById('qrSizeValue').textContent = size;
    document.getElementById('qrQuietZoneValue').textContent = quietZone;
    document.getElementById('qrRoundingValue').textContent = document.getElementById('qrPixelRounding').value;
    document.getElementById('logoSizeValue').textContent = document.getElementById('logoSize').value;
}

// ===========================================
// 3. Отрисовка Логотипа (Canvas API)
// ===========================================

/**
 * Рисует логотип в центре QR-кода и создает белую область вокруг него.
 */
function drawLogo(canvas) {
    const ctx = canvas.getContext('2d');
    const size = parseInt(document.getElementById('qrSize').value);
    const logoPercent = parseInt(document.getElementById('logoSize').value);

    // Только если логотип загружен и Canvas готов
    if (logoImage.src && ctx) {
        const quietZone = qrcodeInstance ? qrcodeInstance.padding : 0;
        
        // Размер логотипа (в пикселях)
        const logoSizePx = size * (logoPercent / 100); 
        
        // Координаты центра
        // Выравниваем относительно общего размера Canvas (size + 2*padding)
        const totalSize = size + 2 * quietZone;
        const x = (totalSize / 2) - (logoSizePx / 2);
        const y = (totalSize / 2) - (logoSizePx / 2);

        // 1. Создаем белую/прозрачную "рамку" вокруг логотипа
        const borderPadding = logoSizePx * 0.1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; 
        ctx.fillRect(x - borderPadding, y - borderPadding, 
                     logoSizePx + 2 * borderPadding, logoSizePx + 2 * borderPadding);
        
        // 2. Рисуем сам логотип
        ctx.drawImage(logoImage, x, y, logoSizePx, logoSizePx);
        
        // 3. Позиционируем HTML-логотип (для лучшей UX/визуализации)
        const logoContainer = document.getElementById('logoContainer');
        logoContainer.style.width = `${logoSizePx}px`;
        logoContainer.style.height = `${logoSizePx}px`;
        logoContainer.style.display = 'block';
        document.getElementById('qrLogo').src = logoImage.src;
        
    } else {
        document.getElementById('logoContainer').style.display = 'none';
    }
}

// ===========================================
// 4. Управление дизайном Интерфейса
// ===========================================

/**
 * Обновляет CSS-переменные для темизации сайта.
 */
function updateUISettings() {
    const root = document.documentElement.style;
    
    // 1. Цветовая тема
    const theme = document.getElementById('themeSelect').value;
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
    
    // 2. Цвет акцента
    const accentColor = document.getElementById('accentColor').value;
    root.setProperty('--accent-color', accentColor);
    root.setProperty('--accent-glow', `0 0 10px ${accentColor}, 0 0 20px ${accentColor} inset`);

    // 3. Прозрачность элементов
    const opacity = document.getElementById('bgOpacity').value;
    root.setProperty('--background-opacity', opacity);
}


// ===========================================
// 5. Скачивание QR-кода
// ===========================================

function downloadQrCode() {
    const canvas = document.getElementById(qrCanvasId);
    if (!canvas || !qrcodeInstance) {
        alert('Сначала сгенерируйте QR-код.');
        return;
    }
    
    // Перерисовываем логотип прямо перед скачиванием, чтобы он был на Canvas
    drawLogo(canvas); 
    
    const fileName = 'qr-code_' + Date.now() + '.png';
    const link = document.createElement('a');
    
    link.href = canvas.toDataURL('image/png');
    link.download = fileName; 
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// ===========================================
// 6. Инициализация и обработчики событий
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Загрузка настроек при старте
    loadSettings();
    
    // 2. Обработчик кнопки генерации
    document.getElementById('generateBtn').addEventListener('click', generateOrUpdateQrCode);
    
    // 3. Обработчик кнопки скачивания
    document.getElementById(downloadBtnId).addEventListener('click', downloadQrCode);

    // 4. Обработчики изменений настроек QR (обновляем QR-код)
    const qrSettings = document.querySelectorAll('#urlInput, #qrSize, #qrQuietZone, #qrPixelRounding, #qrColor1, #qrBgColor, #qrTransparentBg, #logoSize');
    qrSettings.forEach(control => {
        control.addEventListener('input', generateOrUpdateQrCode);
        control.addEventListener('change', generateOrUpdateQrCode);
    });
    
    // 5. Обработчики изменений UI
    const uiSettings = document.querySelectorAll('#themeSelect, #accentColor, #bgOpacity');
    uiSettings.forEach(control => {
        control.addEventListener('input', updateUISettings);
    });
    
    // 6. Обработчик загрузки логотипа
    document.getElementById('logoUpload').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                logoImage.onload = () => {
                    generateOrUpdateQrCode(); // Перерисовываем QR с новым лого
                };
                logoImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // 7. Обработчик сохранения настроек
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
});
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Создаем папку uploads если её нет
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueName = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  // Разрешаем только изображения
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Разрешены только изображения'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 // 1MB
  }
});

// Загрузка аватара
router.post('/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  try {
    console.log('Avatar upload request received');
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({
        success: false,
        error: 'Файл не был загружен'
      });
    }

    console.log('File uploaded successfully:', req.file);

    // Формируем URL для файла
    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Возвращаем успешный ответ с URL файла
    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка загрузки файла'
    });
  }
});

// Обработка ошибок multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Файл слишком большой. Максимальный размер: 1MB'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Неожиданное поле файла'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Ошибка загрузки: ${error.message}`
    });
  }
  
  if (error.message === 'Разрешены только изображения') {
    return res.status(400).json({
      success: false,
      error: 'Разрешены только изображения'
    });
  }
  
  next(error);
});

// Получение файла (для статических файлов)
router.get('/uploads/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Файл не найден'
      });
    }
    
    // Отправляем файл
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения файла'
    });
  }
});

// Удаление файла
router.delete('/uploads/:filename', authMiddleware, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads', filename);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Файл не найден'
      });
    }
    
    // Удаляем файл
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'Файл успешно удален'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления файла'
    });
  }
});

module.exports = router;

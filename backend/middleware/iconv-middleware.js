// middleware/iconv-middleware.js
const iconv = require('iconv-lite');

module.exports = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Функция для рекурсивной конвертации строк
    function convertString(str) {
      if (typeof str !== 'string') return str;
      
      try {
        // Пробуем разные варианты конвертации
        // Сначала пробуем как win1251
        const buffer = Buffer.from(str, 'binary');
        const utf8str = iconv.decode(buffer, 'win1251');
        
        // Если результат содержит нормальные буквы, возвращаем его
        if (/[а-яА-ЯёЁ]/.test(utf8str)) {
          return utf8str;
        }
        
        return str;
      } catch (e) {
        return str;
      }
    }
    
    function convertObject(obj) {
      if (obj === null || obj === undefined) return obj;
      
      if (typeof obj === 'string') {
        return convertString(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.map(item => convertObject(item));
      }
      
      if (typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = convertObject(obj[key]);
          }
        }
        return newObj;
      }
      
      return obj;
    }
    
    // Конвертируем данные
    const convertedData = convertObject(data);
    
    // Устанавливаем правильную кодировку
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Отправляем конвертированные данные
    return originalJson.call(this, convertedData);
  };
  
  next();
};
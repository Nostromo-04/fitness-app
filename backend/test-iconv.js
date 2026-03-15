// test-iconv.js
const iconv = require('iconv-lite');

// Ваши данные из API
const testStrings = [
  '’пЈ  ўҐаеҐЈ® Ў«®Є ',
  '‘ЇЁ ',
  '†Ё¬ ив ЈЁ «Ґ¦ ',
  'ѓаг¤м',
  'ЏаЁбҐ¤ Ёп б® ив Ј®©',
  'Ќ®ЈЁ'
];

console.log('=== ТЕСТ КОНВЕРТАЦИИ ICONV-LITE ===\n');

testStrings.forEach((str, index) => {
  console.log(`Строка ${index + 1}: "${str}"`);
  
  // Пробуем разные кодировки
  const buffer = Buffer.from(str, 'binary');
  
  try {
    const win1251 = iconv.decode(buffer, 'win1251');
    console.log(`  win1251 -> "${win1251}"`);
  } catch (e) {
    console.log(`  win1251 ошибка: ${e.message}`);
  }
  
  try {
    const cp1251 = iconv.decode(buffer, 'cp1251');
    console.log(`  cp1251  -> "${cp1251}"`);
  } catch (e) {
    console.log(`  cp1251 ошибка: ${e.message}`);
  }
  
  try {
    const utf8 = iconv.decode(buffer, 'utf8');
    console.log(`  utf8    -> "${utf8}"`);
  } catch (e) {
    console.log(`  utf8 ошибка: ${e.message}`);
  }
  
  console.log('---');
});

// Проверяем системную кодировку
console.log('\n=== СИСТЕМНАЯ ИНФОРМАЦИЯ ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('iconv-lite version:', require('iconv-lite/package.json').version);
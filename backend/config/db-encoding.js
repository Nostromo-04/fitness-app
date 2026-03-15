// db-encoding.js
module.exports = {
    // Эта функция будет вызываться после подключения к БД
    setEncoding: (client) => {
      // Устанавливаем кодировку клиента на UTF-8
      client.query("SET CLIENT_ENCODING TO 'UTF8';");
      client.query("SET NAMES 'UTF8';");
    }
  };
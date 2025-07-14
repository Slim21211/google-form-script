# Используем готовый образ с Puppeteer
FROM ghcr.io/puppeteer/puppeteer:21.5.2

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --production

# Копируем исходный код
COPY . .

# Создаем пользователя для безопасности (опционально)
USER pptruser

# Запускаем приложение
CMD ["node", "index.js"]
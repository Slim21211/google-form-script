const puppeteer = require('puppeteer');

class GoogleFormAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            slowMo: 250,
            devtools: false,
            protocolTimeout: 60000
        });
        this.page = await this.browser.newPage();
        
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await this.page.setViewport({ width: 1366, height: 768 });
        
        this.page.setDefaultTimeout(30000);
        this.page.setDefaultNavigationTimeout(30000);
    }

    async fillForm(formUrl, formData = {}) {
        try {
            console.log('Открываем форму...');
            await this.page.goto(formUrl, { waitUntil: 'networkidle2' });
            
            await this.page.waitForSelector('form', { timeout: 10000 });
            
            await this.fillFirstPage(formData);
            await this.goToNextPage();
            
            await this.fillSecondPage(formData);
            await this.goToNextPage();
            
            await this.selectCheckbox();
            await this.goToNextPage();
            
            await this.fillFourthPage(formData);
            await this.goToNextPage();
            
            await this.submitForm();
            
            console.log('Форма успешно отправлена!');
            
        } catch (error) {
            console.error('Ошибка при заполнении формы:', error);
            throw error;
        }
    }

    async fillFirstPage(formData) {
        console.log('Заполняем первую страницу...');
        await this.delay(1000);
    }

    async fillSecondPage(formData) {
        console.log('Заполняем вторую страницу...');
        await this.delay(1000);
    }

    async selectCheckbox() {
        console.log('Выбираем чекбокс на третьей странице...');
        
        try {
            // Ждем загрузки страницы
            await this.delay(5000);
            
            // Ищем чекбокс по role="checkbox"
            const checkboxes = await this.page.evaluate(() => {
                const elements = [];
                document.querySelectorAll('[role="checkbox"]').forEach((el, index) => {
                    elements.push({
                        index: index,
                        id: el.id || `checkbox_${index}`,
                        ariaLabel: el.getAttribute('aria-label') || '',
                        dataAnswerValue: el.getAttribute('data-answer-value') || '',
                        ariaChecked: el.getAttribute('aria-checked') === 'true'
                    });
                });
                return elements;
            });
            
            if (checkboxes.length === 0) {
                throw new Error('Чекбоксы не найдены на странице');
            }
            
            // Ищем чекбокс с id="i85" или содержащий "леопард"
            let targetCheckbox = checkboxes.find(cb => cb.id === 'i85') ||
                                checkboxes.find(cb => cb.ariaLabel.toLowerCase().includes('леопард'));
            
            if (!targetCheckbox) {
                throw new Error('Не удалось найти нужный чекбокс');
            }
            
            console.log('Найден целевой чекбокс:', targetCheckbox);
            
            if (targetCheckbox.ariaChecked) {
                console.log('Чекбокс уже выбран');
                return;
            }
            
            // Кликаем по чекбоксу
            await this.page.evaluate((checkboxId) => {
                const checkbox = document.querySelector(`#${checkboxId}`);
                if (checkbox) {
                    checkbox.click();
                }
            }, targetCheckbox.id);
            
            console.log('Чекбокс успешно выбран!');
            
        } catch (error) {
            console.error('Ошибка при выборе чекбокса:', error);
            throw error;
        }
        
        await this.delay(2000);
    }

    async fillFourthPage(formData) {
        console.log('Заполняем четвертую страницу...');
        await this.delay(1000);
    }

    async goToNextPage() {
        console.log('Переходим к следующей странице...');
        
        try {
            await this.delay(2000);
            
            // Ищем и кликаем кнопку "Далее"
            const elements = await this.page.$$('div[jsname="OCpkoe"]');
            
            for (let element of elements) {
                const text = await element.evaluate(el => el.textContent?.trim());
                if (text && text.includes('Далее')) {
                    await element.click();
                    console.log('Кнопка "Далее" найдена и нажата');
                    break;
                }
            }
            
            await this.delay(3000);
            
        } catch (error) {
            console.error('Ошибка при переходе на следующую страницу:', error);
            throw error;
        }
    }

    async submitForm() {
        console.log('Отправляем форму...');
        
        try {
            // Ищем кнопку отправки
            const elements = await this.page.$$('div[role="button"][jsname="M2UYVd"]');
            
            for (let element of elements) {
                const text = await element.evaluate(el => el.textContent?.trim());
                if (text && (text.includes('Отправить') || text.includes('Submit'))) {
                    await element.click();
                    console.log('Кнопка отправки найдена и нажата');
                    break;
                }
            }
            
            // Ждем немного для отправки формы (убираем ожидание подтверждения)
            await this.delay(5000);
            
        } catch (error) {
            console.error('Ошибка при отправке формы:', error);
            throw error;
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    // Метод для запуска с интервалом
    async startCycle(formUrl, formData, intervalMinutes = 30) {
        this.isRunning = true;
        console.log(`Запуск циклического выполнения каждые ${intervalMinutes} минут...`);
        console.log('Для остановки нажмите Ctrl+C');
        
        const runCycle = async () => {
            if (!this.isRunning) return;
            
            try {
                const now = new Date();
                console.log(`\n[${now.toLocaleString()}] Начинаем выполнение цикла...`);
                
                // Если браузер не инициализирован или закрыт, инициализируем заново
                if (!this.browser || !this.browser.isConnected()) {
                    await this.init();
                }
                
                await this.fillForm(formUrl, formData);
                
                console.log(`[${now.toLocaleString()}] Цикл завершен успешно`);
                
            } catch (error) {
                console.error(`[${new Date().toLocaleString()}] Ошибка в цикле:`, error);
                
                // Пытаемся переинициализировать браузер при ошибке
                try {
                    await this.close();
                    await this.delay(5000);
                    await this.init();
                } catch (initError) {
                    console.error('Ошибка при переинициализации:', initError);
                }
            }
            
            // Планируем следующий запуск
            if (this.isRunning) {
                console.log(`Следующий запуск через ${intervalMinutes} минут...`);
                setTimeout(runCycle, intervalMinutes * 60 * 1000);
            }
        };
        
        // Запускаем первый цикл
        await runCycle();
    }

    stop() {
        this.isRunning = false;
        console.log('\nОстанавливаем циклическое выполнение...');
    }
}

// Использование
async function main() {
    const automation = new GoogleFormAutomation();
    
    const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLScotL4FO3z3WV-ptNIeEDZvPjRj4VMWsr1iOaPvJWJ-lrMJlA/viewform';
    
    const formData = {
        name: 'Иван Иванов',
        email: 'ivan@example.com',
        phone: '+7 (999) 123-45-67'
    };
    
    // Обработка сигналов для корректного завершения
    process.on('SIGINT', async () => {
        console.log('\nПолучен сигнал завершения...');
        automation.stop();
        await automation.close();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\nПолучен сигнал завершения...');
        automation.stop();
        await automation.close();
        process.exit(0);
    });
    
    try {
        await automation.init();
        
        // Запуск циклического выполнения каждые 30 минут
        await automation.startCycle(formUrl, formData, 30);
        
    } catch (error) {
        console.error('Произошла критическая ошибка:', error);
        await automation.close();
        process.exit(1);
    }
}

// Запуск скрипта
if (require.main === module) {
    main();
}

module.exports = GoogleFormAutomation;
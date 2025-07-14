const puppeteer = require('puppeteer');

class GoogleFormAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
    }

    async init() {
        // Настройки для серверной среды (Railway)
        const launchOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ],
            slowMo: 250,
            devtools: false,
            protocolTimeout: 60000
        };

        // В Docker образе Puppeteer браузер уже настроен
        console.log('Запускаем браузер...');
        
        this.browser = await puppeteer.launch(launchOptions);
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
        // Увеличиваем время ожидания для Railway
        await this.delay(8000);
        
        // Добавляем отладочную информацию
        console.log('Получаем информацию о текущей странице...');
        const pageInfo = await this.page.evaluate(() => {
            return {
                url: window.location.href,
                title: document.title,
                hasForm: !!document.querySelector('form'),
                allElements: document.querySelectorAll('*').length,
                checkboxElements: document.querySelectorAll('[role="checkbox"]').length,
                divElements: document.querySelectorAll('div').length
            };
        });
        console.log('Информация о странице:', pageInfo);
        
        // Ждем появления чекбоксов с увеличенным таймаутом
        console.log('Ждем появления чекбоксов...');
        await this.page.waitForSelector('[role="checkbox"]', { 
            timeout: 20000,
            visible: true 
        });
        
        // Дополнительная задержка после появления
        await this.delay(3000);
        
        // Ищем чекбоксы
        const checkboxes = await this.page.evaluate(() => {
            const elements = [];
            document.querySelectorAll('[role="checkbox"]').forEach((el, index) => {
                elements.push({
                    index: index,
                    id: el.id || `checkbox_${index}`,
                    ariaLabel: el.getAttribute('aria-label') || '',
                    dataAnswerValue: el.getAttribute('data-answer-value') || '',
                    ariaChecked: el.getAttribute('aria-checked') === 'true',
                    visible: el.offsetParent !== null,
                    tagName: el.tagName,
                    className: el.className
                });
            });
            return elements;
        });
        
        console.log(`Найдено ${checkboxes.length} чекбоксов:`, checkboxes);
        
        if (checkboxes.length === 0) {
            // Пытаемся найти альтернативными способами
            console.log('Ищем чекбоксы альтернативными способами...');
            
            const alternativeCheckboxes = await this.page.evaluate(() => {
                const alternatives = [];
                
                // Поиск по различным селекторам
                const selectors = [
                    'input[type="checkbox"]',
                    '[aria-checked]',
                    'div[data-answer-value]',
                    'div[jsname]',
                    'span[role="checkbox"]'
                ];
                
                selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach((el, index) => {
                        alternatives.push({
                            selector: selector,
                            index: index,
                            id: el.id || `alt_${selector}_${index}`,
                            ariaLabel: el.getAttribute('aria-label') || '',
                            textContent: el.textContent?.trim() || '',
                            visible: el.offsetParent !== null
                        });
                    });
                });
                
                return alternatives;
            });
            
            console.log('Альтернативные элементы:', alternativeCheckboxes);
            
            if (alternativeCheckboxes.length === 0) {
                // Делаем скриншот для отладки
                await this.page.screenshot({ path: 'debug_screenshot.png', fullPage: true });
                console.log('Скриншот сохранен как debug_screenshot.png');
                
                throw new Error('Чекбоксы не найдены даже альтернативными способами');
            }
        }
        
        // Ищем чекбокс с id="i85" или содержащий "леопард"
        let targetCheckbox = checkboxes.find(cb => cb.id === 'i85') ||
                            checkboxes.find(cb => cb.ariaLabel.toLowerCase().includes('леопард')) ||
                            checkboxes.find(cb => cb.ariaLabel.toLowerCase().includes('курьер')) ||
                            checkboxes.find(cb => cb.dataAnswerValue.toLowerCase().includes('леопард'));
        
        if (!targetCheckbox) {
            console.log('Не найден нужный чекбокс, берем первый доступный...');
            targetCheckbox = checkboxes.find(cb => cb.visible) || checkboxes[0];
        }
        
        if (!targetCheckbox) {
            throw new Error('Не удалось найти подходящий чекбокс');
        }
        
        console.log('Найден целевой чекбокс:', targetCheckbox);
        
        if (targetCheckbox.ariaChecked) {
            console.log('Чекбокс уже выбран');
            return;
        }
        
        // Кликаем по чекбоксу с дополнительными проверками
        const clickResult = await this.page.evaluate((checkboxId) => {
            const checkbox = document.querySelector(`#${checkboxId}`);
            if (!checkbox) {
                return { success: false, error: 'Элемент не найден' };
            }
            
            // Проверяем видимость
            if (checkbox.offsetParent === null) {
                return { success: false, error: 'Элемент не виден' };
            }
            
            // Скроллим к элементу
            checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Кликаем
            checkbox.click();
            
            return { success: true, newState: checkbox.getAttribute('aria-checked') };
        }, targetCheckbox.id);
        
        console.log('Результат клика:', clickResult);
        
        if (!clickResult.success) {
            throw new Error(`Ошибка при клике: ${clickResult.error}`);
        }
        
        console.log('Чекбокс успешно выбран!');
        
    } catch (error) {
        console.error('Ошибка при выборе чекбокса:', error);
        
        // Дополнительная диагностика
        try {
            const pageContent = await this.page.content();
            console.log('HTML содержимое страницы (первые 1000 символов):', pageContent.substring(0, 1000));
        } catch (debugError) {
            console.error('Ошибка при получении содержимого страницы:', debugError);
        }
        
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
        await this.delay(3000); // Увеличиваем задержку
        
        // Ищем кнопки "Далее" различными способами
        const buttonSelectors = [
            'div[jsname="OCpkoe"]',
            'div[role="button"]',
            'span[jsname="V67aGc"]',
            'div[data-test-id="next-button"]',
            'button[type="button"]'
        ];
        
        let buttonFound = false;
        
        for (const selector of buttonSelectors) {
            const elements = await this.page.$$(selector);
            
            for (let element of elements) {
                const text = await element.evaluate(el => el.textContent?.trim().toLowerCase());
                
                if (text && (text.includes('далее') || text.includes('next') || text.includes('continue'))) {
                    console.log(`Найдена кнопка "${text}" с селектором ${selector}`);
                    
                    // Скроллим к кнопке
                    await element.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
                    await this.delay(1000);
                    
                    // Кликаем
                    await element.click();
                    buttonFound = true;
                    console.log('Кнопка "Далее" найдена и нажата');
                    break;
                }
            }
            
            if (buttonFound) break;
        }
        
        if (!buttonFound) {
            console.log('Кнопка "Далее" не найдена, пытаемся найти любую кнопку...');
            
            // Ищем любую кнопку на странице
            const allButtons = await this.page.$$('div[role="button"], button');
            
            for (let button of allButtons) {
                const text = await button.evaluate(el => el.textContent?.trim());
                console.log(`Найдена кнопка: "${text}"`);
            }
            
            if (allButtons.length > 0) {
                await allButtons[allButtons.length - 1].click(); // Кликаем последнюю кнопку
                console.log('Кликнули по последней найденной кнопке');
            }
        }
        
        await this.delay(4000); // Увеличиваем время ожидания загрузки
        
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
    async startCycle(formUrl, formData, intervalMinutes = 10) {
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
        
        // Запуск циклического выполнения каждые 10 минут
        await automation.startCycle(formUrl, formData, 10);
        
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
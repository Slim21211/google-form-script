const puppeteer = require('puppeteer');

class GoogleFormAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
    }

    async init() {
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
            
            // Страница 1
            await this.fillFirstPage(formData);
            await this.goToNextPage();
            
            // Страница 2
            await this.fillSecondPage(formData);
            await this.goToNextPage();
            
            // Страница 3 (с чекбоксами)
            await this.selectCheckbox();
            await this.goToNextPage();
            
            // Страница 4
            await this.fillFourthPage(formData);
            await this.goToNextPage();
            
            // Отправка
            await this.submitForm();
            
            console.log('Форма успешно отправлена!');
            
        } catch (error) {
            console.error('Ошибка при заполнении формы:', error);
            
            try {
                await this.page.screenshot({ path: 'error_screenshot.png', fullPage: true });
                console.log('Скриншот ошибки сохранен');
            } catch (screenshotError) {
                console.error('Ошибка при создании скриншота:', screenshotError);
            }
            
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
            await this.delay(5000);
            
            const currentUrl = await this.page.url();
            
            if (!currentUrl.includes('formResponse')) {
                throw new Error(`Неправильная страница для чекбоксов. URL: ${currentUrl}`);
            }
            
            await this.page.waitForSelector('[role="checkbox"]', { 
                timeout: 15000,
                visible: true 
            });
            
            await this.delay(3000);
            
            const checkboxes = await this.page.evaluate(() => {
                const elements = [];
                document.querySelectorAll('[role="checkbox"]').forEach((el, index) => {
                    elements.push({
                        index: index,
                        id: el.id || `checkbox_${index}`,
                        ariaLabel: el.getAttribute('aria-label') || '',
                        dataAnswerValue: el.getAttribute('data-answer-value') || '',
                        ariaChecked: el.getAttribute('aria-checked') === 'true',
                        visible: el.offsetParent !== null
                    });
                });
                return elements;
            });
            
            console.log(`Найдено ${checkboxes.length} чекбоксов`);
            
            if (checkboxes.length === 0) {
                throw new Error('Чекбоксы не найдены на странице');
            }
            
            let targetCheckbox = checkboxes.find(cb => cb.id === 'i85') ||
                                checkboxes.find(cb => cb.ariaLabel.toLowerCase().includes('леопард')) ||
                                checkboxes.find(cb => cb.ariaLabel.toLowerCase().includes('курьер')) ||
                                checkboxes.find(cb => cb.dataAnswerValue.toLowerCase().includes('леопард'));
            
            if (!targetCheckbox) {
                targetCheckbox = checkboxes.find(cb => cb.visible) || checkboxes[0];
            }
            
            if (!targetCheckbox) {
                throw new Error('Не удалось найти подходящий чекбокс');
            }
            
            if (targetCheckbox.ariaChecked) {
                console.log('Чекбокс уже выбран');
                return;
            }
            
            const clickResult = await this.page.evaluate((checkboxId) => {
                const checkbox = document.querySelector(`#${checkboxId}`);
                if (!checkbox) {
                    return { success: false, error: 'Элемент не найден' };
                }
                
                checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                checkbox.click();
                
                return { success: true, newState: checkbox.getAttribute('aria-checked') };
            }, targetCheckbox.id);
            
            if (!clickResult.success) {
                throw new Error(`Ошибка при клике: ${clickResult.error}`);
            }
            
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
            await this.delay(3000);
            
            const currentUrl = await this.page.url();
            
            const buttonSelectors = [
                'div[jsname="OCpkoe"]',
                'div[role="button"]',
                'span[jsname="V67aGc"]',
                'button[type="button"]',
                'span[role="button"]'
            ];
            
            let buttonFound = false;
            
            for (const selector of buttonSelectors) {
                const elements = await this.page.$$(selector);
                
                for (let i = 0; i < elements.length; i++) {
                    const element = elements[i];
                    
                    const buttonInfo = await element.evaluate((el) => {
                        const rect = el.getBoundingClientRect();
                        return {
                            text: el.textContent?.trim() || '',
                            visible: rect.width > 0 && rect.height > 0,
                            jsname: el.getAttribute('jsname') || ''
                        };
                    });
                    
                    const text = buttonInfo.text.toLowerCase();
                    if (text.includes('далее') || text.includes('next') || text.includes('continue') || 
                        text.includes('продолжить') || buttonInfo.jsname === 'OCpkoe') {
                        
                        await element.evaluate(el => {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                        await this.delay(1000);
                        
                        try {
                            await element.click();
                        } catch (clickError) {
                            await element.evaluate(el => {
                                el.click();
                            });
                        }
                        
                        buttonFound = true;
                        break;
                    }
                }
                
                if (buttonFound) break;
            }
            
            if (!buttonFound) {
                // Альтернативный подход - поиск и клик в одном evaluate
                buttonFound = await this.page.evaluate(() => {
                    const buttons = document.querySelectorAll('div[role="button"], span[role="button"], div[jsname]');
                    for (let button of buttons) {
                        const text = button.textContent?.trim().toLowerCase();
                        if (text && (text.includes('далее') || text.includes('next') || 
                                    text.includes('продолжить') || text.includes('continue'))) {
                            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            button.click();
                            return true;
                        }
                    }
                    return false;
                });
            }
            
            if (!buttonFound) {
                console.log('Пробуем нажать Enter...');
                await this.page.keyboard.press('Enter');
                buttonFound = true;
            }
            
            if (buttonFound) {
                await this.delay(5000);
                
                const newUrl = await this.page.url();
                
                if (newUrl === currentUrl) {
                    await this.delay(3000);
                    const finalUrl = await this.page.url();
                    
                    if (finalUrl === currentUrl) {
                        console.log('Переход не произошел, но продолжаем...');
                    }
                }
            } else {
                throw new Error('Не удалось найти кнопку "Далее"');
            }
            
        } catch (error) {
            console.error('Ошибка при переходе на следующую страницу:', error);
            
            try {
                await this.page.screenshot({ path: 'debug_navigation.png', fullPage: true });
                console.log('Скриншот навигации сохранен');
            } catch (screenshotError) {
                console.error('Ошибка при создании скриншота:', screenshotError);
            }
            
            throw error;
        }
    }

    async submitForm() {
        console.log('Отправляем форму...');
        
        try {
            // Ищем кнопку отправки
            const submitSelectors = [
                'div[role="button"][jsname="M2UYVd"]',
                'div[role="button"]',
                'span[role="button"]',
                'button[type="submit"]',
                'input[type="submit"]'
            ];
            
            let submitFound = false;
            
            for (const selector of submitSelectors) {
                const elements = await this.page.$$(selector);
                
                for (let element of elements) {
                    const text = await element.evaluate(el => el.textContent?.trim());
                    if (text && (text.toLowerCase().includes('отправить') || 
                                text.toLowerCase().includes('submit') || 
                                text.toLowerCase().includes('send'))) {
                        
                        console.log(`Найдена кнопка отправки: "${text}"`);
                        await element.click();
                        console.log('Кнопка отправки найдена и нажата');
                        submitFound = true;
                        break;
                    }
                }
                
                if (submitFound) break;
            }
            
            if (!submitFound) {
                // Пробуем через XPath
                const xpathSubmit = await this.page.$x("//div[contains(text(), 'Отправить')] | //span[contains(text(), 'Отправить')] | //div[contains(text(), 'Submit')] | //span[contains(text(), 'Submit')]");
                
                if (xpathSubmit.length > 0) {
                    await xpathSubmit[0].click();
                    console.log('Кнопка отправки найдена через XPath и нажата');
                    submitFound = true;
                }
            }
            
            if (!submitFound) {
                throw new Error('Кнопка отправки не найдена');
            }
            
            // Ждем отправки формы
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

    async startCycle(formUrl, formData, intervalMinutes = 10) {
        this.isRunning = true;
        console.log(`Запуск циклического выполнения каждые ${intervalMinutes} минут...`);
        console.log('Для остановки нажмите Ctrl+C');
        
        const runCycle = async () => {
            if (!this.isRunning) return;
            
            try {
                const now = new Date();
                console.log(`\n[${now.toLocaleString()}] Начинаем выполнение цикла...`);
                
                if (!this.browser || !this.browser.isConnected()) {
                    await this.init();
                }
                
                await this.fillForm(formUrl, formData);
                
                console.log(`[${now.toLocaleString()}] Цикл завершен успешно`);
                
            } catch (error) {
                console.error(`[${new Date().toLocaleString()}] Ошибка в цикле:`, error);
                
                try {
                    await this.close();
                    await this.delay(5000);
                    await this.init();
                } catch (initError) {
                    console.error('Ошибка при переинициализации:', initError);
                }
            }
            
            if (this.isRunning) {
                console.log(`Следующий запуск через ${intervalMinutes} минут...`);
                setTimeout(runCycle, intervalMinutes * 60 * 1000);
            }
        };
        
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
        await automation.startCycle(formUrl, formData, 10);
        
    } catch (error) {
        console.error('Произошла критическая ошибка:', error);
        await automation.close();
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = GoogleFormAutomation;
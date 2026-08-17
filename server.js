const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chromium = require('@sparticuz/chromium');

puppeteer.use(StealthPlugin());

const app = express();

app.get('/scrape', async (req, res) => {
    const { location, min_price, max_price, bedrooms } = req.query;
    const searchQuery = encodeURIComponent(`${location || 'Yerevan'} apartment ${bedrooms ? bedrooms + ' room' : ''}`);
    const targetUrl = `https://www.list.am/en/search?q=${searchQuery}`;

    let browser;
    try {
        // تنظیمات سازگار با Render و محیط‌های ابری
        const executablePath = await chromium.executablePath() || 
            (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);

        browser = await puppeteer.launch({ 
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: executablePath,
            headless: true,
            ignoreHTTPSErrors: true,
        });
        
        const page = await browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const listings = await page.evaluate(() => {
            const propertyCards = Array.from(document.querySelectorAll('.gl .a'));
            return propertyCards.slice(0, 15).map(card => {
                const title = card.querySelector('.l')?.innerText || 'Unknown Title';
                const priceText = card.querySelector('.p')?.innerText || '0';
                const rawPrice = Number(priceText.replace(/[^0-9]/g, ''));
                
                return {
                    title: title,
                    price: rawPrice,
                    url: card.href || '',
                    location: title,
                    bedrooms: 0,
                    area: 0          
                };
            }).filter(item => item.url !== '');
        });

        res.json({ results: listings });
    } catch (error) {
        console.error("Scraping failed:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scraper running on port ${PORT}`));

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

// کلید API خود را دقیقاً بین دو کوتیشن زیر قرار دهید
const SCRAPER_API_KEY = 'bee6b60b60476094a61f75b1e9890824';

app.get('/scrape', async (req, res) => {
    const { location, bedrooms } = req.query;
    const searchQuery = encodeURIComponent(`${location || 'Yerevan'} apartment ${bedrooms ? bedrooms + ' room' : ''}`);
    const targetUrl = `https://www.list.am/en/search?q=${searchQuery}`;

    // اضافه شدن render=true برای دور زدن صفحه امنیتی با اجرای جاوااسکریپت
    const scraperApiUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}&render=true`;

    try {
        const response = await axios.get(scraperApiUrl, { timeout: 60000 });
        const $ = cheerio.load(response.data);
        
        // این خط را برای خطایابی گذاشتم تا در لاگ رندر ببینیم دقیقا چه صفحه‌ای لود شده
        console.log("Page Title loaded:", $('title').text());

        const listings = [];

        $('.gl .a').slice(0, 15).each((index, element) => {
            const title = $(element).find('.l').text().trim() || 'Unknown Title';
            const priceText = $(element).find('.p').text().trim() || '0';
            const rawPrice = Number(priceText.replace(/[^0-9]/g, ''));
            const relativeUrl = $(element).attr('href');
            const fullUrl = relativeUrl ? `https://www.list.am${relativeUrl}` : '';

            if (fullUrl) {
                listings.push({
                    title: title,
                    price: rawPrice,
                    url: fullUrl,
                    location: title,
                    bedrooms: 0,
                    area: 0
                });
            }
        });

        res.json({ results: listings });
    } catch (error) {
        console.error("Scraping failed:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scraper running on port ${PORT}`));

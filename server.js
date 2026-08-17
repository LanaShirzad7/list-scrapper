const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.get('/scrape', async (req, res) => {
    const { location, bedrooms } = req.query;
    const searchQuery = encodeURIComponent(`${location || 'Yerevan'} apartment ${bedrooms ? bedrooms + ' room' : ''}`);
    const targetUrl = `https://www.list.am/en/search?q=${searchQuery}`;

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
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
        console.error("Scraping failed:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Scraper running on port ${PORT}`));

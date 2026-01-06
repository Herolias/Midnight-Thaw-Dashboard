const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const CONFIG_PATH = path.join(__dirname, 'config.json');

// Helper to read config (Automatic Migration)
const getConfig = () => {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            fs.writeFileSync(CONFIG_PATH, '[]');
            return [];
        }

        const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

        // Migration: Convert string array to object array
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'string') {
            const migrated = raw.map(addr => ({ address: addr, name: '' }));
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(migrated, null, 2));
            return migrated;
        }

        return raw;
    } catch (error) {
        console.error("Error reading config:", error);
        return [];
    }
};

// API Endpoint: Get all monitored wallets
app.get('/api/wallets', async (req, res) => {
    const wallets = getConfig();
    const results = [];

    for (const wallet of wallets) {
        try {
            const response = await axios.get(`https://mainnet.prod.gd.midnighttge.io/thaws/${wallet.address}/schedule`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            results.push({
                address: wallet.address,
                name: wallet.name || '',
                data: response.data,
                status: 'success'
            });
        } catch (error) {
            console.error(`Error fetching for ${wallet.address}:`, error.message);
            results.push({
                address: wallet.address,
                name: wallet.name || '',
                error: error.message,
                status: 'error'
            });
        }
    }
    res.json(results);
});

// API Endpoint: Lookup specific wallet
app.get('/api/lookup', async (req, res) => {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: 'Address is required' });

    try {
        const response = await axios.get(`https://mainnet.prod.gd.midnighttge.io/thaws/${address}/schedule`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API Endpoint: Add wallet to config
app.post('/api/wallets', (req, res) => {
    const { address, name } = req.body;
    if (!address) return res.status(400).json({ error: 'Address is required' });

    const wallets = getConfig();
    const existing = wallets.find(w => w.address === address);

    if (!existing) {
        wallets.push({ address, name: name || '' });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(wallets, null, 2));
    } else if (name !== undefined) {
        // Update name if re-adding existing
        existing.name = name;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(wallets, null, 2));
    }

    res.json({ success: true, wallets });
});

// API Endpoint: Update wallet name specifically
app.put('/api/wallets', (req, res) => {
    const { address, name } = req.body;
    if (!address) return res.status(400).json({ error: 'Address is required' });

    const wallets = getConfig();
    const existing = wallets.find(w => w.address === address);

    if (existing) {
        existing.name = name || '';
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(wallets, null, 2));
        res.json({ success: true, wallets });
    } else {
        res.status(404).json({ error: 'Wallet not found' });
    }
});

// API Endpoint: Remove wallet from config
app.delete('/api/wallets', (req, res) => {
    const { address } = req.body;
    let wallets = getConfig();
    wallets = wallets.filter(w => w.address !== address);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(wallets, null, 2));
    res.json({ success: true, wallets });
});

// Price Cache
let priceCache = { value: null, timestamp: 0 };
const CACHE_DURATION = 60 * 1000; // 1 minute

// API Endpoint: Get NIGHT Price
app.get('/api/price', async (req, res) => {
    const now = Date.now();
    if (priceCache.value && (now - priceCache.timestamp < CACHE_DURATION)) {
        return res.json(priceCache.value);
    }

    try {
        // Coingecko API for Midnight (NIGHT)
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'midnight-3',
                vs_currencies: 'eur,usd',
                include_24hr_change: 'true'
            }
        });

        // Fallback or structure checks
        const data = response.data['midnight-3'] || { eur: 0, eur_24h_change: 0, usd: 0, usd_24h_change: 0 };
        priceCache = { value: data, timestamp: now };

        res.json(data);
    } catch (error) {
        console.error("Error fetching price:", error.message);
        // Return cached value if available even if expired, otherwise error
        if (priceCache.value) return res.json(priceCache.value);
        res.status(500).json({ error: "Failed to fetch price" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

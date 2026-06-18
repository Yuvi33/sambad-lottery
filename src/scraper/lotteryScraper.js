const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function updateResults() {
  console.log('🔍 Fetching data from Lottery Sambad...');
  try {
    const response = await axios.get('https://lottery.sambad.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    // Extract the hidden JSON data from the website's script tag
    const match = response.data.match(/var datesCards = ({.*?});/);
    if (!match) throw new Error('Could not find data pattern');

    const fullData = JSON.parse(match[1]);
    const todayKey = Object.keys(fullData)[0]; // Gets today's date key
    const todayResults = fullData[todayKey];

    const dataDir = path.join(__dirname, '../../public/data');
    fs.mkdirSync(dataDir, { recursive: true });

    // 1. Save Latest Data
    const latestData = { date: todayKey, results: todayResults };
    fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(latestData, null, 2));
    console.log(`✅ Saved latest results for ${todayKey}`);

    // 2. Save History Manifest
    const manifestPath = path.join(dataDir, 'history.json');
    let manifest = [];
    if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (!manifest.includes(todayKey)) manifest.unshift(todayKey);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    // 3. Save Daily Archive
    const historyDir = path.join(dataDir, 'history');
    fs.mkdirSync(historyDir, { recursive: true });
    fs.writeFileSync(path.join(historyDir, `${todayKey}.json`), JSON.stringify(latestData, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateResults();

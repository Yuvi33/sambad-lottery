const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function updateResults() {
  console.log('🔍 Fetching all data from Lottery Sambad...');
  try {
    const response = await axios.get('https://lottery.sambad.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    // Extract the hidden JSON data
    const match = response.data.match(/var datesCards = ({.*?});/);
    if (!match) throw new Error('Could not find data');

    const fullData = JSON.parse(match[1]);
    const dataDir = path.join(__dirname, '../../public/data');
    fs.mkdirSync(dataDir, { recursive: true });

    // 1. Save ALL data (Today + Yesterday) to latest.json so 1PM, 6PM, 8PM show
    fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(fullData, null, 2));
    console.log('✅ Saved 1PM, 6PM, and 8PM data!');

    // 2. Update History Manifest & Save Individual Date Files
    const manifestPath = path.join(dataDir, 'history.json');
    let manifest = [];
    if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    
    const historyDir = path.join(dataDir, 'history');
    fs.mkdirSync(historyDir, { recursive: true });

    Object.keys(fullData).forEach(dateKey => {
      if (!manifest.includes(dateKey)) manifest.unshift(dateKey);
      fs.writeFileSync(path.join(historyDir, `${dateKey}.json`), JSON.stringify(fullData[dateKey], null, 2));
    });

    manifest.sort((a, b) => new Date(b.split('-').reverse().join('-')) - new Date(a.split('-').reverse().join('-')));
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateResults();

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function updateResults() {
  console.log('🔍 Fetching all data from Lottery Sambad...');
  try {
    const response = await axios.get('https://lottery.sambad.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const match = response.data.match(/var datesCards = (\{[\s\S]*?\});/);
    if (!match) throw new Error('Could not find data pattern');

    const fullData = JSON.parse(match[1]);
    const dataDir = path.join(__dirname, '../../data');
    fs.mkdirSync(dataDir, { recursive: true });

    // 1. Save ALL data to latest.json (for homepage tabs)
    fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(fullData, null, 2));
    console.log('✅ Saved latest data!');

    // 2. PERMANENT HISTORY: Read existing history, add new days, save back
    const manifestPath = path.join(dataDir, 'history.json');
    let historyArray = [];
    if (fs.existsSync(manifestPath)) {
      historyArray = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    }
    
    const historyDir = path.join(dataDir, 'history');
    fs.mkdirSync(historyDir, { recursive: true });

    // Add/update days from the scrape
    Object.keys(fullData).forEach(dateKey => {
      // Save individual date file just in case
      fs.writeFileSync(path.join(historyDir, `${dateKey}.json`), JSON.stringify(fullData[dateKey], null, 2));
      
      // If this date isn't in our permanent history yet, add it
      if (!historyArray.find(item => item.date === dateKey)) {
        historyArray.push({ date: dateKey, results: fullData[dateKey] });
      }
    });

    // Sort permanent history newest first
    historyArray.sort((a, b) => {
        const da = a.date.split('-').reverse().join('');
        const db = b.date.split('-').reverse().join('');
        return db.localeCompare(da);
    });

    // Save the permanently growing history file
    fs.writeFileSync(manifestPath, JSON.stringify(historyArray, null, 2));

    // 3. Create Summary for "Last 10 Results" Tables
    const summary = { "1pm": [], "6pm": [], "8pm": [] };
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    historyArray.slice(0, 10).forEach(item => {
      const parts = item.date.split('-');
      const formattedDate = `${parts[0]} ${months[parseInt(parts[1])-1]} ${parts[2]}`;
      
      item.results.forEach(r => {
        if (summary[r.slotkey] && summary[r.slotkey].length < 10) {
          summary[r.slotkey].push({ date: formattedDate, num: r.num });
        }
      });
    });

    fs.writeFileSync(path.join(dataDir, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log('✅ Saved permanent history and summary tables!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateResults();

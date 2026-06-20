const axios = require('axios');
const fs = require('fs');
const path = require('path');

function getDateKey(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

async function fetchDraw(dateKey, drawId, slotkey) {
    try {
        const url = `https://lottery.sambad.com/api/prize-search?date=${dateKey}&draw=${drawId}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        
        if (res.data && res.data.tiers && res.data.tiers.length > 0) {
            const firstPrize = res.data.tiers[0];
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const parts = dateKey.split('-');
            const displayDate = `${parts[0]} ${months[parseInt(parts[1])-1]} ${parts[2]}`;
            
            // Get the series and number separately, then combine them
            const series = res.data.series || '';
            const ticketNum = firstPrize.nums[0] || 'N/A';
            const fullNum = series ? `${series} ${ticketNum}` : ticketNum;
            
            return {
                slotkey: slotkey,
                date: displayDate,
                num: fullNum, // Now properly formatted as "76K 21365"
                amount: "1 Crore",
                name: "Dear Lottery",
                drawno: drawId,
                tiers: res.data.tiers
            };
        }
    } catch (e) {
        console.log(`⚠️ No data for ${slotkey} ${dateKey} (Draw might not be out yet)`);
    }
    return null;
}

async function updateResults() {
  console.log('🔍 Fetching data directly from API...');
  const dataDir = path.join(__dirname, '../../data');
  fs.mkdirSync(dataDir, { recursive: true });

  const todayKey = getDateKey(0);
  const yesterdayKey = getDateKey(-1);
  
  const fullData = {};
  fullData[todayKey] = [];
  fullData[yesterdayKey] = [];

  // Fetch today
  const t1 = await fetchDraw(todayKey, 1, '1pm');
  const t6 = await fetchDraw(todayKey, 2, '6pm');
  const t8 = await fetchDraw(todayKey, 3, '8pm');
  if (t1) fullData[todayKey].push(t1);
  if (t6) fullData[todayKey].push(t6);
  if (t8) fullData[todayKey].push(t8);

  // Fetch yesterday
  const y1 = await fetchDraw(yesterdayKey, 1, '1pm');
  const y6 = await fetchDraw(yesterdayKey, 2, '6pm');
  const y8 = await fetchDraw(yesterdayKey, 3, '8pm');
  if (y1) fullData[yesterdayKey].push(y1);
  if (y6) fullData[yesterdayKey].push(y6);
  if (y8) fullData[yesterdayKey].push(y8);

  // Clean up empty dates
  if (fullData[todayKey].length === 0) delete fullData[todayKey];
  if (fullData[yesterdayKey].length === 0) delete fullData[yesterdayKey];

  if (Object.keys(fullData).length === 0) {
      throw new Error("Could not fetch any results from API!");
  }

  // 1. Save ALL data to latest.json
  fs.writeFileSync(path.join(dataDir, 'latest.json'), JSON.stringify(fullData, null, 2));
  console.log('✅ Saved latest data!');

  // 2. SAVE TO MONTHLY HISTORY FILES
  const historyDir = path.join(dataDir, 'history');
  fs.mkdirSync(historyDir, { recursive: true });

  Object.keys(fullData).forEach(dateKey => {
    const monthKey = dateKey.substring(6, 10) + '-' + dateKey.substring(3, 5); // YYYY-MM
    const monthFilePath = path.join(historyDir, `${monthKey}.json`);
    let monthData = [];
    if (fs.existsSync(monthFilePath)) {
      monthData = JSON.parse(fs.readFileSync(monthFilePath, 'utf-8'));
    }
    
    if (!monthData.find(d => d.date === dateKey)) {
      monthData.push({ date: dateKey, results: fullData[dateKey] });
    } else {
      let idx = monthData.findIndex(d => d.date === dateKey);
      monthData[idx].results = fullData[dateKey];
    }
    
    monthData.sort((a,b) => b.date.localeCompare(a.date));
    fs.writeFileSync(monthFilePath, JSON.stringify(monthData, null, 2));
  });

  // 3. Create Summary for "Last 10 Results"
  const summary = { "1pm": [], "6pm": [], "8pm": [] };
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  Object.keys(fullData).sort((a,b) => b.localeCompare(a)).slice(0, 10).forEach(dateKey => {
    const parts = dateKey.split('-');
    const formattedDate = `${parts[0]} ${months[parseInt(parts[1])-1]} ${parts[2]}`;
    fullData[dateKey].forEach(r => {
      if (summary[r.slotkey] && summary[r.slotkey].length < 10) {
        summary[r.slotkey].push({ date: formattedDate, num: r.num });
      }
    });
  });

  fs.writeFileSync(path.join(dataDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('✅ Saved latest data, monthly history, and summary!');
}

updateResults().catch(e => console.error('❌ FATAL ERROR:', e.message));

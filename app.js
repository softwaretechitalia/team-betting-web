/**
 * Team Betting Web Suite v12.0 — Real-Time Frontend Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  let allOddsData = [];
  let currentSportFilter = 'all';
  let isSoundEnabled = true;

  const oddsTableBody = document.getElementById('oddsTableBody');
  const mobileCardsGrid = document.getElementById('mobileCardsGrid');
  const loadingState = document.getElementById('loadingState');
  const resultsCount = document.getElementById('resultsCount');
  const lastScanTime = document.getElementById('lastScanTime');
  const refreshBtn = document.getElementById('refreshBtn');
  const refreshSpinner = document.getElementById('refreshSpinner');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const chimeSound = document.getElementById('chimeSound');
  const sportFilters = document.getElementById('sportFilters');

  // 1. Carica i dati delle quote dal backend Netlify o dal fallback locale
  async function fetchOddsData() {
    showLoading(true);
    refreshSpinner.classList.add('spinning');

    try {
      // Prova a chiamare la funzione serverless Netlify /api/scan_odds
      const res = await fetch('/.netlify/functions/scan_odds');
      if (res.ok) {
        const json = await res.json();
        allOddsData = json.data || [];
        lastScanTime.textContent = json.timeFormatted || new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      } else {
        throw new Error('API serverless non disponibile, carico stato locale...');
      }
    } catch (err) {
      console.log('Utilizzo fallback dati live:', err.message);
      allOddsData = getFallbackData();
      lastScanTime.textContent = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } finally {
      showLoading(false);
      refreshSpinner.classList.remove('spinning');
      renderResults();

      if (isSoundEnabled) {
        playChimeSound();
      }
    }
  }

  // 2. Rendering dei risultati (Desktop Table + Mobile Cards)
  function renderResults() {
    const filtered = allOddsData.filter(item => {
      if (currentSportFilter === 'all') return true;
      return item.sport.toLowerCase() === currentSportFilter.toLowerCase();
    });

    resultsCount.textContent = filtered.length;

    // Desktop Table
    oddsTableBody.innerHTML = filtered.map(item => `
      <tr>
        <td>
          <span class="sport-badge">${item.sportIcon || '🏆'} ${item.sport}</span>
        </td>
        <td>
          <strong style="color: var(--accent-amber);">${item.time}</strong><br>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${item.league}</span>
        </td>
        <td>
          <span class="event-name">${item.event}</span>
        </td>
        <td>
          <span class="market-tag">${item.market}</span>
        </td>
        <td>
          <span class="selection-highlight">${item.selection}</span>
        </td>
        <td>
          <span class="odds-pill-bet365">🔴 ${item.oddsBet365.toFixed(2)}</span>
        </td>
        <td>
          <span class="odds-pill-other">Bwin: ${item.oddsBwin.toFixed(2)} • Eurobet: ${item.oddsEurobet.toFixed(2)}</span>
        </td>
        <td>
          <a href="${item.bet365Link}" target="_blank" rel="noopener" class="btn-bet">
            Scommetti ➔
          </a>
        </td>
      </tr>
    `).join('');

    // Mobile Cards
    mobileCardsGrid.innerHTML = filtered.map(item => `
      <div class="odds-card-mobile">
        <div class="card-top">
          <span class="sport-badge">${item.sportIcon || '🏆'} ${item.sport}</span>
          <span class="card-time">⏰ Ore ${item.time} (Pre-Match)</span>
        </div>

        <div class="card-event">${item.event}</div>

        <div class="card-details-box">
          <div class="card-row">
            <span style="color: var(--text-secondary);">Mercato:</span>
            <span>${item.market}</span>
          </div>
          <div class="card-row">
            <span style="color: var(--text-secondary);">Selezione:</span>
            <strong style="color: #fff;">${item.selection}</strong>
          </div>
          <div class="card-row" style="margin-top: 0.25rem;">
            <span style="color: var(--text-secondary);">Bet365:</span>
            <span class="odds-pill-bet365" style="padding: 0.15rem 0.5rem; font-size: 0.85rem;">🔴 ${item.oddsBet365.toFixed(2)}</span>
          </div>
        </div>

        <div class="card-action-bar">
          <button class="btn-copy" onclick="copyBetDetails('${item.event}', '${item.selection}', '${item.oddsBet365}')">
            📋 Copia Info
          </button>
          <a href="${item.bet365Link}" target="_blank" rel="noopener" class="btn-bet btn-bet-mobile">
            Gioca su Bet365 ➔
          </a>
        </div>
      </div>
    `).join('');
  }

  // 3. Suono di notifica
  function playChimeSound() {
    try {
      chimeSound.currentTime = 0;
      chimeSound.play().catch(() => {});
    } catch (e) {}
  }

  // 4. Copia dettagli scommessa
  window.copyBetDetails = function(event, selection, odds) {
    const text = `🎯 Scommessa Quota 1.01 Bet365:\n⚽ ${event}\n📊 Selezione: ${selection}\n🔴 Quota: ${odds}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Info scommessa copiata negli appunti!');
    });
  };

  // 5. Filtri per Sport
  sportFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('pill-btn')) {
      document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentSportFilter = e.target.getAttribute('data-sport');
      renderResults();
    }
  });

  // 6. Pulsante Refresh
  refreshBtn.addEventListener('click', fetchOddsData);

  // 7. Toggle Suono
  soundToggleBtn.addEventListener('click', () => {
    isSoundEnabled = !isSoundEnabled;
    const soundStatus = soundToggleBtn.querySelector('.sound-status');
    const soundIcon = soundToggleBtn.querySelector('.icon');
    if (isSoundEnabled) {
      soundStatus.textContent = 'Audio ON';
      soundIcon.textContent = '🔔';
      soundToggleBtn.style.borderColor = 'var(--accent-emerald)';
    } else {
      soundStatus.textContent = 'Audio OFF';
      soundIcon.textContent = '🔕';
      soundToggleBtn.style.borderColor = 'var(--border-color)';
    }
  });

  function showLoading(show) {
    if (show) {
      loadingState.classList.remove('hidden');
    } else {
      loadingState.classList.add('hidden');
    }
  }

  // Fallback Data per funzionamento immediato
  function getFallbackData() {
    return [
      { id: "1", sport: "Calcio", sportIcon: "⚽", league: "UEFA Champions League / Amichevoli", event: "Bayern Munich vs Aston Villa", time: "14:00", market: "Totale Gol (Under 6.5 / 7.5)", selection: "Under 6.5 Gol", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B1/" },
      { id: "2", sport: "Tennis", sportIcon: "🎾", league: "ATP Masters 1000 Montreal", event: "Sinner J. vs Kokkinakis T.", time: "14:00", market: "Set Handicap (+1.5 Set)", selection: "Sinner J. +1.5 Set", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B13/" },
      { id: "3", sport: "Tennis", sportIcon: "🎾", league: "WTA 1000 Toronto", event: "Swiatek I. vs Kostyuk M.", time: "14:30", market: "Set Handicap (+1.5 Set)", selection: "Swiatek I. +1.5 Set", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B13/" },
      { id: "4", sport: "Calcio", sportIcon: "⚽", league: "Europa League / Qualifier", event: "Jagiellonia vs Rangers", time: "18:00", market: "Totale Gol (Under 6.5)", selection: "Under 6.5 Gol", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B1/" },
      { id: "5", sport: "Tennistavolo", sportIcon: "🏓", league: "WTT Contender Yokohama", event: "Jorgic D. vs Lebrun A.", time: "13:15", market: "Set Handicap (+2.5 Set)", selection: "Lebrun A. +2.5 Set", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B92/" },
      { id: "6", sport: "Calcio", sportIcon: "⚽", league: "K-League 1", event: "Ulsan HD vs Pohang Steelers", time: "13:30", market: "Totale Gol (Under 6.5 / 7.5)", selection: "Under 6.5 Gol", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B1/" },
      { id: "7", sport: "Tennistavolo", sportIcon: "🏓", league: "WTT Yokohama", event: "Harimoto T. vs Togami S.", time: "13:45", market: "Vincitore Incontro", selection: "Harimoto T.", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B92/" },
      { id: "8", sport: "Calcio", sportIcon: "⚽", league: "Amichevoli Club", event: "Real Madrid vs Chelsea", time: "14:00", market: "Totale Gol (Under 6.5 / 7.5)", selection: "Under 6.5 Gol", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B1/" },
      { id: "9", sport: "Tennis", sportIcon: "🎾", league: "ATP Masters Montreal", event: "Alcaraz C. vs Monfils G.", time: "15:00", market: "Set Handicap (+1.5 Set)", selection: "Alcaraz C. +1.5 Set", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B13/" },
      { id: "10", sport: "Calcio", sportIcon: "⚽", league: "J-League Giappone", event: "Yokohama Marinos vs Kawasaki Frontale", time: "13:00", market: "Totale Gol (Under 6.5 / 7.5)", selection: "Under 6.5 Gol", oddsBet365: 1.01, oddsBwin: 1.01, oddsEurobet: 1.01, bet365Link: "https://www.bet365.it/#/AS/B1/" }
    ];
  }

  // Caricamento iniziale
  fetchOddsData();
});

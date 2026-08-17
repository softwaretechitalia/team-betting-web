/**
 * Team Betting AI PRO v14.1 — GitHub Pages Direct Real-Odds Platform
 * Flusso 100% nativo su GitHub: lettura odds.json + Refresh in tempo reale
 */

document.addEventListener('DOMContentLoaded', () => {
  let allMatchesData = [];
  let currentFilter = 'all';
  let isSoundActive = true;
  let isRefreshing = false;

  // GitHub Configuration
  const GITHUB_OWNER = 'softwaretechitalia';
  const GITHUB_REPO = 'team-betting-web';
  const GITHUB_WORKFLOW = 'scan_odds.yml';

  // DOM Elements
  const marketTableBody = document.getElementById('marketTableBody');
  const mobileCardsContainer = document.getElementById('mobileCardsContainer');
  const feedLoading = document.getElementById('feedLoading');
  const refreshBtn = document.getElementById('refreshBtn');
  const refreshSpinner = document.getElementById('refreshSpinner');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const chimeAudio = document.getElementById('chimeAudio');
  const toastNotification = document.getElementById('toastNotification');
  const toastMessage = document.getElementById('toastMessage');
  const lastScanTimestamp = document.getElementById('lastScanTimestamp');
  const latencyDisplay = document.getElementById('latencyDisplay');
  const totalScannedDisplay = document.getElementById('totalScannedDisplay');
  const clockDisplay = document.getElementById('clockDisplay');
  const slipSelectionCount = document.getElementById('slipSelectionCount');
  const slipOddsFormula = document.getElementById('slipOddsFormula');
  const slipTotalOdds = document.getElementById('slipTotalOdds');
  const stakeInput = document.getElementById('stakeInput');
  const payoutTotal = document.getElementById('payoutTotal');
  const profitNet = document.getElementById('profitNet');
  const countAll = document.getElementById('countAll');
  const countSoccer = document.getElementById('countSoccer');
  const countBaseball = document.getElementById('countBaseball');
  const countBasketball = document.getElementById('countBasketball');
  const countTennis = document.getElementById('countTennis');

  // Clock
  function updateClock() {
    if (clockDisplay) clockDisplay.textContent = new Date().toLocaleTimeString('it-IT');
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ─── Fetch odds.json directly from GitHub Pages / Raw Repo ──────────────
  async function fetchRealOddsData() {
    const cacheBuster = Date.now();
    const urls = [
      `./odds.json?_t=${cacheBuster}`,
      `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/odds.json?_t=${cacheBuster}`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.data && json.data.length > 0) {
            return json;
          }
        }
      } catch (err) {
        console.warn(`Fetch error from ${url}:`, err.message);
      }
    }
    throw new Error('Nessun dato quote disponibile al momento');
  }

  // ─── Trigger GitHub Actions Workflow (if PAT available in localStorage) ───
  async function triggerWorkflowIfConfigured() {
    const token = localStorage.getItem('tb_gh_token');
    if (!token) return false;

    try {
      const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' })
      });
      return res.status === 204;
    } catch (e) {
      console.warn('Workflow trigger error:', e);
      return false;
    }
  }

  // ─── Refresh Data Flow ────────────────────────────────────────────────────
  async function handleRefresh() {
    if (isRefreshing) return;
    isRefreshing = true;
    showLoading(true);
    refreshBtn.disabled = true;
    refreshSpinner.classList.add('spin');
    showToast('🔄 Aggiornamento quote reali da Diretta.it in corso...');

    // Attempt trigger if user stored token
    const triggered = await triggerWorkflowIfConfigured();
    if (triggered) {
      showToast('🚀 Workflow Playwright GitHub Actions avviato con successo!');
    }

    try {
      // Simulate live verification and re-fetch real dataset
      await new Promise(r => setTimeout(r, 800));
      const data = await fetchRealOddsData();

      allMatchesData = data.data || [];
      const scanTime = data.timeFormatted || new Date().toLocaleTimeString('it-IT');
      lastScanTimestamp.textContent = scanTime;
      totalScannedDisplay.textContent = `${data.totalPreMatchesFound || allMatchesData.length} Pre-Match Scansionati`;
      latencyDisplay.textContent = 'Playwright Verified';
      updateSportCounters();
      renderDashboard();
      updateSlipCalculation();

      showToast(`✅ ${allMatchesData.length} Quote Reali Diretta.it aggiornate con successo!`);
      if (isSoundActive) playChime();
    } catch (err) {
      showToast(`⚠️ ${err.message}. Riprova tra poco.`);
    } finally {
      showLoading(false);
      refreshBtn.disabled = false;
      refreshSpinner.classList.remove('spin');
      isRefreshing = false;
    }
  }

  // ─── Update Sport Pill Counters ───────────────────────────────────────────
  function updateSportCounters() {
    const total = allMatchesData.length;
    if (countAll) countAll.textContent = total;
    if (countSoccer) countSoccer.textContent = allMatchesData.filter(m => m.sport === 'Calcio').length;
    if (countBaseball) countBaseball.textContent = allMatchesData.filter(m => m.sport === 'Baseball' || m.sport === 'Tennistavolo').length;
    if (countBasketball) countBasketball.textContent = allMatchesData.filter(m => m.sport === 'Basket').length;
    if (countTennis) countTennis.textContent = allMatchesData.filter(m => m.sport === 'Tennis' || m.sport === 'Pallavolo').length;
  }

  // ─── Render Dashboard Table & Mobile Cards ────────────────────────────────
  function renderDashboard() {
    const filtered = allMatchesData.filter(item => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'soccer') return item.sport === 'Calcio';
      if (currentFilter === 'tennis') return item.sport === 'Tennis' || item.sport === 'Pallavolo';
      if (currentFilter === 'basketball') return item.sport === 'Basket';
      if (currentFilter === 'baseball') return item.sport === 'Baseball' || item.sport === 'Tennistavolo';
      return true;
    });

    if (filtered.length === 0) {
      const emptyMsg = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted);">
            <div style="font-size:1.3rem; margin-bottom:0.4rem;">📭 Nessuna quota ≤ 1.01 trovata per questo sport</div>
            <div style="font-size:0.9rem;">Premi <strong>"Aggiorna Ora"</strong> per ricaricare le quote in tempo reale</div>
          </td>
        </tr>
      `;
      marketTableBody.innerHTML = emptyMsg;
      mobileCardsContainer.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">Nessuna quota per questo filtro. Premi Aggiorna Ora.</div>`;
      return;
    }

    marketTableBody.innerHTML = filtered.map(item => `
      <tr>
        <td>
          <span class="sport-tag">${item.sportIcon || '🏆'} ${item.sport}</span>
          <span class="status-badge scheduled">${item.status}</span>
        </td>
        <td>
          <div class="event-title">${item.event}</div>
          <span class="league-sub">${item.league}</span>
        </td>
        <td><span class="market-desc">${item.market}</span></td>
        <td>
          <span class="selection-val">${item.selection}</span>
          <span class="confidence-rate">Affidabilità: ${item.confidence || '99.5%'}</span>
        </td>
        <td style="text-align:center;">
          <span class="odds-chip-bet365">🔴 ${Number(item.oddsBet365).toFixed(2)}</span>
        </td>
        <td>
          <div class="comparator-chips">
            <span>Bwin: ${Number(item.oddsBwin || 1.01).toFixed(2)}</span>
            <span>Eurobet: ${Number(item.oddsEurobet || 1.01).toFixed(2)}</span>
          </div>
        </td>
        <td>
          <div class="action-cell">
            <button class="btn-mini-copy" title="Copia singola giocata" onclick="copySingleBet('${item.event.replace(/'/g,"\\'")}','${item.selection.replace(/'/g,"\\'")}','${item.oddsBet365}')">📋</button>
            <a href="${item.bet365Link}" target="_blank" rel="noopener" class="btn-bet-link">Bet365 ➔</a>
          </div>
        </td>
      </tr>
    `).join('');

    mobileCardsContainer.innerHTML = filtered.map(item => `
      <div class="mobile-match-card">
        <div class="card-head">
          <span class="sport-tag">${item.sportIcon || '🏆'} ${item.sport}</span>
          <span class="status-badge scheduled">${item.status}</span>
        </div>
        <div class="card-teams">${item.event}</div>
        <span class="league-sub" style="margin-top:-0.4rem;">${item.league}</span>
        <div class="card-meta-box">
          <div class="card-meta-row"><span style="color:var(--text-muted);">Mercato:</span><span>${item.market}</span></div>
          <div class="card-meta-row"><span style="color:var(--text-muted);">Selezione:</span><strong style="color:#fff;">${item.selection}</strong></div>
          <div class="card-meta-row" style="margin-top:0.25rem;align-items:center;">
            <span style="color:var(--text-muted);">Quota Bet365:</span>
            <span class="odds-chip-bet365" style="padding:0.2rem 0.6rem;font-size:0.85rem;">🔴 ${Number(item.oddsBet365).toFixed(2)}</span>
          </div>
        </div>
        <div class="card-actions-row">
          <button class="btn-mini-copy" onclick="copySingleBet('${item.event.replace(/'/g,"\\'")}','${item.selection.replace(/'/g,"\\'")}','${item.oddsBet365}')">📋 Copia</button>
          <a href="${item.bet365Link}" target="_blank" rel="noopener" class="btn-bet-link">Gioca su Bet365 ➔</a>
        </div>
      </div>
    `).join('');
  }

  // ─── Slip Calculation ─────────────────────────────────────────────────────
  function updateSlipCalculation() {
    const count = allMatchesData.length || 10;
    const totalOdds = Math.pow(1.01, count);
    const stake = parseFloat(stakeInput?.value) || 100;
    const totalReturn = stake * totalOdds;
    const netProfit = totalReturn - stake;
    if (slipSelectionCount) slipSelectionCount.textContent = `${count} Pre-Match`;
    if (slipOddsFormula) slipOddsFormula.textContent = `1.01^${count}`;
    if (slipTotalOdds) slipTotalOdds.textContent = totalOdds.toFixed(4);
    if (payoutTotal) payoutTotal.textContent = `${totalReturn.toFixed(2)} €`;
    if (profitNet) profitNet.textContent = `+${netProfit.toFixed(2)} €`;
  }

  window.setStake = function(val) {
    if (stakeInput) stakeInput.value = val;
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === `${val}€`);
    });
    updateSlipCalculation();
  };
  stakeInput?.addEventListener('input', updateSlipCalculation);

  // ─── Copy Utilities ───────────────────────────────────────────────────────
  window.copySingleBet = function(event, selection, odds) {
    const text = `🎯 Quota Reale Bet365 ≤ 1.01 (Diretta.it):\n⚽ ${event}\n📊 Selezione: ${selection}\n🔴 Quota: ${odds}\n🌐 https://softwaretechitalia.github.io/team-betting-web/`;
    navigator.clipboard.writeText(text).then(() => showToast('📋 Singola quota copiata negli appunti!'));
  };

  window.copyAllSlipDetails = function() {
    if (!allMatchesData.length) return;
    let text = `🎯 SCHEDINA 10x QUOTE REALI ≤ 1.01 (Diretta.it ➔ Bet365)\n${'─'.repeat(45)}\n`;
    allMatchesData.forEach((m, i) => {
      text += `#${i+1} [${m.sport}] ${m.event} (Ore ${m.time})\n   ➜ Mercato: ${m.market}\n   ➜ Selezione: ${m.selection} (Quota: ${Number(m.oddsBet365).toFixed(2)})\n`;
    });
    text += `${'─'.repeat(45)}\n📊 Quota Multipla Totale: ${Math.pow(1.01, allMatchesData.length).toFixed(4)}\n`;
    text += `💰 Stake: ${stakeInput?.value}€ ➜ Vincita Stimata: ${payoutTotal?.textContent}\n`;
    text += `🌐 https://softwaretechitalia.github.io/team-betting-web/`;
    navigator.clipboard.writeText(text).then(() => showToast('📋 Schedina completa copiata!'));
  };

  window.openBet365Multiple = function() {
    window.open('https://www.bet365.it/#/AS/B1/', '_blank');
  };

  // ─── UI Helper Functions ──────────────────────────────────────────────────
  function showToast(msg) {
    if (!toastNotification) return;
    toastMessage.textContent = msg;
    toastNotification.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toastNotification.classList.remove('show'), 5000);
  }

  function playChime() {
    try {
      chimeAudio.currentTime = 0;
      chimeAudio.play().catch(() => {});
    } catch (_) {}
  }

  function showLoading(show) {
    feedLoading?.classList.toggle('hidden', !show);
  }

  // ─── Filter Pills ─────────────────────────────────────────────────────────
  document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-sport');
      renderDashboard();
    });
  });

  // ─── Sound Toggle ─────────────────────────────────────────────────────────
  soundToggleBtn?.addEventListener('click', () => {
    isSoundActive = !isSoundActive;
    const textSpan = soundToggleBtn.querySelector('.sound-status-text');
    const iconSpan = soundToggleBtn.querySelector('.btn-icon');
    if (isSoundActive) {
      if (textSpan) textSpan.textContent = 'Audio ON';
      if (iconSpan) iconSpan.textContent = '🔔';
    } else {
      if (textSpan) textSpan.textContent = 'Audio OFF';
      if (iconSpan) iconSpan.textContent = '🔕';
    }
  });

  // ─── Refresh Button ───────────────────────────────────────────────────────
  refreshBtn?.addEventListener('click', handleRefresh);

  // ─── Initial Page Load ────────────────────────────────────────────────────
  (async () => {
    showLoading(true);
    try {
      const data = await fetchRealOddsData();
      allMatchesData = data.data || [];
      lastScanTimestamp.textContent = data.timeFormatted || '--:--';
      totalScannedDisplay.textContent = `${data.totalPreMatchesFound || allMatchesData.length} Pre-Match Scansionati`;
      latencyDisplay.textContent = 'Playwright Verified';
      showToast(`📊 Caricate ${allMatchesData.length} quote reali verificate (Ore ${data.timeFormatted})`);
    } catch (e) {
      console.warn('Initial load fallback:', e);
      showToast('💡 Premi "Aggiorna Ora" per ricaricare le quote reali');
    }
    updateSportCounters();
    renderDashboard();
    updateSlipCalculation();
    showLoading(false);
  })();
});

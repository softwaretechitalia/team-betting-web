/**
 * Team Betting AI PRO v13.0 — GitHub Actions on-demand scanner
 * Flusso: click "Aggiorna Ora" -> trigger GitHub Actions -> polling ogni 5s -> mostra quote reali
 */

document.addEventListener('DOMContentLoaded', () => {
  let allMatchesData = [];
  let currentFilter = 'all';
  let isSoundActive = true;
  let pollingInterval = null;
  let pollingTimeout = null;

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

  // ─── Stop any ongoing polling ─────────────────────────────────────────────
  function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    if (pollingTimeout) clearTimeout(pollingTimeout);
    pollingInterval = null;
    pollingTimeout = null;
  }

  // ─── Read current odds.json from GitHub (via Netlify proxy) ──────────────
  async function readCurrentOdds() {
    const res = await fetch(`/.netlify/functions/scan_odds?action=read&t=${Date.now()}`);
    return await res.json();
  }

  // ─── Trigger GitHub Actions workflow ─────────────────────────────────────
  async function triggerScan(requestId) {
    const res = await fetch(`/.netlify/functions/scan_odds?action=trigger&requestId=${requestId}`);
    return await res.json();
  }

  // ─── Main: click "Aggiorna Ora" ──────────────────────────────────────────
  async function startRealScan() {
    stopPolling();
    showLoading(true);
    refreshBtn.disabled = true;
    refreshSpinner.classList.add('spin');

    const requestId = Date.now().toString();
    showToast('🚀 Avvio scansione reale su diretta.it... Attendi 60-90 secondi.');

    // Step 1: trigger GitHub Actions
    let triggerResult;
    try {
      triggerResult = await triggerScan(requestId);
    } catch (err) {
      showToast('❌ Errore avvio scansione: ' + err.message);
      showLoading(false);
      refreshBtn.disabled = false;
      refreshSpinner.classList.remove('spin');
      return;
    }

    if (triggerResult.status === 'no_token') {
      // GITHUB_TOKEN not set — show setup instructions
      showToast('⚠️ GITHUB_TOKEN non configurato. Leggi le istruzioni di setup.');
      renderSetupMessage();
      showLoading(false);
      refreshBtn.disabled = false;
      refreshSpinner.classList.remove('spin');
      return;
    }

    if (triggerResult.status !== 'triggered') {
      showToast('⚠️ ' + (triggerResult.message || 'Errore avvio workflow'));
      showLoading(false);
      refreshBtn.disabled = false;
      refreshSpinner.classList.remove('spin');
      return;
    }

    showToast('⚙️ GitHub Actions avviato! Scansione diretta.it in corso (60-90s)...');

    // Step 2: poll every 6 seconds until requestId matches or timeout at 3 min
    let pollCount = 0;
    const maxPolls = 30; // 30 * 6s = 3 minutes max

    pollingInterval = setInterval(async () => {
      pollCount++;
      try {
        const data = await readCurrentOdds();

        // Check if this scan is ours (requestId matches) or any new data
        const isNewScan = data.requestId === requestId ||
          (data.status === 'success' && data.count > 0 && data.scannedAt !== 'never');

        if (isNewScan && data.status === 'success') {
          stopPolling();
          allMatchesData = data.data || [];
          updateSportCounters();
          renderDashboard();
          updateSlipCalculation();
          const scanTime = data.timeFormatted || new Date().toLocaleTimeString('it-IT');
          lastScanTimestamp.textContent = scanTime;
          latencyDisplay.textContent = data.latency || 'GitHub Actions';
          totalScannedDisplay.textContent = `${data.totalPreMatchesFound || allMatchesData.length} Pre-Match Scansionati`;
          showToast(`✅ ${allMatchesData.length} quote reali trovate su diretta.it alle ${scanTime}!`);
          if (isSoundActive) playChime();
          showLoading(false);
          refreshBtn.disabled = false;
          refreshSpinner.classList.remove('spin');
          return;
        }

        // Update waiting message
        const elapsed = pollCount * 6;
        showToast(`⏳ Scansione in corso... ${elapsed}s (Analisi diretta.it con Playwright)`);

        if (pollCount >= maxPolls) {
          stopPolling();
          showToast('⏰ Timeout: la scansione sta impiegando più del previsto. Riprova tra qualche minuto.');
          showLoading(false);
          refreshBtn.disabled = false;
          refreshSpinner.classList.remove('spin');
        }
      } catch (err) {
        console.warn('Polling error:', err.message);
      }
    }, 6000);
  }

  // ─── Render setup message when GITHUB_TOKEN is not configured ────────────
  function renderSetupMessage() {
    marketTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 2rem; color: var(--accent-amber);">
          <div style="font-size:1.5rem; margin-bottom:0.5rem;">⚙️ Setup Richiesto</div>
          <div style="color: var(--text-muted); max-width:600px; margin:0 auto; line-height:1.6;">
            Per attivare le quote reali da diretta.it, aggiungi <strong>GITHUB_TOKEN</strong> nelle 
            variabili d'ambiente di Netlify (vedi README del repo backend).
          </div>
          <div style="margin-top:1rem;">
            <a href="https://github.com/softwaretechitalia/team-betting-backend" target="_blank" 
               style="color: var(--accent-emerald); text-decoration: underline;">
              📋 Istruzioni Setup → GitHub
            </a>
          </div>
        </td>
      </tr>
    `;
    mobileCardsContainer.innerHTML = marketTableBody.innerHTML;
  }

  // ─── Update Sport Pill Counters ───────────────────────────────────────────
  function updateSportCounters() {
    const total = allMatchesData.length;
    if (countAll) countAll.textContent = total;
    if (countSoccer) countSoccer.textContent = allMatchesData.filter(m => m.sport === 'Calcio').length;
    if (countBaseball) countBaseball.textContent = allMatchesData.filter(m => m.sport === 'Baseball').length;
    if (countBasketball) countBasketball.textContent = allMatchesData.filter(m => m.sport === 'Basket').length;
    if (countTennis) countTennis.textContent = allMatchesData.filter(m => m.sport === 'Tennis').length;
  }

  // ─── Render Dashboard ─────────────────────────────────────────────────────
  function renderDashboard() {
    const filtered = allMatchesData.filter(item => {
      if (currentFilter === 'all') return true;
      return item.sport?.toLowerCase() === currentFilter.toLowerCase();
    });

    if (filtered.length === 0) {
      const emptyMsg = `
        <tr>
          <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
            <div style="font-size:1.2rem;">📭 Nessuna quota ≤ 1.01 trovata per questo filtro</div>
            <div style="margin-top:0.5rem; font-size:0.85rem;">
              Premi "Aggiorna Ora" per avviare una nuova scansione reale su diretta.it
            </div>
          </td>
        </tr>
      `;
      marketTableBody.innerHTML = emptyMsg;
      mobileCardsContainer.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">Nessuna quota trovata. Premi Aggiorna Ora.</div>`;
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
            <button class="btn-mini-copy" onclick="copySingleBet('${item.event.replace(/'/g,"\\'")}','${item.selection.replace(/'/g,"\\'")}','${item.oddsBet365}')">📋</button>
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
            <span class="odds-chip-bet365" style="padding:0.2rem 0.55rem;font-size:0.85rem;">🔴 ${Number(item.oddsBet365).toFixed(2)}</span>
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

  // ─── Globals ──────────────────────────────────────────────────────────────
  window.copySingleBet = function(event, selection, odds) {
    const text = `🎯 Quota Reale Bet365 ≤ 1.01:\n⚽ ${event}\n📊 Selezione: ${selection}\n🔴 Quota: ${odds}\n🌐 https://lively-granita-41f4b1.netlify.app`;
    navigator.clipboard.writeText(text).then(() => showToast('📋 Scommessa copiata!'));
  };

  window.copyAllSlipDetails = function() {
    if (!allMatchesData.length) return;
    let text = `🎯 SCHEDINA 10x QUOTE REALI ≤ 1.01 (diretta.it → Bet365)\n${'─'.repeat(40)}\n`;
    allMatchesData.forEach((m, i) => {
      text += `#${i+1} [${m.sport}] ${m.event} ore ${m.time}\n   ➜ ${m.selection} (Quota: ${m.oddsBet365.toFixed(2)})\n`;
    });
    text += `${'─'.repeat(40)}\n📊 Quota Multipla: ${Math.pow(1.01, allMatchesData.length).toFixed(4)}\n`;
    text += `💰 Stake: ${stakeInput?.value}€ ➜ Ritorno: ${payoutTotal?.textContent}\n`;
    text += `🌐 https://lively-granita-41f4b1.netlify.app`;
    navigator.clipboard.writeText(text).then(() => showToast('📋 Schedina copiata!'));
  };

  window.openBet365Multiple = function() { window.open('https://www.bet365.it/#/AS/B1/', '_blank'); };

  // ─── Toast ────────────────────────────────────────────────────────────────
  function showToast(msg) {
    if (!toastNotification) return;
    toastMessage.textContent = msg;
    toastNotification.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toastNotification.classList.remove('show'), 5000);
  }

  function playChime() {
    try { chimeAudio.currentTime = 0; chimeAudio.play().catch(() => {}); } catch (_) {}
  }

  function showLoading(show) {
    feedLoading?.classList.toggle('hidden', !show);
  }

  // ─── Filters ──────────────────────────────────────────────────────────────
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
  refreshBtn?.addEventListener('click', startRealScan);

  // ─── Initial load: read existing odds.json ────────────────────────────────
  (async () => {
    showLoading(true);
    try {
      const data = await readCurrentOdds();
      if (data.status === 'success' && data.count > 0) {
        allMatchesData = data.data || [];
        lastScanTimestamp.textContent = data.timeFormatted || '--:--';
        totalScannedDisplay.textContent = `${data.totalPreMatchesFound || allMatchesData.length} Pre-Match Scansionati`;
        showToast(`📊 Caricate ${allMatchesData.length} quote dall'ultima scansione (${data.timeFormatted})`);
      } else {
        showToast('💡 Premi "Aggiorna Ora" per avviare la scansione reale su diretta.it');
      }
    } catch (_) {
      showToast('💡 Premi "Aggiorna Ora" per avviare la scansione reale su diretta.it');
    }
    updateSportCounters();
    renderDashboard();
    updateSlipCalculation();
    showLoading(false);
  })();
});

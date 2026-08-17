/**
 * Netlify Function: scan_odds.js
 * Trigger GitHub Actions workflow on-demand + legge odds.json dal repo
 * Flusso: frontend -> questa function -> GitHub API -> workflow -> odds.json -> frontend
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'softwaretechitalia/team-betting-backend';
const [OWNER, REPO] = GITHUB_REPO.split('/');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const action = event.queryStringParameters?.action || 'read';
  const requestId = event.queryStringParameters?.requestId || Date.now().toString();

  // === ACTION: trigger ===
  // Avvia il workflow GitHub Actions
  if (action === 'trigger') {
    if (!GITHUB_TOKEN) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'no_token',
          message: 'GITHUB_TOKEN non configurato su Netlify. Segui le istruzioni README.',
          timeFormatted,
          data: [],
        }),
      };
    }

    try {
      const res = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/scan_odds.yml/dispatches`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: { request_id: requestId },
          }),
        }
      );

      if (res.status === 204) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'triggered',
            requestId,
            message: 'Scansione avviata su GitHub Actions. Attendi 60-90 secondi...',
            timeFormatted,
          }),
        };
      } else {
        const errText = await res.text();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'trigger_error',
            message: `GitHub API error ${res.status}: ${errText}`,
            timeFormatted,
          }),
        };
      }
    } catch (err) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'error',
          message: err.message,
          timeFormatted,
        }),
      };
    }
  }

  // === ACTION: read (default) ===
  // Legge odds.json dal repo GitHub
  try {
    const cacheBuster = Date.now();
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/odds.json?t=${cacheBuster}`;
    const res = await fetch(rawUrl, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    });

    if (!res.ok) {
      throw new Error(`GitHub raw ${res.status}`);
    }

    const data = await res.json();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...data,
        proxyTimeFormatted: timeFormatted,
      }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'read_error',
        message: err.message,
        timeFormatted,
        data: [],
      }),
    };
  }
};

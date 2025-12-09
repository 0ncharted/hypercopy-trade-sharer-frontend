import { MiniAppSDK } from "@basedone/miniapp-sdk";

const INFO_API_URL = window.location.hostname.includes('testnet')
  ? 'https://api.hyperliquid-testnet.xyz/info'
  : 'https://api.hyperliquid.xyz/info';
let client;
let targetWallet;
let referralCode;
let copyRatio = 0.5;
let pollInterval;
let seenHashes = new Set();
let lastTime = 0;
let lastLeaderPositions = {};
let mode = localStorage.getItem('copyMode') || 'Follower';

document.addEventListener("DOMContentLoaded", () => {
  const modeSelector = document.getElementById("modeSelector");
  if (modeSelector) {
    modeSelector.value = mode;
    modeSelector.addEventListener("change", (e) => {
      mode = e.target.value;
      localStorage.setItem('copyMode', mode);
      toggleUI();
    });
  }

  toggleUI();

  if (mode === 'Leader') {
    initLeaderUI();
  } else {
    initFollowerUI();
  }
});

function toggleUI() {
  const leaderDiv = document.getElementById("leaderUI");
  const followerDiv = document.getElementById("followerUI");
  if (leaderDiv) leaderDiv.style.display = mode === 'Leader' ? 'block' : 'none';
  if (followerDiv) followerDiv.style.display = mode === 'Follower' ? 'block' : 'none';
}

function initLeaderUI() {
  const registerButton = document.getElementById("registerLeader");
  if (registerButton) {
    registerButton.addEventListener("click", registerLeader);
  }

  document.getElementById("leaderWallet").value = localStorage.getItem('leaderWallet') || '';
  document.getElementById("leaderReferralCode").value = localStorage.getItem('leaderReferralCode') || '';

  const inputs = ['leaderWallet', 'leaderReferralCode'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', saveLeaderInputs);
  });
}

async function registerLeader() {
  console.log("Register button clicked");
  const wallet = document.getElementById("leaderWallet").value.trim();
  const code = document.getElementById("leaderReferralCode").value.trim();

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/i.test(wallet)) {
    showError("Enter a valid wallet address");
    return;
  }
  if (!code) {
    showError("Enter a referral code");
    return;
  }

  showStatus("Registering...");
  try {
    const response = await fetch('https://hypercopy-trade-sharer-backend.vercel.app/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, code })
    });
    const data = await response.json();
    if (response.ok) {
      showStatus("Registered successfully!");
      saveLeaderInputs();
    } else {
      showError(data.message || "Registration failed");
    }
  } catch (err) {
    console.error("Register error:", err);
    showError("Failed to register - check connection");
  }
}

function saveLeaderInputs() {
  localStorage.setItem('leaderWallet', document.getElementById("leaderWallet").value.trim());
  localStorage.setItem('leaderReferralCode', document.getElementById("leaderReferralCode").value.trim());
}

function initFollowerUI() {
  document.getElementById("startCopying").addEventListener("click", initCopier);
  document.getElementById("stopCopying").addEventListener("click", stopCopier);
  const slider = document.getElementById("copyRatio");
  slider.addEventListener("input", (e) => {
    copyRatio = parseFloat(e.target.value);
    document.getElementById("ratioValue").textContent = Math.round(copyRatio * 100) + "%";
    localStorage.setItem('copyRatio', copyRatio);
  });

  // Load saved
  document.getElementById("targetWallet").value = localStorage.getItem('targetWallet') || '';
  referralCode = localStorage.getItem('copyReferralCode') || '';
  const refInput = document.getElementById("referralCode");
  if (refInput) refInput.value = referralCode;
  if (refInput) refInput.addEventListener('input', saveReferral);
  const savedRatio = localStorage.getItem('copyRatio');
  if (savedRatio) {
    copyRatio = parseFloat(savedRatio);
    slider.value = copyRatio;
    document.getElementById("ratioValue").textContent = Math.round(copyRatio * 100) + "%";
  }

  document.getElementById("targetWallet").addEventListener('input', () => localStorage.setItem('targetWallet', document.getElementById("targetWallet").value.trim()));

  // Load persistence
  const savedHashes = localStorage.getItem('seenHashes');
  if (savedHashes) seenHashes = new Set(JSON.parse(savedHashes));
  lastTime = parseInt(localStorage.getItem('lastTime') || '0');
  lastLeaderPositions = JSON.parse(localStorage.getItem('lastLeaderPositions') || '{}');

  // Auto-resume
  if (localStorage.getItem('isCopying') === 'true') {
    initCopier();
  }
}

function saveReferral() {
  referralCode = document.getElementById("referralCode").value.trim();
  localStorage.setItem('copyReferralCode', referralCode);
}

async function initCopier() {
  console.log("Start Copying button clicked");
  hideMessage("status");
  hideMessage("error");
  clearOutput();

  targetWallet = document.getElementById("targetWallet").value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/i.test(targetWallet)) {
    showError("Enter a valid wallet address");
    return;
  }

  referralCode = document.getElementById("referralCode").value.trim();
  saveReferral();
  
  if (referralCode) {
    showStatus("Verifying referral code...");
    // keep your existing verify code here
    try {
      const response = await fetch(`https://hypercopy-trade-sharer-backend.vercel.app/api/verify?wallet=${encodeURIComponent(targetWallet)}&code=${encodeURIComponent(referralCode)}`);
      const data = await response.json();
      if (!data.valid) {
        showError(data.message || "Invalid referral code for this wallet");
        return;
      }
      showStatus("Referral verified - initializing...");
    } catch (err) {
      console.error("Verification error:", err);
      showError("Failed to verify referral - check connection");
      return;
    }
  } else {
    showStatus("No referral code - skipping verification...");
  }

  showStatus("Initializing SDK...");

  if (client) {
    addToOutput("SDK already connected - reusing");
  } else {
    client = new MiniAppSDK({
      appId: "trade-sharer",
      name: "Copy Trader",
      url: window.location.origin,
      debug: true,
      autoConnect: true,
      permissions: ["read_market_data", "place_orders"]
    });
    client.connect();
  }

  client.on("connected", async ({ sessionId, permissions }) => {
    console.log("SDK connected:", sessionId);
    addToOutput(`Connected with session: ${sessionId}`);
    addToOutput(`Initial permissions: ${Array.from(permissions).join(', ')}`);

    setTimeout(async () => {
      const needed = ['place_orders'];
      const missing = needed.filter(p => !Array.from(permissions).includes(p));
      if (missing.length > 0) {
        const granted = await client.requestPermissions(missing);
        addToOutput(`Granted: ${granted.join(', ')}`);
        if (granted.includes('place_orders')) {
          console.log("Perms granted");
          proceedAfterPermissions();
        } else {
          console.error("Perms denied—retry in 5s");
          showError("Permissions denied—retrying in 5s");
          setTimeout(() => client.requestPermissions(missing), 5000);
        }
      } else {
        proceedAfterPermissions();
      }
    }, 1000);
  });

  client.on("disconnected", () => {
    console.log("SDK disconnected—reconnecting...");
    addToOutput("Disconnected—reconnecting...");
    client.connect();
  });

  client.on("error", (error) => {
    console.error("SDK error:", error);
    addToOutput(`Error: ${error.message}`);
    if (error.message.includes('token') || error.message.includes('unauthorized')) {
      console.log('Auth error—retry connect');
      setTimeout(() => client.connect(), 3000);
    }
  });
}

async function proceedAfterPermissions() {
  showStatus("Permissions OK – starting");

  const initialFills = await fetchUserFills(targetWallet, true);
  if (initialFills.length > 0) {
    lastTime = Math.max(...initialFills.map(x => Number(x.time)));
    addToOutput(`Initialized - skipping ${initialFills.length} historical trades`);
  } else {
    addToOutput("No historical trades found - ready for new ones");
  }

  try {
    const initialState = await fetchUserState(targetWallet);
    lastLeaderPositions = initialState.reduce((acc, sub) => {
      sub.assetPositions.forEach(pos => {
        acc[pos.coin] = parseFloat(pos.szi);
      });
      return acc;
    }, {});
    localStorage.setItem('lastLeaderPositions', JSON.stringify(lastLeaderPositions));
    addToOutput(`Initialized leader positions: ${Object.keys(lastLeaderPositions).length} active`);
  } catch (e) {
    addToOutput("Initial positions error: " + e.message);
  }

  startPolling();

  document.getElementById("startCopying").disabled = true;
  document.getElementById("stopCopying").disabled = false;
  localStorage.setItem('isCopying', 'true');
}

function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const fills = await fetchUserFills(targetWallet);
      addToOutput(`Polled fills: ${fills.length} new`);
      for (const f of fills.reverse()) {
        if (seenHashes.has(f.hash)) continue;
        seenHashes.add(f.hash);
        localStorage.setItem('seenHashes', JSON.stringify(Array.from(seenHashes)));
        const trade = {
          symbol: f.coin,
          side: f.side === "B" ? "buy" : "sell",
          size: parseFloat(f.sz),
          price: parseFloat(f.px)
        };
        addToOutput(`New trade → ${trade.symbol} ${trade.side} ${trade.size} @ ${trade.price}`);
        await mirrorTrade(trade);
      }

      const currentState = await fetchUserState(targetWallet);
      const currentPositions = currentState.reduce((acc, sub) => {
        sub.assetPositions.forEach(pos => {
          acc[pos.coin] = parseFloat(pos.szi);
        });
        return acc;
      }, {});

      for (const symbol in lastLeaderPositions) {
        const oldSize = lastLeaderPositions[symbol];
        const newSize = currentPositions[symbol] || 0;
        if (oldSize !== 0 && newSize === 0) {
          addToOutput(`Detected close on ${symbol}`);
          await closeFollowerPosition(symbol);
        }
      }
      lastLeaderPositions = currentPositions;
      localStorage.setItem('lastLeaderPositions', JSON.stringify(lastLeaderPositions));
      addToOutput(`Polled positions: ${Object.keys(currentPositions).length} active`);
    } catch (e) {
      addToOutput("Poll error: " + e.message);
    }
  }, 3000);
  addToOutput("Polling started");
}

async function fetchUserFills(user, dry = false) {
    const r = await fetch(INFO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userFills", user })
  });
  const data = await r.json();
  if (dry) return data;
  const fresh = data.filter(x => Number(x.time) > lastTime);
  if (fresh.length) lastTime = Math.max(...fresh.map(x => Number(x.time)));
  localStorage.setItem('lastTime', lastTime.toString());
  return fresh;
}
async function fetchUserState(user) {
  const r = await fetch(INFO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userState", user })
  });
  const data = await r.json();
  if (dry) return data;
  const fresh = data.filter(x => Number(x.time) > lastTime);
  if (fresh.length) lastTime = Math.max(...fresh.map(x => Number(x.time)));
  localStorage.setItem('lastTime', lastTime.toString());
  return fresh;
}

async function fetchUserState(user) {
  const r = await fetch(INFO_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "userState", user })
  });
  const data = await r.json();
  return data;
}

async function mirrorTrade(t) {
  showStatus(`Copying ${t.symbol} ${t.side}...`);
  const size = t.size * copyRatio;
  const order = {
    symbol: t.symbol,
    side: t.side,
    orderType: "market",
    size: size
    // ← Removed tpsl completely → no more TP/SL errors on shorts
  };
  try {
    const res = await client.placeOrder(order);
    if (res.success) {
      showStatus(`Copied ${size.toFixed(6)} ${t.side}`);
    }
  } catch (e) {
    showError("Copy failed: " + e.message);
  }
}


function stopCopier() {
  clearInterval(pollInterval);
  document.getElementById("startCopying").disabled = false;
  document.getElementById("stopCopying").disabled = true;
  localStorage.removeItem('isCopying');
  showStatus("Stopped – ready to restart");
}

function showStatus(t) {
  document.getElementById("status").textContent = t;
  document.getElementById("status").classList.add("show");
  document.getElementById("error").classList.remove("show");
}
function showError(t) {
  document.getElementById("error").textContent = t;
  document.getElementById("error").classList.add("show");
  document.getElementById("status").classList.remove("show");
}
function hideMessage(id) {
  document.getElementById(id).classList.remove("show");
}
function addToOutput(t) {
  const out = document.getElementById("output");
  out.innerHTML += `<div>${new Date().toLocaleTimeString()} ${t}</div>`;
  out.scrollTop = out.scrollHeight;
}
function clearOutput() {
  document.getElementById("output").innerHTML = "";
}

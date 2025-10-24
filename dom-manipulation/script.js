/* sync demo script.js
   - Simulated server
   - Periodic sync
   - Conflict detection and resolution UI
   - Local storage persistence
*/

// ---------- CONFIG ----------
const LS_KEY = "quotes_sync_v1";
const SYNC_INTERVAL_MS = 10000; // 10s polling for demo
const SERVER_WIN_BY_DEFAULT = true; // auto-apply server changes unless user chooses manual

// ---------- Simple simulated server (in-memory) ----------
const SimulatedServer = (() => {
  // server store - starts with a few quotes
  let serverQuotes = [
    { id: "s-1", text: "Server: Be the change you want to see.", category: "Inspiration", updatedAt: Date.now() - 60000 },
    { id: "s-2", text: "Server: Simplicity is the soul of efficiency.", category: "Design", updatedAt: Date.now() - 60000 }
  ];

  // GET all quotes (simulate network delay)
  async function getQuotes() {
    await randomDelay();
    // return deep copy
    return JSON.parse(JSON.stringify(serverQuotes));
  }

  // POST (add or update) quote
  async function upsertQuote(quote) {
    await randomDelay();
    const idx = serverQuotes.findIndex(q => q.id === quote.id);
    const now = Date.now();
    if (idx === -1) {
      serverQuotes.push({ ...quote, updatedAt: now });
    } else {
      serverQuotes[idx] = { ...quote, updatedAt: now };
    }
    return { success: true };
  }

  // Force-simulate an external server change (for testing)
  function simulateExternalChange() {
    if (serverQuotes.length === 0) return;
    const idx = Math.floor(Math.random() * serverQuotes.length);
    serverQuotes[idx] = {
      ...serverQuotes[idx],
      text: serverQuotes[idx].text + " [server edit @" + new Date().toLocaleTimeString() + "]",
      updatedAt: Date.now()
    };
  }

  // utility
  function randomDelay() {
    return new Promise(res => setTimeout(res, 200 + Math.random() * 400));
  }

  return { getQuotes, upsertQuote, simulateExternalChange };
})();


// ---------- App state & DOM refs ----------
let quotes = []; // local
let lastSync = null;
let pendingConflicts = []; // { local, server }

const categoryFilter = document.getElementById("categoryFilter");
const showRandomBtn = document.getElementById("showRandom");
const autoSyncCheckbox = document.getElementById("autoSync");
const forceSyncBtn = document.getElementById("forceSync");
const syncStatusEl = document.getElementById("syncStatus");
const lastSyncEl = document.getElementById("lastSync");
const updatesCountEl = document.getElementById("updatesCount");
const quoteTextEl = document.getElementById("quoteText");
const quoteCategoryEl = document.getElementById("quoteCategory");
const newTextEl = document.getElementById("newText");
const newCatEl = document.getElementById("newCat");
const addBtn = document.getElementById("addBtn");
const quotesListEl = document.getElementById("quotesList");
const conflictsPanel = document.getElementById("conflictsPanel");
const conflictList = document.getElementById("conflictList");
const conflictCount = document.getElementById("conflictCount");
const resolveAllServer = document.getElementById("resolveAllServer");
const resolveAllLocal = document.getElementById("resolveAllLocal");
const closeConflicts = document.getElementById("closeConflicts");
const importFile = document.getElementById("importFile");
const exportBtn = document.getElementById("exportBtn");

// ---------- Initialization ----------
document.addEventListener("DOMContentLoaded", init);
showRandomBtn.addEventListener("click", displayRandomFiltered);
addBtn.addEventListener("click", addLocalQuote);
forceSyncBtn.addEventListener("click", () => syncWithServer(true));
autoSyncCheckbox.addEventListener("change", toggleAutoSync);
resolveAllServer.addEventListener("click", () => resolveAllConflicts("server"));
resolveAllLocal.addEventListener("click", () => resolveAllConflicts("local"));
closeConflicts.addEventListener("click", () => toggleConflictsPanel(false));
importFile && importFile.addEventListener("change", handleImport);
exportBtn && exportBtn.addEventListener("click", handleExport);

// auto-sync timer handle
let autoSyncTimer = null;

function init() {
  loadLocal();
  populateCategoryFilter();
  renderList();
  displayRandomFiltered();
  startAutoSyncIfNeeded();
  // for demo: every 25s have the server simulate an external change
  setInterval(() => SimulatedServer.simulateExternalChange(), 25000);
}

// ---------- Local storage helpers ----------
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      quotes = JSON.parse(raw);
    } else {
      // start with example local data
      quotes = [
        { id: "l-1", text: "Local: Start small, think big.", category: "Motivation", updatedAt: Date.now() - 120000 }
      ];
      saveLocal();
    }
  } catch (err) {
    console.error("Failed to load local quotes", err);
    quotes = [];
  }
}

function saveLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(quotes));
  } catch (err) {
    console.error("Failed to save local quotes", err);
  }
}

// ---------- UI helpers ----------
function populateCategoryFilter() {
  const cats = Array.from(new Set(quotes.map(q => q.category))).sort();
  categoryFilter.innerHTML = `<option value="all">All</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderList() {
  quotesListEl.innerHTML = "";
  if (quotes.length === 0) {
    quotesListEl.innerHTML = `<div class="quote-item">No quotes</div>`;
    return;
  }
  quotes.slice().reverse().forEach(q => {
    const el = document.createElement("div");
    el.className = "quote-item";
    el.innerHTML = `<div class="meta"><strong>${escapeHtml(q.text)}</strong><div>${escapeHtml(q.category)}</div></div>`;
    const actions = document.createElement("div");
    const showBtn = document.createElement("button");
    showBtn.className = "small";
    showBtn.textContent = "Show";
    showBtn.onclick = () => { displayQuote(q); };
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => { if(confirm('Remove quote?')) { quotes = quotes.filter(x=>x.id!==q.id); saveLocal(); populateCategoryFilter(); renderList(); } };
    const pushBtn = document.createElement("button");
    pushBtn.className = "small";
    pushBtn.textContent = "Push→Server";
    pushBtn.onclick = () => pushLocalToServer(q);

    actions.appendChild(showBtn); actions.appendChild(pushBtn); actions.appendChild(removeBtn);
    el.appendChild(actions);
    quotesListEl.appendChild(el);
  });
}

function displayQuote(q) {
  quoteTextEl.textContent = `"${q.text}"`;
  quoteCategoryEl.textContent = q.category;
}

function displayRandomFiltered() {
  const cat = categoryFilter.value || "all";
  const filtered = (cat === "all") ? quotes : quotes.filter(q => q.category === cat);
  if (filtered.length === 0) {
    quoteTextEl.textContent = "No quotes found.";
    quoteCategoryEl.textContent = "";
    return;
  }
  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  displayQuote(pick);
}

// escape helper for innerHTML injection
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ---------- Add local quote ----------
function addLocalQuote() {
  const text = (newTextEl.value || "").trim();
  const cat = (newCatEl.value || "").trim() || "Uncategorized";
  if (!text) { alert("Please enter quote text"); return; }
  const id = "l-" + Date.now() + "-" + Math.random().toString(36).slice(2,6);
  const newQ = { id, text, category: cat, updatedAt: Date.now() };
  quotes.push(newQ);
  saveLocal();
  populateCategoryFilter();
  renderList();
  displayQuote(newQ);
  newTextEl.value = ""; newCatEl.value = "";
}

// ---------- SYNC logic ----------

async function syncWithServer(forceServerWins = SERVER_WIN_BY_DEFAULT) {
  setSyncStatus("Syncing...");
  try {
    const serverData = await SimulatedServer.getQuotes();

    // Build lookup maps
    const localById = new Map(quotes.map(q => [q.id, q]));
    const serverById = new Map(serverData.map(q => [q.id, q]));

    const updates = [];
    const conflicts = [];

    // 1. For every server quote: if not present locally -> add; if present but updatedAt differs -> conflict/update
    for (const s of serverData) {
      const local = localById.get(s.id);
      if (!local) {
        // server has new quote: add locally
        quotes.push({ ...s });
        updates.push({ type: "added_local", item: s });
      } else {
        if (s.updatedAt > (local.updatedAt || 0) && s.text !== local.text) {
          // server modified after local -> conflict/resolve
          if (forceServerWins) {
            // server takes precedence - overwrite local
            Object.assign(local, s);
            updates.push({ type: "server_overwrote_local", id: s.id });
          } else {
            // queue conflict for manual resolution
            conflicts.push({ local, server: s });
          }
        } else if ((local.updatedAt || 0) > s.updatedAt && local.text !== s.text) {
          // local is newer than server - optionally push to server
          // We'll not auto-push unless user triggers; record as potential conflict if serverWins=false
          if (forceServerWins) {
            // server older -> keep local by pushing to server
            await SimulatedServer.upsertQuote(local);
            updates.push({ type: "local_pushed_to_server", id: local.id });
          } else {
            conflicts.push({ local, server: s });
          }
        }
      }
    }

    // 2. Server might lack some local quotes: push those
    for (const local of quotes.slice()) {
      if (!serverById.has(local.id)) {
        // push local to server
        await SimulatedServer.upsertQuote(local);
        updates.push({ type: "pushed_to_server", id: local.id });
      }
    }

    // Save local after merging
    saveLocal();
    populateCategoryFilter();
    renderList();

    // update UI
    lastSync = new Date();
    lastSyncEl.textContent = `Last: ${lastSync.toLocaleTimeString()}`;
    if (updates.length) {
      updatesCountEl.hidden = false;
      updatesCountEl.textContent = `${updates.length} update(s)`;
    } else {
      updatesCountEl.hidden = true;
    }

    if (conflicts.length > 0) {
      pendingConflicts = conflicts;
      showConflicts(conflicts);
    } else {
      pendingConflicts = [];
    }

    setSyncStatus("Synced");
  } catch (err) {
    console.error("Sync failed", err);
    setSyncStatus("Sync failed");
  }
}

// push a single local quote to server (manual)
async function pushLocalToServer(localQuote) {
  setSyncStatus("Pushing...");
  try {
    await SimulatedServer.upsertQuote(localQuote);
    setSyncStatus("Pushed");
  } catch (err) {
    setSyncStatus("Push failed");
  }
}

// ---------- Conflict UI ----------
function showConflicts(conflicts) {
  conflictList.innerHTML = "";
  conflictCount.textContent = `${conflicts.length} conflict(s) found`;
  conflicts.forEach((c, idx) => {
    const block = document.createElement("div");
    block.className = "quote-item";
    block.innerHTML = `
      <div class="meta">
        <div><strong>Local:</strong> ${escapeHtml(c.local.text)} <em>(${escapeHtml(c.local.category)})</em></div>
        <div><strong>Server:</strong> ${escapeHtml(c.server.text)} <em>(${escapeHtml(c.server.category)})</em></div>
      </div>
    `;
    const actions = document.createElement("div");
    const keepServerBtn = document.createElement("button");
    keepServerBtn.className = "small";
    keepServerBtn.textContent = "Keep Server";
    keepServerBtn.onclick = () => resolveConflict(idx, "server");

    const keepLocalBtn = document.createElement("button");
    keepLocalBtn.className = "small";
    keepLocalBtn.textContent = "Keep Local";
    keepLocalBtn.onclick = () => resolveConflict(idx, "local");

    actions.appendChild(keepServerBtn);
    actions.appendChild(keepLocalBtn);
    block.appendChild(actions);
    conflictList.appendChild(block);
  });

  toggleConflictsPanel(true);
}

async function resolveConflict(index, choice) {
  const c = pendingConflicts[index];
  if (!c) return;
  if (choice === "server") {
    // overwrite local with server version
    const idx = quotes.findIndex(q => q.id === c.local.id);
    if (idx !== -1) quotes[idx] = { ...c.server };
    saveLocal();
  } else {
    // keep local: push local to server
    await SimulatedServer.upsertQuote(c.local);
  }
  // remove conflict and re-render
  pendingConflicts.splice(index,1);
  if (pendingConflicts.length === 0) toggleConflictsPanel(false);
  else showConflicts(pendingConflicts);
  populateCategoryFilter();
  renderList();
}

async function resolveAllConflicts(choice) {
  if (!confirm(`Resolve all conflicts by keeping ${choice.toUpperCase()}?`)) return;
  for (let i = 0; i < pendingConflicts.length; i++) {
    const c = pendingConflicts[i];
    if (choice === "server") {
      const idx = quotes.findIndex(q => q.id === c.local.id);
      if (idx !== -1) quotes[idx] = { ...c.server };
    } else {
      await SimulatedServer.upsertQuote(c.local);
    }
  }
  pendingConflicts = [];
  saveLocal();
  populateCategoryFilter();
  renderList();
  toggleConflictsPanel(false);
}

function toggleConflictsPanel(show) {
  conflictsPanel.classList.toggle("hidden", !show);
}

// ---------- Auto-sync control ----------
function startAutoSyncIfNeeded() {
  if (autoSyncCheckbox.checked) {
    if (!autoSyncTimer) {
      autoSyncTimer = setInterval(() => syncWithServer(SERVER_WIN_BY_DEFAULT), SYNC_INTERVAL_MS);
    }
  } else {
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer);
      autoSyncTimer = null;
    }
  }
}

function toggleAutoSync() {
  startAutoSyncIfNeeded();
}

// ---------- Utilities ----------
function setSyncStatus(text) {
  syncStatusEl.textContent = text;
}

// ---------- Import/Export ----------
function handleExport() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "quotes_local_export.json";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function handleImport(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const arr = JSON.parse(evt.target.result);
      if (!Array.isArray(arr)) throw new Error("Expecting array of quotes");
      // normalize & merge
      const beforeCount = quotes.length;
      const existing = new Set(quotes.map(q => q.text + "||" + q.category));
      const toAdd = arr.filter(it => it && it.text && it.category && !existing.has(it.text + "||" + it.category))
                      .map(it => ({ id: it.id || ("im-"+Date.now()+"-"+Math.random().toString(36).slice(2,5)), text: it.text, category: it.category, updatedAt: Date.now() }));
      quotes.push(...toAdd);
      saveLocal();
      populateCategoryFilter();
      renderList();
      alert(`Imported ${toAdd.length} new quote(s).`);
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      importFile.value = "";
    }
  };
  reader.readAsText(f);
}

// Keys for storage
const LS_KEY = "quotes_v1";
const SESSION_KEY_LAST = "lastShownQuote_v1";

// A few default quotes (used only if localStorage is empty)
const DEFAULT_QUOTES = [
  { id: Date.now() + "-1", text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { id: Date.now() + "-2", text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { id: Date.now() + "-3", text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", category: "Success" },
  { id: Date.now() + "-4", text: "Happiness depends upon ourselves.", category: "Happiness" }
];

// App state
let quotes = [];

// DOM refs
const quoteText = document.getElementById("quoteText");
const quoteCategory = document.getElementById("quoteCategory");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteForm = document.getElementById("addQuoteForm");
const quotesList = document.getElementById("quotesList");
const importFile = document.getElementById("importFile");
const exportBtn = document.getElementById("exportBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

// Initialize App
document.addEventListener("DOMContentLoaded", init);
newQuoteBtn.addEventListener("click", showRandomQuote);
categorySelect.addEventListener("change", showRandomQuote);
importFile.addEventListener("change", importFromJsonFile);
exportBtn && exportBtn.addEventListener("click", exportToJson);
clearAllBtn && clearAllBtn.addEventListener("click", clearAllQuotes);

function init() {
  loadQuotesFromLocalStorage();
  populateCategoryDropdown();
  createAddQuoteForm();
  renderQuoteList();

  // If there's a last shown quote in session storage, show it; otherwise show random
  const lastShown = sessionStorage.getItem(SESSION_KEY_LAST);
  if (lastShown) {
    try {
      const parsed = JSON.parse(lastShown);
      displayQuoteObject(parsed);
    } catch (err) {
      showRandomQuote();
    }
  } else {
    showRandomQuote();
  }
}

/* ---------- Storage Helpers ---------- */
function saveQuotesToLocalStorage() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(quotes));
  } catch (err) {
    console.error("Failed to save quotes to local storage:", err);
  }
}

function loadQuotesFromLocalStorage() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    quotes = [...DEFAULT_QUOTES];
    saveQuotesToLocalStorage();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Ensure each quote has required props (id, text, category)
      quotes = parsed.map(q => ({
        id: q.id || (Date.now() + "-" + Math.random().toString(36).slice(2,8)),
        text: q.text || "",
        category: q.category || "Uncategorized"
      }));
    } else {
      quotes = [...DEFAULT_QUOTES];
      saveQuotesToLocalStorage();
    }
  } catch (err) {
    console.warn("Invalid JSON in localStorage. Resetting to defaults.");
    quotes = [...DEFAULT_QUOTES];
    saveQuotesToLocalStorage();
  }
}

/* ---------- Category Dropdown ---------- */
function populateCategoryDropdown() {
  const categories = Array.from(new Set(quotes.map(q => q.category))).sort();
  categorySelect.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

/* ---------- Show Random Quote ---------- */
function showRandomQuote() {
  const selectedCategory = categorySelect.value;
  const filtered = selectedCategory === "all" ? quotes : quotes.filter(q => q.category === selectedCategory);

  if (filtered.length === 0) {
    quoteText.textContent = "No quotes available for this category.";
    quoteCategory.textContent = "";
    return;
  }

  const random = filtered[Math.floor(Math.random() * filtered.length)];
  displayQuoteObject(random);

  // Save last shown quote in sessionStorage (so it persists during the tab/session)
  try {
    sessionStorage.setItem(SESSION_KEY_LAST, JSON.stringify(random));
  } catch (err) {
    console.warn("Session storage not available:", err);
  }
}

function displayQuoteObject(q) {
  quoteText.textContent = `"${q.text}"`;
  quoteCategory.textContent = `Category: ${q.category}`;
}

/* ---------- Add Quote Form (dynamic) ---------- */
function createAddQuoteForm() {
  addQuoteForm.innerHTML = "";

  const quoteInput = document.createElement("input");
  quoteInput.type = "text";
  quoteInput.id = "newQuoteText";
  quoteInput.placeholder = "Enter a new quote";
  quoteInput.style.width = "60%";

  const categoryInput = document.createElement("input");
  categoryInput.type = "text";
  categoryInput.id = "newQuoteCategory";
  categoryInput.placeholder = "Enter quote category";
  categoryInput.style.width = "30%";

  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";
  addButton.className = "small";
  addButton.addEventListener("click", addQuote);

  addQuoteForm.appendChild(quoteInput);
  addQuoteForm.appendChild(categoryInput);
  addQuoteForm.appendChild(addButton);
}

/* ---------- Add / Remove / Clear ---------- */
function addQuote(e) {
  e && e.preventDefault();
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const text = textEl.value.trim();
  const category = catEl.value.trim() || "Uncategorized";

  if (!text) {
    alert("Please enter a quote before adding.");
    return;
  }

  const newQuote = {
    id: Date.now().toString() + "-" + Math.random().toString(36).slice(2,6),
    text,
    category
  };

  quotes.push(newQuote);
  saveQuotesToLocalStorage();
  populateCategoryDropdown();
  renderQuoteList();

  // clear inputs
  textEl.value = "";
  catEl.value = "";

  // show the newly added quote
  displayQuoteObject(newQuote);
  sessionStorage.setItem(SESSION_KEY_LAST, JSON.stringify(newQuote));
}

function removeQuoteById(id) {
  const idx = quotes.findIndex(q => q.id === id);
  if (idx === -1) return;
  if (!confirm("Remove this quote?")) return;
  quotes.splice(idx, 1);
  saveQuotesToLocalStorage();
  populateCategoryDropdown();
  renderQuoteList();
  showRandomQuote();
}

function clearAllQuotes() {
  if (!confirm("This will remove ALL quotes permanently from local storage. Proceed?")) return;
  quotes = [];
  saveQuotesToLocalStorage();
  populateCategoryDropdown();
  renderQuoteList();
  quoteText.textContent = "No quotes stored. Add a new quote to get started.";
  quoteCategory.textContent = "";
  sessionStorage.removeItem(SESSION_KEY_LAST);
}

/* ---------- Render List of Quotes ---------- */
function renderQuoteList() {
  quotesList.innerHTML = "";
  if (quotes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No quotes stored yet.";
    quotesList.appendChild(empty);
    return;
  }

  quotes.forEach(q => {
    const card = document.createElement("div");
    card.className = "quote-card";

    const meta = document.createElement("div");
    meta.className = "meta";

    const p = document.createElement("p");
    p.textContent = `"${q.text}"`;

    const cat = document.createElement("div");
    cat.className = "cat";
    cat.textContent = `Category: ${q.category}`;

    meta.appendChild(p);
    meta.appendChild(cat);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.alignItems = "center";

    const showBtn = document.createElement("button");
    showBtn.className = "small";
    showBtn.textContent = "Show";
    showBtn.addEventListener("click", () => {
      displayQuoteObject(q);
      sessionStorage.setItem(SESSION_KEY_LAST, JSON.stringify(q));
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "small remove-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeQuoteById(q.id));

    actions.appendChild(showBtn);
    actions.appendChild(removeBtn);

    card.appendChild(meta);
    card.appendChild(actions);

    quotesList.appendChild(card);
  });
}

/* ---------- Export to JSON ---------- */
function exportToJson() {
  try {
    const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quotes_export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("Failed to export quotes: " + err.message);
  }
}

/* ---------- Import from JSON File ---------- */
function importFromJsonFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (!Array.isArray(imported)) {
        alert("Invalid JSON: expected an array of quote objects.");
        return;
      }

      // Validate and normalize imported quotes
      const normalized = imported
        .filter(item => item && (item.text || item.quoteText))
        .map(item => ({
          id: item.id || (Date.now().toString() + "-" + Math.random().toString(36).slice(2,6)),
          text: item.text || item.quoteText || "",
          category: item.category || item.author || "Imported"
        }));

      if (normalized.length === 0) {
        alert("No valid quotes found in the file.");
        return;
      }

      // Merge avoiding duplicate text+category combos
      const existingKeys = new Set(quotes.map(q => `${q.text}||${q.category}`));
      const toAdd = normalized.filter(n => !existingKeys.has(`${n.text}||${n.category}`));

      if (toAdd.length === 0) {
        alert("No new unique quotes found to import.");
        return;
      }

      quotes.push(...toAdd);
      saveQuotesToLocalStorage();
      populateCategoryDropdown();
      renderQuoteList();
      alert(`Imported ${toAdd.length} quotes successfully!`);
    } catch (err) {
      alert("Failed to parse JSON file: " + err.message);
    } finally {
      // reset input so same file can be chosen again if desired
      importFile.value = "";
    }
  };

  reader.onerror = function () {
    alert("Could not read the file.");
    importFile.value = "";
  };

  reader.readAsText(file);
}

// -------------------------------
// INITIALIZATION
// -------------------------------
let quotes = JSON.parse(localStorage.getItem("quotes")) || [];
const quoteDisplay = document.getElementById("quoteDisplay");
const quoteText = document.getElementById("quoteText");
const quoteCategory = document.getElementById("quoteCategory");

// -------------------------------
// MOCK API ENDPOINT (using JSONPlaceholder simulation)
// -------------------------------
const MOCK_API_URL = "https://jsonplaceholder.typicode.com/posts";

// -------------------------------
// FETCH QUOTES FROM SERVER (Simulated)
// -------------------------------
async function fetchQuotesFromServer() {
  try {
    const response = await fetch(MOCK_API_URL);
    const data = await response.json();

    // Simulate conversion to quote objects
    const serverQuotes = data.slice(0, 5).map((item, index) => ({
      text: `Server quote #${index + 1}: ${item.title}`,
      category: "Server",
    }));

    console.log("Fetched quotes from server:", serverQuotes);
    return serverQuotes;
  } catch (error) {
    console.error("Error fetching quotes from server:", error);
    showNotification("Error fetching quotes from server.", "warning");
    return [];
  }
}

// -------------------------------
// POST QUOTES TO SERVER (Simulated)
// -------------------------------
async function postQuotesToServer(quotesToSync) {
  try {
    const response = await fetch(MOCK_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotesToSync),
    });
    const result = await response.json();
    console.log("Posted quotes to server:", result);
  } catch (error) {
    console.error("Error posting quotes:", error);
    showNotification("Error posting quotes to server.", "warning");
  }
}

// -------------------------------
// SYNC QUOTES (Main function)
// -------------------------------
async function syncQuotes() {
  console.log("Syncing quotes...");
  showNotification("Syncing quotes with server...", "info");

  const serverQuotes = await fetchQuotesFromServer();
  const localQuotes = JSON.parse(localStorage.getItem("quotes")) || [];

  // Conflict resolution: server data takes precedence
  const mergedQuotes = [...localQuotes, ...serverQuotes].filter(
    (value, index, self) =>
      index === self.findIndex((q) => q.text === value.text)
  );

  // Update local storage with merged data
  localStorage.setItem("quotes", JSON.stringify(mergedQuotes));
  quotes = mergedQuotes;

  // Simulate posting updated local quotes back to server
  await postQuotesToServer(mergedQuotes);

  showNotification("Quotes synced successfully (Server data prioritized)", "success");
}

// -------------------------------
// PERIODIC SYNC CHECK
// -------------------------------
setInterval(syncQuotes, 30000); // Every 30 seconds

// -------------------------------
// SIMPLE QUOTE DISPLAY
// -------------------------------
function showRandomQuote() {
  if (quotes.length === 0) {
    quoteText.textContent = "No quotes available.";
    quoteCategory.textContent = "";
    return;
  }

  const random = Math.floor(Math.random() * quotes.length);
  const randomQuote = quotes[random];
  quoteText.textContent = randomQuote.text;
  quoteCategory.textContent = `— ${randomQuote.category}`;
}

// -------------------------------
// UI NOTIFICATION FOR UPDATES/CONFLICTS
// -------------------------------
function showNotification(message, type = "info") {
  const notif = document.getElementById("notification");
  if (!notif) return;

  notif.textContent = message;
  notif.style.display = "block";
  notif.style.background =
    type === "success"
      ? "#28a745"
      : type === "warning"
      ? "#ffc107"
      : "#007bff";
  notif.style.color = "white";
  notif.style.padding = "10px";
  notif.style.borderRadius = "5px";
  notif.style.position = "fixed";
  notif.style.bottom = "20px";
  notif.style.right = "20px";
  notif.style.zIndex = "1000";

  // Hide after 4 seconds
  setTimeout(() => {
    notif.style.display = "none";
  }, 4000);
}

// -------------------------------
// INITIAL CALLS
// -------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  quotes = JSON.parse(localStorage.getItem("quotes")) || [];
  await syncQuotes(); // Perform initial sync on load
  showRandomQuote();
});

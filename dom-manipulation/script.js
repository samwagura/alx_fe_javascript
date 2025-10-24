// Initial quotes array
let quotes = [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Life is what happens when you're busy making other plans.", category: "Life" },
  { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", category: "Success" },
  { text: "Happiness depends upon ourselves.", category: "Happiness" }
];

// Reference DOM elements
const quoteText = document.getElementById("quoteText");
const quoteCategory = document.getElementById("quoteCategory");
const newQuoteBtn = document.getElementById("newQuote");
const categorySelect = document.getElementById("categorySelect");
const addQuoteForm = document.getElementById("addQuoteForm");

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  populateCategoryDropdown();
  showRandomQuote();
  createAddQuoteForm();
});

// Populate dropdown with unique categories
function populateCategoryDropdown() {
  const categories = [...new Set(quotes.map(q => q.category))];
  categorySelect.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
}

// Show a random quote based on selected category
function showRandomQuote() {
  const selectedCategory = categorySelect.value;
  let filteredQuotes = selectedCategory === "all"
    ? quotes
    : quotes.filter(q => q.category === selectedCategory);

  if (filteredQuotes.length === 0) {
    quoteText.textContent = "No quotes found in this category.";
    quoteCategory.textContent = "";
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const randomQuote = filteredQuotes[randomIndex];

  quoteText.textContent = `"${randomQuote.text}"`;
  quoteCategory.textContent = `Category: ${randomQuote.category}`;
}

// Create the "Add Quote" form dynamically
function createAddQuoteForm() {
  addQuoteForm.innerHTML = "";

  const quoteInput = document.createElement("input");
  quoteInput.type = "text";
  quoteInput.id = "newQuoteText";
  quoteInput.placeholder = "Enter a new quote";

  const categoryInput = document.createElement("input");
  categoryInput.type = "text";
  categoryInput.id = "newQuoteCategory";
  categoryInput.placeholder = "Enter quote category";

  const addButton = document.createElement("button");
  addButton.textContent = "Add Quote";

  addButton.addEventListener("click", addQuote);

  addQuoteForm.appendChild(quoteInput);
  addQuoteForm.appendChild(categoryInput);
  addQuoteForm.appendChild(addButton);
}

// Add a new quote dynamically
function addQuote() {
  const newQuoteText = document.getElementById("newQuoteText").value.trim();
  const newQuoteCategory = document.getElementById("newQuoteCategory").value.trim();

  if (!newQuoteText || !newQuoteCategory) {
    alert("Please fill in both fields before adding a quote!");
    return;
  }

  quotes.push({ text: newQuoteText, category: newQuoteCategory });

  // Update category dropdown dynamically
  populateCategoryDropdown();

  // Clear input fields
  document.getElementById("newQuoteText").value = "";
  document.getElementById("newQuoteCategory").value = "";

  alert("Quote added successfully!");
}

// Event listeners
newQuoteBtn.addEventListener("click", showRandomQuote);
categorySelect.addEventListener("change", showRandomQuote);

let db;
let total = 0;

const micBtn = document.getElementById('micBtn');
const inputBox = document.getElementById('manualInput');
const addBtn = document.getElementById('addBtn');
const list = document.getElementById('expenseList');
const totalLabel = document.getElementById('totalAmount');
const voicePopup = document.getElementById('voicePopup');
const voiceText = document.getElementById('voiceText');
let isListening = false;
let userStoppedMic = false;
let userInteracted = false;
window.addEventListener('click', () => userInteracted = true, { once: true });
window.addEventListener('keydown', () => userInteracted = true, { once: true });

// IndexedDB setup
const request = indexedDB.open('ExpenseDB', 1);
request.onupgradeneeded = e => {
  db = e.target.result;
  db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
  if (!db.objectStoreNames.contains('history'))
    db.createObjectStore('history', { keyPath: 'month' });
};
request.onsuccess = e => {
  db = e.target.result;
  loadExpenses();
};
request.onerror = () => alert('DB failed');

// Load and render existing entries
function loadExpenses() {
  total = 0;
  list.innerHTML = '';
  const tx = db.transaction('expenses', 'readonly');
  const store = tx.objectStore('expenses');
  const req = store.getAll();
  req.onsuccess = () => {
    req.result.forEach(entry => renderEntry(entry));
  };
}

// Voice Recognition Setup
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'hi-IN';
recognition.continuous = false;

function startListening() {
    if (!userStoppedMic) {
  
  voicePopup.classList.remove('hidden');
  recognition.start();}
}

// Consolidated Voice Event Handlers
recognition.onstart = () => {
    isListening = true;
  voicePopup.classList.remove('hidden');
  micBtn.classList.add('listening');
  voiceText.textContent = "Listening...";
};

recognition.onresult = e => {
  const transcript = e.results[0][0].transcript;
  voiceText.textContent = `"${transcript}"`;
  const parsed = parseInput(transcript);
  if (parsed) {
    addExpense(parsed.amount, parsed.item);
    voiceText.textContent = `Saved: ₹${parsed.amount} – ${parsed.item}`;
  } else {
    voiceText.textContent = "Couldn't understand 😕";
  }
   if (transcript === "बस") {
    recognition.stop();
    voicePopup.classList.add('hidden');

    alert("Voice recognition बंद कर दी गई।");
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // double tap feel

    // Optional: App ko 'close' jaisa feel dena
    window.location.href = "about:blank"; // ya kisi aur blank page pe bhej do
    return;
  }
  // Hide popup after 2.5 sec
  setTimeout(() => {
    voicePopup.classList.add('hidden');
  }, 2500);
};

recognition.onend = () => {
    isListening = false;
  micBtn.classList.remove('listening');
  // Auto-restart mic after a short delay
  if (!userStoppedMic) {
    setTimeout(() => recognition.start(), 500);
  }
};


recognition.onerror = e => {
  console.error('Voice error:', e.error);
  voiceText.textContent = "Mic error 😬";
  setTimeout(() => voicePopup.classList.add('hidden'), 2000);
};

// Manual Add
addBtn.onclick = () => {
  const text = inputBox.value.trim();
  if (!text) return;
  const parsed = parseInput(text);
  if (parsed) addExpense(parsed.amount, parsed.item);
  inputBox.value = '';
};

// Parse function: extract first number & rest as item
function parseInput(text) {
  const match = text.match(/(\d+(\.\d+)?)(.*)/);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const item = match[3]
    .replace(/\b(rupaye|rupees|rs|ka|ki|ke|के लिए|का लिए|का|की|के|में|मे|वाला|वाली|के वास्ते|का वास्ते)\b/gi, '')
    .trim();
  return { amount, item };
}

// Add to DB and UI (wait for ID before rendering)
function addExpense(amount, item) {
  const entry = { amount, item, date: new Date().toISOString() };
  const tx = db.transaction('expenses', 'readwrite');
  const store = tx.objectStore('expenses');
  const req = store.add(entry);
  req.onsuccess = function(e) {
    entry.id = e.target.result; // Set the auto-generated ID
    renderEntry(entry);
    if (userInteracted && navigator.vibrate) navigator.vibrate(100);
};
}

// Render list item + update total, with delete button
function renderEntry(entry) {
  const { id, amount, item } = entry;
  const li = document.createElement('li');
  
  const span = document.createElement('span');
  span.textContent = `[₹${amount}] – ${item}`;

  // Delete Button
  const delBtn = document.createElement('button');
  delBtn.textContent = '🗑️';
  delBtn.className = 'delete-btn';
  delBtn.onclick = () => {
    if (confirm(`Delete this entry?\n₹${amount} – ${item}`)) {
      deleteExpense(id, amount);
    }
  };

  li.appendChild(span);
  li.appendChild(delBtn);
  list.appendChild(li);

  total += amount;
  totalLabel.textContent = total.toFixed(2);
}

// Delete Expense from DB and update UI
function deleteExpense(id, amount) {
  const tx = db.transaction('expenses', 'readwrite');
  const store = tx.objectStore('expenses');
  const req = store.delete(id);
  req.onsuccess = () => {
    // Clear list and re-render all entries (updates total)
    loadExpenses();
  };
}

// Event listener for mic button click (start listening)
micBtn.onclick = () => {
    if (isListening) {
      recognition.stop();
      userStoppedMic = true;  // User manually stopped
    } else {
      userStoppedMic = false; // User wants it again
      recognition.start();
    }
  };
  

// Start mic automatically on load
window.onload = () => {
  startListening();
};
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered ✅'))
      .catch(err => console.error('SW failed ❌', err));
  }
  let deferredPrompt;
const a2hsBtn = document.getElementById('a2hsBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // Prevent automatic prompt
  deferredPrompt = e;
  a2hsBtn.classList.remove('hidden');
});

a2hsBtn.onclick = async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('User accepted the install');
    a2hsBtn.classList.add('hidden');
  } else {
    console.log('User dismissed the install');
  }
  deferredPrompt = null;
};
// Archive current month & reset list
document.getElementById('settleBtn').onclick = () => {
  const confirmSettle = confirm('Clear current list and archive it?');
  if (!confirmSettle) return;

  const tx = db.transaction('expenses', 'readwrite');
  const store = tx.objectStore('expenses');
  const getReq = store.getAll();
  
  getReq.onsuccess = () => {
    const entries = getReq.result;
    if (!entries.length) return;

    const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    const total = entries.reduce((sum, e) => sum + e.amount, 0);

    const historyTx = db.transaction('history', 'readwrite');
    const historyStore = historyTx.objectStore('history');
    historyStore.put({ month: monthKey, total, entries });

    // Clear current
    entries.forEach(e => store.delete(e.id));

    document.getElementById('expenseList').innerHTML = '';
    document.getElementById('totalAmount').textContent = '0';
    alert('✅ Archived successfully!');
  };
};

// Load history
function loadHistory() {
  const tab = document.getElementById('historyTab');
  const tx = db.transaction('history', 'readonly');
  const store = tx.objectStore('history');
  const req = store.getAll();

  req.onsuccess = () => {
    req.result.forEach(({ month, total, entries }) => {
      const section = document.createElement('section');
      section.innerHTML = `<h3>${month} — ₹${total.toFixed(2)}</h3>`;
      const ul = document.createElement('ul');
      entries.forEach(e => {
        const li = document.createElement('li');
        li.textContent = `[₹${e.amount}] – ${e.item}`;
        ul.appendChild(li);
      });
      section.appendChild(ul);
      tab.appendChild(section);
    });
  };
}

window.loadHistory = loadHistory;

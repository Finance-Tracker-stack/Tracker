const API_KEY = "$2a$10$RdNd/UY.Zwx3Ib3UTUd28.Y/rJvKMWlXZeQdXl50dwIZ9tlNk7AK2"; // 🔁 Replace with your X-Master-Key
const BIN_ID = "686e6d4077690248e158bb9e";
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
let transactions = [];

const form = document.getElementById('transactionForm');
const desc = document.getElementById('desc');
const amount = document.getElementById('amount');
const type = document.getElementById('type');
const category = document.getElementById('category');
const date = document.getElementById('date');

const balance = document.getElementById('balance');
const income = document.getElementById('income');
const expense = document.getElementById('expense');
const monthlyIncome = document.getElementById('monthly-income');
const monthlyExpense = document.getElementById('monthly-expense');
const weeklyIncome = document.getElementById('weekly-income');
const weeklyExpense = document.getElementById('weekly-expense');
const categoryTable = document.getElementById('categoryTable').querySelector('tbody');
const transactionsTableBody = document.querySelector("#transactionsTable tbody");
const chartCanvas = document.getElementById('financeChart');

// Get start of month/week
const getStartOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const getStartOfWeek = () => {
  const now = new Date();
  const diff = now.getDate() - now.getDay();
  return new Date(now.setDate(diff));
};

// Load transactions from cloud
async function loadTransactions() {
  try {
    const res = await fetch(BIN_URL, {
      headers: { "X-Master-Key": API_KEY }
    });
    const json = await res.json();
    transactions = json.record || [];
    renderUI();
  } catch (err) {
    alert("❌ Failed to load data from JSONBin");
    console.error(err);
  }
}

// Save transactions to cloud
async function saveTransactions() {
  try {
    await fetch(BIN_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": API_KEY
      },
      body: JSON.stringify(transactions)
    });
  } catch (err) {
    alert("❌ Failed to save data to JSONBin");
    console.error(err);
  }
}

// Form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const tx = {
    id: Date.now(),
    desc: desc.value,
    amount: +amount.value,
    type: type.value,
    category: category.value,
    date: date.value
  };
  transactions.push(tx);
  await saveTransactions();
  form.reset();
  renderUI();
});

// Delete
async function deleteTx(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  await saveTransactions();
  renderUI();
}

// Render
function renderUI() {
  transactionsTableBody.innerHTML = '';
  categoryTable.innerHTML = '';

  let total = 0, totalInc = 0, totalExp = 0;
  let mInc = 0, mExp = 0, wInc = 0, wExp = 0;
  const catMap = {};
  const monthStart = getStartOfMonth();
  const weekStart = getStartOfWeek();

  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${txDate.toLocaleDateString()}</td>
      <td>${tx.desc}</td>
      <td>${tx.amount}</td>
      <td>${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td>
      <td>${tx.category}</td>
      <td><button onclick="deleteTx(${tx.id})">❌</button></td>
    `;
    transactionsTableBody.appendChild(row);

    if (tx.type === 'income') {
      total += tx.amount;
      totalInc += tx.amount;
    } else {
      total -= tx.amount;
      totalExp += tx.amount;
    }

    if (txDate >= monthStart) {
      if (tx.type === 'income') mInc += tx.amount;
      else mExp += tx.amount;
    }

    if (txDate >= weekStart) {
      if (tx.type === 'income') wInc += tx.amount;
      else wExp += tx.amount;
    }

    if (!catMap[tx.category]) catMap[tx.category] = { income: 0, expense: 0 };
    catMap[tx.category][tx.type] += tx.amount;
  });

  balance.innerText = total;
  income.innerText = totalInc;
  expense.innerText = totalExp;
  monthlyIncome.innerText = mInc;
  monthlyExpense.innerText = mExp;
  weeklyIncome.innerText = wInc;
  weeklyExpense.innerText = wExp;

  for (let cat in catMap) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cat}</td>
      <td>₹${catMap[cat].income}</td>
      <td>₹${catMap[cat].expense}</td>
    `;
    categoryTable.appendChild(row);
  }

  updateChart(totalInc, totalExp);
}

// Chart
let chart;
function updateChart(inc, exp) {
  if (chart) chart.destroy();
  chart = new Chart(chartCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Income', 'Expense'],
      datasets: [{
        data: [inc, exp],
        backgroundColor: ['#28a745', '#dc3545']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Export CSV
function exportCSV() {
  let csv = "Date,Description,Amount,Type,Category\n";
  transactions.forEach(tx => {
    csv += `${new Date(tx.date).toLocaleDateString()},${tx.desc},${tx.amount},${tx.type},${tx.category}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  a.click();
}

// Load cloud data on first load
loadTransactions();

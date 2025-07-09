// ✅ CONFIG
const API_KEY = "$2a$10$RdNd/UY.Zwx3Ib3UTUd28.Y/rJvKMWlXZeQdXl50dwIZ9tlNk7AK2";
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
const categoryTable = document.querySelector('#categoryTable tbody');
const transactionsTable = document.querySelector('#transactionsTable tbody');
const chartCanvas = document.getElementById('financeChart');

function getStartOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getStartOfWeek() {
  const d = new Date();
  return new Date(d.setDate(d.getDate() - d.getDay()));
}

async function loadTransactions() {
  try {
    const res = await fetch(BIN_URL, { headers: { 'X-Master-Key': API_KEY } });
    const json = await res.json();
    transactions = json.record || [];
    renderUI();
  } catch (err) {
    console.error("Load failed", err);
  }
}

async function saveTransactions() {
  try {
    await fetch(BIN_URL, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
      },
      body: JSON.stringify(transactions)
    });
  } catch (err) {
    console.error("Save failed", err);
  }
}

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

async function deleteTx(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  await saveTransactions();
  renderUI();
}

function exportCSV() {
  let csv = "Date,Description,Amount,Type,Category\n";
  transactions.forEach(tx => {
    csv += `${tx.date},${tx.desc},${tx.amount},${tx.type},${tx.category}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = "transactions.csv";
  link.click();
}

function renderUI() {
  transactionsTable.innerHTML = '';
  categoryTable.innerHTML = '';
  let total = 0, inc = 0, exp = 0, minc = 0, mexp = 0, winc = 0, wexp = 0;
  const monthStart = getStartOfMonth();
  const weekStart = getStartOfWeek();
  const catMap = {};

  transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${txDate.toLocaleDateString()}</td>
      <td>${tx.desc}</td>
      <td>${tx.amount}</td>
      <td>${tx.type}</td>
      <td>${tx.category}</td>
      <td><button onclick="deleteTx(${tx.id})">❌</button></td>
    `;
    transactionsTable.appendChild(row);

    if (tx.type === 'income') {
      total += tx.amount; inc += tx.amount;
      if (txDate >= monthStart) minc += tx.amount;
      if (txDate >= weekStart) winc += tx.amount;
    } else {
      total -= tx.amount; exp += tx.amount;
      if (txDate >= monthStart) mexp += tx.amount;
      if (txDate >= weekStart) wexp += tx.amount;
    }

    if (!catMap[tx.category]) catMap[tx.category] = { income: 0, expense: 0 };
    catMap[tx.category][tx.type] += tx.amount;
  });

  balance.innerText = total;
  income.innerText = inc;
  expense.innerText = exp;
  monthlyIncome.innerText = minc;
  monthlyExpense.innerText = mexp;
  weeklyIncome.innerText = winc;
  weeklyExpense.innerText = wexp;

  for (const cat in catMap) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cat}</td>
      <td>₹${catMap[cat].income}</td>
      <td>₹${catMap[cat].expense}</td>
    `;
    categoryTable.appendChild(row);
  }

  renderChart(inc, exp);
}

let chart;
function renderChart(inc, exp) {
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
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

loadTransactions();

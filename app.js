const PROFILE_KEY = 'recomp_profile';
const LOGS_KEY = 'recomp_logs';
let weightChart = null;

window.onload = function() {
    loadProfile();
    renderLogs();
};

function calculateRecomp() {
    const weightLbs = parseFloat(document.getElementById('weight').value);
    const heightCm = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const activity = document.getElementById('activity').value;

    const weightKg = weightLbs / 2.20462;
    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    bmr = (gender === 'male') ? bmr + 5 : bmr - 161;

    const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
    const tdee = bmr * multipliers[activity];

    const targetCals = Math.round(tdee - 250); // Balanced Recomp Deficit
    const proteinG = Math.round(weightLbs * 1.1);
    const fatG = Math.round(weightLbs * 0.35);
    const remainingCals = targetCals - ((proteinG * 4) + (fatG * 9));
    const carbsG = Math.max(0, Math.round(remainingCals / 4));

    const profile = { weightLbs, heightCm, age, gender, activity, targetCals, proteinG, fatG, carbsG };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    displayTargets(profile);
}

function displayTargets(profile) {
    document.getElementById('targetCals').innerText = profile.targetCals;
    document.getElementById('targetProtein').innerText = profile.proteinG;
    document.getElementById('targetFats').innerText = profile.fatG;
    document.getElementById('targetCarbs').innerText = profile.carbsG;
    document.getElementById('recompTargets').classList.remove('hidden');
}

function loadProfile() {
    const saved = localStorage.getItem(PROFILE_KEY);
    if(saved) displayTargets(JSON.parse(saved));
}

function logDailyData() {
    const w = parseFloat(document.getElementById('logWeight').value);
    const p = parseInt(document.getElementById('logProtein').value);
    const c = parseInt(document.getElementById('logCarbs').value);
    const f = parseInt(document.getElementById('logFats').value);
    
    if(!w || !p || !c || !f) return alert("Please fill out all logs fields!");

    const cals = (p * 4) + (c * 4) + (f * 9);
    const today = new Date().toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'});

    let logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    logs.push({ date: today, weight: w, calories: cals });
    
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    document.getElementById('logForm').reset();
    renderLogs();
}

function renderLogs() {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = "";

    const chartLabels = [];
    const chartData = [];

    logs.forEach((log, index) => {
        let sum = 0, count = 0;
        for (let i = index; i >= 0 && count < 7; i--) {
            sum += logs[i].weight;
            count++;
        }
        const avg = (sum / count).toFixed(1);

        tbody.innerHTML += `<tr>
            <td>${log.date}</td>
            <td>${log.weight} lbs</td>
            <td><strong>${avg} lbs</strong></td>
            <td>${log.calories} kcal</td>
        </tr>`;

        chartLabels.push(log.date);
        chartData.push(parseFloat(avg));
    });

    // Display the trailing 7 updates visually on our graph
    updateChart(chartLabels.slice(-7), chartData.slice(-7));
}

function updateChart(labels, data) {
    const ctx = document.getElementById('weightChart').getContext('2d');
    if(weightChart) weightChart.destroy();
    
    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '7-Day Weight Moving Avg',
                data: data,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                borderWidth: 2,
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}

function clearData() {
    if(confirm("Are you sure you want to wipe all records?")) { localStorage.clear(); location.reload(); }
}

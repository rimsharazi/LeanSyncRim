const PROFILE_KEY = 'recomp_profile';
const LOGS_KEY = 'recomp_logs';
let weightChart = null;
let strengthChart = null;

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

    // --- MACRO CYCLING SYSTEM ---
    // Training Day: Maintenance calories, high carb fueling
    const trainCals = Math.round(tdee);
    const trainProtein = Math.round(weightLbs * 1.1);
    const trainFats = Math.round(weightLbs * 0.3);
    const trainCarbs = Math.max(0, Math.round((trainCals - ((trainProtein * 4) + (trainFats * 9))) / 4));

    // Rest Day: Slight deficit (-400 calories), lower carbs, higher fat oxidation
    const restCals = Math.round(tdee - 400);
    const restProtein = Math.round(weightLbs * 1.1); // Keep protein high always
    const restFats = Math.round(weightLbs * 0.4);
    const restCarbs = Math.max(0, Math.round((restCals - ((restProtein * 4) + (restFats * 9))) / 4));

    const profile = { 
        weightLbs, heightCm, age, gender, activity, 
        trainCals, trainProtein, trainCarbs, trainFats,
        restCals, restProtein, restCarbs, restFats
    };
    
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    displayTargets(profile);
    runCoachingEngine();
}

function displayTargets(profile) {
    document.getElementById('trainCals').innerText = profile.trainCals;
    document.getElementById('trainProtein').innerText = profile.trainProtein;
    document.getElementById('trainCarbs').innerText = profile.trainCarbs;
    document.getElementById('trainFats').innerText = profile.trainFats;

    document.getElementById('restCals').innerText = profile.restCals;
    document.getElementById('restProtein').innerText = profile.restProtein;
    document.getElementById('restCarbs').innerText = profile.restCarbs;
    document.getElementById('restFats').innerText = profile.restFats;

    document.getElementById('recompTargets').classList.remove('hidden');
}

function loadProfile() {
    const saved = localStorage.getItem(PROFILE_KEY);
    if(saved) displayTargets(JSON.parse(saved));
}

function logDailyData() {
    const w = parseFloat(document.getElementById('logWeight').value);
    const type = document.getElementById('logDayType').value;
    const p = parseInt(document.getElementById('logProtein').value);
    const c = parseInt(document.getElementById('logCarbs').value);
    const f = parseInt(document.getElementById('logFats').value);
    
    // Lift metrics
    const squat = parseInt(document.getElementById('logSquat').value) || 0;
    const bench = parseInt(document.getElementById('logBench').value) || 0;
    const deadlift = parseInt(document.getElementById('logDeadlift').value) || 0;
    
    if(!w || !p || !c || !f) return alert("Please input Weight and Macros consumed!");

    const cals = (p * 4) + (c * 4) + (f * 9);
    const today = new Date().toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'});

    let logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    logs.push({ date: today, weight: w, type: type, calories: cals, squat, bench, deadlift });
    
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    document.getElementById('logForm').reset();
    
    // Reset defaults for lifts
    document.getElementById('logSquat').value = "0";
    document.getElementById('logBench').value = "0";
    document.getElementById('logDeadlift').value = "0";

    renderLogs();
}

function renderLogs() {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = "";

    const labels = [];
    const avgWeightData = [];
    const squatData = [], benchData = [], deadliftData = [];

    logs.forEach((log, index) => {
        let sum = 0, count = 0;
        for (let i = index; i >= 0 && count < 7; i--) {
            sum += logs[i].weight;
            count++;
        }
        const avg = (sum / count).toFixed(1);

        tbody.innerHTML += `<tr>
            <td>${log.date}</td>
            <td>${log.weight}</td>
            <td><strong>${avg}</strong></td>
            <td>${log.type === 'training' ? '🏋️' : '🛌'}</td>
            <td>${log.calories}</td>
            <td>${log.squat}/${log.bench}/${log.deadlift}</td>
        </tr>`;

        labels.push(log.date);
        avgWeightData.push(parseFloat(avg));
        squatData.push(log.squat);
        benchData.push(log.bench);
        deadliftData.push(log.deadlift);
    });

    updateCharts(labels.slice(-7), avgWeightData.slice(-7), squatData.slice(-7), benchData.slice(-7), deadliftData.slice(-7));
    runCoachingEngine();
}

function updateCharts(labels, wData, sData, bData, dData) {
    const ctxW = document.getElementById('weightChart').getContext('2d');
    if(weightChart) weightChart.destroy();
    weightChart = new Chart(ctxW, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: '7-Day Weight Avg', data: wData, borderColor: '#38bdf8', tension: 0.2, fill: false }]
        },
        options: { responsive: true }
    });

    const ctxS = document.getElementById('strengthChart').getContext('2d');
    if(strengthChart) strengthChart.destroy();
    strengthChart = new Chart(ctxS, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Squat', data: sData, borderColor: '#10b981', tension: 0.1 },
                { label: 'Bench', data: bBen = bData, borderColor: '#ef4444', tension: 0.1 },
                { label: 'Deadlift', data: dData, borderColor: '#f59e0b', tension: 0.1 }
            ]
        },
        options: { responsive: true }
    });
}

// --- AUTOMATED CALIBRATION & COACHING ENGINE ---
function runCoachingEngine() {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    const coachingCard = document.getElementById('coachingCard');
    const feedbackText = document.getElementById('coachingFeedback');

    if (logs.length < 7) {
        coachingCard.classList.add('hidden');
        return; // Need at least 7 days of historical logging data to evaluate a trend line smoothly
    }

    coachingCard.classList.remove('hidden');

    // Calculate current average vs previous week average
    let currentWeekSum = 0, prevWeekSum = 0;
    const len = logs.length;

    for(let i = len - 1; i >= len - 3; i--) currentWeekSum += logs[i].weight;
    for(let i = Math.max(0, len - 7); i > Math.max(0, len - 10); i--) prevWeekSum += logs[i].weight;

    const currentAvg = currentWeekSum / 3;
    const prevAvg = prevWeekSum / 3;
    const weightChange = currentAvg - prevAvg;

    // Check strength updates
    const latestLog = logs[len - 1];
    const historicalLog = logs[len - 7] || logs[0];
    const strengthGained = (latestLog.squat > historicalLog.squat) || (latestLog.bench > historicalLog.bench);

    // Coaching decision array trees
    if (Math.abs(weightChange) <= 0.5 && strengthGained) {
        feedbackText.innerHTML = "🎯 <strong>Perfect Body Recomposition in progress!</strong> Your average scale weight is flat, but your compound lifts are advancing. This indicates you are successfully dropping body fat and adding structural lean tissue. Hold your current calorie parameters steady.";
    } else if (weightChange < -1.5) {
        feedbackText.innerHTML = "⚠️ <strong>Weight dropping too fast.</strong> You lost " + Math.abs(weightChange).toFixed(1) + " lbs this week. To prevent muscle breakdown, protect your lean mass by increasing your calculated training day carbohydrates by roughly 25g (+100 calories).";
    } else if (weightChange > 0.8 && !strengthGained) {
        feedbackText.innerHTML = "🛑 <strong>Slight surplus detected.</strong> Your average scale weight has climbed up by " + weightChange.toFixed(1) + " lbs without a parallel increase in lift parameters. Ensure you are accurately tracking your macros and matching your chosen physical activity modifier.";
    } else {
        feedbackText.innerHTML = "🚀 <strong>Recomp tracking baseline stable.</strong> Your 7-day scale metric movement is shifting at a controlled pace (" + (weightChange >= 0 ? "+" : "") + weightChange.toFixed(1) + " lbs). Stick to your progressive overload program and hit your daily high-protein requirements.";
    }
}

function clearData() {
    if(confirm("Wipe all tracking metrics data?")) { localStorage.clear(); location.reload(); }
}

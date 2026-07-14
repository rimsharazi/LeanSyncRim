const PROFILE_KEY = 'recomp_profile';
const LOGS_KEY = 'recomp_logs';
let weightChart = null;
let strengthChart = null;

window.onload = function() {
    loadProfile();
    renderLogs();
    updateUnitLabels();
};

function updateUnitLabels() {
    const system = document.getElementById('unitSystem').value;
    const isImperial = system === 'imperial';

    // Update Input UI Labels dynamically
    document.getElementById('labelWeight').innerHTML = `Weight (${isImperial ? 'lbs' : 'kg'}): <input type="number" step="0.1" id="weight" required value="${isImperial ? '180' : '80'}">`;
    document.getElementById('labelHeight').innerHTML = `Height (${isImperial ? 'inches' : 'cm'}): <input type="number" id="height" required value="${isImperial ? '70' : '175'}">`;
    document.getElementById('labelLogWeight').innerHTML = `Scale Weight (${isImperial ? 'lbs' : 'kg'}): <input type="number" step="0.1" id="logWeight" required>`;
    
    document.getElementById('labelSquat').innerHTML = `Squat (${isImperial ? 'lbs' : 'kg'}): <input type="number" id="logSquat" value="0">`;
    document.getElementById('labelBench').innerHTML = `Bench (${isImperial ? 'lbs' : 'kg'}): <input type="number" id="logBench" value="0">`;
    document.getElementById('labelDeadlift').innerHTML = `Deadlift (${isImperial ? 'lbs' : 'kg'}): <input type="number" id="logDeadlift" value="0">`;

    // Update History Table Header Text
    document.getElementById('thWeight').innerText = `Weight (${isImperial ? 'lbs' : 'kg'})`;
    document.getElementById('thAvgWeight').innerText = `7-Day Avg (${isImperial ? 'lbs' : 'kg'})`;
    document.getElementById('thLifts').innerText = `S / B / D (${isImperial ? 'lbs' : 'kg'})`;
    
    // Rerender existing tables to update visual labels
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    if (logs.length > 0) renderLogs();
}

function calculateRecomp() {
    const system = document.getElementById('unitSystem').value;
    const weightInput = parseFloat(document.getElementById('weight').value);
    const heightInput = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const activity = document.getElementById('activity').value;

    if (!weightInput || !heightInput || !age) {
        return alert("Please fill out all setup fields!");
    }

    let weightKg = 0;
    let heightCm = 0;
    let weightLbs = 0;

    // --- AUDITED UNIT CONVERSION SYSTEM ---
    if (system === 'imperial') {
        weightKg = weightInput * 0.45359237; // Highly precise lbs to kg conversion
        heightCm = heightInput * 2.54;       // Inches to cm
        weightLbs = weightInput;
    } else {
        weightKg = weightInput;
        heightCm = heightInput;              // Already in cm
        weightLbs = weightInput * 2.20462262; // kg to lbs for protein rules
    }

    // --- MIFFLIN-ST JEOR FORMULA ---
    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    if (gender === 'male') {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    // --- ACTIVITY MULTIPLIERS ---
    const multipliers = { 
        sedentary: 1.2, 
        light: 1.375, 
        moderate: 1.55, 
        very: 1.725 
    };
    const tdee = bmr * (multipliers[activity] || 1.375);

    // --- MACRO SPLIT CALCULATION ENGINE ---
    // Training Day: Fueled at full TDEE maintenance
    const trainCals = Math.round(tdee);
    const trainProtein = Math.round(weightLbs * 1.0); // 1g per lb of bodyweight
    const trainFats = Math.round(weightLbs * 0.3);     // 0.3g per lb of bodyweight
    const trainRemainingCals = trainCals - ((trainProtein * 4) + (trainFats * 9));
    const trainCarbs = Math.max(0, Math.round(trainRemainingCals / 4));

    // Rest Day: Fueled at a clean fat loss deficit (-400 kcal)
    const restCals = Math.round(tdee - 400);
    const restProtein = Math.round(weightLbs * 1.0);   // Keep protein high to prevent breakdown
    const restFats = Math.round(weightLbs * 0.35);    // Slightly higher fats on rest days
    const restRemainingCals = restCals - ((restProtein * 4) + (restFats * 9));
    const restCarbs = Math.max(0, Math.round(restRemainingCals / 4));

    // --- SAVE AND RENDER CONFIGURATION ---
    const profile = { 
        system, weightInput, heightInput, age, gender, activity, 
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
    if(saved) {
        const profile = JSON.parse(saved);
        document.getElementById('unitSystem').value = profile.system;
        // Trigger manual layout updates to map inputs safely
        updateUnitLabels();
        document.getElementById('weight').value = profile.weightInput;
        document.getElementById('height').value = profile.heightInput;
        document.getElementById('age').value = profile.age;
        document.getElementById('gender').value = profile.gender;
        document.getElementById('activity').value = profile.activity;
        displayTargets(profile);
    }
}

function logDailyData() {
    const w = parseFloat(document.getElementById('logWeight').value);
    const type = document.getElementById('logDayType').value;
    const p = parseInt(document.getElementById('logProtein').value);
    const c = parseInt(document.getElementById('logCarbs').value);
    const f = parseInt(document.getElementById('logFats').value);
    const squat = parseInt(document.getElementById('logSquat').value) || 0;
    const bench = parseInt(document.getElementById('logBench').value) || 0;
    const deadlift = parseInt(document.getElementById('logDeadlift').value) || 0;
    
    if(!w || !p || !c || !f) return alert("Please fill out metrics parameters!");

    const cals = (p * 4) + (c * 4) + (f * 9);
    const today = new Date().toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'});

    let logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    logs.push({ date: today, weight: w, type: type, calories: cals, squat, bench, deadlift });
    
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    
    // Clear inputs safely while preserving native DOM variables
    document.getElementById('logWeight').value = "";
    document.getElementById('logProtein').value = "";
    document.getElementById('logCarbs').value = "";
    document.getElementById('logFats').value = "";
    document.getElementById('logSquat').value = "0";
    document.getElementById('logBench').value = "0";
    document.getElementById('logDeadlift').value = "0";

    renderLogs();
}

function renderLogs() {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    const system = document.getElementById('unitSystem').value;
    const labelSuffix = system === 'imperial' ? 'lbs' : 'kg';
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
            <td>${log.weight} ${labelSuffix}</td>
            <td><strong>${avg} ${labelSuffix}</strong></td>
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
    const system = document.getElementById('unitSystem').value;
    const unitLabel = system === 'imperial' ? 'lbs' : 'kg';
    
    const ctxW = document.getElementById('weightChart').getContext('2d');
    if(weightChart) weightChart.destroy();
    weightChart = new Chart(ctxW, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: `7-Day Weight Avg (${unitLabel})`, data: wData, borderColor: '#38bdf8', tension: 0.2, fill: false }]
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
                { label: `Squat (${unitLabel})`, data: sData, borderColor: '#10b981', tension: 0.1 },
                { label: `Bench (${unitLabel})`, data: bData, borderColor: '#ef4444', tension: 0.1 },
                { label: `Deadlift (${unitLabel})`, data: dData, borderColor: '#f59e0b', tension: 0.1 }
            ]
        },
        options: { responsive: true }
    });
}

function runCoachingEngine() {
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    const coachingCard = document.getElementById('coachingCard');
    const feedbackText = document.getElementById('coachingFeedback');
    const system = document.getElementById('unitSystem').value;
    const unit = system === 'imperial' ? 'lbs' : 'kg';

    if (logs.length < 7) {
        coachingCard.classList.add('hidden');
        return;
    }

    coachingCard.classList.remove('hidden');

    let currentWeekSum = 0, prevWeekSum = 0;
    const len = logs.length;}

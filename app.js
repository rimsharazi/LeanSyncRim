const PROFILE_KEY = 'recomp_profile';
const LOGS_KEY = 'recomp_logs';
let weightChart = null;
let strengthChart = null;

let dailyProtein = 0;
let dailyCarbs = 0;
let dailyFats = 0;
let dailyCalories = 0;
let dailyBurnedCals = 0;

const internationalFoodDatabase = [
    { name: "Chicken Breast (100g Cooked)", p: 31, c: 0, f: 3.6 },
    { name: "White Rice (1 Cup)", p: 4.3, c: 53, f: 0.4 },
    { name: "Egg (Large Whole)", p: 6.3, c: 0.4, f: 4.8 },
    { name: "Salmon Fillet (100g)", p: 22, c: 0, f: 13 },
    { name: "Avocado (Medium)", p: 2.9, c: 12, f: 21 },
    { name: "Sushi Salmon Roll (6 pieces)", p: 9, c: 32, f: 4.5 },
    { name: "Mexican Street Beef Taco", p: 12, c: 18, f: 7 },
    { name: "Italian Pasta Carbonara (Plate)", p: 25, c: 74, f: 28 },
    { name: "Indian Paneer Tikka Masala (Serving)", p: 14, c: 12, f: 22 },
    { name: "Greek Yogurt 0% Fat (200g)", p: 20, c: 7, f: 0 },
    { name: "Japanese Ramen Noodles (Bowl)", p: 11, c: 65, f: 14 },
    { name: "Protein Powder Whey (1 Scoop)", p: 24, c: 2, f: 1.5 }
];

window.onload = function() {
    loadProfile();
    renderLogs();
    updateUnitLabels();
    calculateRecomp();
};

function updateUnitLabels() {
    const system = document.getElementById('unitSystem').value;
    const isImperial = system === 'imperial';

    const wVal = document.getElementById('weight') ? document.getElementById('weight').value : (isImperial ? '180' : '80');
    const hVal = document.getElementById('height') ? document.getElementById('height').value : (isImperial ? '70' : '175');

    document.getElementById('labelWeight').innerHTML = `Weight (${isImperial ? 'lbs' : 'kg'}): <input type="number" step="0.1" id="weight" oninput="calculateRecomp()" required value="${wVal}">`;
    document.getElementById('labelHeight').innerHTML = `Height (${isImperial ? 'inches' : 'cm'}): <input type="number" id="height" oninput="calculateRecomp()" required value="${hVal}">`;
    document.getElementById('labelLogWeight').innerHTML = `Scale Weight (${isImperial ? 'lbs' : 'kg'}): <input type="number" step="0.1" id="logWeight" required>`;
    document.getElementById('labelLiftWeight').innerHTML = `Weight (${isImperial ? 'lbs' : 'kg'}): <input type="number" id="workoutWeight" value="${isImperial ? '135' : '60'}">`;

    document.getElementById('thWeight').innerText = `Weight (${isImperial ? 'lbs' : 'kg'})`;
    document.getElementById('thAvgWeight').innerText = `7-Day Avg (${isImperial ? 'lbs' : 'kg'})`;
    
    const logs = JSON.parse(localStorage.getItem(LOGS_KEY)) || [];
    if (logs.length > 0) renderLogs();
}

function calculateRecomp() {
    const system = document.getElementById('unitSystem').value;
    const goal = document.getElementById('fitnessGoal').value;
    const weightInput = parseFloat(document.getElementById('weight').value);
    const heightInput = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const activity = document.getElementById('activity').value;

    if (!weightInput || !heightInput || !age) return;

    let weightKg = 0;
    let heightCm = 0;
    let weightLbs = 0;

    if (system === 'imperial') {
        weightKg = weightInput * 0.45359237;
        heightCm = heightInput * 2.54;
        weightLbs = weightInput;
    } else {
        weightKg = weightInput;
        heightCm = heightInput;
        weightLbs = weightInput * 2.20462262;
    }

    let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
    if (gender === 'male') { bmr += 5; } else { bmr -= 161; }

    const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
    const tdee = bmr * (multipliers[activity] || 1.375);

    let trainOffset = 0;
    let restOffset = 0;
    let proteinMultiplier = 1.0;

    if (goal === 'cut') {
        trainOffset = -500;
        restOffset = -600;  
        proteinMultiplier = 1.15;
    } else if (goal === 'bulk') {
        trainOffset = 300;
        restOffset = 100;   
        proteinMultiplier = 0.95;
    } else {
        trainOffset = 0;    
        restOffset = -300;  
        proteinMultiplier = 1.05;
    }

    const trainCals = Math.round(tdee + trainOffset);
    const trainProtein = Math.round(weightLbs * proteinMultiplier);
    const trainFats = Math.round(weightLbs * 0.3);
    const trainCarbs = Math.max(0, Math.round((trainCals - ((trainProtein * 4) + (trainFats * 9))) / 4));

    const restCals = Math.round(tdee + restOffset);
    const restProtein = Math.round(weightLbs * proteinMultiplier);
    const restFats = Math.round(weightLbs * 0.35);
    const restCarbs = Math.max(0, Math.round((restCals - ((restProtein * 4) + (restFats * 9))) / 4));

    const profile = { 
        system, goal, weightInput, heightInput, age, gender, activity, 
        trainCals, trainProtein, trainCarbs, trainFats, restCals, restProtein, restCarbs, restFats
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
        if(profile.goal) document.getElementById('fitnessGoal').value = profile.goal;
        updateUnitLabels();
        document.getElementById('weight').value = profile.weightInput;
        document.getElementById('height').value = profile.heightInput;
        document.getElementById('age').value = profile.age;
        document.getElementById('gender').value = profile.gender;
        document.getElementById('activity').value = profile.activity;
    }
}

function searchFoodDatabase() {
    const query = document.getElementById('foodSearchInput').value.toLowerCase();
    const dropdown = document.getElementById('searchResultsDropdown');
    dropdown.innerHTML = "";

    if (!query) {
        dropdown.classList.add('hidden');
        return;
    }

    const matches = internationalFoodDatabase.filter(food => food.name.toLowerCase().includes(query));

    if (matches.length === 0) {
        dropdown.innerHTML = `<div class="search-item">No matches found. Build via Custom inputs.</div>`;
    } else {
        matches.forEach(food => {
            const div = document.createElement('div');
            div.className = "search-item";
            div.innerHTML = `✨ <strong>Add:</strong> ${food.name} <span style="color:#94a3b8; font-size:12px;">(P:${food.p}g C:${food.c}g F:${food.f}g)</span>`;
            div.onclick = function() {
                addTrackedFood(food.name, food.p, food.c, food.f);
                document.getElementById('foodSearchInput').value = "";
                dropdown.classList.add('hidden');
            };
            dropdown.appendChild(div);
        });
    }
    dropdown.classList.remove('hidden');
}

function addCustomFoodMacros() {
    const name = document.getElementById('customFoodName').value || "Custom Food Entry";
    const p = parseFloat(document.getElementById('customFoodProtein').value) || 0;
    const c = parseFloat(document.getElementById('customFoodCarbs').value) || 0;
    const f = parseFloat(document.getElementById('customFoodFats').value) || 0;

    addTrackedFood(name, p, c, f);
    
    document.getElementById('customFoodName').value = "";
    document.getElementById('customFoodProtein').value = "0";
    document.getElementById('customFoodCarbs').value = "0";
    document.getElementById('customFoodFats').value = "0";
}

function addTrackedFood(name, p, c, f) {
    dailyProtein += p;
    dailyCarbs += c;
    dailyFats += f;
    dailyCalories += (p * 4) + (c * 4) + (f * 9);

    document.getElementById('totalLoggedProtein').innerText = Math.round(dailyProtein);
    document.getElementById('totalLoggedCarbs').innerText = Math.round(dailyCarbs);
    document.getElementById('totalLoggedFats').innerText = Math.round(dailyFats);
    document.getElementById('totalLoggedCalories').innerText = Math.round(dailyCalories);
}

function addExerciseToWorkout() {
    const metRate = parseFloat(document.getElementById('workoutType').value);
    const name = document.getElementById('workoutName').value || "Exercise Session";
    const sets = parseInt(document.getElementById('workoutSets').value) || 3;
    const reps = parseInt(document.getElementById('workoutReps').value) || 10;
    const duration = parseFloat(document.getElementById('workoutDuration').value) || 15;

    const system = document.getElementById('unitSystem').value;
    const profileWeight = parseFloat(document.getElementById('weight').value) || 150;
    const massKg = system === 'imperial' ? (profileWeight * 0.45359237) : profileWeight;

    const computedBurn = Math.round(metRate * 3.5 * (massKg / 200) * duration);
    dailyBurnedCals += computedBurn;

    document.getElementById('totalWorkoutBurn').innerText = dailyBurnedCals;

    const routineList = document.getElementById('routineList');
    const div = document.createElement('div');
    div.style.padding = "10px 0";
    div.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
}

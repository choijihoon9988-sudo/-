import { 
    renderGarden, 
    showChallengeModal, 
    hideChallengeModal,
    showGardenView,
    showDashboardView,
    renderMemoryDashboard,
    renderCurveGraph,
    updateCurveGraph
} from './ui.js';

// --- State Management ---
let plants = [];
let currentPlant = null;
let chartInstance = null;

// --- Core Logic ---
function loadPlants() {
    const storedPlants = localStorage.getItem('knowledgePlants');
    plants = storedPlants ? JSON.parse(storedPlants) : [];
    
    // Add default plants if empty
    if (plants.length === 0) {
        plants = [
            { id: 1, title: "넛지의 '디폴트 설정' 원칙...", sourceBook: "넛지 (Nudge)", question: "넛지의 '디폴트 설정' 원칙이란 무엇이며, 실생활 예시는?", answer: "기본으로 설정된 값을 바꾸지 않으려는 경향성을 이용하는 것.", reviews: [{date: "2025-09-26T00:00:00.000Z", confidence: 'confident'}], strength: 3 },
            { id: 2, title: "역행자의 '자의식 해체' 개념...", sourceBook: "역행자", question: "역행자에서 말하는 '자의식 해체'란 무엇이며, 왜 중요한가?", answer: "자신의 생각과 감정이 절대적인 것이 아님을 인지하고 객관적으로 바라보는 것.", reviews: [{date: "2025-09-24T00:00:00.000Z", confidence: 'unsure'}], strength: 2 },
            { id: 3, title: "인간이 저지르는 대표적인 실수 3가지...", sourceBook: "넛지 (Nudge)", question: "넛지 1부에서 설명하는 인간의 대표적인 실수 3가지는?", answer: "기준점 설정, 편향, 틀짜기 등이 있다.", reviews: [{date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), confidence: 'confident'}], strength: 5 },
        ];
        localStorage.setItem('knowledgePlants', JSON.stringify(plants));
    }

    // Ensure reviews array exists for backward compatibility
    plants.forEach(p => p.reviews = p.reviews || [{date: new Date().toISOString(), confidence: 'confident'}]);
    
    plants.forEach(calculatePlantState);
}

function calculatePlantState(plant) {
    const now = new Date();
    const lastReviewed = new Date(plant.reviews[plant.reviews.length - 1].date);
    const daysSinceReview = (now - lastReviewed) / (1000 * 60 * 60 * 24);

    // Spacing algorithm: interval doubles with each successful review (simplified)
    const needyThreshold = 1 * Math.pow(2, plant.strength - 1);
    const overdueThreshold = 2.5 * Math.pow(2, plant.strength - 1);

    if (daysSinceReview > overdueThreshold) plant.state = 'overdue';
    else if (daysSinceReview > needyThreshold) plant.state = 'needy';
    else plant.state = 'healthy';

    // Determine memory stage based on strength
    if(plant.strength >= 5) plant.memoryStage = '장기 기억';
    else if (plant.strength >= 2) plant.memoryStage = '장기 기억 전환 중';
    else plant.memoryStage = '단기 기억';
}

function updateGardenStats() {
    const total = plants.length;
    const needy = plants.filter(p => p.state === 'needy' || p.state === 'overdue').length;
    document.getElementById('total-plants').textContent = total;
    document.getElementById('needy-plants').textContent = needy;
}

function showPlantDashboard(plant) {
    currentPlant = plant;
    renderMemoryDashboard(plant,
        () => showGardenView(), // onBack
        () => startReview(plant), // onReview
        () => simulateReview(plant) // onSimulate
    );
    chartInstance = renderCurveGraph('memory-curve-chart', plant, chartInstance);
    showDashboardView();
}

function startReview(plant) {
    showChallengeModal(plant, (confidence) => {
        plant.reviews.push({ date: new Date().toISOString(), confidence });
        
        if (confidence === 'confident') plant.strength += 1;
        else if (confidence === 'guess') plant.strength = Math.max(1, plant.strength - 1);
        
        const plantIndex = plants.findIndex(p => p.id === plant.id);
        if(plantIndex > -1) plants[plantIndex] = plant;
        localStorage.setItem('knowledgePlants', JSON.stringify(plants));

        hideChallengeModal();
        calculatePlantState(plant); // Recalculate state after review
        showPlantDashboard(plant); // Refresh dashboard with new data
    });
}

function simulateReview(plant) {
    const simulatedPlant = JSON.parse(JSON.stringify(plant)); // Deep copy
    
    // Create a temporary simulated review
    const simulatedReview = { date: new Date().toISOString(), confidence: 'confident' };
    simulatedPlant.reviews.push(simulatedReview);
    simulatedPlant.strength += 1;

    updateCurveGraph(chartInstance, simulatedPlant, '오늘 복습 시뮬레이션');
}


function startWaterAllSession() {
    const needyPlants = plants.filter(p => p.state === 'needy' || p.state === 'overdue')
                              .sort((a, b) => new Date(a.reviews[a.reviews.length - 1].date) - new Date(b.reviews[b.reviews.length - 1].date));
    
    if (needyPlants.length === 0) {
        alert('모든 식물들이 건강합니다! 돌봄이 필요한 식물이 없습니다.');
        return;
    }
    showPlantDashboard(needyPlants[0]);
}

export function initializeEbbinghaus() {
    loadPlants();
    renderGarden(plants, showPlantDashboard);
    updateGardenStats();
    showGardenView();
    
    document.getElementById('garden-water-all-btn').onclick = startWaterAllSession;
}
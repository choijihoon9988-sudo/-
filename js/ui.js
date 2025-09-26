// --- Chart.js 인스턴스 ---
let chartInstance = null;

// --- View Toggling ---
export const switchView = (viewName, navButtons) => {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewName).classList.add('active');
    navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
};

export const showLoader = (show) => {
    document.getElementById('loader').style.display = show ? 'flex' : 'none';
};

// --- Metis Session UI ---
export const switchStep = (stepNumber) => {
    document.querySelectorAll('#metis-session .step').forEach(step => step.classList.remove('active'));
    const el = document.getElementById(`step-${stepNumber}`);
    if (el) {
        el.classList.add('active');
        document.getElementById('step-title').textContent = el.querySelector('h4').textContent;
    }
};

export const updateTimerDisplay = (timeLeft) => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const populateComparisonView = (userInputs, aiData) => {
    document.getElementById('reveal-my-thoughts').textContent = userInputs.brainDump || "내용 없음";
    document.getElementById('reveal-my-prediction').textContent = userInputs.aiPrediction || "내용 없음";
    document.getElementById('reveal-ai-feedback').textContent = aiData.feedback;
    document.getElementById('reveal-expert-summary').textContent = aiData.expertSummary;
};

// --- Knowledge Garden UI ---
export const renderGarden = (plants, onPlantClick) => {
    const container = document.getElementById('garden-container');
    container.innerHTML = '';
    if (plants.length === 0) {
        container.innerHTML = '<p>아직 심은 지식 식물이 없습니다. 메티스 세션을 통해 첫 씨앗을 심어보세요!</p>';
        return;
    }
    plants.forEach(plant => {
        const plantEl = document.createElement('div');
        plantEl.className = `knowledge-plant plant-${plant.state}`;
        plantEl.innerHTML = `<div class="plant-title">${plant.title}</div><div class="plant-source">출처: ${plant.sourceBook}</div><div class="plant-status">상태: ${plant.state === 'healthy' ? '건강함' : (plant.state === 'needy' ? '돌봄 필요' : '매우 시급')}</div>`;
        plantEl.onclick = () => onPlantClick(plant);
        container.appendChild(plantEl);
    });
};

export const showGardenView = () => {
    document.getElementById('garden-view').style.display = 'block';
    document.getElementById('dashboard-view').style.display = 'none';
};

export const showDashboardView = () => {
    document.getElementById('garden-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
};

export const renderMemoryDashboard = (plant, onBack, onReview, onSimulate) => {
    document.getElementById('dashboard-plant-title').textContent = plant.title;
    document.getElementById('back-to-garden-btn').onclick = onBack;
    document.getElementById('start-review-btn').onclick = onReview;
    document.getElementById('simulate-review-btn').onclick = onSimulate;
    
    const lastReviewedDate = new Date(plant.reviews[plant.reviews.length - 1].date).toLocaleDateString();
    document.getElementById('dashboard-stats').innerHTML = `
        <p><strong>기억 상태:</strong> ${plant.memoryStage}</p>
        <p><strong>기억 강도:</strong> 레벨 ${plant.strength}</p>
        <p><strong>최근 복습일:</strong> ${lastReviewedDate}</p>
    `;
};

// --- Graph Rendering Logic (using Chart.js) ---
const generateCurveData = (startDate, strength, days) => {
    const data = [];
    const decayFactor = 0.5 / Math.log(strength + 1.5); // 강도가 높을수록 천천히 감소
    for (let i = 0; i <= days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const retention = 100 * Math.exp(-i * decayFactor);
        data.push({ x: date, y: retention });
    }
    return data;
};

export const renderCurveGraph = (canvasId, plant) => {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const datasets = [];

    // 1. Plot historical and current predicted curve
    const lastReviewDate = new Date(plant.reviews[plant.reviews.length - 1].date);
    datasets.push({
        label: '현재 기억 곡선',
        data: generateCurveData(lastReviewDate, plant.strength, 30),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.4,
        pointRadius: 0
    });

    // 2. Plot review points
    const reviewPoints = plant.reviews.map(r => ({ x: new Date(r.date), y: 100 }));
    datasets.push({
        label: '복습 시점',
        data: reviewPoints,
        backgroundColor: 'rgb(54, 162, 235)',
        pointRadius: 6,
        pointHoverRadius: 8,
        showLine: false
    });

    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day' },
                    title: { display: true, text: '시간' }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: '기억 보유량 (%)' }
                }
            },
            plugins: {
                legend: { position: 'top' },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 0,
                            yMax: 100,
                            xMin: new Date(),
                            xMax: new Date(),
                            borderColor: 'rgb(255, 99, 132)',
                            borderWidth: 2,
                            label: { content: '현재', enabled: true, position: 'start' }
                        }
                    }
                }
            }
        }
    });
    return chartInstance;
};

export const updateCurveGraph = (chart, simulatedPlant, label) => {
    const lastReviewDate = new Date(simulatedPlant.reviews[simulatedPlant.reviews.length - 1].date);
    const newCurveData = generateCurveData(lastReviewDate, simulatedPlant.strength, 30);
    
    // Remove previous simulation if exists
    const existingSimIndex = chart.data.datasets.findIndex(ds => ds.label.includes('시뮬레이션'));
    if (existingSimIndex > -1) {
        chart.data.datasets.splice(existingSimIndex, 1);
    }

    chart.data.datasets.push({
        label: label,
        data: newCurveData,
        borderColor: 'rgb(255, 99, 132)',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0
    });
    chart.update();
};


// --- (기존 Challenge Modal, Goal Navigator Modal UI 함수는 이전과 동일) ---
const challengeModalOverlay = document.getElementById('challenge-modal-overlay'); const challengeModalContent = document.getElementById('challenge-modal');
export const showChallengeModal = (plant, onComplete) => { challengeModalContent.innerHTML = `<h3 class="challenge-title">🌿 지식 돌보기</h3><p class="challenge-description">"${plant.sourceBook}"에서 배운 내용을 떠올려보세요.</p><div class="challenge-prompt">${plant.question}</div><textarea id="challenge-answer" placeholder="당신의 언어로 자유롭게 설명해보세요..."></textarea><div class="confidence-rating"><p>이번 답변에 얼마나 확신했나요?</p><div class="confidence-buttons"><button class="btn" data-confidence="confident">확신함</button><button class="btn" data-confidence="unsure">긴가민가함</button><button class="btn" data-confidence="guess">추측함</button></div></div><div class="challenge-controls"><button id="challenge-cancel-btn" class="btn">취소</button><button id="challenge-submit-btn" class="btn btn-primary" disabled>답변 제출</button></div>`; const submitBtn = document.getElementById('challenge-submit-btn'); let selectedConfidence = null; document.querySelectorAll('.confidence-buttons .btn').forEach(btn => { btn.onclick = () => { document.querySelectorAll('.confidence-buttons .btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); selectedConfidence = btn.dataset.confidence; submitBtn.disabled = false; } }); document.getElementById('challenge-cancel-btn').onclick = hideChallengeModal; document.getElementById('challenge-submit-btn').onclick = () => onComplete(selectedConfidence); challengeModalOverlay.style.display = 'flex'; };
export const hideChallengeModal = () => { challengeModalOverlay.style.display = 'none'; };
challengeModalOverlay.onclick = (e) => { if (e.target === challengeModalOverlay) { hideChallengeModal(); } };
const goalModalOverlay = document.getElementById('goal-navigator-modal-overlay'); const goalModalContent = document.getElementById('goal-navigator-content');
export const showGoalNavigator = () => { goalModalOverlay.style.display = 'flex'; };
export const hideGoalNavigator = () => { goalModalOverlay.style.display = 'none'; };
goalModalOverlay.onclick = (e) => { if (e.target === goalModalOverlay) { hideGoalNavigator(); } };
export const renderGoalNavigatorStep = (step, data) => { let content = ''; switch (step) { case 'modeSelection': content = `<div class="modal-header"><h3>AI 목표 내비게이터</h3><p><strong>${data.bookTitle}</strong>에 대한 학습 목표 설정을 시작합니다.<br>어떤 방식으로 목표를 설정하시겠습니까?</p></div><div class="mode-selection-container"><div class="mode-select-btn" data-mode="explorer"><div class="icon">🧭</div><h4>탐험가 모드</h4><p>AI가 생성한 목표 팩에서<br>체계적으로 선택합니다.</p></div><div class="mode-select-btn" data-mode="solver"><div class="icon">🛠️</div><h4>해결사 모드</h4><p>해결하고 싶은 문제를 입력하고<br>맞춤형 목표를 생성합니다.</p></div></div>`; break; case 'explorer': content = `<div class="modal-header"><h3>🧭 탐험가 모드</h3><p>AI가 생성한 목표 팩입니다. 가장 마음에 드는 목표를 선택하세요.</p></div><div class="goal-pack-container">${data.goalPack.map(goal => `<div class="goal-card" data-level="${goal.level}" data-text="${goal.text}"><strong>[레벨 ${goal.level}]</strong> ${goal.text}</div>`).join('')}</div>`; break; case 'solver': content = `<div class="modal-header"><h3>🛠️ 해결사 모드</h3><p>이 책을 통해 해결하고 싶은 당신의 문제를 구체적으로 알려주세요.</p></div><div class="solver-chat"><textarea id="solver-problem-input" placeholder="예: 곧 중요한 면접이 있는데, 면접관의 의도를 파악하고 좋은 인상을 남기고 싶어요."></textarea></div><div class="modal-controls"><button id="solver-submit-problem" class="btn btn-primary">문제 제출하고 목표 생성</button></div>`; break; case 'architect': content = `<div class="modal-header"><h3>✅ 목표 확정 및 개인화</h3><p>AI가 제안한 목표입니다. 자유롭게 수정하여 당신만의 최종 미션으로 확정하세요.</p></div><div class="architect-editor"><textarea id="architect-goal-editor">${data.text}</textarea></div><div class="modal-controls"><button id="architect-confirm-goal" class="btn btn-primary">나의 메인 목표로 설정</button></div>`; break; } goalModalContent.innerHTML = content; };
import { switchStep, updateTimerDisplay, populateComparisonView, showLoader } from './ui.js';
import { getFeedback, getExpertSummary } from './api.js';

let state = {};
const initialState = {
    currentStep: 1,
    userInputs: {
        prediction: '',
        brainDump: '',
        aiPrediction: '',
        gap: '',
        finalWriting: ''
    },
    timerInterval: null,
    timeLeft: 25 * 60
};

function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateTimerDisplay(state.timeLeft);
        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            alert("집중 독서 시간이 종료되었습니다!");
        }
    }, 1000);
}

function resetSession() {
    clearInterval(state.timerInterval);
    state = JSON.parse(JSON.stringify(initialState)); // Deep copy
    updateTimerDisplay(state.timeLeft);
}

async function handleNextStep(nextStep) {
    const currentStep = state.currentStep;

    // Save input from current step
    if (currentStep === 1) state.userInputs.prediction = document.getElementById('prediction-input').value;
    if (currentStep === 3) state.userInputs.brainDump = document.getElementById('braindump-input').value;
    if (currentStep === 4) state.userInputs.aiPrediction = document.getElementById('ai-prediction-input').value;
    if (currentStep === 6) state.userInputs.gap = document.getElementById('gap-input').value;

    // Handle special actions for next steps
    if (nextStep === 2) {
        startTimer();
    }
    
    if (nextStep === 5) {
        showLoader(true);
        const [feedback, expertSummary] = await Promise.all([
            getFeedback(state.userInputs.brainDump),
            getExpertSummary()
        ]);
        populateComparisonView(state.userInputs, { feedback, expertSummary });
        showLoader(false);
    }
    
    state.currentStep = nextStep;
    switchStep(nextStep);
}

function plantNewSeed() {
    const plants = JSON.parse(localStorage.getItem('knowledgePlants')) || [];
    const newPlant = {
        id: Date.now(),
        title: state.userInputs.gap.substring(0, 40) + '...', // Use the gap as the title
        sourceBook: document.querySelector('#main-book-slot h4').textContent, // Get book title from dashboard
        question: `다음 질문에 대해 설명하세요: "${state.userInputs.gap}"`,
        answer: state.userInputs.finalWriting,
        lastReviewed: new Date().toISOString(),
        strength: 1, // 1: Seedling, increases with reviews
    };

    // Prevent duplicate plants based on the core question (gap)
    if (!plants.some(p => p.question.includes(state.userInputs.gap))) {
        plants.push(newPlant);
        localStorage.setItem('knowledgePlants', JSON.stringify(plants));
        console.log('New seed planted:', newPlant);
    }
}


export function initializeSession() {
    resetSession();
    
    // 세션 시작 시 대시보드의 현재 목표를 가져와 표시
    const currentGoalHtml = document.getElementById('main-book-goal').innerHTML;
    document.getElementById('session-goal-display').innerHTML = currentGoalHtml;

    switchStep(1);

    // Attach event listeners for this session
    document.querySelectorAll('#metis-session .next-step-btn').forEach(btn => {
        btn.onclick = () => handleNextStep(parseInt(btn.dataset.next, 10));
    });

    document.getElementById('back-to-dashboard-btn').onclick = () => {
        if (confirm("세션을 중단하고 대시보드로 돌아가시겠습니까?")) {
            const event = new CustomEvent('sessionComplete');
            document.dispatchEvent(event);
        }
    };

    document.getElementById('finish-session-btn').onclick = () => {
        state.userInputs.finalWriting = document.getElementById('final-writing-input').value;
        state.userInputs.gap = document.getElementById('gap-input').value; 
        
        if (!state.userInputs.gap || !state.userInputs.finalWriting) {
            alert('핵심 질문과 체화 글쓰기를 모두 작성해야 씨앗을 심을 수 있습니다.');
            return;
        }

        plantNewSeed();
        alert("지식 정원에 새로운 씨앗을 심었습니다!");

        const event = new CustomEvent('sessionComplete');
        document.dispatchEvent(event);
    };
}

export function handleSessionCompletion() {
    console.log("Session state at completion:", state);
    resetSession();
}
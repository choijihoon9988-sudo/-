import { showGoalNavigator, hideGoalNavigator, renderGoalNavigatorStep } from './ui.js';

let state = {};

// --- Mock Data ---
const getGoalPackForBook = (bookTitle) => {
    // In a real app, this would be a sophisticated analysis of the table of contents.
    return [
        { level: 1, text: `'${bookTitle}'에서 '핵심 개념 A'의 정의를 찾고, 실생활 사례 1가지 찾아보기.` },
        { level: 2, text: `'${bookTitle}'의 1부에서 설명하는 '주요 원칙 3가지'를 활용하여, 나의 현재 문제를 해결할 구체적인 액션 플랜 작성하기.` },
        { level: 2, text: `'${bookTitle}'의 내용을 바탕으로, 동료/친구에게 특정 주제를 5분간 설명하는 스크립트 작성하기.` },
        { level: 3, text: `'${bookTitle}' 저자의 핵심 주장에 대한 가장 강력한 반론을 한 문단으로 제시하기.` },
    ];
};

const getSolverGoal = (bookTitle, problem) => {
    // Simulates AI matching problem to book content
    return {
        level: 2,
        text: `'${bookTitle}'의 2장과 5장 내용을 활용하여, '${problem.substring(0, 20)}...' 문제를 해결하기 위한 3가지 실행 가능한 전략을 도출하시오.`
    };
};

// --- Event Handlers & Logic ---
function attachEventListeners() {
    const modeButtons = document.querySelectorAll('.mode-select-btn');
    if (modeButtons) {
        modeButtons.forEach(btn => {
            btn.onclick = () => handleModeSelection(btn.dataset.mode);
        });
    }

    const goalCards = document.querySelectorAll('.goal-card');
    if (goalCards) {
        goalCards.forEach(card => {
            card.onclick = () => {
                state.selectedGoal = { level: card.dataset.level, text: card.dataset.text };
                renderStep('architect', state.selectedGoal);
            };
        });
    }
    
    const solverSubmitBtn = document.getElementById('solver-submit-problem');
    if(solverSubmitBtn) {
        solverSubmitBtn.onclick = () => {
            const problem = document.getElementById('solver-problem-input').value;
            if (!problem.trim()) {
                alert('해결하고 싶은 문제를 입력해주세요.');
                return;
            }
            state.selectedGoal = getSolverGoal(state.bookTitle, problem);
            renderStep('architect', state.selectedGoal);
        };
    }

    const architectConfirmBtn = document.getElementById('architect-confirm-goal');
    if (architectConfirmBtn) {
        architectConfirmBtn.onclick = () => {
            const finalText = document.getElementById('architect-goal-editor').value;
            state.selectedGoal.text = finalText;
            
            // Dispatch event to notify main.js
            const event = new CustomEvent('goalSelected', { detail: state.selectedGoal });
            document.dispatchEvent(event);

            hideGoalNavigator();
        };
    }
}

function renderStep(stepName, data = {}) {
    renderGoalNavigatorStep(stepName, data);
    attachEventListeners();
}

function handleModeSelection(mode) {
    state.mode = mode;
    if (mode === 'explorer') {
        renderStep('explorer', { goalPack: getGoalPackForBook(state.bookTitle) });
    } else if (mode === 'solver') {
        renderStep('solver');
    }
}

export function initializeGoalNavigator() {
    const bookTitle = document.getElementById('book-title-for-goal').value;
    if (!bookTitle.trim()) {
        alert('목표를 설정할 책 제목을 입력해주세요.');
        return;
    }

    state = {
        bookTitle: bookTitle,
        mode: null,
        selectedGoal: null,
    };
    
    renderStep('modeSelection', { bookTitle });
    showGoalNavigator();
}
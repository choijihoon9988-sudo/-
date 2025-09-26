document.addEventListener('DOMContentLoaded', () => {
    // STATE MANAGEMENT
    let db = {
        mainBook: null,
        subBooks: [],
        goals: [],
        sessions: [],
        reviewQueue: [],
        assets: [],
        lastSessionDate: null,
    };

    // DOM ELEMENTS
    const views = document.querySelectorAll('.view');
    const navButtons = {
        dashboard: document.getElementById('nav-dashboard'),
        review: document.getElementById('nav-review'),
        writing: document.getElementById('nav-writing'),
        lab: document.getElementById('nav-lab'),
    };

    const dashboard = {
        mainBookSlot: document.getElementById('main-book-content'),
        subBookList: document.getElementById('sub-book-list'),
        addBookBtn: document.getElementById('add-book-btn'),
        startSessionBtn: document.getElementById('start-session-btn'),
        journeyWidget: document.getElementById('journey-widget'),
    };
    
    const reviewView = { list: document.getElementById('review-list'), };
    const writingView = {
        sidebar: document.getElementById('knowledge-cards-container'),
        title: document.getElementById('writing-title'),
        editor: document.getElementById('main-editor'),
        aiDraftBtn: document.getElementById('ai-draft-btn'),
        saveAssetBtn: document.getElementById('save-asset-btn'),
    };
    const sessionView = document.getElementById('session-view');
    const labView = {
        goalBoard: document.getElementById('goal-board'),
        synapseMapContainer: document.getElementById('synapse-map')
    };

    const goalModal = {
        element: document.getElementById('goal-modal'),
        closeBtn: document.querySelector('#goal-modal .close-button'),
        saveBtn: document.getElementById('save-goal-btn'),
        levelSelect: document.getElementById('goal-level'),
        textInput: document.getElementById('goal-text'),
    };

    const curiosityModal = {
        element: document.getElementById('curiosity-modal'),
        closeBtn: document.querySelector('#curiosity-modal .close-button'),
        question: document.getElementById('curiosity-question'),
        answer: document.getElementById('curiosity-answer'),
        startBtn: document.getElementById('start-learning-btn'),
    };

    // SESSION STATE & CONSTANTS
    let sessionState = {
        currentStage: null,
        timer: null,
        timeLeft: 0,
        currentGoal: null,
        sessionData: {},
    };

    const REVIEW_INTERVALS = { FORGOT: 1, GOOD: 7, PERFECT_MULTIPLIER: 2, INITIAL_INTERVAL: 1 };

    // =================================================================
    // INITIALIZATION & DATA HANDLING
    // =================================================================

    function loadFromLocalStorage() {
        const savedDB = localStorage.getItem('projectMetisDB');
        if (savedDB) { db = JSON.parse(savedDB); }
    }

    function saveToLocalStorage() {
        localStorage.setItem('projectMetisDB', JSON.stringify(db));
    }

    function init() {
        loadFromLocalStorage();
        setupEventListeners();
        navigateTo('dashboard');
    }

    // =================================================================
    // VIEW ROUTING
    // =================================================================

    function navigateTo(viewName) {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(`${viewName}-view`).classList.add('active');
        if (viewName === 'dashboard') renderDashboard();
        if (viewName === 'review') renderReviewDeck();
        if (viewName === 'writing') renderWritingDesk();
        if (viewName === 'lab') renderLab();
    }

    // =================================================================
    // EVENT LISTENERS
    // =================================================================

    function setupEventListeners() {
        navButtons.dashboard.addEventListener('click', () => navigateTo('dashboard'));
        navButtons.review.addEventListener('click', () => navigateTo('review'));
        navButtons.writing.addEventListener('click', () => navigateTo('writing'));
        navButtons.lab.addEventListener('click', () => navigateTo('lab'));
        
        dashboard.addBookBtn.addEventListener('click', addBook);
        dashboard.startSessionBtn.addEventListener('click', openCuriosityModal);

        goalModal.closeBtn.addEventListener('click', closeGoalModal);
        goalModal.saveBtn.addEventListener('click', saveGoal);
        
        curiosityModal.closeBtn.addEventListener('click', closeCuriosityModal);
        curiosityModal.startBtn.addEventListener('click', startSession);

        window.addEventListener('click', (event) => {
            if (event.target === goalModal.element) closeGoalModal();
            if (event.target === curiosityModal.element) closeCuriosityModal();
        });
        
        writingView.aiDraftBtn.addEventListener('click', generateAIDraft);
        writingView.saveAssetBtn.addEventListener('click', saveWritingAsset);

        // Kanban Board Listeners
        const board = labView.goalBoard;
        board.addEventListener('dragstart', e => { if (e.target.classList.contains('kanban-card')) e.target.classList.add('dragging'); });
        board.addEventListener('dragend', e => { if (e.target.classList.contains('kanban-card')) e.target.classList.remove('dragging'); });
        board.addEventListener('dragover', e => {
            e.preventDefault();
            const column = e.target.closest('.kanban-column');
            if (column) {
                document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
                column.classList.add('drag-over');
            }
        });
        board.addEventListener('dragleave', e => { const col = e.target.closest('.kanban-column'); if(col) col.classList.remove('drag-over'); });
        board.addEventListener('drop', e => {
            e.preventDefault();
            document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
            const column = e.target.closest('.kanban-column');
            const draggingCard = document.querySelector('.kanban-card.dragging');
            if (column && draggingCard) {
                column.appendChild(draggingCard);
                const goalId = parseInt(draggingCard.dataset.goalId, 10);
                const newStatus = column.dataset.status;
                const goal = db.goals.find(g => g.id === goalId);
                if (goal && goal.status !== newStatus) {
                    const oldStatus = goal.status;
                    goal.status = newStatus;
                    if (newStatus === 'completed' && oldStatus !== 'completed') {
                        scheduleInitialReviews(goalId);
                    }
                    saveToLocalStorage();
                    renderSynapseMap();
                }
            }
        });
    }

    // =================================================================
    // RENDER FUNCTIONS
    // =================================================================
    
    function renderDashboard() {
        renderJourneyWidget();
        if (db.mainBook) {
            const currentGoal = db.goals.find(g => g.bookId === db.mainBook.id && g.status === 'in-progress');
            dashboard.mainBookSlot.innerHTML = `<img src="${db.mainBook.cover}" alt="${db.mainBook.title}" class="book-cover"><div class="book-info"><h4>${db.mainBook.title}</h4><div class="book-goal">${currentGoal ? `<span class="level-badge">레벨 ${currentGoal.level}</span><p>"${currentGoal.text}"</p>` : '<p>설정된 목표가 없습니다.</p>'}</div><button id="set-goal-btn">목표 설정/변경</button></div>`;
            document.getElementById('set-goal-btn').addEventListener('click', openGoalModal);
            dashboard.startSessionBtn.disabled = !currentGoal;
            sessionState.currentGoal = currentGoal;
        } else {
            dashboard.mainBookSlot.innerHTML = `<p>메인북을 추가해주세요.</p>`;
            dashboard.startSessionBtn.disabled = true;
        }
        dashboard.subBookList.innerHTML = '';
        db.subBooks.forEach(book => {
            const bookEl = document.createElement('div');
            bookEl.className = 'sub-book-item';
            bookEl.innerHTML = `<img src="${book.cover}" alt="${book.title}" class="book-cover"><p>${book.title}</p>`;
            dashboard.subBookList.appendChild(bookEl);
        });
    }

    function renderJourneyWidget() {
        const completedGoals = db.goals.filter(g => g.status === 'completed').length;
        const totalSessionTime = db.sessions.reduce((total, session) => {
            const duration = (new Date(session.endTime) - new Date(session.startTime)) / (1000 * 60);
            return total + duration;
        }, 0);

        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if(db.lastSessionDate === today || db.lastSessionDate === yesterday){
             // simple streak logic for demo
            streak = (localStorage.getItem('metisStreak') || 1);
        } else {
            localStorage.setItem('metisStreak', 0);
        }

        dashboard.journeyWidget.innerHTML = `
            <div class="stat-item">
                <span class="label">완료한 목표</span>
                <span class="value">${completedGoals}</span>
            </div>
            <div class="stat-item">
                <span class="label">총 학습 시간</span>
                <span class="value">${Math.round(totalSessionTime)}분</span>
            </div>
            <div class="stat-item">
                <span class="label">연속 학습일 🔥</span>
                <span class="value">${streak}</span>
            </div>
        `;
    }
    
    function renderWritingDesk() { /* ... unchanged ... */ }
    function renderLab() { /* ... unchanged ... */ }
    function renderGoalBoard() { /* ... unchanged ... */ }
    function renderSynapseMap() { /* ... unchanged ... */ }
    function renderReviewDeck() { /* ... unchanged ... */ }

    // =================================================================
    // CURIOSITY MODAL (NEW)
    // =================================================================
    function openCuriosityModal() {
        if (!sessionState.currentGoal) return;
        const question = `오늘의 목표는 '${sessionState.currentGoal.text}' 입니다. 이 목표를 달성하면 무엇을 알게 될 것 같나요? 당신의 생각을 한 문장으로 예측해보세요.`;
        curiosityModal.question.textContent = question;
        curiosityModal.answer.value = '';
        curiosityModal.element.style.display = 'block';
    }

    function closeCuriosityModal() {
        curiosityModal.element.style.display = 'none';
    }

    // =================================================================
    // SESSION LOGIC (Modified to start from curiosity modal)
    // =================================================================
    function startSession() {
        sessionState.sessionData.userPrediction = curiosityModal.answer.value;
        closeCuriosityModal();
        navigateTo('session');
        sessionState.currentStage = 1;
        sessionState.sessionData.goalId = sessionState.currentGoal.id;
        sessionState.sessionData.startTime = new Date();
        runSessionStage();
    }
    
    // =================================================================
    // OTHER LOGIC (UNCHANGED, but included for completeness)
    // =================================================================
    function scheduleInitialReviews(goalId) { if (db.reviewQueue.some(item => item.goalId === goalId)) return; const reviewDate = new Date(); reviewDate.setDate(reviewDate.getDate() + REVIEW_INTERVALS.INITIAL_INTERVAL); db.reviewQueue.push({ goalId: goalId, reviewDate: reviewDate.toISOString().split('T')[0], interval: REVIEW_INTERVALS.INITIAL_INTERVAL }); saveToLocalStorage(); }
    function handleReviewResult(goalId, result) { const reviewItemIndex = db.reviewQueue.findIndex(item => item.goalId === goalId); if (reviewItemIndex === -1) return; const reviewItem = db.reviewQueue[reviewItemIndex]; let newInterval; switch (result) { case 'forgot': newInterval = REVIEW_INTERVALS.FORGOT; break; case 'good': newInterval = Math.max(reviewItem.interval + 1, REVIEW_INTERVALS.GOOD); break; case 'perfect': newInterval = (reviewItem.interval || 1) * REVIEW_INTERVALS.PERFECT_MULTIPLIER; break; default: newInterval = reviewItem.interval; } const newReviewDate = new Date(); newReviewDate.setDate(newReviewDate.getDate() + newInterval); reviewItem.interval = newInterval; reviewItem.reviewDate = newReviewDate.toISOString().split('T')[0]; saveToLocalStorage(); renderReviewDeck(); }
    function generateAIDraft() { const currentContent = writingView.editor.value; if (currentContent.trim().length < 20) { alert('AI가 초고를 작성하려면 더 많은 내용이 필요합니다.'); return; } const draft = getAISimulatedDraft(currentContent); writingView.editor.value = draft; }
    function getAISimulatedDraft(prompt) { return `(AI가 생성한 초고입니다)\n\n서론: 이 글은 다음의 핵심 아이디어들을 종합하여 새로운 결론을 도출하고자 합니다.\n\n${prompt.replace(/---/g, '').replace(/##/g, '핵심 주장:').replace(/###/g, '근거:')}\n\n결론: 따라서, 위에서 살펴본 바와 같이 여러 지식들을 유기적으로 연결함으로써 우리는 더 나은 해결책을 찾을 수 있습니다.`; }
    function saveWritingAsset() { const title = writingView.title.value; const content = writingView.editor.value; if (!title.trim() || !content.trim()) { alert('제목과 내용이 모두 있어야 자산으로 저장할 수 있습니다.'); return; } db.assets.push({ id: Date.now(), title, content }); saveToLocalStorage(); alert(`'${title}'이(가) 당신의 지식 자산으로 저장되었습니다!`); writingView.title.value = ''; writingView.editor.value = ''; }
    function addBook() { const titleInput = document.getElementById('book-title'); const coverInput = document.getElementById('book-cover'); const typeSelect = document.getElementById('book-type'); const book = { id: Date.now(), title: titleInput.value, cover: coverInput.value || 'https://via.placeholder.com/150x220.png?text=No+Image', }; if (!book.title) { alert('책 제목을 입력해주세요.'); return; } if (typeSelect.value === 'main') { db.mainBook = book; } else { db.subBooks.push(book); } saveToLocalStorage(); renderDashboard(); titleInput.value = ''; coverInput.value = ''; }
    function openGoalModal() { if (!db.mainBook) return; const currentGoal = db.goals.find(g => g.bookId === db.mainBook.id && g.status === 'in-progress'); if (currentGoal) { goalModal.levelSelect.value = currentGoal.level; goalModal.textInput.value = currentGoal.text; } else { goalModal.textInput.value = ''; } goalModal.element.style.display = 'block'; }
    function closeGoalModal() { goalModal.element.style.display = 'none'; }
    function saveGoal() { if (!db.mainBook) return; db.goals.forEach(g => { if (g.bookId === db.mainBook.id && g.status === 'in-progress') { g.status = 'todo'; } }); let existingGoal = db.goals.find(g => g.text.trim() === goalModal.textInput.value.trim() && g.bookId === db.mainBook.id); if (existingGoal) { existingGoal.status = 'in-progress'; existingGoal.level = goalModal.levelSelect.value; } else { const newGoal = { id: Date.now(), bookId: db.mainBook.id, level: goalModal.levelSelect.value, text: goalModal.textInput.value, status: 'in-progress', }; db.goals.push(newGoal); } saveToLocalStorage(); renderDashboard(); closeGoalModal(); }
    function runSessionStage() { switch (sessionState.currentStage) { case 1: sessionState.timeLeft = 25 * 60; renderTimerStage("집중 독서", "목표에 집중하며 책을 읽어주세요."); startTimer(goToNextStage); break; case 2: sessionState.timeLeft = 5 * 60; renderBrainDumpStage(); startTimer(goToNextStage); break; case 3: stopTimer(); renderPredictionStage(); break; case 4: renderComparisonStage(); break; case 5: renderGapAnalysisStage(); break; case 6: saveSession(); renderEndStage(); break; } }
    function goToNextStage() { sessionState.currentStage++; runSessionStage(); }
    function startTimer(onComplete) { clearInterval(sessionState.timer); const timerDisplay = document.getElementById('timer-display'); sessionState.timer = setInterval(() => { sessionState.timeLeft--; const minutes = Math.floor(sessionState.timeLeft / 60); const seconds = sessionState.timeLeft % 60; if(timerDisplay) timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; if (sessionState.timeLeft <= 0) { clearInterval(sessionState.timer); onComplete(); } }, 1000); }
    function stopTimer() { clearInterval(sessionState.timer); }
    function renderTimerStage(title, subtitle) { sessionView.innerHTML = `<div class="session-stage"><h3>${title}</h3><p>${subtitle}</p><div id="timer-display">${String(Math.floor(sessionState.timeLeft / 60)).padStart(2, '0')}:00</div><button id="skip-timer-btn">다음으로</button></div>`; document.getElementById('skip-timer-btn').addEventListener('click', goToNextStage); }
    function renderBrainDumpStage() { sessionView.innerHTML = `<div class="session-stage"><h3>[2단계] 생각 기록 (5분)</h3><p>방금 읽은 내용과 그에 대한 당신의 생각을 자유롭게 기록하세요.</p><div id="timer-display">05:00</div><textarea id="brain-dump-input" placeholder="여기에 생각을 기록..."></textarea><button id="submit-braindump-btn">기록 완료</button></div>`; document.getElementById('submit-braindump-btn').addEventListener('click', () => { sessionState.sessionData.brainDump = document.getElementById('brain-dump-input').value; goToNextStage(); }); }
    function renderPredictionStage() { sessionView.innerHTML = `<div class="session-stage"><h3>[3단계] AI 피드백 예측</h3><p>AI가 당신의 기록에 대해 어떤 피드백을 줄 것 같습니까? <br>당신이 놓친 부분이나 잘못 이해한 부분은 무엇일까요?</p><textarea id="prediction-input" placeholder="AI의 피드백 예측..."></textarea><button id="submit-prediction-btn">예측 완료하고 결과 보기</button></div>`; document.getElementById('submit-prediction-btn').addEventListener('click', () => { sessionState.sessionData.prediction = document.getElementById('prediction-input').value; goToNextStage(); }); }
    function renderComparisonStage() { const aiFeedback = getAISimulatedFeedback(sessionState.sessionData.brainDump, sessionState.currentGoal); sessionState.sessionData.aiFeedback = aiFeedback; sessionView.innerHTML = `<div class="session-stage"><h3>[4단계] 비교 분석</h3><p>자신의 생각, 예측, 그리고 AI의 분석을 비교하며 격차를 확인해보세요.</p><div id="comparison-grid"><div class="comparison-column"><h4>나의 생각</h4><div>${sessionState.sessionData.brainDump || "기록 없음"}</div></div><div class="comparison-column"><h4>AI의 피드백 (시뮬레이션)</h4><div>${aiFeedback}</div></div><div class="comparison-column"><h4>나의 예측</h4><div>${sessionState.sessionData.prediction || "기록 없음"}</div></div></div><button id="comparison-done-btn" class="cta-button">분석 완료</button></div>`; document.getElementById('comparison-done-btn').addEventListener('click', goToNextStage); }
    function renderGapAnalysisStage() { sessionView.innerHTML = `<div class="session-stage"><h3>[5단계] 차이점 기록</h3><p>AI의 실제 피드백과 당신의 예측 사이의 가장 큰 차이점은 무엇이었나요? <br>이것이 당신의 '학습 맹점'입니다.</p><textarea id="gap-input" placeholder="가장 큰 차이점을 한 문장으로..."></textarea><button id="submit-gap-btn">최종 제출</button></div>`; document.getElementById('submit-gap-btn').addEventListener('click', () => { sessionState.sessionData.gap = document.getElementById('gap-input').value; goToNextStage(); }); }
    function renderEndStage() { sessionView.innerHTML = `<div class="session-stage"><h3>메티스 세션 완료!</h3><p>오늘의 학습 내용이 성공적으로 기록되었습니다. <br> '복습 덱'에서 장기기억화를 진행하세요.</p><button id="back-to-dashboard-btn" class="cta-button">대시보드로 돌아가기</button></div>`; document.getElementById('back-to-dashboard-btn').addEventListener('click', () => navigateTo('dashboard')); }
    function getAISimulatedFeedback(userText, goal) { if (!userText || userText.trim().length < 10) { return `기록된 내용이 너무 짧아 분석하기 어렵습니다.`; } return `훌륭한 정리입니다. 목표('${goal.text}')에 대한 깊은 고민이 느껴집니다. \n\n다만, 핵심 개념 A와 B의 연결성에 대해 조금 더 보충 설명을 하면 좋을 것 같습니다.`; }
    function saveSession() {
        sessionState.sessionData.endTime = new Date();
        db.sessions.push(sessionState.sessionData);
        
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let streak = parseInt(localStorage.getItem('metisStreak') || 0);

        if (db.lastSessionDate !== today) {
            if (db.lastSessionDate === yesterday) {
                streak++;
            } else {
                streak = 1;
            }
            localStorage.setItem('metisStreak', streak);
        }
        db.lastSessionDate = today;

        const goal = db.goals.find(g => g.id === sessionState.currentGoal.id);
        if (goal) {
            const oldStatus = goal.status;
            goal.status = 'completed';
            if (oldStatus !== 'completed') {
                scheduleInitialReviews(goal.id);
            }
        }
        saveToLocalStorage();
    }
    
    // START THE APP
    init();
});


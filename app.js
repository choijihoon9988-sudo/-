document.addEventListener('DOMContentLoaded', () => {
    // STATE MANAGEMENT
    let db = {
        mainBook: null,
        subBooks: [],
        goals: [],
        sessions: [],
        reviewQueue: [],
    };

    // DOM ELEMENTS
    const views = document.querySelectorAll('.view');
    const navButtons = {
        dashboard: document.getElementById('nav-dashboard'),
        review: document.getElementById('nav-review'),
        lab: document.getElementById('nav-lab'),
    };

    const dashboard = {
        mainBookSlot: document.getElementById('main-book-content'),
        subBookList: document.getElementById('sub-book-list'),
        addBookBtn: document.getElementById('add-book-btn'),
        startSessionBtn: document.getElementById('start-session-btn'),
    };
    
    const reviewView = {
        list: document.getElementById('review-list'),
    };

    const sessionView = document.getElementById('session-view');
    
    const labView = {
        goalBoard: document.getElementById('goal-board'),
        synapseMapContainer: document.getElementById('synapse-map')
    };

    const goalModal = {
        element: document.getElementById('goal-modal'),
        closeBtn: document.querySelector('.close-button'),
        saveBtn: document.getElementById('save-goal-btn'),
        levelSelect: document.getElementById('goal-level'),
        textInput: document.getElementById('goal-text'),
    };

    // SESSION STATE & CONSTANTS
    let sessionState = {
        currentStage: null,
        timer: null,
        timeLeft: 0,
        currentGoal: null,
        sessionData: {},
    };

    const REVIEW_INTERVALS = {
        FORGOT: 1,
        GOOD: 7,
        PERFECT_MULTIPLIER: 2,
        INITIAL_INTERVAL: 1
    };

    // =================================================================
    // INITIALIZATION & DATA HANDLING
    // =================================================================

    function loadFromLocalStorage() {
        const savedDB = localStorage.getItem('projectMetisDB');
        if (savedDB) {
            db = JSON.parse(savedDB);
        }
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
        if (viewName === 'lab') renderLab();
    }

    // =================================================================
    // EVENT LISTENERS
    // =================================================================

    function setupEventListeners() {
        navButtons.dashboard.addEventListener('click', () => navigateTo('dashboard'));
        navButtons.review.addEventListener('click', () => navigateTo('review'));
        navButtons.lab.addEventListener('click', () => navigateTo('lab'));
        dashboard.addBookBtn.addEventListener('click', addBook);
        dashboard.startSessionBtn.addEventListener('click', startSession);

        goalModal.closeBtn.addEventListener('click', closeGoalModal);
        goalModal.saveBtn.addEventListener('click', saveGoal);
        window.addEventListener('click', (event) => {
            if (event.target === goalModal.element) closeGoalModal();
        });

        // Drag and Drop for Kanban Board
        labView.goalBoard.addEventListener('dragstart', e => {
            if (e.target.classList.contains('kanban-card')) {
                e.target.classList.add('dragging');
            }
        });

        labView.goalBoard.addEventListener('dragend', e => {
            if (e.target.classList.contains('kanban-card')) {
                e.target.classList.remove('dragging');
            }
        });

        labView.goalBoard.addEventListener('dragover', e => {
            e.preventDefault();
            const column = e.target.closest('.kanban-column');
            if (column) {
                document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
                column.classList.add('drag-over');
            }
        });
        
        labView.goalBoard.addEventListener('dragleave', e => {
            const column = e.target.closest('.kanban-column');
            if(column) column.classList.remove('drag-over');
        });

        labView.goalBoard.addEventListener('drop', e => {
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
                    // Schedule review when moved to completed for the first time
                    if (newStatus === 'completed' && oldStatus !== 'completed') {
                        scheduleInitialReviews(goalId);
                    }
                    saveToLocalStorage();
                    renderSynapseMap(); // Re-render map if a goal becomes 'completed'
                }
            }
        });
    }

    // =================================================================
    // RENDER FUNCTIONS
    // =================================================================
    
    function renderDashboard() {
        if (db.mainBook) {
            const currentGoal = db.goals.find(g => g.bookId === db.mainBook.id && g.status === 'in-progress');
            dashboard.mainBookSlot.innerHTML = `
                <img src="${db.mainBook.cover}" alt="${db.mainBook.title}" class="book-cover">
                <div class="book-info">
                    <h4>${db.mainBook.title}</h4>
                    <div class="book-goal">
                        ${currentGoal ? `
                            <span class="level-badge">레벨 ${currentGoal.level}</span>
                            <p>"${currentGoal.text}"</p>
                        ` : '<p>설정된 목표가 없습니다. 목표를 설정해주세요.</p>'}
                    </div>
                    <button id="set-goal-btn">목표 설정/변경</button>
                </div>
            `;
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
            bookEl.innerHTML = `
                <img src="${book.cover}" alt="${book.title}" class="book-cover">
                <p>${book.title}</p>
            `;
            dashboard.subBookList.appendChild(bookEl);
        });
    }

    function renderLab() {
        renderGoalBoard();
        renderSynapseMap();
    }

    function renderGoalBoard() {
        document.querySelectorAll('.kanban-column').forEach(col => {
            col.innerHTML = `<h4>${col.querySelector('h4').textContent}</h4>`;
        });
    
        db.goals.forEach(goal => {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.setAttribute('draggable', true);
            card.dataset.goalId = goal.id;
            const book = (db.mainBook && db.mainBook.id === goal.bookId) ? db.mainBook : db.subBooks.find(b => b.id === goal.bookId);
            
            card.innerHTML = `
                <div class="level-badge">레벨 ${goal.level}</div>
                <strong>${book ? book.title : '알 수 없는 책'}</strong>
                <p>${goal.text}</p>
            `;

            const column = labView.goalBoard.querySelector(`.kanban-column[data-status="${goal.status}"]`);
            if (column) column.appendChild(card);
        });
    }

    function renderSynapseMap() {
        const completedGoals = db.goals.filter(g => g.status === 'completed');
        
        if(completedGoals.length === 0) {
            labView.synapseMapContainer.innerHTML = '<p style="text-align: center; padding: 20px;">완료된 목표가 없습니다. 목표를 완료하고 지식 연결을 확인하세요.</p>';
            return;
        }
        
        const nodes = new vis.DataSet();
        const edges = new vis.DataSet();
        let nodeIdCounter = 1;
        const keywordToNodeId = new Map();

        completedGoals.forEach(goal => {
            const keywords = goal.text.split(' ').filter(word => word.length > 2);
            const book = (db.mainBook && db.mainBook.id === goal.bookId) ? db.mainBook : db.subBooks.find(b => b.id === goal.bookId);

            keywords.forEach(keyword => {
                if (!keywordToNodeId.has(keyword)) {
                    keywordToNodeId.set(keyword, nodeIdCounter);
                    nodes.add({ id: nodeIdCounter, label: keyword, title: `From: ${book.title}`, group: book.id });
                    nodeIdCounter++;
                }
            });
        });
        
        const nodeIds = nodes.getIds();
        if (nodeIds.length > 1) {
            for (let i = 0; i < nodeIds.length; i++) {
                const fromNode = nodeIds[i];
                const toNode = nodeIds[Math.floor(Math.random() * nodeIds.length)];
                if (fromNode !== toNode) {
                    edges.add({ from: fromNode, to: toNode });
                }
            }
        }

        const data = { nodes, edges };
        const options = {
            nodes: { shape: 'dot', size: 16, font: { color: '#fff' }, borderWidth: 2, },
            edges: { width: 1, color: { inherit: 'from' }, smooth: { type: 'continuous' } },
            physics: { barnesHut: { gravitationalConstant: -3000 } },
            interaction: { hover: true },
        };
        new vis.Network(labView.synapseMapContainer, data, options);
    }

    // =================================================================
    // EBBINGHAUS REVIEW DECK LOGIC
    // =================================================================
    
    function scheduleInitialReviews(goalId) {
        if (db.reviewQueue.some(item => item.goalId === goalId)) return;

        const reviewDate = new Date();
        reviewDate.setDate(reviewDate.getDate() + REVIEW_INTERVALS.INITIAL_INTERVAL);
        
        db.reviewQueue.push({
            goalId: goalId,
            reviewDate: reviewDate.toISOString().split('T')[0],
            interval: REVIEW_INTERVALS.INITIAL_INTERVAL
        });
        saveToLocalStorage();
    }

    function renderReviewDeck() {
        reviewView.list.innerHTML = '';
        const today = new Date().toISOString().split('T')[0];
        
        const itemsToReview = db.reviewQueue.filter(item => item.reviewDate <= today);

        if (itemsToReview.length === 0) {
            reviewView.list.innerHTML = '<h3>오늘 복습할 항목이 없습니다. 훌륭해요!</h3>';
            return;
        }
        
        reviewView.list.innerHTML = `<h3>오늘 복습할 ${itemsToReview.length}개의 항목이 있습니다.</h3>`;

        itemsToReview.forEach(item => {
            const goal = db.goals.find(g => g.id === item.goalId);
            const session = db.sessions.find(s => s.goalId === item.goalId);
            if (!goal) return;

            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div class="review-question">
                    <h4>${goal.text}</h4>
                    <p>다음에 대해 기억나는 것을 모두 떠올려보세요. (클릭하여 정답 확인)</p>
                </div>
                <div class="review-answer">
                    ${session ? `
                        <div class="review-answer-content">
                            <strong>[세션 기록] 나의 생각:</strong>
                            <p>${session.brainDump || '기록 없음'}</p>
                            <strong>[세션 기록] 학습 맹점:</strong>
                            <p>${session.gap || '기록 없음'}</p>
                        </div>
                    ` : '<p>연관된 세션 기록이 없습니다.</p>'}
                    <div class="review-controls">
                        <button class="review-btn forgot" data-result="forgot">모르겠어요</button>
                        <button class="review-btn good" data-result="good">기억나요</button>
                        <button class="review-btn perfect" data-result="perfect">완벽해요</button>
                    </div>
                </div>
            `;
            reviewView.list.appendChild(card);

            card.querySelector('.review-question').addEventListener('click', () => {
                card.querySelector('.review-answer').classList.toggle('visible');
            });
            
            card.querySelectorAll('.review-btn').forEach(btn => {
                btn.addEventListener('click', () => handleReviewResult(item.goalId, btn.dataset.result));
            });
        });
    }

    function handleReviewResult(goalId, result) {
        const reviewItemIndex = db.reviewQueue.findIndex(item => item.goalId === goalId);
        if (reviewItemIndex === -1) return;

        const reviewItem = db.reviewQueue[reviewItemIndex];
        let newInterval;

        switch (result) {
            case 'forgot':
                newInterval = REVIEW_INTERVALS.FORGOT;
                break;
            case 'good':
                newInterval = Math.max(reviewItem.interval + 1, REVIEW_INTERVALS.GOOD);
                break;
            case 'perfect':
                newInterval = (reviewItem.interval || 1) * REVIEW_INTERVALS.PERFECT_MULTIPLIER;
                break;
            default:
                newInterval = reviewItem.interval;
        }
        
        const newReviewDate = new Date();
        newReviewDate.setDate(newReviewDate.getDate() + newInterval);
        
        reviewItem.interval = newInterval;
        reviewItem.reviewDate = newReviewDate.toISOString().split('T')[0];

        saveToLocalStorage();
        renderReviewDeck();
    }

    // =================================================================
    // OTHER LOGIC (BOOKS, GOALS, SESSION)
    // =================================================================

    function addBook() {
        const titleInput = document.getElementById('book-title');
        const coverInput = document.getElementById('book-cover');
        const typeSelect = document.getElementById('book-type');

        const book = {
            id: Date.now(),
            title: titleInput.value,
            cover: coverInput.value || 'https://via.placeholder.com/150x220.png?text=No+Image',
        };

        if (!book.title) {
            alert('책 제목을 입력해주세요.');
            return;
        }

        if (typeSelect.value === 'main') {
            db.mainBook = book;
        } else {
            db.subBooks.push(book);
        }

        saveToLocalStorage();
        renderDashboard();
        titleInput.value = '';
        coverInput.value = '';
    }

    function openGoalModal() {
        if (!db.mainBook) return;
        const currentGoal = db.goals.find(g => g.bookId === db.mainBook.id && g.status === 'in-progress');
        if (currentGoal) {
            goalModal.levelSelect.value = currentGoal.level;
            goalModal.textInput.value = currentGoal.text;
        } else {
            goalModal.textInput.value = '';
        }
        goalModal.element.style.display = 'block';
    }

    function closeGoalModal() {
        goalModal.element.style.display = 'none';
    }

    function saveGoal() {
        if (!db.mainBook) return;
        
        db.goals.forEach(g => {
            if (g.bookId === db.mainBook.id && g.status === 'in-progress') {
                g.status = 'todo';
            }
        });

        let existingGoal = db.goals.find(g => g.text.trim() === goalModal.textInput.value.trim() && g.bookId === db.mainBook.id);
        
        if (existingGoal) {
            existingGoal.status = 'in-progress';
            existingGoal.level = goalModal.levelSelect.value;
        } else {
            const newGoal = {
                id: Date.now(),
                bookId: db.mainBook.id,
                level: goalModal.levelSelect.value,
                text: goalModal.textInput.value,
                status: 'in-progress',
            };
            db.goals.push(newGoal);
        }

        saveToLocalStorage();
        renderDashboard();
        closeGoalModal();
    }
    
    function startSession() {
        navigateTo('session');
        sessionState.currentStage = 1;
        sessionState.sessionData = {
            goalId: sessionState.currentGoal.id,
            startTime: new Date(),
        };
        runSessionStage();
    }
    
    function runSessionStage() {
        switch (sessionState.currentStage) {
            case 1:
                sessionState.timeLeft = 25 * 60; // 25 minutes
                renderTimerStage("집중 독서", "목표에 집중하며 책을 읽어주세요.");
                startTimer(goToNextStage);
                break;
            case 2:
                sessionState.timeLeft = 5 * 60; // 5 minutes
                renderBrainDumpStage();
                startTimer(goToNextStage);
                break;
            case 3:
                stopTimer();
                renderPredictionStage();
                break;
            case 4:
                renderComparisonStage();
                break;
            case 5:
                renderGapAnalysisStage();
                break;
            case 6:
                saveSession();
                renderEndStage();
                break;
        }
    }

    function goToNextStage() {
        sessionState.currentStage++;
        runSessionStage();
    }

    function startTimer(onComplete) {
        clearInterval(sessionState.timer);
        const timerDisplay = document.getElementById('timer-display');
        sessionState.timer = setInterval(() => {
            sessionState.timeLeft--;
            const minutes = Math.floor(sessionState.timeLeft / 60);
            const seconds = sessionState.timeLeft % 60;
            if(timerDisplay) timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            if (sessionState.timeLeft <= 0) {
                clearInterval(sessionState.timer);
                onComplete();
            }
        }, 1000);
    }
    
    function stopTimer() {
        clearInterval(sessionState.timer);
    }

    function renderTimerStage(title, subtitle) {
        sessionView.innerHTML = `<div class="session-stage"><h3>${title}</h3><p>${subtitle}</p><div id="timer-display">${String(Math.floor(sessionState.timeLeft / 60)).padStart(2, '0')}:00</div><button id="skip-timer-btn">다음으로</button></div>`;
        document.getElementById('skip-timer-btn').addEventListener('click', goToNextStage);
    }

    function renderBrainDumpStage() {
        sessionView.innerHTML = `<div class="session-stage"><h3>[2단계] 생각 기록 (5분)</h3><p>방금 읽은 내용과 그에 대한 당신의 생각을 자유롭게 기록하세요.</p><div id="timer-display">05:00</div><textarea id="brain-dump-input" placeholder="여기에 생각을 기록..."></textarea><button id="submit-braindump-btn">기록 완료</button></div>`;
        document.getElementById('submit-braindump-btn').addEventListener('click', () => {
            sessionState.sessionData.brainDump = document.getElementById('brain-dump-input').value;
            goToNextStage();
        });
    }

    function renderPredictionStage() {
        sessionView.innerHTML = `<div class="session-stage"><h3>[3단계] AI 피드백 예측</h3><p>AI가 당신의 기록에 대해 어떤 피드백을 줄 것 같습니까? <br>당신이 놓친 부분이나 잘못 이해한 부분은 무엇일까요?</p><textarea id="prediction-input" placeholder="AI의 피드백 예측..."></textarea><button id="submit-prediction-btn">예측 완료하고 결과 보기</button></div>`;
        document.getElementById('submit-prediction-btn').addEventListener('click', () => {
            sessionState.sessionData.prediction = document.getElementById('prediction-input').value;
            goToNextStage();
        });
    }

    function renderComparisonStage() {
        const aiFeedback = getAISimulatedFeedback(sessionState.sessionData.brainDump, sessionState.currentGoal);
        sessionState.sessionData.aiFeedback = aiFeedback;
        sessionView.innerHTML = `<div class="session-stage"><h3>[4단계] 비교 분석</h3><p>자신의 생각, 예측, 그리고 AI의 분석을 비교하며 격차를 확인해보세요.</p><div id="comparison-grid"><div class="comparison-column"><h4>나의 생각</h4><div>${sessionState.sessionData.brainDump || "기록 없음"}</div></div><div class="comparison-column"><h4>AI의 피드백 (시뮬레이션)</h4><div>${aiFeedback}</div></div><div class="comparison-column"><h4>나의 예측</h4><div>${sessionState.sessionData.prediction || "기록 없음"}</div></div></div><button id="comparison-done-btn" class="cta-button">분석 완료</button></div>`;
        document.getElementById('comparison-done-btn').addEventListener('click', goToNextStage);
    }
    
    function renderGapAnalysisStage() {
        sessionView.innerHTML = `<div class="session-stage"><h3>[5단계] 차이점 기록</h3><p>AI의 실제 피드백과 당신의 예측 사이의 가장 큰 차이점은 무엇이었나요? <br>이것이 당신의 '학습 맹점'입니다.</p><textarea id="gap-input" placeholder="가장 큰 차이점을 한 문장으로..."></textarea><button id="submit-gap-btn">최종 제출</button></div>`;
        document.getElementById('submit-gap-btn').addEventListener('click', () => {
            sessionState.sessionData.gap = document.getElementById('gap-input').value;
            goToNextStage();
        });
    }

    function renderEndStage() {
        sessionView.innerHTML = `<div class="session-stage"><h3>메티스 세션 완료!</h3><p>오늘의 학습 내용이 성공적으로 기록되었습니다. <br> '지식 연구소'에서 누적된 기록을 확인하고 '복습 덱'에서 장기기억화를 진행하세요.</p><button id="back-to-dashboard-btn" class="cta-button">대시보드로 돌아가기</button></div>`;
        document.getElementById('back-to-dashboard-btn').addEventListener('click', () => navigateTo('dashboard'));
    }

    function getAISimulatedFeedback(userText, goal) {
        if (!userText || userText.trim().length < 10) {
            return `기록된 내용이 너무 짧아 분석하기 어렵습니다. 목표 달성을 위해 읽은 내용의 핵심 개념과 자신의 생각을 더 구체적으로 작성해보세요.`;
        }
        return `훌륭한 정리입니다. 특히 '${userText.slice(0, 15)}...' 부분에서 목표('${goal.text}')에 대한 깊은 고민이 느껴집니다. \n\n다만, 핵심 개념 A와 B의 연결성에 대해 조금 더 보충 설명을 하면 좋을 것 같습니다. 예를 들어, 저자가 왜 A를 B의 전제 조건으로 설정했는지에 대해 한 문단 정도 추가하면 논리가 더욱 명확해질 것입니다. \n\n또한, 책의 사례 외에 자신만의 경험을 예시로 들어보면 지식을 완전히 체화하는 데 도움이 될 것입니다.`;
    }

    function saveSession() {
        sessionState.sessionData.endTime = new Date();
        db.sessions.push(sessionState.sessionData);
        
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

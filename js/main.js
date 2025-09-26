import { switchView } from './ui.js';
import { initializeSession, handleSessionCompletion } from './metisSession.js';
import { initializeEbbinghaus } from './ebbinghaus.js';
import { initializeGoalNavigator } from './goalNavigator.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const startSessionBtn = document.getElementById('start-session-btn');
    const startGoalNavigatorBtn = document.getElementById('start-goal-navigator-btn');

    // --- INITIALIZATION ---
    const handleViewSwitch = (viewName) => {
        switchView(viewName, navButtons);
        if (viewName === 'ebbinghaus') {
            initializeEbbinghaus();
        }
    };

    // --- EVENT HANDLERS ---
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => handleViewSwitch(btn.dataset.view));
    });

    startSessionBtn.addEventListener('click', () => {
        handleViewSwitch('metis-session');
        initializeSession();
    });
    
    startGoalNavigatorBtn.addEventListener('click', () => {
        initializeGoalNavigator();
    });

    // Handle session completion event
    document.addEventListener('sessionComplete', () => {
        handleViewSwitch('dashboard');
        handleSessionCompletion();
    });

    // Handle goal selection event from navigator
    document.addEventListener('goalSelected', (e) => {
        const { level, text } = e.detail;
        const goalEl = document.querySelector('#main-book-goal');
        goalEl.innerHTML = `
            <strong>🎯 현재 목표 (레벨 ${level})</strong>
            <p>${text}</p>
        `;
    });
    
    // --- APP START ---
    handleViewSwitch('dashboard');
});
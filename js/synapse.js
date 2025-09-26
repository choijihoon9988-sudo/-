import { getConnectionSuggestions } from './api.js';

export async function initializeConnectionSuggestions() {
    const container = document.getElementById('connection-suggestions-content');
    if (!container) return;

    container.innerHTML = `<p>AI가 지식들을 연결 중입니다...</p>`;

    const plants = JSON.parse(localStorage.getItem('knowledgePlants')) || [];
    const suggestions = await getConnectionSuggestions(plants);

    if (suggestions.length === 0) {
        container.innerHTML = '<p>아직 연결할 지식이 충분하지 않습니다. 학습을 계속 진행해주세요.</p>';
        return;
    }

    container.innerHTML = suggestions.map(s => `
        <div class="suggestion">
            <p>💡 <strong>'${s.from}'</strong> 지식은 <strong>'${s.to}'</strong> 지식과 관련이 있을 수 있습니다.</p>
            <p style="font-size: 13px; color: var(--text-light-color);">${s.reason}</p>
        </div>
    `).join('');
}
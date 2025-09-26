// This file simulates API calls to a fake AI backend.
// In a real application, this would be replaced with actual fetch() calls.

function simulateApiCall(data, delay = 1500) {
    return new Promise(resolve => setTimeout(() => resolve(data), delay));
}

export async function getGoalSuggestion(prompt) {
    if (!prompt.trim()) return "어떤 목표를 가지고 싶으신지 알려주세요.";
    const suggestion = `좋은 목표입니다! 해당 내용을 바탕으로 다음과 같은 목표를 제안합니다:\n
- **레벨 1:** 책에서 '${prompt.split(' ').pop()}'의 핵심 개념 정의 찾아보기
- **레벨 2:** 해당 개념을 활용한 실생활 적용 사례 3가지 분석하기
- **레벨 3:** 분석한 내용을 바탕으로 '나만의 실천 가이드라인' 작성하기`;
    return simulateApiCall(suggestion);
}

export async function getFeedback(text) {
    const keywords = ["개념", "사례", "연결", "핵심", "주장"];
    const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)];
    if (!text.trim()) return "기록된 내용이 없습니다. 먼저 생각을 기록해주세요.";
    const feedback = `전체적으로 핵심 내용을 잘 파악하고 계십니다. 특히 '${randomKeyword}'에 대한 언급이 인상적입니다. \n\n다만, 각 개념 간의 '연결성'을 좀 더 명확하게 설명하면 논리가 강화될 것입니다. 예를 들어, A가 어떻게 B의 원인이 되는지를 구체적인 사례를 들어 보강하면 좋겠습니다. 저자의 핵심 주장은 단순히 개념을 나열하는 것이 아니라, 그 인과관계를 통해 독자를 설득하는 데 있다는 점을 기억하세요.`;
    return simulateApiCall(feedback, 2000);
}

export async function getExpertSummary() {
    const summary = `**넛지(Nudge): 선택 설계의 힘**\n\n인간은 항상 합리적으로 선택하지 않는다. 이 책의 저자들은 사람들이 더 나은 결정을 내리도록 부드럽게 개입하는 '선택 설계'의 중요성을 강조한다. 핵심 도구는 다음과 같다.\n\n1.  **디폴트(Default):** 대부분의 사람들은 기본 설정 값을 바꾸지 않으려는 경향이 있다.\n2.  **오류 예상(Expect Error):** 사용자가 저지를 수 있는 실수를 미리 예상하고 시스템을 설계한다.\n3.  **피드백(Feedback):** 자신의 선택이 어떤 결과를 가져오는지 즉각적으로 알려주어 학습을 돕는다.`;
    return simulateApiCall(summary, 2000);
}
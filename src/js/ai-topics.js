// The model selects an ID; visible labels always come from this allowlist.
export const AI_TOPICS = Object.freeze({
  solution: 'uma solução',
  chatbots: 'Chatbots',
  agents: 'Agentes de IA',
  analysis: 'Agentes de análise',
  automation: 'Automações',
  assistants: 'Assistentes de IA',
});
export function normalizeTopic(value) {
  return typeof value === 'string' && Object.hasOwn(AI_TOPICS, value)
    ? value
    : 'solution';
}
export function topicLabel(value) {
  return `Conversar sobre ${AI_TOPICS[normalizeTopic(value)]}`;
}

import '../../styles/base.css';
import '../../styles/services/scenes.css';
import '../../styles/services/editorial.css';
import '../../styles/services/ai-solutions.css';
import '../../styles/finishing.css';
import '../main.js';
import { initEntrySearch } from '../components/entry-search.js';
import { initAiChat } from '../components/ai-chat.js';
import config from '../../site.json';

initEntrySearch();
initAiChat({
  endpoint: import.meta.env.VITE_AI_CHAT_ENDPOINT || config.aiChatEndpoint,
});

import '../../styles/base.css';
import '../../styles/signal-scene.css';
import '../../styles/services/scenes.css';
import '../../styles/services/editorial.css';
import '../../styles/services/restructuring.css';
import '../../styles/finishing.css';
import '../main.js';
import { initEntrySearch } from '../components/entry-search.js';
import { initSignalScene } from '../components/signal-scene.js';
import { afterPaint } from '../dom.js';

initEntrySearch();
afterPaint(initSignalScene);

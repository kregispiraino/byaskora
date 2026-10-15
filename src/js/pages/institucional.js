import '../../styles/base.css';
import '../../styles/institutional.css';
import '../../styles/institutional-solutions.css';
import '../../styles/mascot.css';
import '../../styles/finishing.css';
import '../main.js';
import { initEntrySearch } from '../components/entry-search.js';
import { initTabs } from '../components/tabs.js';
import { initMascot } from '../components/mascot.js';
import { afterPaint } from '../dom.js';

initEntrySearch();
initTabs();
afterPaint(initMascot);

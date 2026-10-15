import '../../styles/base.css';
import '../../styles/finishing.css';
import '../main.js';
import { initContact } from '../components/contact.js';
import config from '../../site.json';

initContact({
  contactEndpoint:
    import.meta.env.VITE_CONTACT_ENDPOINT || config.contactEndpoint,
});

// Entry point for every Messages page: <body data-portal="resident|staff|client|admin">.
import { mount } from './app.js';

mount({ portal: document.body.dataset.portal });

// Messaging hub: links into the four portals, live unread counts, and demo-data controls.
import { createStore } from './store.js';
import { createTransport, clearSideData } from './transport.js';
import { PERSONAS, PORTALS } from './personas.js';

const $ = (s, r = document) => r.querySelector(s);
const tpl = (id) => document.getElementById(id).content.firstElementChild.cloneNode(true);

const blurb = {
  resident: 'Starts with the assistant. Asks for a person only when needed.',
  staff: 'Queue of residents, chats with clients, and requests to Support.',
  client: 'Chats with staff and requests to Support.',
  admin: 'Support console: queue, status, announcements, and direct messages.',
};

const store = createStore({ transport: createTransport() });
const dark = new URLSearchParams(location.search).has('dark') ? '?dark' : '';

function render() {
  const box = $('#hub-portals');
  box.replaceChildren();
  for (const [key, p] of Object.entries(PORTALS)) {
    const card = tpl('h-card');
    $('[data-title]', card).textContent = p.label;
    $('[data-text]', card).textContent = blurb[key];
    const open = $('[data-open]', card);
    open.href = `/${key}/messages.html${dark}`;
    open.textContent = `Open ${p.label} Messages`;
    for (const person of PERSONAS.filter((x) => x.role === key)) {
      const li = tpl('h-person');
      const a = $('[data-link]', li);
      a.href = `/${key}/messages.html?as=${person.id}${dark ? '&dark' : ''}`;
      $('[data-name]', li).textContent = person.name;
      $('[data-title]', li).textContent = person.title;
      const n = store.badgeCount(person.id);
      if (n) {
        const u = $('[data-unread]', li);
        u.hidden = false;
        u.textContent = n > 99 ? '99+' : String(n);
        u.setAttribute('role', 'img');
        u.setAttribute('aria-label', `${n} unread`);
      }
      $('[data-people]', card).appendChild(li);
    }
    box.appendChild(card);
  }
  const mode = store.transportInfo().mode;
  $('#hub-conn').textContent = { broadcast: 'live sync between tabs', storage: 'saved in this browser', memory: 'not saved (storage is blocked)' }[mode];
}

function twoStep(btn, label, run) {
  let armed = false;
  let timer;
  btn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      btn.textContent = 'Click again to confirm';
      timer = setTimeout(() => { armed = false; btn.textContent = label; }, 3500);
      return;
    }
    clearTimeout(timer);
    armed = false;
    btn.textContent = label;
    run();
  });
}

twoStep($('#hub-reset'), 'Reset demo data', () => { store.reset(); clearSideData(); $('#hub-status').textContent = 'Demo data was reset.'; render(); });
twoStep($('#hub-empty'), 'Start empty', () => { store.reset({ empty: true }); clearSideData(); $('#hub-status').textContent = 'All conversations were cleared.'; render(); });
store.subscribe(render);
setInterval(render, 30000);
render();

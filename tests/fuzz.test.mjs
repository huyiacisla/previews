// Random-walk test: thousands of random actions by random people, checking the rules that must never break.
// Deterministic (seeded) so a failure can be replayed: SEED=123 npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, canMessage } from '../src/messaging/store.js';
import { createMemoryBus } from '../src/messaging/transport.js';

const USERS = ['res-1', 'res-2', 'res-3', 'stf-1', 'stf-2', 'cli-1', 'cli-2', 'adm-1', 'adm-2'];
const role = (id) => id.split('-')[0] === 'res' ? 'resident' : id.split('-')[0] === 'stf' ? 'staff' : id.split('-')[0] === 'cli' ? 'client' : 'admin';
const ROLES_IN_GROUP = ['staff', 'client', 'admin'];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function run(seed, steps) {
  const rand = rng(seed);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const clock = { t: Date.UTC(2026, 10, 9, 15, 0, 0) };
  const bus = createMemoryBus();
  const store = createStore({ transport: bus.connect(), now: () => clock.t });
  const raw = () => bus.connect().read();
  const log = [];
  const words = ['hello', 'parking', 'invoice', 'permit 4471', 'thanks', 'Plate 7XYZ482', 'ok', 'see https://example.com/a', '😀 hi', 'x'.repeat(50)];
  const note = (op, args, res) => log.push(`${op}(${args.join(', ')}) -> ${res && (res.ok ? 'ok' : res.reason)}`);

  const ops = [
    () => { const u = pick(USERS.filter((x) => role(x) === 'resident')); const r = store.ensureSession(u); note('ensureSession', [u], r); },
    () => {
      const u = pick(USERS.filter((x) => role(x) === 'resident'));
      const c = store.listFor(u).find((r) => r.kind === 'resident_support');
      if (!c) return;
      const t = store.get(c.id, u);
      const offered = t.ok && [...t.messages].reverse().find((m) => m.choices && !m.chosen);
      const choice = offered ? pick(offered.choices) : { id: 'bogus' };
      note('choose', [c.id, u, choice.id], store.choose(c.id, u, choice.id));
    },
    () => {
      const u = pick(USERS); const rows = store.listFor(u);
      const c = rows.length ? pick(rows) : { id: 'c999' };
      const r = store.send(c.id, u, pick(words), { clientId: rand() < 0.2 ? `k${Math.floor(rand() * 5)}` : undefined });
      note('send', [c.id, u], r);
      if (r.ok) assert.ok(store.get(c.id, u).ok, `sender must still see ${c.id}`);
    },
    () => { const u = pick(USERS); const to = pick(USERS); const r = store.startDirect(u, to, pick(words)); note('startDirect', [u, to], r); if (r.ok) assert.ok(canMessage(role(u), role(to)) || role(u) === role(to), `${u} -> ${to} should not be allowed`); if (r.ok) assert.notEqual(role(u), 'resident', 'residents never start a chat'); },
    () => { const u = pick(USERS); note('startSupport', [u], store.startSupport(u, { subject: 'Help', text: pick(words) })); },
    () => { const u = pick(USERS.filter((x) => role(x) === 'staff')); const q = store.listFor(u).filter((r) => r.tags.includes('queue')); if (q.length) note('claim', [pick(q).id, u], store.claim(pick(q).id, u)); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (rows.length) { const c = pick(rows); note('resolve', [c.id, u], store.resolve(c.id, u)); } },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (rows.length) { const c = pick(rows); note('endChat', [c.id, u], store.endChat(c.id, u)); } },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (rows.length) { const c = pick(rows); note('rate', [c.id, u], store.rate(c.id, u, rand() < 0.5)); } },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (rows.length) { const c = pick(rows); note('setSupportStatus', [c.id, u], store.setSupportStatus(c.id, u, pick(['open', 'pending', 'resolved']))); } },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (rows.length) { const c = pick(rows); note('assignSupport', [c.id, u], store.assignSupport(c.id, u, pick(USERS))); } },
    () => {
      const u = pick(USERS); const ids = [pick(USERS), pick(USERS), pick(USERS)];
      const r = store.createGroup(u, { name: 'Team', memberIds: ids, text: pick(words) }); note('createGroup', [u, ids.join('/')], r);
      if (r.ok) { assert.ok(['staff', 'admin'].includes(role(u))); }
    },
    () => { const u = pick(USERS); const g = store.listFor(u).filter((r) => r.kind === 'group'); if (g.length) note('addMember', [pick(g).id, u], store.addMember(pick(g).id, u, pick(USERS))); },
    () => { const u = pick(USERS); const g = store.listFor(u).filter((r) => r.kind === 'group'); if (g.length) note('leaveGroup', [pick(g).id, u], store.leaveGroup(pick(g).id, u)); },
    () => { const u = pick(USERS.filter((x) => role(x) === 'admin')); note('broadcast', [u], store.broadcast(u, { title: 'Notice', text: pick(words), audience: pick(['everyone', ['resident'], ['staff', 'client']]) })); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (rows.length) store.markRead(pick(rows).id, u); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (!rows.length) return; const c = pick(rows); const t = store.get(c.id, u); const m = t.ok && t.messages.filter((x) => x.kind === 'text'); if (m && m.length) note('react', [c.id, u], store.react(c.id, u, pick(m).id, pick(['👍', '❤️', '😂']))); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (!rows.length) return; const c = pick(rows); const t = store.get(c.id, u); const m = t.ok && t.messages.filter((x) => x.mine); if (m && m.length) note('unsend', [c.id, u], store.unsend(c.id, u, pick(m).id)); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (!rows.length) return; const c = pick(rows); const t = store.get(c.id, u); const m = t.ok && t.messages.filter((x) => x.mine); if (m && m.length) note('edit', [c.id, u], store.edit(c.id, u, pick(m).id, pick(words))); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (!rows.length) return; const c = pick(rows); const t = store.get(c.id, u); const m = t.ok && t.messages; if (m && m.length) note('hideMessage', [c.id, u], store.hideMessage(c.id, u, pick(m).id)); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (rows.length) store.toggleFlag(pick(rows).id, u, pick(['pinned', 'muted', 'important'])); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (!rows.length) return; const c = pick(rows); const t = store.get(c.id, u); const m = t.ok && t.messages.filter((x) => x.kind === 'text'); const targets = store.forwardTargets(u, c.id); if (m && m.length && targets.length) { const r = store.forward(c.id, u, pick(m).id, pick(targets).id); note('forward', [c.id, u], r); if (r.ok) assert.notEqual(role(u), 'resident'); } },
    () => { const u = pick(USERS); store.search(u, pick(['hello', 'park', 'xx', '4471'])); },
    () => { const u = pick(USERS); const rows = store.listFor(u); if (!rows.length) return; const c = pick(rows); const r = store.send(c.id, u, pick(words), { emergency: true }); note('emergency', [c.id, u], r); if (r.ok) assert.ok(['resident', 'staff', 'admin'].includes(role(u)), 'only residents, staff and admin raise emergencies'); },
    () => { const u = pick(USERS); const e = store.emergencies(u); if (e.length) note('ackEmergency', [e[0].convId, u], store.acknowledgeEmergency(e[0].convId, u)); },
    () => { const u = pick(USERS.filter((x) => role(x) === 'staff')); const rows = store.listFor(u).filter((r) => r.kind === 'resident_support'); if (rows.length) note('setTicketState', [pick(rows).id, u], store.setTicketState(pick(rows).id, u, pick(['in_progress', 'waiting_on_resident']))); },
    () => { store.tick(); },
    () => { clock.t += pick([1000, 60000, 20 * 60000, 3 * 3600000, 14 * 3600000]); },
  ];

  const check = (step) => {
    const s = raw();
    assert.deepEqual(JSON.parse(JSON.stringify(s)), s, 'state must be plain JSON');
    for (const conv of Object.values(s.convs)) {
      const msgs = s.msgs[conv.id] || [];
      const where = `conv ${conv.id} (${conv.kind}/${conv.status}) at step ${step}`;
      if (conv.kind === 'group') {
        assert.ok(conv.participants.length >= 2 && conv.participants.length <= 12, `${where}: group size ${conv.participants.length}`);
        assert.ok(conv.participants.every((p) => ROLES_IN_GROUP.includes(role(p))), `${where}: only staff/client/admin in groups`);
        assert.equal(new Set(conv.participants).size, conv.participants.length, `${where}: duplicate member`);
      }
      if (conv.kind === 'direct') {
        assert.equal(conv.participants.length, 2, `${where}: direct has two people`);
        const [a, b] = conv.participants.map(role);
        assert.ok(a !== b || a === 'staff' || a === 'admin' || a === 'client', `${where}`);
        if (a === 'resident' || b === 'resident') assert.ok([a, b].some((x) => x === 'staff' || x === 'admin') && !(a === 'client' || b === 'client') && !(a === 'resident' && b === 'resident'), `${where}: resident only with staff/admin`);
      }
      if (conv.kind === 'resident_support') {
        assert.ok(['bot', 'queued', 'active', 'closed'].includes(conv.status), `${where}: unknown status`);
        if (conv.status === 'queued' || conv.status === 'bot') assert.ok(!conv.assigneeId, `${where}: nobody is assigned before it is taken`);
        if (conv.status === 'active') assert.equal(role(conv.assigneeId || 'x-0'), 'staff', `${where}: active needs a staff assignee`);
      }
      if (conv.emergency) {
        assert.ok(['resident_support', 'direct'].includes(conv.kind), `${where}: emergency on the wrong kind`);
        if (conv.emergency.ackAt) assert.ok(['staff', 'admin'].includes(role(conv.emergency.ackBy)), `${where}: ack by ${conv.emergency.ackBy}`);
        if (conv.kind === 'resident_support' && conv.emergency.at && !conv.emergency.ackAt && conv.status === 'bot') assert.fail(`${where}: an open emergency must not stay with the assistant`);
      }
      if (conv.waiting) assert.equal(conv.status, 'active', `${where}: waiting only while active`);
      for (const m of msgs) {
        const w = `${where}, message ${m.id}`;
        if (m.audit) { assert.equal(m.kind, 'system', `${w}: audit must be a system card`); assert.ok(m.audit.actorId && m.audit.actorName && /^\d{4}-\d\d-\d\dT/.test(m.audit.at), `${w}: audit lacks actor or ISO time`); }
        if (m.deleted) { assert.equal(m.text, '', `${w}: deleted text kept`); assert.ok(!(m.attachments || []).length, `${w}: deleted attachments kept`); assert.ok(!Object.keys(m.reactions || {}).length, `${w}: deleted reactions kept`); }
        if (m.editedAt) assert.ok(!m.deleted && m.kind === 'text' && !m.viaChoice, `${w}: bad edited flag`);
        if (m.kind === 'text') {
          if (conv.kind === 'direct') assert.ok(conv.participants.includes(m.from), `${w}: author ${m.from} not a member`);
          // groups keep what people wrote before they left, so only roles are checked there
          if (conv.kind === 'group') assert.ok(ROLES_IN_GROUP.includes(role(m.from)), `${w}: author ${m.from} cannot be in a group`);
          if (conv.kind === 'support') assert.ok(m.from === conv.requesterId || role(m.from) === 'admin', `${w}: bad support author ${m.from}`);
          if (conv.kind === 'resident_support') assert.ok(m.from === conv.residentId || role(m.from) === 'staff', `${w}: bad resident chat author ${m.from}`);
          if (conv.kind === 'announcement') assert.equal(m.from, conv.authorId, `${w}: announcement author`);
          if (role(m.from) === 'resident' && conv.kind === 'resident_support') assert.equal(m.from, conv.residentId);
        }
        for (const [emoji, ids] of Object.entries(m.reactions || {})) assert.ok(ids.length > 0 && new Set(ids).size === ids.length, `${w}: reaction ${emoji}`);
        assert.ok((m.text || '').length <= 2000, `${w}: too long`);
      }
    }
    for (const u of USERS) {
      const rows = store.listFor(u);
      const visible = new Set(rows.map((r) => r.id));
      let sum = 0;
      for (const conv of Object.values(s.convs)) {
        const got = store.get(conv.id, u);
        assert.equal(got.ok, visible.has(conv.id), `${u} list and get disagree on ${conv.id} at step ${step}`);
        if (role(u) === 'staff' && conv.kind === 'resident_support') assert.notEqual(conv.status === 'bot' && got.ok, true, `${u} must never see an assistant-only chat (${conv.id})`);
        if (role(u) === 'resident') {
          if (conv.kind === 'support' || conv.kind === 'group') assert.ok(!got.ok, `resident ${u} sees ${conv.kind} ${conv.id}`);
          if (conv.kind === 'resident_support' && conv.residentId !== u) assert.ok(!got.ok, `resident ${u} sees another resident's chat ${conv.id}`);
        }
        if (role(u) === 'client' && (conv.kind === 'resident_support')) assert.ok(!got.ok, `client ${u} sees a resident chat`);
        if (got.ok) {
          const n = store.unreadCount(conv.id, u);
          assert.ok(Number.isInteger(n) && n >= 0 && n <= got.messages.length + 5, `${u} unread count ${n} on ${conv.id}`);
          sum += n;
          const hidden = new Set(store.pref(u).hidden);
          assert.ok(got.messages.every((m) => !hidden.has(m.id)), `${u} sees a message they deleted for themselves`);
        }
      }
      // Ticket box: every row opens, the right people see the right rows, numbers never repeat.
      const box = store.ticketBox(u);
      assert.equal(new Set(box.map((t) => t.no)).size, box.length, `${u}: duplicate ticket numbers`);
      for (const t of box) {
        assert.ok(store.ticketRecord(u, t.id).ok, `${u} cannot open ${t.no} that is listed for them`);
        if (role(u) === 'resident') assert.equal(t.requester.id, u, `resident ${u} lists someone else's ticket ${t.no}`);
        // (a Client's tickets are their Support requests, and the chats with Staff that Staff resolved: both are their own)
        if (role(u) === 'client') assert.ok((t.kind === 'support' || t.kind === 'direct') && t.requester.id === u, `client ${u} lists ${t.no}`);
        if (t.kind === 'direct') assert.ok(store.get(t.id, u).ok, `${u} lists a resolved chat ${t.no} they are not part of`);
        // Admin lists Support threads, and the resident requests that were sent to EasySpotOps Support (never the property's own)
        if (role(u) === 'admin') assert.ok(t.kind === 'support' || (t.kind === 'resident' && t.route === 'platform'), `admin ${u} lists a resident ticket ${t.no} of the property`);
        if (role(u) === 'staff' && t.kind === 'resident') assert.notEqual(t.route, 'platform', `staff ${u} lists a platform support request ${t.no}`);
        if (role(u) === 'staff' && t.kind === 'support') assert.equal(t.requester.id, u, `staff ${u} lists another person's support thread`);
        assert.ok(t.isOpen === (t.stage !== 'resolved' && t.stage !== 'closed'), `${t.no}: isOpen disagrees with stage ${t.stage}`);
      }
      const b = store.badgeCount(u);
      assert.ok(Number.isInteger(b) && b >= 0 && b <= sum, `${u} badge ${b} vs unread ${sum}`);
      for (const kind of ['pinned', 'muted', 'important']) for (const id of store.pref(u)[kind]) assert.ok(s.convs[id], `${u} ${kind} points at missing conversation ${id}`);
    }
  };

  for (let i = 0; i < steps; i++) {
    try {
      pick(ops)();
      if (i % 25 === 0) check(i);
    } catch (e) {
      e.message = `${e.message}\n--- last actions (seed ${seed}, step ${i}) ---\n${log.slice(-12).join('\n')}`;
      throw e;
    }
  }
  check(steps);
}

test('random walk: rules and invariants hold for many random actions', () => {
  const seeds = process.env.SEED ? [Number(process.env.SEED)] : Array.from({ length: 5 }, (_, i) => i + 1); // 40 seeds x 1200 steps passed once; 5 keep npm test quick
  for (const seed of seeds) run(seed, 1000);
});

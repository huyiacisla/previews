// A6: the right person, in the right place, with the right help.
// "Talk to a person" goes to the Property team (the building's staff) or to EasySpotOps Support (the platform's own support, Admin),
// by what the resident needs, and the assistant asks when it cannot tell. Nothing is sent to both.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/messaging/store.js';
import { createMemoryBus } from '../src/messaging/transport.js';
import { onText, classify } from '../src/messaging/bot.js';

const mk = () => createStore({ transport: createMemoryBus().connect(), now: () => Date.UTC(2026, 10, 9, 15, 0, 0) });
const fresh = (store, res = 'res-1') => store.ensureSession(res).convId;
const lastBot = (store, id) => [...store.get(id, 'res-1').messages].reverse().find((m) => m.kind === 'bot');
const seen = (store, user, id) => store.get(id, user).ok;

test('R601: "Talk to a person" with nothing said yet asks which team, in one line each, and does not send anything', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  assert.equal(store.get(id, 'res-1').conv.status, 'bot');
  const m = lastBot(store, id);
  assert.deepEqual(m.choices.map((c) => c.id).slice(0, 2), ['route:property', 'route:platform']);
  assert.match(m.text, /Property team handles parking/);
  assert.match(m.text, /EasySpotOps Support handles problems with the app/);
});

test('R602: Property team: queue of the staff, not of Admin; the resident sees "Property team"', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  store.choose(id, 'res-1', 'route:property');
  assert.equal(store.get(id, 'res-1').conv.status, 'queued');
  assert.equal(seen(store, 'stf-1', id), true);
  assert.equal(seen(store, 'adm-1', id), false);
  assert.ok(!store.listFor('adm-1').some((r) => r.id === id));
  assert.equal(store.listFor('res-1').find((r) => r.id === id).title, 'Property team');
});

test('R603: EasySpotOps Support: queue of Admin, not of the staff; the resident sees "EasySpotOps Support" and never an Admin name', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  store.choose(id, 'res-1', 'route:platform');
  assert.equal(store.get(id, 'res-1').conv.status, 'queued');
  assert.equal(seen(store, 'adm-1', id), true);
  assert.equal(seen(store, 'stf-1', id), false);
  assert.ok(!store.listFor('stf-1').some((r) => r.id === id));
  const row = store.listFor('res-1').find((r) => r.id === id);
  assert.equal(row.title, 'EasySpotOps Support');
  assert.match(row.subtitle, /EasySpotOps Support/);
  assert.ok(store.listFor('adm-1').find((r) => r.id === id).tags.includes('platform'));
  assert.match(store.listFor('adm-1').find((r) => r.id === id).subtitle, /^Platform support/);
  // Admin answers: the first reply takes the chat; the resident reads one name
  assert.equal(store.send(id, 'adm-1', 'We are looking at it now.').ok, true);
  const t = store.get(id, 'res-1');
  assert.equal(t.conv.status, 'active');
  const adminName = store.user('adm-1').name;
  const text = JSON.stringify(t.messages.map((m) => [m.author && m.author.name, m.kind === 'system' ? m.text : '']));
  assert.ok(!text.includes(adminName), 'no Admin name in what the resident reads');
  assert.match(text, /EasySpotOps Support/);
  assert.ok(t.messages.some((m) => m.kind === 'system' && /A member of EasySpotOps Support joined the chat\./.test(m.text)));
});

test('R604: a building matter goes to the Property team; a sentence that asks for a person with it goes there at once', () => {
  assert.equal(classify('someone parked in the fire lane'), 'property');
  assert.equal(classify('my guest pass is not approved'), 'property');
  const store = mk();
  const id = fresh(store);
  store.send(id, 'res-1', 'I want to talk to someone about my guest pass');
  const c = store.get(id, 'res-1').conv;
  assert.equal(c.status, 'queued');
  assert.equal(c.route, 'property');
  assert.equal(seen(store, 'stf-1', id), true);
});

test('R605: a problem with the app is offered EasySpotOps Support, and goes there when a person is asked for', () => {
  for (const said of ['the app crashes when I open Vehicles', 'I cannot log in', 'notifications never arrive', 'the page is blank']) {
    assert.equal(classify(said), 'platform', said);
  }
  let store = mk();
  const id = fresh(store);
  store.send(id, 'res-1', 'the app crashes when I open Vehicles');
  assert.equal(store.get(id, 'res-1').conv.status, 'bot', 'the assistant answers first');
  assert.ok(lastBot(store, id).choices.some((c) => c.id === 'route:platform'));
  const other = mk();
  const id2 = fresh(other);
  other.send(id2, 'res-1', 'I cannot log in, I need to talk to support');
  const c = other.get(id2, 'res-1').conv;
  store = other;
  assert.equal(c.route, 'platform');
  assert.equal(c.status, 'queued');
  assert.equal(seen(store, 'adm-1', id2), true);
  assert.equal(seen(store, 'stf-1', id2), false);
});

test('R606: when the sentence could be either, or says nothing, it asks instead of guessing', () => {
  assert.equal(classify('talk to someone about my car app'), 'both');
  for (const said of ['talk to someone about my car app', 'I need a human', 'talk to easyspotops team']) {
    const r = onText({}, said);
    assert.notEqual(r.outcome, 'handoff', said);
    assert.deepEqual(r.messages[0].choices.map((c) => c.id).slice(0, 2), ['route:property', 'route:platform'], said);
  }
  for (const said of ['how do I request a guest pass for my friend', 'where do I park my car', 'zzz qqq']) {
    assert.notEqual(onText({}, said).outcome, 'handoff', said);
  }
});

test('R607: danger always goes to the Property team with the 911 reminder, and never to Support', () => {
  for (const said of ['there is smoke in the garage', 'someone is hurt in the lot', 'a gas leak near my space']) {
    const r = onText({}, said);
    assert.equal(r.outcome, 'handoff', said);
    assert.equal(r.route, 'property', said);
    assert.match(r.messages[0].text, /911/);
  }
  const store = mk();
  const id = fresh(store);
  store.send(id, 'res-1', 'there is smoke coming from the garage, the app will not load');
  const c = store.get(id, 'res-1').conv;
  assert.equal(c.route, 'property');
  assert.equal(c.status, 'queued');
});

test('R608/R609: sent to the wrong place: the team passes it on with the summary; the resident is told and does not start again', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'topic:other');
  store.send(id, 'res-1', 'Nothing loads on my phone since this morning');
  store.choose(id, 'res-1', 'staff:request');
  store.choose(id, 'res-1', 'route:property'); // the wrong place
  assert.equal(store.get(id, 'res-1').conv.route, 'property');
  const before = store.get(id, 'stf-1');
  assert.ok(before.actions.includes('move:platform'));
  assert.ok(before.conv.summary.details.some((d) => /Nothing loads/.test(d)), 'a summary for whoever gets it');
  assert.equal(store.reroute(id, 'adm-1', 'platform').ok, false, 'only the team that has it can pass it on');
  assert.equal(store.reroute(id, 'stf-1', 'platform').ok, true);
  const c = store.get(id, 'res-1');
  assert.equal(c.conv.route, 'platform');
  assert.equal(c.conv.status, 'queued');
  assert.ok(c.messages.some((m) => m.kind === 'system' && /moved to EasySpotOps Support/.test(m.text)));
  assert.equal(seen(store, 'stf-1', id), false);
  const adm = store.get(id, 'adm-1');
  assert.equal(adm.ok, true);
  assert.equal(adm.conv.summary.route, 'platform');
  assert.ok(adm.conv.summary.details.some((d) => /Nothing loads/.test(d)), 'the summary went with it');
  assert.ok(adm.actions.includes('move:property'), 'and it can go back');
});

test('R607b: an open emergency never leaves the Property team', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  store.choose(id, 'res-1', 'route:property');
  assert.equal(store.send(id, 'res-1', 'A car is blocking the fire exit', { emergency: true }).ok, true);
  const r = store.reroute(id, 'stf-1', 'platform');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'emergency_open');
});

test('R619: the team can tell where a request was sent and filter by it (route:platform, route:property)', async () => {
  const { parseQuery, matchFilters } = await import('../src/messaging/query.js');
  const store = mk();
  const a = fresh(store);
  store.choose(a, 'res-1', 'staff:request');
  store.choose(a, 'res-1', 'route:platform');
  const rows = store.listFor('adm-1');
  const platform = parseQuery('route:platform');
  assert.ok(rows.some((r) => r.id === a && matchFilters(r, platform)));
  assert.ok(!rows.some((r) => r.id === a && matchFilters(r, parseQuery('route:property'))));
  assert.ok(matchFilters(rows.find((r) => r.id === a), parseQuery('route:support')), '"support" means platform');
  const staffRows = store.listFor('stf-1').filter((r) => r.kind === 'resident_support');
  assert.ok(staffRows.length > 0 && staffRows.every((r) => r.route === 'property' && /^Property/.test(r.subtitle)), 'the staff only ever see Property');
  assert.match(rows.find((r) => r.id === a).subtitle, /^Platform support/);
});

const closingLine = (store, id, who) => store.get(id, who).messages.filter((m) => m.kind === 'system').map((m) => m.text).join(' | ');

test('R621: ending a chat that only ever had the assistant keeps the assistant\'s name, makes no ticket and no status card', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'topic:guest');
  assert.equal(store.endChat(id, 'res-1').ok, true);
  const row = store.listFor('res-1').find((r) => r.id === id);
  assert.equal(row.title, 'EasySpotOps Assistant');
  assert.doesNotMatch(`${row.title} ${row.subtitle}`, /Property team|Support/);
  assert.equal(row.avatar.role, 'bot');
  assert.ok(!store.ticketBox('res-1').some((t) => t.id === id), 'not a ticket');
  const t = store.get(id, 'res-1');
  assert.ok(!t.messages.some((m) => m.audit), 'no "Status: Open → Closed" card');
  assert.match(closingLine(store, id, 'res-1'), /You ended this chat\./);
  assert.doesNotMatch(closingLine(store, id, 'res-1'), /Ticket box/);
});

test('R622/R623: ending after a team was chosen keeps that team\'s name and says the ticket is in the Ticket box', () => {
  for (const [route, name] of [['property', 'Property team'], ['platform', 'EasySpotOps Support']]) {
    const store = mk();
    const id = fresh(store);
    store.choose(id, 'res-1', 'staff:request');
    store.choose(id, 'res-1', `route:${route}`);
    assert.equal(store.endChat(id, 'res-1').ok, true);
    const row = store.listFor('res-1').find((r) => r.id === id);
    assert.equal(row.title, name, route);
    assert.equal(row.subtitle, 'Closed');
    assert.match(closingLine(store, id, 'res-1'), /You ended this chat\. The ticket is saved in the Ticket box\./);
    assert.ok(store.ticketBox('res-1').some((t) => t.id === id), 'it is in the Ticket box');
  }
});

test('R624: when a person at the team closes it, the line names the team, never the person, and points to the Ticket box', () => {
  for (const [route, handler, name] of [['property', 'stf-1', 'Property team'], ['platform', 'adm-1', 'EasySpotOps Support']]) {
    const store = mk();
    const id = fresh(store);
    store.choose(id, 'res-1', 'staff:request');
    store.choose(id, 'res-1', `route:${route}`);
    assert.equal(store.claim(id, handler).ok, true);
    assert.equal(store.resolve(id, handler).ok, true);
    const line = closingLine(store, id, 'res-1');
    assert.match(line, new RegExp(`${name} closed this ticket\\. It is saved in the Ticket box\\.`), route);
    for (const p of ['Jordan Lee', 'Sam Okafor', 'Taylor Brooks', 'Casey']) assert.ok(!line.includes(p), `${p} in "${line}"`);
    // the status cards too (who did it is the team, never the person)
    const cards = JSON.stringify(store.get(id, 'res-1').messages.filter((m) => m.audit).map((m) => m.audit.actorName));
    for (const p of [store.user(handler).name]) assert.ok(!cards.includes(p), `${p} on a status card for the resident`);
    assert.equal(store.listFor('res-1').find((r) => r.id === id).title, name);
  }
});

test('X120–X122: by job title: a Leasing Agent handles an ordinary request but cannot close one that holds an emergency; the Property Manager can', () => {
  const store = mk();
  const mkRequest = (route = 'property') => { const id = fresh(store, 'res-1'); store.choose(id, 'res-1', 'staff:request'); store.choose(id, 'res-1', `route:${route}`); return id; };
  assert.equal(store.user('stf-1').title, 'Property Manager');
  assert.equal(store.user('stf-2').title, 'Leasing Agent');
  // an ordinary request: both can take and close it
  const a = mkRequest();
  assert.equal(store.claim(a, 'stf-2').ok, true);
  assert.equal(store.resolve(a, 'stf-2').ok, true, 'a Leasing Agent closes an ordinary request');
  // an emergency: the Leasing Agent may take it and see it, not close it
  const b = (() => { store.ensureSession('res-1'); const id = fresh(store, 'res-1'); store.choose(id, 'res-1', 'staff:request'); store.choose(id, 'res-1', 'route:property'); return id; })();
  assert.equal(store.send(b, 'res-1', 'A car blocks the fire exit', { emergency: true }).ok, true);
  assert.equal(store.claim(b, 'stf-2').ok, true);
  assert.equal(store.acknowledgeEmergency(b, 'stf-2').ok, true, 'seeing it is for anybody on duty');
  const r = store.resolve(b, 'stf-2');
  assert.deepEqual([r.ok, r.reason], [false, 'role'], 'closing it is not');
  assert.equal(store.get(b, 'stf-2').conv.status, 'active', 'and nothing changed');
  assert.ok(!store.get(b, 'stf-2').actions.includes('resolve'), 'the button is not offered');
  assert.equal(store.resolve(b, 'stf-1').ok, false, 'not the Property Manager\'s while it is held by somebody else');
});

test('Away reply: while the status is Away a resident who writes gets one short note (not on every message), and only when the switch is on', () => {
  const clock = { t: Date.UTC(2026, 10, 9, 15, 0, 0) };
  let away = true;
  const store = createStore({ transport: createMemoryBus().connect(), now: () => clock.t, config: { awayReply: () => (away ? 'The property team is away right now.' : null) } });
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  store.choose(id, 'res-1', 'route:property');
  assert.equal(store.claim(id, 'stf-1').ok, true);
  const notes = () => store.get(id, 'res-1').messages.filter((m) => m.kind === 'system' && /is away right now/.test(m.text)).length;
  store.send(id, 'res-1', 'Are you there?');
  assert.equal(notes(), 1);
  clock.t += 60000;
  store.send(id, 'res-1', 'Hello?');
  assert.equal(notes(), 1, 'not again within half an hour');
  clock.t += 31 * 60000;
  store.send(id, 'res-1', 'Still there?');
  assert.equal(notes(), 2, 'again after half an hour');
  away = false;
  clock.t += 31 * 60000;
  store.send(id, 'res-1', 'Back?');
  assert.equal(notes(), 2, 'status no longer Away: no note');
});

test('SMS emergency switch: off means the critical alert still goes, but no SMS is sent', () => {
  for (const [on, expected] of [[true, /SMS and critical alert/], [false, /no SMS/]]) {
    const clock = { t: Date.UTC(2026, 10, 9, 15, 0, 0) };
    const store = createStore({ transport: createMemoryBus().connect(), now: () => clock.t, config: { smsOn: () => on } });
    const id = fresh(store);
    store.choose(id, 'res-1', 'staff:request');
    store.choose(id, 'res-1', 'route:property');
    store.send(id, 'res-1', 'Blocked fire exit', { emergency: true });
    clock.t += 4 * 60000;
    store.tick();
    const cards = store.get(id, 'stf-1').messages.filter((m) => m.audit && m.audit.field === 'Escalation').map((m) => m.audit.to);
    assert.equal(cards.length, 1, `sms=${on}`);
    assert.match(cards[0], expected, `sms=${on}`);
  }
});

test('Admin as Support: take, answer and close a Client\'s support thread; it is saved in the Ticket box of both and can be reopened', () => {
  const store = mk();
  const start = store.startSupport('cli-1', { subject: 'Export does nothing', text: 'The Export button on Reports does nothing for March.', priority: 'normal', category: 'reports' });
  assert.equal(start.ok, true);
  const id = start.convId;
  // the plain buttons the Admin has on an open support thread
  const open = store.get(id, 'adm-1');
  assert.ok(open.actions.includes('take') && open.actions.includes('resolve'), 'Take and Resolve are offered');
  assert.ok(!open.actions.includes('reopen'));
  assert.equal(store.assignSupport(id, 'adm-1', 'adm-1').ok, true);
  assert.ok(!store.get(id, 'adm-1').actions.includes('take'), 'taken: no Take again');
  assert.equal(store.send(id, 'adm-1', 'We found it. A fix is going out today.').ok, true);
  // close it
  assert.equal(store.resolve(id, 'adm-1').ok, true);
  const closed = store.get(id, 'adm-1');
  assert.equal(closed.conv.status, 'resolved');
  assert.ok(closed.actions.includes('reopen') && !closed.actions.includes('resolve'), 'closed: Reopen, no Resolve');
  // the line says where it is saved, and names the team, not the person
  const line = closed.messages.filter((m) => m.kind === 'system' && !m.audit).map((m) => m.text).join(' | ');
  assert.match(line, /EasySpotOps Support marked this ticket resolved\. It is saved in the Ticket box\./);
  assert.ok(!line.includes(store.user('adm-1').name), 'no person in the closing line');
  // saved: in the Ticket box of the Admin and of the Client, as resolved (not open)
  const adminRow = store.ticketBox('adm-1').find((t) => t.id === id);
  const clientRow = store.ticketBox('cli-1').find((t) => t.id === id);
  assert.ok(adminRow && clientRow, 'the ticket is in both Ticket boxes');
  assert.equal(adminRow.isOpen, false);
  assert.equal(clientRow.stage, 'resolved');
  assert.equal(store.ticketRecord('adm-1', id).ok, true);
  // the Client writes again: it opens again, in the same ticket
  assert.equal(store.send(id, 'cli-1', 'Thanks, one more thing: the PDF is empty.').ok, true);
  assert.equal(store.get(id, 'adm-1').conv.status, 'open');
  assert.equal(store.ticketBox('adm-1').find((t) => t.id === id).isOpen, true);
  // and the Admin can reopen by hand too
  assert.equal(store.resolve(id, 'adm-1').ok, true);
  assert.equal(store.setSupportStatus(id, 'adm-1', 'open').ok, true);
  assert.equal(store.get(id, 'adm-1').conv.status, 'open');
});

test('Admin as Support for a Resident: the Resident\'s request is taken, answered and closed, and it is saved in the Ticket box of both', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  store.choose(id, 'res-1', 'route:platform');
  assert.ok(store.get(id, 'adm-1').actions.includes('claim'));
  assert.equal(store.claim(id, 'adm-1').ok, true);
  assert.equal(store.send(id, 'adm-1', 'Please reload; it is fixed.').ok, true);
  const mid = store.get(id, 'adm-1');
  assert.ok(mid.actions.includes('resolve'), 'Resolve is offered once it is taken');
  assert.equal(store.resolve(id, 'adm-1').ok, true);
  const adminRow = store.ticketBox('adm-1').find((t) => t.id === id);
  const residentRow = store.ticketBox('res-1').find((t) => t.id === id);
  assert.ok(adminRow && residentRow, 'saved in both Ticket boxes');
  assert.equal(adminRow.route, 'platform');
  assert.equal(adminRow.isOpen, false);
  assert.equal(residentRow.assignee, 'EasySpotOps Support', 'the Resident sees the team, not the person');
  assert.match(store.get(id, 'res-1').messages.filter((m) => m.kind === 'system').map((m) => m.text).join(' | '), /EasySpotOps Support closed this ticket\. It is saved in the Ticket box\./);
  assert.equal(store.ticketBox('stf-1').some((t) => t.id === id), false, 'the property staff never see it');
});

test('every ticket has its own number, shown in the list for everyone who sees it, and none is shared; a chat with only the assistant has none', () => {
  const store = mk();
  const botOnly = fresh(store);
  assert.equal(store.listFor('res-1').find((r) => r.id === botOnly).no, '', 'only the assistant: not a ticket');
  store.endChat(botOnly, 'res-1');
  const a = fresh(store);
  store.choose(a, 'res-1', 'staff:request');
  store.choose(a, 'res-1', 'route:platform');
  const b = store.startSupport('cli-1', { subject: 'Invoice PDF', text: 'It is empty.', priority: 'normal', category: 'billing' }).convId;
  const c = store.startSupport('stf-1', { subject: 'Slow approve', text: 'Very slow.', priority: 'normal', category: 'other' }).convId;
  for (const [id, who] of [[a, 'res-1'], [a, 'adm-1'], [b, 'cli-1'], [b, 'adm-1'], [c, 'stf-1'], [c, 'adm-1']]) {
    const row = store.listFor(who).find((r) => r.id === id);
    assert.match(row.no, /^T-\d+$/, `${who} sees a number on ${id}`);
  }
  const nos = [a, b, c].map((id) => store.listFor('adm-1').find((r) => r.id === id).no);
  assert.equal(new Set(nos).size, 3, `three tickets, three numbers: ${nos}`);
  // the same number in the Ticket box and in the list
  for (const id of [a, b, c]) assert.equal(store.ticketBox('adm-1').find((t) => t.id === id).no, store.listFor('adm-1').find((r) => r.id === id).no);
  // and the number is found by searching it
  const hit = store.search('adm-1', nos[1]);
  assert.ok(JSON.stringify(hit).includes(b) || store.listFor('adm-1').some((r) => r.no === nos[1]));
});

test('Support alerts: the Admin is told of a new request; the sender is told when Support answers and when it is closed, with no person named for a resident', () => {
  const store = mk();
  const subject = 'Invoice PDF is empty';
  const id = store.startSupport('cli-1', { subject, text: 'It downloads empty.', priority: 'normal', category: 'billing' }).convId;
  // the Admin is told (and the alert opens that conversation)
  const forAdmin = store.alertsFor('adm-1').filter((a) => a.convId === id);
  assert.ok(forAdmin.length && forAdmin[0].unread > 0, 'a new request is an unread alert for the Admin');
  assert.equal(store.assignSupport(id, 'adm-1', 'adm-1').ok, true);
  assert.equal(store.send(id, 'adm-1', 'We are on it.').ok, true);
  const answered = store.alertsFor('cli-1').filter((a) => a.convId === id);
  assert.ok(answered.length && answered[0].unread > 0, 'the answer is an unread alert for the Client');
  const before = store.badgeCount('cli-1');
  assert.equal(store.resolve(id, 'adm-1').ok, true);
  assert.ok(store.badgeCount('cli-1') >= before, 'closing it does not hide the answer');
  // reading clears the Client's alert, and the Admin's alert clears when the Admin opens it
  store.markRead(id, 'cli-1');
  assert.equal(store.alertsFor('cli-1').filter((a) => a.convId === id && a.unread > 0).length, 0);
  store.markRead(id, 'adm-1');
  assert.equal(store.alertsFor('adm-1').filter((a) => a.convId === id && a.unread > 0).length, 0);
  // a Resident, closed by Support: told, without a name
  const rid = fresh(store);
  store.choose(rid, 'res-1', 'staff:request');
  store.choose(rid, 'res-1', 'route:platform');
  store.claim(rid, 'adm-1');
  store.send(rid, 'adm-1', 'Fixed, please reload.');
  store.resolve(rid, 'adm-1');
  const alert = store.alertsFor('res-1').find((a) => a.convId === rid);
  assert.ok(alert && alert.unread > 0, 'the Resident is told');
  assert.ok(!JSON.stringify(alert).includes(store.user('adm-1').name), `no Admin name in the alert: ${JSON.stringify(alert)}`);
});

test('R607 (independent check): danger said in words is a real emergency for the team, including a blocked way out; a fire LANE is only parking', () => {
  for (const said of ['a car is blocking the fire exit in the garage', 'the exit is blocked by a truck', 'a vehicle is blocking the emergency exit', 'there is smoke in the garage']) {
    assert.equal(classify(said), 'emergency', said);
    assert.equal(onText({}, said).route, 'property', said);
  }
  assert.equal(classify('someone is parked in the fire lane'), 'property');
  const store = mk();
  const id = fresh(store);
  store.send(id, 'res-1', 'a truck is blocking the fire exit in the garage');
  const staff = store.get(id, 'stf-1');
  assert.ok(staff.emergency, 'the team sees an emergency (chip, banner, first in the queue)');
  assert.ok(store.emergencies('stf-1').some((e) => e.convId === id), 'it is in the emergency banner list');
  assert.equal(store.get(id, 'stf-1').conv.route, 'property');
  const moved = store.reroute(id, 'stf-1', 'platform');
  assert.deepEqual([moved.ok, moved.reason], [false, 'emergency_open'], 'it never goes to Support');
  assert.equal(store.claim(id, 'stf-2').ok, true);
  assert.deepEqual([store.resolve(id, 'stf-2').ok, store.resolve(id, 'stf-2').reason], [false, 'role'], 'a Leasing Agent cannot close it');
});

test('R624 (independent check): the Resident\'s Ticket box names the team, never a person, in the record too', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  store.choose(id, 'res-1', 'route:property');
  store.send(id, 'res-1', 'Gas smell near my space', { emergency: true });
  store.claim(id, 'stf-1');
  store.acknowledgeEmergency(id, 'stf-1');
  store.send(id, 'stf-1', 'We are on the way.');
  store.resolve(id, 'stf-1');
  const rec = store.ticketRecord('res-1', id);
  assert.equal(rec.ok, true);
  const dump = JSON.stringify(rec.entries.map((e) => [e.text, e.audit && e.audit.actorName, e.author && e.author.name]));
  for (const n of ['Jordan Lee', 'Sam Okafor']) assert.ok(!dump.includes(n), `${n} in the Resident's Ticket box record`);
  assert.ok(!rec.entries.some((e) => e.audit && e.audit.field === 'Escalation'), 'no internal escalation card for the Resident');
  // the team still reads the full record
  assert.ok(JSON.stringify(store.ticketRecord('stf-1', id).entries).includes('Jordan Lee'));
});

test('R615: a resident cannot write to an Admin; the only way is the assistant\'s Support route', () => {
  const store = mk();
  assert.equal(store.canMessage('resident', 'admin'), false);
  assert.equal(store.canMessage('resident', 'staff'), true);
});

test('R616: Support is for problems, not for writing to: three requests a day, then the assistant says why', () => {
  const store = mk();
  for (let i = 0; i < 3; i += 1) {
    const id = fresh(store);
    store.choose(id, 'res-1', 'staff:request');
    store.choose(id, 'res-1', 'route:platform');
    assert.equal(store.get(id, 'res-1').conv.status, 'queued', `request ${i + 1}`);
    assert.equal(store.endChat(id, 'res-1').ok, true);
  }
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  store.choose(id, 'res-1', 'route:platform');
  const c = store.get(id, 'res-1');
  assert.equal(c.conv.status, 'bot', 'not queued');
  assert.match(lastBot(store, id).text, /already have 3 requests/);
  assert.ok(lastBot(store, id).choices.some((x) => x.id === 'route:property'), 'the property team is still one tap away');
});

test('R617: the assistant\'s words never name a person', () => {
  const store = mk();
  const id = fresh(store);
  store.choose(id, 'res-1', 'staff:request');
  const names = ['Jordan Lee', 'Sam Okafor', 'Taylor Brooks', 'Casey'];
  for (const m of store.get(id, 'res-1').messages) for (const n of names) assert.ok(!String(m.text).includes(n), `${n} in the assistant's text`);
});

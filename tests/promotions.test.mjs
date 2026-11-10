// Promotions as the Resident app sees them: what Staff publish shows up, drafts and expired ones do not,
// the two Staff switches work, and saving / claiming behave. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY, listPromotions, categoriesIn, readConfig, residentState, toggleSaved, claim, isLive, offerLabel } from '../src/promotions/store.js';

const memory = (seed = {}) => {
  const m = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), raw: m };
};

const TODAY = '2026-11-09';
const form = (over = {}) => ({ title: 'Valet', reward: 'First 3 months', desc: 'Show your code', cat: 'parking', otype: 'pct', oval: '20', method: 'static', code: 'VALET20', start: '2026-11-01', end: '2027-01-31', ch: ['In-App'], au: 'all', limR: '1', ...over });
const rec = (id, st, x) => ({ id, st, x: form(x), views: 0, claims: 0 });

test('published promotions show; drafts, future, expired and non-app ones do not', () => {
  const s = memory({
    [KEY.published]: [
      rec('1', 'active'),
      rec('2', 'draft'),
      rec('3', 'scheduled', { start: '2026-12-01' }),
      rec('4', 'active', { end: '2026-11-08' }),
      rec('5', 'active', { ch: ['Email'] }),
      rec('6', 'active', { end: '' }),
    ],
  });
  assert.deepEqual(listPromotions(s, { today: TODAY }).map((p) => p.id), ['1', '6']);
  // the same promotion goes live on its start date
  assert.equal(isLive(rec('3', 'scheduled', { start: '2026-12-01' }), '2026-12-01'), true);
  // and stops after its end date
  assert.equal(isLive(rec('1', 'active'), '2027-02-01'), false);
});

test('Staff switch "show promotions" hides everything; "let residents save" blocks saving', () => {
  const s = memory({ [KEY.published]: [rec('1', 'active')] });
  assert.equal(listPromotions(s, { today: TODAY }).length, 1);
  s.setItem(KEY.settings, JSON.stringify({ promoShow: false }));
  assert.deepEqual(readConfig(s), { show: false, save: true });
  assert.equal(listPromotions(s, { today: TODAY }).length, 0);
  s.setItem(KEY.settings, JSON.stringify({ promoShow: true, promoSave: false }));
  assert.equal(toggleSaved(s, 'res-1', '1'), null);
  assert.equal(residentState(s, 'res-1').saved.size, 0);
});

test('search, category filter and category names (built in and Staff-made)', () => {
  const s = memory({
    [KEY.cats]: [['c_fitness', 'Fitness', '🏷️']],
    [KEY.published]: [rec('1', 'active'), rec('2', 'active', { title: 'Gym month', cat: 'c_fitness', partner: 'Riverbend Gym' })],
  });
  assert.deepEqual(listPromotions(s, { today: TODAY, query: 'gym' }).map((p) => p.id), ['2']);
  assert.deepEqual(listPromotions(s, { today: TODAY, category: 'parking' }).map((p) => p.id), ['1']);
  assert.deepEqual(categoriesIn(s, TODAY).map((c) => [c.name, c.count]), [['Parking', 1], ['Fitness', 1]]);
});

test('offer and audience labels', () => {
  assert.equal(offerLabel({ otype: 'pct', oval: '20' }), '20% off');
  assert.equal(offerLabel({ otype: 'fixed', oval: '25' }), '$25 off');
  assert.equal(offerLabel({ otype: 'free' }), 'Free');
  assert.equal(offerLabel({ otype: 'bogo' }), 'Buy one, get one');
  const s = memory({ [KEY.published]: [rec('1', 'active', { au: 'bld', blds: ['Building A'] }), rec('2', 'active', { au: 'seg', segs: ['pet', 'ev'] })] });
  const viewer = { block: 'Building A', segments: ['pet', 'ev'] };
  const [a, b] = listPromotions(s, { today: TODAY, viewer });
  assert.equal(a.audience, 'Building A');
  assert.equal(b.audience, 'Pet owners, EV drivers');
});

test('audience: a resident only sees promotions meant for them', () => {
  const s = memory({
    [KEY.published]: [
      rec('all', 'active'),
      rec('bldA', 'active', { au: 'bld', blds: ['Building A', 'Garage'] }),
      rec('bldB', 'active', { au: 'bld', blds: ['Building B'] }),
      rec('pets', 'active', { au: 'seg', segs: ['pet'] }),
      rec('ev', 'active', { au: 'seg', segs: ['ev', 'movein'] }),
    ],
  });
  const ids = (viewer) => listPromotions(s, { today: TODAY, viewer }).map((p) => p.id);
  assert.deepEqual(ids({ block: 'Building A', segments: ['pet'] }), ['all', 'bldA', 'pets']);
  assert.deepEqual(ids({ block: 'Building B', segments: ['movein'] }), ['all', 'bldB', 'ev']);
  assert.deepEqual(ids({ block: 'Building B', segments: [] }), ['all', 'bldB']);
  assert.deepEqual(ids(undefined), ['all'], 'unknown resident: only promotions for everyone');
  // filters and counts follow the same rule
  assert.deepEqual(categoriesIn(s, TODAY, { block: 'Building B', segments: [] }).map((c) => c.count), [2]);
});

test('saving is per resident and toggles', () => {
  const s = memory({ [KEY.published]: [rec('1', 'active')] });
  assert.equal(toggleSaved(s, 'res-1', '1'), true);
  assert.equal(residentState(s, 'res-1').saved.has('1'), true);
  assert.equal(residentState(s, 'res-2').saved.has('1'), false);
  assert.equal(toggleSaved(s, 'res-1', '1'), false);
  assert.equal(residentState(s, 'res-1').saved.size, 0);
});

test('claiming: shared code, unique code per resident, per-resident limit, total limit', () => {
  const s = memory({ [KEY.published]: [rec('1', 'active', { limT: '2' }), rec('2', 'active', { method: 'unique', prefix: 'res', code: '', limR: '2' }), rec('3', 'active', { method: 'link', link: 'https://partner.example/offer', code: '' })] });
  const [p1, p2, p3] = listPromotions(s, { today: TODAY });

  const a = claim(s, 'res-1', p1);
  assert.equal(a.ok, true);
  assert.equal(a.code, 'VALET20');
  assert.equal(claim(s, 'res-1', p1).again, true, 'second claim by the same resident is not counted');
  assert.equal(JSON.parse(s.getItem(KEY.published)).find((r) => r.id === '1').claims, 0, 'the Staff record is never written to');

  // total limit: the claim count Staff keep decides (read only); at the limit a claim is refused
  const atLimit = memory({ [KEY.published]: [{ ...rec('1', 'active', { limT: '2' }), claims: 2 }] });
  const full = listPromotions(atLimit, { today: TODAY })[0];
  assert.equal(full.full, true);
  assert.equal(claim(atLimit, 'res-3', full).ok, false);
  assert.equal(listPromotions(s, { today: TODAY })[0].full, false, 'below the limit it stays open');

  // unique codes: same resident gets the same code, different residents differ, prefix is upper-cased
  const u1 = claim(s, 'res-1', p2).code;
  const u2 = claim(s, 'res-2', p2).code;
  assert.match(u1, /^RES-[A-Z2-9]{5}$/);
  assert.notEqual(u1, u2);
  assert.equal(claim(s, 'res-1', listPromotions(s, { today: TODAY })[1]).code, u1, 'second claim (limit 2) keeps the code');

  // link promotions hand back the partner address, only for http(s)
  assert.equal(claim(s, 'res-1', p3).link, 'https://partner.example/offer');
  const bad = memory({ [KEY.published]: [rec('9', 'active', { method: 'link', link: 'javascript:alert(1)', code: '' })] });
  assert.equal(listPromotions(bad, { today: TODAY })[0].link, '', 'non-http links are dropped');
});

test('image sources: uploaded data URLs and https pass, script-like ones are dropped', () => {
  const s = memory({ [KEY.published]: [rec('1', 'active', { cover: 'data:image/png;base64,AAAA', plogo: 'javascript:alert(1)' }), rec('2', 'active', { cover: 'file:///etc/passwd' })] });
  const [a, b] = listPromotions(s, { today: TODAY });
  assert.equal(a.cover.src, 'data:image/png;base64,AAAA');
  assert.equal(a.partnerLogo, '');
  assert.equal(b.cover, null);
});

test('residents never change Staff data; broken storage is harmless', () => {
  const s = memory({ [KEY.published]: [rec('1', 'active')], [KEY.cats]: [['c_x', 'X', '']], [KEY.settings]: { promoShow: true } });
  const before = [KEY.published, KEY.cats, KEY.settings].map((k) => s.getItem(k));
  const [p] = listPromotions(s, { today: TODAY });
  toggleSaved(s, 'res-1', p.id);
  claim(s, 'res-1', p);
  assert.deepEqual([KEY.published, KEY.cats, KEY.settings].map((k) => s.getItem(k)), before, 'saving and claiming write only the resident’s own record');
  const broken = { getItem: () => '{not json', setItem: () => { throw new Error('full'); } };
  assert.deepEqual(listPromotions(broken, { today: TODAY }), []);
  assert.equal(readConfig(broken).show, true);
  assert.equal(residentState(broken, 'res-1').saved.size, 0);
});

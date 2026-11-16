// The "connection". One shared state document, persisted and synced between tabs of the same browser.
//
// - Persistence: localStorage (memory fallback if blocked).
// - Live sync: BroadcastChannel, plus the `storage` event as a fallback.
// - Writes are compare-and-set on `rev`, so two tabs writing at once never overwrite each other.
//
// To go real, replace this file with one that has the same four methods
// (read, update, onChange, info) but talks to a WebSocket / HTTP API. store.js does not change.

const clone = (v) => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
}

function safeLocalStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = "__eso_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/**
 * After a reset the conversation and message numbers start again (c1, m1…). Anything kept elsewhere under the old numbers would point at a different
 * conversation now: unsent drafts, messages waiting in an outbox, and which notifications were read. They go with the data. Returns how many keys went.
 */
export function clearSideData(storage = globalThis.localStorage) {
  let n = 0;
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) keys.push(storage.key(i)); // collected first: removing while counting would skip keys
    for (const k of keys) {
      if (/^eso-msg-(draft|outbox):|^eso-notif-read:/.test(k)) {
        storage.removeItem(k);
        n += 1;
      }
    }
  } catch {
    /* storage blocked: nothing was kept */
  }
  return n;
}

export function createTransport(opts = {}) {
  const key = opts.key || "eso-msg-v1";
  let storage = opts.storage || safeLocalStorage();
  let mode = "storage";
  if (!storage) {
    storage = memoryStorage();
    mode = "memory";
  }
  const listeners = new Set();
  const emit = () =>
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    });

  let channel = null;
  const Channel = opts.Channel || globalThis.BroadcastChannel;
  if (Channel) {
    try {
      channel = new Channel(opts.channel || "eso-msg");
      channel.onmessage = emit;
      if (mode === "storage") mode = "broadcast";
    } catch {
      /* fall through to storage events */
    }
  }
  const win = opts.win || globalThis.window;
  if (win && typeof win.addEventListener === "function") {
    win.addEventListener("storage", (e) => {
      if (e.key === key || e.key === null) emit();
    });
  }

  const read = () => {
    try {
      const raw = storage.getItem(key);
      const doc = raw ? JSON.parse(raw) : null;
      // A document that is not a conversation document (hand-edited, damaged, "{}") is the same as none: the samples load again.
      const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
      return isObj(doc) && isObj(doc.convs) && isObj(doc.msgs) && Number.isFinite(doc.rev) ? doc : null;
    } catch {
      return null;
    }
  };

  /**
   * Ephemeral "live" signals (online presence, typing). Kept apart from the conversation document so that
   * frequent small updates never bump its revision. Last write wins; entries expire by timestamp.
   */
  const liveKey = `${key}:live`;
  const liveListeners = new Set();
  let liveChannel = null;
  if (Channel) {
    try {
      liveChannel = new Channel(`${opts.channel || "eso-msg"}:live`);
      liveChannel.onmessage = () =>
        liveListeners.forEach((fn) => {
          try {
            fn();
          } catch (e) {
            console.error(e);
          }
        });
    } catch {
      /* storage event fallback below */
    }
  }
  if (win && typeof win.addEventListener === "function") {
    win.addEventListener("storage", (e) => {
      if (e.key === liveKey) liveListeners.forEach((fn) => fn());
    });
  }
  const live = {
    read() {
      try {
        const raw = storage.getItem(liveKey);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    },
    update(fn) {
      const d = live.read();
      fn(d);
      // Prune relative to the newest entry, not the wall clock (the store owns the clock).
      const all = [...Object.values(d.presence || {}), ...Object.values(d.typing || {}).flatMap((m) => Object.values(m))];
      const t = all.length ? Math.max(...all) : 0;
      for (const [u, ts] of Object.entries(d.presence || {})) if (t - ts > 5 * 60000) delete d.presence[u];
      for (const [c, m] of Object.entries(d.typing || {})) {
        for (const [u, ts] of Object.entries(m)) if (t - ts > 15000) delete m[u];
        if (!Object.keys(m).length) delete d.typing[c];
      }
      try {
        storage.setItem(liveKey, JSON.stringify(d));
      } catch {
        /* best effort */
      }
      if (liveChannel) liveChannel.postMessage(1);
    },
    onChange(fn) {
      liveListeners.add(fn);
      return () => liveListeners.delete(fn);
    },
  };

  /**
   * update(fn, seed): fn receives a draft copy of the state and mutates it (or returns a new one).
   * Return `false` from fn to abort without writing. Retries when another tab wrote in between.
   */
  function update(fn, seed) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const current = read() || seed();
      const before = current.rev || 0;
      const draft = clone(current);
      const out = fn(draft);
      if (out === false) return { changed: false, state: current };
      const next = out || draft;
      const stored = read();
      if (stored && (stored.rev || 0) !== before) continue; // lost a race, retry on fresh state
      next.rev = before + 1;
      try {
        storage.setItem(key, JSON.stringify(next));
      } catch (error) {
        return { changed: false, error, state: current };
      }
      if (channel) channel.postMessage({ rev: next.rev });
      return { changed: true, state: next };
    }
    return { changed: false, error: new Error("Write conflict, please retry."), state: read() };
  }

  return {
    read,
    update,
    live,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    info: () => ({ mode, key }),
    close() {
      listeners.clear();
      if (channel) channel.close();
    },
  };
}

/** Two "tabs" in one process, for tests and for the hub's self-check. Same code path as the real transport. */
export function createMemoryBus() {
  const store = new Map();
  const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => void store.set(k, String(v)), removeItem: (k) => void store.delete(k) };
  const peers = new Set();
  class BusChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      peers.add(this);
    }
    postMessage(data) {
      for (const p of peers) if (p !== this && p.name === this.name && p.onmessage) queueMicrotask(() => p.onmessage({ data }));
    }
    close() {
      peers.delete(this);
    }
  }
  return { connect: () => createTransport({ storage, Channel: BusChannel, win: null }) };
}

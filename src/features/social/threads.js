// Comments in reading order, with the answers under them. Pure logic, no DOM, shared by the Staff and the Resident side.
//
// A comment says which one it answers (`parent`, a comment id) or none (a comment on the post itself). The list comes back flat, in the order to read
// it: a comment, then its answers (and theirs), then the next comment; each one carries its `depth` (0 for a comment on the post) and `replyCount`, how
// many answers there are under it at any depth, which is the number "View 3 replies" shows. An answer whose parent is not there (deleted) reads as a
// comment on the post.

export function nest(nodes) {
  const byId = new Map(nodes.map((n) => [String(n.id), n]));
  const kids = new Map();
  const top = [];
  for (const n of nodes) {
    const parent = n.parent != null && String(n.parent) !== String(n.id) && byId.has(String(n.parent)) ? String(n.parent) : null;
    if (parent) {
      if (!kids.has(parent)) kids.set(parent, []);
      kids.get(parent).push(n);
    } else top.push(n);
  }
  const byTime = (a, b) => (Number(a.t) || 0) - (Number(b.t) || 0);
  const out = [];
  const seen = new Set();
  const walk = (n, depth, parentId) => {
    if (seen.has(String(n.id))) return 0; // a loop in the data is not followed twice
    seen.add(String(n.id));
    n.depth = depth;
    n.parentId = parentId;
    out.push(n);
    let count = 0;
    for (const k of (kids.get(String(n.id)) || []).sort(byTime)) count += 1 + walk(k, depth + 1, String(n.id));
    n.replyCount = count;
    return count;
  };
  for (const n of top.sort(byTime)) walk(n, 0, null);
  return out;
}

// What is new for a person in Social, as the bell lists it. Pure logic, no DOM, so node --test can run it.
//
// The rules (the same words as the UI, so a test can name them):
//  - A resident is told about a reply to one of their comments ("replied to your comment"), about what others wrote on a post after they joined it
//    ("also replied"), and about announcements. Comments that were on a post before they joined are never news.
//  - Staff are told about a resident's reply to one of their posts or to one of their comments, and about what neighbors posted for everyone.
// Each item carries `post` and, for a reply, `comment`, so the bell can take the person to that comment. Which items were seen is the page's business.

export const clip = (s, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** `posts` is a timeline as the person reads it (staff-store or store); `staff` says which edition. Newest first. */
export function socialAlerts(posts, { staff }) {
  const out = [];
  for (const p of posts) {
    const parentOf = (r) => (r.parentId ? p.replies.find((x) => x.id === r.parentId) : null);
    const live = (r) => !r.state || r.state === "ok"; // a comment that was deleted or removed is not news
    if (staff) {
      // A resident's reply to one of my posts, or to one of my comments anywhere.
      for (const r of p.replies) {
        if (r.role !== "Resident" || !live(r)) continue;
        const parent = parentOf(r);
        const toMe = !!parent && parent.key === "me";
        if (!p.mine && !toMe) continue;
        out.push({
          id: `r-${p.id}-${r.id}`,
          t: r.t,
          who: r.name,
          what: `${toMe ? "replied to your comment" : parent ? `replied to ${parent.name}` : "replied"}: “${clip(r.text)}”`,
          meta: "Replies",
          icon: "i-message",
          post: p.id,
          comment: r.id,
          name: r.name,
        });
      }
      if (!p.mine && p.role === "Resident" && p.aud !== "staff")
        out.push({ id: `c-${p.id}`, t: p.t, who: p.name, what: "posted in Community", meta: "C&A", icon: "i-users", post: p.id, name: p.name });
      continue;
    }
    if (p.announcement) out.push({ id: `a-${p.id}`, t: p.t, who: p.name, what: "posted a new announcement", meta: "C&A", icon: "i-megaphone", post: p.id, name: p.name });
    // Replies: a direct answer to one of my comments, and what others wrote after I joined the post.
    const mineAt = Math.min(...p.replies.filter((r) => r.mine && r.t && live(r)).map((r) => r.t)); // Infinity when I have not commented
    for (const r of p.replies) {
      if (r.mine || !r.t || !live(r)) continue;
      const parent = parentOf(r);
      const toMe = !!parent && parent.mine;
      if (!toMe && !(r.t > mineAt)) continue;
      out.push({
        id: `r-${p.id}-${r.id}`,
        t: r.t,
        who: r.name,
        what: `${toMe ? "replied to your comment" : "also replied"}: “${clip(r.text)}”`,
        meta: "Replies",
        icon: "i-message",
        post: p.id,
        comment: r.id,
        name: r.name,
      });
    }
  }
  return out.sort((a, b) => b.t - a.t);
}

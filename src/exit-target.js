// Where the "Exit" button of a full-page app (Messages, Ticket box, Social, Promotions, Settings) goes.
//
// Exit always leaves the page: to the page the person came from when that was another page of this app, otherwise to the portal's home
// (Home for a resident, Dashboard for the others). It is a plain link, so it works from the keyboard and in a new tab, and it does not depend on
// how many steps the person took inside the page (history.back() would only have undone those: that was the "return does not go back" bug).
// "Back" is a separate button that steps back inside the page (a conversation to the list, a menu page to the feed).
//
// `own` is the end of this page's own path ("/messages.html"): a referrer that is this same page does not count as "came from".
// ?as= and ?dark are kept on the way home; "embed" is not (it only says the page sits inside the portal frame).

export function exitTarget(own, home) {
  try {
    const ref = new URL(document.referrer);
    if (ref.origin === location.origin && !ref.pathname.endsWith(own)) return `${ref.pathname}${ref.search}`;
  } catch { /* no referrer: home */ }
  const q = new URLSearchParams(location.search);
  q.delete('embed');
  return q.toString() ? `${home}?${q}` : home;
}

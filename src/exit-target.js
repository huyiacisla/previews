// Where the "Exit" button of a full-page app (Messages, Ticket box, Social, Promotions, Settings) goes.
//
// Exit always leaves the page: to the page the person came from when that was another page of this app, otherwise to the portal's home
// (Home for a resident, Dashboard for the others). It is a plain link, so it works from the keyboard and in a new tab, and it does not depend on
// how many steps the person took inside the page (history.back() would only have undone those: that was the "return does not go back" bug).
// "Back" is a separate button that steps back inside the page (a conversation to the list, a menu page to the feed).
//
// `own` is the end of this page's own path ("/messages.html"): a referrer that is this same page does not count as "came from".
// ?as= and ?dark are kept on the way home; "embed" is not (it only says the page sits inside the portal frame).

// Messages and the Ticket box link to each other (Messages > "Ticket box", Ticket box > "Open in Messages"). Coming from the other one of the pair does not count as
// "came from": otherwise Exit sends the person back and forth between the two for ever (they are stuck). Exit then goes home.
const FULL_PAGE_APP = /\/(messages|tickets)(-content)?\.html$/;

export function exitTarget(own, home) {
  try {
    const ref = new URL(document.referrer);
    if (ref.origin === location.origin && !ref.pathname.endsWith(own) && !FULL_PAGE_APP.test(ref.pathname)) return `${ref.pathname}${ref.search}`;
  } catch { /* no referrer: home */ }
  const q = new URLSearchParams(location.search);
  q.delete('embed');
  return q.toString() ? `${home}?${q}` : home;
}

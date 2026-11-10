/* EasySpotOps staff account-settings: quality pass, runtime fixes. Loaded as <script type="module"> by account-settings.html.
   NOTE: BRIEF.md says no JS besides preview.js; this file is a deliberate exception requested for this page only.
   Does not edit the app's render code: it patches the DOM after each render via a debounced MutationObserver.
   Selectors are specific to this prototype (#content, #toast, .dd h6, nav.crumb, .pzst, .srow/.row/.prow/.pzrow). */
(function(){
function init(){
var b=document.body;if(!b)return;

/* 1. Skip link. Uses a click handler, not href="#content", because the app routes on location.hash. */
if(!document.querySelector('.qa-skip')){var a=document.createElement('a');a.className='qa-skip';a.href='#content';a.textContent='Skip to main content';
a.addEventListener('click',function(e){e.preventDefault();var c=(b.classList.contains('fdon')&&document.getElementById('feedroot'))||document.getElementById('content');if(c){c.setAttribute('tabindex','-1');c.focus()}});
b.insertBefore(a,b.firstChild)}

/* 1b. Social sidebar item follows Settings > Social, always.
   The app's apply() rewrites document.body.className, wiping .soc-nosb / .soc-off, and applySocial() (private closure)
   only reruns on a few events. With "Show Social in sidebar" OFF the item therefore flipped back to visible after the next
   navigation (it reappeared after clicking Community & Announcements). Re-apply the same two classes from the saved
   setting (localStorage "eso-social") after every class rewrite. Same rule as applySocial(): soc-off = !on; soc-nosb = !sidebar || !on. */
function soc(){var s={};try{s=JSON.parse(localStorage.getItem('eso-social')||'{}')||{}}catch(e){}var on=s.on!==false,sb=s.sidebar!==false;b.classList.toggle('soc-off',!on);b.classList.toggle('soc-nosb',!sb||!on)}
new MutationObserver(soc).observe(b,{attributes:true,attributeFilter:['class']});soc();

function fix(){
var c=document.getElementById('content');
/* 2. Landmarks and live regions (the Social feed renders into #feedroot and hides #content) */
if(c&&c.getAttribute('role')!=='main')c.setAttribute('role','main');
var fr=document.getElementById('feedroot');if(fr&&fr.getAttribute('role')!=='main')fr.setAttribute('role','main');
var t=document.getElementById('toast');if(t&&!t.getAttribute('aria-live')){t.setAttribute('role','status');t.setAttribute('aria-live','polite')}
/* 3. Heading order: menu group labels are not part of the page outline; never skip a level inside #content */
document.querySelectorAll('.dd h6').forEach(function(h){if(h.getAttribute('role')!=='presentation')h.setAttribute('role','presentation')});
if(c){var prev=0;c.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function(h){var l=+h.tagName[1];if(prev&&l>prev+1){l=prev+1;h.setAttribute('aria-level',l)}else if(h.getAttribute('aria-level')&&+h.getAttribute('aria-level')!==l&&!(prev&&l>prev+1)){h.removeAttribute('aria-level')}prev=l})}
if(c){
/* 4. Unlabelled form controls: take the row title, else the placeholder */
c.querySelectorAll('select:not([aria-label]),input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([aria-label])').forEach(function(f){if(f.id&&document.querySelector('label[for="'+f.id+'"]')||f.closest('label'))return;var row=f.closest('.srow,.row,.prow,.pzrow');var t=row&&row.querySelector('.stt,b,strong,h4,h5');var txt=t&&t.textContent.trim()||f.getAttribute('placeholder')||'';if(txt)f.setAttribute('aria-label',txt)});
/* 5. Controls under 24px tall get a larger hit area (switches excluded: spaced apart, pass by spacing exception) */
c.querySelectorAll('a[href]:not(.qa-tap),button:not(.sw):not([role=switch]):not(.qa-tap)').forEach(function(bt){if(bt.offsetHeight&&bt.offsetHeight<24)bt.classList.add('qa-tap')})}
/* 6. Breadcrumb semantics */
var cr=document.querySelector('nav.crumb');if(cr){if(!cr.getAttribute('aria-label'))cr.setAttribute('aria-label','Breadcrumb');var l=cr.lastElementChild;if(l&&l.tagName!=='A'&&!l.getAttribute('aria-current'))l.setAttribute('aria-current','page')}
}

/* 7. Scroll jitter on Personalize.
   The sticky "Your design" card (.pzst) shrinks (277px -> 101px) when the app adds .stuck. That cut the page height,
   the browser clamped scrollY, the card unstuck and re-expanded: a loop. Keep the total page height constant instead. */
function pz(){var c=document.querySelector('#content .pzst');if(!c)return;var st=c.classList.contains('stuck');if(c._qaS===st)return;c._qaS=st;
var de=document.documentElement;
if(!st){c.style.marginBottom='';c._qaD=de.scrollHeight}
else if(c._qaD!=null){c.style.marginBottom='';var m=parseFloat(getComputedStyle(c).marginBottom)||0;var ex=Math.max(0,c._qaD-de.scrollHeight);if(ex)c.style.marginBottom=(m+ex)+'px'}}
new MutationObserver(pz).observe(b,{attributes:true,attributeFilter:['class'],subtree:true});pz();

/* Debounce with setTimeout (requestAnimationFrame is paused in hidden panes and left the flag stuck) */
var q=0;function sched(){if(q)return;q=setTimeout(function(){q=0;fix();pz()},60)}
fix();addEventListener('hashchange',sched);
new MutationObserver(sched).observe(b,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

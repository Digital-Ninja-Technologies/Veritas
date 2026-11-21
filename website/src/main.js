import '@fontsource-variable/bricolage-grotesque/wdth.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import '@fontsource/istok-web/700.css';
import './styles.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { STORE_URLS } from './config.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;
const CONTACT_ENDPOINT = 'https://formspree.io/f/xaqgwbra';
const ADMIN_API_BASE = 'https://admin.useveritasapp.com';

// Best-effort copy into the admin dashboard — never blocks the user-facing
// submit flow, which still lives or dies by the Formspree request above.
function notifyDashboard(path, payload) {
  fetch(ADMIN_API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

/* ------------------------------------------------------------------ smooth scroll */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
const stopScroll = () => lenis && lenis.stop();
const startScroll = () => lenis && lenis.start();

function scrollToTarget(target, immediate = false) {
  if (!target) return;
  if (lenis) lenis.scrollTo(target, { offset: -10, duration: immediate ? 0 : 1.4, immediate, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
}

document.addEventListener('click', (e) => {
  if (e.defaultPrevented) return;
  const a = e.target.closest('a[href*="#"]');
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '') || !url.hash) return;
  const target = $(url.hash);
  if (!target) return;
  e.preventDefault();
  closeMenu();
  scrollToTarget(target);
  history.replaceState(null, '', url.hash);
});

/* ------------------------------------------------------------------ nav + progress */
const nav = $('#nav');
const bar = $('.progress i');
let lastY = 0;
function onScroll(y) {
  if (bar) gsap.set(bar, { scaleX: Math.min(1, y / Math.max(1, document.documentElement.scrollHeight - innerHeight)) });
  lastY = y;
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
else addEventListener('scroll', () => onScroll(scrollY), { passive: true });

const burger = $('#burger');
const menu = $('#menu');
let menuOpen = false;
function setMenu(open) {
  if (!menu) return;
  menuOpen = open;
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  open ? stopScroll() : startScroll();
  if (!open) root.style.removeProperty('overflow');
}
function closeMenu() { if (menuOpen) setMenu(false); }
burger && burger.addEventListener('click', () => setMenu(!menuOpen));
addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeDownload(); } });

/* ------------------------------------------------------------------ cursor + magnetic */
if (finePointer && !reduce) {
  const cur = $('.cursor');
  if (cur) {
    root.classList.add('has-cursor');
    const qx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const qy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    addEventListener('pointermove', (e) => { qx(e.clientX); qy(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => { cur.classList.toggle('is-hover', !!e.target.closest('a, button, [data-hover], .qa, input, .range, .ccard')); cur.classList.toggle('is-nav', !!e.target.closest('#nav')); });
  }
  $$('.magnetic').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, .5)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, .5)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* ------------------------------------------------------------------ loader + hero intro */
function heroIntro() {
  const inners = $$('.hero__title .inner');
  if (!inners.length) {
    gsap.from('.page-hero > .wrap > *', { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1 });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  gsap.set(inners, { yPercent: 115 });
  tl.to(inners, { yPercent: 0, duration: 1.3, stagger: 0.14 }, 0)
    .to('.hero [data-reveal]', { opacity: 1, y: 0, duration: 1, stagger: 0.09 }, 0.35)
    .from('.orbit', { scale: 0.82, opacity: 0, duration: 1.6, clearProps: 'transform,opacity' }, 0.1)
    .from('.chip', { opacity: 0, duration: 1.2, stagger: 0.08, clearProps: 'opacity' }, 0.5)
    .from('.float-card', { opacity: 0, duration: 1, stagger: 0.15, clearProps: 'opacity' }, 0.9);
}

function finishLoading() {
  root.classList.remove('is-loading');
  ScrollTrigger.refresh();
  heroIntro();
  if (location.hash) {
    const t = $(location.hash);
    if (t) requestAnimationFrame(() => scrollToTarget(t, true));
  }
}

function runLoader() {
  const loader = $('#loader');
  let seen = false;
  try { seen = sessionStorage.getItem('veritas_loaded') === '1'; } catch (e) {}
  if (!loader || reduce || seen) {
    loader && loader.remove();
    root.classList.remove('is-loading');
    if (reduce) $$('[data-reveal]').forEach((el) => (el.style.cssText = 'opacity:1;transform:none'));
    requestAnimationFrame(finishLoading);
    return;
  }
  try { sessionStorage.setItem('veritas_loaded', '1'); } catch (e) {}
  const tl = gsap.timeline();
  gsap.set('.loader__mark .dot', { svgOrigin: '27 16', scale: 0 });
  tl.to('.loader__mark .r1', { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0.1)
    .to('.loader__mark .r2', { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0.25)
    .to('.loader__mark .dot', { scale: 1, duration: 0.55, ease: 'back.out(3)' }, 0.75)
    .to('.loader__mark', { scale: 1.15, duration: 0.5, ease: 'power2.inOut' }, 1.05)
    .to('.loader__mark', { scale: 6, opacity: 0, duration: 0.7, ease: 'power3.in' }, 1.5)
    .to('.loader__door--l', { xPercent: -101, duration: 1, ease: 'expo.inOut' }, 1.55)
    .to('.loader__door--r', { xPercent: 101, duration: 1, ease: 'expo.inOut' }, 1.55)
    .add(() => { finishLoading(); }, 1.75)
    .add(() => loader.remove(), 2.7);
}

/* ------------------------------------------------------------------ hero pin: hero stays put, next section scrolls up over it */
(function heroPin() {
  const hero = $('.hero');
  if (!hero || reduce) return;
  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom top',
    pin: true,
    pinSpacing: false,
  });
})();

/* ------------------------------------------------------------------ marquee */
(function marquee() {
  const track = $('.marquee__track');
  if (!track || reduce) return;
  let x = 0, dir = -1, smoothDir = -1;
  gsap.ticker.add(() => {
    const w = track.firstElementChild.offsetWidth;
    const v = lenis ? Math.abs(lenis.velocity) : 0;
    if (lenis && v > 0.2) dir = lenis.direction ? -lenis.direction : dir;
    smoothDir += (dir - smoothDir) * 0.06;
    x += smoothDir * (0.7 + v * 0.35);
    if (x <= -w) x += w; else if (x > 0) x -= w;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
})();

/* ------------------------------------------------------------------ manifesto word reveal */
(function manifesto() {
  const el = $('#manifesto');
  if (!el) return;
  const words = [];
  (function split(node) {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = part; words.push(s); frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) split(n);
    });
  })(el);
  if (reduce) { words.forEach((w) => (w.style.opacity = 1)); $$('mark', el).forEach((m) => m.classList.add('is-lit')); return; }
  gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 62%', scrub: true } });
  $$('mark', el).forEach((m) => ScrollTrigger.create({ trigger: m, start: 'top 58%', onEnter: () => m.classList.add('is-lit'), onLeaveBack: () => m.classList.remove('is-lit') }));
})();

/* ------------------------------------------------------------------ journey (pinned) */
(function journey() {
  const section = $('.journey');
  const stage = $('#stage');
  if (!section || !stage) return;
  const steps = $$('#steps li');
  const bar = $('#stepsBar');
  const ms = $$('.ms li', stage);
  const $status = $('#stStatus'), $big = $('#stBig'), $sub = $('#stSub'), $pay = $('#stPayout');
  const RATE = 1478, MILESTONE = 800;
  const cfg = {
    1: { status: 'Funding', big: '$2,400<span> USDC</span>', sub: 'Leaving Tobi’s wallet', st: ['pending', 'pending', 'pending'], label: ['Pending', 'Pending', 'Pending'] },
    2: { status: 'Locked in escrow', big: '$2,400<span> USDC</span>', sub: 'Visible to both sides', st: ['locked', 'locked', 'locked'], label: ['Locked', 'Locked', 'Locked'] },
    3: { status: 'Milestone approved', big: '$800<span> released</span>', sub: 'Tobi approved milestone 1', st: ['approved', 'locked', 'locked'], label: ['Approved', 'Locked', 'Locked'] },
    4: { status: 'Paid out', big: '$800<span> → NGN</span>', sub: '$1 = ₦1,478', st: ['paid', 'locked', 'locked'], label: ['Paid', 'Locked', 'Locked'] },
  };
  const counter = { v: 0 };
  let current = 0;
  function setStep(n) {
    if (n === current) return;
    current = n;
    const c = cfg[n];
    stage.dataset.step = n;
    $status.textContent = c.status;
    $big.innerHTML = c.big;
    $sub.textContent = c.sub;
    ms.forEach((li, i) => { li.dataset.state = c.st[i]; $('.ms__s', li).textContent = c.label[i]; });
    steps.forEach((li, i) => li.classList.toggle('is-active', i === n - 1));
    gsap.fromTo($big, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    if (n === 4) gsap.to(counter, { v: MILESTONE * RATE, duration: 1.6, ease: 'power3.out', onUpdate: () => ($pay.textContent = '₦' + Math.round(counter.v).toLocaleString('en-US')) });
    else { gsap.killTweensOf(counter); counter.v = 0; $pay.textContent = '₦0'; }
  }
  setStep(1);
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1px)', () => {
    if (reduce) { steps.forEach((li) => li.classList.add('is-active')); return; }
    ScrollTrigger.create({
      trigger: '.journey__pin', start: 'top top', end: () => '+=' + Math.round(innerHeight * 3.2), pin: true, anticipatePin: 1,
      onUpdate: (self) => { setStep(Math.min(4, Math.floor(self.progress * 4) + 1)); gsap.set(bar, { scaleX: self.progress }); },
    });
  });
  // manual step control by click (a11y + touch)
  steps.forEach((li, i) => li.addEventListener('click', () => {
    if (reduce) setStep(i + 1);
  }));
})();

/* ------------------------------------------------------------------ calculator */
(function calculator() {
  const card = $('#calc');
  if (!card) return;
  const RATES = { NGN: [1478, '₦'], GHS: [15.4, 'GH₵'], KES: [129, 'KSh '], ZAR: [18.2, 'R'], XOF: [605, 'CFA '], EUR: [0.92, '€'], GBP: [0.79, '£'] };
  const amt = $('#calcAmount'), range = $('#calcRange'), out = $('#calcOut'), rateEl = $('#calcRate');
  const tabs = $$('.calc__tabs--pay button', card);
  const fundTabs = $$('.calc__tabs--fund button', card);
  const sym = $('#calcSym'), fundEl = $('#calcFund');
  // value of 1 unit of the funding currency in USD (illustrative)
  const FUND = { USDT: [1, '$'], USDC: [1, '$'], USD: [1, '$'], GBP: [1 / 0.79, '£'], EUR: [1 / 0.92, '€'] };
  let cur = 'NGN', fund = 'USDC', usd = 2400;
  const shown = { v: usd * RATES[cur][0] };
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const fit = () => { amt.style.width = Math.max(2, amt.value.length) + 0.4 + 'ch'; };
  const paint = () => { out.textContent = RATES[cur][1] + fmt(shown.v); };
  function update(animate = true) {
    const [r0, psym] = RATES[cur];
    const r = r0 * FUND[fund][0];
    const target = usd * r;
    sym.textContent = FUND[fund][1]; fundEl.textContent = fund;
    rateEl.textContent = `1 ${fund} ≈ ${psym}${r >= 100 ? fmt(r) : +r.toFixed(2)}`;
    fit();
    range.style.setProperty('--p', ((usd - range.min) / (range.max - range.min)) * 100 + '%');
    if (!animate || reduce) { shown.v = target; paint(); return; }
    gsap.to(shown, { v: target, duration: 0.7, ease: 'power3.out', overwrite: true, onUpdate: paint });
  }
  range.addEventListener('input', () => { usd = +range.value; amt.value = usd.toLocaleString('en-US'); update(); });
  amt.addEventListener('input', () => {
    const n = parseInt(amt.value.replace(/\D/g, ''), 10) || 0;
    usd = Math.min(n, 1000000);
    amt.value = usd ? usd.toLocaleString('en-US') : '';
    range.value = Math.min(Math.max(usd, +range.min), +range.max);
    update();
  });
  fundTabs.forEach((b) => b.addEventListener('click', () => {
    fund = b.dataset.fund;
    fundTabs.forEach((t) => t.setAttribute('aria-selected', String(t === b)));
    update();
  }));
  tabs.forEach((b) => b.addEventListener('click', () => {
    cur = b.dataset.cur;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t === b)));
    update();
  }));
  update(false);
})();

/* ------------------------------------------------------------------ audience toggle + phone */
(function product() {
  const seg = $('.seg');
  if (!seg) return;
  const btns = $$('button', seg);
  const panels = $$('.panel');
  const screens = { freelancer: $('.screen--f'), client: $('.screen--c') };
  function set(aud) {
    seg.dataset.active = aud;
    btns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aud === aud)));
    panels.forEach((p) => p.classList.toggle('is-on', p.dataset.panel === aud));
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle('is-on', k === aud));
  }
  btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.aud)));
  seg.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { set(seg.dataset.active === 'client' ? 'freelancer' : 'client'); } });

  const wrap = $('.phonewrap'), phone = $('#phone');
  if (wrap && phone && finePointer && !reduce) {
    const rx = gsap.quickTo(phone, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(phone, 'rotationY', { duration: 0.6, ease: 'power3' });
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 22);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 16);
    });
    wrap.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }
  // auto-flip hint: swap screens once when scrolled into view
  if (!reduce) gsap.from('.phone', { y: 90, rotate: 4, opacity: 0, duration: 1.4, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: '.phonewrap', start: 'top 80%' } });
})();

/* ------------------------------------------------------------------ currencies (horizontal) */
(function currencies() {
  const track = $('#curTrack');
  if (!track || reduce) return;
  const mm = gsap.matchMedia();
  mm.add('(min-width: 961px)', () => {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.cur__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 },
    });
  });
})();

/* ------------------------------------------------------------------ trust dial */
(function dial() {
  const ticks = $('#ticks');
  if (!ticks) return;
  let svg = '';
  for (let i = 0; i < 72; i++) {
    const long = i % 6 === 0, a = (i / 72) * Math.PI * 2, r1 = 150, r2 = long ? 128 : 138;
    svg += `<line x1="${200 + Math.sin(a) * r1}" y1="${200 - Math.cos(a) * r1}" x2="${200 + Math.sin(a) * r2}" y2="${200 - Math.cos(a) * r2}" stroke="currentColor" stroke-width="${long ? 2.2 : 1}"/>`;
  }
  ticks.innerHTML = svg;
  if (!reduce) gsap.to('#dial', { rotation: 200, svgOrigin: '200 200', ease: 'none', scrollTrigger: { trigger: '.trust', start: 'top bottom', end: 'bottom top', scrub: true } });
})();

/* ------------------------------------------------------------------ faq */
(function faq() {
  const list = $('#faqList');
  if (!list) return;
  const items = $$('.qa', list);
  const open = (qa, on) => { qa.classList.toggle('is-open', on); $('button', qa).setAttribute('aria-expanded', String(on)); };
  items.forEach((qa) => $('button', qa).addEventListener('click', () => {
    const was = qa.classList.contains('is-open');
    items.forEach((o) => open(o, false));
    open(qa, !was);
  }));
  open(items[0], true);
})();

/* ------------------------------------------------------------------ scroll reveals */
(function reveals() {
  if (reduce) return;
  const sel = '.manifesto .eyebrow, .calc .h2, .calc .lead, .calc__card, .product__head > *, .feat li, .invite, .trust .h2, .trust__cards article, .faq__head > *, .qa, .cta__inner > *:not(.cta__art), .footer__top > *, [data-rise]';
  gsap.utils.toArray(sel).forEach((el) => {
    gsap.from(el, { y: 46, opacity: 0, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  const giant = $('.footer__giant span');
  if (giant) gsap.from(giant, { yPercent: 60, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.footer__giant', start: 'top 95%', once: true } });
  const orbit = $('.hero__visual');
  if (orbit && finePointer) {
    const a = $('.ring--a'), b = $('.ring--b');
    const ax = gsap.quickTo(a, 'x', { duration: 1, ease: 'power3' }), bx = gsap.quickTo(b, 'x', { duration: 1, ease: 'power3' });
    $('.hero').addEventListener('pointermove', (e) => { const k = (e.clientX / innerWidth - 0.5) * 36; ax(k); bx(-k); });
  }
})();

/* ------------------------------------------------------------------ store buttons */
$$('[data-store]').forEach((a) => {
  const url = STORE_URLS[a.dataset.store];
  if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; return; }
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const label = $('small', a);
    if (!label || a.dataset.busy) return;
    a.dataset.busy = '1';
    const old = label.textContent;
    label.textContent = 'Store link not set yet';
    setTimeout(() => { label.textContent = old; delete a.dataset.busy; }, 1800);
  });
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ contact form */
(function contact() {
  const form = $('[data-contact]');
  if (!form) return;
  const err = $('.wl-error', form), btn = $('button[type="submit"]', form), sent = $('.cform__sent');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const bad = (m) => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    if (!d.name.trim()) return bad('Please enter your name.');
    if (!EMAIL_RE.test(d.email.trim())) return bad('Please enter a valid email address.');
    if (d.message.trim().length < 5) return bad('Please add a short message.');
    btn.disabled = true; $('span', btn).textContent = 'Sending…';
    try {
      const res = await fetch(CONTACT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ name: d.name, email: d.email, message: d.message, _subject: 'Contact Form — Veritas' }) });
      if (!res.ok) throw new Error('bad status');
      notifyDashboard('/api/leads/contact', { name: d.name, email: d.email, message: d.message });
      $('[data-sent-name]').textContent = d.name; form.style.display = 'none'; sent.classList.add('is-on');
    } catch (_) { bad('Could not send your message. Please try again or email hello@useveritasapp.com.'); }
    finally { btn.disabled = false; $('span', btn).textContent = 'Send message'; }
  });
})();

/* ------------------------------------------------------------------ download modal */
const dl = $('#dl-modal');
let dlLastFocus = null;
const dlState = { os: 'ios', i: 0, timer: null, open: false };
const DL_DUR = 3800;
const DL_STEPS = [
  ['Fund & lock', 'The client funds the project. Veritas locks it in escrow.'],
  ['Approve a milestone', 'One tap from the client releases that milestone’s payment.'],
  ['Get paid locally', 'Naira, cedis, shillings or rand. Settled in minutes.'],
];

function detectOS() {
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return null;
}

async function renderQR() {
  const box = $('#dlQr'), hint = $('#dlQrHint');
  if (!box) return;
  const url = STORE_URLS[dlState.os];
  const name = dlState.os === 'ios' ? 'App Store' : 'Google Play';
  if (!url) {
    box.classList.add('is-empty'); box.innerHTML = '';
    hint.textContent = 'The QR code appears here once the store link is set.';
    return;
  }
  try {
    const { default: QR } = await import('qrcode');
    const svg = await QR.toString(url, { type: 'svg', margin: 0, color: { dark: '#372F01', light: '#0000' } });
    box.classList.remove('is-empty'); box.innerHTML = svg;
    hint.textContent = `Point your phone camera here to open ${name}.`;
  } catch (e) { box.classList.add('is-empty'); }
}

function setOS(os, { animate = true } = {}) {
  dlState.os = os;
  const tabs = $('.dl__tabs', dl);
  tabs.dataset.os = os;
  $$('.dl__tabs button', dl).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.os === os)));
  $$('.dl__stores .store', dl).forEach((s) => s.classList.toggle('is-primary', s.dataset.os === os));
  if (animate && !reduce) { const p = $('.store.is-primary', dl); gsap.fromTo(p, { scale: 0.94 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, .5)', clearProps: 'transform' }); }
  renderQR();
}

function setDlStep(i, { fromUser = false } = {}) {
  const scr = $$('.dl__scr', dl), dots = $$('.dl__dots button', dl);
  const prev = dlState.i;
  dlState.i = i;
  scr.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-out', k === prev && k !== i); });
  dots.forEach((d, k) => { d.classList.remove('is-on'); if (k === i) { void d.offsetWidth; d.classList.add('is-on'); } });
  const t = $('#dlCapT'), d = $('#dlCapD');
  if (!reduce) gsap.fromTo([t, d], { y: 10, opacity: 0 }, { y: 0, opacity: (idx) => (idx ? 0.78 : 1), duration: 0.6, ease: 'power3.out', stagger: 0.06 });
  t.textContent = DL_STEPS[i][0]; d.textContent = DL_STEPS[i][1];
  const pay = $('#dlPay');
  const c = { v: 0 };
  gsap.killTweensOf(c);
  if (i === 2) gsap.to(c, { v: 1182400, duration: 1.4, ease: 'power3.out', delay: 0.3, onUpdate: () => (pay.textContent = '₦' + Math.round(c.v).toLocaleString('en-US')) });
  else pay.textContent = '₦0';
  scheduleNext(fromUser);
}
function scheduleNext() {
  clearTimeout(dlState.timer);
  if (!dlState.open || reduce) return;
  dlState.timer = setTimeout(() => setDlStep((dlState.i + 1) % 3), DL_DUR);
}

function openDownload(origin) {
  if (!dl || dlState.open) return;
  dlState.open = true;
  dlLastFocus = document.activeElement;
  let ox = innerWidth - 80, oy = 40;
  if (origin) { const r = origin.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; }
  const card = $('.dl__card', dl), cr = card.getBoundingClientRect();
  dl.style.setProperty('--ox', ((ox - cr.left) / cr.width) * 100 + '%');
  dl.style.setProperty('--oy', ((oy - cr.top) / cr.height) * 100 + '%');
  dl.classList.add('is-open'); dl.setAttribute('aria-hidden', 'false');
  stopScroll(); if (!lenis) document.body.style.overflow = 'hidden';
  setOS(dlState.os, { animate: false });
  const guess = detectOS();
  const rec = $('#dlRec');
  if (guess) { setOS(guess, { animate: false }); rec.textContent = guess === 'ios' ? 'Recommended for your iPhone' : 'Recommended for your Android phone'; } else rec.textContent = '';
  setDlStep(0);
  if (!reduce) {
    gsap.from('.dl__left > *:not(.dl__x)', { y: 36, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.25, clearProps: 'transform,opacity' });
    gsap.from('.dl__phone', { y: 120, rotate: 8, opacity: 0, duration: 1.3, ease: 'expo.out', delay: 0.35, clearProps: 'transform,opacity' });
    gsap.from('.dl__chip', { scale: 0, opacity: 0, duration: 0.8, ease: 'back.out(2.4)', stagger: 0.1, delay: 0.8, clearProps: 'transform,opacity' });
    gsap.from('.dl__ring', { scale: 0.6, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1, delay: 0.3 });
  }
  setTimeout(() => $('.store.is-primary', dl)?.focus({ preventScroll: true }), 700);
}

function closeDownload() {
  if (!dl || !dlState.open) return;
  dlState.open = false; clearTimeout(dlState.timer);
  dl.classList.remove('is-open'); dl.setAttribute('aria-hidden', 'true');
  startScroll(); document.body.style.overflow = '';
  dlLastFocus && dlLastFocus.focus && dlLastFocus.focus({ preventScroll: true });
}

if (dl) {
  $$('[data-open-download]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); openDownload(b); }));
  $$('[data-close-dl]').forEach((b) => b.addEventListener('click', closeDownload));
  $$('.dl__tabs button', dl).forEach((b) => b.addEventListener('click', () => { $('#dlRec').textContent = ''; setOS(b.dataset.os); }));
  $$('.dl__arrow', dl).forEach((b) => b.addEventListener('click', () => setDlStep((dlState.i + +b.dataset.dir + 3) % 3, { fromUser: true })));
  addEventListener('keydown', (e) => { if (!dlState.open || e.target.closest('.dl__tabs')) return; if (e.key === 'ArrowRight') setDlStep((dlState.i + 1) % 3, { fromUser: true }); if (e.key === 'ArrowLeft') setDlStep((dlState.i + 2) % 3, { fromUser: true }); });
  $$('.dl__dots button', dl).forEach((b) => b.addEventListener('click', () => setDlStep(+b.dataset.i, { fromUser: true })));
  // pause auto-advance while hovering the stage
  const stage = $('#dlStage');
  stage.addEventListener('pointerenter', () => { clearTimeout(dlState.timer); dl.classList.add('is-paused'); });
  stage.addEventListener('pointerleave', () => { dl.classList.remove('is-paused'); scheduleNext(); });
  // 3D tilt
  if (finePointer && !reduce) {
    const phone = $('#dlPhone');
    const rx = gsap.quickTo(phone, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(phone, 'rotationY', { duration: 0.6, ease: 'power3' });
    const right = $('.dl__right', dl);
    right.addEventListener('pointermove', (e) => { const r = right.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 26); rx(-((e.clientY - r.top) / r.height - 0.5) * 18); });
    right.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }
  dl.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('button, a[href]', dl).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

/* ------------------------------------------------------------------ veripals: draggable stickers */
(async function stickers() {
  const board = $('#board');
  if (!board) return;
  const [{ Draggable }, { InertiaPlugin }] = await Promise.all([import('gsap/Draggable'), import('gsap/InertiaPlugin')]);
  gsap.registerPlugin(Draggable, InertiaPlugin);
  const hint = $('.board__hint');
  let z = 10;
  Draggable.create($$('.sticker', board), {
    type: 'x,y', bounds: board, inertia: !reduce, edgeResistance: 0.85,
    onPress() { this.target.style.zIndex = ++z; if (!reduce) gsap.to(this.target, { scale: 1.08, duration: 0.2 }); if (hint) hint.style.opacity = 0; },
    onRelease() { if (!reduce) gsap.to(this.target, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); },
  });
  if (!reduce) gsap.from($$('.sticker', board), { scale: 0, opacity: 0, duration: 0.9, ease: 'back.out(2.2)', stagger: 0.09, delay: 0.5 });
})();

/* ------------------------------------------------------------------ veripals: hook machine */
(function hookMachine() {
  const btn = $('#hmShuffle');
  if (!btn) return;
  const HOOKS = {
    dev: [
      'POV: you shipped the whole app and the client says “payment’s coming Friday.” Again.',
      'Explain escrow to me like I debug in production.',
      'Milestone approved → money unlocked. This is the commit history I want.',
      'Things I’d rather merge than chase: literally anything except an invoice.',
      'Fun fact: you can lock the budget before you write a single line of code.',
    ],
    designer: [
      'Rating my clients’ red flags: “it’ll be quick”, “exposure”, “budget TBD”.',
      'I locked the budget before I opened Figma. Here’s why.',
      'Moodboard approved. First chunk of the payment unlocked. Peak freelancer joy.',
      'Client abroad, me at home. Paid in my own currency. No drama.',
      'Show me your face when a client says “let me check with finance.”',
    ],
    writer: [
      'The three words every freelance writer fears: “payment is processing.”',
      'Me, a writer, finding out milestone payments exist.',
      'What if the money was already waiting before the deadline stress began?',
      'Hot take: if the budget isn’t locked, the brief isn’t ready.',
    ],
    creator: [
      'Paying a freelancer you’ve never met? Here’s the safer way to do it.',
      'Your freelancer doesn’t even need the app yet. You just invite them by email.',
      'Freelancing for a global client? Get paid in your own currency. Here’s how.',
      'Been ghosted after delivering the work? Drop your story below. Let’s fix this.',
      'Escrow explained in 30 seconds, no jargon.',
    ],
  };
  const PLAT = {
    tiktok: ['TikTok · POV skit, 15–30s', 'Film it in one take and put the hook on screen in the first second.'],
    x: ['X · thread opener', 'Hook in line one. Save the explainer for posts two to five.'],
    yt: ['YouTube Shorts · talking head, 30s', 'Say the hook out loud in the first two seconds, then deliver.'],
    li: ['LinkedIn · story post', 'One short line, a gap, then the story. End with a question.'],
    news: ['Newsletter · intro paragraph', 'Open with the hook, then tell the story in three short paragraphs.'],
  };
  const st = { persona: 'dev', platform: 'tiktok', last: -1, n: 0, token: 0 };
  const textEl = $('#hmText'), tagEl = $('#hmTag'), tipEl = $('#hmTip'), countEl = $('#hmCount'), copyBtn = $('#hmCopy');

  function type(text) {
    const token = ++st.token;
    if (reduce) { textEl.textContent = text; return; }
    textEl.textContent = '';
    let i = 0;
    (function step() {
      if (token !== st.token) return;
      i += 2; textEl.textContent = text.slice(0, i);
      if (i < text.length) setTimeout(step, 22);
    })();
  }
  function shuffle() {
    const list = HOOKS[st.persona];
    let i; do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === st.last);
    st.last = i; st.n += 1;
    countEl.textContent = '#' + String(st.n).padStart(2, '0');
    tagEl.textContent = PLAT[st.platform][0]; tipEl.textContent = PLAT[st.platform][1];
    btn.classList.add('is-rolling'); setTimeout(() => btn.classList.remove('is-rolling'), 450);
    type(list[i]);
  }
  function radio(group, key) {
    const el = $(group), btns = $$('button', el);
    btns.forEach((b) => b.addEventListener('click', () => {
      st[key] = b.dataset.v; st.last = -1;
      btns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      shuffle();
    }));
  }
  radio('#hmPersona', 'persona'); radio('#hmPlatform', 'platform');
  btn.addEventListener('click', shuffle);
  copyBtn.addEventListener('click', async () => {
    const text = HOOKS[st.persona][st.last] || '';
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (_) {} t.remove();
    }
    copyBtn.textContent = 'Copied ✓'; setTimeout(() => (copyBtn.textContent = 'Copy hook'), 1600);
  });
  shuffle();
})();

/* ------------------------------------------------------------------ veripals: levels */
(function levels() {
  const list = $('#levels');
  if (!list) return;
  const items = $$('.level', list);
  if (reduce) { items.forEach((l) => l.classList.add('is-on')); return; }
  items.forEach((l) => ScrollTrigger.create({ trigger: l, start: 'top 82%', onEnter: () => l.classList.add('is-on'), onLeaveBack: () => l.classList.remove('is-on') }));
  gsap.to('#levelsBar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 80%', end: 'bottom 55%', scrub: true } });
})();

/* ------------------------------------------------------------------ veripals: application modal */
(function applyModal() {
  const vm = $('#vp-modal');
  if (!vm) return;
  const form = $('#vForm'), steps = $$('.vstep', vm), bars = $$('.vm__prog i', vm);
  const label = $('#vStepLabel'), backBtn = $('#vBack'), nextBtn = $('#vNext'), errEl = $('.vm__err', vm), done = $('#vDone');
  const NAMES = ['About you', 'Your audience', 'Your pitch'];
  const st = { step: 1, open: false, sent: false, busy: false, pick: { platform: '', audience: '', niche: '' } };
  let lastFocus = null;

  /* ---- live ID card ---- */
  const q = (id) => document.getElementById(id);
  const card = { av: q('vcAv'), name: q('vcName'), plat: q('vcPlat'), niche: q('vcNiche'), aud: q('vcAud'), country: q('vcCountry') };
  const setCard = (el, text, empty) => { el.textContent = text || empty; el.classList.toggle('is-empty', !text); };
  function paintCard(pop) {
    const f = form.elements;
    const name = f.name.value.trim();
    setCard(card.name, name, 'Your name');
    const initials = name ? name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') : '?';
    if (card.av.textContent !== initials) { card.av.textContent = initials; if (!reduce) { card.av.classList.add('pop'); setTimeout(() => card.av.classList.remove('pop'), 260); } }
    setCard(card.plat, st.pick.platform, 'your platform');
    setCard(card.niche, st.pick.niche.replace(/&amp;/g, '&'), 'your niche');
    setCard(card.aud, st.pick.audience, 'your size');
    setCard(card.country, f.country.value.trim(), 'your country');
    if (pop && !reduce) gsap.fromTo('.vcard__in', { scale: 0.97 }, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' });
  }
  form.addEventListener('input', (e) => { paintCard(false); if (e.target.matches('[aria-invalid]')) e.target.removeAttribute('aria-invalid'); errEl.hidden = true; });

  /* ---- chips ---- */
  $$('.vchips', vm).forEach((group) => {
    const btns = $$('button', group), key = group.dataset.group;
    btns.forEach((b, i) => {
      b.addEventListener('click', () => {
        st.pick[key] = b.dataset.v.replace(/&amp;/g, '&');
        btns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        errEl.hidden = true; paintCard(true);
      });
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault(); const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length]; n.focus(); n.click();
      });
    });
  });

  /* ---- steps ---- */
  function showStep(n, dir = 1) {
    const prev = steps.find((s) => s.classList.contains('is-on'));
    steps.forEach((s) => s.classList.toggle('is-on', +s.dataset.step === n));
    const cur = steps[n - 1];
    st.step = n;
    bars.forEach((b, i) => { b.classList.toggle('is-done', i < n - 1); b.classList.toggle('is-on', i === n - 1); });
    label.textContent = `Step ${n} of 3 · ${NAMES[n - 1]}`;
    backBtn.hidden = n === 1;
    $('span', nextBtn).textContent = n === 3 ? 'Submit application' : 'Next';
    errEl.hidden = true;
    if (!reduce && prev !== cur) gsap.fromTo($$('h3, label, .vgroup, .vm__fine', cur), { x: 34 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity' });
    const first = $('input:not([tabindex="-1"]), textarea, .vchips button', cur);
    setTimeout(() => first && first.focus({ preventScroll: true }), 80);
    $('.dl__scroll', vm).scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  function validate(n) {
    const f = form.elements;
    const fail = (msg, el) => { if (el) { el.setAttribute('aria-invalid', 'true'); el.focus({ preventScroll: true }); } return msg; };
    if (n === 1) {
      if (!f.name.value.trim()) return fail('Please enter your name.', f.name);
      if (!EMAIL_RE.test(f.email.value.trim())) return fail('Please enter a valid email address.', f.email);
      if (!f.country.value.trim()) return fail('Please tell us your country.', f.country);
    }
    if (n === 2) {
      if (!st.pick.platform) return 'Pick your main platform.';
      if (!st.pick.audience) return 'Pick your audience size.';
      if (!f.profile.value.trim()) return fail('Please add a link to your main profile.', f.profile);
      if (!f.audience_country.value.trim()) return fail('Please tell us where your audience is.', f.audience_country);
      if (!st.pick.niche) return 'Pick what you make.';
    }
    return '';
  }
  const shake = () => { if (!reduce) gsap.fromTo($('.vm__right', vm), { x: -7 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, .3)', clearProps: 'transform' }); };

  backBtn.addEventListener('click', () => { if (st.step > 1) showStep(st.step - 1, -1); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (st.busy) return;
    const msg = validate(st.step);
    if (msg) { errEl.textContent = msg; errEl.hidden = false; shake(); return; }
    if (st.step < 3) return showStep(st.step + 1, 1);
    const f = form.elements;
    const finish = () => success(f.name.value.trim());
    if (f._gotcha.value) return finish(); // honeypot: pretend success for bots
    st.busy = true; nextBtn.disabled = true; $('span', nextBtn).textContent = 'Sending…';
    const app = { name: f.name.value.trim(), email: f.email.value.trim(), country: f.country.value.trim(), platform: st.pick.platform, audience: st.pick.audience, profile: f.profile.value.trim(), audience_country: f.audience_country.value.trim(), niche: st.pick.niche, why: f.why.value.trim() };
    try {
      const res = await fetch(CONTACT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...app, _subject: 'Veripals application — ' + app.name }) });
      if (!res.ok) throw new Error('bad status');
      notifyDashboard('/api/leads/veripal', app);
      finish();
    } catch (_) { errEl.textContent = 'Could not send your application. Please try again or email hello@useveritasapp.com.'; errEl.hidden = false; shake(); }
    finally { st.busy = false; nextBtn.disabled = false; $('span', nextBtn).textContent = st.sent ? 'Next' : 'Submit application'; }
  });

  function success(name) {
    st.sent = true;
    form.hidden = true; $('.vm__head', vm).style.visibility = 'hidden';
    $('[data-sent-name]', done).textContent = name;
    done.hidden = false; done.classList.remove('is-in'); requestAnimationFrame(() => done.classList.add('is-in'));
    if (!reduce) {
      gsap.from($$('h3, p, .vm__next li, .vm__donebtns > *', done), { y: 26, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.07, delay: 0.25, clearProps: 'transform,opacity' });
      gsap.fromTo('.vcard__stamp', { opacity: 0, scale: 3.2, rotate: -40 }, { opacity: 1, scale: 1, rotate: -14, duration: 0.55, ease: 'back.out(1.6)', delay: 0.45 });
      gsap.fromTo('.vcard__in', { y: 0 }, { y: -8, duration: 0.15, yoyo: true, repeat: 1, delay: 0.95, clearProps: 'transform' });
    } else $('.vcard__stamp').style.opacity = 1;
    $('.btn', done).focus({ preventScroll: true });
  }

  function resetAll() {
    form.reset(); st.pick = { platform: '', audience: '', niche: '' }; st.sent = false;
    $$('.vchips button', vm).forEach((b) => b.setAttribute('aria-checked', 'false'));
    $$('[aria-invalid]', vm).forEach((el) => el.removeAttribute('aria-invalid'));
    done.hidden = true; form.hidden = false; $('.vm__head', vm).style.visibility = '';
    $('.vcard__stamp').style.opacity = 0; paintCard(false); showStep(1);
  }

  /* ---- open / close ---- */
  function open(origin) {
    if (st.open) return;
    st.open = true; lastFocus = document.activeElement;
    let ox = innerWidth / 2, oy = innerHeight / 2;
    if (origin) { const r = origin.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; }
    const c = $('.dl__card', vm), cr = c.getBoundingClientRect();
    vm.style.setProperty('--ox', ((ox - cr.left) / cr.width) * 100 + '%'); vm.style.setProperty('--oy', ((oy - cr.top) / cr.height) * 100 + '%');
    vm.classList.add('is-open'); vm.setAttribute('aria-hidden', 'false');
    stopScroll(); if (!lenis) document.body.style.overflow = 'hidden';
    if (!reduce) {
      gsap.from('.vm__left > *:not(.vcard)', { y: 34, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.25, clearProps: 'transform,opacity' });
      gsap.from('.vcard__in', { y: 90, rotate: 10, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.4, clearProps: 'transform,opacity' });
      gsap.from('.vm__head, .vstep.is-on > *', { y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.35, clearProps: 'transform,opacity' });
    }
    setTimeout(() => { const t = st.sent ? $('.btn', done) : $('.vstep.is-on input, .vstep.is-on textarea, .vstep.is-on .vchips button', vm); t && t.focus({ preventScroll: true }); }, 700);
  }
  function close() {
    if (!st.open) return;
    st.open = false; vm.classList.remove('is-open'); vm.setAttribute('aria-hidden', 'true');
    startScroll(); document.body.style.overflow = '';
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
    if (st.sent) setTimeout(resetAll, 1000);
  }

  $$('[data-open-veripal]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); open(b); }));
  $$('[data-close-vm]', vm).forEach((b) => b.addEventListener('click', (e) => {
    const href = b.getAttribute('href'); close();
    if (href && href.startsWith('#')) { e.preventDefault(); setTimeout(() => { const t = $(href); t && scrollToTarget(t); }, 500); }
  }));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && st.open) close(); });
  vm.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('button, input:not([tabindex="-1"]), textarea, a[href]', vm).filter((el) => el.offsetParent !== null && !el.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  // tilt the ID card with the mouse
  if (finePointer && !reduce) {
    const left = $('.vm__left', vm), cin = $('.vcard__in', vm);
    const rx = gsap.quickTo(cin, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = gsap.quickTo(cin, 'rotationY', { duration: 0.6, ease: 'power3' });
    left.addEventListener('pointermove', (e) => { const r = left.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 22); rx(-((e.clientY - r.top) / r.height - 0.5) * 16); });
    left.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }
  // deep link: /veripals#apply opens the form
  if (location.hash === '#apply') setTimeout(() => open(null), $('#loader') ? 2900 : 450);
  paintCard(false);
})();

/* ------------------------------------------------------------------ nav: active link */
const navActive = { link: null, subs: [] };
(function navActiveState() {
  if (!nav) return;
  const norm = (p) => (p.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '').replace(/(.)\/$/, '$1')) || '/';
  const here = norm(location.pathname);
  const all = $$('.nav__links a, .menu__links a');
  const keyOf = (a) => { const u = new URL(a.getAttribute('href'), location.origin); return { path: norm(u.pathname), hash: u.hash }; };
  const set = (href) => {
    all.forEach((a) => {
      const on = !!href && a.getAttribute('href') === href;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', href.includes('#') ? 'location' : 'page'); else a.removeAttribute('aria-current');
    });
    navActive.link = href ? $('.nav__links a[href="' + href + '"]') : null;
    navActive.subs.forEach((fn) => fn());
  };

  // 1) a link that points at this very page (About, Veripals, Contact)
  const page = all.find((a) => { const k = keyOf(a); return !k.hash && k.path === here; });
  if (page) return set(page.getAttribute('href'));

  // 2) on the home page, follow the section that is in view
  if (here !== '/') return;
  let cur = null;
  $$('.nav__links a').forEach((a) => {
    const k = keyOf(a);
    if (k.path !== '/' || !k.hash) return;
    const sec = $(k.hash);
    if (!sec) return;
    const href = a.getAttribute('href');
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => { if (self.isActive) { cur = href; set(href); } else if (cur === href) { cur = null; set(null); } },
    });
  });
})();

/* ------------------------------------------------------------------ nav: playful hover */
(function navFun() {
  if (!nav || !finePointer || reduce) return;
  const links = $('.nav__links', nav);
  const logo = $('.nav__logo', nav);
  const cta = $('.nav__cta .btn', nav);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // rolling link text + gliding blob (the blob rests on the active link)
  if (links) {
    $$('a', links).forEach((a) => { const t = a.textContent.trim(); a.innerHTML = `<span class="roll"><span class="roll__in" data-t="${t}">${t}</span></span>`; });
    const blob = document.createElement('i'); blob.className = 'nav__blob'; links.prepend(blob);
    document.documentElement.classList.add('nav-blob');
    gsap.set(blob, { opacity: 0, scale: 0.6 });
    let visible = false, hovering = false, lastX = 0;
    const box = (a) => ({ x: a.offsetLeft, y: a.offsetTop, width: a.offsetWidth, height: a.offsetHeight });
    const rest = (instant) => {
      const a = navActive.link;
      if (!a) { visible = false; gsap.to(blob, { opacity: 0, scale: 0.6, duration: 0.3, ease: 'power2.in', overwrite: 'auto' }); return; }
      if (!visible || instant) {
        gsap.set(blob, box(a));
        gsap.to(blob, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.6)', overwrite: 'auto' });
        visible = true;
      } else gsap.to(blob, { ...box(a), duration: 0.65, ease: 'elastic.out(1, .55)', overwrite: 'auto' });
      lastX = a.offsetLeft;
    };
    $$('a', links).forEach((a) => a.addEventListener('pointerenter', () => {
      hovering = true;
      const bx = box(a), dir = bx.x > lastX ? 1 : -1;
      if (!visible) {
        gsap.set(blob, bx);
        gsap.to(blob, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2.6)', overwrite: 'auto' });
        visible = true;
      } else {
        gsap.to(blob, { ...bx, duration: 0.65, ease: 'elastic.out(1, .55)', overwrite: 'auto' });
        gsap.fromTo(blob, { scaleX: 1.14, scaleY: 0.86, rotate: dir * 4 }, { scaleX: 1, scaleY: 1, rotate: 0, duration: 0.6, ease: 'elastic.out(1, .45)' });
      }
      lastX = bx.x;
    }));
    links.addEventListener('pointerleave', () => { hovering = false; rest(); });
    navActive.subs.push(() => { if (!hovering) rest(); });
    addEventListener('resize', () => { if (!hovering && navActive.link) rest(true); });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => rest(true));
  }

  // the logo's dot is a pupil that follows the cursor
  const dot = $('.mark circle:last-child', nav);
  if (dot && logo) {
    gsap.set(dot, { svgOrigin: '27 16' });
    const qx = gsap.quickTo(dot, 'x', { duration: 0.35, ease: 'power3' }), qy = gsap.quickTo(dot, 'y', { duration: 0.35, ease: 'power3' });
    nav.addEventListener('pointermove', (e) => {
      const r = logo.getBoundingClientRect(), cx = r.left + 20, cy = r.top + r.height / 2;
      qx(clamp((e.clientX - cx) / 55, -1, 1) * 4.6); qy(clamp((e.clientY - cy) / 28, -1, 1) * 3.4);
    });
    nav.addEventListener('pointerleave', () => { qx(0); qy(0); });
  }

  // spotlight follows the mouse inside the bar
  nav.addEventListener('pointermove', (e) => { const r = nav.getBoundingClientRect(); nav.style.setProperty('--mx', e.clientX - r.left + 'px'); nav.style.setProperty('--my', e.clientY - r.top + 'px'); });

  // sparkles burst from the download button
  if (cta) cta.addEventListener('pointerenter', () => {
    const nr = nav.getBoundingClientRect(), br = cta.getBoundingClientRect();
    const ox = br.left - nr.left + br.width / 2, oy = br.top - nr.top + br.height / 2;
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('span'); s.className = 'nav__spark'; s.textContent = '✦';
      s.style.color = i % 2 ? '#FEEA27' : '#372F01'; s.style.fontSize = 12 + Math.random() * 12 + 'px';
      nav.appendChild(s);
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.6, d = 38 + Math.random() * 34;
      gsap.set(s, { x: ox - 6, y: oy - 8, scale: 0, opacity: 1 });
      gsap.timeline({ onComplete: () => s.remove() })
        .to(s, { x: ox - 6 + Math.cos(a) * d, y: oy - 8 + Math.sin(a) * d, scale: 1, rotate: (Math.random() - 0.5) * 240, duration: 0.45, ease: 'power3.out' })
        .to(s, { opacity: 0, scale: 0, y: '+=14', duration: 0.4, ease: 'power2.in' }, 0.3);
    }
  });
})();

/* ------------------------------------------------------------------ ask AI: copy the question for assistants that cannot be prefilled */
$$('[data-copy-prompt]').forEach((a) => {
  const note = $('.footer__ask-note', a.closest('.footer__ask'));
  let t;
  a.addEventListener('click', async () => {
    const text = a.dataset.copyPrompt;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (_) {} ta.remove();
    }
    if (!note) return;
    note.textContent = ok ? `✓ Question copied. Paste it into ${a.dataset.ai} when it opens.` : `Open ${a.dataset.ai} and ask: "${text}"`;
    note.hidden = false;
    clearTimeout(t); t = setTimeout(() => (note.hidden = true), 9000);
  });
});

/* ------------------------------------------------------------------ count-up numbers */
$$('[data-count]').forEach((el) => {
  const n = +el.dataset.count;
  if (reduce) { el.textContent = n; return; }
  const o = { v: 0 };
  ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: n, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)) }) });
});

/* ------------------------------------------------------------------ boot */
runLoader();
addEventListener('load', () => ScrollTrigger.refresh());
document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());

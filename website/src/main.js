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
    document.addEventListener('pointerover', (e) => cur.classList.toggle('is-hover', !!e.target.closest('a, button, [data-hover], .qa, input, .range, .ccard')));
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

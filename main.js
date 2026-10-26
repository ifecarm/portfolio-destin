/* Noyau commun du motion : scroll fluide, titres masqués, apparitions, compteurs.
   Tout ce qui est propre au site est dans la partie "SITE" plus bas. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;


  /* menu mobile : un bouton + un panneau plein écran avec tous les liens (sans dépendre de GSAP) */
  (() => {
    const bar = $('[data-top]'), navs = $$('[data-nav]');
    if (!bar || !navs.length || bar.classList.contains('side')) return;
    const links = navs.flatMap(n => $$('a[href^="#"]', n));
    const btn = document.createElement('button');
    btn.className = 'mm-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'Ouvrir le menu'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'mm');
    btn.innerHTML = '<span></span><span></span>';
    const panel = document.createElement('div');
    panel.className = 'mm'; panel.id = 'mm'; panel.setAttribute('data-lenis-prevent', ''); panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML = '<ul>' + links.map((a, i) => '<li style="--i:' + i + '"><a href="' + a.getAttribute('href') + '"><i>' + String(i + 1).padStart(2, '0') + '</i>' + a.textContent.replace(/[→↗]/g, '').trim() + '</a></li>').join('') + '</ul>';
    bar.classList.add('has-mm'); bar.appendChild(btn); document.body.appendChild(panel);
    const set = open => {
      root.classList.toggle('mm-open', open);
      btn.setAttribute('aria-expanded', open); btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      panel.setAttribute('aria-hidden', !open);
      if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
    };
    btn.addEventListener('click', () => set(!root.classList.contains('mm-open')));
    panel.addEventListener('click', e => { if (e.target.closest('a')) set(false); }, true);
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
    matchMedia('(min-width:901px)').addEventListener('change', e => { if (e.matches) set(false); });
  })();

  /* accordéon : fonctionne même sans animation */
  $$('.acc__h').forEach(b => b.addEventListener('click', () => {
    const a = b.closest('.acc'), open = !a.classList.contains('is-open');
    a.classList.toggle('is-open', open);
    b.setAttribute('aria-expanded', open);
    if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 600);
  }));

  if (!window.gsap || !window.ScrollTrigger || !window.SplitText || reduce) {
    root.classList.remove('js'); window.__ready = true; return;
  }
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const desktop = matchMedia('(min-width:901px)').matches;
    const hover = matchMedia('(hover:hover)').matches;

    const lenis = new Lenis({ lerp: 0.09 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      lenis.scrollTo(t, { duration: 1.3, offset: 0 });
    }));

    /* barre du haut, progression, lien actif */
    const top = $('[data-top]'), prog = $('[data-progress]');
    const links = $$('[data-nav] a[href^="#"]');
    const secs = links.map(a => $(a.getAttribute('href')));
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => {
        if (top) top.classList.toggle('is-solid', self.scroll() > 24);
        if (prog) gsap.set(prog, { scaleX: self.progress });
        const line = innerHeight * 0.4;
        secs.forEach((s, i) => {
          if (!s) return;
          const r = s.getBoundingClientRect();
          links[i].classList.toggle('is-active', r.top <= line && r.bottom >= line);
        });
      }
    });

    /* titres : lignes masquées */
    $$('[data-split]').forEach(el => {
      const d = parseFloat(el.dataset.delay || 0);
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: 'visible' });
          return gsap.from(self.lines, { yPercent: 118, duration: 1.2, ease: 'power4.out', stagger: 0.1, delay: d,
            scrollTrigger: { trigger: el, start: 'top 90%' } });
        }
      });
    });

    /* apparitions par lots */
    const items = $$('[data-r]');
    gsap.set(items, { autoAlpha: 0, y: 30 });
    ScrollTrigger.batch(items, {
      start: 'top 92%', once: true,
      onEnter: els => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.95, ease: 'power3.out', stagger: 0.09, overwrite: true })
    });

    /* compteurs */
    $$('[data-count]').forEach(el => {
      const end = parseInt(el.dataset.count, 10), o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 94%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 1.8, delay: 0.3, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } }) });
    });

    /* boutons magnétiques */
    if (hover) $$('.btn').forEach(btn => {
      const x = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3.out' });
      const y = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3.out' });
      btn.addEventListener('mousemove', e => { const r = btn.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.22); y((e.clientY - r.top - r.height / 2) * 0.3); });
      btn.addEventListener('mouseleave', () => { x(0); y(0); });
    });

    /* ===== SITE ===== */
    /* soleil : le point suit la lecture, de 06:00 à 18:00 */
    const path = $('#smPath'), dot = $('#smDot'), time = $('#smTime'), kw = $('#smKw');
    if (path) {
      const len = path.getTotalLength();
      ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => {
        const p = self.progress, pt = path.getPointAtLength(len * p);
        dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
        const m = Math.round(360 + p * 720);
        time.textContent = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
        kw.textContent = Math.round(Math.sin(p * Math.PI) * 100) + ' %';
      }});
    }
    /* surlignage du mot clé */
    $$('mark').forEach(m => gsap.to(m, { backgroundSize: '100% 38%', duration: 1.1, delay: 0.9, ease: 'power3.inOut' }));
    /* portrait de la colonne : légère entrée */
    gsap.from('.side__ph img', { scale: 1.3, duration: 1.8, ease: 'power3.out' });
    gsap.from('.side__id, .side__role, .side__nav a', { x: -24, autoAlpha: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out' });
    /* lignes des rangées : le texte glisse depuis la gauche */
    $$('.idx li').forEach(li => gsap.from(li.querySelector('h3'), { x: -20, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 90%' } }));
    /* ===== FIN SITE ===== */
  });

  const refresh = () => ScrollTrigger.refresh();
  addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.__ready = true;
})();

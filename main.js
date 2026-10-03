(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ── Theme: follows the OS by default, the toggle overrides it ── */
  const root = document.documentElement;
  const osDark = window.matchMedia('(prefers-color-scheme: dark)');
  const themeBtn = document.getElementById('theme-toggle');
  const currentTheme = () => root.getAttribute('data-theme') || (osDark.matches ? 'dark' : 'light');

  const syncTheme = () => {
    const t = currentTheme();
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    themeBtn.setAttribute('aria-pressed', t === 'light');
    document.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  };
  themeBtn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
    syncTheme();
  });
  // OS switches (e.g. auto dark mode at night) still apply until the visitor picks a theme
  osDark.addEventListener('change', () => { if (!root.hasAttribute('data-theme')) syncTheme(); });
  syncTheme();

  /* ── Mobile nav ── */
  const nav = document.getElementById('nav');
  const navToggle = document.querySelector('.nav-toggle');

  const setNav = open => {
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', open);
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('no-scroll', open);
  };
  navToggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });

  /* ── Active nav link ── */
  const navLinks = [...nav.querySelectorAll('a')];
  const spy = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.hash === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => spy.observe(s));

  /* ── Reveal on scroll ── */
  const revealer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealer.unobserve(entry.target);
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 80}ms`;
    revealer.observe(el);
  });

  /* ── Typed roles ── */
  const typed = document.getElementById('typed');
  const roles = ['Data Engineer', 'AI / ML Specialist', 'Data Scientist', 'Data Analyst', 'Web & Mobile Developer'];
  if (typed && !reduceMotion) {
    let r = 0, c = roles[0].length, deleting = true;
    const tick = () => {
      const word = roles[r];
      c += deleting ? -1 : 1;
      typed.textContent = word.slice(0, c);
      let delay = deleting ? 40 : 80;
      if (!deleting && c === word.length) { deleting = true; delay = 2000; }
      else if (deleting && c === 0) { deleting = false; r = (r + 1) % roles.length; delay = 300; }
      setTimeout(tick, delay);
    };
    setTimeout(tick, 2600);
  }

  /* ── Counters ── */
  const counters = document.querySelectorAll('[data-count]');
  const countUp = el => {
    const target = +el.dataset.count;
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now(), dur = 1400;
    const step = now => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  setTimeout(() => counters.forEach(countUp), 1200);

  /* ── Project filters ── */
  const filters = document.querySelectorAll('.filter');
  const projects = document.querySelectorAll('.project');
  filters.forEach(btn => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    filters.forEach(b => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-pressed', b === btn);
    });
    projects.forEach(p => {
      p.classList.toggle('is-hidden', f !== 'all' && !p.dataset.cat.split(' ').includes(f));
    });
  }));

  /* ── Project preview: opens the live app / overview in a dialog, without leaving the page ── */
  const pv = document.getElementById('preview');
  if (pv && typeof pv.showModal === 'function') {
    const $ = id => document.getElementById(id);
    const viewport = $('pv-viewport');
    let hadCursor = false;

    const openPreview = card => {
      const demo = card.dataset.demo;
      const repo = card.dataset.repo || card.querySelector('.project-links a[href*="github"]')?.href;
      const img = card.querySelector('.project-media img');

      $('pv-kind').textContent = card.querySelector('.project-kind').textContent;
      $('pv-title').textContent = card.querySelector('h3').textContent;
      $('pv-desc').textContent = card.querySelector('.project-body > p:not(.project-kind)').textContent;
      $('pv-stack').innerHTML = card.querySelector('.chips').innerHTML;
      const details = card.querySelector('template.pv-details');
      $('pv-features').replaceChildren(...(details ? details.content.cloneNode(true).children : []));

      const links = [];
      if (demo) links.push(`<a class="btn btn-primary" href="${demo}" target="_blank" rel="noopener">Live demo ↗</a>`);
      if (repo) links.push(`<a class="btn btn-ghost" href="${repo}" target="_blank" rel="noopener">Source code ↗</a>`);
      $('pv-links').innerHTML = links.join('');

      const open = $('pv-open');
      open.hidden = !(demo || repo);
      open.href = demo || repo || '#';

      viewport.querySelectorAll('iframe, img').forEach(el => el.remove());
      viewport.classList.remove('is-loaded', 'is-image');
      if (demo) {
        // Streamlit apps can be embedded with ?embed=true; match the site's current theme
        const url = new URL(demo);
        url.searchParams.set('embed', 'true');
        url.searchParams.set('embed_options', currentTheme() === 'light' ? 'light_theme' : 'dark_theme');
        $('pv-url').textContent = url.host;
        const frame = document.createElement('iframe');
        frame.title = `Live preview of ${$('pv-title').textContent}`;
        frame.allow = 'clipboard-write; fullscreen';
        frame.addEventListener('load', () => viewport.classList.add('is-loaded'), { once: true });
        frame.src = url.href;
        viewport.append(frame);
      } else {
        $('pv-url').textContent = 'case study — no live demo';
        viewport.classList.add('is-image');
        if (img) viewport.append(Object.assign(img.cloneNode(), { loading: 'eager', alt: '' }));
      }

      hadCursor = document.body.classList.contains('has-cursor');
      document.body.classList.remove('has-cursor');
      document.body.classList.add('pv-open');
      pv.showModal();
      $('pv-close').focus();
    };

    document.querySelectorAll('.project [data-preview]').forEach(btn =>
      btn.addEventListener('click', () => openPreview(btn.closest('.project'))));

    $('pv-close').addEventListener('click', () => pv.close());
    // click on the backdrop (outside the dialog box) closes it
    pv.addEventListener('click', e => { if (e.target === pv) pv.close(); });
    pv.addEventListener('close', () => {
      viewport.querySelectorAll('iframe, img').forEach(el => el.remove()); // stop the app
      document.body.classList.remove('pv-open');
      if (hadCursor) document.body.classList.add('has-cursor');
    });
  }

  /* ── Card spotlight + tilt ── */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.transform = `perspective(900px) rotateX(${(.5 - y) * 4}deg) rotateY(${(x - .5) * 4}deg)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ── Custom cursor ── */
  if (finePointer && !reduceMotion) {
    const cur = document.getElementById('cur');
    const ring = document.getElementById('cur-ring');
    let mx = -100, my = -100, rx = -100, ry = -100;
    document.body.classList.add('has-cursor');
    document.addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });
    document.addEventListener('pointerover', e => {
      ring.classList.toggle('is-hover', !!e.target.closest('a, button, input, select, textarea, [data-tilt]'));
    });
    const loop = () => {
      rx += (mx - rx) * .18; ry += (my - ry) * .18;
      cur.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ── Email copy ── */
  const copyBtn = document.getElementById('email-copy');
  const copyStatus = document.getElementById('email-copy-status');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.email);
      copyStatus.textContent = 'copied ✓';
    } catch {
      window.location.href = `mailto:${copyBtn.dataset.email}`;
    }
    setTimeout(() => { copyStatus.textContent = 'copy'; }, 2000);
  });

  /* ── Contact form → opens the visitor's mail client ── */
  const form = document.getElementById('contact-form');
  const note = document.getElementById('form-note');
  form?.addEventListener('submit', e => {
    e.preventDefault();
    let firstInvalid = null;
    form.querySelectorAll('[required]').forEach(field => {
      const bad = !field.checkValidity() || !field.value.trim();
      field.setAttribute('aria-invalid', bad);
      if (bad && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      note.textContent = '✗ please fill in the highlighted fields';
      note.className = 'form-note is-error';
      firstInvalid.focus();
      return;
    }
    const d = new FormData(form);
    const subject = `[Portfolio] ${d.get('subject')} — ${d.get('name')}`;
    const body = `${d.get('message')}\n\n— ${d.get('name')} (${d.get('email')})`;
    window.location.href = `mailto:thahirbah@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = '✓ opening your mail app…';
    note.className = 'form-note is-ok';
  });

  /* ── Footer: year + Paris clock ── */
  document.getElementById('year').textContent = new Date().getFullYear();
  const clock = document.getElementById('clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  const tickClock = () => { clock.textContent = fmt.format(new Date()); };
  tickClock(); setInterval(tickClock, 30000);

  /* ── 3D scene (three.js, loaded lazily) ── */
  const canvas = document.getElementById('scene');
  const webgl = (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch { return false; } })();
  if (!canvas || reduceMotion || !webgl) return;

  const load = () => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = boot3d;
    document.head.appendChild(s);
  };
  ('requestIdleCallback' in window) ? requestIdleCallback(load, { timeout: 1500 }) : setTimeout(load, 600);

  function boot3d() {
    const THREE = window.THREE;
    const mobile = innerWidth < 900;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 300);
    camera.position.set(0, 0, mobile ? 15 : 12);

    scene.add(new THREE.AmbientLight(0x001a0d, .5));
    const key = new THREE.DirectionalLight(0x00ff88, 1.6); key.position.set(4, 6, 5); scene.add(key);
    const p1 = new THREE.PointLight(0x00ff88, 5, 22);
    const p2 = new THREE.PointLight(0x00f5d4, 3.5, 18);
    scene.add(p1, p2);

    const group = new THREE.Group();
    scene.add(group);

    // Core orb — "the model"
    const cGeo = new THREE.IcosahedronGeometry(1.9, 1);
    const coreMat = new THREE.MeshStandardMaterial({ flatShading: true });
    const wireMat = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true });
    const core = new THREE.Mesh(cGeo, coreMat);
    const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.95, 1), wireMat);
    group.add(core, wire);

    // Rings — "the pipelines"
    const ring = (r, tube, col, op) => new THREE.Mesh(new THREE.TorusGeometry(r, tube, 16, 160),
      new THREE.MeshStandardMaterial({ color: col, metalness: .95, roughness: .15, emissive: col, emissiveIntensity: .3, transparent: op < 1, opacity: op }));
    const r1 = ring(2.9, .013, 0x00ff88, 1);   r1.rotation.x = Math.PI * .3;
    const r2 = ring(3.6, .009, 0x00f5d4, .65); r2.rotation.set(Math.PI * .58, Math.PI * .2, 0);
    const r3 = ring(4.2, .006, 0x00c96a, .4);  r3.rotation.set(Math.PI * .72, 0, Math.PI * .15);
    group.add(r1, r2, r3);

    let grid;

    // Particles — "the data"
    const N = mobile ? 300 : 600, pp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = 4.2 + Math.random() * 5.5;
      pp[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pp[i * 3 + 2] = r * Math.cos(ph);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const ptsMat = new THREE.PointsMaterial({ size: .03, transparent: true });
    const pts = new THREE.Points(pGeo, ptsMat);
    scene.add(pts);

    // Satellites linked to the core
    const cols = [0x00ff88, 0x00f5d4, 0x00c96a, 0x44ffaa];
    const sats = Array.from({ length: 8 }, (_, i) => ({
      mesh: new THREE.Mesh(new THREE.OctahedronGeometry(.1, 0),
        new THREE.MeshStandardMaterial({ color: cols[i % 4], metalness: .9, roughness: .2, emissive: cols[i % 4], emissiveIntensity: .7 })),
      angle: (i / 8) * Math.PI * 2, speed: .004 + Math.random() * .006,
      r: 3.1 + Math.random() * .6, tilt: (Math.random() - .5) * 1.1
    }));
    const lineMat = new THREE.LineBasicMaterial({ transparent: true });
    const lines = sats.map(s => {
      group.add(s.mesh);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const l = new THREE.Line(g, lineMat);
      group.add(l); return l;
    });

    // Per-theme colours: neon on near-black, deeper greens on the light background
    const palettes = {
      dark:  { core: 0x020c08, metal: .98, rough: .07, emissive: 0x002211, line: 0x00ff88, wireO: .14, ptsO: .45, lineO: .1,
               rings: [0x00ff88, 0x00f5d4, 0x00c96a], grid: [0x003318, 0x001a0d], exposure: 1 },
      light: { core: 0xf3fbf6, metal: .25, rough: .35, emissive: 0x0b3a22, line: 0x00a35c, wireO: .35, ptsO: .55, lineO: .22,
               rings: [0x00a35c, 0x00897b, 0x2fbf7a], grid: [0xa9d8bd, 0xd3eadc], exposure: 1.15 }
    };
    const ringsArr = [r1, r2, r3];
    const applyPalette = theme => {
      const c = palettes[theme] || palettes.dark;
      coreMat.color.setHex(c.core); coreMat.metalness = c.metal; coreMat.roughness = c.rough;
      coreMat.emissive.setHex(c.emissive); coreMat.emissiveIntensity = theme === 'light' ? .15 : .5;
      wireMat.color.setHex(c.line); wireMat.opacity = c.wireO;
      ptsMat.color.setHex(c.line); ptsMat.opacity = c.ptsO;
      lineMat.color.setHex(c.line); lineMat.opacity = c.lineO;
      ringsArr.forEach((r, i) => { r.material.color.setHex(c.rings[i]); r.material.emissive.setHex(c.rings[i]); });
      if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
      grid = new THREE.GridHelper(28, 28, c.grid[0], c.grid[1]);
      grid.position.y = -5; scene.add(grid);
      renderer.toneMappingExposure = c.exposure;
    };
    applyPalette(currentTheme());
    document.addEventListener('themechange', e => applyPalette(e.detail));

    let tx = 0, ty = 0, cx = 0, cy = 0, scrollP = 0;
    addEventListener('pointermove', e => {
      tx = (e.clientX / innerWidth - .5) * .6;
      ty = -(e.clientY / innerHeight - .5) * .6;
    });
    const onScroll = () => {
      scrollP = Math.min(scrollY / innerHeight, 1.5);
      canvas.style.setProperty('--scene-o', Math.max(1 - scrollP * .7, .22).toFixed(3));
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    let running = true;
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(frame);
    });

    const clockT = new THREE.Clock();
    function frame() {
      if (!running) return;
      const t = clockT.getElapsedTime();
      cx += (tx - cx) * .04; cy += (ty - cy) * .04;

      group.rotation.y = t * .12 + cx;
      group.rotation.x = cy * .6;
      group.position.y = -scrollP * 1.6;
      core.rotation.x = t * .2;
      wire.rotation.copy(core.rotation);
      r1.rotation.z = t * .25; r2.rotation.z = -t * .18; r3.rotation.z = t * .12;
      pts.rotation.y = t * .03;

      sats.forEach((s, i) => {
        s.angle += s.speed;
        s.mesh.position.set(Math.cos(s.angle) * s.r, Math.sin(s.angle * 1.3) * s.tilt, Math.sin(s.angle) * s.r);
        s.mesh.rotation.x = s.mesh.rotation.y = t * 2;
        const pos = lines[i].geometry.attributes.position;
        pos.setXYZ(1, s.mesh.position.x, s.mesh.position.y, s.mesh.position.z);
        pos.needsUpdate = true;
      });

      p1.position.set(Math.cos(t * .5) * 6, Math.sin(t * .7) * 3, 4);
      p2.position.set(Math.sin(t * .4) * -6, Math.cos(t * .6) * 3, 3);

      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    canvas.classList.add('is-ready');
    frame();
  }
})();

// frontend/src/components/BottomNav.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './BottomNav.css';

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const dockRef = useRef(null);
  const beadRef = useRef(null);
  const beadLayerActiveRef = useRef(null);
  const beadLayerEnterRef = useRef(null);
  const notchSvgRef = useRef(null);
  const notchCircleRef = useRef(null);
  const tooltipRef = useRef(null);
  const trailIntervalRef = useRef(null);
  const moveTimerRef = useRef(null);
  const isAnimatingRef = useRef(false);

  const [activePage, setActivePage] = useState('pocetna');

  // ============ NAV ITEMS ============
  const navItems = [
    { path: '/', page: 'pocetna', label: t('nav.home'), color: '#22c55e', icon: 'home' },
    { path: '/ai-chat', page: 'ai-chat', label: 'AI Chat', color: '#ef4444', icon: 'robot' },
    { path: '/goals', page: 'ciljevi', label: t('nav.goals'), color: '#f43f5e', icon: 'target' },
    { path: '/water', page: 'voda', label: t('nav.water'), color: '#3b82f6', icon: 'droplet' },
    { path: '/micro-nutrients', page: 'mikro', label: 'Mikro', color: '#10b981', icon: 'chart' },
  ];

  // ============ HAPTIC PATTERNS ============
  const hapticPatterns = {
    'pocetna': [8, 20, 10],
    'ai-chat': [12, 30, 15],
    'ciljevi': [10, 25, 12],
    'voda': [6, 15, 8],
    'mikro': [8, 20, 10],
  };

  // ============ DETEKTIRAJ AKTIVNU STRANICU ============
  const getActivePage = useCallback(() => {
    const path = location.pathname;
    const item = navItems.find((it) => {
      if (it.path === '/') return path === '/';
      return path.startsWith(it.path);
    });
    return item ? item.page : 'pocetna';
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============ COLOR UTILS ============
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  const rgbToHex = (r, g, b) =>
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('');

  const lighten = (hex, amount = 0.45) => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  };

  const darken = (hex, amount = 0.5) => {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
  };

  const applyColor = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const root = document.documentElement;
    root.style.setProperty('--bead-accent', hex);
    root.style.setProperty('--bead-accent-light', lighten(hex, 0.45));
    root.style.setProperty('--bead-accent-dark', darken(hex, 0.5));
    root.style.setProperty('--bead-glow-rgb', `${r}, ${g}, ${b}`);
  };

  // ============ SOUND ============
  const audioCtxRef = useRef(null);

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        audioCtxRef.current = null;
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playClick = (freq = 880) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const time = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.06);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.1);
  };

  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  // ============ NOTCH ============
  const updateNotch = useCallback(() => {
    const dock = dockRef.current;
    const bead = beadRef.current;
    const notchSvg = notchSvgRef.current;
    const notchCircle = notchCircleRef.current;
    if (!dock || !bead || !notchSvg || !notchCircle) return;

    const dockRect = dock.getBoundingClientRect();
    const beadRect = bead.getBoundingClientRect();
    const beadCenterX = (beadRect.left - dockRect.left) + beadRect.width / 2;

    notchSvg.setAttribute('viewBox', `0 0 ${dockRect.width} ${dockRect.height}`);
    notchSvg.setAttribute('width', dockRect.width);
    notchSvg.setAttribute('height', dockRect.height);

    const radius = beadRect.width / 2 + 5;
    notchCircle.setAttribute('cx', beadCenterX);
    const circleY = beadRect.top - dockRect.top + beadRect.height / 2;
    notchCircle.setAttribute('cy', circleY);
    notchCircle.setAttribute('r', radius);
  }, []);

  // ============ ANIMIRANI NOTCH ============
  const animateNotch = useCallback((targetCenterX) => {
    const dock = dockRef.current;
    const bead = beadRef.current;
    const notchCircle = notchCircleRef.current;
    if (!dock || !bead || !notchCircle) return;

    const dockRect = dock.getBoundingClientRect();
    const beadRect = bead.getBoundingClientRect();
    const radius = beadRect.width / 2 + 5;

    const startX = parseFloat(notchCircle.getAttribute('cx')) || targetCenterX;
    const startTime = performance.now();
    const duration = 400;
    const fromX = startX;
    const toX = targetCenterX;

    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const c1 = 1.70158;
      const c3 = c1 + 1;
      const eased = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      const x = fromX + (toX - fromX) * eased;

      notchCircle.setAttribute('cx', x);
      const circleY = beadRect.top - dockRect.top + beadRect.height / 2;
      notchCircle.setAttribute('cy', circleY);
      notchCircle.setAttribute('r', radius);

      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, []);

  // ============ TRAIL PARTICLES ============
  const startTrail = useCallback((color) => {
    clearInterval(trailIntervalRef.current);
    let count = 0;
    trailIntervalRef.current = setInterval(() => {
      if (count++ > 6) {
        clearInterval(trailIntervalRef.current);
        return;
      }
      const bead = beadRef.current;
      if (!bead) return;
      const rect = bead.getBoundingClientRect();
      const cx = rect.left + rect.width / 2 + (Math.random() - 0.5) * 18;
      const cy = rect.top + rect.height / 2 + (Math.random() - 0.5) * 18;

      const p = document.createElement('div');
      p.className = 'bead-trail-particle';
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.width = 3 + Math.random() * 4 + 'px';
      p.style.height = p.style.width;
      if (color) p.style.setProperty('--particle-color', color);
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 600);
    }, 35);
  }, []);

  // ============ POZICIONIRANJE BALONA ============
  const positionBead = useCallback(
    (itemEl, animate = true) => {
      const dock = dockRef.current;
      const bead = beadRef.current;
      if (!dock || !bead || !itemEl) return;

      const dockRect = dock.getBoundingClientRect();
      const itemRect = itemEl.getBoundingClientRect();

      const beadSize = bead.offsetWidth;
      const centerX = itemRect.left - dockRect.left + itemRect.width / 2;
      const left = centerX - beadSize / 2;

      if (!animate) {
        bead.style.transition = 'none';
        bead.style.left = left + 'px';
        void bead.offsetWidth;
        bead.style.transition = '';
        updateNotch();
        return;
      }
      bead.style.left = left + 'px';
      animateNotch(centerX);
      startTrail(itemEl.dataset.color);
    },
    [updateNotch, animateNotch, startTrail]
  );

  // ============ IKONA U BALONU ============
  const setBeadIcon = useCallback((page) => {
    const item = document.querySelector(`.dock-item[data-page="${page}"]`);
    if (!item) return;
    const sourceSvg = item.querySelector('.dock-icon svg');
    if (!sourceSvg) return;

    const cloned = sourceSvg.cloneNode(true);
    const enterLayer = beadLayerEnterRef.current;
    const activeLayer = beadLayerActiveRef.current;
    if (!enterLayer || !activeLayer) return;

    enterLayer.innerHTML = '';
    enterLayer.appendChild(cloned);
    void enterLayer.offsetWidth;

    requestAnimationFrame(() => {
      enterLayer.classList.remove('bead-icon-enter');
      enterLayer.classList.add('bead-icon-active');
      activeLayer.classList.remove('bead-icon-active');
      activeLayer.classList.add('bead-icon-exit');
    });

    setTimeout(() => {
      activeLayer.innerHTML = enterLayer.innerHTML;
      activeLayer.classList.remove('bead-icon-exit', 'bead-icon-enter');
      activeLayer.classList.add('bead-icon-active');

      enterLayer.innerHTML = '';
      enterLayer.classList.remove('bead-icon-active', 'bead-icon-exit');
      enterLayer.classList.add('bead-icon-enter');
    }, 420);
  }, []);

  // ============ SHOCKWAVE ============
  const createShockwave = useCallback((x, y, color) => {
    const dock = dockRef.current;
    if (!dock) return;
    const wave = document.createElement('div');
    wave.className = 'bead-shockwave';
    wave.style.left = x + 'px';
    wave.style.top = y + 'px';
    if (color) wave.style.setProperty('--wave-color', color);
    dock.appendChild(wave);
    setTimeout(() => wave.remove(), 550);
  }, []);

  // ============ SET ACTIVE ============
  const setActive = useCallback(
    (page, navigateTo = null) => {
      if (page === activePage) return;

      if (isAnimatingRef.current) {
        clearTimeout(moveTimerRef.current);
        isAnimatingRef.current = false;
      }
      isAnimatingRef.current = true;

      const item = document.querySelector(`.dock-item[data-page="${page}"]`);
      if (!item) return;

      const targetColor = item.dataset.color || '#22c55e';

      applyColor(targetColor);
      ensureAudio();
      playClick();
      vibrate(hapticPatterns[page] || [8, 20, 10]);

      const oldItem = document.querySelector('.dock-item.active');

      item.classList.add('rippling');
      const elRect = item.getBoundingClientRect();
      const dockRect = dockRef.current.getBoundingClientRect();
      createShockwave(
        elRect.left - dockRect.left + elRect.width / 2,
        elRect.top - dockRect.top + elRect.height / 2,
        targetColor
      );
      setTimeout(() => item.classList.remove('rippling'), 500);

      setBeadIcon(page);

      if (oldItem) oldItem.classList.remove('active');

      item.classList.add('launching');
      setTimeout(() => {
        item.classList.remove('launching');
        item.classList.add('active');
      }, 400);

      positionBead(item);

      const bead = beadRef.current;
      if (bead) {
        bead.classList.add('moving');
        clearTimeout(moveTimerRef.current);
        moveTimerRef.current = setTimeout(() => {
          bead.classList.remove('moving');
          void bead.offsetWidth;
          isAnimatingRef.current = false;
        }, 460);
      }

      setActivePage(page);

      if (navigateTo) {
        navigate(navigateTo);
      }
    },
    [activePage, createShockwave, positionBead, setBeadIcon, navigate]
  );

  // ============ SINHRONIZACIJA S ROUTER-OM ============
  useEffect(() => {
    const currentPage = getActivePage();
    if (currentPage !== activePage) {
      const item = document.querySelector(`.dock-item[data-page="${currentPage}"]`);
      if (item) {
        const targetColor = item.dataset.color || '#22c55e';
        applyColor(targetColor);

        const oldItem = document.querySelector('.dock-item.active');
        if (oldItem) oldItem.classList.remove('active');
        item.classList.add('active');

        positionBead(item);
        setBeadIcon(currentPage);
        setActivePage(currentPage);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // ============ INIT ============
  useEffect(() => {
    // Početno pozicioniranje
    const initPage = getActivePage();
    const initItem = document.querySelector(`.dock-item[data-page="${initPage}"]`);
    if (initItem) {
      initItem.classList.add('active');
      const targetColor = initItem.dataset.color || '#22c55e';
      applyColor(targetColor);

      setTimeout(() => {
        positionBead(initItem, false);
        setBeadIcon(initPage);

        const sourceSvg = initItem.querySelector('.dock-icon svg');
        if (sourceSvg && beadLayerActiveRef.current && beadLayerEnterRef.current) {
          const cloned = sourceSvg.cloneNode(true);
          beadLayerActiveRef.current.innerHTML = '';
          beadLayerActiveRef.current.appendChild(cloned);
          beadLayerActiveRef.current.classList.add('bead-icon-active');
          beadLayerEnterRef.current.innerHTML = '';
          beadLayerEnterRef.current.classList.add('bead-icon-enter');
        }

        setActivePage(initPage);
        updateNotch();
      }, 50);
    }

    // Resize handler
    let rz;
    const handleResize = () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        const activeItem = document.querySelector('.dock-item.active');
        if (activeItem) positionBead(activeItem, false);
        updateNotch();
      }, 100);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const items = [...document.querySelectorAll('.dock-item')];
      const idx = items.findIndex((it) => it.classList.contains('active'));
      if (idx < 0) return;
      const nextIdx =
        e.key === 'ArrowRight' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      const nextItem = items[nextIdx];
      if (nextItem) {
        const page = nextItem.dataset.page;
        const navigateTo = nextItem.dataset.path;
        setActive(page, navigateTo);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      if (trailIntervalRef.current) clearInterval(trailIntervalRef.current);
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============ LONG PRESS TOOLTIP ============
  const pressTimerRef = useRef(null);
  const didLongPressRef = useRef(false);

  const showTooltip = useCallback((item) => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;
    const rect = item.getBoundingClientRect();
    const label = item.dataset.label || item.dataset.page;
    const color = item.dataset.color || '#22c55e';
    const { r, g, b } = hexToRgb(color);

    tooltip.textContent = label;
    tooltip.style.left = rect.left + rect.width / 2 + 'px';
    tooltip.style.top = rect.top + 'px';
    tooltip.style.setProperty('--bead-glow-rgb', `${r}, ${g}, ${b}`);
    tooltip.classList.add('show');
  }, []);

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) tooltipRef.current.classList.remove('show');
  }, []);

  const handleTouchStart = (item) => {
    didLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      showTooltip(item);
      vibrate([15]);
    }, 400);
  };

  const handleTouchEnd = (e) => {
    clearTimeout(pressTimerRef.current);
    if (didLongPressRef.current) {
      e.preventDefault();
      setTimeout(hideTooltip, 200);
    }
  };

  const handleTouchMove = () => {
    clearTimeout(pressTimerRef.current);
    hideTooltip();
  };

  // ============ SVG IKONE ============
  const HomeIcon = () => (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="homeRoofL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset="0.5" stopColor="#dc2626" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="homeRoofR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dc2626" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="homeWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fefce8" />
          <stop offset="0.5" stopColor="#fef08a" />
          <stop offset="1" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="homeWallShadow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id="homeChimney" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8a29e" />
          <stop offset="1" stopColor="#44403c" />
        </linearGradient>
        <linearGradient id="homeDoor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a16207" />
          <stop offset="1" stopColor="#422006" />
        </linearGradient>
        <linearGradient id="homeWindowG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset="0.5" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <radialGradient id="windowGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fef3c7" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="37" rx="14" ry="1.5" fill="#000000" opacity="0.35" />
      <rect x="25" y="7" width="4" height="7" fill="url(#homeChimney)" rx="0.4" />
      <rect x="25" y="7" width="4" height="1.5" fill="#78716c" rx="0.4" />
      <path d="M3 19 L20 5 L20 8 L5 19 Z" fill="url(#homeRoofL)" />
      <path d="M20 5 L37 19 L35 19 L20 8 Z" fill="url(#homeRoofR)" />
      <path d="M3 19 L20 5 L20 6 L4 19 Z" fill="#fca5a5" opacity="0.7" />
      <rect x="6" y="18" width="28" height="18" fill="url(#homeWall)" />
      <rect x="26" y="18" width="8" height="18" fill="url(#homeWallShadow)" />
      <rect x="6" y="18" width="28" height="1.5" fill="#000000" opacity="0.15" />
      <rect x="9" y="21" width="6" height="6" rx="0.5" fill="url(#homeWindowG)" stroke="#1e40af" strokeWidth="0.7" />
      <rect x="9.2" y="21.2" width="5.6" height="5.6" fill="url(#windowGlow)" />
      <line x1="12" y1="21" x2="12" y2="27" stroke="#1e40af" strokeWidth="0.7" />
      <line x1="9" y1="24" x2="15" y2="24" stroke="#1e40af" strokeWidth="0.7" />
      <rect x="25" y="21" width="6" height="6" rx="0.5" fill="url(#homeWindowG)" stroke="#1e40af" strokeWidth="0.7" />
      <rect x="25.2" y="21.2" width="5.6" height="5.6" fill="url(#windowGlow)" />
      <line x1="28" y1="21" x2="28" y2="27" stroke="#1e40af" strokeWidth="0.7" />
      <line x1="25" y1="24" x2="31" y2="24" stroke="#1e40af" strokeWidth="0.7" />
      <rect x="17" y="25" width="6" height="11" rx="0.5" fill="url(#homeDoor)" />
      <rect x="18" y="26" width="4" height="3" rx="0.3" fill="#000000" opacity="0.2" />
      <rect x="18" y="30" width="4" height="3" rx="0.3" fill="#000000" opacity="0.2" />
      <circle cx="22" cy="30.5" r="0.5" fill="#fbbf24" />
      <rect x="15" y="35.5" width="10" height="1.5" rx="0.3" fill="#a8a29e" />
    </svg>
  );

  const RobotIcon = () => (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="robotHeadG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="0.4" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="robotBodyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <radialGradient id="robotEyeRed" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fca5a5" />
          <stop offset="0.6" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id="robotEyeBlue" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset="0.6" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <linearGradient id="robotPlate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#475569" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="37.5" rx="11" ry="1.5" fill="#000000" opacity="0.4" />
      <line x1="20" y1="3" x2="20" y2="7.5" stroke="#475569" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="20" cy="3" r="2.2" fill="#7f1d1d" />
      <circle cx="20" cy="3" r="1.7" fill="url(#robotEyeRed)" />
      <circle cx="8" cy="14" r="1.8" fill="#7f1d1d" />
      <circle cx="8" cy="14" r="1.3" fill="url(#robotEyeRed)" />
      <circle cx="32" cy="14" r="1.8" fill="#7f1d1d" />
      <circle cx="32" cy="14" r="1.3" fill="url(#robotEyeRed)" />
      <rect x="10" y="7.5" width="20" height="13" rx="3.5" fill="url(#robotHeadG)" stroke="#334155" strokeWidth="0.6" />
      <rect x="11" y="8.5" width="18" height="2" rx="1" fill="#ffffff" opacity="0.6" />
      <rect x="11.5" y="10.5" width="17" height="7" rx="2" fill="url(#robotPlate)" />
      <circle cx="16" cy="14" r="2" fill="#0a0a0a" />
      <circle cx="16" cy="14" r="1.5" fill="url(#robotEyeBlue)" />
      <circle cx="24" cy="14" r="2" fill="#0a0a0a" />
      <circle cx="24" cy="14" r="1.5" fill="url(#robotEyeBlue)" />
      <rect x="15" y="17" width="10" height="1.3" rx="0.4" fill="#1e293b" />
      <rect x="17.5" y="20.5" width="5" height="2" fill="#334155" />
      <rect x="11" y="22.5" width="18" height="13" rx="2.5" fill="url(#robotBodyG)" stroke="#334155" strokeWidth="0.6" />
      <rect x="13.5" y="27.5" width="13" height="5" rx="0.8" fill="#0f172a" />
      <circle cx="16" cy="30" r="0.8" fill="#22c55e" />
      <circle cx="20" cy="30" r="0.8" fill="#ef4444" />
      <circle cx="24" cy="30" r="0.8" fill="#3b82f6" />
      <rect x="7" y="24" width="3" height="2" rx="0.5" fill="#334155" />
      <rect x="30" y="24" width="3" height="2" rx="0.5" fill="#334155" />
    </svg>
  );

  const TargetIcon = () => (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="target1" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="0.7" stopColor="#dc2626" />
          <stop offset="1" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id="target2" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.8" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#cbd5e1" />
        </radialGradient>
        <linearGradient id="arrowShaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#94a3b8" />
          <stop offset="0.5" stopColor="#475569" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <radialGradient id="arrowHead" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.4" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="36.5" rx="14" ry="1.8" fill="#000000" opacity="0.4" />
      <circle cx="20" cy="20" r="14" fill="url(#target1)" />
      <circle cx="20" cy="20" r="10.5" fill="url(#target2)" />
      <circle cx="20" cy="20" r="7" fill="url(#target1)" />
      <circle cx="20" cy="20" r="3.8" fill="url(#target2)" />
      <circle cx="20" cy="20" r="2" fill="url(#target1)" />
      <line x1="32" y1="8" x2="22" y2="18" stroke="url(#arrowShaft)" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 8 L28.5 13 L33.5 11.5 Z" fill="url(#arrowHead)" stroke="#78350f" strokeWidth="0.4" strokeLinejoin="round" />
    </svg>
  );

  const DropletIcon = () => (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="waterMain" x1="0.25" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor="#bfdbfe" />
          <stop offset="0.3" stopColor="#60a5fa" />
          <stop offset="0.65" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <radialGradient id="waterHighlight" cx="0.35" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="36" rx="8" ry="1.5" fill="#000000" opacity="0.35" />
      <path d="M20 4 C20 4, 7 18, 7 25 C7 31.5, 12.5 36, 20 36 C27.5 36, 33 31.5, 33 25 C33 18, 20 4, 20 4 Z" fill="url(#waterMain)" />
      <ellipse cx="14" cy="17" rx="3.5" ry="5" fill="url(#waterHighlight)" transform="rotate(-15 14 17)" />
      <circle cx="24" cy="28" r="1.2" fill="#ffffff" opacity="0.5" />
      <circle cx="17" cy="30" r="1.2" fill="#ffffff" opacity="0.3" />
    </svg>
  );

  const ChartIcon = () => (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bar1L" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fca5a5" />
          <stop offset="0.5" stopColor="#ef4444" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
        <linearGradient id="bar2L" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="bar3L" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="0.5" stopColor="#22c55e" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="36.5" rx="13" ry="1.5" fill="#000000" opacity="0.4" />
      <rect x="4" y="5" width="32" height="30" rx="2.5" fill="rgba(248,250,252,0.08)" stroke="#94a3b8" strokeWidth="0.5" opacity="0.6" />
      <line x1="7" y1="13" x2="34" y2="13" stroke="#94a3b8" strokeWidth="0.3" opacity="0.3" />
      <line x1="7" y1="20" x2="34" y2="20" stroke="#94a3b8" strokeWidth="0.3" opacity="0.3" />
      <line x1="7" y1="27" x2="34" y2="27" stroke="#94a3b8" strokeWidth="0.3" opacity="0.3" />
      <rect x="9" y="23" width="5" height="10" rx="0.5" fill="url(#bar1L)" />
      <rect x="17" y="15" width="5" height="18" rx="0.5" fill="url(#bar2L)" />
      <rect x="25" y="9" width="5" height="24" rx="0.5" fill="url(#bar3L)" />
    </svg>
  );

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'home': return <HomeIcon />;
      case 'robot': return <RobotIcon />;
      case 'target': return <TargetIcon />;
      case 'droplet': return <DropletIcon />;
      case 'chart': return <ChartIcon />;
      default: return null;
    }
  };

  return (
    <>
      {/* Tooltip */}
      <div className="bead-tooltip" ref={tooltipRef}></div>

      {/* Dock */}
      <div className="bead-dock-wrap">
        <nav className="bead-dock is-active" ref={dockRef}>
          {/* SVG Notch */}
          <div className="bead-dock-notch">
            <svg ref={notchSvgRef} preserveAspectRatio="none">
              <defs>
                <mask id="beadNotchMask">
                  <rect width="100%" height="100%" fill="white" />
                  <circle ref={notchCircleRef} cx="50%" cy="50%" r="0" fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="black" mask="url(#beadNotchMask)" opacity="0" />
            </svg>
          </div>

          {/* Bead (balon) */}
          <div className="bead" ref={beadRef}>
            <span className="bead-shine"></span>
            <span className="bead-ring"></span>
            <div className="bead-icon-wrap">
              <div className="bead-icon-layer bead-icon-active" ref={beadLayerActiveRef}></div>
              <div className="bead-icon-layer bead-icon-enter" ref={beadLayerEnterRef}></div>
            </div>
          </div>

          {/* Nav items */}
          {navItems.map((item) => {
            const isActive = activePage === item.page;
            return (
              <button
                key={item.page}
                type="button"
                className={`dock-item ${isActive ? 'active' : ''}`}
                data-page={item.page}
                data-path={item.path}
                data-label={item.label}
                data-color={item.color}
                style={{ '--item-color': item.color }}
                onClick={() => setActive(item.page, item.path)}
                onTouchStart={() => handleTouchStart(document.querySelector(`.dock-item[data-page="${item.page}"]`))}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchCancel={handleTouchMove}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="dock-icon">{getIcon(item.icon)}</span>
                <span className="dock-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default BottomNav;
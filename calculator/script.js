(() => {
  const screen = document.getElementById('screen');
  const history = document.getElementById('history');
  const themeToggle = document.getElementById('themeToggle');
  const soundToggle = document.getElementById('soundToggle');
  const tick = document.getElementById('tick');

  // State
  let memory = 0;
  let soundOn = true;

  // Helpers
  const playTick = () => { if (soundOn) { try { tick.currentTime = 0; tick.play().catch(()=>{}); } catch(_){} } };
  const setHistory = (txt) => history.textContent = txt || '';
  const insert = (val) => {
    const start = screen.selectionStart ?? screen.value.length;
    const end = screen.selectionEnd ?? screen.value.length;
    const before = screen.value.slice(0, start);
    const after = screen.value.slice(end);
    screen.value = before + val + after;
    const pos = start + val.length;
    requestAnimationFrame(() => { screen.focus(); screen.setSelectionRange(pos, pos); });
  };
  const clearAll = () => { screen.value = ''; setHistory(''); };
  const backspace = () => {
    const start = screen.selectionStart ?? screen.value.length;
    const end = screen.selectionEnd ?? screen.value.length;
    if (start !== end) {
      const before = screen.value.slice(0, start);
      const after = screen.value.slice(end);
      screen.value = before + after;
      requestAnimationFrame(() => screen.setSelectionRange(start, start));
      return;
    }
    if (start > 0) {
      const before = screen.value.slice(0, start - 1);
      const after = screen.value.slice(start);
      screen.value = before + after;
      requestAnimationFrame(() => screen.setSelectionRange(start - 1, start - 1));
    }
  };

  const sanitize = (expr) => expr.replace(/[^0-9+\-*/(). ]/g, '');

  const evaluate = () => {
    const expr = sanitize(screen.value);
    if (!expr.trim()) return;
    try {
      // Basic safe eval using Function on sanitized numeric ops only
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expr})`)();
      if (Number.isFinite(result)) {
        setHistory(expr + ' =');
        screen.value = String(result);
      } else {
        flashError();
      }
    } catch (e) {
      flashError();
    }
  };

  const flashError = () => {
    const original = screen.style.color;
    screen.style.color = 'var(--danger)';
    navigator.vibrate?.(40);
    setTimeout(() => screen.style.color = original, 180);
  };

  // Memory ops
  const doMemory = (action) => {
    const current = Number(screen.value) || 0;
    switch (action) {
      case 'mc': memory = 0; setHistory('MC'); break;
      case 'mr': insert(String(memory)); setHistory('MR'); break;
      case 'mplus': memory += current; setHistory('M+ ' + current); break;
      case 'mminus': memory -= current; setHistory('M- ' + current); break;
    }
  };

  // Button handling
  document.querySelectorAll('.keys .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playTick();
      const key = btn.dataset.key;
      if (!key) return;
      switch (key) {
        case '=': evaluate(); break;
        case 'C': clearAll(); break;
        default: insert(key); break;
      }
    });
  });

  document.querySelectorAll('.mem-key').forEach(btn => {
    btn.addEventListener('click', () => { playTick(); doMemory(btn.dataset.action); });
  });

  // Keyboard support
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); playTick(); evaluate(); return; }
    if (e.key === 'Escape') { e.preventDefault(); playTick(); clearAll(); return; }
    if (e.key === 'Backspace') { playTick(); backspace(); e.preventDefault(); return; }
    const allowed = /[0-9+\-*/().]/;
    if (allowed.test(e.key)) { playTick(); insert(e.key); e.preventDefault(); }
  });

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
    themeToggle.setAttribute('aria-pressed', String(!isLight));
  });

  // Sound toggle
  soundToggle.addEventListener('click', () => {
    soundOn = !soundOn;
    soundToggle.textContent = soundOn ? '🔊 Sound' : '🔈 Sound';
    soundToggle.setAttribute('aria-pressed', String(soundOn));
  });

  // Initialize
  screen.value = '';
  screen.placeholder = '0';
  screen.setAttribute('inputmode', 'decimal');
  screen.focus();
})();

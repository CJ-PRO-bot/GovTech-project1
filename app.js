// Simple Employee Web App - Demo only (localStorage-based)
(function(){
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Elements
  const navLogin = qs('#nav-login');
  const navSignup = qs('#nav-signup');

  const authCard = qs('#auth');
  const tabLogin = qs('#tab-login');
  const tabSignup = qs('#tab-signup');
  const formLogin = qs('#form-login');
  const formSignup = qs('#form-signup');
  const loginError = qs('#login-error');
  const signupError = qs('#signup-error');

  const dashboard = qs('#dashboard');
  const menuItems = qsa('.menu-item');
  const views = qsa('.view');
  const btnLogout = qs('#btn-logout');

  const userName = qs('#user-name');
  const userRole = qs('#user-role');
  const userEmail = qs('#user-email span:last-child');
  const userAvatar = qs('#user-avatar');

  const kpiDays = qs('#kpi-days');
  const kpiStreak = qs('#kpi-streak');
  const kpiLast = qs('#kpi-last');
  const chart7d = qs('#chart-7d');

  const liveTime = qs('#live-time');
  const btnCheckIn = qs('#btn-checkin');
  const btnCheckOut = qs('#btn-checkout');
  const activityBody = qs('#activity');

  const formProfile = qs('#form-profile');
  const profileName = qs('#profile-name');
  const profileRole = qs('#profile-role');
  const profileEmail = qs('#profile-email');
  const profileMsg = qs('#profile-msg');

  const footerYear = qs('#year');

  // Utils
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  const nowISO = () => new Date().toISOString();
  const todayKey = () => new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—';
  const fmtDate = (iso) => new Date(iso).toLocaleDateString();
  const duration = (a, b) => {
    if(!a || !b) return '—';
    const ms = new Date(b) - new Date(a);
    const h = Math.floor(ms/3_600_000);
    const m = Math.floor((ms%3_600_000)/60_000);
    return `${h}h ${m}m`;
  }
  const emailValid = (email) => /.+@.+\..+/.test(email);

  // Storage API
  const storage = {
    get employees(){ return JSON.parse(localStorage.getItem('employees')||'[]'); },
    set employees(v){ localStorage.setItem('employees', JSON.stringify(v)); },
    get session(){ return JSON.parse(localStorage.getItem('session')||'null'); },
    set session(v){ localStorage.setItem('session', JSON.stringify(v)); },
    get attendance(){ return JSON.parse(localStorage.getItem('attendance')||'{}'); },
    set attendance(v){ localStorage.setItem('attendance', JSON.stringify(v)); },
  };

  // Hashing (demo)
  async function hash(input){
    if(window.crypto?.subtle){
      const enc = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }
    // fallback
    let h = 0; for(let i=0;i<input.length;i++){ h = ((h<<5)-h) + input.charCodeAt(i); h|=0 }
    return String(h);
  }

  function setLoading(btn, loading){
    if(loading){ btn.classList.add('loading'); btn.disabled = true; }
    else { btn.classList.remove('loading'); btn.disabled = false; }
  }

  // Auth UI switching
  function showLogin(){
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.classList.add('visible');
    formSignup.classList.remove('visible');
    loginError.textContent = '';
    signupError.textContent = '';
  }
  function showSignup(){
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.classList.add('visible');
    formLogin.classList.remove('visible');
    loginError.textContent = '';
    signupError.textContent = '';
  }

  // Session/Dashboard
  function setSession(email){ storage.session = { email, at: nowISO() }; }
  function currentUser(){
    const sess = storage.session; if(!sess) return null;
    return storage.employees.find(e => e.email === sess.email) || null;
  }

  function renderDashboard(){
    const user = currentUser();
    if(!user){
      dashboard.classList.add('hidden');
      authCard.style.display = '';
      return;
    }
    authCard.style.display = 'none';
    dashboard.classList.remove('hidden');

    userName.textContent = user.name;
    userRole.textContent = user.role || 'Employee';
    userEmail.textContent = user.email;

    // Avatar seed color
    const hue = [...user.email].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
    userAvatar.style.background = `linear-gradient(135deg, hsl(${hue},70%,60%), hsl(${(hue+60)%360},70%,60%))`;

    updateAttendanceUI();
    switchView('overview');
  }

  function switchView(id){
    views.forEach(v => v.classList.remove('visible'));
    qs(`#view-${id}`).classList.add('visible');
    menuItems.forEach(i => i.classList.toggle('active', i.dataset.view===id));
  }

  // Attendance
  function getUserAttendance(email){
    const all = storage.attendance; return all[email] || [];
  }
  function setUserAttendance(email, arr){
    const all = storage.attendance; all[email] = arr; storage.attendance = all;
  }

  function updateAttendanceUI(){
    const user = currentUser(); if(!user) return;
    const email = user.email;
    const data = getUserAttendance(email);

    // Button states
    const today = todayKey();
    const todayRec = data.find(d => d.date === today);
    const checkedIn = !!(todayRec && todayRec.checkIn && !todayRec.checkOut);
    btnCheckIn.disabled = checkedIn;
    btnCheckOut.disabled = !checkedIn;

    // KPI calc
    const last7 = lastNDays(7);
    const presentCount = last7.filter(d => data.some(r=>r.date===d && r.checkIn)).length;
    kpiDays.textContent = String(presentCount);

    const lastRecord = data.filter(r=>r.checkIn).slice(-1)[0];
    kpiLast.textContent = lastRecord ? `${fmtDate(lastRecord.checkIn)} ${fmtTime(lastRecord.checkIn)}` : '—';

    kpiStreak.textContent = String(calcStreak(data));

    // Activity table
    activityBody.innerHTML = '';
    data.slice(-20).reverse().forEach(rec => {
      const row = document.createElement('div');
      row.innerHTML = `
        <div>${rec.date}</div>
        <div>${fmtTime(rec.checkIn)}</div>
        <div>${fmtTime(rec.checkOut)}</div>
        <div>${duration(rec.checkIn, rec.checkOut)}</div>
      `;
      activityBody.appendChild(row);
    });

    // Chart
    draw7dayChart(chart7d, last7.map(day => ({
      day,
      present: data.some(r => r.date===day && r.checkIn)
    })));
  }

  function lastNDays(n){
    const days = [];
    const d = new Date();
    for(let i=n-1;i>=0;i--){
      const dt = new Date(d);
      dt.setDate(d.getDate()-i);
      days.push(dt.toISOString().slice(0,10));
    }
    return days;
  }

  function calcStreak(data){
    // count consecutive days with presence ending today or yesterday
    const set = new Set(data.filter(r=>r.checkIn).map(r=>r.date));
    let streak = 0;
    let d = new Date();
    // if today not present but yesterday is, start from yesterday
    if(!set.has(todayKey())) d.setDate(d.getDate()-1);
    for(;;){
      const key = d.toISOString().slice(0,10);
      if(set.has(key)) { streak++; d.setDate(d.getDate()-1); }
      else break;
    }
    return streak;
  }

  function draw7dayChart(canvas, points){
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);

    // axes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 20); ctx.lineTo(40, h-40); ctx.lineTo(w-10, h-40); ctx.stroke();

    const gap = (w-60)/ (points.length-1);
    // grid + labels
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px Inter, sans-serif';
    points.forEach((p, i) => {
      const x = 40 + i*gap;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(p.day.slice(5), x-10, h-20);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, h-40); ctx.stroke();
    });

    // bars
    points.forEach((p, i) => {
      const x = 40 + i*gap;
      const y = p.present ? h-80 : h-40;
      const hh = p.present ? 40 : 2;
      const grd = ctx.createLinearGradient(0, y, 0, y+hh);
      grd.addColorStop(0, '#5b8cff');
      grd.addColorStop(1, '#7ea3ff');
      ctx.fillStyle = p.present ? grd : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      const bw = Math.min(48, gap*0.6);
      ctx.roundRect(x-bw/2, y, bw, hh, 6);
      ctx.fill();
    });
  }

  // Polyfill for roundRect in some older browsers
  if(!CanvasRenderingContext2D.prototype.roundRect){
    CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){
      const rr = typeof r === 'number' ? {tl:r,tr:r,br:r,bl:r} : r;
      const {tl,tr,br,bl} = rr;
      this.beginPath();
      this.moveTo(x+tl, y);
      this.lineTo(x+w-tr, y);
      this.quadraticCurveTo(x+w, y, x+w, y+tr);
      this.lineTo(x+w, y+h-br);
      this.quadraticCurveTo(x+w, y+h, x+w-br, y+h);
      this.lineTo(x+bl, y+h);
      this.quadraticCurveTo(x, y+h, x, y+h-bl);
      this.lineTo(x, y+tl);
      this.quadraticCurveTo(x, y, x+tl, y);
      this.closePath();
      return this;
    }
  }

  // Live clock
  function tick(){
    if(liveTime){
      const d = new Date();
      liveTime.textContent = d.toLocaleString();
    }
    requestAnimationFrame(() => setTimeout(tick, 500));
  }

  // Event handlers
  navLogin?.addEventListener('click', showLogin);
  navSignup?.addEventListener('click', showSignup);
  tabLogin.addEventListener('click', showLogin);
  tabSignup.addEventListener('click', showSignup);
  qs('#link-to-signup').addEventListener('click', e => { e.preventDefault(); showSignup(); });
  qs('#link-to-login').addEventListener('click', e => { e.preventDefault(); showLogin(); });

  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault(); signupError.textContent = '';
    const btn = formSignup.querySelector('button[type="submit"]');
    setLoading(btn, true);
    await sleep(500);

    const name = qs('#signup-name').value.trim();
    const role = qs('#signup-role').value.trim();
    const email = qs('#signup-email').value.trim().toLowerCase();
    const pass = qs('#signup-password').value;
    const pass2 = qs('#signup-password2').value;

    if(!name){ signupError.textContent = 'Please enter your name.'; setLoading(btn,false); return; }
    if(!emailValid(email)){ signupError.textContent = 'Please enter a valid email.'; setLoading(btn,false); return; }
    if(pass.length < 6){ signupError.textContent = 'Password must be at least 6 characters.'; setLoading(btn,false); return; }
    if(pass !== pass2){ signupError.textContent = 'Passwords do not match.'; setLoading(btn,false); return; }

    const users = storage.employees;
    if(users.some(u => u.email === email)){
      signupError.textContent = 'An account with this email already exists.';
      setLoading(btn,false); return;
    }

    const passwordHash = await hash(pass);
    const newUser = { id: crypto.randomUUID?.() || String(Date.now()), name, role, email, passwordHash, createdAt: nowISO() };
    users.push(newUser);
    storage.employees = users;

    setSession(email);
    renderDashboard();
    setLoading(btn,false);
  });

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault(); loginError.textContent = '';
    const btn = formLogin.querySelector('button[type="submit"]');
    setLoading(btn, true);
    await sleep(400);

    const email = qs('#login-email').value.trim().toLowerCase();
    const pass = qs('#login-password').value;
    if(!emailValid(email)){ loginError.textContent = 'Please enter a valid email.'; setLoading(btn,false); return; }

    const users = storage.employees;
    const user = users.find(u => u.email === email);
    if(!user){ loginError.textContent = 'No account found for this email.'; setLoading(btn,false); return; }

    const passwordHash = await hash(pass);
    if(passwordHash !== user.passwordHash){ loginError.textContent = 'Incorrect password.'; setLoading(btn,false); return; }

    setSession(email);
    renderDashboard();
    setLoading(btn,false);
  });

  btnLogout.addEventListener('click', () => {
    storage.session = null;
    authCard.style.display = '';
    dashboard.classList.add('hidden');
    showLogin();
  });

  // Sidebar view switching
  menuItems.forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));

  // Attendance actions
  btnCheckIn.addEventListener('click', () => {
    const user = currentUser(); if(!user) return;
    const email = user.email;
    const data = getUserAttendance(email);
    const today = todayKey();
    let rec = data.find(r => r.date === today);
    if(!rec){ rec = { date: today, checkIn: nowISO(), checkOut: null }; data.push(rec); }
    else if(!rec.checkIn){ rec.checkIn = nowISO(); }
    setUserAttendance(email, data);
    updateAttendanceUI();
  });

  btnCheckOut.addEventListener('click', () => {
    const user = currentUser(); if(!user) return;
    const email = user.email;
    const data = getUserAttendance(email);
    const today = todayKey();
    const rec = data.find(r => r.date === today);
    if(rec && rec.checkIn && !rec.checkOut){ rec.checkOut = nowISO(); }
    setUserAttendance(email, data);
    updateAttendanceUI();
  });

  // Profile
  formProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formProfile.querySelector('button[type="submit"]');
    setLoading(btn, true);
    await sleep(400);

    const user = currentUser(); if(!user){ setLoading(btn,false); return; }
    const users = storage.employees.map(u => {
      if(u.email === user.email){
        return { ...u, name: profileName.value.trim(), role: profileRole.value.trim() };
      }
      return u;
    });
    storage.employees = users;
    profileMsg.textContent = 'Saved successfully';
    setTimeout(()=> profileMsg.textContent = '', 2000);
    setLoading(btn,false);
    renderDashboard();
  });

  function hydrateProfile(){
    const user = currentUser(); if(!user) return;
    profileName.value = user.name || '';
    profileRole.value = user.role || '';
    profileEmail.value = user.email || '';
  }

  // Init
  function init(){
    footerYear.textContent = new Date().getFullYear();
    if(storage.session && currentUser()){
      renderDashboard();
    } else {
      showLogin();
    }
    hydrateProfile();
    tick();
    updateAttendanceUI();
  }

  window.addEventListener('storage', (e) => {
    if(['employees','attendance','session'].includes(e.key)){
      renderDashboard();
    }
  });

  init();
})();

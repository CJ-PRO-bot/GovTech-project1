// Frontend wired to backend API (Django endpoints under /api/*)
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
  const todayKey = () => new Date().toISOString().slice(0,10);
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '—';
  const fmtDate = (iso) => new Date(iso).toLocaleDateString();
  const duration = (a,b)=>{ if(!a||!b) return '—'; const ms=new Date(b)-new Date(a); const h=Math.floor(ms/3_600_000); const m=Math.floor((ms%3_600_000)/60_000); return `${h}h ${m}m`; };
  const emailValid = (email) => /.+@.+\..+/.test(email);

  const api = {
    async me(){ return fetch('/api/auth/me', { credentials:'include' }).then(r=>r.json()); },
    async signup(payload){ return fetch('/api/auth/signup',{ method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload)}).then(r=>r.json().then(j=>({ok:r.ok, ...j}))); },
    async login(payload){ return fetch('/api/auth/login',{ method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload)}).then(r=>r.json().then(j=>({ok:r.ok, ...j}))); },
    async logout(){ return fetch('/api/auth/logout',{ method:'POST', credentials:'include' }).then(r=>r.json()); },
    async userMe(){ return fetch('/api/users/me',{ credentials:'include' }).then(r=>r.json()); },
    async userUpdate(payload){ return fetch('/api/users/me',{ method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload)}).then(r=>r.json()); },
    async attendance(){ return fetch('/api/attendance',{ credentials:'include' }).then(r=>r.json()); },
    async checkin(){ return fetch('/api/attendance/checkin',{ method:'POST', credentials:'include' }).then(r=>r.json()); },
    async checkout(){ return fetch('/api/attendance/checkout',{ method:'POST', credentials:'include' }).then(r=>r.json()); },
  };

  function setLoading(btn, loading){
    if(loading){ btn.classList.add('loading'); btn.disabled=true; }
    else { btn.classList.remove('loading'); btn.disabled=false; }
  }

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

  function renderDashboard(user){
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

    const hue = [...user.email].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
    userAvatar.style.background = `linear-gradient(135deg, hsl(${hue},70%,60%), hsl(${(hue+60)%360},70%,60%))`;

    updateAttendanceUI();
    switchView('overview');
    hydrateProfile(user);
  }

  function switchView(id){
    views.forEach(v => v.classList.remove('visible'));
    qs(`#view-${id}`).classList.add('visible');
    menuItems.forEach(i => i.classList.toggle('active', i.dataset.view===id));
  }

  function lastNDays(n){
    const days = []; const d = new Date();
    for(let i=n-1;i>=0;i--){ const dt = new Date(d); dt.setDate(d.getDate()-i); days.push(dt.toISOString().slice(0,10)); }
    return days;
  }

  function calcStreak(records){
    const set = new Set(records.filter(r=>r.checkIn).map(r=>r.date));
    let streak=0; let d=new Date(); if(!set.has(todayKey())) d.setDate(d.getDate()-1);
    for(;;){ const key=d.toISOString().slice(0,10); if(set.has(key)){ streak++; d.setDate(d.getDate()-1);} else break; }
    return streak;
  }

  async function updateAttendanceUI(){
    const res = await api.attendance();
    const data = res.records || [];

    const today = todayKey();
    const todayRec = data.find(d => d.date === today);
    const checkedIn = !!(todayRec && todayRec.checkIn && !todayRec.checkOut);
    btnCheckIn.disabled = checkedIn;
    btnCheckOut.disabled = !checkedIn;

    const last7 = lastNDays(7);
    const presentCount = last7.filter(d => data.some(r=>r.date===d && r.checkIn)).length;
    kpiDays.textContent = String(presentCount);

    const lastRecord = data.filter(r=>r.checkIn).slice(-1)[0];
    kpiLast.textContent = lastRecord ? `${fmtDate(lastRecord.checkIn)} ${fmtTime(lastRecord.checkIn)}` : '—';

    kpiStreak.textContent = String(calcStreak(data));

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

    draw7dayChart(chart7d, last7.map(day => ({ day, present: data.some(r => r.date===day && r.checkIn) })));
  }

  function draw7dayChart(canvas, points){
    const ctx = canvas.getContext('2d'); const w=canvas.width, h=canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(40,20); ctx.lineTo(40,h-40); ctx.lineTo(w-10,h-40); ctx.stroke();
    const gap=(w-60)/(points.length-1);
    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='12px Inter, sans-serif';
    points.forEach((p,i)=>{ const x=40+i*gap; ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillText(p.day.slice(5), x-10, h-20); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(x,30); ctx.lineTo(x,h-40); ctx.stroke(); });
    points.forEach((p,i)=>{ const x=40+i*gap; const y=p.present? h-80 : h-40; const hh=p.present?40:2; const grd=ctx.createLinearGradient(0,y,0,y+hh); grd.addColorStop(0,'#5b8cff'); grd.addColorStop(1,'#7ea3ff'); ctx.fillStyle=p.present?grd:'rgba(255,255,255,0.25)'; const bw=Math.min(48,gap*0.6); if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(x-bw/2,y,bw,hh,6); ctx.fill(); } else { ctx.fillRect(x-bw/2,y,bw,hh); } });
  }

  function tick(){ const d=new Date(); if(liveTime){ liveTime.textContent=d.toLocaleString(); } requestAnimationFrame(()=> setTimeout(tick,500)); }

  // Events
  navLogin?.addEventListener('click', showLogin);
  navSignup?.addEventListener('click', showSignup);
  tabLogin.addEventListener('click', showLogin);
  tabSignup.addEventListener('click', showSignup);
  qs('#link-to-signup').addEventListener('click', e=>{ e.preventDefault(); showSignup(); });
  qs('#link-to-login').addEventListener('click', e=>{ e.preventDefault(); showLogin(); });

  formSignup.addEventListener('submit', async (e) => {
    e.preventDefault(); signupError.textContent='';
  });
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault(); loginError.textContent='';
  });

  // Wire submit buttons to hidden forms to catch Enter key and clicks
  document.getElementById('signup-form-inner')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.querySelector('#form-signup .btn.primary');
    signupError.textContent='';
    setLoading(btn,true); await sleep(300);
    const payload = {
      name: qs('#signup-name').value.trim(),
      role: qs('#signup-role').value.trim(),
      email: qs('#signup-email').value.trim().toLowerCase(),
      password: qs('#signup-password').value
    };
    if(!payload.name){ signupError.textContent='Please enter your name.'; setLoading(btn,false); return; }
    if(!emailValid(payload.email)){ signupError.textContent='Please enter a valid email.'; setLoading(btn,false); return; }
    const pass2 = qs('#signup-password2').value;
    if(payload.password.length<6){ signupError.textContent='Password must be at least 6 characters.'; setLoading(btn,false); return; }
    if(payload.password !== pass2){ signupError.textContent='Passwords do not match.'; setLoading(btn,false); return; }

    const res = await api.signup(payload);
    if(!res.ok){ signupError.textContent = res.error || 'Sign up failed'; setLoading(btn,false); return; }
    await ensureUserAndRender();
    setLoading(btn,false);
  });

  document.getElementById('login-form-inner')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.querySelector('#form-login .btn.primary');
    loginError.textContent='';
    setLoading(btn,true); await sleep(300);
    const payload = { email: qs('#login-email').value.trim().toLowerCase(), password: qs('#login-password').value };
    if(!emailValid(payload.email)){ loginError.textContent='Please enter a valid email.'; setLoading(btn,false); return; }
    const res = await api.login(payload);
    if(!res.ok){ loginError.textContent = res.error || 'Login failed'; setLoading(btn,false); return; }
    await ensureUserAndRender();
    setLoading(btn,false);
  });

  btnLogout?.addEventListener('click', async () => {
    await api.logout();
    authCard.style.display = '';
    dashboard.classList.add('hidden');
    showLogin();
  });

  menuItems.forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));
  btnCheckIn?.addEventListener('click', async () => { await api.checkin(); await updateAttendanceUI(); });
  btnCheckOut?.addEventListener('click', async () => { await api.checkout(); await updateAttendanceUI(); });

  formProfile?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formProfile.querySelector('button.btn.primary');
    if(!btn) return;
    setLoading(btn,true); await sleep(300);
    await api.userUpdate({ name: profileName.value.trim(), role: profileRole.value.trim() });
    profileMsg.textContent = 'Saved successfully'; setTimeout(()=> profileMsg.textContent='', 2000);
    const u = await api.userMe(); renderDashboard(u.user);
    setLoading(btn,false);
  });

  function hydrateProfile(user){
    if(!user) return; profileName.value=user.name||''; profileRole.value=user.role||''; profileEmail.value=user.email||'';
  }

  async function ensureUserAndRender(){
    const me = await api.me().catch(()=>null);
    if(me && me.user){ const u = await api.userMe(); renderDashboard(u.user); }
    else { showLogin(); }
  }

  function init(){
    footerYear.textContent = new Date().getFullYear();
    ensureUserAndRender();
    tick();
  }

  init();
})();

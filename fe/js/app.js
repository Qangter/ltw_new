/* Website tra cứu kết quả thi trực tuyến - SPA thuần HTML/CSS/JS */
'use strict';

// ---------- tiện ích ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => (n === null || n === undefined ? '—' : String(Math.round(Number(n) * 100) / 100));
const fmtDate = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '');
const ROLE = { ADMIN: 'Quản trị viên', TEACHER: 'Giáo viên', STUDENT: 'Sinh viên' };
const RESULT = { PASSED: 'Đạt', FAILED: 'Không đạt' };
const STATUS = { ACTIVE: 'Đang học', GRADUATED: 'Đã tốt nghiệp', SUSPENDED: 'Bảo lưu/Đình chỉ' };
const GENDER = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let meta = null;

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  $('#toast').appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

async function api(path, { method = 'GET', body, form, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch('/api' + path, { method, headers, body: payload });
  if (res.status === 401 && token) { logout(false); throw new Error('Phiên đăng nhập đã hết hạn'); }
  if (raw && res.ok) return res.blob();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Có lỗi xảy ra');
  return data;
}
const qs = (o) => Object.entries(o).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

function logout(redirect = true) {
  token = null; user = null; meta = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  if (redirect) location.hash = '#/login';
  render();
}

function modal(html) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal">${html}</div>`;
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) bg.remove(); });
  document.body.appendChild(bg);
  return bg;
}

function pager(p) {
  if (!p || p.pages <= 1) return `<div class="pager muted">Tổng: ${p ? p.total : 0} bản ghi</div>`;
  const btn = (n, label = n) => `<button class="${n === p.page ? 'cur' : ''}" data-page="${n}">${label}</button>`;
  let out = `<span class="muted">Tổng ${p.total} bản ghi</span>`;
  if (p.page > 1) out += btn(p.page - 1, '‹');
  const from = Math.max(1, p.page - 2), to = Math.min(p.pages, p.page + 2);
  if (from > 1) out += btn(1) + (from > 2 ? '<span>…</span>' : '');
  for (let i = from; i <= to; i++) out += btn(i);
  if (to < p.pages) out += (to < p.pages - 1 ? '<span>…</span>' : '') + btn(p.pages);
  if (p.page < p.pages) out += btn(p.page + 1, '›');
  return `<div class="pager">${out}</div>`;
}
const bindPager = (root, fn) => root.querySelectorAll('.pager [data-page]').forEach((b) => b.addEventListener('click', () => fn(Number(b.dataset.page))));
const opts = (arr, val, label, sel, first) => (first !== undefined ? `<option value="">${first}</option>` : '') +
  arr.map((x) => `<option value="${esc(x[val])}" ${String(x[val]) === String(sel) ? 'selected' : ''}>${esc(typeof label === 'function' ? label(x) : x[label])}</option>`).join('');
const bars = (items, cls = '') => items.map((i) => `<div class="bar-row"><span title="${esc(i.label)}">${esc(i.label)}</span><div class="bar ${cls}"><i style="width:${Math.min(100, i.pct)}%"></i></div><b>${esc(i.text)}</b></div>`).join('');
const loading = (el) => { el.innerHTML = '<div class="empty">Đang tải...</div>'; };

// ---------- menu ----------
const MENU = [
  ['dashboard', 'Tổng quan', ['ADMIN', 'TEACHER']],
  ['my', 'Bảng điểm của tôi', ['STUDENT']],
  ['lookup', 'Tra cứu sinh viên', ['ADMIN', 'TEACHER']],
  ['entry', 'Nhập điểm', ['ADMIN', 'TEACHER']],
  ['import', 'Import Excel', ['ADMIN', 'TEACHER']],
  ['grades', 'Danh sách điểm', ['ADMIN', 'TEACHER']],
  ['stats', 'Thống kê đạt/rớt', ['ADMIN', 'TEACHER']],
  ['students', 'Quản lý sinh viên', ['ADMIN']],
  ['users', 'Tài khoản', ['ADMIN']],
  ['password', 'Đổi mật khẩu', ['ADMIN', 'TEACHER', 'STUDENT']],
];

// ---------- router ----------
function render() {
  const app = $('#app');
  const hash = location.hash.replace(/^#\/?/, '');
  const [route, param] = hash.split('/');
  if (!user) { renderLogin(app); return; }
  const home = user.role === 'STUDENT' ? 'my' : 'dashboard';
  const page = route && route !== 'login' ? route : home;
  const items = MENU.filter((m) => m[2].includes(user.role));
  const activeKey = page === 'student' ? 'lookup' : page;
  if (!items.some((m) => m[0] === activeKey) && page !== 'student') { location.hash = '#/' + home; return; }
  if (page === 'student' && user.role === 'STUDENT') { location.hash = '#/my'; return; }
  app.innerHTML = `<div class="layout">
    <aside class="sidebar">
      <div class="brand">🎓 Tra cứu điểm thi</div>
      <nav>${items.map((m) => `<a href="#/${m[0]}" class="${m[0] === activeKey ? 'active' : ''}">${m[1]}</a>`).join('')}</nav>
      <div class="userbox"><b>${esc(user.full_name)}</b>${ROLE[user.role]}<br><a href="#" id="logout" style="color:#8fb8ff">Đăng xuất</a></div>
    </aside>
    <main class="main" id="view"></main></div>`;
  $('#logout').addEventListener('click', (e) => { e.preventDefault(); logout(); });
  const view = $('#view');
  const views = { dashboard: vDashboard, my: vMy, lookup: vLookup, student: vStudent, entry: vEntry, import: vImport, grades: vGrades, stats: vStats, students: vStudents, users: vUsers, password: vPassword };
  loading(view);
  Promise.resolve(views[page](view, param)).catch((e) => { view.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; });
}
window.addEventListener('hashchange', render);

async function ensureMeta() { if (!meta) meta = await api('/meta'); return meta; }

// ---------- đăng nhập ----------
function renderLogin(app) {
  app.innerHTML = `<div class="login-wrap"><form class="login-card" id="lf">
    <h1>🎓 Tra cứu kết quả thi</h1><p class="muted" style="text-align:center;margin-top:0">Đăng nhập để tiếp tục</p>
    <label>Tên đăng nhập</label><input name="username" autofocus required>
    <label>Mật khẩu</label><input name="password" type="password" required>
    <button style="width:100%;margin-top:18px;padding:11px">Đăng nhập</button>
    <div class="demo"><b>Tài khoản demo</b><br>Admin: admin / admin123<br>Giáo viên: teacher01 / teacher123<br>Sinh viên: student001 / student123</div></form></div>`;
  $('#lf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const r = await api('/auth/login', { method: 'POST', body: { username: f.get('username'), password: f.get('password') } });
      token = r.token; user = r.user;
      localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
      location.hash = user.role === 'STUDENT' ? '#/my' : '#/dashboard';
      render();
    } catch (err) { toast(err.message, 'err'); }
  });
}

// ---------- tổng quan ----------
async function vDashboard(v) {
  const [o, sem, dist, dep] = await Promise.all([api('/stats/overview'), api('/stats/by-semester'), api('/stats/distribution'), api('/stats/by-department')]);
  const maxDist = Math.max(...dist.map((d) => d.total), 1), maxDep = Math.max(...dep.map((d) => d.students), 1);
  v.innerHTML = `<h1>Tổng quan hệ thống</h1><p class="muted">Xin chào, ${esc(user.full_name)}</p>
  <div class="grid c4" style="margin:16px 0">
    <div class="stat"><div class="n">${o.students}</div><div class="l">Sinh viên</div></div>
    <div class="stat"><div class="n">${o.teachers}</div><div class="l">Giáo viên</div></div>
    <div class="stat"><div class="n">${o.subjects}</div><div class="l">Môn học</div></div>
    <div class="stat"><div class="n">${o.classes}</div><div class="l">Lớp</div></div>
    <div class="stat warn"><div class="n">${o.grades}</div><div class="l">Bản ghi điểm</div></div>
    <div class="stat warn"><div class="n">${num(o.avg_score)}</div><div class="l">Điểm trung bình</div></div>
    <div class="stat ok"><div class="n">${o.pass_rate}%</div><div class="l">Tỷ lệ đạt (${o.passed})</div></div>
    <div class="stat bad"><div class="n">${o.fail_rate}%</div><div class="l">Tỷ lệ rớt (${o.failed})</div></div></div>
  <div class="grid c2">
    <div class="card"><h2>Tỷ lệ đạt theo học kỳ</h2>${bars(sem.map((s) => ({ label: s.semester_code, pct: s.pass_rate, text: s.pass_rate + '%' })), 'ok')}</div>
    <div class="card"><h2>Phân bố điểm chữ</h2>${bars(dist.map((d) => ({ label: d.letter_grade, pct: d.total / maxDist * 100, text: d.total })))}</div>
    <div class="card"><h2>Sinh viên theo khoa</h2>${bars(dep.map((d) => ({ label: d.department_name, pct: d.students / maxDep * 100, text: d.students })))}</div></div>`;
}

// ---------- bảng điểm (dùng chung) ----------
async function showTranscript(v, loader, canBack) {
  const m = await ensureMeta();
  let semId = '';
  async function draw() {
    const d = await loader(semId);
    const s = d.student, sm = d.summary;
    const groups = {};
    d.grades.forEach((g) => { (groups[g.semester_name] = groups[g.semester_name] || []).push(g); });
    v.innerHTML = `${canBack ? '<a href="#/lookup" class="no-print">← Quay lại tra cứu</a>' : ''}
    <div class="card" style="margin-top:10px"><h1>${esc(s.full_name)}</h1>
      <div class="profile" style="margin-top:12px">
        <div><span>Mã sinh viên</span><b>${esc(s.student_code)}</b></div><div><span>Lớp</span>${esc(s.class_code)}</div>
        <div><span>Ngành</span>${esc(s.major_name)}</div><div><span>Khoa</span>${esc(s.department_name)}</div>
        <div><span>Ngày sinh</span>${fmtDate(s.date_of_birth)}</div><div><span>Giới tính</span>${GENDER[s.gender]}</div>
        <div><span>Năm nhập học</span>${s.admission_year}</div><div><span>Trạng thái</span><span class="badge ${s.status}" style="display:inline-block">${STATUS[s.status]}</span></div></div></div>
    <div class="grid c4" style="margin-bottom:18px">
      <div class="stat"><div class="n">${num(sm.gpa)}</div><div class="l">Điểm TB (thang 10)</div></div>
      <div class="stat"><div class="n">${sm.subjects}</div><div class="l">Số môn đã có điểm</div></div>
      <div class="stat ok"><div class="n">${sm.passed_credits}/${sm.credits}</div><div class="l">Tín chỉ đạt / tổng</div></div>
      <div class="stat bad"><div class="n">${sm.failed_subjects}</div><div class="l">Môn không đạt</div></div></div>
    <div class="card"><div class="toolbar no-print"><div><label>Lọc theo học kỳ</label><select id="semf">${opts(m.semesters, 'id', 'semester_name', semId, 'Tất cả học kỳ')}</select></div>
      <button class="sec" id="print">🖨 In bảng điểm</button></div>
      ${d.grades.length ? Object.entries(groups).map(([name, list]) => `<h2 style="margin-top:14px">${esc(name)}</h2><div class="table-wrap"><table>
        <tr><th>Mã môn</th><th>Tên môn</th><th class="num">Tín chỉ</th><th>Giáo viên</th><th class="num">CC</th><th class="num">GK</th><th class="num">CK</th><th class="num">Tổng kết</th><th>Xếp loại</th><th>Kết quả</th></tr>
        ${list.map((g) => `<tr><td>${esc(g.subject_code)}</td><td>${esc(g.subject_name)}</td><td class="num">${g.credits}</td><td>${esc(g.teacher_name)}</td>
        <td class="num">${num(g.attendance_score)}</td><td class="num">${num(g.midterm_score)}</td><td class="num">${num(g.final_score)}</td>
        <td class="num"><b>${num(g.total_score)}</b></td><td><b>${g.letter_grade}</b></td><td><span class="badge ${g.result}">${RESULT[g.result]}</span></td></tr>`).join('')}</table></div>`).join('')
        : '<div class="empty">Chưa có dữ liệu điểm.</div>'}
    </div>`;
    $('#semf').addEventListener('change', (e) => { semId = e.target.value; draw(); });
    $('#print').addEventListener('click', () => window.print());
  }
  await draw();
}
const vMy = (v) => showTranscript(v, (sem) => api('/students/me/transcript?' + qs({ semester_id: sem })), false);
const vStudent = (v, id) => showTranscript(v, (sem) => api(`/students/${id}/transcript?` + qs({ semester_id: sem })), true);

// ---------- tra cứu sinh viên ----------
async function vLookup(v) {
  const m = await ensureMeta();
  const f = { q: '', class_id: '', page: 1 };
  v.innerHTML = `<h1>Tra cứu sinh viên</h1><p class="muted">Tìm theo mã số hoặc họ tên, sau đó xem bảng điểm chi tiết.</p>
  <div class="card"><form class="toolbar" id="sf"><div><label>Mã số / Họ tên</label><input name="q" placeholder="VD: SV0001 hoặc Nguyễn Văn" style="min-width:260px" autofocus></div>
    <div><label>Lớp</label><select name="class_id">${opts(m.classes, 'id', 'class_code', '', 'Tất cả lớp')}</select></div><button>Tìm kiếm</button></form>
    <div id="res"></div></div>`;
  async function load() {
    const res = $('#res'); loading(res);
    const p = await api('/students?' + qs({ ...f, limit: 10 }));
    res.innerHTML = p.data.length ? `<div class="table-wrap"><table><tr><th>Mã SV</th><th>Họ tên</th><th>Lớp</th><th>Ngành</th><th>Khoa</th><th>Trạng thái</th><th></th></tr>
      ${p.data.map((s) => `<tr><td>${esc(s.student_code)}</td><td>${esc(s.full_name)}</td><td>${esc(s.class_code)}</td><td>${esc(s.major_name)}</td><td>${esc(s.department_name)}</td>
      <td><span class="badge ${s.status}">${STATUS[s.status]}</span></td><td><a href="#/student/${s.id}"><button class="sm">Xem điểm</button></a></td></tr>`).join('')}</table></div>${pager(p)}`
      : '<div class="empty">Không tìm thấy sinh viên phù hợp.</div>';
    bindPager(res, (n) => { f.page = n; load(); });
  }
  $('#sf').addEventListener('submit', (e) => { e.preventDefault(); const d = new FormData(e.target); f.q = d.get('q').trim(); f.class_id = d.get('class_id'); f.page = 1; load().catch((x) => toast(x.message, 'err')); });
  load();
}

// ---------- nhập điểm ----------
async function vEntry(v) {
  const m = await ensureMeta();
  const active = m.semesters.find((s) => s.status === 'ACTIVE') || m.semesters[m.semesters.length - 1];
  v.innerHTML = `<h1>Nhập / sửa điểm</h1><p class="muted">Điểm tổng kết = 10% chuyên cần + 30% giữa kỳ + 60% cuối kỳ (nếu để trống CC/GK thì tổng kết = điểm cuối kỳ).</p>
  <div class="card"><div class="toolbar"><div><label>Học kỳ</label><select id="es">${opts(m.semesters, 'id', 'semester_name', active.id)}</select></div>
  <div><label>Lớp học phần</label><select id="eo" style="min-width:320px"></select></div></div><div id="etable"></div></div>`;
  let offerings = [];
  async function loadOfferings() {
    offerings = await api('/offerings?' + qs({ semester_id: $('#es').value }));
    $('#eo').innerHTML = offerings.length ? offerings.map((o) => `<option value="${o.id}">${esc(o.subject_code)} - ${esc(o.subject_name)} (${o.enrolled} SV)${user.role === 'ADMIN' ? ' - ' + esc(o.teacher_name) : ''}</option>`).join('') : '';
    if (offerings.length) loadStudents(); else $('#etable').innerHTML = '<div class="empty">Không có lớp học phần trong học kỳ này.</div>';
  }
  async function loadStudents() {
    const id = $('#eo').value; const box = $('#etable'); loading(box);
    const rows = await api(`/offerings/${id}/students`);
    box.innerHTML = `<div class="toolbar"><div><label>Thêm sinh viên vào lớp (mã SV)</label><input id="addcode" placeholder="VD: SV0100"></div><button class="sec" id="addbtn">Thêm</button>
      <button id="saveall" style="margin-left:auto">💾 Lưu tất cả thay đổi</button></div>
      ${rows.length ? `<div class="table-wrap"><table><tr><th>Mã SV</th><th>Họ tên</th><th>Chuyên cần</th><th>Giữa kỳ</th><th>Cuối kỳ</th><th class="num">Tổng kết</th><th>Xếp loại</th><th>Kết quả</th><th></th></tr>
      ${rows.map((r) => `<tr data-en="${r.enrollment_id}" data-gid="${r.grade_id || ''}"><td>${esc(r.student_code)}</td><td>${esc(r.full_name)}</td>
        <td><input class="sc" data-f="attendance_score" value="${r.attendance_score ?? ''}"></td><td><input class="sc" data-f="midterm_score" value="${r.midterm_score ?? ''}"></td>
        <td><input class="sc" data-f="final_score" value="${r.final_score ?? ''}"></td><td class="num tot"><b>${num(r.total_score)}</b></td><td class="let">${r.letter_grade || '—'}</td>
        <td class="res">${r.result ? `<span class="badge ${r.result}">${RESULT[r.result]}</span>` : '—'}</td>
        <td><button class="sm save">Lưu</button> ${r.grade_id ? '<button class="sm danger del">Xóa</button>' : ''}</td></tr>`).join('')}</table></div>` : '<div class="empty">Lớp chưa có sinh viên đăng ký.</div>'}`;
    async function saveRow(tr, silent) {
      const body = {};
      tr.querySelectorAll('input').forEach((i) => { body[i.dataset.f] = i.value.trim(); });
      if (body.final_score === '') { if (!silent) toast('Cần nhập điểm cuối kỳ', 'err'); return false; }
      try {
        const r = await api(`/grades/enrollment/${tr.dataset.en}`, { method: 'PUT', body: { ...body, reason: 'Cập nhật điểm thủ công' } });
        tr.querySelector('.tot').innerHTML = `<b>${num(r.total)}</b>`; tr.querySelector('.let').textContent = r.letter;
        tr.querySelector('.res').innerHTML = `<span class="badge ${r.result}">${RESULT[r.result]}</span>`; tr.dataset.dirty = '';
        if (!silent) toast('Đã lưu điểm', 'ok'); return true;
      } catch (e) { toast(`${tr.children[0].textContent}: ${e.message}`, 'err'); return false; }
    }
    box.querySelectorAll('tr[data-en]').forEach((tr) => {
      tr.querySelectorAll('input').forEach((i) => i.addEventListener('input', () => { tr.dataset.dirty = '1'; }));
      tr.querySelector('.save').addEventListener('click', () => saveRow(tr));
      const del = tr.querySelector('.del');
      if (del) del.addEventListener('click', async () => {
        if (!confirm('Xóa điểm của sinh viên này?')) return;
        try { await api('/grades/' + tr.dataset.gid, { method: 'DELETE' }); toast('Đã xóa điểm', 'ok'); loadStudents(); } catch (e) { toast(e.message, 'err'); }
      });
    });
    const sa = $('#saveall');
    sa.addEventListener('click', async () => {
      const dirty = [...box.querySelectorAll('tr[data-dirty="1"]')];
      if (!dirty.length) return toast('Chưa có thay đổi nào');
      let ok = 0; for (const tr of dirty) if (await saveRow(tr, true)) ok++;
      toast(`Đã lưu ${ok}/${dirty.length} dòng`, ok === dirty.length ? 'ok' : 'err');
    });
    $('#addbtn').addEventListener('click', async () => {
      try { await api(`/offerings/${id}/enroll`, { method: 'POST', body: { student_code: $('#addcode').value } }); toast('Đã thêm sinh viên', 'ok'); loadStudents(); } catch (e) { toast(e.message, 'err'); }
    });
  }
  $('#es').addEventListener('change', () => loadOfferings().catch((e) => toast(e.message, 'err')));
  $('#eo').addEventListener('change', () => loadStudents().catch((e) => toast(e.message, 'err')));
  await loadOfferings();
}

// ---------- import Excel ----------
async function vImport(v) {
  v.innerHTML = `<h1>Import điểm từ Excel</h1><p class="muted">File .xlsx gồm các cột: student_code, full_name, subject_code, subject_name, credits, semester_name, academic_year, score.</p>
  <div class="card"><button class="sec" id="tpl">⬇ Tải file mẫu</button>
  <div class="drop" style="margin-top:14px"><input type="file" id="file" accept=".xlsx,.xls"><p class="muted">Hệ thống dùng mã SV, mã môn và tên học kỳ để tìm lớp học phần; giáo viên chỉ import được môn mình dạy. Điểm ghi vào điểm cuối kỳ/tổng kết.</p>
  <button id="up">Import</button></div><div id="ires" style="margin-top:16px"></div></div>`;
  $('#tpl').addEventListener('click', async () => {
    try { const b = await api('/import/template', { raw: true }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'excel_template.xlsx'; a.click(); } catch (e) { toast(e.message, 'err'); }
  });
  $('#up').addEventListener('click', async () => {
    const file = $('#file').files[0];
    if (!file) return toast('Vui lòng chọn file Excel', 'err');
    const fd = new FormData(); fd.append('file', file);
    const box = $('#ires'); loading(box);
    try {
      const r = await api('/import/grades', { method: 'POST', form: fd });
      box.innerHTML = `<div class="grid c4"><div class="stat"><div class="n">${r.total}</div><div class="l">Tổng dòng</div></div><div class="stat ok"><div class="n">${r.created}</div><div class="l">Thêm mới</div></div>
        <div class="stat warn"><div class="n">${r.updated}</div><div class="l">Cập nhật</div></div><div class="stat bad"><div class="n">${r.failed}</div><div class="l">Lỗi</div></div></div>
        ${r.errors.length ? `<h2 style="margin-top:16px">Chi tiết lỗi</h2><div class="table-wrap"><table><tr><th>Dòng</th><th>Lỗi</th></tr>${r.errors.map((e) => `<tr><td>${e.row}</td><td>${esc(e.message)}</td></tr>`).join('')}</table></div>` : ''}`;
      toast('Import hoàn tất', r.failed ? '' : 'ok');
    } catch (e) { box.innerHTML = ''; toast(e.message, 'err'); }
  });
}

// ---------- danh sách điểm ----------
async function vGrades(v) {
  const m = await ensureMeta();
  const f = { q: '', semester_id: '', subject_id: '', result: '', page: 1 };
  v.innerHTML = `<h1>Danh sách điểm</h1><div class="card"><form class="toolbar" id="gf">
    <div><label>Mã / tên SV</label><input name="q"></div>
    <div><label>Học kỳ</label><select name="semester_id">${opts(m.semesters, 'id', 'semester_name', '', 'Tất cả')}</select></div>
    <div><label>Môn học</label><select name="subject_id">${opts(m.subjects, 'id', (s) => `${s.subject_code} - ${s.subject_name}`, '', 'Tất cả')}</select></div>
    <div><label>Kết quả</label><select name="result"><option value="">Tất cả</option><option value="PASSED">Đạt</option><option value="FAILED">Không đạt</option></select></div>
    <button>Lọc</button></form><div id="gres"></div></div>`;
  async function load() {
    const box = $('#gres'); loading(box);
    const p = await api('/grades?' + qs(f));
    box.innerHTML = p.data.length ? `<div class="table-wrap"><table><tr><th>Mã SV</th><th>Họ tên</th><th>Môn học</th><th>Học kỳ</th><th>Giáo viên</th><th class="num">Điểm</th><th>Loại</th><th>Kết quả</th><th>Sửa</th></tr>
    ${p.data.map((g) => `<tr><td>${esc(g.student_code)}</td><td>${esc(g.full_name)}</td><td>${esc(g.subject_code)} - ${esc(g.subject_name)}</td><td>${esc(g.semester_name)}</td><td>${esc(g.teacher_name)}</td>
    <td class="num"><b>${num(g.total_score)}</b></td><td>${g.letter_grade}</td><td><span class="badge ${g.result}">${RESULT[g.result]}</span></td>
    <td>${g.edits ? `<button class="sm sec hist" data-id="${g.id}">${g.edits} lần</button>` : '—'}</td></tr>`).join('')}</table></div>${pager(p)}` : '<div class="empty">Không có dữ liệu.</div>';
    bindPager(box, (n) => { f.page = n; load(); });
    box.querySelectorAll('.hist').forEach((b) => b.addEventListener('click', async () => {
      try {
        const h = await api(`/grades/${b.dataset.id}/history`);
        const md = modal(`<h2>Lịch sử sửa điểm</h2><table><tr><th>Thời gian</th><th>Cũ</th><th>Mới</th><th>Người sửa</th><th>Lý do</th></tr>
          ${h.map((x) => `<tr><td>${esc(x.changed_at)}</td><td>${num(x.old_score)}</td><td>${num(x.new_score)}</td><td>${esc(x.changed_by || '')}</td><td style="white-space:normal">${esc(x.reason)}</td></tr>`).join('')}</table>
          <div class="actions"><button class="sec">Đóng</button></div>`);
        md.querySelector('button').addEventListener('click', () => md.remove());
      } catch (e) { toast(e.message, 'err'); }
    }));
  }
  $('#gf').addEventListener('submit', (e) => { e.preventDefault(); const d = new FormData(e.target); ['q', 'semester_id', 'subject_id', 'result'].forEach((k) => { f[k] = d.get(k).trim(); }); f.page = 1; load().catch((x) => toast(x.message, 'err')); });
  load();
}

// ---------- thống kê ----------
async function vStats(v) {
  const [o, sem, sub, dist] = await Promise.all([api('/stats/overview'), api('/stats/by-semester'), api('/stats/by-subject'), api('/stats/distribution')]);
  const maxD = Math.max(...dist.map((d) => d.total), 1);
  v.innerHTML = `<h1>Thống kê đạt / rớt</h1>
  <div class="grid c4" style="margin:16px 0"><div class="stat ok"><div class="n">${o.pass_rate}%</div><div class="l">Tỷ lệ đạt (${o.passed} điểm)</div></div>
    <div class="stat bad"><div class="n">${o.fail_rate}%</div><div class="l">Tỷ lệ rớt (${o.failed} điểm)</div></div>
    <div class="stat"><div class="n">${num(o.avg_score)}</div><div class="l">Điểm trung bình</div></div><div class="stat warn"><div class="n">${o.grades}</div><div class="l">Tổng bản ghi điểm</div></div></div>
  <div class="grid c2"><div class="card"><h2>Tỷ lệ đạt theo học kỳ</h2>${bars(sem.map((s) => ({ label: s.semester_code, pct: s.pass_rate, text: s.pass_rate + '%' })), 'ok')}</div>
    <div class="card"><h2>Phân bố điểm chữ</h2>${bars(dist.map((d) => ({ label: d.letter_grade, pct: d.total / maxD * 100, text: d.total })))}</div></div>
  <div class="card"><h2>Thống kê theo môn học</h2><div class="table-wrap"><table><tr><th>Mã môn</th><th>Tên môn</th><th class="num">Số điểm</th><th class="num">Điểm TB</th><th class="num">Đạt</th><th style="width:220px">Tỷ lệ đạt</th></tr>
  ${sub.map((s) => `<tr><td>${esc(s.subject_code)}</td><td>${esc(s.subject_name)}</td><td class="num">${s.total}</td><td class="num">${num(s.avg_score)}</td><td class="num">${s.passed}</td>
  <td><div class="bar-row" style="grid-template-columns:1fr 50px;margin:0"><div class="bar ok"><i style="width:${s.pass_rate}%"></i></div><b>${s.pass_rate}%</b></div></td></tr>`).join('')}</table></div></div>`;
}

// ---------- quản lý sinh viên (Admin) ----------
async function vStudents(v) {
  const m = await ensureMeta();
  const f = { q: '', class_id: '', status: '', page: 1 };
  v.innerHTML = `<h1>Quản lý sinh viên</h1><div class="card"><form class="toolbar" id="stf"><div><label>Mã / tên</label><input name="q"></div>
    <div><label>Lớp</label><select name="class_id">${opts(m.classes, 'id', 'class_code', '', 'Tất cả')}</select></div>
    <div><label>Trạng thái</label><select name="status"><option value="">Tất cả</option>${Object.entries(STATUS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
    <button>Lọc</button><button type="button" class="sec" id="addst" style="margin-left:auto">＋ Thêm sinh viên</button></form><div id="stres"></div></div>`;
  let rows = [];
  async function load() {
    const box = $('#stres'); loading(box);
    const p = await api('/students?' + qs({ ...f, limit: 12 })); rows = p.data;
    box.innerHTML = p.data.length ? `<div class="table-wrap"><table><tr><th>Mã SV</th><th>Họ tên</th><th>Ngày sinh</th><th>Lớp</th><th>Email</th><th>Trạng thái</th><th></th></tr>
      ${p.data.map((s) => `<tr><td>${esc(s.student_code)}</td><td>${esc(s.full_name)}</td><td>${fmtDate(s.date_of_birth)}</td><td>${esc(s.class_code)}</td><td>${esc(s.email)}</td>
      <td><span class="badge ${s.status}">${STATUS[s.status]}</span></td><td><button class="sm sec ed" data-id="${s.id}">Sửa</button> <button class="sm danger dl" data-id="${s.id}">Xóa</button></td></tr>`).join('')}</table></div>${pager(p)}` : '<div class="empty">Không có dữ liệu.</div>';
    bindPager(box, (n) => { f.page = n; load(); });
    box.querySelectorAll('.ed').forEach((b) => b.addEventListener('click', () => form(rows.find((r) => r.id == b.dataset.id))));
    box.querySelectorAll('.dl').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Xóa sinh viên này?')) return;
      try { const r = await api('/students/' + b.dataset.id, { method: 'DELETE' }); toast(r.message, 'ok'); load(); } catch (e) { toast(e.message, 'err'); }
    }));
  }
  function form(s) {
    const edit = !!s; s = s || { gender: 'MALE', status: 'ACTIVE', admission_year: new Date().getFullYear() };
    const md = modal(`<h2>${edit ? 'Sửa sinh viên' : 'Thêm sinh viên'}</h2><form id="sform" class="form-grid">
      <div><label>Mã sinh viên</label><input name="student_code" value="${esc(s.student_code)}" ${edit ? 'disabled' : 'required'}></div>
      <div><label>Họ tên</label><input name="full_name" value="${esc(s.full_name)}" required></div>
      <div><label>Ngày sinh</label><input type="date" name="date_of_birth" value="${esc(s.date_of_birth)}" required></div>
      <div><label>Giới tính</label><select name="gender">${Object.entries(GENDER).map(([k, t]) => `<option value="${k}" ${s.gender === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label>Lớp</label><select name="class_id">${opts(m.classes, 'id', 'class_code', s.class_id)}</select></div>
      <div><label>Năm nhập học</label><input type="number" name="admission_year" value="${esc(s.admission_year)}" required></div>
      <div><label>Email</label><input name="email" type="email" value="${esc(s.email)}"></div><div><label>Điện thoại</label><input name="phone" value="${esc(s.phone)}"></div>
      <div class="full"><label>Địa chỉ</label><input name="address" value="${esc(s.address)}"></div>
      <div><label>Trạng thái</label><select name="status">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}" ${s.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="full actions"><button type="button" class="sec" id="cx">Hủy</button><button>Lưu</button></div></form>${edit ? '' : '<p class="muted">Tài khoản: tên đăng nhập = mã SV (chữ thường), mật khẩu mặc định student123.</p>'}`);
    md.querySelector('#cx').addEventListener('click', () => md.remove());
    md.querySelector('#sform').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      try {
        const r = edit ? await api('/students/' + s.id, { method: 'PUT', body }) : await api('/students', { method: 'POST', body });
        toast(r.message, 'ok'); md.remove(); load();
      } catch (err) { toast(err.message, 'err'); }
    });
  }
  $('#addst').addEventListener('click', () => form());
  $('#stf').addEventListener('submit', (e) => { e.preventDefault(); const d = new FormData(e.target); ['q', 'class_id', 'status'].forEach((k) => { f[k] = d.get(k).trim(); }); f.page = 1; load().catch((x) => toast(x.message, 'err')); });
  load();
}

// ---------- tài khoản (Admin) ----------
async function vUsers(v) {
  const f = { q: '', role: '', page: 1 };
  v.innerHTML = `<h1>Quản lý tài khoản</h1><div class="card"><form class="toolbar" id="uf"><div><label>Tìm kiếm</label><input name="q" placeholder="username / họ tên"></div>
    <div><label>Vai trò</label><select name="role"><option value="">Tất cả</option>${Object.entries(ROLE).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div><button>Lọc</button></form><div id="ures"></div></div>`;
  async function load() {
    const box = $('#ures'); loading(box);
    const p = await api('/admin/users?' + qs(f));
    box.innerHTML = `<div class="table-wrap"><table><tr><th>Username</th><th>Họ tên</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr>
    ${p.data.map((u) => `<tr><td>${esc(u.username)}</td><td>${esc(u.full_name)}</td><td><span class="badge ${u.role}">${ROLE[u.role]}</span></td>
    <td><span class="badge ${u.is_active ? 'on' : 'off'}">${u.is_active ? 'Hoạt động' : 'Đã khóa'}</span></td>
    <td><button class="sm sec tg" data-id="${u.id}" data-a="${u.is_active ? 0 : 1}">${u.is_active ? 'Khóa' : 'Mở khóa'}</button> <button class="sm sec rs" data-id="${u.id}">Đặt lại MK</button></td></tr>`).join('')}</table></div>${pager(p)}`;
    bindPager(box, (n) => { f.page = n; load(); });
    box.querySelectorAll('.tg').forEach((b) => b.addEventListener('click', async () => {
      try { const r = await api(`/admin/users/${b.dataset.id}/active`, { method: 'PATCH', body: { is_active: b.dataset.a === '1' } }); toast(r.message, 'ok'); load(); } catch (e) { toast(e.message, 'err'); }
    }));
    box.querySelectorAll('.rs').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Đặt lại mật khẩu về mặc định?')) return;
      try { const r = await api(`/admin/users/${b.dataset.id}/reset-password`, { method: 'POST' }); toast(r.message, 'ok'); } catch (e) { toast(e.message, 'err'); }
    }));
  }
  $('#uf').addEventListener('submit', (e) => { e.preventDefault(); const d = new FormData(e.target); f.q = d.get('q').trim(); f.role = d.get('role'); f.page = 1; load().catch((x) => toast(x.message, 'err')); });
  load();
}

// ---------- đổi mật khẩu ----------
function vPassword(v) {
  v.innerHTML = `<h1>Đổi mật khẩu</h1><div class="card" style="max-width:420px"><form id="pf">
    <label>Mật khẩu hiện tại</label><input type="password" name="old_password" required style="width:100%">
    <label>Mật khẩu mới (≥ 6 ký tự)</label><input type="password" name="new_password" required minlength="6" style="width:100%">
    <label>Nhập lại mật khẩu mới</label><input type="password" name="confirm" required style="width:100%"><div class="actions"><button>Đổi mật khẩu</button></div></form></div>`;
  $('#pf').addEventListener('submit', async (e) => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (d.new_password !== d.confirm) return toast('Mật khẩu nhập lại không khớp', 'err');
    try { const r = await api('/auth/change-password', { method: 'POST', body: d }); toast(r.message, 'ok'); e.target.reset(); } catch (err) { toast(err.message, 'err'); }
  });
}

// ---------- khởi động ----------
(async function init() {
  if (token) {
    try { user = { ...user, ...(await api('/auth/me')) }; localStorage.setItem('user', JSON.stringify(user)); }
    catch { logout(false); }
  }
  render();
})();

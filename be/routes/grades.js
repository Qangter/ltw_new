const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pool = require('../config/db');
const { auth, requireRole, wrap } = require('../middleware/auth');
const { HttpError, parseScore } = require('../utils/grade');
const { saveGrade } = require('../services/gradeService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const staff = [auth, requireRole('ADMIN', 'TEACHER')];

async function teacherIdOf(userId) {
  const [r] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [userId]);
  return r[0] && r[0].id;
}
// Giáo viên chỉ được thao tác trên lớp học phần của mình; Admin thì toàn quyền
async function assertOfferingAccess(user, offeringId) {
  const [o] = await pool.query('SELECT id, teacher_id FROM course_offerings WHERE id = ?', [offeringId]);
  if (!o.length) throw new HttpError(404, 'Không tìm thấy lớp học phần');
  if (user.role === 'TEACHER' && o[0].teacher_id !== (await teacherIdOf(user.id))) throw new HttpError(403, 'Đây không phải lớp học phần của bạn');
  return o[0];
}

// --- Danh mục dùng cho bộ lọc ---
router.get('/meta', auth, wrap(async (req, res) => {
  const [semesters] = await pool.query('SELECT id, semester_code, semester_name, academic_year, status FROM semesters ORDER BY start_date');
  const [subjects] = await pool.query('SELECT id, subject_code, subject_name, credits FROM subjects ORDER BY subject_code');
  const [classes] = await pool.query('SELECT id, class_code, class_name FROM classes ORDER BY class_code');
  res.json({ semesters, subjects, classes });
}));

// --- Lớp học phần ---
router.get('/offerings', ...staff, wrap(async (req, res) => {
  const where = []; const params = [];
  if (req.user.role === 'TEACHER') { where.push('t.user_id = ?'); params.push(req.user.id); }
  if (req.query.semester_id) { where.push('o.semester_id = ?'); params.push(req.query.semester_id); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [rows] = await pool.query(
    `SELECT o.id, sb.subject_code, sb.subject_name, sb.credits, sm.semester_name, t.full_name AS teacher_name, o.room, o.schedule,
            (SELECT COUNT(*) FROM enrollments e WHERE e.course_offering_id = o.id) AS enrolled
     FROM course_offerings o JOIN subjects sb ON sb.id=o.subject_id JOIN semesters sm ON sm.id=o.semester_id JOIN teachers t ON t.id=o.teacher_id
     ${w} ORDER BY sb.subject_code`, params);
  res.json(rows);
}));

router.get('/offerings/:id/students', ...staff, wrap(async (req, res) => {
  await assertOfferingAccess(req.user, req.params.id);
  const [rows] = await pool.query(
    `SELECT e.id AS enrollment_id, s.student_code, s.full_name, g.id AS grade_id, g.attendance_score, g.midterm_score, g.final_score, g.total_score, g.letter_grade, g.result
     FROM enrollments e JOIN students s ON s.id=e.student_id LEFT JOIN grades g ON g.enrollment_id=e.id
     WHERE e.course_offering_id = ? ORDER BY s.student_code`, [req.params.id]);
  res.json(rows);
}));

// Thêm sinh viên vào lớp học phần (nhập điểm tay cho SV chưa có đăng ký)
router.post('/offerings/:id/enroll', ...staff, wrap(async (req, res) => {
  await assertOfferingAccess(req.user, req.params.id);
  const code = String((req.body || {}).student_code || '').trim();
  const [s] = await pool.query('SELECT id FROM students WHERE student_code = ?', [code]);
  if (!s.length) throw new HttpError(404, `Không tìm thấy sinh viên ${code}`);
  try {
    await pool.query('INSERT INTO enrollments (student_id, course_offering_id, enrollment_date) VALUES (?,?,CURDATE())', [s[0].id, req.params.id]);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Sinh viên đã đăng ký lớp học phần này');
    throw e;
  }
  res.status(201).json({ message: 'Đã thêm sinh viên vào lớp học phần' });
}));

// --- Nhập / sửa điểm tay ---
router.put('/grades/enrollment/:enrollmentId', ...staff, wrap(async (req, res) => {
  const [e] = await pool.query('SELECT course_offering_id FROM enrollments WHERE id = ?', [req.params.enrollmentId]);
  if (!e.length) throw new HttpError(404, 'Không tìm thấy lượt đăng ký');
  await assertOfferingAccess(req.user, e[0].course_offering_id);
  const b = req.body || {};
  const attendance = parseScore(b.attendance_score, 'Điểm chuyên cần', false);
  const midterm = parseScore(b.midterm_score, 'Điểm giữa kỳ', false);
  const final = parseScore(b.final_score, 'Điểm cuối kỳ', true);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const r = await saveGrade(conn, { enrollmentId: req.params.enrollmentId, attendance, midterm, final, userId: req.user.id, reason: b.reason });
    await conn.commit();
    res.json(r);
  } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
}));

router.delete('/grades/:id', ...staff, wrap(async (req, res) => {
  const [g] = await pool.query('SELECT e.course_offering_id FROM grades g JOIN enrollments e ON e.id=g.enrollment_id WHERE g.id=?', [req.params.id]);
  if (!g.length) throw new HttpError(404, 'Không tìm thấy điểm');
  await assertOfferingAccess(req.user, g[0].course_offering_id);
  await pool.query('DELETE FROM grades WHERE id = ?', [req.params.id]);
  res.json({ message: 'Đã xóa điểm' });
}));

router.get('/grades/:id/history', ...staff, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT h.old_score, h.new_score, h.old_result, h.new_result, u.full_name AS changed_by, h.reason, h.changed_at
     FROM grade_history h LEFT JOIN users u ON u.id=h.changed_by WHERE h.grade_id = ? ORDER BY h.changed_at DESC, h.id DESC`, [req.params.id]);
  res.json(rows);
}));

// --- Danh sách điểm có lọc + phân trang ---
router.get('/grades', ...staff, wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
  const where = []; const params = [];
  if (req.query.q) { where.push('(st.student_code LIKE ? OR st.full_name LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  if (req.query.semester_id) { where.push('o.semester_id = ?'); params.push(req.query.semester_id); }
  if (req.query.subject_id) { where.push('o.subject_id = ?'); params.push(req.query.subject_id); }
  if (req.query.class_id) { where.push('st.class_id = ?'); params.push(req.query.class_id); }
  if (['PASSED', 'FAILED'].includes(req.query.result)) { where.push('g.result = ?'); params.push(req.query.result); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const from = `FROM grades g JOIN enrollments e ON e.id=g.enrollment_id JOIN students st ON st.id=e.student_id
    JOIN course_offerings o ON o.id=e.course_offering_id JOIN subjects sb ON sb.id=o.subject_id JOIN semesters sm ON sm.id=o.semester_id
    JOIN teachers t ON t.id=o.teacher_id`;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${from} ${w}`, params);
  const [rows] = await pool.query(
    `SELECT g.id, st.student_code, st.full_name, sb.subject_code, sb.subject_name, sb.credits, sm.semester_name, t.full_name AS teacher_name,
            g.total_score, g.letter_grade, g.result, g.updated_at,
            (SELECT COUNT(*) FROM grade_history h WHERE h.grade_id = g.id) AS edits
     ${from} ${w} ORDER BY g.updated_at DESC, g.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
}));

// --- Import Excel ---
const HEADERS = ['student_code', 'full_name', 'subject_code', 'subject_name', 'credits', 'semester_name', 'academic_year', 'score'];

router.get('/import/template', ...staff, (req, res) => {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ['SV0001', 'Nguyễn Văn An', 'IT001', 'Lập trình C++', 3, 'Học kỳ 1 năm học 2024-2025', '2024-2025', 8.5]]);
  ws['!cols'] = HEADERS.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Grades');
  res.setHeader('Content-Disposition', 'attachment; filename="excel_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});

router.post('/import/grades', ...staff, upload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Vui lòng chọn file Excel (.xlsx)');
  let rows;
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  } catch { throw new HttpError(400, 'Không đọc được file Excel'); }
  if (!rows.length) throw new HttpError(400, 'File không có dữ liệu');
  const missing = ['student_code', 'subject_code', 'semester_name', 'score'].filter(h => !(h in rows[0]));
  if (missing.length) throw new HttpError(400, `File thiếu cột: ${missing.join(', ')}`);
  if (rows.length > 5000) throw new HttpError(400, 'Tối đa 5000 dòng mỗi lần import');

  const teacherId = req.user.role === 'TEACHER' ? await teacherIdOf(req.user.id) : null;
  const errors = []; let created = 0, updated = 0;
  const conn = await pool.getConnection();
  try {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]; const line = i + 2;
      try {
        const code = String(r.student_code).trim(), sub = String(r.subject_code).trim(), sem = String(r.semester_name).trim();
        if (!code || !sub || !sem) throw new Error('Thiếu mã sinh viên, mã môn hoặc học kỳ');
        const score = parseScore(r.score, 'Điểm', true);
        const [stRows] = await conn.query('SELECT id FROM students WHERE student_code=?', [code]);
        const st = stRows[0];
        if (!st) throw new Error(`Không có sinh viên ${code}`);
        const [sb] = await conn.query('SELECT id FROM subjects WHERE subject_code=?', [sub]);
        if (!sb.length) throw new Error(`Không có môn ${sub}`);
        const [sm] = await conn.query('SELECT id FROM semesters WHERE semester_name=? OR semester_code=?', [sem, sem]);
        if (!sm.length) throw new Error(`Không có học kỳ "${sem}"`);
        // ưu tiên lớp học phần mà sinh viên đã đăng ký
        const [offs] = await conn.query(
          `SELECT o.id, (SELECT e.id FROM enrollments e WHERE e.course_offering_id=o.id AND e.student_id=?) AS enrollment_id
           FROM course_offerings o WHERE o.subject_id=? AND o.semester_id=? ${teacherId ? 'AND o.teacher_id=?' : ''}
           ORDER BY enrollment_id IS NULL, o.id`, teacherId ? [st.id, sb[0].id, sm[0].id, teacherId] : [st.id, sb[0].id, sm[0].id]);
        if (!offs.length) throw new Error(teacherId ? 'Bạn không dạy môn này trong học kỳ đó' : 'Môn này chưa mở trong học kỳ đó');
        await conn.beginTransaction();
        let enrollmentId = offs[0].enrollment_id;
        if (!enrollmentId) {
          const [en] = await conn.query('INSERT INTO enrollments (student_id, course_offering_id, enrollment_date) VALUES (?,?,CURDATE())', [st.id, offs[0].id]);
          enrollmentId = en.insertId;
        }
        const out = await saveGrade(conn, { enrollmentId, attendance: null, midterm: null, final: score, userId: req.user.id, reason: 'Import từ file Excel' });
        await conn.commit();
        out.created ? created++ : updated++;
      } catch (e) {
        try { await conn.rollback(); } catch {}
        errors.push({ row: line, message: e.message });
      }
    }
  } finally { conn.release(); }
  res.json({ total: rows.length, created, updated, failed: errors.length, errors: errors.slice(0, 100) });
}));

module.exports = router;

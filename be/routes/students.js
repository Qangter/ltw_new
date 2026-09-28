const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { auth, requireRole, wrap } = require('../middleware/auth');
const { HttpError } = require('../utils/grade');

const BASE = `FROM students s JOIN classes c ON c.id=s.class_id JOIN majors m ON m.id=c.major_id JOIN departments d ON d.id=m.department_id`;
const COLS = `s.id, s.student_code, s.full_name, s.date_of_birth, s.gender, s.class_id, s.email, s.phone, s.address, s.admission_year, s.status,
  c.class_code, m.major_name, d.department_name`;

// Bảng điểm + GPA của một sinh viên
async function getTranscript(studentId, semesterId) {
  const params = [studentId];
  let extra = '';
  if (semesterId) { extra = ' AND sm.id = ?'; params.push(semesterId); }
  const [grades] = await pool.query(
    `SELECT g.id AS grade_id, sb.subject_code, sb.subject_name, sb.credits, sm.id AS semester_id, sm.semester_name, sm.academic_year,
            t.full_name AS teacher_name, g.attendance_score, g.midterm_score, g.final_score, g.total_score, g.letter_grade, g.result
     FROM enrollments e
     JOIN grades g ON g.enrollment_id = e.id
     JOIN course_offerings o ON o.id = e.course_offering_id
     JOIN subjects sb ON sb.id = o.subject_id
     JOIN semesters sm ON sm.id = o.semester_id
     JOIN teachers t ON t.id = o.teacher_id
     WHERE e.student_id = ?${extra}
     ORDER BY sm.start_date, sb.subject_code`, params);
  let credits = 0, weighted = 0, passedCredits = 0, failed = 0;
  for (const g of grades) {
    credits += g.credits; weighted += g.total_score * g.credits;
    if (g.result === 'PASSED') passedCredits += g.credits; else failed++;
  }
  const summary = { subjects: grades.length, credits, passed_credits: passedCredits, failed_subjects: failed,
    gpa: credits ? Math.round(weighted / credits * 100) / 100 : null };
  return { grades, summary };
}

async function studentInfo(id) {
  const [rows] = await pool.query(`SELECT ${COLS} ${BASE} WHERE s.id = ?`, [id]);
  return rows[0];
}
async function ownStudentId(userId) {
  const [r] = await pool.query('SELECT id FROM students WHERE user_id = ?', [userId]);
  return r[0] && r[0].id;
}

// Sinh viên xem bảng điểm của chính mình
router.get('/me/transcript', auth, requireRole('STUDENT'), wrap(async (req, res) => {
  const id = await ownStudentId(req.user.id);
  if (!id) throw new HttpError(404, 'Không tìm thấy hồ sơ sinh viên');
  res.json({ student: await studentInfo(id), ...(await getTranscript(id, req.query.semester_id)) });
}));

// Danh sách + tìm kiếm + phân trang (Admin, Giáo viên)
router.get('/', auth, requireRole('ADMIN', 'TEACHER'), wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const where = []; const params = [];
  if (req.query.q) { where.push('(s.student_code LIKE ? OR s.full_name LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  if (req.query.class_id) { where.push('s.class_id = ?'); params.push(req.query.class_id); }
  if (req.query.status) { where.push('s.status = ?'); params.push(req.query.status); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${BASE} ${w}`, params);
  const [rows] = await pool.query(`SELECT ${COLS} ${BASE} ${w} ORDER BY s.student_code LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
}));

router.get('/:id/transcript', auth, requireRole('ADMIN', 'TEACHER'), wrap(async (req, res) => {
  const student = await studentInfo(req.params.id);
  if (!student) throw new HttpError(404, 'Không tìm thấy sinh viên');
  res.json({ student, ...(await getTranscript(student.id, req.query.semester_id)) });
}));

function validateStudent(b, isCreate) {
  if (!b.full_name || !b.class_id || !b.date_of_birth || !b.admission_year) throw new HttpError(400, 'Thiếu họ tên, lớp, ngày sinh hoặc năm nhập học');
  if (isCreate && !/^[A-Za-z0-9]{3,30}$/.test(b.student_code || '')) throw new HttpError(400, 'Mã sinh viên gồm 3-30 chữ/số, không dấu');
  if (!['MALE', 'FEMALE', 'OTHER'].includes(b.gender || 'OTHER')) throw new HttpError(400, 'Giới tính không hợp lệ');
  if (!['ACTIVE', 'GRADUATED', 'SUSPENDED'].includes(b.status || 'ACTIVE')) throw new HttpError(400, 'Trạng thái không hợp lệ');
}

// Thêm sinh viên (kèm tài khoản). Mật khẩu mặc định: student123
router.post('/', auth, requireRole('ADMIN'), wrap(async (req, res) => {
  const b = req.body || {}; validateStudent(b, true);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const username = String(b.student_code).toLowerCase();
    const hash = await bcrypt.hash(b.password || 'student123', 10);
    const [u] = await conn.query(`INSERT INTO users (username, password_hash, full_name, email, role) VALUES (?,?,?,?, 'STUDENT')`,
      [username, hash, b.full_name, b.email || null]);
    const [s] = await conn.query(
      `INSERT INTO students (student_code, user_id, full_name, date_of_birth, gender, class_id, email, phone, address, admission_year, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [b.student_code, u.insertId, b.full_name, b.date_of_birth, b.gender || 'OTHER', b.class_id, b.email || null, b.phone || null, b.address || null, b.admission_year, b.status || 'ACTIVE']);
    await conn.commit();
    res.status(201).json({ id: s.insertId, message: `Đã thêm sinh viên. Tài khoản: ${username}` });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Mã sinh viên hoặc tên đăng nhập đã tồn tại');
    if (e.code === 'ER_NO_REFERENCED_ROW_2') throw new HttpError(400, 'Lớp không tồn tại');
    throw e;
  } finally { conn.release(); }
}));

router.put('/:id', auth, requireRole('ADMIN'), wrap(async (req, res) => {
  const b = req.body || {}; validateStudent(b, false);
  const [r] = await pool.query(
    `UPDATE students SET full_name=?, date_of_birth=?, gender=?, class_id=?, email=?, phone=?, address=?, admission_year=?, status=? WHERE id=?`,
    [b.full_name, b.date_of_birth, b.gender || 'OTHER', b.class_id, b.email || null, b.phone || null, b.address || null, b.admission_year, b.status || 'ACTIVE', req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Không tìm thấy sinh viên');
  await pool.query('UPDATE users u JOIN students s ON s.user_id=u.id SET u.full_name=? WHERE s.id=?', [b.full_name, req.params.id]);
  res.json({ message: 'Đã cập nhật sinh viên' });
}));

router.delete('/:id', auth, requireRole('ADMIN'), wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT user_id FROM students WHERE id=?', [req.params.id]);
  if (!rows.length) throw new HttpError(404, 'Không tìm thấy sinh viên');
  try {
    // xóa user -> ON DELETE CASCADE xóa hồ sơ sinh viên; bị RESTRICT nếu đã có đăng ký/điểm
    await pool.query('DELETE FROM users WHERE id=?', [rows[0].user_id]);
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') throw new HttpError(409, 'Sinh viên đã có dữ liệu đăng ký/điểm, không thể xóa. Hãy đổi trạng thái thay vì xóa.');
    throw e;
  }
  res.json({ message: 'Đã xóa sinh viên' });
}));

module.exports = router;

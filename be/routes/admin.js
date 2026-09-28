const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { auth, requireRole, wrap } = require('../middleware/auth');
const { HttpError } = require('../utils/grade');

router.use(auth, requireRole('ADMIN'));

router.get('/users', wrap(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 15;
  const where = []; const params = [];
  if (req.query.q) { where.push('(username LIKE ? OR full_name LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  if (['ADMIN', 'TEACHER', 'STUDENT'].includes(req.query.role)) { where.push('role = ?'); params.push(req.query.role); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users ${w}`, params);
  const [rows] = await pool.query(`SELECT id, username, full_name, email, role, is_active, created_at FROM users ${w} ORDER BY id LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
}));

router.patch('/users/:id/active', wrap(async (req, res) => {
  if (Number(req.params.id) === req.user.id) throw new HttpError(400, 'Không thể khóa chính tài khoản của bạn');
  const active = req.body && req.body.is_active ? 1 : 0;
  const [r] = await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [active, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Không tìm thấy người dùng');
  res.json({ message: active ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản' });
}));

router.post('/users/:id/reset-password', wrap(async (req, res) => {
  const [u] = await pool.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
  if (!u.length) throw new HttpError(404, 'Không tìm thấy người dùng');
  const def = { ADMIN: 'admin123', TEACHER: 'teacher123', STUDENT: 'student123' }[u[0].role];
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(def, 10), req.params.id]);
  res.json({ message: `Đã đặt lại mật khẩu về mặc định (${def})` });
}));
module.exports = router;

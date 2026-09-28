const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { sign, auth, wrap } = require('../middleware/auth');
const { HttpError } = require('../utils/grade');

router.post('/login', wrap(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) throw new HttpError(400, 'Vui lòng nhập tên đăng nhập và mật khẩu');
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [String(username).trim()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password), u.password_hash))) throw new HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu');
  if (!u.is_active) throw new HttpError(403, 'Tài khoản đã bị khóa');
  res.json({ token: sign(u), user: { id: u.id, username: u.username, full_name: u.full_name, role: u.role } });
}));

router.get('/me', auth, wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT id, username, full_name, email, role FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length) throw new HttpError(401, 'Tài khoản không tồn tại');
  const user = rows[0];
  if (user.role === 'STUDENT') {
    const [s] = await pool.query('SELECT id, student_code FROM students WHERE user_id = ?', [user.id]);
    user.student_id = s[0] && s[0].id; user.student_code = s[0] && s[0].student_code;
  }
  res.json(user);
}));

router.post('/change-password', auth, wrap(async (req, res) => {
  const { old_password, new_password } = req.body || {};
  if (!new_password || String(new_password).length < 6) throw new HttpError(400, 'Mật khẩu mới phải từ 6 ký tự');
  const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!rows.length || !(await bcrypt.compare(String(old_password || ''), rows[0].password_hash))) throw new HttpError(400, 'Mật khẩu cũ không đúng');
  await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(String(new_password), 10), req.user.id]);
  res.json({ message: 'Đổi mật khẩu thành công' });
}));
module.exports = router;

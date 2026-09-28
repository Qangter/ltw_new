require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/grades')); // meta, offerings, grades, import
app.use('/api', (req, res) => res.status(404).json({ message: 'API không tồn tại' }));

// Frontend tĩnh
app.use(express.static(path.join(__dirname, '..', 'fe')));

// Xử lý lỗi tập trung
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'File quá lớn (tối đa 5MB)' });
  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ' });
});

const PORT = process.env.PORT || 3000;
pool.query('SELECT 1').then(() => {
  app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
}).catch((e) => { console.error('Không kết nối được MySQL:', e.message); process.exit(1); });

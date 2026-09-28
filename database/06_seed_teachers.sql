-- 06_seed_teachers.sql : 25 teachers
USE diem_thi;

INSERT INTO teachers (id, teacher_code, user_id, department_id, full_name, email, phone, academic_title) VALUES
(1, 'GV001', 2, 1, 'Võ Văn Long', 'vo.van.long1@dtu.edu.vn', '0999377424', 'ThS'),
(2, 'GV002', 3, 2, 'Phan Minh Khang', 'phan.minh.khang2@dtu.edu.vn', '0990871072', 'ThS'),
(3, 'GV003', 4, 3, 'Phạm Minh Linh', 'pham.minh.linh3@dtu.edu.vn', '0941237896', NULL),
(4, 'GV004', 5, 4, 'Bùi Hữu Tuấn', 'bui.huu.tuan4@dtu.edu.vn', '0943617927', 'ThS'),
(5, 'GV005', 6, 5, 'Hoàng Xuân Dũng', 'hoang.xuan.dung5@dtu.edu.vn', '0965499779', NULL),
(6, 'GV006', 7, 6, 'Huỳnh Anh Ngọc', 'huynh.anh.ngoc6@dtu.edu.vn', '0913487179', 'ThS'),
(7, 'GV007', 8, 7, 'Vũ Thanh Cường', 'vu.thanh.cuong7@dtu.edu.vn', '0951397116', 'ThS'),
(8, 'GV008', 9, 8, 'Trần Văn Sơn', 'tran.van.son8@dtu.edu.vn', '0960657680', 'TS'),
(9, 'GV009', 10, 9, 'Võ Minh Hương', 'vo.minh.huong9@dtu.edu.vn', '0977882987', NULL),
(10, 'GV010', 11, 10, 'Trần Tuấn Bảo', 'tran.tuan.bao10@dtu.edu.vn', '0963083655', NULL),
(11, 'GV011', 12, 1, 'Bùi Công Tuấn', 'bui.cong.tuan11@dtu.edu.vn', '0990143862', 'TS'),
(12, 'GV012', 13, 2, 'Đỗ Gia Loan', 'do.gia.loan12@dtu.edu.vn', '0960849197', 'PGS.TS'),
(13, 'GV013', 14, 3, 'Lý Hoàng Khang', 'ly.hoang.khang13@dtu.edu.vn', '0951211500', NULL),
(14, 'GV014', 15, 4, 'Đặng Hữu Bảo', 'dang.huu.bao14@dtu.edu.vn', '0935686752', 'ThS'),
(15, 'GV015', 16, 5, 'Đỗ Ngọc Tâm', 'do.ngoc.tam15@dtu.edu.vn', '0934192235', NULL),
(16, 'GV016', 17, 6, 'Đặng Hoàng Hùng', 'dang.hoang.hung16@dtu.edu.vn', '0983786992', 'TS'),
(17, 'GV017', 18, 7, 'Vũ Văn Đạt', 'vu.van.dat17@dtu.edu.vn', '0965012091', 'ThS'),
(18, 'GV018', 19, 8, 'Võ Hồng Chi', 'vo.hong.chi18@dtu.edu.vn', '0961567844', 'ThS'),
(19, 'GV019', 20, 9, 'Trần Hoàng Cường', 'tran.hoang.cuong19@dtu.edu.vn', '0951889404', NULL),
(20, 'GV020', 21, 10, 'Bùi Hoàng Trung', 'bui.hoang.trung20@dtu.edu.vn', '0919302305', NULL),
(21, 'GV021', 22, 1, 'Phạm Bảo Nga', 'pham.bao.nga21@dtu.edu.vn', '0998660286', 'TS'),
(22, 'GV022', 23, 2, 'Phạm Công Cường', 'pham.cong.cuong22@dtu.edu.vn', '0940410874', NULL),
(23, 'GV023', 24, 3, 'Dương Văn Việt', 'duong.van.viet23@dtu.edu.vn', '0947063032', 'ThS'),
(24, 'GV024', 25, 4, 'Vũ Thu Yến', 'vu.thu.yen24@dtu.edu.vn', '0942522853', 'TS'),
(25, 'GV025', 26, 5, 'Đặng Anh Thắng', 'dang.anh.thang25@dtu.edu.vn', '0978618678', NULL);


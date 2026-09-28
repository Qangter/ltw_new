-- 03_seed_base.sql : departments, majors
USE diem_thi;

INSERT INTO departments (id, department_code, department_name, description) VALUES
(1, 'CNTT', 'Công nghệ thông tin', 'Đào tạo về khoa học máy tính và phần mềm'),
(2, 'DTVT', 'Điện tử Viễn thông', 'Đào tạo kỹ sư điện tử, viễn thông'),
(3, 'KTPM', 'Kỹ thuật phần mềm', 'Đào tạo chuyên sâu về quy trình phát triển phần mềm'),
(4, 'ATTT', 'An toàn thông tin', 'Đào tạo chuyên gia bảo mật, an toàn hệ thống'),
(5, 'QTKD', 'Quản trị kinh doanh', 'Đào tạo về quản trị, kinh doanh'),
(6, 'TCNH', 'Tài chính Ngân hàng', 'Đào tạo về tài chính, ngân hàng, đầu tư'),
(7, 'KTOAN', 'Kế toán', 'Đào tạo về kế toán, kiểm toán'),
(8, 'NNA', 'Ngoại ngữ', 'Đào tạo tiếng Anh và các ngoại ngữ khác'),
(9, 'MMT', 'Mạng máy tính', 'Đào tạo về hạ tầng mạng và truyền thông dữ liệu'),
(10, 'KTE', 'Kinh tế', 'Đào tạo về kinh tế học ứng dụng');

INSERT INTO majors (id, department_id, major_code, major_name, description) VALUES
(1, 1, 'CNTT01', 'Công nghệ thông tin', 'Ngành Công nghệ thông tin thuộc khoa Công nghệ thông tin'),
(2, 1, 'CNTT02', 'Khoa học máy tính', 'Ngành Khoa học máy tính thuộc khoa Công nghệ thông tin'),
(3, 1, 'CNTT03', 'Hệ thống thông tin', 'Ngành Hệ thống thông tin thuộc khoa Công nghệ thông tin'),
(4, 3, 'KTPM01', 'Kỹ thuật phần mềm', 'Ngành Kỹ thuật phần mềm thuộc khoa Kỹ thuật phần mềm'),
(5, 3, 'KTPM02', 'Phát triển ứng dụng di động', 'Ngành Phát triển ứng dụng di động thuộc khoa Kỹ thuật phần mềm'),
(6, 4, 'ATTT01', 'An toàn thông tin', 'Ngành An toàn thông tin thuộc khoa An toàn thông tin'),
(7, 9, 'MMT01', 'Mạng máy tính và truyền thông', 'Ngành Mạng máy tính và truyền thông thuộc khoa Mạng máy tính'),
(8, 2, 'DTVT01', 'Điện tử viễn thông', 'Ngành Điện tử viễn thông thuộc khoa Điện tử Viễn thông'),
(9, 2, 'DTVT02', 'Kỹ thuật máy tính', 'Ngành Kỹ thuật máy tính thuộc khoa Điện tử Viễn thông'),
(10, 1, 'TMDPT', 'Truyền thông đa phương tiện', 'Ngành Truyền thông đa phương tiện thuộc khoa Công nghệ thông tin'),
(11, 5, 'QTKD01', 'Quản trị kinh doanh', 'Ngành Quản trị kinh doanh thuộc khoa Quản trị kinh doanh'),
(12, 5, 'QTKD02', 'Marketing', 'Ngành Marketing thuộc khoa Quản trị kinh doanh'),
(13, 5, 'QTKD03', 'Thương mại điện tử', 'Ngành Thương mại điện tử thuộc khoa Quản trị kinh doanh'),
(14, 6, 'TCNH01', 'Tài chính ngân hàng', 'Ngành Tài chính ngân hàng thuộc khoa Tài chính Ngân hàng'),
(15, 6, 'TCNH02', 'Đầu tư tài chính', 'Ngành Đầu tư tài chính thuộc khoa Tài chính Ngân hàng'),
(16, 7, 'KTOAN01', 'Kế toán doanh nghiệp', 'Ngành Kế toán doanh nghiệp thuộc khoa Kế toán'),
(17, 7, 'KTOAN02', 'Kiểm toán', 'Ngành Kiểm toán thuộc khoa Kế toán'),
(18, 8, 'NNA01', 'Ngôn ngữ Anh', 'Ngành Ngôn ngữ Anh thuộc khoa Ngoại ngữ'),
(19, 10, 'KTE01', 'Kinh tế đối ngoại', 'Ngành Kinh tế đối ngoại thuộc khoa Kinh tế'),
(20, 10, 'KTE02', 'Kinh tế đầu tư', 'Ngành Kinh tế đầu tư thuộc khoa Kinh tế');


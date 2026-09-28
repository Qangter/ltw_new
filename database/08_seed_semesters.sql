-- 08_seed_semesters.sql : 6 học kỳ
USE diem_thi;

INSERT INTO semesters (id, semester_code, semester_name, academic_year, start_date, end_date, status) VALUES
(1, 'HK1_2023_2024', 'Học kỳ 1 năm học 2023-2024', '2023-2024', '2023-09-04', '2024-01-14', 'COMPLETED'),
(2, 'HK2_2023_2024', 'Học kỳ 2 năm học 2023-2024', '2023-2024', '2024-02-05', '2024-06-16', 'COMPLETED'),
(3, 'HK1_2024_2025', 'Học kỳ 1 năm học 2024-2025', '2024-2025', '2024-09-02', '2025-01-12', 'COMPLETED'),
(4, 'HK2_2024_2025', 'Học kỳ 2 năm học 2024-2025', '2024-2025', '2025-02-03', '2025-06-15', 'COMPLETED'),
(5, 'HK1_2025_2026', 'Học kỳ 1 năm học 2025-2026', '2025-2026', '2025-09-01', '2026-01-11', 'ACTIVE'),
(6, 'HK2_2025_2026', 'Học kỳ 2 năm học 2025-2026', '2025-2026', '2026-02-02', '2026-06-14', 'UPCOMING');


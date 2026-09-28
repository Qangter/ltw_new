-- =====================================================================
-- 01_create_database.sql
-- Website Tra cứu Kết quả Thi Trực tuyến - Tạo database
-- Target: MySQL 8.x   (also verified to run on MariaDB 10.11 for testing)
-- =====================================================================

DROP DATABASE IF EXISTS diem_thi;

CREATE DATABASE diem_thi
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE diem_thi;

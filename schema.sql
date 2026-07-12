-- AuthSys Database Schema
-- Run this once to create the database and users table

CREATE DATABASE IF NOT EXISTS authsys_db;
USE authsys_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT NULL
);

-- Index for faster login lookups (username or email)
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_email ON users(email);

-- Initialize database for EnCenter (EnVault) backend.
-- Runs only on first container creation (when ./evolution/postgres is empty).
--
-- The default container starts with POSTGRES_USER=evolution and creates a
-- database named "evolution". This script provisions a separate role and
-- database used by the Laravel backend.

CREATE USER envault WITH PASSWORD 'envault';
CREATE DATABASE envault OWNER envault;
GRANT ALL PRIVILEGES ON DATABASE envault TO envault;

-- PostgreSQL Role Setup for Lawyer Management System
-- Executed on fresh database initialization in /docker-entrypoint-initdb.d/

-- 1. Create lms_migrator (Privileged migration & schema owner role)
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lms_migrator') THEN
      CREATE ROLE lms_migrator WITH LOGIN PASSWORD 'lms_migrator_password' CREATEDB;
   END IF;
END
$do$;

-- 2. Create lms_app (Restricted application runtime role)
-- Non-superuser, strictly NOBYPASSRLS
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'lms_app') THEN
      CREATE ROLE lms_app WITH LOGIN PASSWORD 'lms_app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
   END IF;
END
$do$;

-- 3. Grant schema permissions to lms_migrator
GRANT ALL PRIVILEGES ON DATABASE lms_dev TO lms_migrator;
GRANT ALL ON SCHEMA public TO lms_migrator;

-- 4. Grant schema usage and connect to lms_app
GRANT CONNECT ON DATABASE lms_dev TO lms_app;
GRANT USAGE ON SCHEMA public TO lms_app;

-- 5. Set default permissions for tables created by lms_migrator
ALTER DEFAULT PRIVILEGES FOR ROLE lms_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lms_app;
ALTER DEFAULT PRIVILEGES FOR ROLE lms_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lms_app;
ALTER DEFAULT PRIVILEGES FOR ROLE lms_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lms_app;
ALTER DEFAULT PRIVILEGES FOR ROLE lms_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO lms_app;

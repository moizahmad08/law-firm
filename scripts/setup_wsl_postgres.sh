#!/bin/sh
set -e

echo "=== Initializing PostgreSQL 16 Cluster ==="
mkdir -p /var/lib/postgresql/data /run/postgresql
chown -R postgres:postgres /var/lib/postgresql /run/postgresql

if [ ! -f /var/lib/postgresql/data/PG_VERSION ]; then
  su - postgres -c "initdb -D /var/lib/postgresql/data -E UTF8 --locale=C"
  
  echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf
  echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
  echo "host all all ::0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
  echo "local all all trust" >> /var/lib/postgresql/data/pg_hba.conf
fi

echo "=== Starting PostgreSQL Server ==="
su - postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/data/logfile start" || true

sleep 2

echo "=== Creating Roles & Database ==="
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname = 'lms_owner'\" | grep -q 1 || psql -c \"CREATE ROLE lms_owner WITH SUPERUSER LOGIN PASSWORD 'lms_dev_password';\""
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = 'lms_dev'\" | grep -q 1 || psql -c \"CREATE DATABASE lms_dev OWNER lms_owner;\""

# Run init-roles.sql
su - postgres -c "psql -d lms_dev -f \"/mnt/host/c/Users/HP/Documents/Law Firm managemnet/docker/init-roles.sql\"" || true

echo "=== PostgreSQL 16 Started & Configured Successfully on Port 5432 ==="

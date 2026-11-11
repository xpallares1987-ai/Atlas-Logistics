#!/bin/bash

# Database Migration Script: Add Indexes
# Run this to add all performance indexes to your database
# 
# Usage: pnpm db:generate && pnpm db:migrate
#
# Or manually:
# sqlite3 data/dev.db < add-indexes.sql

# NOTE: These SQL statements are auto-generated from Drizzle ORM schema
# Location: src/db/schema/indexed-schema.ts

# ============================================================================
# USERS TABLE INDEXES
# ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);

# ============================================================================
# SHIPMENTS TABLE INDEXES
# ============================================================================
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_unique ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_company_id ON shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at);
CREATE INDEX IF NOT EXISTS idx_shipments_company_status ON shipments(company_id, status);
CREATE INDEX IF NOT EXISTS idx_shipments_company_created ON shipments(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_shipments_status_created ON shipments(status, created_at);

# ============================================================================
# ADDRESSES TABLE INDEXES
# ============================================================================
CREATE INDEX IF NOT EXISTS idx_addresses_company_id ON addresses(company_id);
CREATE INDEX IF NOT EXISTS idx_addresses_country ON addresses(country);
CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_tax_id ON addresses(tax_id);
CREATE INDEX IF NOT EXISTS idx_addresses_unlocode ON addresses(un_locode);
CREATE INDEX IF NOT EXISTS idx_addresses_lat_lon ON addresses(lat, lon);
CREATE INDEX IF NOT EXISTS idx_addresses_company_country ON addresses(company_id, country);
CREATE INDEX IF NOT EXISTS idx_addresses_company_city ON addresses(company_id, city);

# ============================================================================
# COMPANIES TABLE INDEXES
# ============================================================================
CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON companies(tax_id);

# ============================================================================
# CONTACTS TABLE INDEXES
# ============================================================================
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

# ============================================================================
# AUDIT_LOGS TABLE INDEXES
# ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_table_user ON audit_logs(table_name, user_id);

# ============================================================================
# SESSIONS TABLE INDEXES
# ============================================================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

# ============================================================================
# ANALYZE DATABASE STATISTICS
# ============================================================================
# This should be run after creating indexes to update query optimizer statistics
# SQLite uses these stats to decide whether to use indexes
ANALYZE;

# ============================================================================
# VERIFY INDEXES
# ============================================================================
# Run these queries to verify indexes exist and are being used:
# 
# SELECT * FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';
# EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com';
# EXPLAIN QUERY PLAN SELECT * FROM shipments WHERE company_id = 'c-1' AND status = 'PENDING';

-- Runs once when the Postgres data volume is first created.
-- The main database (payment_analytics) is created via POSTGRES_DB.
-- We only need the test database alongside it.
CREATE DATABASE payment_analytics_test;

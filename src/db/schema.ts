import { Client } from "pg";
import { pool } from "../config/db";
import { env } from "../config/env";

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_key UNIQUE (email)
);
`;

const STUDENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS students (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT students_email_key UNIQUE (email),
  CONSTRAINT students_name_not_blank CHECK (btrim(name) <> '')
);
`;

/**
 * One row is one student's score for one subject.
 * UNIQUE (student_id, subject) rejects duplicates.
 * ON DELETE CASCADE removes marks when the student is deleted, so no orphan rows remain.
 */
const MARKS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS marks (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  subject VARCHAR(100) NOT NULL,
  marks DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT marks_student_subject_key UNIQUE (student_id, subject),
  CONSTRAINT marks_subject_not_blank CHECK (btrim(subject) <> ''),
  CONSTRAINT marks_value_range CHECK (marks >= 0 AND marks <= 100)
);
`;

/**
 * Creates the application database if it is missing, then creates the tables.
 */
export const ensureSchema = async (): Promise<void> => {
  if (!env.DB_PASSWORD) {
    throw new Error(
      "DB_PASSWORD is empty. This Postgres server rejects passwordless login. Set DB_PASSWORD in .env and start again.",
    );
  }

  if (!IDENTIFIER.test(env.DB_NAME)) {
    throw new Error(`Invalid DB_NAME "${env.DB_NAME}"`);
  }

  const admin = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: "postgres",
  });

  await admin.connect();
  try {
    const existing = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [env.DB_NAME],
    );
    if (existing.rowCount === 0) {
      await admin.query(`CREATE DATABASE ${env.DB_NAME}`);
    }
  } finally {
    await admin.end();
  }

  await pool.query(USERS_TABLE_SQL);
  await pool.query(STUDENTS_TABLE_SQL);
  await pool.query(MARKS_TABLE_SQL);
};

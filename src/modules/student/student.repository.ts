import { query } from "../../config/db";
import type { Student, StudentDraft } from "./student.interface";

interface StudentRow {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

const COLUMNS = "id, name, email, created_at";

const toStudent = (row: StudentRow): Student => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: new Date(row.created_at),
});

export const findAll = async (): Promise<Student[]> => {
  const result = await query<StudentRow>(
    `SELECT ${COLUMNS} FROM students ORDER BY id`,
  );
  return result.rows.map(toStudent);
};

export const findById = async (id: number): Promise<Student | null> => {
  const result = await query<StudentRow>(
    `SELECT ${COLUMNS} FROM students WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? toStudent(row) : null;
};

export const findByEmail = async (email: string): Promise<Student | null> => {
  const result = await query<StudentRow>(
    `SELECT ${COLUMNS} FROM students WHERE email = $1`,
    [email],
  );
  const row = result.rows[0];
  return row ? toStudent(row) : null;
};

export const create = async (draft: StudentDraft): Promise<Student> => {
  const result = await query<StudentRow>(
    `INSERT INTO students (name, email)
     VALUES ($1, $2)
     RETURNING ${COLUMNS}`,
    [draft.name, draft.email],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Insert did not return a student");
  return toStudent(row);
};

export const update = async (
  id: number,
  draft: StudentDraft,
): Promise<Student | null> => {
  const result = await query<StudentRow>(
    `UPDATE students
     SET name = $1, email = $2
     WHERE id = $3
     RETURNING ${COLUMNS}`,
    [draft.name, draft.email, id],
  );
  const row = result.rows[0];
  return row ? toStudent(row) : null;
};

/** Marks are removed by the students -> marks ON DELETE CASCADE foreign key. */
export const deleteById = async (id: number): Promise<number> => {
  const result = await query("DELETE FROM students WHERE id = $1", [id]);
  return result.rowCount ?? 0;
};

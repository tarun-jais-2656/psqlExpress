import { query } from "../../config/db";
import type {
  Mark,
  MarkDraft,
  MarkListFilter,
  SubjectMarkValue,
} from "./mark.interface";

interface MarkRow {
  id: number;
  student_id: number;
  subject: string;
  marks: number | string;
  created_at: Date;
}

const COLUMNS = "id, student_id, subject, marks, created_at";

const toMark = (row: MarkRow): Mark => ({
  id: row.id,
  studentId: row.student_id,
  subject: row.subject,
  marks: Number(row.marks),
  createdAt: new Date(row.created_at),
});

export const findAll = async (filter: MarkListFilter = {}): Promise<Mark[]> => {
  const result = await query<MarkRow>(
    `SELECT ${COLUMNS}
     FROM marks
     WHERE ($1::integer IS NULL OR student_id = $1)
       AND ($2::text IS NULL OR subject = $2)
     ORDER BY id`,
    [filter.studentId ?? null, filter.subject ?? null],
  );
  return result.rows.map(toMark);
};

export const findById = async (id: number): Promise<Mark | null> => {
  const result = await query<MarkRow>(
    `SELECT ${COLUMNS} FROM marks WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? toMark(row) : null;
};

export const findByStudentId = async (studentId: number): Promise<Mark[]> =>
  findAll({ studentId });

export const findByStudentAndSubject = async (
  studentId: number,
  subject: string,
): Promise<Mark | null> => {
  const result = await query<MarkRow>(
    `SELECT ${COLUMNS} FROM marks WHERE student_id = $1 AND subject = $2`,
    [studentId, subject],
  );
  const row = result.rows[0];
  return row ? toMark(row) : null;
};

export const create = async (draft: MarkDraft): Promise<Mark> => {
  const result = await query<MarkRow>(
    `INSERT INTO marks (student_id, subject, marks)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [draft.studentId, draft.subject, draft.marks],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Insert did not return a mark");
  return toMark(row);
};

export const update = async (
  id: number,
  draft: MarkDraft,
): Promise<Mark | null> => {
  const result = await query<MarkRow>(
    `UPDATE marks
     SET student_id = $1, subject = $2, marks = $3
     WHERE id = $4
     RETURNING ${COLUMNS}`,
    [draft.studentId, draft.subject, draft.marks, id],
  );
  const row = result.rows[0];
  return row ? toMark(row) : null;
};

export const deleteById = async (id: number): Promise<number> => {
  const result = await query("DELETE FROM marks WHERE id = $1", [id]);
  return result.rowCount ?? 0;
};

/** Recorded scores only. Subjects with no rows are not returned. */
export const listMarkValues = async (): Promise<SubjectMarkValue[]> => {
  const result = await query<{ subject: string; marks: number | string }>(
    "SELECT subject, marks FROM marks",
  );
  return result.rows.map((row) => ({
    subject: row.subject,
    marks: Number(row.marks),
  }));
};

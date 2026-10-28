import { query } from '../../config/db';
import type { User } from './user.interface';

interface UserRow {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

export interface UserDraft {
  name: string;
  email: string;
}

const COLUMNS = 'id, name, email, created_at';

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: new Date(row.created_at),
});

export const findAll = async (): Promise<User[]> => {
  const result = await query<UserRow>(`SELECT ${COLUMNS} FROM users ORDER BY id`);
  return result.rows.map(toUser);
};

export const findById = async (id: number): Promise<User | null> => {
  const result = await query<UserRow>(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? toUser(row) : null;
};

export const create = async (draft: UserDraft): Promise<User> => {
  const result = await query<UserRow>(
    `INSERT INTO users (name, email)
     VALUES ($1, $2)
     RETURNING ${COLUMNS}`,
    [draft.name, draft.email],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Insert did not return a user');
  return toUser(row);
};

export const update = async (id: number, draft: UserDraft): Promise<User | null> => {
  const result = await query<UserRow>(
    `UPDATE users
     SET name = $1, email = $2
     WHERE id = $3
     RETURNING ${COLUMNS}`,
    [draft.name, draft.email, id],
  );
  const row = result.rows[0];
  return row ? toUser(row) : null;
};

export const deleteById = async (id: number): Promise<number> => {
  const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return result.rowCount ?? 0;
};

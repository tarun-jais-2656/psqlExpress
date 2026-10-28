# Student and marks API

Express + TypeScript API for students, subject marks, and subject-wise averages. It keeps the existing user module, middleware order, Zod validation, and Postgres access.

## Setup

```bash
cp .env.example .env
# Set DB_PASSWORD. Postgres must be running.
npm install
npm run dev
```

The server listens on `PORT` (default `3000`) and creates the database named by `DB_NAME` if it does not exist, then creates the `users`, `students`, and `marks` tables.

| Variable      | Default       | Purpose                                          |
| ------------- | ------------- | ------------------------------------------------ |
| `PORT`        | `3000`        | HTTP port                                        |
| `DB_HOST`     | `localhost`   | Postgres host                                    |
| `DB_PORT`     | `5432`        | Postgres port                                    |
| `DB_USER`     | `user`        | Postgres user                                    |
| `DB_PASSWORD` | empty         | Required. This server rejects passwordless login |
| `DB_NAME`     | `express_app` | Application database                             |

## Scripts

| Script                        | What it does                                              |
| ----------------------------- | --------------------------------------------------------- |
| `npm run dev`                 | Start with `tsx` watch                                    |
| `npm run build` / `npm start` | Compile to `dist` and run                                 |
| `npm run typecheck`           | `tsc --noEmit`                                            |
| `npm run lint`                | Same TypeScript check. This project has no ESLint config  |
| `npm test`                    | API tests against a separate database, `express_app_test` |

## Response shape

Successful responses use the same envelope as the user module:

```json
{ "data": {} }
```

Lists use `{ "data": [] }`. Deletes return `204` with an empty body.

Expected errors use `AppError` and the central error handler:

```json
{ "error": { "message": "Student 4 not found" } }
```

Invalid bodies, ids, or query strings return `400`:

```json
{ "error": { "message": "Validation failed", "details": {} } }
```

Duplicate emails and duplicate student/subject marks return `409`.

## Students

Identifiers are integers, generated the same way as user ids.

### Create

`POST /api/students`

```bash
curl -s -X POST http://localhost:3000/api/students \
  -H 'content-type: application/json' \
  -d '{"name":"Asha Sharma","email":"asha@example.com"}'
```

`201`

```json
{
  "data": {
    "id": 1,
    "name": "Asha Sharma",
    "email": "asha@example.com",
    "createdAt": "2026-10-21T05:15:00.000Z"
  }
}
```

`name` is required, trimmed, and non-empty (max 100). `email` is required, trimmed, lowercased, and must be a valid email. A duplicate email returns `409`.

### List

`GET /api/students` returns `200` and every student, ordered by id. The user module does not paginate, so this list does not either.

### Read

`GET /api/students/:studentId` returns `200` or `404`. A non-numeric id returns `400`.

### Update

`PUT /api/students/:studentId` replaces `name` and `email`. Both fields are required. `200` returns the updated student. `404` if the student does not exist. `409` if the email belongs to someone else. Sending the student's current email is allowed.

```bash
curl -s -X PUT http://localhost:3000/api/students/1 \
  -H 'content-type: application/json' \
  -d '{"name":"Asha S.","email":"asha@example.com"}'
```

### Delete

`DELETE /api/students/:studentId` returns `204`, or `404` if the student does not exist.

Deleting a student also deletes that student's marks. The `marks.student_id` foreign key uses `ON DELETE CASCADE`, so a student delete cannot leave orphaned mark rows.

### Marks for one student

`GET /api/students/:studentId/marks` returns `200` and that student's marks (an empty list when the student exists but has none). `404` if the student does not exist.

## Marks

One row is one student's score for one subject. A student can have many subjects, but only one row per subject. That rule is enforced in the mark service and by `UNIQUE (student_id, subject)`. Subject matching is case-sensitive after trimming.

`marks` is a number from 0 through 100, inclusive. `studentId` in the JSON body is a number.

### Create

`POST /api/marks`

```bash
curl -s -X POST http://localhost:3000/api/marks \
  -H 'content-type: application/json' \
  -d '{"studentId":1,"subject":"Mathematics","marks":88}'
```

`201`

```json
{
  "data": {
    "id": 1,
    "studentId": 1,
    "subject": "Mathematics",
    "marks": 88,
    "createdAt": "2026-10-21T05:16:00.000Z"
  }
}
```

`404` if the student does not exist. `409` if that student already has this subject. `400` if `subject` is blank or `marks` is outside 0–100.

### List

`GET /api/marks` returns `200` and the marks, ordered by id.

Optional exact-match filters:

- `studentId` — positive integer
- `subject` — non-empty string

`GET /api/marks?studentId=1&subject=Mathematics`

An unknown `studentId` filter returns an empty list. A malformed `studentId` returns `400`.

### Read

`GET /api/marks/:markId` returns `200` or `404`.

### Update

`PUT /api/marks/:markId` follows the user module's update rule: send at least one of `studentId`, `subject`, or `marks`. Omitted fields stay as they are. Every supplied field is validated. The student must exist, and the resulting student/subject pair must stay unique.

`200` returns the updated mark. `404` if the mark or the new student does not exist. `409` if the pair already belongs to another mark. `400` if the body is empty or invalid.

```bash
curl -s -X PUT http://localhost:3000/api/marks/1 \
  -H 'content-type: application/json' \
  -d '{"marks":91}'
```

### Delete

`DELETE /api/marks/:markId` returns `204`, or `404` if the mark does not exist.

## Subject averages

`GET /api/marks/averages/subjects`

One item per subject that has at least one mark:

| Field          | Meaning                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `subject`      | Subject name, as stored                                                  |
| `averageMarks` | Arithmetic mean of recorded marks, rounded half up to two decimal places |
| `totalRecords` | How many mark rows were included                                         |

Missing marks are not counted as zero. Subjects with no rows are omitted. If there are no marks, `data` is `[]`. Results are sorted by subject name.

Example rows:

- Mathematics: 80, 90, 70
- Science: 75, 85
- English: 60

```json
{
  "data": [
    { "subject": "English", "averageMarks": 60, "totalRecords": 1 },
    { "subject": "Mathematics", "averageMarks": 80, "totalRecords": 3 },
    { "subject": "Science", "averageMarks": 80, "totalRecords": 2 }
  ]
}
```

JSON numbers do not keep trailing zeros, so an average of 80.00 is returned as `80`. A value such as 20.333... is returned as `20.33`.

## Existing routes

| Method                        | Path                    | Notes                                                |
| ----------------------------- | ----------------------- | ---------------------------------------------------- |
| `GET`                         | `/api/health`           | `{ "status": "ok" }`                                 |
| `GET` `POST` `PATCH` `DELETE` | `/api/users`            | Same user API. SQL now lives in `user.repository.ts` |
| `GET`                         | `/api/demo/async-error` | Rejects on purpose so the error handler can be seen  |

## Design decisions

- Every SQL statement lives in a repository (`user`, `student`, and `mark`). Controllers and services do not import the database client. The user HTTP API is unchanged: partial `PATCH`, the same validation, and the same `{ data }` responses.
- Startup still creates tables from `src/db/schema.ts`. Student ids are integer identity columns, matching users.
- Student `PUT` replaces name and email because both fields are required by the assignment. Mark `PUT` is partial, matching the user module, and still checks the student and the unique subject pair.
- Student deletion uses `ON DELETE CASCADE` on `marks.student_id`.
- Averages are calculated in the mark service from recorded rows only, then rounded with `Math.round(value * 100) / 100`. Marks are non-negative, so this is half-up rounding to two decimal places.
- Express 5 already forwards rejected async handlers to `errorHandler`, so controllers do not catch errors themselves.
- Lists are not paginated, because the user module is not paginated. Mark lists accept optional `studentId` and `subject` query filters.

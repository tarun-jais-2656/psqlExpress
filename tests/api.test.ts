/**
 * npm test sets DB_NAME=express_app_test before startup so .env cannot point these
 * tests at the development database. The HTTP test refuses to truncate anything else.
 */
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, describe, test } from "node:test";
import app from "../src/app";
import { pool } from "../src/config/db";
import { env } from "../src/config/env";
import { ensureSchema } from "../src/db/schema";
import { calculateSubjectAverages } from "../src/modules/mark/mark.service";

type ApiResult<T> = { status: number; body: T };

describe("student and mark API", { concurrency: 1 }, () => {
  test("subject averages use recorded marks only and round to two decimals", async () => {
    assert.deepEqual(calculateSubjectAverages([]), []);

    assert.deepEqual(
      calculateSubjectAverages([
        { subject: "Mathematics", marks: 80 },
        { subject: "Science", marks: 75 },
        { subject: "Mathematics", marks: 90 },
        { subject: "English", marks: 60 },
        { subject: "Science", marks: 85 },
        { subject: "Mathematics", marks: 70 },
      ]),
      [
        { subject: "English", averageMarks: 60, totalRecords: 1 },
        { subject: "Mathematics", averageMarks: 80, totalRecords: 3 },
        { subject: "Science", averageMarks: 80, totalRecords: 2 },
      ],
    );

    assert.deepEqual(
      calculateSubjectAverages([
        { subject: "History", marks: 10 },
        { subject: "History", marks: 20 },
        { subject: "History", marks: 31 },
      ]),
      [{ subject: "History", averageMarks: 20.33, totalRecords: 3 }],
    );
  });

  test("student CRUD, marks CRUD, and averages", async () => {
    if (env.DB_NAME !== "express_app_test") {
      throw new Error(
        "Refusing to run: set DB_NAME=express_app_test (npm test does this).",
      );
    }

    await ensureSchema();
    await pool.query("TRUNCATE TABLE students, users RESTART IDENTITY CASCADE");

    const server: Server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    const request = async <T = { data?: any; error?: { message: string } }>(
      path: string,
      init?: { method?: string; body?: unknown },
    ): Promise<ApiResult<T>> => {
      const response = await fetch(`${base}${path}`, {
        method: init?.method ?? "GET",
        headers:
          init?.body === undefined
            ? undefined
            : { "content-type": "application/json" },
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      });
      const text = await response.text();
      return {
        status: response.status,
        body: text ? (JSON.parse(text) as T) : (undefined as T),
      };
    };

    try {
      const health = await request<{ status: string }>("/api/health");
      assert.equal(health.status, 200);
      assert.equal(health.body.status, "ok");

      const missingRoute = await request("/api/does-not-exist");
      assert.equal(missingRoute.status, 404);
      assert.match(missingRoute.body.error?.message ?? "", /not found/);

      const asyncFailure = await request("/api/demo/async-error");
      assert.equal(asyncFailure.status, 500);
      assert.match(asyncFailure.body.error?.message ?? "", /Boom/);

      const user = await request("/api/users", {
        method: "POST",
        body: { name: "Ada Lovelace", email: "ada@example.com" },
      });
      assert.equal(user.status, 201);
      const userId = user.body.data.id as number;
      assert.equal((await request(`/api/users/${userId}`)).status, 200);
      const renamedUser = await request(`/api/users/${userId}`, {
        method: "PATCH",
        body: { name: "Ada L." },
      });
      assert.equal(renamedUser.status, 200);
      assert.equal(renamedUser.body.data.name, "Ada L.");
      assert.equal(renamedUser.body.data.email, "ada@example.com");
      assert.equal(
        (await request(`/api/users/${userId}`, { method: "DELETE" })).status,
        204,
      );
      assert.equal((await request(`/api/users/${userId}`)).status, 404);

      const emptyAverages = await request<{ data: unknown[] }>(
        "/api/marks/averages/subjects",
      );
      assert.equal(emptyAverages.status, 200);
      assert.deepEqual(emptyAverages.body.data, []);

      assert.equal(
        (
          await request("/api/students", {
            method: "POST",
            body: { name: "Asha", email: "not-an-email" },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/api/students", {
            method: "POST",
            body: { email: "asha@example.com" },
          })
        ).status,
        400,
      );
      assert.equal((await request("/api/students/abc")).status, 400);
      assert.equal((await request("/api/students/999999")).status, 404);

      assert.equal(
        (
          await request("/api/marks", {
            method: "POST",
            body: { studentId: 1, subject: "Mathematics", marks: 88 },
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await request("/api/marks", {
            method: "POST",
            body: { studentId: "1", subject: "Mathematics", marks: 88 },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/api/marks", {
            method: "POST",
            body: { studentId: 1, subject: "   ", marks: 88 },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/api/marks", {
            method: "POST",
            body: { studentId: 1, subject: "Math", marks: 101 },
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request("/api/marks", {
            method: "POST",
            body: { studentId: 1, subject: "Math", marks: -1 },
          })
        ).status,
        400,
      );

      const asha = await request("/api/students", {
        method: "POST",
        body: { name: "  Asha Sharma  ", email: "Asha@Example.com" },
      });
      assert.equal(asha.status, 201);
      assert.equal(asha.body.data.name, "Asha Sharma");
      assert.equal(asha.body.data.email, "asha@example.com");
      assert.match(asha.body.data.createdAt, /^\d{4}-\d{2}-\d{2}T/);

      const duplicateEmail = await request("/api/students", {
        method: "POST",
        body: { name: "Other Asha", email: "asha@example.com" },
      });
      assert.equal(duplicateEmail.status, 409);

      const rohan = await request("/api/students", {
        method: "POST",
        body: { name: "Rohan Mehta", email: "rohan@example.com" },
      });
      const meera = await request("/api/students", {
        method: "POST",
        body: { name: "Meera Iyer", email: "meera@example.com" },
      });
      assert.equal(rohan.status, 201);
      assert.equal(meera.status, 201);

      const students = await request<{
        data: Array<{ id: number; email: string }>;
      }>("/api/students");
      assert.equal(students.status, 200);
      assert.deepEqual(
        students.body.data.map((student) => student.email),
        ["asha@example.com", "rohan@example.com", "meera@example.com"],
      );

      const partialUpdate = await request(
        `/api/students/${asha.body.data.id}`,
        {
          method: "PUT",
          body: { name: "Asha S." },
        },
      );
      assert.equal(partialUpdate.status, 400);

      const missingUpdate = await request("/api/students/999999", {
        method: "PUT",
        body: { name: "Nobody", email: "nobody@example.com" },
      });
      assert.equal(missingUpdate.status, 404);

      const renamed = await request(`/api/students/${asha.body.data.id}`, {
        method: "PUT",
        body: { name: "Asha S.", email: "asha@example.com" },
      });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.data.name, "Asha S.");

      const emailTaken = await request(`/api/students/${asha.body.data.id}`, {
        method: "PUT",
        body: { name: "Asha S.", email: "rohan@example.com" },
      });
      assert.equal(emailTaken.status, 409);

      const createMark = async (
        studentId: number,
        subject: string,
        marks: number,
      ) =>
        request(`/api/marks`, {
          method: "POST",
          body: { studentId, subject, marks },
        });

      const ashaMath = await createMark(
        asha.body.data.id,
        "  Mathematics  ",
        80,
      );
      const ashaScience = await createMark(asha.body.data.id, "Science", 75);
      const rohanMath = await createMark(rohan.body.data.id, "Mathematics", 90);
      const rohanScience = await createMark(rohan.body.data.id, "Science", 85);
      const meeraMath = await createMark(meera.body.data.id, "Mathematics", 70);
      const meeraEnglish = await createMark(meera.body.data.id, "English", 60);
      for (const created of [
        ashaMath,
        ashaScience,
        rohanMath,
        rohanScience,
        meeraMath,
        meeraEnglish,
      ]) {
        assert.equal(created.status, 201);
      }
      assert.equal(ashaMath.body.data.subject, "Mathematics");
      assert.equal(ashaMath.body.data.marks, 80);
      assert.equal(ashaMath.body.data.studentId, asha.body.data.id);

      const duplicateMark = await createMark(
        asha.body.data.id,
        "Mathematics",
        99,
      );
      assert.equal(duplicateMark.status, 409);

      const markLookup = await request(`/api/marks/${ashaMath.body.data.id}`);
      assert.equal(markLookup.status, 200);
      assert.equal(markLookup.body.data.subject, "Mathematics");
      assert.equal((await request("/api/marks/999999")).status, 404);
      assert.equal((await request("/api/marks/abc")).status, 400);

      const allMarks = await request<{ data: unknown[] }>("/api/marks");
      assert.equal(allMarks.status, 200);
      assert.equal(allMarks.body.data.length, 6);

      const filtered = await request<{ data: Array<{ subject: string }> }>(
        `/api/marks?studentId=${asha.body.data.id}&subject=Science`,
      );
      assert.equal(filtered.status, 200);
      assert.deepEqual(
        filtered.body.data.map((mark) => mark.subject),
        ["Science"],
      );
      const caseSensitive = await request<{ data: unknown[] }>(
        "/api/marks?subject=science",
      );
      assert.deepEqual(caseSensitive.body.data, []);
      assert.equal((await request("/api/marks?studentId=nope")).status, 400);

      const ashaMarks = await request<{ data: Array<{ subject: string }> }>(
        `/api/students/${asha.body.data.id}/marks`,
      );
      assert.equal(ashaMarks.status, 200);
      assert.deepEqual(
        ashaMarks.body.data.map((mark) => mark.subject),
        ["Mathematics", "Science"],
      );
      assert.equal((await request("/api/students/999999/marks")).status, 404);

      const averages = await request("/api/marks/averages/subjects");
      assert.equal(averages.status, 200);
      assert.deepEqual(averages.body.data, [
        { subject: "English", averageMarks: 60, totalRecords: 1 },
        { subject: "Mathematics", averageMarks: 80, totalRecords: 3 },
        { subject: "Science", averageMarks: 80, totalRecords: 2 },
      ]);

      const partialMark = await request(`/api/marks/${ashaMath.body.data.id}`, {
        method: "PUT",
        body: { marks: 81 },
      });
      assert.equal(partialMark.status, 200);
      assert.equal(partialMark.body.data.marks, 81);
      assert.equal(partialMark.body.data.subject, "Mathematics");
      assert.equal(
        (
          await request(`/api/marks/${ashaMath.body.data.id}`, {
            method: "PUT",
            body: {},
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await request(`/api/marks/${ashaScience.body.data.id}`, {
            method: "PUT",
            body: { subject: "Mathematics" },
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request(`/api/marks/${ashaMath.body.data.id}`, {
            method: "PUT",
            body: { studentId: 999999 },
          })
        ).status,
        404,
      );
      const restored = await request(`/api/marks/${ashaMath.body.data.id}`, {
        method: "PUT",
        body: { marks: 80 },
      });
      assert.equal(restored.status, 200);

      const boundary = await request("/api/students", {
        method: "POST",
        body: { name: "Boundary Case", email: "boundary@example.com" },
      });
      const low = await createMark(boundary.body.data.id, "Boundary", 0);
      assert.equal(low.status, 201);
      assert.equal(low.body.data.marks, 0);
      const high = await request(`/api/marks/${low.body.data.id}`, {
        method: "PUT",
        body: { marks: 100 },
      });
      assert.equal(high.status, 200);
      assert.equal(high.body.data.marks, 100);
      const decimal = await createMark(boundary.body.data.id, "Decimal", 88.5);
      assert.equal(decimal.status, 201);
      assert.equal(decimal.body.data.marks, 88.5);

      assert.equal(
        (
          await request(`/api/students/${boundary.body.data.id}`, {
            method: "DELETE",
          })
        ).status,
        204,
      );
      assert.equal(
        (await request(`/api/marks/${low.body.data.id}`)).status,
        404,
      );
      assert.equal(
        (await request(`/api/marks/${decimal.body.data.id}`)).status,
        404,
      );
      assert.equal(
        (await request(`/api/students/${boundary.body.data.id}`)).status,
        404,
      );
      assert.equal(
        (
          await request(`/api/students/${boundary.body.data.id}`, {
            method: "DELETE",
          })
        ).status,
        404,
      );

      const averagesAfterCascade = await request(
        "/api/marks/averages/subjects",
      );
      assert.deepEqual(averagesAfterCascade.body.data, [
        { subject: "English", averageMarks: 60, totalRecords: 1 },
        { subject: "Mathematics", averageMarks: 80, totalRecords: 3 },
        { subject: "Science", averageMarks: 80, totalRecords: 2 },
      ]);

      assert.equal(
        (
          await request(`/api/marks/${meeraEnglish.body.data.id}`, {
            method: "DELETE",
          })
        ).status,
        204,
      );
      assert.equal(
        (await request(`/api/marks/${meeraEnglish.body.data.id}`)).status,
        404,
      );
      assert.equal(
        (
          await request(`/api/marks/${meeraEnglish.body.data.id}`, {
            method: "DELETE",
          })
        ).status,
        404,
      );

      const withoutEnglish = await request("/api/marks/averages/subjects");
      assert.deepEqual(withoutEnglish.body.data, [
        { subject: "Mathematics", averageMarks: 80, totalRecords: 3 },
        { subject: "Science", averageMarks: 80, totalRecords: 2 },
      ]);

      assert.equal(
        (
          await request(`/api/students/${meera.body.data.id}`, {
            method: "DELETE",
          })
        ).status,
        204,
      );
      assert.equal(
        (await request(`/api/marks/${meeraMath.body.data.id}`)).status,
        404,
      );
      const afterMeera = await request("/api/marks/averages/subjects");
      assert.deepEqual(afterMeera.body.data, [
        { subject: "Mathematics", averageMarks: 85, totalRecords: 2 },
        { subject: "Science", averageMarks: 80, totalRecords: 2 },
      ]);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  after(async () => {
    await pool.end();
  });
});

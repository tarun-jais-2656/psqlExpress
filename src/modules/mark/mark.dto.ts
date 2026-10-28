import { z } from "zod";

/* ---------- Request DTOs (validated at the edge) ---------- */

export const createMarkDto = z.object({
  studentId: z.number().int().positive(),
  subject: z.string().trim().min(1).max(100),
  marks: z.number().finite().min(0).max(100),
});
export type CreateMarkDto = z.infer<typeof createMarkDto>;

/**
 * PUT follows the user module: every field is optional, but at least one is required.
 * Supplied values are still fully validated.
 */
export const updateMarkDto = createMarkDto
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  });
export type UpdateMarkDto = z.infer<typeof updateMarkDto>;

export const markIdParamDto = z.object({
  markId: z.coerce.number().int().positive(),
});
export type MarkIdParamDto = z.infer<typeof markIdParamDto>;

export const listMarksQueryDto = z
  .object({
    studentId: z
      .string()
      .trim()
      .regex(/^[1-9]\d*$/, "studentId must be a positive integer")
      .optional(),
    subject: z.string().trim().min(1).optional(),
  })
  .transform((query) => ({
    studentId:
      query.studentId === undefined ? undefined : Number(query.studentId),
    subject: query.subject,
  }));
export type ListMarksQueryDto = z.infer<typeof listMarksQueryDto>;

/* ---------- Response DTOs (what clients see) ---------- */

export interface MarkResponseDto {
  id: number;
  studentId: number;
  subject: string;
  marks: number;
  createdAt: string;
}

export interface SubjectAverageDto {
  subject: string;
  averageMarks: number;
  totalRecords: number;
}

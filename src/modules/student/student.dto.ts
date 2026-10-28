import { z } from "zod";

/* ---------- Request DTOs (validated at the edge) ---------- */

export const createStudentDto = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
});
export type CreateStudentDto = z.infer<typeof createStudentDto>;

/** PUT replaces name and email; both fields are required. */
export const updateStudentDto = createStudentDto;
export type UpdateStudentDto = z.infer<typeof updateStudentDto>;

export const studentIdParamDto = z.object({
  studentId: z.coerce.number().int().positive(),
});
export type StudentIdParamDto = z.infer<typeof studentIdParamDto>;

/* ---------- Response DTO (what clients see) ---------- */

export interface StudentResponseDto {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

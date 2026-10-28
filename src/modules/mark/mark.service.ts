import { conflict, notFound } from "../../errors/AppError";
import * as studentRepository from "../student/student.repository";
import type {
  CreateMarkDto,
  MarkResponseDto,
  SubjectAverageDto,
  UpdateMarkDto,
} from "./mark.dto";
import type { Mark, MarkListFilter, SubjectMarkValue } from "./mark.interface";
import * as markRepository from "./mark.repository";

const toResponse = (mark: Mark): MarkResponseDto => ({
  id: mark.id,
  studentId: mark.studentId,
  subject: mark.subject,
  marks: mark.marks,
  createdAt: mark.createdAt.toISOString(),
});

const pgCode = (err: unknown): string | undefined =>
  typeof err === "object" && err !== null && "code" in err
    ? String((err as { code?: unknown }).code)
    : undefined;

/**
 * Arithmetic mean rounded half up to two decimal places.
 * Only recorded marks are included — a missing subject is omitted, not treated as zero.
 */
export const calculateSubjectAverages = (
  rows: SubjectMarkValue[],
): SubjectAverageDto[] => {
  const totals = new Map<string, { sum: number; totalRecords: number }>();

  for (const row of rows) {
    const current = totals.get(row.subject) ?? { sum: 0, totalRecords: 0 };
    current.sum += row.marks;
    current.totalRecords += 1;
    totals.set(row.subject, current);
  }

  return [...totals.entries()]
    .map(([subject, { sum, totalRecords }]) => ({
      subject,
      averageMarks: Math.round((sum / totalRecords) * 100) / 100,
      totalRecords,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
};

const requireStudent = async (studentId: number): Promise<void> => {
  const student = await studentRepository.findById(studentId);
  if (!student) throw notFound(`Student ${studentId} not found`);
};

const assertUniquePair = async (
  studentId: number,
  subject: string,
  ignoreMarkId?: number,
): Promise<void> => {
  const existing = await markRepository.findByStudentAndSubject(
    studentId,
    subject,
  );
  if (existing && existing.id !== ignoreMarkId) {
    throw conflict("Marks for this student and subject already exist");
  }
};

export const listMarks = async (
  filter: MarkListFilter = {},
): Promise<MarkResponseDto[]> => {
  const marks = await markRepository.findAll(filter);
  return marks.map(toResponse);
};

export const listMarksForStudent = async (
  studentId: number,
): Promise<MarkResponseDto[]> => {
  await requireStudent(studentId);
  return listMarks({ studentId });
};

export const findMarkById = async (id: number): Promise<MarkResponseDto> => {
  const mark = await markRepository.findById(id);
  if (!mark) throw notFound(`Mark ${id} not found`);
  return toResponse(mark);
};

export const createMark = async (
  dto: CreateMarkDto,
): Promise<MarkResponseDto> => {
  await requireStudent(dto.studentId);
  await assertUniquePair(dto.studentId, dto.subject);

  try {
    return toResponse(await markRepository.create(dto));
  } catch (err) {
    if (pgCode(err) === "23505")
      throw conflict("Marks for this student and subject already exist");
    if (pgCode(err) === "23503")
      throw notFound(`Student ${dto.studentId} not found`);
    throw err;
  }
};

export const updateMark = async (
  id: number,
  dto: UpdateMarkDto,
): Promise<MarkResponseDto> => {
  const existing = await markRepository.findById(id);
  if (!existing) throw notFound(`Mark ${id} not found`);

  const next = {
    studentId: dto.studentId ?? existing.studentId,
    subject: dto.subject ?? existing.subject,
    marks: dto.marks ?? existing.marks,
  };

  if (dto.studentId !== undefined) await requireStudent(dto.studentId);
  if (
    next.studentId !== existing.studentId ||
    next.subject !== existing.subject
  ) {
    await assertUniquePair(next.studentId, next.subject, existing.id);
  }

  try {
    const updated = await markRepository.update(id, next);
    if (!updated) throw notFound(`Mark ${id} not found`);
    return toResponse(updated);
  } catch (err) {
    if (pgCode(err) === "23505")
      throw conflict("Marks for this student and subject already exist");
    if (pgCode(err) === "23503")
      throw notFound(`Student ${next.studentId} not found`);
    throw err;
  }
};

export const deleteMark = async (id: number): Promise<void> => {
  const deleted = await markRepository.deleteById(id);
  if (deleted === 0) throw notFound(`Mark ${id} not found`);
};

export const getSubjectAverages = async (): Promise<SubjectAverageDto[]> =>
  calculateSubjectAverages(await markRepository.listMarkValues());

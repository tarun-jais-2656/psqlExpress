import { conflict, notFound } from "../../errors/AppError";
import type { MarkResponseDto } from "../mark/mark.dto";
import * as markService from "../mark/mark.service";
import type {
  CreateStudentDto,
  StudentResponseDto,
  UpdateStudentDto,
} from "./student.dto";
import type { Student } from "./student.interface";
import * as studentRepository from "./student.repository";

const toResponse = (student: Student): StudentResponseDto => ({
  id: student.id,
  name: student.name,
  email: student.email,
  createdAt: student.createdAt.toISOString(),
});

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "code" in err &&
  (err as { code?: string }).code === "23505";

export const findAllStudents = async (): Promise<StudentResponseDto[]> => {
  const students = await studentRepository.findAll();
  return students.map(toResponse);
};

export const findStudentById = async (
  id: number,
): Promise<StudentResponseDto> => {
  const student = await studentRepository.findById(id);
  if (!student) throw notFound(`Student ${id} not found`);
  return toResponse(student);
};

export const createStudent = async (
  dto: CreateStudentDto,
): Promise<StudentResponseDto> => {
  const existing = await studentRepository.findByEmail(dto.email);
  if (existing) throw conflict("A student with that email already exists");

  try {
    return toResponse(await studentRepository.create(dto));
  } catch (err) {
    if (isUniqueViolation(err))
      throw conflict("A student with that email already exists");
    throw err;
  }
};

export const updateStudent = async (
  id: number,
  dto: UpdateStudentDto,
): Promise<StudentResponseDto> => {
  const existing = await studentRepository.findById(id);
  if (!existing) throw notFound(`Student ${id} not found`);

  if (dto.email !== existing.email) {
    const byEmail = await studentRepository.findByEmail(dto.email);
    if (byEmail) throw conflict("A student with that email already exists");
  }

  try {
    const updated = await studentRepository.update(id, dto);
    if (!updated) throw notFound(`Student ${id} not found`);
    return toResponse(updated);
  } catch (err) {
    if (isUniqueViolation(err))
      throw conflict("A student with that email already exists");
    throw err;
  }
};

export const deleteStudent = async (id: number): Promise<void> => {
  const deleted = await studentRepository.deleteById(id);
  if (deleted === 0) throw notFound(`Student ${id} not found`);
};
/** Marks belonging to one student. Missing students are 404, not an empty list. */
export const listStudentMarks = (
  studentId: number,
): Promise<MarkResponseDto[]> => markService.listMarksForStudent(studentId);

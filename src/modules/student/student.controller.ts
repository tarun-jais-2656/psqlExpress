import { Router, type Request, type Response } from "express";
import { validateBody } from "../../middlewares/validate";
import {
  createStudentDto,
  studentIdParamDto,
  updateStudentDto,
  type CreateStudentDto,
  type UpdateStudentDto,
} from "./student.dto";
import * as studentService from "./student.service";

/**
 * Controller + router for /students. Handlers translate HTTP <-> service calls.
 * No business logic and no try/catch: thrown errors and rejected promises
 * go to the central error handler.
 */
const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  res.json({ data: await studentService.findAllStudents() });
});

router.get("/:studentId/marks", async (req: Request, res: Response) => {
  const { studentId } = studentIdParamDto.parse(req.params);
  res.json({ data: await studentService.listStudentMarks(studentId) });
});

router.get("/:studentId", async (req: Request, res: Response) => {
  const { studentId } = studentIdParamDto.parse(req.params);
  res.json({ data: await studentService.findStudentById(studentId) });
});

router.post(
  "/",
  validateBody(createStudentDto),
  async (req: Request<unknown, unknown, CreateStudentDto>, res: Response) => {
    const student = await studentService.createStudent(req.body);
    res.status(201).json({ data: student });
  },
);

router.put(
  "/:studentId",
  validateBody(updateStudentDto),
  async (
    req: Request<{ studentId: string }, unknown, UpdateStudentDto>,
    res: Response,
  ) => {
    const { studentId } = studentIdParamDto.parse(req.params);
    res.json({ data: await studentService.updateStudent(studentId, req.body) });
  },
);

router.delete("/:studentId", async (req: Request, res: Response) => {
  const { studentId } = studentIdParamDto.parse(req.params);
  await studentService.deleteStudent(studentId);
  res.status(204).end();
});

export default router;

import { Router, type Request, type Response } from "express";
import { validateBody } from "../../middlewares/validate";
import {
  createMarkDto,
  listMarksQueryDto,
  markIdParamDto,
  updateMarkDto,
  type CreateMarkDto,
  type UpdateMarkDto,
} from "./mark.dto";
import * as markService from "./mark.service";

/**
 * Controller + router for /marks. Handlers translate HTTP <-> service calls.
 * No business logic and no try/catch: thrown errors and rejected promises
 * go to the central error handler.
 *
 * `/averages/subjects` is registered before `/:markId` so "averages" is not parsed as an id.
 */
const router = Router();

router.get("/averages/subjects", async (_req: Request, res: Response) => {
  res.json({ data: await markService.getSubjectAverages() });
});

router.get("/", async (req: Request, res: Response) => {
  const filter = listMarksQueryDto.parse(req.query);
  res.json({ data: await markService.listMarks(filter) });
});

router.get("/:markId", async (req: Request, res: Response) => {
  const { markId } = markIdParamDto.parse(req.params);
  res.json({ data: await markService.findMarkById(markId) });
});

router.post(
  "/",
  validateBody(createMarkDto),
  async (req: Request<unknown, unknown, CreateMarkDto>, res: Response) => {
    const mark = await markService.createMark(req.body);
    res.status(201).json({ data: mark });
  },
);

router.put(
  "/:markId",
  validateBody(updateMarkDto),
  async (
    req: Request<{ markId: string }, unknown, UpdateMarkDto>,
    res: Response,
  ) => {
    const { markId } = markIdParamDto.parse(req.params);
    res.json({ data: await markService.updateMark(markId, req.body) });
  },
);

router.delete("/:markId", async (req: Request, res: Response) => {
  const { markId } = markIdParamDto.parse(req.params);
  await markService.deleteMark(markId);
  res.status(204).end();
});

export default router;

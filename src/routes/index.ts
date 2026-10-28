import { Router } from "express";
import markController from "../modules/mark/mark.controller";
import studentController from "../modules/student/student.controller";
import userController from "../modules/user/user.controller";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Register each feature module here. Mounted under /api by app.ts.
router.use("/users", userController);
router.use("/students", studentController);
router.use("/marks", markController);

/** Demo: an async handler that rejects. Proves the error is caught, not a process crash. */
router.get("/demo/async-error", async () => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  throw new Error("Boom! Async failure inside a route");
});

export default router;

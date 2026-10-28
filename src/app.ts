import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { requestLogger } from "./middlewares/requestLogger";
import routes from "./routes";

/**
 * Request lifecycle (middleware runs in registration order):
 *   requestLogger -> express.json -> /api routes -> notFound -> errorHandler
 * Any thrown error / rejected promise / next(err) jumps straight to errorHandler.
 */
const app = express();

app.use(requestLogger);
app.use(express.json());

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

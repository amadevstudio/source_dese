import express from "express";
import { RegisterRoutes } from "./generated/routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import {
  lenientJsonParser,
  parseLenientJson,
} from "./middlewares/jsonErrorHandler.js";
import * as swaggerUi from "swagger-ui-express";
import swaggerDocument from "./generated/swagger.json";

const app = express();

// express.json() rejects control characters immediately.
// lenientJsonParser reads body as text, then parseLenientJson sanitizes and parses it.
// This handles stack traces with raw newlines/tabs inside JSON strings.
app.use(lenientJsonParser);
app.use(parseLenientJson);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
RegisterRoutes(app);
app.use(errorHandler);

export default app;

import express from "express";

import acceptJson from "./middleware/acceptJson.js";
import contentTypeJson from "./middleware/contentTypeJson.js";
import errorHandler from "./middleware/errorHandler.js";
import debugRoutes from "./routes/debug.routes.js";
import debugSerializeRoutes from "./routes/debug.serialize.routes.js";
import usersRoutes from "./routes/users.routes.js";
import artsRoutes from "./routes/arts.routes.js";
import galleriesRoutes from "./routes/galleries.routes.js";


const app = express();

app.use(express.json({ strict: true }));

// Global PDF rules
app.use(acceptJson);
app.use(contentTypeJson);

app.use(debugRoutes);
app.use(debugSerializeRoutes);
app.use(usersRoutes);
app.use(artsRoutes);
app.use(galleriesRoutes);

// Safe test route
app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use(errorHandler);

export default app;

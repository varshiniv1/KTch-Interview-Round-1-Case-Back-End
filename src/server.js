import app from "./app.js";
import { initDb } from "./db/index.js";

initDb();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

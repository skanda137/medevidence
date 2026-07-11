import express from "express";
import cors from "cors";
import "dotenv/config";
import { diseasesRouter } from "./routes/diseases.js";
import { chatRouter } from "./routes/chat.js";
import { guidelinesRouter } from "./routes/guidelines.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/diseases", diseasesRouter);
app.use("/chat", chatRouter);
app.use("/guidelines", guidelinesRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
  console.log(`medevidence-backend listening on :${port}`);
});

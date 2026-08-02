import { Router } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  getExperience,
  getProfile,
  getProjects,
  getSkills,
} from "../controllers/content.controller.js";
import {
  postContact,
  postNewsletter,
  postVisitor,
} from "../controllers/message.controller.js";
import { getHealth, getStats } from "../controllers/stats.controller.js";

export const api = Router();

api.get("/health", getHealth);

api.get("/projects", getProjects);
api.get("/skills", getSkills);
api.get("/experience", getExperience);
api.get("/profile", getProfile);
api.get("/stats", getStats);

api.post(
  "/contact",
  rateLimit({ windowMs: 60_000, max: 5, name: "contact" }),
  postContact,
);
api.post(
  "/newsletter",
  rateLimit({ windowMs: 60_000, max: 5, name: "newsletter" }),
  postNewsletter,
);
api.post(
  "/visitors",
  rateLimit({ windowMs: 60_000, max: 20, name: "visitors" }),
  postVisitor,
);

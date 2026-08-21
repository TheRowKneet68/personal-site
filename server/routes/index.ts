import { Router } from "express";
import { rateLimit } from "../middleware/rateLimit.js";
import { bruteForce } from "../middleware/bruteForce.js";
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
import { getContent, changePassword, deleteMessage, deleteSubscriber, listMessages, listSubscribers, login, updateContent, uploadImage, loginDeck, changeDeckPassword } from "../controllers/admin.controller.js";
import { getState, listDevices, saveDevices, setDeviceState } from "../controllers/iot.controller.js";
import { requireAdmin, requireDeck } from "../middleware/auth.js";

export const api = Router();

api.get("/health", getHealth);

api.get("/projects", getProjects);
api.get("/skills", getSkills);
api.get("/experience", getExperience);
api.get("/profile", getProfile);
api.get("/stats", getStats);

api.post(
  "/admin/login",
  rateLimit({ windowMs: 15 * 60_000, max: 5, name: "admin-login" }),
  bruteForce(),
  login,
);
api.post(
  "/admin/change-password",
  rateLimit({ windowMs: 15 * 60_000, max: 5, name: "admin-change-password" }),
  requireAdmin,
  changePassword,
);

api.get("/admin/content", requireAdmin, getContent);
api.put("/admin/content", requireAdmin, updateContent);
api.get("/admin/messages", requireAdmin, listMessages);
api.get("/admin/subscribers", requireAdmin, listSubscribers);
api.delete("/admin/messages/:id", requireAdmin, deleteMessage);
api.delete("/admin/subscribers/:email", requireAdmin, deleteSubscriber);
api.post(
  "/admin/upload",
  rateLimit({ windowMs: 60_000, max: 20, name: "admin-upload" }),
  requireAdmin,
  uploadImage,
);

/* ---- Cyber-Deck IoT proxy — DECK-scoped bearer token (separate vault from
        the content admin). Writes are rate-limited harder than reads
        (relay chatter guard). ---- */
api.get("/iot/devices", requireDeck, listDevices);
api.put(
  "/iot/devices",
  rateLimit({ windowMs: 60_000, max: 30, name: "iot-config" }),
  requireDeck,
  saveDevices,
);
api.get("/iot/state", rateLimit({ windowMs: 60_000, max: 60, name: "iot-state" }), requireDeck, getState);
api.post(
  "/iot/devices/:id/state",
  rateLimit({ windowMs: 60_000, max: 30, name: "iot-write" }),
  requireDeck,
  setDeviceState,
);

/* ---- Deck credential endpoints — independent password from the admin panel. */
api.post(
  "/deck/login",
  rateLimit({ windowMs: 15 * 60_000, max: 5, name: "deck-login" }),
  bruteForce(),
  loginDeck,
);
api.post(
  "/deck/change-password",
  rateLimit({ windowMs: 15 * 60_000, max: 5, name: "deck-change-password" }),
  requireDeck,
  changeDeckPassword,
);

api.post(
  "/contact",
  rateLimit({ windowMs: 60_000, max: 5, global: 60, name: "contact" }),
  postContact,
);
api.post(
  "/newsletter",
  rateLimit({ windowMs: 60_000, max: 5, global: 60, name: "newsletter" }),
  postNewsletter,
);
api.post(
  "/visitors",
  rateLimit({ windowMs: 60_000, max: 20, global: 240, name: "visitors" }),
  postVisitor,
);

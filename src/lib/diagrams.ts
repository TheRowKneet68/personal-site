/* System diagrams for the flagship projects, keyed by project id.
   They show how each system works - what talks to what, and what each part
   does - without naming the exact chips, modules or libraries, so the design
   can't be copied part for part. Keep new diagrams the same way.
   These are the defaults; a diagram saved on the project in /admin wins. */

import type { Diagram, Project } from "../types";

export type { Diagram, DiagramLane, DiagramNode } from "../types";

export const DIAGRAMS: Record<string, Diagram> = {
  suraksha360: {
    caption:
      "Suraksha360 joins three systems I built separately. Each keeps working over its own link: home Wi-Fi, an ordinary phone call, or a short-range wireless link.",
    lanes: [
      {
        name: "SurakshaGhar, home control",
        nodes: [
          { name: "Phone app", role: "remote control" },
          { name: "Controller", role: "my own board" },
          { name: "Switching stage", role: "lights, appliances" },
        ],
        links: ["Wi-Fi", null],
      },
      {
        name: "Call-based motor control",
        nodes: [
          { name: "Any phone", role: "a normal call" },
          { name: "Controller", role: "no internet needed" },
          { name: "Switching stage", role: "pump or motor" },
        ],
        links: ["phone call", null],
      },
      {
        name: "SwiftIgnite, motorcycle",
        nodes: [
          { name: "Phone or watch", role: "paired device" },
          { name: "Controller", role: "decides who may start" },
          { name: "Ignition", role: "unlocked on approval" },
        ],
        links: ["short-range wireless", null],
      },
    ],
  },

  "suraksha-ghar": {
    caption:
      "SurakshaGhar went from breadboard to a production switch on a board I designed, with its own firmware and companion app.",
    lanes: [
      {
        name: "Switching",
        nodes: [
          { name: "Companion app", role: "web + mobile" },
          { name: "Controller", role: "my own board" },
          { name: "Switching stage", role: "four circuits" },
        ],
        links: ["Wi-Fi", null],
      },
      {
        name: "Door",
        nodes: [
          { name: "Card reader", role: "who is at the door" },
          { name: "Controller", role: "checks the card" },
          { name: "Door lock" },
        ],
        links: [null, null],
      },
      {
        name: "Motion",
        nodes: [
          { name: "Motion sensing" },
          { name: "Controller", role: "decides if it's real" },
          { name: "Owner's phone", role: "alert" },
        ],
        links: [null, "Wi-Fi"],
      },
    ],
  },

  swiftignite: {
    caption:
      "SwiftIgnite v1 is the ignition lane: keyless start from a paired phone, with a physical fallback. The tracking lane is v2, in development.",
    lanes: [
      {
        name: "Ignition",
        nodes: [
          { name: "Phone", role: "paired device" },
          { name: "Controller", role: "pairing + checks" },
          { name: "Ignition", role: "switched on approval" },
        ],
        links: ["short-range wireless", null],
      },
      {
        name: "Fallback",
        nodes: [
          { name: "Physical path", role: "if the phone is down" },
          { name: "Ignition", role: "rider never stranded" },
        ],
        links: [null],
      },
      {
        name: "Tracking (v2)",
        nodes: [
          { name: "Position sensing" },
          { name: "Controller" },
          { name: "Cellular link" },
          { name: "Owner's phone", role: "location alerts" },
        ],
        links: [null, null, "SMS"],
      },
    ],
  },

  gravas: {
    caption: "GRAVAS needs no gloves or markers. The computer watches the hand through a camera and turns its pose into arm movements.",
    lanes: [
      {
        name: "Hand to arm",
        nodes: [
          { name: "Camera", role: "watches the hand" },
          { name: "Computer", role: "reads the hand's pose" },
          { name: "Controller", role: "turns pose into angles" },
          { name: "Robotic arm", role: "follows the hand" },
        ],
        links: [null, "USB", null],
      },
    ],
  },

  a41148e2: {
    caption:
      "The scoring system runs entirely on a local network. Phones become referee terminals; one match server holds the state.",
    lanes: [
      {
        name: "Scoring",
        nodes: [
          { name: "Referee phones", role: "any phone or tablet" },
          { name: "Match server", role: "single source of truth" },
          { name: "Vote decision", role: "majority of referees" },
        ],
        links: ["local network", null],
      },
      {
        name: "Display",
        nodes: [
          { name: "Match server" },
          { name: "Live screens", role: "referee, jury, admin, audience" },
        ],
        links: ["live updates"],
      },
      {
        name: "Recovery",
        nodes: [
          { name: "Match server" },
          { name: "Saved state", role: "survives a crash" },
        ],
        links: [null],
      },
    ],
  },
};

/** The project's own diagram from the CMS, else the built-in default. */
export function diagramFor(p: Project): Diagram | undefined {
  const own = p.diagram;
  if (own && Array.isArray(own.lanes) && own.lanes.some((l) => l.nodes?.length)) return own;
  return DIAGRAMS[p.id];
}

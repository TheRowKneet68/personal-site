/* System diagrams for the flagship projects, keyed by project id.
   Each node and link comes from that project's own description, highlights or
   architecture notes in the CMS. Where the notes don't name the link, the wire
   stays unlabelled rather than guessing a protocol.
   These are the defaults; a diagram saved on the project in /admin wins. */

import type { Diagram, Project } from "../types";

export type { Diagram, DiagramLane, DiagramNode } from "../types";

export const DIAGRAMS: Record<string, Diagram> = {
  suraksha360: {
    caption:
      "Suraksha360 joins three systems I built separately. Each keeps working over its own link: Wi-Fi, a plain GSM phone call, or Bluetooth Low Energy.",
    lanes: [
      {
        name: "SurakshaGhar, home control",
        nodes: [
          { name: "Phone app", role: "Blynk / Firebase" },
          { name: "ESP32", role: "custom PCB", part: true },
          { name: "Relays", role: "lights, appliances" },
        ],
        links: ["Wi-Fi", null],
      },
      {
        name: "Call-based motor control",
        nodes: [
          { name: "Any phone", role: "a normal call" },
          { name: "ESP32 + GSM", role: "no internet needed", part: true },
          { name: "Relay", role: "pump or motor" },
        ],
        links: ["GSM", null],
      },
      {
        name: "SwiftIgnite, motorcycle",
        nodes: [
          { name: "Phone + smartwatch", role: "custom watch" },
          { name: "nRF52840", role: "ignition control", part: true },
          { name: "Relay", role: "ignition line" },
        ],
        links: ["BLE", null],
      },
    ],
  },

  "suraksha-ghar": {
    caption:
      "SurakshaGhar went from breadboard to a production 4-channel switch on a PCB I designed in EasyEDA, with its own firmware and companion app.",
    lanes: [
      {
        name: "Switching",
        nodes: [
          { name: "Companion app", role: "web + mobile" },
          { name: "ESP32 / ESP8266", role: "firmware, custom PCB", part: true },
          { name: "4-channel relay", role: "production switch" },
        ],
        links: ["Wi-Fi", null],
      },
      {
        name: "Door",
        nodes: [
          { name: "RFID", role: "card reader", part: true },
          { name: "Controller", role: "checks the card" },
          { name: "Door lock" },
        ],
        links: [null, null],
      },
      {
        name: "Motion",
        nodes: [
          { name: "PIR", role: "motion sensor", part: true },
          { name: "Controller", role: "decides if it's real" },
          { name: "Owner's phone", role: "alert" },
        ],
        links: [null, "Wi-Fi"],
      },
    ],
  },

  swiftignite: {
    caption:
      "SwiftIgnite v1 is the ignition lane: keyless start over BLE with a physical fallback. The tracking lane is v2, in development.",
    lanes: [
      {
        name: "Ignition",
        nodes: [
          { name: "Phone", role: "paired device" },
          { name: "nRF52840", role: "pairing + control", part: true },
          { name: "Relay", role: "switches ignition" },
        ],
        links: ["BLE", null],
      },
      {
        name: "Fallback",
        nodes: [
          { name: "Physical path", role: "if BLE is down" },
          { name: "Ignition line", role: "rider never stranded" },
        ],
        links: [null],
      },
      {
        name: "Tracking (v2)",
        nodes: [
          { name: "Neo-M8N", role: "GPS position", part: true },
          { name: "nRF52840", part: true },
          { name: "SIM800L", role: "cellular", part: true },
          { name: "Owner's phone", role: "location alerts" },
        ],
        links: [null, null, "SMS"],
      },
    ],
  },

  gravas: {
    caption:
      "GRAVAS needs no gloves or markers. Python reads the hand from the camera, and pyFirmata turns the landmarks into servo angles.",
    lanes: [
      {
        name: "Hand to arm",
        nodes: [
          { name: "Camera feed" },
          { name: "OpenCV", role: "frames", part: true },
          { name: "MediaPipe", role: "hand landmarks", part: true },
          { name: "Arduino", role: "pyFirmata", part: true },
          { name: "Servos", role: "robotic arm" },
        ],
        links: [null, null, "Firmata", null],
      },
    ],
  },

  a41148e2: {
    caption:
      "The scoring system runs entirely on a local network. Phones become referee terminals; one Node.js server holds the match state.",
    lanes: [
      {
        name: "Scoring",
        nodes: [
          { name: "Referee phones", role: "any smartphone or tablet" },
          { name: "Node.js server", role: "state machine", part: true },
          { name: "Vote engine", role: "5 s window, 3 of 4" },
        ],
        links: ["WebSocket, LAN", null],
      },
      {
        name: "Display",
        nodes: [
          { name: "Node.js server", part: true },
          { name: "Dashboards", role: "referee, jury, admin, audience" },
        ],
        links: ["WebSocket"],
      },
      {
        name: "Recovery",
        nodes: [
          { name: "Node.js server", part: true },
          { name: "Snapshots", role: "JSON, every 2 s" },
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

import assert from "node:assert/strict";
import test from "node:test";

import { dedupeRowsById } from "./content.js";

test("dedupes content rows before upsert to avoid duplicate primary keys", () => {
  const rows = [
    { id: "dup", data: { title: "first" } },
    { id: "dup", data: { title: "second" } },
    { id: "other", data: { title: "third" } },
  ];

  assert.deepEqual(dedupeRowsById(rows), [
    { id: "dup", data: { title: "second" } },
    { id: "other", data: { title: "third" } },
  ]);
});

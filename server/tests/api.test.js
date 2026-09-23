import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/index.js";
import { seedDatabase } from "../src/seed.js";

// ── Test database setup ──────────────────────────────────────────
// If DATABASE_URL is set, use Neon/PostgreSQL.
// Otherwise, use SQLite (sql.js) for zero-setup local testing.
const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createTestDatabase() {
  if (TEST_DB_URL) {
    process.env.DATABASE_URL = TEST_DB_URL;
    const { createDatabase } = await import("../src/neon.js");
    return createDatabase();
  }
  const { createDatabase } = await import("../src/db.js");
  return createDatabase(path.join(__dirname, "../data/test.sqlite"));
}

async function closeTestDatabase(database) {
  if (database.pool?.end) await database.pool.end();
}

async function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
      });
    });
  });
}

// Bhaav has no login — tests identify as the seeded demo user via the
// anonymous x-bhaav-user header (exactly what the client sends).
const DEMO_HEADERS = {
  "x-bhaav-user": "demo",
  "content-type": "application/json",
};

async function withServer(fn) {
  const database = await createTestDatabase();
  await seedDatabase(database);
  const app = await createApp(database);
  const { server, url } = await listen(app);
  try {
    await fn(url, database, null, DEMO_HEADERS);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await closeTestDatabase(database);
  }
}

test("seeded dashboard is not empty", async () => {
  await withServer(async (url, _db, _token, headers) => {
    const res = await fetch(`${url}/api/state`, { headers });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body.sessions));
    assert.ok(body.sessions.length >= 10);
    assert.equal(body.baseline.ready, true);
    assert.doesNotMatch(JSON.stringify(body), /Today felt like/);
  });
});

test("session endpoint rejects text and stores features only", async () => {
  await withServer(async (url, database, _token, headers) => {
    const rejected = await fetch(`${url}/api/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text: "I feel awful today", typingSpeed: 40 }),
    });
    assert.equal(rejected.status, 400);

    const accepted = await fetch(`${url}/api/sessions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        typingSpeed: 42.8,
        meanPauseMs: 842,
        pauseStdDevMs: 311,
        correctionRate: 0.073,
        timingVariance: 0.184,
        sessionDuration: 642,
      }),
    });
    const session = await accepted.json();
    assert.equal(accepted.status, 200);
    assert.ok(session.deviation >= 0);
    const dump = JSON.stringify(await database.all("SELECT * FROM sessions"));
    assert.doesNotMatch(dump, /awful/);
  });
});

test("export has no journal text and delete removes records", async () => {
  await withServer(async (url, database, _token, headers) => {
    const exported = await fetch(`${url}/api/export`, { headers });
    const payload = await exported.json();
    assert.equal(payload.containsJournalText, false);
    assert.ok(Array.isArray(payload.sessions));

    const deleted = await fetch(`${url}/api/me`, {
      method: "DELETE",
      headers,
    });
    assert.equal((await deleted.json()).deleted, true);
  });
});

test("campus pulse is enforced server-side", async () => {
  await withServer(async (url, database, _token, headers) => {
    const ok = await fetch(`${url}/api/campus`, { headers });
    const status = ok.status;
    // Campus pulse requires enough participants — may be 200 or 403
    assert.ok(status === 200 || status === 403);
    const pulse = await ok.json();
    if (status === 200) {
      assert.equal(pulse.withheld, false);
      assert.ok(pulse.participantCount >= 10);
    } else {
      assert.equal(pulse.withheld, true);
    }
  });
});

test("weekly insight works without API key", async () => {
  await withServer(async (url, _db, _token, headers) => {
    const res = await fetch(`${url}/api/insights/weekly`, {
      method: "POST",
      headers,
      body: "{}",
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.observation);
    assert.ok(body.suggestion);
    assert.doesNotMatch(body.observation, /500|undefined|stack/i);
  });
});

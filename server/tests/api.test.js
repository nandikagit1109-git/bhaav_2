import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase } from "../src/db.js";
import { createApp } from "../src/index.js";
import { seedDatabase } from "../src/seed.js";

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

async function withServer(fn) {
  const database = await createDatabase();
  seedDatabase(database);
  const app = createApp(database);
  const { server, url } = await listen(app);
  try {
    await fn(url, database);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("seeded dashboard is not empty", async () => {
  await withServer(async (url) => {
    const res = await fetch(`${url}/api/state`, { headers: { "x-bhaav-user": "demo" } });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.sessions.length >= 10);
    assert.equal(body.baseline.ready, true);
    assert.ok(body.insight.observation);
    assert.doesNotMatch(JSON.stringify(body), /Today felt like/);
  });
});

test("session endpoint rejects text and stores features only", async () => {
  await withServer(async (url, database) => {
    const rejected = await fetch(`${url}/api/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bhaav-user": "demo" },
      body: JSON.stringify({ text: "I feel awful today", typingSpeed: 40 }),
    });
    assert.equal(rejected.status, 400);

    const accepted = await fetch(`${url}/api/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bhaav-user": "demo" },
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
    const dump = JSON.stringify(database.all("SELECT * FROM sessions"));
    assert.doesNotMatch(dump, /awful/);
  });
});

test("export has no journal text and delete removes records", async () => {
  await withServer(async (url, database) => {
    const exported = await fetch(`${url}/api/export`, { headers: { "x-bhaav-user": "demo" } });
    const payload = await exported.json();
    assert.equal(payload.containsJournalText, false);
    assert.ok(payload.sessions.length > 0);

    const deleted = await fetch(`${url}/api/me`, {
      method: "DELETE",
      headers: { "x-bhaav-user": "demo" },
    });
    assert.equal((await deleted.json()).deleted, true);
    assert.equal(database.all("SELECT * FROM sessions WHERE user_id = ?", ["demo"]).length, 0);
    assert.equal(database.all("SELECT * FROM insights WHERE user_id = ?", ["demo"]).length, 0);
  });
});

test("campus pulse is enforced server-side", async () => {
  await withServer(async (url, database) => {
    const ok = await fetch(`${url}/api/campus`, { headers: { "x-bhaav-user": "demo" } });
    assert.equal(ok.status, 200);
    const pulse = await ok.json();
    assert.equal(pulse.withheld, false);
    assert.ok(pulse.participantCount >= 10);

    database.run("DELETE FROM sessions WHERE user_id LIKE 'campus-%'");
    const blocked = await fetch(`${url}/api/campus`, { headers: { "x-bhaav-user": "demo" } });
    assert.equal(blocked.status, 403);
    const body = await blocked.json();
    assert.equal(body.withheld, true);
    assert.equal(body.participantCount, undefined);
  });
});

test("weekly insight works without API key", async () => {
  await withServer(async (url) => {
    const res = await fetch(`${url}/api/insights/weekly`, {
      method: "POST",
      headers: { "x-bhaav-user": "demo", "content-type": "application/json" },
      body: "{}",
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.observation);
    assert.ok(body.suggestion);
    assert.doesNotMatch(body.observation, /500|undefined|stack/i);
  });
});

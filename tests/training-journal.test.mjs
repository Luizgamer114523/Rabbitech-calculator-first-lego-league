import test from "node:test";
import assert from "node:assert/strict";
import { validateJournalEntry, summarizeJournalEntries, escapeHTML } from "../assets/js/training-journal.mjs";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const validInput = {
  robotVersion: "Robô V3",
  mission: "M03",
  outcome: "passed",
  attempts: "4",
  observation: "Completou o percurso sem tocar na borda.",
  nextAction: "Repetir cinco vezes."
};

test("index integra o diário e o módulo exatamente uma vez", () => {
  assert.equal((html.match(/id="rbTrainingJournal"/g) ?? []).length, 1);
  assert.equal((html.match(/src="\/assets\/js\/training-journal\.mjs"/g) ?? []).length, 1);
  assert.match(html, /id="rbJournalExport"/);
  assert.match(html, /id="rbJournalClear"/);
});

test("aceita e normaliza uma entrada válida", () => {
  const result = validateJournalEntry(validInput);
  assert.equal(result.ok, true);
  assert.equal(result.value.attempts, 4);
  assert.equal(result.value.mission, "M03");
  assert.equal(result.value.robotVersion, "Robô V3");
});

test("rejeita descrição vazia e repetições inválidas", () => {
  const result = validateJournalEntry({ ...validInput, observation: " ", attempts: 51 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("Use de 1 a 50 repetições."));
  assert.ok(result.errors.includes("Descreva o que aconteceu no teste."));
});

test("rejeita missão ou resultado desconhecido", () => {
  const result = validateJournalEntry({ ...validInput, mission: "M99", outcome: "unknown" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("Selecione uma missão ou área válida."));
  assert.ok(result.errors.includes("Selecione o resultado do teste."));
});

test("resume resultados mistos e ignora entradas inválidas", () => {
  assert.deepEqual(summarizeJournalEntries([
    { outcome: "passed" }, { outcome: "passed" }, { outcome: "partial" },
    { outcome: "failed" }, { outcome: "adjustment" }, { outcome: "not-valid" }, null
  ]), { total: 5, passed: 2, partial: 1, failed: 1, adjustment: 1, successRate: 40 });
});

test("resumo vazio é consistente", () => {
  assert.deepEqual(summarizeJournalEntries(null), {
    total: 0, passed: 0, partial: 0, failed: 0, adjustment: 0, successRate: 0
  });
});

test("escapa HTML em texto livre", () => {
  assert.equal(escapeHTML("'<>&\\""), "&#39;&lt;&gt;&amp;&quot;");
});

test("form controls, local storage and export have expected limits", () => {
  const moduleSource = readFileSync(new URL("../assets/js/training-journal.mjs", import.meta.url), "utf8");
  assert.match(moduleSource, /MAX_ENTRIES = 200/);
  assert.match(moduleSource, /localStorage\.setItem/);
  assert.match(moduleSource, /application\/json;charset=utf-8/);
  assert.doesNotMatch(moduleSource, /fetch\(|rbClient|supabase/i);
});

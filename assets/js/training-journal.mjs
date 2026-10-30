const STORAGE_KEY = "rabbitech.bioglow.fllc.v2.training-journal";
const MAX_ENTRIES = 200;

const MISSION_VALUES = new Set(["general", ...Array.from({ length: 15 }, (_, i) => "M" + String(i + 1).padStart(2, "0"))]);
export const OUTCOME_LABELS = Object.freeze({
  passed: "Concluído",
  partial: "Parcial",
  failed: "Falhou",
  adjustment: "Precisa de ajuste"
});

export function validateJournalEntry(input) {
  const raw = input && typeof input === "object" ? input : {};
  const robotVersion = String(raw.robotVersion ?? "").trim().slice(0, 60);
  const mission = String(raw.mission ?? "").trim();
  const outcome = String(raw.outcome ?? "").trim();
  const attempts = Number(raw.attempts);
  const observation = String(raw.observation ?? "").trim().slice(0, 1200);
  const nextAction = String(raw.nextAction ?? "").trim().slice(0, 800);
  const errors = [];

  if (!robotVersion) errors.push("Informe a versão ou configuração do robô.");
  if (!MISSION_VALUES.has(mission)) errors.push("Selecione uma missão ou área válida.");
  if (!Object.prototype.hasOwnProperty.call(OUTCOME_LABELS, outcome)) errors.push("Selecione o resultado do teste.");
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 50) errors.push("Use de 1 a 50 repetições.");
  if (!observation) errors.push("Descreva o que aconteceu no teste.");

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    value: { robotVersion, mission, outcome, attempts, observation, nextAction }
  };
}

export function summarizeJournalEntries(entries) {
  const safe = (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry && Object.prototype.hasOwnProperty.call(OUTCOME_LABELS, entry.outcome)
  );
  const total = safe.length;
  const passed = safe.filter((entry) => entry.outcome === "passed").length;
  const partial = safe.filter((entry) => entry.outcome === "partial").length;
  const failed = safe.filter((entry) => entry.outcome === "failed").length;
  const adjustment = safe.filter((entry) => entry.outcome === "adjustment").length;
  return {
    total, passed, partial, failed, adjustment,
    successRate: total ? Math.round((passed / total) * 100) : 0
  };
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return String(Date.now()) + "-" + String(Math.random()).slice(2);
}

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => {
      const checked = validateJournalEntry(entry);
      if (!checked.ok) return null;
      const date = Date.parse(entry.createdAt || "");
      return {
        id: typeof entry.id === "string" && entry.id.length < 100 ? entry.id : makeId(),
        createdAt: Number.isFinite(date) ? new Date(date).toISOString() : new Date().toISOString(),
        ...checked.value
      };
    }).filter(Boolean).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, MAX_ENTRIES);
  } catch (_) {
    return [];
  }
}

function persistEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    return true;
  } catch (_) {
    return false;
  }
}

function initTrainingJournal() {
  const root = document.getElementById("rbTrainingJournal");
  if (!root || root.dataset.rbJournalReady === "true") return;
  root.dataset.rbJournalReady = "true";

  const form = root.querySelector("#rbJournalForm");
  const status = root.querySelector("#rbJournalStatus");
  const host = root.querySelector("#rbJournalEntries");
  const filter = root.querySelector("#rbJournalFilter");
  const count = root.querySelector("#rbJournalCount");
  const successRate = root.querySelector("#rbJournalSuccessRate");
  const failures = root.querySelector("#rbJournalFailures");
  const exportButton = root.querySelector("#rbJournalExport");
  const clearButton = root.querySelector("#rbJournalClear");
  const attemptsInput = root.querySelector("#rbJournalAttempts");
  if (!form || !status || !host || !filter || !count || !successRate || !failures || !exportButton || !clearButton || !attemptsInput) return;

  let entries = readEntries();
  const report = (message) => { status.textContent = message; };
  const missionLabel = (value) => value === "general" ? "Geral / navegação" : value;

  function render() {
    const summary = summarizeJournalEntries(entries);
    count.textContent = String(summary.total);
    successRate.textContent = String(summary.successRate) + "%";
    failures.textContent = String(summary.failed);
    exportButton.disabled = summary.total === 0;
    clearButton.disabled = summary.total === 0;

    const selectedOutcome = filter.value;
    const visible = entries.filter((entry) => selectedOutcome === "all" || entry.outcome === selectedOutcome);
    if (!visible.length) {
      host.innerHTML = entries.length
        ? '<p class="footnote">Nenhum registro corresponde a este filtro.</p>'
        : '<p class="footnote">Nenhum teste registrado ainda. Registre um teste após cada ajuste importante.</p>';
      return;
    }

    host.innerHTML = visible.map((entry) => {
      const dateValue = new Date(entry.createdAt);
      const dateLabel = Number.isNaN(dateValue.getTime()) ? "Data indisponível" : dateValue.toLocaleString("pt-BR");
      const nextAction = entry.nextAction ? '<small>Próxima ação: ' + escapeHTML(entry.nextAction) + '</small>' : "";
      return '<div class="history-item"><div><b>' + escapeHTML(missionLabel(entry.mission)) +
        ' · ' + escapeHTML(OUTCOME_LABELS[entry.outcome]) + '</b><small>' +
        escapeHTML(dateLabel) + ' · Robô: ' + escapeHTML(entry.robotVersion) +
        ' · ' + String(entry.attempts) + ' repetição(ões)</small><p class="footnote">' +
        escapeHTML(entry.observation) + '</p>' + nextAction +
        '</div><button type="button" class="danger" data-delete-entry="' + escapeHTML(entry.id) +
        '" aria-label="Excluir registro do diário">Excluir</button></div>';
    }).join("");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const checked = validateJournalEntry({
      robotVersion: root.querySelector("#rbJournalRobotVersion")?.value,
      mission: root.querySelector("#rbJournalMission")?.value,
      outcome: root.querySelector("#rbJournalOutcome")?.value,
      attempts: attemptsInput.value,
      observation: root.querySelector("#rbJournalObservation")?.value,
      nextAction: root.querySelector("#rbJournalNextAction")?.value
    });
    if (!checked.ok) { report(checked.errors.join(" ")); return; }

    const next = [{ id: makeId(), createdAt: new Date().toISOString(), ...checked.value }, ...entries].slice(0, MAX_ENTRIES);
    if (!persistEntries(next)) {
      report("Não foi possível salvar no navegador. Libere espaço ou exporte e remova registros antigos.");
      return;
    }
    entries = next;
    form.reset();
    attemptsInput.value = "1";
    filter.value = "all";
    render();
    report("Teste registrado neste aparelho.");
  });

  host.addEventListener("click", (event) => {
    const target = event.target;
    const button = target instanceof Element ? target.closest("[data-delete-entry]") : null;
    if (!button) return;
    const next = entries.filter((entry) => entry.id !== button.getAttribute("data-delete-entry"));
    if (next.length === entries.length) return;
    if (!persistEntries(next)) { report("Não foi possível atualizar o diário neste navegador."); return; }
    entries = next;
    render();
    report("Registro removido.");
  });

  filter.addEventListener("change", render);

  clearButton.addEventListener("click", () => {
    if (!entries.length) return;
    if (!window.confirm("Apagar todos os registros do diário neste aparelho? Esta ação não pode ser desfeita.")) return;
    if (!persistEntries([])) { report("Não foi possível apagar o diário neste navegador."); return; }
    entries = [];
    render();
    report("Diário apagado deste aparelho.");
  });

  exportButton.addEventListener("click", () => {
    if (!entries.length) { report("Não há registros para exportar."); return; }
    const payload = { format: "rabbitech-training-journal", schemaVersion: 1, exportedAt: new Date().toISOString(), entries };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rabbitech-diario-testes-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    report("Exportação criada. O arquivo contém somente os registros locais do diário.");
  });

  render();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTrainingJournal, { once: true });
  else initTrainingJournal();
}

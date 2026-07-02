// UI wiring for tabbed generators: dropzones, file state, status,
// template buttons and create actions. Parsing/rendering stays outside.

const FILES = { tech: null, spec: null, schema: null, firePump: null };

function fmtSize(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function setFile(kind, file) {
  FILES[kind] = file || null;
  const drop = document.querySelector(`[data-drop="${kind}"]`);
  if (!drop) return;
  const prompt = drop.querySelector(".prompt");
  drop.classList.toggle("filled", !!file);
  prompt.textContent = file
    ? `${file.name} · ${fmtSize(file.size)}`
    : "Перетащите файл сюда или нажмите для выбора";
}

function wireDrop(kind) {
  const drop = document.querySelector(`[data-drop="${kind}"]`);
  if (!drop) return;
  const input = drop.querySelector("input[type=file]");
  input.addEventListener("change", () => setFile(kind, input.files[0]));
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (f) {
      input.files = e.dataTransfer.files;
      setFile(kind, f);
    }
  });
}

function setStatus(id, msg, cls = "") {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = "status " + cls;
}

function setupTabs() {
  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll("[data-panel]")];
  const activate = (name) => {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
  };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (!tab.disabled) activate(tab.dataset.tab);
    });
  });
}

export function setupUI({ onCreate, onFireCreate, onTemplate }) {
  ["tech", "spec", "schema", "firePump"].forEach(wireDrop);
  setupTabs();

  document.querySelectorAll("[data-tpl]").forEach((btn) =>
    btn.addEventListener("click", () => onTemplate(btn.dataset.tpl))
  );

  const createBtn = document.getElementById("create");
  createBtn.addEventListener("click", async () => {
    createBtn.disabled = true;
    try { await onCreate(); }
    finally { createBtn.disabled = false; }
  });

  const fireBtn = document.getElementById("fire-create");
  fireBtn.addEventListener("click", async () => {
    fireBtn.disabled = true;
    try { await onFireCreate(); }
    finally { fireBtn.disabled = false; }
  });

  return {
    files: () => FILES,
    fireFormat: () => document.querySelector('input[name="fire-format"]:checked')?.value || "docx",
    status: (msg, cls = "") => setStatus("status", msg, cls),
    fireStatus: (msg, cls = "") => setStatus("fire-status", msg, cls),
  };
}

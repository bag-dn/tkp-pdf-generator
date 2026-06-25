// UI wiring for the 3-upload form: dropzones, file state, status, template buttons.
// Pure DOM glue — no parsing or PDF logic here.

const FILES = { tech: null, spec: null, schema: null };

function fmtSize(n) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function setFile(kind, file) {
  FILES[kind] = file || null;
  const drop = document.querySelector(`[data-drop="${kind}"]`);
  const prompt = drop.querySelector(".prompt");
  drop.classList.toggle("filled", !!file);
  prompt.textContent = file
    ? `${file.name} · ${fmtSize(file.size)}`
    : "Перетащите файл сюда или нажмите для выбора";
}

function wireDrop(kind) {
  const drop = document.querySelector(`[data-drop="${kind}"]`);
  const input = drop.querySelector("input[type=file]");
  input.addEventListener("change", () => setFile(kind, input.files[0]));
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    const f = e.dataTransfer.files[0];
    if (f) { input.files = e.dataTransfer.files; setFile(kind, f); }
  });
}

export function setupUI({ onCreate, onTemplate }) {
  ["tech", "spec", "schema"].forEach(wireDrop);

  document.querySelectorAll("[data-tpl]").forEach((btn) =>
    btn.addEventListener("click", () => onTemplate(btn.dataset.tpl))
  );

  const createBtn = document.getElementById("create");
  createBtn.addEventListener("click", async () => {
    createBtn.disabled = true;
    try { await onCreate(); }
    finally { createBtn.disabled = false; }
  });

  return {
    files: () => FILES,
    status(msg, cls = "") {
      const el = document.getElementById("status");
      el.textContent = msg;
      el.className = "status " + cls;
    },
  };
}

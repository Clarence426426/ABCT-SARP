const state = {
  subjects: [],
  subject: {},
  components: [],
  students: [],
  sort: { key: "name", dir: "asc" },
  filter: "",
  submitted: false,
  lastSaved: null,
};

const gradePoints = {
  "A+": 4.3, A: 4, "A-": 3.7, "B+": 3.3, B: 3, "B-": 2.7,
  "C+": 2.3, C: 2, "C-": 1.7, "D+": 1.3, D: 1, F: 0,
};

const gradeBands = [
  [95, "A+"], [80, "A or A+"], [75, "A- or A"], [70, "B+ or A-"],
  [65, "B or B+"], [60, "B- or B"], [55, "C+ or B-"], [50, "C or C+"],
  [45, "C- or C"], [40, "D+ or C-"], [35, "D or D+"], [30, "F or D"], [0, "F"],
];

const defaultComponents = [
  { name: "Continuous Assessment", weight: 50, scheme: "Absolute Score", fullMark: 100 },
  { name: "Final Exam", weight: 50, scheme: "Absolute Score", fullMark: 100 },
];

const $ = (id) => document.getElementById(id);

function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("show");
  setTimeout(() => node.classList.remove("show"), 2800);
}

function saveToStorage() {
  state.lastSaved = new Date().toISOString();
  localStorage.setItem("abct-scoredesk-state", JSON.stringify(state));
  updateStatus();
  toast("Progress saved locally.");
}

function loadFromStorage() {
  const raw = localStorage.getItem("abct-scoredesk-state");
  if (!raw) return false;
  try {
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
    return true;
  } catch {
    return false;
  }
}

function updateStatus() {
  $("statusDot").classList.toggle("submitted", state.submitted);
  $("statusTitle").textContent = state.submitted ? "Submitted" : "Draft";
  $("statusMeta").textContent = state.lastSaved
    ? `Saved ${new Date(state.lastSaved).toLocaleString()}`
    : "No saved changes yet";
}

async function loadSubjects() {
  const response = await fetch("assets/subjects.json");
  const payload = await response.json();
  state.subjects = payload.subjects || [];
  if (!state.components.length) state.components = payload.sarpTemplateComponents || defaultComponents;
  if (!state.subject.code) {
    const initial = state.subjects.find((item) => item.code === payload.sarpTemplateSubject) || state.subjects[0];
    selectSubject(initial, false);
  }
  renderSubjectOptions();
}

function renderSubjectOptions() {
  $("subjectOptions").innerHTML = state.subjects
    .map((s) => `<option value="${escapeHtml(`${s.code} - ${s.title}`)}"></option>`)
    .join("");
}

function selectSubject(subject, resetComponents = true) {
  if (!subject) return;
  state.subject = { ...subject };
  if (resetComponents) {
    state.components = [];
    if (subject.ca > 0) state.components.push({ name: "Continuous Assessment", weight: round(subject.ca * 100), scheme: "Absolute Score", fullMark: 100 });
    if (subject.exam > 0) state.components.push({ name: "Final Exam", weight: round(subject.exam * 100), scheme: "Absolute Score", fullMark: 100 });
    if (!state.components.length) state.components = defaultComponents.map((item) => ({ ...item }));
  }
  renderAll();
}

function bindEvents() {
  document.querySelectorAll(".step").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".step").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      $(button.dataset.step).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  $("subjectSearch").addEventListener("change", (event) => {
    const code = event.target.value.split(" - ")[0].trim().toUpperCase();
    const subject = state.subjects.find((item) => item.code === code);
    if (subject) selectSubject(subject);
  });
  ["subjectCode", "subjectTitle", "subjectCredit"].forEach((id) => {
    $(id).addEventListener("input", () => {
      state.subject.code = $("subjectCode").value.trim();
      state.subject.title = $("subjectTitle").value.trim();
      state.subject.credit = Number($("subjectCredit").value) || 0;
      renderTable();
    });
  });

  $("addComponentBtn").addEventListener("click", () => {
    state.components.push({ name: "New Component", weight: 0, scheme: "Absolute Score", fullMark: 100 });
    renderComponents();
    renderTable();
  });
  $("studentFile").addEventListener("change", handleStudentFile);
  $("clearStudentsBtn").addEventListener("click", () => {
    state.students = [];
    renderAll();
  });
  $("tableFilter").addEventListener("input", (event) => {
    state.filter = event.target.value.toLowerCase();
    renderTable();
  });
  $("saveBtn").addEventListener("click", saveToStorage);
  $("submitBtn").addEventListener("click", submitFinal);
  $("exportCsvBtn").addEventListener("click", exportCsv);
  $("aiFile").addEventListener("change", handleAiFile);
  $("askAiBtn").addEventListener("click", askAi);
  $("applyAiBtn").addEventListener("click", applyAiJson);
}

function renderAll() {
  renderSubject();
  renderComponents();
  renderStudentSummary();
  renderTable();
  updateStatus();
}

function renderSubject() {
  $("subjectSearch").value = state.subject.code ? `${state.subject.code} - ${state.subject.title || ""}` : "";
  $("subjectCode").value = state.subject.code || "";
  $("subjectTitle").value = state.subject.title || "";
  $("subjectCredit").value = state.subject.credit || "";
}

function renderComponents() {
  $("componentList").innerHTML = state.components.map((component, index) => `
    <div class="component-row">
      <label>Name<input data-component="${index}" data-field="name" value="${escapeHtml(component.name)}"></label>
      <label>Weight %<input data-component="${index}" data-field="weight" type="number" min="0" max="100" step="0.01" value="${component.weight}"></label>
      <label>Full mark<input data-component="${index}" data-field="fullMark" type="number" min="1" step="0.01" value="${component.fullMark}"></label>
      <label>Scheme<select data-component="${index}" data-field="scheme">
        <option ${component.scheme === "Absolute Score" ? "selected" : ""}>Absolute Score</option>
        <option ${component.scheme === "Percentage" ? "selected" : ""}>Percentage</option>
      </select></label>
      <button class="danger" data-remove-component="${index}" type="button">Remove</button>
    </div>
  `).join("");

  $("componentList").querySelectorAll("[data-component]").forEach((input) => {
    input.addEventListener("change", updateComponent);
  });
  $("componentList").querySelectorAll("[data-remove-component]").forEach((button) => {
    button.addEventListener("click", () => {
      state.components.splice(Number(button.dataset.removeComponent), 1);
      renderComponents();
      renderTable();
    });
  });

  const total = round(state.components.reduce((sum, item) => sum + Number(item.weight || 0), 0));
  const summary = $("weightSummary");
  summary.textContent = `Total assessment weighting: ${total}%`;
  summary.className = `weight-summary ${Math.abs(total - 100) < 0.01 ? "ok" : "bad"}`;
}

function updateComponent(event) {
  const index = Number(event.target.dataset.component);
  const field = event.target.dataset.field;
  const value = ["weight", "fullMark"].includes(field) ? Number(event.target.value) || 0 : event.target.value;
  state.components[index][field] = value;
  renderComponents();
  renderTable();
}

async function handleStudentFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const rows = parseCsv(text);
  const header = rows.shift() || [];
  state.students = rows.filter((row) => row.length).map((row, index) => {
    const record = Object.fromEntries(header.map((key, i) => [key, row[i] || ""]));
    const existingScores = {};
    state.components.forEach((component) => existingScores[component.name] = "");
    return {
      no: index + 1,
      studentNo: record["Student No."] || record["Student ID"] || record["Student Number"] || "",
      name: record["Name in English"] || record.Name || "",
      chineseName: record["Name in Chinese"] === "null" ? "" : record["Name in Chinese"] || "",
      programme: record["Primary PS"] || record["Programme  PS"] || "",
      programmeTitle: record["Programme Title"] || "",
      status: record["Student Status"] || "",
      scores: existingScores,
      lecturerGrade: "",
    };
  });
  renderAll();
  toast(`Imported ${state.students.length} students.`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function renderStudentSummary() {
  $("studentCount").textContent = state.students.length;
  $("activeCount").textContent = state.students.filter((s) => s.status.toLowerCase() === "active").length;
  $("filledCount").textContent = state.students.filter((s) => Object.values(s.scores || {}).some((v) => v !== "")).length;
}

function getVisibleStudents() {
  const filtered = state.students.filter((student) => {
    const haystack = `${student.studentNo} ${student.name} ${student.programme} ${student.programmeTitle}`.toLowerCase();
    return haystack.includes(state.filter || "");
  });
  const dir = state.sort.dir === "asc" ? 1 : -1;
  return filtered.sort((a, b) => {
    const av = getSortValue(a, state.sort.key);
    const bv = getSortValue(b, state.sort.key);
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
  });
}

function getSortValue(student, key) {
  if (key === "overall") return calculateOverall(student);
  if (key === "grade") return suggestedGrade(calculateOverall(student));
  return student[key] || "";
}

function renderTable() {
  const table = $("scoreTable");
  const headerCells = [
    ["no", "No."], ["studentNo", "Student No."], ["name", "Name"], ["programme", "Programme"],
    ...state.components.map((component) => [`score:${component.name}`, `${component.name} (${component.weight}%)`]),
    ["overall", "Overall"], ["grade", "Suggested Grade"], ["lecturerGrade", "Lecturer Grade"],
  ];
  table.tHead.innerHTML = `<tr>${headerCells.map(([key, label]) => `<th><button type="button" data-sort="${escapeHtml(key)}">${escapeHtml(label)}</button></th>`).join("")}</tr>`;
  table.tHead.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort.startsWith("score:") ? "name" : button.dataset.sort;
      state.sort = { key, dir: state.sort.key === key && state.sort.dir === "asc" ? "desc" : "asc" };
      renderTable();
    });
  });

  table.tBodies[0].innerHTML = getVisibleStudents().map((student, visibleIndex) => {
    const actualIndex = state.students.indexOf(student);
    const overall = calculateOverall(student);
    const grade = suggestedGrade(overall);
    const scoreCells = state.components.map((component) => `
      <td><input type="number" min="0" step="0.01" max="${component.fullMark}" value="${student.scores?.[component.name] ?? ""}" data-score-student="${actualIndex}" data-score-component="${escapeHtml(component.name)}"></td>
    `).join("");
    return `<tr>
      <td>${visibleIndex + 1}</td>
      <td>${escapeHtml(student.studentNo)}</td>
      <td><span class="student-name">${escapeHtml(student.name)}</span><div class="muted">${escapeHtml(student.chineseName || student.status)}</div></td>
      <td>${escapeHtml(student.programme)}<div class="muted">${escapeHtml(student.programmeTitle)}</div></td>
      ${scoreCells}
      <td><strong>${Number.isFinite(overall) ? overall.toFixed(2) : ""}</strong></td>
      <td><span class="grade-pill">${escapeHtml(grade)}</span></td>
      <td><input value="${escapeHtml(student.lecturerGrade || "")}" data-grade-student="${actualIndex}" placeholder="${escapeHtml(grade)}"></td>
    </tr>`;
  }).join("");

  table.tBodies[0].querySelectorAll("[data-score-student]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const student = state.students[Number(event.target.dataset.scoreStudent)];
      student.scores[event.target.dataset.scoreComponent] = event.target.value;
      renderStudentSummary();
      renderTable();
    });
  });
  table.tBodies[0].querySelectorAll("[data-grade-student]").forEach((input) => {
    input.addEventListener("input", (event) => {
      state.students[Number(event.target.dataset.gradeStudent)].lecturerGrade = event.target.value;
    });
  });
}

function calculateOverall(student) {
  if (!state.components.length) return NaN;
  return round(state.components.reduce((sum, component) => {
    const raw = Number(student.scores?.[component.name]);
    if (!Number.isFinite(raw)) return sum;
    const fullMark = Number(component.fullMark) || 100;
    const weight = Number(component.weight) || 0;
    return sum + (raw / fullMark) * weight;
  }, 0));
}

function suggestedGrade(score) {
  if (!Number.isFinite(score)) return "";
  const rounded = Math.round(score);
  return gradeBands.find(([min]) => rounded >= min)?.[1] || "F";
}

function submitFinal() {
  const total = state.components.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (Math.abs(total - 100) >= 0.01) {
    toast("Assessment weighting must total 100% before final submission.");
    return;
  }
  state.submitted = true;
  saveToStorage();
  downloadBlob(JSON.stringify(buildSubmission(), null, 2), `${state.subject.code || "subject"}-submission.json`, "application/json");
  toast("Final submission package generated.");
}

function buildSubmission() {
  return {
    submittedAt: new Date().toISOString(),
    subject: state.subject,
    components: state.components,
    students: state.students.map((student) => {
      const overall = calculateOverall(student);
      return {
        studentNo: student.studentNo,
        name: student.name,
        programme: student.programme,
        scores: student.scores,
        overall,
        suggestedGrade: suggestedGrade(overall),
        lecturerGrade: student.lecturerGrade || suggestedGrade(overall),
      };
    }),
  };
}

function exportCsv() {
  const headers = ["Student No.", "Name", "Programme", ...state.components.map((c) => c.name), "Overall", "Suggested Grade", "Lecturer Grade"];
  const rows = state.students.map((student) => {
    const overall = calculateOverall(student);
    return [
      student.studentNo, student.name, student.programme,
      ...state.components.map((c) => student.scores?.[c.name] || ""),
      overall, suggestedGrade(overall), student.lecturerGrade || suggestedGrade(overall),
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadBlob(csv, `${state.subject.code || "scores"}-scores.csv`, "text/csv");
}

async function handleAiFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  $("docContext").value = await file.text();
}

async function askAi() {
  const key = $("apiKey").value.trim();
  if (!key) {
    toast("Enter an API key before sending to AI.");
    return;
  }
  const context = {
    subject: state.subject,
    components: state.components,
    students: state.students.slice(0, 30).map((s) => ({ studentNo: s.studentNo, name: s.name })),
    expectedJson: [{ studentNo: "24123456D", scores: Object.fromEntries(state.components.map((c) => [c.name, 0])) }],
  };
  $("aiOutput").textContent = "Sending...";
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: $("aiModel").value.trim() || "gpt-4.1-mini",
        instructions: "You help lecturers convert assessment documents and score lists into structured score-entry JSON. Return concise explanations and valid JSON when asked.",
        input: `Current scoring context:\n${JSON.stringify(context, null, 2)}\n\nDocument context:\n${$("docContext").value}\n\nUser request:\n${$("aiPrompt").value}`,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "AI request failed");
    $("aiOutput").textContent = extractOutputText(data) || JSON.stringify(data, null, 2);
  } catch (error) {
    $("aiOutput").textContent = `Error: ${error.message}`;
  }
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text)
    .join("\n");
}

function applyAiJson() {
  const text = $("aiOutput").textContent;
  const jsonText = extractJson(text);
  if (!jsonText) {
    toast("No JSON array found in AI output.");
    return;
  }
  try {
    const updates = JSON.parse(jsonText);
    let applied = 0;
    updates.forEach((update) => {
      const student = state.students.find((item) => item.studentNo === update.studentNo || item.name.toLowerCase() === String(update.name || "").toLowerCase());
      if (!student || !update.scores) return;
      Object.entries(update.scores).forEach(([component, value]) => {
        const match = state.components.find((item) => item.name.toLowerCase() === component.toLowerCase());
        if (match) student.scores[match.name] = value;
      });
      applied++;
    });
    renderAll();
    toast(`Applied AI scores for ${applied} students.`);
  } catch (error) {
    toast(`Could not parse AI JSON: ${error.message}`);
  }
}

function extractJson(text) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  return start >= 0 && end > start ? text.slice(start, end + 1) : "";
}

function downloadBlob(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[char]));
}

function round(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

async function init() {
  loadFromStorage();
  await loadSubjects();
  bindEvents();
  renderAll();
}

init().catch((error) => {
  console.error(error);
  toast("App failed to initialize.");
});

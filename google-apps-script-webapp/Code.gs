const SPREADSHEET_NAME = "ABCT SARP Submissions";

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("Index")
    .setTitle("ABCT SARP Form")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveSubmission(payload) {
  const spreadsheet = getOrCreateSpreadsheet_();
  appendSubmission_(spreadsheet, payload || {});
  appendStudents_(spreadsheet, payload || {});
  return { ok: true };
}

function getOrCreateSpreadsheet_() {
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  if (files.hasNext()) {
    return SpreadsheetApp.open(files.next());
  }
  return SpreadsheetApp.create(SPREADSHEET_NAME);
}

function appendSubmission_(spreadsheet, payload) {
  const sheet = getSheet_(spreadsheet, "Submissions", [
    "Submission ID",
    "Submitted At",
    "Subject Code",
    "Subject Title",
    "Lecturer Name",
    "Staff Number",
    "Student Count",
    "Raw JSON"
  ]);

  sheet.appendRow([
    payload.submissionId || "",
    payload.submittedAt || "",
    payload.subject?.code || "",
    payload.subject?.title || "",
    payload.lecturer?.name || "",
    payload.lecturer?.staffNumber || "",
    Array.isArray(payload.students) ? payload.students.length : 0,
    JSON.stringify(payload)
  ]);
}

function appendStudents_(spreadsheet, payload) {
  const sheet = getSheet_(spreadsheet, "Students", [
    "Submission ID",
    "Submitted At",
    "Subject Code",
    "Subject Title",
    "Lecturer Name",
    "Staff Number",
    "Student No.",
    "Name",
    "Programme",
    "Overall",
    "Suggested Grade",
    "Lecturer Grade",
    "Scores JSON"
  ]);

  const rows = (payload.students || []).map(student => [
    payload.submissionId || "",
    payload.submittedAt || "",
    payload.subject?.code || "",
    payload.subject?.title || "",
    payload.lecturer?.name || "",
    payload.lecturer?.staffNumber || "",
    student.studentNo || "",
    student.name || "",
    student.programme || "",
    student.overall || "",
    student.suggestedGrade || "",
    student.lecturerGrade || "",
    JSON.stringify(student.scores || {})
  ]);

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function getSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

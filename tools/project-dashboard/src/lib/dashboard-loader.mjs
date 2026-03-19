import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TASK_STATUSES = new Set([
  "Backlog",
  "Brief Ready",
  "Assigned",
  "In Progress",
  "Blocked",
  "Ready for Verification",
  "Verified",
  "Closed",
]);

const TRUST_LEVELS = new Set(["Not Done", "Implemented", "Verified", "Trusted", "Stale"]);
const RESULT_STATES = new Set(["Implemented", "Blocked", "Partial", "No Change"]);
const VERIFICATION_STATES = new Set(["Not Verified", "Partially Verified", "Verified"]);

const REQUIRED_TASK_BRIEF_FIELDS = [
  "id",
  "title",
  "subsystem",
  "priority",
  "owner",
  "depends_on",
  "owned_paths",
  "source_docs",
  "success_gate",
  "report_path",
];

const REQUIRED_TASK_BRIEF_SECTIONS = [
  "Objective",
  "Why Now",
  "In Scope",
  "Out of Scope",
  "Required Changes",
  "Verification Required",
  "Success Definition",
  "Open Risks",
];

const REQUIRED_REPORT_FIELDS = [
  "task_id",
  "title",
  "date",
  "agent",
  "result_state",
  "verification_state",
  "changed_paths",
];

const REQUIRED_REPORT_SECTIONS = [
  "Summary",
  "Source docs used",
  "Files changed",
  "Verification",
  "Decisions / assumptions",
  "Open questions or blockers",
  "Recommended next handoff",
];

function defaultRepoRoot() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, "../../../..");
}

function makeFileUrl(filePath) {
  return pathToFileURL(filePath).href;
}

function makeLink(rawHref, baseDir, fallbackLabel = rawHref) {
  if (!rawHref || rawHref === "—") {
    return null;
  }

  const href = rawHref.trim();
  let filePath = null;
  let fileUrl = null;

  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("file://")) {
    fileUrl = href;
  } else if (path.isAbsolute(href)) {
    filePath = href;
    fileUrl = makeFileUrl(href);
  } else {
    filePath = path.resolve(baseDir, href);
    fileUrl = makeFileUrl(filePath);
  }

  return {
    label: fallbackLabel,
    href,
    filePath,
    fileUrl,
  };
}

function stripMarkdown(text) {
  return text
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .trim();
}

function splitRow(row) {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function extractMarkdownLinks(text, baseDir) {
  const links = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (const match of text.matchAll(regex)) {
    const [, label, href] = match;
    const link = makeLink(href, baseDir, label);
    if (link) {
      links.push(link);
    }
  }

  return links;
}

function parseBullets(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => stripMarkdown(line.replace(/^[-*]\s+/, "")));
}

function parseTopLevelNumberedItems(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => stripMarkdown(line.replace(/^\d+\.\s+/, "")));
}

function extractLevelTwoSection(content, title) {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === `## ${title}`);

  if (startIndex === -1) {
    return "";
  }

  const collected = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^##\s+/.test(line)) {
      break;
    }

    collected.push(line);
  }

  return collected.join("\n").trim();
}

function parseSections(content) {
  const lines = content.split(/\r?\n/);
  const sections = new Map();
  let title = "";
  let currentSection = null;
  let buffer = [];

  const flush = () => {
    if (currentSection) {
      sections.set(currentSection, buffer.join("\n").trim());
    }
    buffer = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (!headingMatch) {
      buffer.push(line);
      continue;
    }

    const [, hashes, heading] = headingMatch;

    if (hashes.length === 1 && !title) {
      title = heading.trim();
      continue;
    }

    flush();
    currentSection = heading.trim();
  }

  flush();

  return { title, sections };
}

function parseYamlish(source) {
  const data = {};
  const errors = [];
  const lines = source.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      continue;
    }

    const fieldMatch = line.match(/^([A-Za-z0-9_]+):(?:\s*(.*))?$/);
    if (!fieldMatch) {
      errors.push(`Unsupported frontmatter line: ${rawLine}`);
      continue;
    }

    const [, key, rawValue = ""] = fieldMatch;
    const value = rawValue.trim();

    if (value === "[]") {
      data[key] = [];
      continue;
    }

    if (value) {
      data[key] = value.replace(/^['"]|['"]$/g, "");
      continue;
    }

    const items = [];
    let lookahead = index + 1;

    while (lookahead < lines.length) {
      const nextLine = lines[lookahead];
      const arrayMatch = nextLine.match(/^\s*-\s+(.*)$/);

      if (!arrayMatch) {
        break;
      }

      items.push(arrayMatch[1].trim().replace(/^['"]|['"]$/g, ""));
      lookahead += 1;
    }

    data[key] = items;
    index = lookahead - 1;
  }

  return { data, errors };
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return {
      data: {},
      body: content,
      errors: ["Missing frontmatter block"],
      hasFrontmatter: false,
    };
  }

  const endIndex = content.indexOf("\n---", 4);
  if (endIndex === -1) {
    return {
      data: {},
      body: content,
      errors: ["Unterminated frontmatter block"],
      hasFrontmatter: true,
    };
  }

  const frontmatterSource = content.slice(4, endIndex).replace(/\r/g, "");
  const body = content.slice(endIndex + 4).replace(/^\r?\n/, "");
  const { data, errors } = parseYamlish(frontmatterSource);

  return {
    data,
    body,
    errors,
    hasFrontmatter: true,
  };
}

function parseMarkdownTable(sectionText) {
  const lines = sectionText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const startIndex = lines.findIndex((line) => line.startsWith("|"));
  if (startIndex === -1 || lines.length < startIndex + 2) {
    return [];
  }

  const header = splitRow(lines[startIndex]);
  const rows = [];

  for (let index = startIndex + 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("|")) {
      break;
    }

    const cells = splitRow(line);
    const row = {};

    header.forEach((column, columnIndex) => {
      row[column] = cells[columnIndex] ?? "";
    });

    rows.push(row);
  }

  return rows;
}

async function safeReadFile(filePath, warnings, label) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    warnings.push(`${label} is missing: ${filePath}`);
    return null;
  }
}

async function listMarkdownFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "README.md")
      .map((entry) => path.join(dirPath, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function normalizeDependsOn(value) {
  if (!value || value === "—") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeArrayField(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return [String(value)];
}

function getSectionText(sections, sectionName) {
  return sections.get(sectionName)?.trim() ?? "";
}

async function parseTaskBrief(filePath, warnings, repoRoot) {
  const content = await safeReadFile(filePath, warnings, "Task brief");
  if (!content) {
    return null;
  }

  const { data, body, errors } = parseFrontmatter(content);
  const { sections } = parseSections(body);
  const relativePath = path.relative(repoRoot, filePath);
  const localWarnings = [];

  for (const error of errors) {
    localWarnings.push(`${relativePath}: ${error}`);
  }

  for (const field of REQUIRED_TASK_BRIEF_FIELDS) {
    if (!(field in data)) {
      localWarnings.push(`${relativePath}: missing frontmatter field \`${field}\``);
    }
  }

  for (const sectionName of REQUIRED_TASK_BRIEF_SECTIONS) {
    if (!sections.has(sectionName)) {
      localWarnings.push(`${relativePath}: missing section \`${sectionName}\``);
    }
  }

  warnings.push(...localWarnings);

  return {
    id: data.id ?? "",
    title: data.title ?? path.basename(filePath, ".md"),
    subsystem: data.subsystem ?? "",
    priority: data.priority ?? "",
    owner: data.owner ?? "",
    dependsOn: normalizeDependsOn(data.depends_on),
    ownedPaths: normalizeArrayField(data.owned_paths),
    sourceDocs: normalizeArrayField(data.source_docs),
    successGate: data.success_gate ?? "",
    reportPath: data.report_path ?? "",
    reportFileUrl: data.report_path ? makeFileUrl(path.resolve(repoRoot, data.report_path)) : null,
    objective: getSectionText(sections, "Objective"),
    whyNow: getSectionText(sections, "Why Now"),
    inScope: getSectionText(sections, "In Scope"),
    outOfScope: getSectionText(sections, "Out of Scope"),
    requiredChanges: getSectionText(sections, "Required Changes"),
    verificationRequired: getSectionText(sections, "Verification Required"),
    successDefinition: getSectionText(sections, "Success Definition"),
    openRisks: getSectionText(sections, "Open Risks"),
    filePath,
    fileUrl: makeFileUrl(filePath),
  };
}

async function parseReport(filePath, warnings, repoRoot) {
  const content = await safeReadFile(filePath, warnings, "Agent report");
  if (!content) {
    return null;
  }

  const { data, body, errors } = parseFrontmatter(content);
  const { sections } = parseSections(body);
  const relativePath = path.relative(repoRoot, filePath);
  const localWarnings = [];

  for (const error of errors) {
    localWarnings.push(`${relativePath}: ${error}`);
  }

  for (const field of REQUIRED_REPORT_FIELDS) {
    if (!(field in data)) {
      localWarnings.push(`${relativePath}: missing frontmatter field \`${field}\``);
    }
  }

  if (data.result_state && !RESULT_STATES.has(data.result_state)) {
    localWarnings.push(`${relativePath}: invalid result_state \`${data.result_state}\``);
  }

  if (data.verification_state && !VERIFICATION_STATES.has(data.verification_state)) {
    localWarnings.push(`${relativePath}: invalid verification_state \`${data.verification_state}\``);
  }

  for (const sectionName of REQUIRED_REPORT_SECTIONS) {
    if (!sections.has(sectionName)) {
      localWarnings.push(`${relativePath}: missing section \`${sectionName}\``);
    }
  }

  warnings.push(...localWarnings);

  return {
    id: path.basename(filePath, ".md"),
    taskId: data.task_id ?? "",
    title: data.title ?? path.basename(filePath, ".md"),
    date: data.date ?? "",
    agent: data.agent ?? "",
    resultState: data.result_state ?? "",
    verificationState: data.verification_state ?? "",
    changedPaths: normalizeArrayField(data.changed_paths),
    summary: getSectionText(sections, "Summary"),
    sourceDocsUsed: getSectionText(sections, "Source docs used"),
    filesChanged: getSectionText(sections, "Files changed"),
    verification: getSectionText(sections, "Verification"),
    decisions: getSectionText(sections, "Decisions / assumptions"),
    openQuestions: getSectionText(sections, "Open questions or blockers"),
    nextHandoff: getSectionText(sections, "Recommended next handoff"),
    filePath,
    fileUrl: makeFileUrl(filePath),
  };
}

async function parseMainPlan(filePath, warnings) {
  const content = await safeReadFile(filePath, warnings, "Main plan");
  if (!content) {
    return {
      title: "AddOne Main Plan",
      currentPhase: [],
      workstreamSummary: [],
      sourceOfTruthLinks: [],
    };
  }

  const { title, sections } = parseSections(content);
  const currentPhase = parseBullets(sections.get("Current Phase") ?? "");
  const workstreamSummary = parseTopLevelNumberedItems(sections.get("Main Plan") ?? "");
  const sourceOfTruthLinks = extractMarkdownLinks(extractLevelTwoSection(content, "Source Of Truth Map"), path.dirname(filePath));

  if (currentPhase.length === 0) {
    warnings.push("Docs/AddOne_Main_Plan.md: missing `Current Phase` bullets");
  }

  return {
    title: title || "AddOne Main Plan",
    currentPhase,
    workstreamSummary,
    sourceOfTruthLinks,
  };
}

async function parseActiveWork(filePath, warnings) {
  const content = await safeReadFile(filePath, warnings, "Active work registry");
  if (!content) {
    return { workstreams: [], taskRows: [] };
  }

  const { sections } = parseSections(content);
  const workstreamRows = parseMarkdownTable(sections.get("Workstream Trust") ?? "");
  const taskRows = parseMarkdownTable(sections.get("Task Registry") ?? "");

  const workstreams = workstreamRows.map((row) => {
    const workstream = stripMarkdown(row.Workstream ?? "");
    const trust = stripMarkdown(row.Trust ?? "");

    if (trust && !TRUST_LEVELS.has(trust)) {
      warnings.push(`Docs/Active_Work.md: invalid trust level \`${trust}\` for workstream \`${workstream}\``);
    }

    return {
      workstream,
      trust,
      summary: stripMarkdown(row.Summary ?? ""),
      owner: stripMarkdown(row.Owner ?? ""),
      notes: stripMarkdown(row.Notes ?? ""),
    };
  });

  const taskRowsNormalized = taskRows.map((row) => {
    const id = stripMarkdown(row["Task ID"] ?? "");
    const status = stripMarkdown(row.Status ?? "");
    if (status && !TASK_STATUSES.has(status)) {
      warnings.push(`Docs/Active_Work.md: invalid task status \`${status}\` for \`${id}\``);
    }

    const taskBriefLink = extractMarkdownLinks(row["Task Brief"] ?? "", path.dirname(filePath))[0] ?? null;
    const latestReportLink = extractMarkdownLinks(row["Latest Report"] ?? "", path.dirname(filePath))[0] ?? null;

    return {
      id,
      title: stripMarkdown(row.Title ?? ""),
      subsystem: stripMarkdown(row.Subsystem ?? ""),
      status,
      owner: stripMarkdown(row.Owner ?? ""),
      dependsOn: normalizeDependsOn(stripMarkdown(row["Depends On"] ?? "")),
      taskBriefLink,
      latestReportLink,
      successGate: stripMarkdown(row["Success Gate"] ?? ""),
      nextCoordinatorAction: stripMarkdown(row["Next Coordinator Action"] ?? ""),
    };
  });

  return {
    workstreams,
    taskRows: taskRowsNormalized,
  };
}

function countBy(items, accessor) {
  return items.reduce((accumulator, item) => {
    const key = accessor(item);
    if (!key) {
      return accumulator;
    }

    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function sortReportsDescending(reports) {
  return [...reports].sort((left, right) => right.date.localeCompare(left.date));
}

export async function loadDashboardData({ repoRoot = defaultRepoRoot() } = {}) {
  const warnings = [];
  const docsDir = path.join(repoRoot, "Docs");
  const tasksDir = path.join(docsDir, "tasks");
  const reportsDir = path.join(docsDir, "agent-reports");

  const [mainPlan, activeWork, taskFiles, reportFiles] = await Promise.all([
    parseMainPlan(path.join(docsDir, "AddOne_Main_Plan.md"), warnings),
    parseActiveWork(path.join(docsDir, "Active_Work.md"), warnings),
    listMarkdownFiles(tasksDir),
    listMarkdownFiles(reportsDir),
  ]);

  const [taskBriefs, reports] = await Promise.all([
    Promise.all(taskFiles.map((filePath) => parseTaskBrief(filePath, warnings, repoRoot))),
    Promise.all(reportFiles.map((filePath) => parseReport(filePath, warnings, repoRoot))),
  ]);

  const briefById = new Map(taskBriefs.filter(Boolean).map((brief) => [brief.id, brief]));
  const reportByPath = new Map(reports.filter(Boolean).map((report) => [report.filePath, report]));
  const reportMapByTask = new Map();

  for (const report of reports.filter(Boolean)) {
    const existing = reportMapByTask.get(report.taskId) ?? [];
    existing.push(report);
    reportMapByTask.set(report.taskId, existing);
  }

  const tasks = await Promise.all(activeWork.taskRows.map(async (taskRow) => {
    const brief = briefById.get(taskRow.id) ?? null;

    if (!brief) {
      warnings.push(`Docs/Active_Work.md: task \`${taskRow.id}\` has no matching brief in Docs/tasks`);
    } else if (taskRow.taskBriefLink?.filePath && brief.filePath !== taskRow.taskBriefLink.filePath) {
      warnings.push(`Docs/Active_Work.md: task \`${taskRow.id}\` registry brief link does not match the discovered task brief file`);
    }

    const linkedReports = sortReportsDescending(reportMapByTask.get(taskRow.id) ?? []);
    let latestReport = linkedReports[0] ?? null;

    if (taskRow.latestReportLink?.filePath) {
      latestReport = reportByPath.get(taskRow.latestReportLink.filePath) ?? latestReport;

      try {
        await fs.access(taskRow.latestReportLink.filePath);
      } catch {
        warnings.push(`Docs/Active_Work.md: latest report link for \`${taskRow.id}\` points to a missing file`);
      }
    }

    if (brief && brief.id && brief.id !== taskRow.id) {
      warnings.push(`Task brief mismatch: registry task \`${taskRow.id}\` points to brief \`${brief.id}\``);
    }

    const dependsOn = brief?.dependsOn.length ? brief.dependsOn : taskRow.dependsOn;

    return {
      id: taskRow.id,
      title: taskRow.title,
      subsystem: taskRow.subsystem,
      status: taskRow.status,
      owner: taskRow.owner,
      dependsOn,
      taskBriefLink: taskRow.taskBriefLink,
      latestReportLink: taskRow.latestReportLink,
      successGate: taskRow.successGate,
      nextCoordinatorAction: taskRow.nextCoordinatorAction,
      brief,
      reports: linkedReports,
      latestReport,
    };
  }));

  for (const brief of taskBriefs.filter(Boolean)) {
    if (!tasks.find((task) => task.id === brief.id)) {
      warnings.push(`Docs/tasks/${path.basename(brief.filePath)} exists but is not registered in Docs/Active_Work.md`);
    }
  }

  const sortedReports = sortReportsDescending(reports.filter(Boolean));
  const activeTask = tasks.find((task) => task.status === "In Progress") ?? tasks.find((task) => task.status === "Assigned") ?? null;
  const blockers = tasks.filter((task) => task.status === "Blocked");
  const needsCoordinatorAction = tasks.filter((task) =>
    ["Brief Ready", "Blocked", "Ready for Verification", "Verified"].includes(task.status) && task.nextCoordinatorAction,
  );

  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    repoRootUrl: makeFileUrl(repoRoot),
    repoReadme: {
      label: "README.md",
      href: "README.md",
      filePath: path.join(repoRoot, "README.md"),
      fileUrl: makeFileUrl(path.join(repoRoot, "README.md")),
    },
    mainPlan,
    workstreams: activeWork.workstreams,
    tasks,
    reports: sortedReports,
    warnings,
    countsByStatus: countBy(tasks, (task) => task.status),
    countsByTrust: countBy(activeWork.workstreams, (workstream) => workstream.trust),
    activeTask,
    blockers,
    latestReports: sortedReports.slice(0, 5),
    needsCoordinatorAction,
  };
}

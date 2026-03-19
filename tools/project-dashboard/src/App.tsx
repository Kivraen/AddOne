import { useMemo, useState } from "react";

import dashboardData from "./generated/dashboard-data";

import type { DashboardData, ReportRecord, TaskRecord } from "./types";

type View = "overview" | "board" | "task" | "reports";

const BOARD_COLUMNS = [
  { key: "Brief Ready", title: "Brief Ready", statuses: ["Brief Ready"] },
  { key: "Assigned / In Progress", title: "Assigned / In Progress", statuses: ["Assigned", "In Progress"] },
  { key: "Blocked", title: "Blocked", statuses: ["Blocked"] },
  { key: "Ready for Verification", title: "Ready for Verification", statuses: ["Ready for Verification"] },
  { key: "Verified / Closed", title: "Verified / Closed", statuses: ["Verified", "Closed"] },
] as const;

function stripTicks(value: string) {
  return value.replace(/`/g, "");
}

function toSegments(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const segments: Array<{ type: "list" | "paragraph"; items: string[] }> = [];
  let listBuffer: string[] = [];
  let paragraphBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      segments.push({ type: "list", items: listBuffer });
      listBuffer = [];
    }
  };

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      segments.push({ type: "paragraph", items: [paragraphBuffer.join(" ")] });
      paragraphBuffer = [];
    }
  };

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/);

    if (bulletMatch) {
      flushParagraph();
      listBuffer.push(stripTicks(bulletMatch[1].trim()));
      continue;
    }

    if (line.startsWith("|")) {
      flushParagraph();
      flushList();
      segments.push({ type: "paragraph", items: [stripTicks(line)] });
      continue;
    }

    flushList();
    paragraphBuffer.push(stripTicks(line.trim()));
  }

  flushParagraph();
  flushList();

  return segments;
}

function ContentBlock({ text }: { text: string }) {
  const segments = toSegments(text);

  if (segments.length === 0) {
    return <p className="muted">Nothing recorded yet.</p>;
  }

  return (
    <div className="content-block">
      {segments.map((segment, index) =>
        segment.type === "list" ? (
          <ul key={`${segment.type}-${index}`} className="content-list">
            {segment.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          segment.items.map((item) => (
            <p key={`${segment.type}-${index}-${item.slice(0, 24)}`} className="content-paragraph">
              {item}
            </p>
          ))
        ),
      )}
    </div>
  );
}

function StatusChip({ value }: { value: string }) {
  const tone = value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <span className={`chip chip-${tone}`}>{value}</span>;
}

function LinkText({ label, href }: { label: string; href: string }) {
  return (
    <a className="inline-link" href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <article className={`stat-card${accent ? ` accent-${accent}` : ""}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </article>
  );
}

function TaskCard({
  task,
  onOpen,
}: {
  task: TaskRecord;
  onOpen: (taskId: string) => void;
}) {
  return (
    <button className="task-card" type="button" onClick={() => onOpen(task.id)}>
      <div className="task-card-head">
        <div>
          <div className="eyebrow">{task.id}</div>
          <h4>{task.title}</h4>
        </div>
        <StatusChip value={task.status} />
      </div>
      <p className="task-meta">
        {task.subsystem} · {task.owner}
      </p>
      <p className="task-success">{task.successGate}</p>
      <div className="task-foot">
        <span>{task.dependsOn.length > 0 ? `Depends on ${task.dependsOn.join(", ")}` : "No dependencies"}</span>
        <span>
          {task.latestReport
            ? `${task.latestReport.resultState} · ${task.latestReport.verificationState}`
            : "No report yet"}
        </span>
      </div>
    </button>
  );
}

function DetailSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="detail-section">
      <h4>{title}</h4>
      <ContentBlock text={text} />
    </section>
  );
}

function TaskDetailView({ task }: { task: TaskRecord | null }) {
  if (!task) {
    return (
      <section className="empty-state">
        <h3>No task selected</h3>
        <p>Select a task from Overview or Active Work to inspect the full brief and linked reports.</p>
      </section>
    );
  }

  if (!task.brief) {
    return (
      <section className="empty-state">
        <h3>Malformed task brief</h3>
        <p>The registry points to {task.id}, but the dashboard could not load a valid task brief for it.</p>
      </section>
    );
  }

  const { brief } = task;

  return (
    <div className="detail-layout">
      <section className="panel detail-header">
        <div className="detail-title-row">
          <div>
            <div className="eyebrow">{task.id}</div>
            <h2>{task.title}</h2>
          </div>
          <div className="detail-chip-row">
            <StatusChip value={task.status} />
            <StatusChip value={brief.priority} />
          </div>
        </div>
        <div className="detail-metadata">
          <span>Subsystem: {task.subsystem}</span>
          <span>Owner: {task.owner}</span>
          <span>Depends on: {task.dependsOn.length > 0 ? task.dependsOn.join(", ") : "None"}</span>
        </div>
        <div className="detail-links">
          {brief.fileUrl ? <LinkText label="Open task brief" href={brief.fileUrl} /> : null}
          {brief.reportFileUrl ? <LinkText label="Planned report path" href={brief.reportFileUrl} /> : null}
        </div>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <DetailSection title="Objective" text={brief.objective} />
          <DetailSection title="Why Now" text={brief.whyNow} />
          <DetailSection title="In Scope" text={brief.inScope} />
          <DetailSection title="Out of Scope" text={brief.outOfScope} />
        </section>

        <section className="panel">
          <DetailSection title="Required Changes" text={brief.requiredChanges} />
          <DetailSection title="Verification Required" text={brief.verificationRequired} />
          <DetailSection title="Success Definition" text={brief.successDefinition} />
          <DetailSection title="Open Risks" text={brief.openRisks} />
        </section>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <h3>Owned Files</h3>
          {brief.ownedPaths.length > 0 ? (
            <ul className="content-list">
              {brief.ownedPaths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No owned paths recorded.</p>
          )}
        </section>

        <section className="panel">
          <h3>Source Docs</h3>
          {brief.sourceDocs.length > 0 ? (
            <ul className="content-list">
              {brief.sourceDocs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No source docs recorded.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="split-heading">
          <h3>Linked Reports</h3>
          <p className="muted">{task.nextCoordinatorAction}</p>
        </div>
        {task.reports.length === 0 ? (
          <div className="empty-inline">
            <p>No reports have been filed for this task yet.</p>
          </div>
        ) : (
          <div className="report-list">
            {task.reports.map((report) => (
              <article key={report.id} className="report-card">
                <div className="report-card-head">
                  <div>
                    <div className="eyebrow">{report.taskId}</div>
                    <h4>{report.title}</h4>
                  </div>
                  <div className="report-chip-row">
                    <StatusChip value={report.resultState} />
                    <StatusChip value={report.verificationState} />
                  </div>
                </div>
                <p className="task-meta">
                  {report.date} · {report.agent}
                </p>
                <ContentBlock text={report.summary} />
                <div className="detail-links">
                  <LinkText label="Open report" href={report.fileUrl} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OverviewView({
  data,
  onOpenTask,
}: {
  data: DashboardData;
  onOpenTask: (taskId: string) => void;
}) {
  const currentPhase = data.mainPlan.currentPhase.join(" ");

  return (
    <div className="view-stack">
      <section className="hero panel">
        <div>
          <div className="eyebrow">Coordination Dashboard</div>
          <h1>{data.mainPlan.title}</h1>
          <p className="hero-copy">{currentPhase || "Current phase is not recorded in the main plan."}</p>
        </div>
        <div className="hero-stats">
          <StatCard label="Tasks" value={data.tasks.length} accent="blue" />
          <StatCard
            label="Active"
            value={data.activeTask ? data.activeTask.id : "None"}
            accent={data.activeTask ? "green" : "neutral"}
          />
          <StatCard label="Blockers" value={data.blockers.length} accent={data.blockers.length ? "rose" : "neutral"} />
        </div>
      </section>

      <div className="overview-grid">
        <section className="panel">
          <div className="split-heading">
            <h2>Top Workstreams</h2>
            <p className="muted">Trust labels are coordinator-owned.</p>
          </div>
          <div className="workstream-list">
            {data.workstreams.length === 0 ? (
              <div className="empty-inline">
                <p>No workstreams recorded in `Docs/Active_Work.md` yet.</p>
              </div>
            ) : (
              data.workstreams.map((workstream) => (
                <article key={workstream.workstream} className="workstream-card">
                  <div className="workstream-head">
                    <h3>{workstream.workstream}</h3>
                    <StatusChip value={workstream.trust} />
                  </div>
                  <p>{workstream.summary}</p>
                  <p className="muted">{workstream.notes}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Counts By Task Status</h2>
          <div className="metric-grid">
            {Object.keys(data.countsByStatus).length === 0 ? (
              <div className="empty-inline">
                <p>No active work has been registered yet.</p>
              </div>
            ) : (
              Object.entries(data.countsByStatus).map(([label, value]) => (
                <StatCard key={label} label={label} value={value} />
              ))
            )}
          </div>
          <h2 className="section-space">Counts By Trust</h2>
          <div className="metric-grid">
            {Object.keys(data.countsByTrust).length === 0 ? (
              <div className="empty-inline">
                <p>No trust classifications have been recorded yet.</p>
              </div>
            ) : (
              Object.entries(data.countsByTrust).map(([label, value]) => (
                <StatCard key={label} label={label} value={value} />
              ))
            )}
          </div>
        </section>
      </div>

      <div className="overview-grid">
        <section className="panel">
          <div className="split-heading">
            <h2>Current Active Task</h2>
            <p className="muted">First `In Progress`, then `Assigned`.</p>
          </div>
          {data.activeTask ? (
            <TaskCard task={data.activeTask} onOpen={onOpenTask} />
          ) : (
            <div className="empty-inline">
              <p>No task is currently `Assigned` or `In Progress`.</p>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="split-heading">
            <h2>Needs Coordinator Action</h2>
            <p className="muted">Queued from the live task registry.</p>
          </div>
          {data.needsCoordinatorAction.length === 0 ? (
            <div className="empty-inline">
              <p>No immediate coordinator actions are recorded.</p>
            </div>
          ) : (
            <div className="stack-list">
              {data.needsCoordinatorAction.map((task) => (
                <button key={task.id} className="list-row" type="button" onClick={() => onOpenTask(task.id)}>
                  <div>
                    <div className="eyebrow">{task.id}</div>
                    <strong>{task.title}</strong>
                  </div>
                  <span>{task.nextCoordinatorAction}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="overview-grid">
        <section className="panel">
          <div className="split-heading">
            <h2>Latest Reports</h2>
            <p className="muted">Newest five handoffs.</p>
          </div>
          {data.latestReports.length === 0 ? (
            <div className="empty-inline">
              <p>No reports have been filed yet.</p>
            </div>
          ) : (
            <div className="report-list">
              {data.latestReports.map((report) => (
                <article key={report.id} className="report-card compact">
                  <div className="report-card-head">
                    <div>
                      <div className="eyebrow">
                        {report.taskId} · {report.date}
                      </div>
                      <h4>{report.title}</h4>
                    </div>
                    <div className="report-chip-row">
                      <StatusChip value={report.resultState} />
                      <StatusChip value={report.verificationState} />
                    </div>
                  </div>
                  <p className="task-meta">{report.agent}</p>
                  <ContentBlock text={report.summary} />
                  <div className="detail-links">
                    <LinkText label="Open report" href={report.fileUrl} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="split-heading">
            <h2>Blockers</h2>
            <p className="muted">Tasks currently marked `Blocked`.</p>
          </div>
          {data.blockers.length === 0 ? (
            <div className="empty-inline">
              <p>No blockers recorded right now.</p>
            </div>
          ) : (
            <div className="stack-list">
              {data.blockers.map((task) => (
                <button key={task.id} className="list-row" type="button" onClick={() => onOpenTask(task.id)}>
                  <div>
                    <div className="eyebrow">{task.id}</div>
                    <strong>{task.title}</strong>
                  </div>
                  <span>{task.nextCoordinatorAction}</span>
                </button>
              ))}
            </div>
          )}

          <h2 className="section-space">Source Of Truth</h2>
          <div className="stack-list link-list">
            <a className="list-row" href={data.repoReadme.fileUrl ?? data.repoReadme.href} target="_blank" rel="noreferrer">
              <div>
                <div className="eyebrow">Repo</div>
                <strong>{data.repoReadme.label}</strong>
              </div>
              <span>{data.repoReadme.filePath ?? data.repoReadme.href}</span>
            </a>
            {data.mainPlan.sourceOfTruthLinks.map((link) => (
              <a key={`${link.label}-${link.href}`} className="list-row" href={link.fileUrl ?? link.href} target="_blank" rel="noreferrer">
                <div>
                  <div className="eyebrow">Doc</div>
                  <strong>{link.label}</strong>
                </div>
                <span>{link.filePath ?? link.href}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ActiveWorkView({
  data,
  onOpenTask,
}: {
  data: DashboardData;
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <div className="board-grid">
      {BOARD_COLUMNS.map((column) => {
        const tasks = data.tasks.filter((task) => column.statuses.some((status) => status === task.status));

        return (
          <section key={column.key} className="board-column panel">
            <div className="split-heading">
              <h2>{column.title}</h2>
              <StatusChip value={String(tasks.length)} />
            </div>
            {tasks.length === 0 ? (
              <div className="empty-inline">
                <p>No tasks in this column.</p>
              </div>
            ) : (
              <div className="board-column-stack">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ReportFilters({
  taskId,
  setTaskId,
  subsystem,
  setSubsystem,
  agent,
  setAgent,
  verificationState,
  setVerificationState,
  tasks,
  reports,
}: {
  taskId: string;
  setTaskId: (value: string) => void;
  subsystem: string;
  setSubsystem: (value: string) => void;
  agent: string;
  setAgent: (value: string) => void;
  verificationState: string;
  setVerificationState: (value: string) => void;
  tasks: TaskRecord[];
  reports: ReportRecord[];
}) {
  const taskOptions = Array.from(new Set(tasks.map((task) => task.id)));
  const subsystemOptions = Array.from(new Set(tasks.map((task) => task.subsystem)));
  const agentOptions = Array.from(new Set(reports.map((report) => report.agent)));
  const verificationOptions = Array.from(new Set(reports.map((report) => report.verificationState)));

  return (
    <div className="filters">
      <label>
        Task
        <select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
          <option value="">All</option>
          {taskOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Subsystem
        <select value={subsystem} onChange={(event) => setSubsystem(event.target.value)}>
          <option value="">All</option>
          {subsystemOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Agent
        <select value={agent} onChange={(event) => setAgent(event.target.value)}>
          <option value="">All</option>
          {agentOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Verification
        <select value={verificationState} onChange={(event) => setVerificationState(event.target.value)}>
          <option value="">All</option>
          {verificationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function ReportsView({
  data,
  onOpenTask,
}: {
  data: DashboardData;
  onOpenTask: (taskId: string) => void;
}) {
  const [taskId, setTaskId] = useState("");
  const [subsystem, setSubsystem] = useState("");
  const [agent, setAgent] = useState("");
  const [verificationState, setVerificationState] = useState("");

  const filteredReports = useMemo(() => {
    return data.reports.filter((report) => {
      const task = data.tasks.find((item) => item.id === report.taskId);

      if (taskId && report.taskId !== taskId) {
        return false;
      }

      if (subsystem && task?.subsystem !== subsystem) {
        return false;
      }

      if (agent && report.agent !== agent) {
        return false;
      }

      if (verificationState && report.verificationState !== verificationState) {
        return false;
      }

      return true;
    });
  }, [agent, data.reports, data.tasks, subsystem, taskId, verificationState]);

  return (
    <div className="view-stack">
      <section className="panel">
        <div className="split-heading">
          <h2>Reports</h2>
          <p className="muted">Reverse chronological handoffs across task work.</p>
        </div>
        <ReportFilters
          taskId={taskId}
          setTaskId={setTaskId}
          subsystem={subsystem}
          setSubsystem={setSubsystem}
          agent={agent}
          setAgent={setAgent}
          verificationState={verificationState}
          setVerificationState={setVerificationState}
          tasks={data.tasks}
          reports={data.reports}
        />
      </section>

      <section className="panel">
        {filteredReports.length === 0 ? (
          <section className="empty-state">
            <h3>No reports found</h3>
            <p>Try widening the filters or wait for the next agent handoff.</p>
          </section>
        ) : (
          <div className="report-list">
            {filteredReports.map((report) => {
              const task = data.tasks.find((item) => item.id === report.taskId);
              return (
                <article key={report.id} className="report-card">
                  <div className="report-card-head">
                    <div>
                      <div className="eyebrow">
                        {report.taskId} · {report.date}
                      </div>
                      <h3>{report.title}</h3>
                    </div>
                    <div className="report-chip-row">
                      <StatusChip value={report.resultState} />
                      <StatusChip value={report.verificationState} />
                    </div>
                  </div>
                  <p className="task-meta">
                    {task?.subsystem ?? "Unknown subsystem"} · {report.agent}
                  </p>
                  <ContentBlock text={report.summary} />
                  <div className="changed-paths">
                    {report.changedPaths.map((item) => (
                      <span key={item} className="path-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="detail-links">
                    <LinkText label="Open report" href={report.fileUrl} />
                    {task ? (
                      <button className="ghost-link" type="button" onClick={() => onOpenTask(task.id)}>
                        Open task
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const VIEW_OPTIONS: Array<{ key: View; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "board", label: "Active Work" },
  { key: "task", label: "Task Detail" },
  { key: "reports", label: "Reports" },
];

export default function App() {
  const data: DashboardData = dashboardData;
  const [view, setView] = useState<View>("overview");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(data.activeTask?.id ?? data.tasks[0]?.id ?? null);

  const selectedTask = useMemo(
    () => data.tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, data.tasks],
  );

  const openTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setView("task");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <div className="eyebrow">AddOne Internal</div>
          <h1>Project Dashboard</h1>
        </div>
        <div className="header-meta">
          <span>Generated {new Date(data.generatedAt).toLocaleString()}</span>
          <a className="inline-link" href={data.repoRootUrl} target="_blank" rel="noreferrer">
            Open repo root
          </a>
        </div>
      </header>

      <nav className="view-nav" aria-label="Dashboard views">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.key}
            className={option.key === view ? "nav-pill active" : "nav-pill"}
            type="button"
            onClick={() => setView(option.key)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {data.warnings.length > 0 ? (
        <section className="warning-strip">
          <div className="warning-head">
            <strong>Warnings</strong>
            <span>{data.warnings.length}</span>
          </div>
          <div className="warning-list">
            {data.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </section>
      ) : null}

      <main className="app-main">
        {view === "overview" ? <OverviewView data={data} onOpenTask={openTask} /> : null}
        {view === "board" ? <ActiveWorkView data={data} onOpenTask={openTask} /> : null}
        {view === "task" ? <TaskDetailView task={selectedTask} /> : null}
        {view === "reports" ? <ReportsView data={data} onOpenTask={openTask} /> : null}
      </main>
    </div>
  );
}

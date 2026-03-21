export type TaskStatus =
  | "Backlog"
  | "Brief Ready"
  | "Assigned"
  | "In Progress"
  | "Blocked"
  | "Ready for Verification"
  | "Verified"
  | "Closed";

export type TrustLevel = "Not Done" | "Implemented" | "Verified" | "Trusted" | "Stale";

export type ReportResultState = "Implemented" | "Blocked" | "Partial" | "No Change";

export type ReportVerificationState = "Not Verified" | "Partially Verified" | "Verified";

export interface DashboardLink {
  label: string;
  href: string;
  filePath: string | null;
  fileUrl: string | null;
}

export interface Workstream {
  workstream: string;
  trust: TrustLevel | string;
  summary: string;
  owner: string;
  notes: string;
}

export interface ReportRecord {
  id: string;
  taskId: string;
  title: string;
  date: string;
  agent: string;
  resultState: ReportResultState | string;
  verificationState: ReportVerificationState | string;
  changedPaths: string[];
  summary: string;
  sourceDocsUsed: string;
  filesChanged: string;
  verification: string;
  decisions: string;
  openQuestions: string;
  nextHandoff: string;
  filePath: string;
  fileUrl: string;
}

export interface TaskBriefData {
  id: string;
  title: string;
  subsystem: string;
  priority: string;
  owner: string;
  dependsOn: string[];
  ownedPaths: string[];
  sourceDocs: string[];
  successGate: string;
  reportPath: string;
  reportFileUrl: string | null;
  objective: string;
  whyNow: string;
  inScope: string;
  outOfScope: string;
  requiredChanges: string;
  verificationRequired: string;
  successDefinition: string;
  openRisks: string;
  filePath: string;
  fileUrl: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  subsystem: string;
  status: TaskStatus | string;
  owner: string;
  dependsOn: string[];
  taskBriefLink: DashboardLink | null;
  latestReportLink: DashboardLink | null;
  successGate: string;
  nextCoordinatorAction: string;
  brief: TaskBriefData | null;
  reports: ReportRecord[];
  latestReport: ReportRecord | null;
}

export interface MainPlanSummary {
  title: string;
  currentPhase: string[];
  workstreamSummary: string[];
  sourceOfTruthLinks: DashboardLink[];
}

export interface DashboardData {
  generatedAt: string;
  repoRoot: string;
  repoRootUrl: string;
  repoReadme: DashboardLink;
  mainPlan: MainPlanSummary;
  workstreams: Workstream[];
  tasks: TaskRecord[];
  reports: ReportRecord[];
  warnings: string[];
  countsByStatus: Record<string, number>;
  countsByTrust: Record<string, number>;
  activeTask: TaskRecord | null;
  blockers: TaskRecord[];
  latestReports: ReportRecord[];
  needsCoordinatorAction: TaskRecord[];
}

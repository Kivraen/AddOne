const bootstrap = window.__FACTORY_STATION_BOOTSTRAP__ ?? {};

const state = {
  apiToken: bootstrap.apiToken || "",
  ambientBright: null,
  ambientDark: null,
  buttonSeen: {
    long: false,
    short: false,
  },
  config: null,
  latestState: null,
  serialAutoFollow: true,
  serialText: "",
  rtcBaselineEpoch: null,
  rtcReadbackEpoch: null,
  rtcStatus: null,
};

const els = {
  ambientBrightButton: document.querySelector("#ambient-bright-button"),
  ambientBrightValue: document.querySelector("#ambient-bright-value"),
  ambientDarkButton: document.querySelector("#ambient-dark-button"),
  ambientDarkValue: document.querySelector("#ambient-dark-value"),
  ambientDeltaValue: document.querySelector("#ambient-delta-value"),
  bootApSsid: document.querySelector("#boot-ap-ssid"),
  bootFirmwareVersion: document.querySelector("#boot-firmware-version"),
  bootHardwareUid: document.querySelector("#boot-hardware-uid"),
  bootPendingClaim: document.querySelector("#boot-pending-claim"),
  bootQaArmed: document.querySelector("#boot-qa-armed"),
  bootReady: document.querySelector("#boot-ready"),
  bootResetEpoch: document.querySelector("#boot-reset-epoch"),
  bootState: document.querySelector("#boot-state"),
  buildNotes: document.querySelector("#build-notes"),
  buttonLongSeen: document.querySelector("#button-long-seen"),
  buttonShortSeen: document.querySelector("#button-short-seen"),
  buttonTestButton: document.querySelector("#button-test-button"),
  finalResetButton: document.querySelector("#final-reset-button"),
  flashButton: document.querySelector("#flash-button"),
  manifestPill: document.querySelector("#manifest-pill"),
  nextStepBanner: document.querySelector("#next-step-banner"),
  orderNumber: document.querySelector("#order-number"),
  boardNextStep: document.querySelector("#board-next-step"),
  portSelect: document.querySelector("#port-select"),
  preregisterButton: document.querySelector("#preregister-button"),
  preregisterSummary: document.querySelector("#preregister-summary"),
  qaChecklist: document.querySelector("#qa-checklist"),
  recipient: document.querySelector("#recipient"),
  recordAmbientButton: document.querySelector("#record-ambient-button"),
  recordButtonPassButton: document.querySelector("#record-button-pass-button"),
  recordLedFailButton: document.querySelector("#record-led-fail-button"),
  recordLedPassButton: document.querySelector("#record-led-pass-button"),
  recordRtcButton: document.querySelector("#record-rtc-button"),
  reconnectButton: document.querySelector("#reconnect-button"),
  refreshStateButton: document.querySelector("#refresh-state-button"),
  releaseSelect: document.querySelector("#release-select"),
  rtcBaselineValue: document.querySelector("#rtc-baseline-value"),
  rtcElapsedValue: document.querySelector("#rtc-elapsed-value"),
  rtcReadButton: document.querySelector("#rtc-read-button"),
  rtcReadbackValue: document.querySelector("#rtc-readback-value"),
  rtcSetButton: document.querySelector("#rtc-set-button"),
  rtcStatusButton: document.querySelector("#rtc-status-button"),
  rtcStatusValue: document.querySelector("#rtc-status-value"),
  runSummary: document.querySelector("#run-summary"),
  serialLog: document.querySelector("#serial-log"),
  shipSummary: document.querySelector("#ship-summary"),
  toast: document.querySelector("#toast"),
  workflowPanel: document.querySelector("#workflow-panel"),
  workflowDetail: document.querySelector("#workflow-detail"),
  workflowSummary: document.querySelector("#workflow-summary"),
};
els.ledPatternButtons = Array.from(document.querySelectorAll(".led-pattern"));

function showToast(message, tone = "info") {
  els.toast.textContent = message;
  els.toast.className = `toast ${tone}`;
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    els.toast.className = "toast hidden";
  }, 7000);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      "X-Factory-Station-Token": state.apiToken,
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

function setSelectOptions(select, items, currentValue, emptyLabel) {
  select.innerHTML = "";
  if (!items || items.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = emptyLabel;
    select.append(option);
    return;
  }

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    if (item.value === currentValue) {
      option.selected = true;
    }
    select.append(option);
  }

  if (!items.some((item) => item.value === currentValue) && items[0]) {
    select.value = items[0].value;
  }
}

function titleCaseStatus(status) {
  if (status === "passed") {
    return "Passed";
  }
  if (status === "failed") {
    return "Failed";
  }
  return "Pending";
}

function renderChecklist(checks) {
  els.qaChecklist.innerHTML = "";
  const orderedChecks = checks ?? [];
  for (const check of orderedChecks) {
    const item = document.createElement("li");
    item.className = `checklist-item ${check.status}`;
    const label = document.createElement("span");
    label.className = "checklist-label";
    label.textContent = check.label;

    const badge = document.createElement("span");
    badge.className = `status-badge ${check.status}`;
    badge.textContent = titleCaseStatus(check.status);

    item.append(label, badge);
    els.qaChecklist.append(item);
  }

  if (orderedChecks.length === 0) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.className = "checklist-label";
    label.textContent = "No checks yet.";
    const badge = document.createElement("span");
    badge.className = "status-badge pending";
    badge.textContent = "Waiting";
    item.append(label, badge);
    els.qaChecklist.append(item);
  }
}

function buildNextStep(activeRun, assessment, bootInfo) {
  if (!activeRun) {
    return "Choose the USB board, then click Start run + flash approved firmware.";
  }
  if (!activeRun.hardwareUid) {
    return "Wait for the flash to finish, then click Reconnect serial to capture the boot banner.";
  }
  if (activeRun.status === "qa_failed") {
    return "This board is blocked by a failed check. Review the failed item before any rework or shipment.";
  }
  if (activeRun.status === "ship_ready") {
    return "All required checks passed. This board is ready to ship.";
  }
  if (bootInfo.factoryQaAvailable !== true && !assessment?.readyForPrereg) {
    return "Click Reconnect serial to capture the boot banner and confirm factory QA access.";
  }
  if (!assessment?.readyForPrereg) {
    return "Next: run the button, LED, ambient, and RTC checks and record the result for each section.";
  }
  if (!activeRun.qaResults?.preregistration) {
    return "Next: click Preregister hardware.";
  }
  if (assessment?.readyForShipReset) {
    return "Next: click Run final reset + verify to leave the board in fresh customer setup state.";
  }
  return assessment?.detail || "Continue the guided checklist below.";
}

function updateSerialLog(serialLines) {
  const nextText = serialLines.map((entry) => entry.line).join("\n");
  if (nextText === state.serialText) {
    return;
  }
  state.serialText = nextText;
  els.serialLog.textContent = nextText;
  if (state.serialAutoFollow) {
    els.serialLog.scrollTop = els.serialLog.scrollHeight;
  }
}

function render() {
  const payload = state.latestState;
  const activeRun = payload?.activeRun ?? null;
  const assessment = payload?.assessment ?? null;
  const bootInfo = payload?.serial?.bootInfo ?? {};
  const manifest = payload?.manifest;
  const manifestError = payload?.manifestError;
  const ports = payload?.ports ?? [];
  const serialLines = payload?.serial?.lines ?? [];
  const qaEvents = payload?.serial?.qaEvents ?? [];
  const config = payload?.config ?? state.config;
  const currentReleaseValue = els.releaseSelect.value;
  const currentPortValue = els.portSelect.value;

  state.config = config;
  state.buttonSeen.short = qaEvents.some((event) => event.event === "button" && event.kind === "short_press");
  state.buttonSeen.long = qaEvents.some((event) => event.event === "button" && event.kind === "long_hold");

  els.manifestPill.textContent = manifestError
    ? `Manifest error: ${manifestError}`
    : manifest
      ? `Approved release loaded`
      : "Manifest unavailable";
  els.manifestPill.className = manifestError ? "pill danger" : "pill";

  setSelectOptions(
    els.releaseSelect,
    (manifest?.releases ?? []).map((release) => ({
      label: `${release.label} · ${release.firmware_version ?? "unknown"}`,
      value: release.id,
    })),
    activeRun?.releaseId ?? currentReleaseValue ?? manifest?.default_release_id,
    "No release available",
  );

  setSelectOptions(
    els.portSelect,
    ports.map((port) => ({
      label: `${port.path}${port.manufacturer ? ` · ${port.manufacturer}` : ""}`,
      value: port.path,
    })),
    activeRun?.selectedPortPath ?? currentPortValue ?? "",
    "No USB board detected",
  );

  if (activeRun) {
    els.runSummary.textContent = `Run ${activeRun.backendRowId} · ${activeRun.releaseLabel} · status: ${activeRun.status}`;
  } else {
    els.runSummary.textContent = "No active run yet.";
  }
  els.flashButton.textContent = activeRun ? "Flash approved firmware again" : "Start run + flash approved firmware";
  if (els.workflowPanel) {
    els.workflowPanel.hidden = !activeRun;
  }
  els.workflowSummary.textContent = assessment?.summary || "Start a run to load the guided checklist.";
  els.workflowDetail.textContent = assessment?.detail || "The station will show which checks are pending, passed, or blocking shipment.";
  renderChecklist(assessment?.checks);
  const nextStep = buildNextStep(activeRun, assessment, bootInfo);
  els.nextStepBanner.textContent = nextStep;
  els.boardNextStep.textContent = nextStep;

  els.bootHardwareUid.textContent = bootInfo.hardwareUid || "-";
  els.bootFirmwareVersion.textContent = bootInfo.firmwareVersion || "-";
  els.bootApSsid.textContent = bootInfo.apSsid || "-";
  els.bootQaArmed.textContent = bootInfo.factoryQaAvailable === null ? "-" : bootInfo.factoryQaAvailable ? "yes" : "no";
  els.bootState.textContent = bootInfo.lastState || "-";
  els.bootPendingClaim.textContent = bootInfo.pendingClaim === null ? "-" : bootInfo.pendingClaim ? "yes" : "no";
  els.bootReady.textContent = bootInfo.readyForTracking === null ? "-" : bootInfo.readyForTracking ? "yes" : "no";
  els.bootResetEpoch.textContent = bootInfo.resetEpoch ?? "-";

  els.buttonShortSeen.textContent = state.buttonSeen.short ? "Yes" : "No";
  els.buttonLongSeen.textContent = state.buttonSeen.long ? "Yes" : "No";

  els.ambientBrightValue.textContent =
    state.ambientBright?.normalized?.toFixed(3) ?? "-";
  els.ambientDarkValue.textContent =
    state.ambientDark?.normalized?.toFixed(3) ?? "-";

  const ambientDelta =
    state.ambientBright && state.ambientDark
      ? Math.abs(state.ambientBright.normalized - state.ambientDark.normalized)
      : null;
  els.ambientDeltaValue.textContent = ambientDelta === null ? "-" : ambientDelta.toFixed(3);

  els.rtcStatusValue.textContent = state.rtcStatus
    ? `${state.rtcStatus.present ? "present" : "missing"} / lostPower=${state.rtcStatus.lost_power ? "yes" : "no"}`
    : "-";
  els.rtcBaselineValue.textContent = state.rtcBaselineEpoch ?? "-";
  els.rtcReadbackValue.textContent = state.rtcReadbackEpoch ?? "-";
  if (state.rtcBaselineEpoch && state.rtcReadbackEpoch) {
    els.rtcElapsedValue.textContent = `${state.rtcReadbackEpoch - state.rtcBaselineEpoch}s`;
  } else {
    els.rtcElapsedValue.textContent = "-";
  }

  els.preregisterSummary.textContent = activeRun?.qaResults?.preregistration
    ? `Preregistered device ${activeRun.qaResults.preregistration.deviceId ?? activeRun.qaResults.preregistration.hardwareUid}`
    : assessment?.blockingChecks?.length
      ? `Blocked until failed checks are resolved: ${assessment.blockingChecks.join(", ")}.`
    : assessment?.readyForPrereg
      ? "Ready to preregister once you confirm the hardware checks."
      : "Not preregistered yet.";

  els.shipSummary.textContent = activeRun?.status === "ship_ready"
    ? "Board is marked ready to ship."
    : activeRun?.status === "qa_failed"
      ? `Board is blocked. ${assessment?.detail || "Review the failed QA result before any rework."}`
      : assessment?.readyForShipReset
        ? "All required checks passed. Run the final reset verification."
        : "Board is not marked ready to ship.";

  updateSerialLog(serialLines);

  const hasActiveRun = Boolean(activeRun);
  const hasSelectedPort = Boolean(activeRun?.selectedPortPath || els.portSelect.value);
  const qaAvailable = bootInfo.factoryQaAvailable === true;
  const readyForPrereg = Boolean(assessment?.readyForPrereg);
  const readyForShipReset = Boolean(assessment?.readyForShipReset);
  const ambientReady = Boolean(state.ambientBright || state.ambientDark);
  const rtcReady = Boolean(state.rtcStatus);

  els.flashButton.disabled = !els.portSelect.value;
  els.reconnectButton.disabled = !hasActiveRun || !hasSelectedPort;
  els.buttonTestButton.disabled = !hasActiveRun || !qaAvailable;
  els.recordButtonPassButton.disabled = !hasActiveRun || !qaAvailable;
  els.ambientBrightButton.disabled = !hasActiveRun || !qaAvailable;
  els.ambientDarkButton.disabled = !hasActiveRun || !qaAvailable;
  els.recordAmbientButton.disabled = !hasActiveRun || !qaAvailable || !ambientReady;
  els.rtcStatusButton.disabled = !hasActiveRun || !qaAvailable;
  els.rtcSetButton.disabled = !hasActiveRun || !qaAvailable;
  els.rtcReadButton.disabled = !hasActiveRun || !qaAvailable;
  els.recordRtcButton.disabled = !hasActiveRun || !qaAvailable || !rtcReady;
  els.preregisterButton.disabled = !hasActiveRun || !readyForPrereg;
  els.finalResetButton.disabled = !hasActiveRun || !readyForShipReset;
  els.preregisterButton.title = assessment?.blockingChecks?.length
    ? `Blocked by failed checks: ${assessment.blockingChecks.join(", ")}.`
    : !readyForPrereg
      ? "Finish all required hardware checks before preregistration."
      : "Create or refresh the preregistered device row.";
  els.finalResetButton.title = assessment?.blockingChecks?.length
    ? `Blocked by failed checks: ${assessment.blockingChecks.join(", ")}.`
    : !readyForShipReset
      ? "Complete preregistration after all required hardware checks pass."
      : "Run the final ship-ready reset verification.";
  els.recordLedPassButton.disabled = !hasActiveRun || !qaAvailable;
  els.recordLedFailButton.disabled = !hasActiveRun || !qaAvailable;
  for (const button of els.ledPatternButtons) {
    button.disabled = !hasActiveRun || !qaAvailable;
  }
}

async function refreshState() {
  state.latestState = await api("/api/state");
  render();
}

async function recordCheck(name, payload) {
  await api("/api/checks/record", {
    body: {
      name,
      payload,
    },
    method: "POST",
  });
  await refreshState();
}

async function sendQa(command, payload) {
  const response = await api("/api/qa/command", {
    body: {
      command,
      payload,
    },
    method: "POST",
  });
  return response.result;
}

async function handleStartRun() {
  const response = await api("/api/run/start", {
    body: {
      buildNotes: els.buildNotes.value,
      orderNumber: els.orderNumber.value,
      portPath: els.portSelect.value,
      recipient: els.recipient.value,
      releaseId: els.releaseSelect.value,
    },
    method: "POST",
  });
  state.latestState = { ...(state.latestState ?? {}), activeRun: response.activeRun };
  showToast("Factory run started.");
  await refreshState();
}

async function ensureActiveRun() {
  if (state.latestState?.activeRun) {
    return state.latestState.activeRun;
  }

  await handleStartRun();
  return state.latestState?.activeRun ?? null;
}

async function handleFlash() {
  await ensureActiveRun();
  await api("/api/flash", {
    body: {
      portPath: els.portSelect.value,
    },
    method: "POST",
  });
  state.serialAutoFollow = true;
  await refreshState();
  showToast("Firmware flashed. Next: click Reconnect serial to capture the boot banner.", "info");
}

async function handleButtonTest() {
  state.buttonSeen.short = false;
  state.buttonSeen.long = false;
  await sendQa("button_test", { enabled: true });
  showToast("Button test armed. Press once, then hold once.");
  await refreshState();
}

async function handleAmbientCapture(kind) {
  const sample = await sendQa("ambient_sample");
  if (kind === "bright") {
    state.ambientBright = sample;
    showToast("Captured bright ambient sample.");
  } else {
    state.ambientDark = sample;
    showToast("Captured covered ambient sample.");
  }
  render();
}

async function handleRtcStatus() {
  state.rtcStatus = await sendQa("rtc_status");
  render();
  showToast("RTC status captured.");
}

async function handleRtcSet() {
  const epoch = Math.floor(Date.now() / 1000);
  await sendQa("rtc_set", { epoch });
  state.rtcBaselineEpoch = epoch;
  state.rtcReadbackEpoch = null;
  render();
  showToast("RTC test time written. Unplug the board for 30 seconds, then reconnect it.");
}

async function handleRtcRead() {
  showToast("Reconnecting serial and reading RTC...", "info");
  await reconnectSerialCapture(false);
  const result = await sendQa("rtc_read");
  state.rtcReadbackEpoch = result.rtc_epoch;
  state.rtcStatus = {
    ...(state.rtcStatus ?? {}),
    lost_power: result.lost_power,
    present: true,
  };
  render();
  showToast("RTC readback captured.");
}

async function handlePreregister() {
  await api("/api/preregister", { method: "POST" });
  showToast("Hardware preregistered.");
  await refreshState();
}

async function reconnectSerialCapture(showStatusToast = true) {
  await api("/api/serial/reconnect", { method: "POST" });
  await refreshState();
  const qaAvailable = state.latestState?.serial?.bootInfo?.factoryQaAvailable;
  if (!showStatusToast) {
    return qaAvailable;
  }
  if (qaAvailable) {
    showToast("Serial reconnected. Factory QA is available on this board.", "success");
    return qaAvailable;
  }
  if (qaAvailable === false) {
    showToast("Serial reconnected. The board responded, but factory QA is unavailable on this boot.", "info");
    return qaAvailable;
  }
  showToast("Serial reconnected. Boot details are still loading.", "info");
  return qaAvailable;
}

async function handleReconnect() {
  await reconnectSerialCapture(true);
}

async function handleFinalReset() {
  const result = await api("/api/final-reset", { method: "POST" });
  showToast(result.readyToShip ? "Board is ready to ship." : "Board failed ship-ready verification.", result.readyToShip ? "success" : "danger");
  await refreshState();
}

async function handleRecordButtonPass() {
  const passed = state.buttonSeen.short && state.buttonSeen.long;
  await recordCheck("button", {
    checkedAt: new Date().toISOString(),
    longHoldSeen: state.buttonSeen.long,
    shortPressSeen: state.buttonSeen.short,
    status: passed ? "passed" : "failed",
    reason: passed ? null : "Did not observe both short-press and long-hold button events.",
  });
  showToast(passed ? "Button result recorded." : "Button test failed and board is blocked.", passed ? "success" : "danger");
}

async function handleRecordAmbient() {
  const hasBothSamples = Boolean(state.ambientBright && state.ambientDark);
  const delta =
    hasBothSamples
      ? Math.abs(state.ambientBright.normalized - state.ambientDark.normalized)
      : 0;
  const threshold = state.config?.ambientDeltaThreshold ?? 0.15;
  const passed = hasBothSamples && delta >= threshold;
  await recordCheck("ambient", {
    bright: state.ambientBright,
    checkedAt: new Date().toISOString(),
    covered: state.ambientDark,
    delta,
    status: passed ? "passed" : "failed",
    threshold,
    reason: passed
      ? null
      : hasBothSamples
        ? `Ambient delta ${delta.toFixed(3)} did not reach threshold ${threshold.toFixed(3)}.`
        : "Capture both a bright sample and a covered sample before recording ambient QA.",
  });
  showToast(passed ? "Ambient result recorded." : "Ambient test failed and board is blocked.", passed ? "success" : "danger");
}

async function handleRecordRtc() {
  const baseline = state.rtcBaselineEpoch;
  const readback = state.rtcReadbackEpoch;
  const rtcStatus = state.rtcStatus;
  const elapsed = baseline && readback ? readback - baseline : 0;
  const target = state.config?.rtcRetentionSeconds ?? 30;
  const tolerance = state.config?.rtcRetentionToleranceSeconds ?? 10;
  const minElapsed = target - tolerance;
  const hasFullRtcEvidence = Boolean(baseline && readback);
  const passed =
    Boolean(rtcStatus?.present) &&
    rtcStatus?.lost_power === false &&
    hasFullRtcEvidence &&
    elapsed >= minElapsed;

  await recordCheck("rtc", {
    baselineEpoch: baseline,
    checkedAt: new Date().toISOString(),
    elapsedSeconds: elapsed,
    readbackEpoch: readback,
    rtcStatus,
    status: passed ? "passed" : "failed",
    targetSeconds: target,
    toleranceSeconds: tolerance,
    reason: passed
      ? null
      : !rtcStatus?.present
        ? "RTC was not detected on the board."
        : rtcStatus?.lost_power
          ? "RTC reported lostPower=true after the retention check."
          : !hasFullRtcEvidence
            ? "RTC retention readback is incomplete. Set the RTC test time, unplug, reconnect, then read it back."
            : `RTC retention check expected at least ${minElapsed}s with lostPower=false.`,
  });
  showToast(passed ? "RTC result recorded." : "RTC test failed and board is blocked.", passed ? "success" : "danger");
}

async function handleLedRecord(status) {
  await recordCheck("led_matrix", {
    checkedAt: new Date().toISOString(),
    status,
    reason: status === "passed" ? null : "Operator reported LED power, color, or mapping issue.",
  });
  showToast(status === "passed" ? "LED result recorded." : "LED failure recorded.", status === "passed" ? "success" : "danger");
}

async function handleLedPatternClick(event) {
  const button = event.target.closest("[data-led-pattern]");
  if (!button) {
    return;
  }
  await sendQa("led_test", { pattern: button.dataset.ledPattern });
  showToast(`LED pattern: ${button.dataset.ledPattern}`);
}

els.refreshStateButton.addEventListener("click", () => refreshState().catch((error) => showToast(error.message, "danger")));
els.flashButton.addEventListener("click", () => handleFlash().catch((error) => showToast(error.message, "danger")));
els.reconnectButton.addEventListener("click", () => handleReconnect().catch((error) => showToast(error.message, "danger")));
els.buttonTestButton.addEventListener("click", () => handleButtonTest().catch((error) => showToast(error.message, "danger")));
els.recordButtonPassButton.addEventListener("click", () => handleRecordButtonPass().catch((error) => showToast(error.message, "danger")));
els.ambientBrightButton.addEventListener("click", () => handleAmbientCapture("bright").catch((error) => showToast(error.message, "danger")));
els.ambientDarkButton.addEventListener("click", () => handleAmbientCapture("dark").catch((error) => showToast(error.message, "danger")));
els.recordAmbientButton.addEventListener("click", () => handleRecordAmbient().catch((error) => showToast(error.message, "danger")));
els.rtcStatusButton.addEventListener("click", () => handleRtcStatus().catch((error) => showToast(error.message, "danger")));
els.rtcSetButton.addEventListener("click", () => handleRtcSet().catch((error) => showToast(error.message, "danger")));
els.rtcReadButton.addEventListener("click", () => handleRtcRead().catch((error) => showToast(error.message, "danger")));
els.recordRtcButton.addEventListener("click", () => handleRecordRtc().catch((error) => showToast(error.message, "danger")));
els.preregisterButton.addEventListener("click", () => handlePreregister().catch((error) => showToast(error.message, "danger")));
els.finalResetButton.addEventListener("click", () => handleFinalReset().catch((error) => showToast(error.message, "danger")));
els.recordLedPassButton.addEventListener("click", () => handleLedRecord("passed").catch((error) => showToast(error.message, "danger")));
els.recordLedFailButton.addEventListener("click", () => handleLedRecord("failed").catch((error) => showToast(error.message, "danger")));
els.ledPatternButtons.forEach((button) => {
  button.addEventListener("click", (event) => handleLedPatternClick(event).catch((error) => showToast(error.message, "danger")));
});
els.serialLog.addEventListener("scroll", () => {
  const threshold = 24;
  const distanceFromBottom = els.serialLog.scrollHeight - els.serialLog.scrollTop - els.serialLog.clientHeight;
  state.serialAutoFollow = distanceFromBottom <= threshold;
});

refreshState().catch((error) => showToast(error.message, "danger"));
window.setInterval(() => {
  refreshState().catch(() => {});
}, 1000);

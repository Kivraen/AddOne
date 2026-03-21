export interface DeviceTimezoneDateParts {
  day: number;
  hour: number;
  minute: number;
  month: number;
  year: number;
}

export interface SelectableDeviceTimezoneOption {
  code: string;
  kind: "fixed-offset" | "regional";
  label: string;
  searchLabel: string;
  value: string;
}

interface SupportedRegionalTimezoneDefinition extends SelectableDeviceTimezoneOption {
  group: "Europe" | "United States" | "UTC";
  kind: "regional";
  usesDst: boolean;
}

export interface DeviceTimezoneStatus {
  code: string;
  kind: "fixed-offset" | "regional" | "unknown" | "unsupported-iana";
  label: string;
  supportedInBeta: boolean;
  value: string;
  warning: string | null;
}

export interface PhoneTimezoneResolution {
  kind: "fixed-offset" | "regional";
  label: string;
  note: string;
  phoneTimezone: string;
  resolvedValue: string;
  usesFallback: boolean;
}

const FIXED_OFFSET_MAX_MINUTES = 14 * 60;
const FIXED_OFFSET_MIN_MINUTES = -12 * 60;
const FIXED_OFFSET_STEP_MINUTES = 15;

const SUPPORTED_REGIONAL_TIMEZONES: readonly SupportedRegionalTimezoneDefinition[] = [
  {
    code: "UTC",
    group: "UTC",
    kind: "regional",
    label: "UTC",
    searchLabel: "utc coordinated universal time etc utc",
    usesDst: false,
    value: "UTC",
  },
  {
    code: "America/Los_Angeles",
    group: "United States",
    kind: "regional",
    label: "Pacific Time",
    searchLabel: "pacific los angeles west coast pst pdt america/los_angeles",
    usesDst: true,
    value: "America/Los_Angeles",
  },
  {
    code: "America/Denver",
    group: "United States",
    kind: "regional",
    label: "Mountain Time",
    searchLabel: "mountain denver mst mdt america/denver",
    usesDst: true,
    value: "America/Denver",
  },
  {
    code: "America/Phoenix",
    group: "United States",
    kind: "regional",
    label: "Arizona",
    searchLabel: "arizona phoenix mst america/phoenix",
    usesDst: false,
    value: "America/Phoenix",
  },
  {
    code: "America/Chicago",
    group: "United States",
    kind: "regional",
    label: "Central Time",
    searchLabel: "central chicago cst cdt america/chicago",
    usesDst: true,
    value: "America/Chicago",
  },
  {
    code: "America/New_York",
    group: "United States",
    kind: "regional",
    label: "Eastern Time",
    searchLabel: "eastern new york est edt america/new_york",
    usesDst: true,
    value: "America/New_York",
  },
  {
    code: "America/Anchorage",
    group: "United States",
    kind: "regional",
    label: "Alaska Time",
    searchLabel: "alaska anchorage akst akdt america/anchorage",
    usesDst: true,
    value: "America/Anchorage",
  },
  {
    code: "Pacific/Honolulu",
    group: "United States",
    kind: "regional",
    label: "Hawaii",
    searchLabel: "hawaii honolulu hst pacific/honolulu",
    usesDst: false,
    value: "Pacific/Honolulu",
  },
  {
    code: "Europe/Warsaw",
    group: "Europe",
    kind: "regional",
    label: "Warsaw",
    searchLabel: "warsaw poland cet cest europe/warsaw",
    usesDst: true,
    value: "Europe/Warsaw",
  },
  {
    code: "Europe/Kyiv",
    group: "Europe",
    kind: "regional",
    label: "Kyiv",
    searchLabel: "kyiv ukraine eet eest europe/kyiv",
    usesDst: true,
    value: "Europe/Kyiv",
  },
] as const;

const SUPPORTED_REGIONAL_TIMEZONE_MAP = new Map(SUPPORTED_REGIONAL_TIMEZONES.map((option) => [option.value, option]));

const FIXED_OFFSET_TIMEZONES: readonly SelectableDeviceTimezoneOption[] = Array.from(
  { length: (FIXED_OFFSET_MAX_MINUTES - FIXED_OFFSET_MIN_MINUTES) / FIXED_OFFSET_STEP_MINUTES + 1 },
  (_, index) => FIXED_OFFSET_MIN_MINUTES + index * FIXED_OFFSET_STEP_MINUTES,
).map((offsetMinutes) => {
  const label = formatUtcOffset(offsetMinutes);
  return {
    code: label,
    kind: "fixed-offset" as const,
    label,
    searchLabel: `${label.toLowerCase()} fixed offset utc ${offsetMinutes >= 0 ? "plus" : "minus"} ${Math.abs(offsetMinutes)}`,
    value: formatFixedOffsetTimezone(offsetMinutes),
  };
});

function normalizeTimezoneValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function formatDatePartsForIana(timezone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    month: Number(values.month),
    second: Number(values.second),
    year: Number(values.year),
  };
}

export function readCurrentPhoneTimezone(fallback = "UTC") {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

export function formatUtcOffset(offsetMinutes: number) {
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  const sign = offsetMinutes >= 0 ? "+" : "-";
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatFixedOffsetTimezone(offsetMinutes: number) {
  return formatUtcOffset(offsetMinutes);
}

export function parseFixedOffsetTimezone(value: string | null | undefined) {
  const normalized = normalizeTimezoneValue(value);
  const match = normalized.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, sign, hoursRaw, minutesRaw] = match;
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes % FIXED_OFFSET_STEP_MINUTES !== 0) {
    return null;
  }

  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes > FIXED_OFFSET_MAX_MINUTES) {
    return null;
  }

  const offsetMinutes = sign === "+" ? totalMinutes : totalMinutes * -1;
  if (offsetMinutes < FIXED_OFFSET_MIN_MINUTES || offsetMinutes > FIXED_OFFSET_MAX_MINUTES) {
    return null;
  }

  return {
    canonicalValue: formatFixedOffsetTimezone(offsetMinutes),
    label: formatUtcOffset(offsetMinutes),
    offsetMinutes,
  };
}

export function isSupportedRegionalDeviceTimezone(value: string | null | undefined) {
  return SUPPORTED_REGIONAL_TIMEZONE_MAP.has(normalizeTimezoneValue(value));
}

export function isValidIanaTimezone(value: string | null | undefined) {
  const normalized = normalizeTimezoneValue(value);
  if (!normalized || parseFixedOffsetTimezone(normalized)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: normalized }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getSupportedRegionalTimezones() {
  return SUPPORTED_REGIONAL_TIMEZONES;
}

export function getSupportedFixedOffsetTimezones() {
  return FIXED_OFFSET_TIMEZONES;
}

export function getCurrentUtcOffsetMinutesForIana(timezone: string, date = new Date()) {
  const parts = formatDatePartsForIana(timezone, date);
  const asUtcMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtcMs - date.getTime()) / 60000);
}

export function getDeviceTimezoneDateParts(timezoneValue: string, date = new Date()): DeviceTimezoneDateParts {
  const fixedOffset = parseFixedOffsetTimezone(timezoneValue);
  if (fixedOffset) {
    const shifted = new Date(date.getTime() + fixedOffset.offsetMinutes * 60_000);
    return {
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
      month: shifted.getUTCMonth() + 1,
      year: shifted.getUTCFullYear(),
    };
  }

  const parts = formatDatePartsForIana(timezoneValue, date);
  return {
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    month: parts.month,
    year: parts.year,
  };
}

export function getDeviceTimezoneStatus(value: string, date = new Date()): DeviceTimezoneStatus {
  const normalized = normalizeTimezoneValue(value);
  if (!normalized) {
      return {
      code: "",
      kind: "unknown",
      label: "Timezone needed",
      supportedInBeta: false,
      value: normalized,
      warning: "Choose a supported regional timezone or a fixed UTC offset.",
    };
  }

  const supportedRegional = SUPPORTED_REGIONAL_TIMEZONE_MAP.get(normalized);
  if (supportedRegional) {
    return {
      code: supportedRegional.code,
      kind: "regional",
      label: supportedRegional.label,
      supportedInBeta: true,
      value: normalized,
      warning: null,
    };
  }

  const fixedOffset = parseFixedOffsetTimezone(normalized);
  if (fixedOffset) {
    return {
      code: fixedOffset.canonicalValue,
      kind: "fixed-offset",
      label: fixedOffset.label,
      supportedInBeta: true,
      value: fixedOffset.canonicalValue,
      warning: "Fixed UTC offsets stay on the same offset year-round and do not auto-adjust for daylight saving time.",
    };
  }

  if (normalized === "Etc/UTC") {
    return {
      code: "UTC",
      kind: "regional",
      label: "UTC",
      supportedInBeta: true,
      value: "UTC",
      warning: null,
    };
  }

  if (isValidIanaTimezone(normalized)) {
    const offsetLabel = formatUtcOffset(getCurrentUtcOffsetMinutesForIana(normalized, date));
    return {
      code: normalized,
      kind: "unsupported-iana",
      label: normalized,
      supportedInBeta: false,
      value: normalized,
      warning: `${normalized} is valid, but the beta device firmware cannot honor it yet. Choose a supported regional zone or use ${offsetLabel} as a fixed offset if you want the current UTC difference only.`,
    };
  }

    return {
    code: normalized,
    kind: "unknown",
    label: normalized,
    supportedInBeta: false,
    value: normalized,
    warning: "This timezone value is not recognized. Choose a supported regional timezone or a fixed UTC offset.",
  };
}

export function resolvePhoneTimezoneForDevice(phoneTimezone: string, date = new Date()): PhoneTimezoneResolution {
  const normalized = normalizeTimezoneValue(phoneTimezone);
  const supportedRegional = SUPPORTED_REGIONAL_TIMEZONE_MAP.get(normalized);
  if (supportedRegional) {
    return {
      kind: "regional",
      label: supportedRegional.label,
      note: `Phone default: ${supportedRegional.label} · ${supportedRegional.code}`,
      phoneTimezone: normalized,
      resolvedValue: supportedRegional.value,
      usesFallback: false,
    };
  }

  if (normalized === "Etc/UTC") {
    return {
      kind: "regional",
      label: "UTC",
      note: "Phone default: UTC",
      phoneTimezone: normalized,
      resolvedValue: "UTC",
      usesFallback: false,
    };
  }

  if (isValidIanaTimezone(normalized)) {
    const offsetMinutes = getCurrentUtcOffsetMinutesForIana(normalized, date);
    const offsetLabel = formatUtcOffset(offsetMinutes);
    return {
      kind: "fixed-offset",
      label: offsetLabel,
      note: `Phone default uses ${offsetLabel} because ${normalized} is not in the beta regional list yet.`,
      phoneTimezone: normalized,
      resolvedValue: formatFixedOffsetTimezone(offsetMinutes),
      usesFallback: true,
    };
  }

    return {
      kind: "regional",
      label: "UTC",
      note: "Phone timezone unavailable. Starting in UTC.",
    phoneTimezone: normalized,
    resolvedValue: "UTC",
    usesFallback: true,
  };
}

function sanitizeSegment(value) {
  return String(value).trim().replace(/\s+/g, "-");
}

export function commandTopic(prefix, hardwareUid) {
  return `${sanitizeSegment(prefix)}/device/${sanitizeSegment(hardwareUid)}/command`;
}

export function ackTopic(prefix, hardwareUid) {
  return `${sanitizeSegment(prefix)}/device/${sanitizeSegment(hardwareUid)}/ack`;
}

export function dayStateEventTopic(prefix, hardwareUid) {
  return `${sanitizeSegment(prefix)}/device/${sanitizeSegment(hardwareUid)}/event/day-state`;
}

export function presenceTopic(prefix, hardwareUid) {
  return `${sanitizeSegment(prefix)}/device/${sanitizeSegment(hardwareUid)}/presence`;
}

export function commandWildcard(prefix) {
  return `${sanitizeSegment(prefix)}/device/+/command`;
}

export function ackWildcard(prefix) {
  return `${sanitizeSegment(prefix)}/device/+/ack`;
}

export function dayStateEventWildcard(prefix) {
  return `${sanitizeSegment(prefix)}/device/+/event/day-state`;
}

export function presenceWildcard(prefix) {
  return `${sanitizeSegment(prefix)}/device/+/presence`;
}

export function parseTopic(prefix, topic) {
  const expectedPrefix = `${sanitizeSegment(prefix)}/device/`;
  if (!topic.startsWith(expectedPrefix)) {
    return null;
  }

  const remainder = topic.slice(expectedPrefix.length);
  const segments = remainder.split("/");
  if (segments.length < 2) {
    return null;
  }

  const [hardwareUid, ...rest] = segments;
  return {
    hardwareUid,
    route: rest.join("/"),
  };
}

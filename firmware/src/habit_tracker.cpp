#include "habit_tracker.h"

#include <Preferences.h>

namespace {
String defaultEffectiveAt() {
  return "1970-01-01T00:00:00Z";
}
} // namespace

void HabitTracker::begin() {
  load_();
}

bool HabitTracker::applyCloudState(const String& localDate, bool isDone, const String& effectiveAt) {
  if (localDate.isEmpty()) {
    return false;
  }

  currentState_.localDate = localDate;
  currentState_.isDone = isDone;
  currentState_.effectiveAt = effectiveAt.isEmpty() ? defaultEffectiveAt() : effectiveAt;
  currentState_.isKnown = true;
  return persist_();
}

bool HabitTracker::currentState(DaySnapshot& outState) const {
  if (!currentState_.isKnown) {
    return false;
  }

  outState = currentState_;
  return true;
}

bool HabitTracker::pendingDeviceEvent(PendingDeviceEvent& outEvent) const {
  if (!pendingEvent_.isPending) {
    return false;
  }

  outEvent = pendingEvent_;
  return true;
}

bool HabitTracker::queueLocalStateChange(const String& localDate, bool isDone, const String& effectiveAt) {
  if (localDate.isEmpty()) {
    return false;
  }

  currentState_.localDate = localDate;
  currentState_.isDone = isDone;
  currentState_.effectiveAt = effectiveAt.isEmpty() ? defaultEffectiveAt() : effectiveAt;
  currentState_.isKnown = true;

  pendingEvent_.localDate = currentState_.localDate;
  pendingEvent_.isDone = currentState_.isDone;
  pendingEvent_.effectiveAt = currentState_.effectiveAt;
  pendingEvent_.deviceEventId = generateDeviceEventId_();
  pendingEvent_.isPending = !pendingEvent_.deviceEventId.isEmpty();

  return pendingEvent_.isPending && persist_();
}

bool HabitTracker::markPendingDeviceEventSynced() {
  if (!pendingEvent_.isPending) {
    return true;
  }

  pendingEvent_ = PendingDeviceEvent{};
  return persist_();
}

String HabitTracker::generateDeviceEventId_() {
  char buffer[37];
  snprintf(buffer,
           sizeof(buffer),
           "%08lx-%08lx-%08lx-%08lx",
           static_cast<unsigned long>(esp_random()),
           static_cast<unsigned long>(esp_random()),
           static_cast<unsigned long>(esp_random()),
           static_cast<unsigned long>(esp_random()));
  return String(buffer);
}

bool HabitTracker::persist_() {
  Preferences prefs;
  if (!prefs.begin(kNamespace, false)) {
    return false;
  }

  prefs.putBool(kHasCurrentKey, currentState_.isKnown);
  prefs.putString(kCurrentDateKey, currentState_.localDate);
  prefs.putBool(kCurrentDoneKey, currentState_.isDone);
  prefs.putString(kCurrentAtKey, currentState_.effectiveAt);

  prefs.putBool(kPendingFlagKey, pendingEvent_.isPending);
  prefs.putString(kPendingEventIdKey, pendingEvent_.deviceEventId);
  prefs.putString(kPendingDateKey, pendingEvent_.localDate);
  prefs.putBool(kPendingDoneKey, pendingEvent_.isDone);
  prefs.putString(kPendingAtKey, pendingEvent_.effectiveAt);
  prefs.end();
  return true;
}

void HabitTracker::load_() {
  Preferences prefs;
  if (!prefs.begin(kNamespace, true)) {
    return;
  }

  currentState_.isKnown = prefs.getBool(kHasCurrentKey, false);
  currentState_.localDate = prefs.getString(kCurrentDateKey, "");
  currentState_.isDone = prefs.getBool(kCurrentDoneKey, false);
  currentState_.effectiveAt = prefs.getString(kCurrentAtKey, "");

  pendingEvent_.isPending = prefs.getBool(kPendingFlagKey, false);
  pendingEvent_.deviceEventId = prefs.getString(kPendingEventIdKey, "");
  pendingEvent_.localDate = prefs.getString(kPendingDateKey, "");
  pendingEvent_.isDone = prefs.getBool(kPendingDoneKey, false);
  pendingEvent_.effectiveAt = prefs.getString(kPendingAtKey, "");
  prefs.end();
}

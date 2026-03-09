#pragma once

#include <Arduino.h>

class HabitTracker {
public:
  struct DaySnapshot {
    String effectiveAt{};
    String localDate{};
    bool isDone = false;
    bool isKnown = false;
  };

  struct PendingDeviceEvent {
    String deviceEventId{};
    String effectiveAt{};
    String localDate{};
    bool isDone = false;
    bool isPending = false;
  };

  void begin();
  bool applyCloudState(const String& localDate, bool isDone, const String& effectiveAt);
  bool currentState(DaySnapshot& outState) const;
  bool pendingDeviceEvent(PendingDeviceEvent& outEvent) const;
  bool queueLocalStateChange(const String& localDate, bool isDone, const String& effectiveAt = "");
  bool markPendingDeviceEventSynced();

private:
  static constexpr const char* kNamespace = "ao_habit";
  static constexpr const char* kCurrentDateKey = "curDate";
  static constexpr const char* kCurrentDoneKey = "curDone";
  static constexpr const char* kCurrentAtKey = "curAt";
  static constexpr const char* kHasCurrentKey = "hasCur";
  static constexpr const char* kPendingEventIdKey = "pEvtId";
  static constexpr const char* kPendingDateKey = "pDate";
  static constexpr const char* kPendingDoneKey = "pDone";
  static constexpr const char* kPendingAtKey = "pAt";
  static constexpr const char* kPendingFlagKey = "hasPend";

  static String generateDeviceEventId_();
  bool persist_();
  void load_();

  DaySnapshot currentState_{};
  PendingDeviceEvent pendingEvent_{};
};

#pragma once

#include <Arduino.h>

#include "config.h"

class HabitTracker {
public:
  struct PendingDeviceEvent {
    String deviceEventId{};
    String effectiveAt{};
    String localDate{};
    bool isDone = false;
    bool isPending = false;
  };

  struct WeekDate {
    int year = 0;
    int month = 0;
    int day = 0;
  };

  struct WeeklyGrid {
    bool days[Config::kDaysPerWeek][Config::kWeeks]{};
    int8_t success[Config::kWeeks]{};
  };

  void begin();
  bool applyCloudState(const String& localDate, bool isDone, const String& effectiveAt, const tm& nowDate);
  bool checkWeekBoundary(const tm& nowDate);
  const WeeklyGrid& grid() const { return grid_; }
  bool hasPendingDeviceEvent() const { return pendingEvent_.isPending; }
  bool isInitialized() const { return initialized_; }
  uint8_t minimum() const { return minimum_; }
  bool pendingDeviceEvent(PendingDeviceEvent& outEvent) const;
  bool markPendingDeviceEventSynced();
  bool queueLocalToggleToday(const tm& nowDate, const String& effectiveAt, bool& outIsDone);
  bool syncDate(const tm& nowDate);
  uint8_t todayRow(const tm& nowDate) const;

private:
  static constexpr const char* kNamespace = "ao_habit";
  static constexpr const char* kGridKey = "grid";
  static constexpr const char* kWeekStartKey = "weekStart";
  static constexpr const char* kMinimumKey = "minimum";
  static constexpr const char* kFirstWeekKey = "firstWeek";
  static constexpr const char* kPendingEventIdKey = "pEvtId";
  static constexpr const char* kPendingDateKey = "pDate";
  static constexpr const char* kPendingDoneKey = "pDone";
  static constexpr const char* kPendingAtKey = "pAt";
  static constexpr const char* kPendingFlagKey = "hasPend";

  static String defaultEffectiveAt_();
  static int dayOfWeekMondayBased_(const tm& date);
  static String generateDeviceEventId_();
  static bool isValidWeekDate_(const WeekDate& date);
  static bool parseLocalDate_(const String& localDate, tm& outDate);
  static WeekDate toWeekDate_(const tm& date);
  static WeekDate mondayOfWeek_(const tm& date);
  static int weeksBetween_(const WeekDate& from, const WeekDate& to);

  bool ensureInitialized_(const tm& nowDate);
  bool persist_() const;
  void evaluateWeek_(uint8_t weekIdx);
  int8_t findEarliestRecordedDay_(uint8_t weekIdx) const;
  void initEmpty_(const tm& nowDate);
  void load_();
  bool setDayStateForDate_(const tm& targetDate, bool isDone, const String& effectiveAt, const tm& nowDate);
  void shiftWeeks_(int weeks);

  WeeklyGrid grid_{};
  bool initialized_ = false;
  bool isFirstWeek_ = true;
  PendingDeviceEvent pendingEvent_{};
  WeekDate lastWeekStart_{};
  uint8_t minimum_ = Config::kDefaultWeeklyMinimum;
};

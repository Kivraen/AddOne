#pragma once

#include <Arduino.h>

#include "config.h"

class HabitTracker {
public:
  struct HistoryDraftUpdate {
    String localDate{};
    bool isDone = false;
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
  bool applyCloudState(const String& localDate,
                       bool isDone,
                       const tm& nowDate,
                       uint32_t expectedRevision,
                       String& failureReason);
  bool applyHistoryDraft(const HistoryDraftUpdate* updates,
                         size_t updateCount,
                         const tm& nowDate,
                         uint32_t expectedRevision,
                         String& failureReason);
  bool bumpRuntimeRevision();
  bool checkWeekBoundary(const tm& nowDate);
  bool clearToDefaults(const tm& nowDate);
  bool currentWeekStart(WeekDate& outDate) const;
  int8_t currentWeekSuccess() const { return grid_.success[0]; }
  const WeeklyGrid& grid() const { return grid_; }
  bool isInitialized() const { return initialized_; }
  uint8_t minimum() const { return minimum_; }
  uint32_t runtimeRevision() const { return runtimeRevision_; }
  bool queueLocalToggleToday(const tm& nowDate, bool& outIsDone);
  bool resetHistory(const tm& nowDate, uint8_t minimum, uint32_t expectedRevision, String& failureReason);
  bool restoreFromSnapshot(const String& boardDaysJson,
                           const WeekDate& weekStart,
                           uint8_t minimum,
                           uint32_t nextRevision,
                           String& failureReason);
  bool setMinimum(uint8_t minimum);
  bool syncDate(const tm& nowDate);
  uint8_t todayRow(const tm& nowDate) const;

private:
  static constexpr const char* kNamespace = "ao_habit";
  static constexpr const char* kGridKey = "grid";
  static constexpr const char* kWeekStartKey = "weekStart";
  static constexpr const char* kMinimumKey = "minimum";
  static constexpr const char* kFirstWeekKey = "firstWeek";
  static constexpr const char* kRevisionKey = "revision";

  static int dayOfWeekMondayBased_(const tm& date);
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
  bool readDayStateForDate_(const tm& targetDate, const tm& nowDate, bool& outIsDone) const;
  bool setDayStateForDate_(const tm& targetDate, bool isDone, const tm& nowDate, bool* outChanged = nullptr);
  void shiftWeeks_(int weeks);

  WeeklyGrid grid_{};
  bool initialized_ = false;
  bool isFirstWeek_ = true;
  WeekDate lastWeekStart_{};
  uint32_t runtimeRevision_ = 0;
  uint8_t minimum_ = Config::kDefaultWeeklyMinimum;
};

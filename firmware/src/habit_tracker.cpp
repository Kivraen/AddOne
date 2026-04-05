#include "habit_tracker.h"

#include <ArduinoJson.h>
#include <Preferences.h>
#include <string.h>

namespace {
time_t tmToEpoch(const tm& input) {
  tm copy = input;
  copy.tm_hour = 12;
  copy.tm_min = 0;
  copy.tm_sec = 0;
  return mktime(&copy);
}
} // namespace

void HabitTracker::begin() {
  load_();
}

bool HabitTracker::applyCloudState(const String& localDate,
                                   bool isDone,
                                   const tm& nowDate,
                                   uint32_t expectedRevision,
                                   String& failureReason) {
  if (!ensureInitialized_(nowDate)) {
    failureReason = "Tracker is not initialized.";
    return false;
  }

  checkWeekBoundary(nowDate);

  tm targetDate{};
  if (!parseLocalDate_(localDate, targetDate)) {
    failureReason = "Invalid local date.";
    return false;
  }

  if (runtimeRevision_ != expectedRevision) {
    bool currentState = false;
    if (runtimeRevision_ > expectedRevision &&
        readDayStateForDate_(targetDate, nowDate, currentState) &&
        currentState == isDone) {
      return true;
    }

    failureReason = "Runtime revision conflict.";
    return false;
  }

  bool changed = false;
  if (!setDayStateForDate_(targetDate, isDone, nowDate, &changed)) {
    failureReason = "Failed to apply cloud day state.";
    return false;
  }

  if (changed && !bumpRuntimeRevision()) {
    failureReason = "Failed to persist runtime revision.";
    return false;
  }

  return true;
}

bool HabitTracker::applyHistoryDraft(const HistoryDraftUpdate* updates,
                                     size_t updateCount,
                                     const String& weekTargetsJson,
                                     const WeekDate* weekTargetsCurrentWeekStart,
                                     const tm& nowDate,
                                     uint32_t expectedRevision,
                                     String& failureReason) {
  if (!ensureInitialized_(nowDate)) {
    failureReason = "Tracker is not initialized.";
    return false;
  }

  checkWeekBoundary(nowDate);

  if (runtimeRevision_ != expectedRevision) {
    failureReason = "Runtime revision conflict.";
    return false;
  }

  if ((!updates || updateCount == 0) && weekTargetsJson.isEmpty()) {
    failureReason = "History draft is empty.";
    return false;
  }

  bool anyChanged = false;
  if (!weekTargetsJson.isEmpty()) {
    if (!weekTargetsCurrentWeekStart || !isValidWeekDate_(*weekTargetsCurrentWeekStart)) {
      failureReason = "History draft week targets are missing a valid week start.";
      return false;
    }

    bool weekTargetsChanged = false;
    if (!applyVisibleWeekTargets_(weekTargetsJson, *weekTargetsCurrentWeekStart, nowDate, weekTargetsChanged, failureReason)) {
      return false;
    }

    anyChanged = anyChanged || weekTargetsChanged;
  }

  for (size_t index = 0; index < updateCount; ++index) {
    tm targetDate{};
    if (!parseLocalDate_(updates[index].localDate, targetDate)) {
      failureReason = "History draft contains an invalid local date.";
      return false;
    }

    bool changed = false;
    if (!setDayStateForDate_(targetDate, updates[index].isDone, nowDate, &changed)) {
      failureReason = "Failed to apply one or more history updates.";
      return false;
    }

    anyChanged = anyChanged || changed;
  }

  if (anyChanged && !bumpRuntimeRevision()) {
    failureReason = "Failed to persist runtime revision.";
    return false;
  }

  return true;
}

bool HabitTracker::applyWeeklyTargetChange(uint8_t minimum,
                                           const WeekDate& effectiveWeekStart,
                                           const tm& nowDate,
                                           String& failureReason) {
  if (!ensureInitialized_(nowDate)) {
    failureReason = "Tracker is not initialized.";
    return false;
  }

  checkWeekBoundary(nowDate);

  if (!isValidWeekDate_(effectiveWeekStart)) {
    failureReason = "Weekly target change is missing a valid effective week start.";
    return false;
  }

  minimum_ = constrain(minimum, 1, Config::kDaysPerWeek);
  int affectedWeekCount = weeksBetween_(effectiveWeekStart, mondayOfWeek_(nowDate));
  if (affectedWeekCount < 0) {
    affectedWeekCount = 0;
  } else if (affectedWeekCount >= Config::kWeeks) {
    affectedWeekCount = Config::kWeeks - 1;
  }

  for (int week = 0; week <= affectedWeekCount; ++week) {
    weekTargets_[week] = minimum_;
  }

  evaluateCurrentWeek_();
  for (uint8_t week = 1; week < Config::kWeeks; ++week) {
    if (week > affectedWeekCount || grid_.success[week] < 0) {
      continue;
    }

    evaluateWeek_(week);
  }

  return persist_();
}

bool HabitTracker::bumpRuntimeRevision() {
  runtimeRevision_++;
  return persist_();
}

bool HabitTracker::clearToDefaults(const tm& nowDate) {
  initEmpty_(nowDate);
  runtimeRevision_ = 0;
  return persist_();
}

bool HabitTracker::resetHistory(const tm& nowDate, uint8_t minimum, uint32_t expectedRevision, String& failureReason) {
  if (!ensureInitialized_(nowDate)) {
    failureReason = "Tracker is not initialized.";
    return false;
  }

  checkWeekBoundary(nowDate);

  if (runtimeRevision_ != expectedRevision) {
    failureReason = "Runtime revision conflict.";
    return false;
  }

  initEmpty_(nowDate);
  minimum_ = constrain(minimum, 1, Config::kDaysPerWeek);
  seedWeekTargets_(minimum_);
  runtimeRevision_ = expectedRevision + 1;
  return persist_();
}

bool HabitTracker::currentWeekStart(WeekDate& outDate) const {
  if (!initialized_ || !isValidWeekDate_(lastWeekStart_)) {
    return false;
  }

  outDate = lastWeekStart_;
  return true;
}

bool HabitTracker::restoreFromSnapshot(const String& boardDaysJson,
                                      const String& weekTargetsJson,
                                      const WeekDate& weekStart,
                                      uint8_t minimum,
                                      uint32_t nextRevision,
                                      String& failureReason) {
  if (!isValidWeekDate_(weekStart)) {
    failureReason = "Snapshot week start is invalid.";
    return false;
  }

  DynamicJsonDocument doc(4096);
  DeserializationError error = deserializeJson(doc, boardDaysJson);
  if (error) {
    failureReason = "Snapshot board payload could not be parsed.";
    return false;
  }

  JsonArrayConst weeks = doc.as<JsonArrayConst>();
  if (weeks.isNull() || weeks.size() != Config::kWeeks) {
    failureReason = "Snapshot board payload has the wrong number of weeks.";
    return false;
  }

  memset(&grid_, 0, sizeof(grid_));
  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    JsonArrayConst weekDays = weeks[week].as<JsonArrayConst>();
    if (weekDays.isNull() || weekDays.size() != Config::kDaysPerWeek) {
      failureReason = "Snapshot board payload has an invalid week shape.";
      return false;
    }

    for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
      grid_.days[day][week] = weekDays[day].as<bool>();
    }
  }

  minimum_ = constrain(minimum, 1, Config::kDaysPerWeek);
  if (!weekTargetsJson.isEmpty()) {
    if (!parseWeekTargetsJson_(weekTargetsJson, weekTargets_)) {
      failureReason = "Snapshot week target payload is invalid.";
      return false;
    }
  } else {
    seedWeekTargets_(minimum_);
  }
  evaluateCurrentWeek_();
  for (uint8_t week = 1; week < Config::kWeeks; ++week) {
    evaluateWeek_(week);
  }

  lastWeekStart_ = weekStart;
  isFirstWeek_ = false;
  initialized_ = true;
  runtimeRevision_ = nextRevision;
  return persist_();
}

bool HabitTracker::checkWeekBoundary(const tm& nowDate) {
  if (!ensureInitialized_(nowDate)) {
    return false;
  }

  const WeekDate currentMonday = mondayOfWeek_(nowDate);
  const int weeksDiff = weeksBetween_(lastWeekStart_, currentMonday);
  if (weeksDiff <= 0) {
    return false;
  }

  if (isFirstWeek_) {
    const int8_t earliest = findEarliestRecordedDay_(0);
    const int latestAllowed = Config::kDaysPerWeek - weekTarget(0);
    if (earliest < 0 || earliest > latestAllowed) {
      grid_.success[0] = -1;
    } else {
      evaluateWeek_(0);
    }
    isFirstWeek_ = false;
  } else {
    evaluateWeek_(0);
  }

  shiftWeeks_(weeksDiff);
  for (int week = 1; week < weeksDiff && week < Config::kWeeks; ++week) {
    grid_.success[week] = 0;
  }

  lastWeekStart_ = currentMonday;
  return persist_();
}

int HabitTracker::dayOfWeekMondayBased_(const tm& date) {
  return (date.tm_wday == 0) ? 6 : (date.tm_wday - 1);
}

bool HabitTracker::isValidWeekDate_(const WeekDate& date) {
  return date.year > 2000 && date.month >= 1 && date.month <= 12 && date.day >= 1 && date.day <= 31;
}

bool HabitTracker::parseLocalDate_(const String& localDate, tm& outDate) {
  int year = 0;
  int month = 0;
  int day = 0;
  if (sscanf(localDate.c_str(), "%d-%d-%d", &year, &month, &day) != 3) {
    return false;
  }

  tm parsed{};
  parsed.tm_year = year - 1900;
  parsed.tm_mon = month - 1;
  parsed.tm_mday = day;
  parsed.tm_hour = 12;
  time_t epoch = mktime(&parsed);
  if (epoch == -1) {
    return false;
  }

  tm* normalized = localtime(&epoch);
  if (!normalized) {
    return false;
  }

  outDate = *normalized;
  return true;
}

bool HabitTracker::parseWeekTargetsJson_(const String& weekTargetsJson, uint8_t* outTargets) {
  if (!outTargets) {
    return false;
  }

  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, weekTargetsJson);
  if (error) {
    return false;
  }

  JsonArrayConst weeks = doc.as<JsonArrayConst>();
  if (weeks.isNull() || weeks.size() != Config::kWeeks) {
    return false;
  }

  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    int target = weeks[week] | 0;
    if (target < 1 || target > Config::kDaysPerWeek) {
      return false;
    }

    outTargets[week] = static_cast<uint8_t>(target);
  }

  return true;
}

HabitTracker::WeekDate HabitTracker::toWeekDate_(const tm& date) {
  WeekDate result;
  result.year = date.tm_year + 1900;
  result.month = date.tm_mon + 1;
  result.day = date.tm_mday;
  return result;
}

HabitTracker::WeekDate HabitTracker::mondayOfWeek_(const tm& date) {
  const int daysSinceMonday = dayOfWeekMondayBased_(date);
  time_t epoch = tmToEpoch(date);
  epoch -= static_cast<time_t>(daysSinceMonday) * 86400;
  tm* monday = localtime(&epoch);
  return monday ? toWeekDate_(*monday) : WeekDate{};
}

HabitTracker::WeekDate HabitTracker::offsetWeekDate_(const WeekDate& date, int weekDelta) {
  if (!isValidWeekDate_(date)) {
    return WeekDate{};
  }

  tm base{};
  base.tm_year = date.year - 1900;
  base.tm_mon = date.month - 1;
  base.tm_mday = date.day;
  base.tm_hour = 12;
  time_t epoch = mktime(&base);
  if (epoch == -1) {
    return WeekDate{};
  }

  epoch += static_cast<time_t>(weekDelta) * 7 * 86400;
  tm* shifted = localtime(&epoch);
  return shifted ? toWeekDate_(*shifted) : WeekDate{};
}

int HabitTracker::weeksBetween_(const WeekDate& from, const WeekDate& to) {
  if (!isValidWeekDate_(from) || !isValidWeekDate_(to)) {
    return 0;
  }

  tm fromTm{};
  fromTm.tm_year = from.year - 1900;
  fromTm.tm_mon = from.month - 1;
  fromTm.tm_mday = from.day;
  fromTm.tm_hour = 12;

  tm toTm{};
  toTm.tm_year = to.year - 1900;
  toTm.tm_mon = to.month - 1;
  toTm.tm_mday = to.day;
  toTm.tm_hour = 12;

  const time_t fromEpoch = mktime(&fromTm);
  const time_t toEpoch = mktime(&toTm);
  if (fromEpoch == -1 || toEpoch == -1) {
    return 0;
  }

  return static_cast<int>(difftime(toEpoch, fromEpoch) / (7 * 86400));
}

bool HabitTracker::ensureInitialized_(const tm& nowDate) {
  if (initialized_ && isValidWeekDate_(lastWeekStart_)) {
    return true;
  }

  initEmpty_(nowDate);
  return persist_();
}

bool HabitTracker::applyVisibleWeekTargets_(const String& weekTargetsJson,
                                            const WeekDate& snapshotWeekStart,
                                            const tm& nowDate,
                                            bool& outChanged,
                                            String& failureReason) {
  uint8_t parsedTargets[Config::kWeeks]{};
  if (!parseWeekTargetsJson_(weekTargetsJson, parsedTargets)) {
    failureReason = "History draft week targets are invalid.";
    return false;
  }

  const WeekDate currentWeekStart = mondayOfWeek_(nowDate);
  if (!isValidWeekDate_(currentWeekStart)) {
    failureReason = "Current week is unavailable.";
    return false;
  }

  uint8_t nextTargets[Config::kWeeks]{};
  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    nextTargets[week] = minimum_;
    const WeekDate visibleWeekStart = offsetWeekDate_(currentWeekStart, -static_cast<int>(week));
    const int sourceWeekIndex = weeksBetween_(visibleWeekStart, snapshotWeekStart);
    if (sourceWeekIndex >= 0 && sourceWeekIndex < Config::kWeeks) {
      nextTargets[week] = parsedTargets[sourceWeekIndex];
    }
  }

  outChanged = false;
  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    if (weekTargets_[week] == nextTargets[week]) {
      continue;
    }

    weekTargets_[week] = nextTargets[week];
    outChanged = true;
  }

  if (outChanged) {
    evaluateCurrentWeek_();
    for (uint8_t week = 1; week < Config::kWeeks; ++week) {
      if (grid_.success[week] >= 0) {
        evaluateWeek_(week);
      }
    }
  }

  return true;
}

void HabitTracker::evaluateCurrentWeek_() {
  uint8_t count = 0;
  for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
    if (grid_.days[day][0]) {
      count++;
    }
  }

  grid_.success[0] = (count >= weekTarget(0)) ? 1 : -1;
}

void HabitTracker::evaluateWeek_(uint8_t weekIdx) {
  if (weekIdx >= Config::kWeeks) {
    return;
  }

  uint8_t count = 0;
  for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
    if (grid_.days[day][weekIdx]) {
      count++;
    }
  }

  grid_.success[weekIdx] = (count >= weekTarget(weekIdx)) ? 1 : 0;
}

int8_t HabitTracker::findEarliestRecordedDay_(uint8_t weekIdx) const {
  if (weekIdx >= Config::kWeeks) {
    return -1;
  }

  for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
    if (grid_.days[day][weekIdx]) {
      return static_cast<int8_t>(day);
    }
  }

  return -1;
}

void HabitTracker::initEmpty_(const tm& nowDate) {
  memset(&grid_, 0, sizeof(grid_));
  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    grid_.success[week] = -1;
  }

  lastWeekStart_ = mondayOfWeek_(nowDate);
  minimum_ = Config::kDefaultWeeklyMinimum;
  seedWeekTargets_(minimum_);
  isFirstWeek_ = true;
  initialized_ = true;
}

void HabitTracker::load_() {
  Preferences prefs;
  if (!prefs.begin(kNamespace, true)) {
    return;
  }

  const size_t gridSize = sizeof(grid_);
  if (prefs.getBytes(kGridKey, &grid_, gridSize) != gridSize) {
    memset(&grid_, 0, sizeof(grid_));
    for (uint8_t week = 0; week < Config::kWeeks; ++week) {
      grid_.success[week] = -1;
    }
  }

  if (prefs.getBytes(kWeekStartKey, &lastWeekStart_, sizeof(lastWeekStart_)) != sizeof(lastWeekStart_)) {
    lastWeekStart_ = WeekDate{};
  }

  minimum_ = prefs.getUChar(kMinimumKey, Config::kDefaultWeeklyMinimum);
  if (minimum_ < 1 || minimum_ > Config::kDaysPerWeek) {
    minimum_ = Config::kDefaultWeeklyMinimum;
  }

  const size_t weekTargetsSize = sizeof(weekTargets_);
  if (prefs.getBytes(kWeekTargetsKey, weekTargets_, weekTargetsSize) != weekTargetsSize) {
    seedWeekTargets_(minimum_);
  } else {
    for (uint8_t week = 0; week < Config::kWeeks; ++week) {
      weekTargets_[week] = constrain(weekTargets_[week], 1, Config::kDaysPerWeek);
    }
  }

  isFirstWeek_ = prefs.getBool(kFirstWeekKey, true);
  runtimeRevision_ = prefs.getULong(kRevisionKey, 0);
  prefs.end();

  initialized_ = isValidWeekDate_(lastWeekStart_);
}

bool HabitTracker::setMinimum(uint8_t minimum) {
  const uint8_t nextMinimum = constrain(minimum, 1, Config::kDaysPerWeek);
  if (minimum_ == nextMinimum) {
    return true;
  }

  minimum_ = nextMinimum;
  return persist_();
}

bool HabitTracker::persist_() const {
  Preferences prefs;
  if (!prefs.begin(kNamespace, false)) {
    return false;
  }

  prefs.putBytes(kGridKey, &grid_, sizeof(grid_));
  prefs.putBytes(kWeekStartKey, &lastWeekStart_, sizeof(lastWeekStart_));
  prefs.putUChar(kMinimumKey, minimum_);
  prefs.putBytes(kWeekTargetsKey, weekTargets_, sizeof(weekTargets_));
  prefs.putBool(kFirstWeekKey, isFirstWeek_);
  prefs.putULong(kRevisionKey, runtimeRevision_);
  prefs.end();
  return true;
}

bool HabitTracker::queueLocalToggleToday(const tm& nowDate, bool& outIsDone) {
  if (!ensureInitialized_(nowDate)) {
    return false;
  }

  checkWeekBoundary(nowDate);

  const uint8_t row = todayRow(nowDate);
  grid_.days[row][0] = !grid_.days[row][0];
  outIsDone = grid_.days[row][0];
  evaluateCurrentWeek_();

  runtimeRevision_++;
  return persist_();
}

bool HabitTracker::readDayStateForDate_(const tm& targetDate, const tm& nowDate, bool& outIsDone) const {
  const WeekDate currentMonday = mondayOfWeek_(nowDate);
  const WeekDate targetMonday = mondayOfWeek_(targetDate);
  const int weekIdx = weeksBetween_(targetMonday, currentMonday);
  if (weekIdx < 0 || weekIdx >= Config::kWeeks) {
    return false;
  }

  const uint8_t dayOfWeek = static_cast<uint8_t>(dayOfWeekMondayBased_(targetDate));
  outIsDone = grid_.days[dayOfWeek][weekIdx];
  return true;
}

bool HabitTracker::setDayStateForDate_(const tm& targetDate, bool isDone, const tm& nowDate, bool* outChanged) {
  const WeekDate currentMonday = mondayOfWeek_(nowDate);
  const WeekDate targetMonday = mondayOfWeek_(targetDate);
  const int weekIdx = weeksBetween_(targetMonday, currentMonday);
  if (weekIdx < 0 || weekIdx >= Config::kWeeks) {
    return false;
  }

  const uint8_t dayOfWeek = static_cast<uint8_t>(dayOfWeekMondayBased_(targetDate));
  if (weekIdx == 0 && dayOfWeek > todayRow(nowDate)) {
    return false;
  }

  const bool changed = grid_.days[dayOfWeek][weekIdx] != isDone;
  grid_.days[dayOfWeek][weekIdx] = isDone;
  if (weekIdx == 0) {
    evaluateCurrentWeek_();
  } else {
    evaluateWeek_(static_cast<uint8_t>(weekIdx));
  }

  if (outChanged) {
    *outChanged = changed;
  }

  return persist_();
}

void HabitTracker::shiftWeeks_(int weeks) {
  if (weeks <= 0) {
    return;
  }

  if (weeks > Config::kWeeks) {
    weeks = Config::kWeeks;
  }

  for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
    for (int week = Config::kWeeks - 1; week >= 0; --week) {
      const int sourceWeek = week - weeks;
      grid_.days[day][week] = (sourceWeek >= 0) ? grid_.days[day][sourceWeek] : false;
    }
  }

  for (int week = Config::kWeeks - 1; week >= 0; --week) {
    const int sourceWeek = week - weeks;
    grid_.success[week] = (sourceWeek >= 0) ? grid_.success[sourceWeek] : -1;
    weekTargets_[week] = (sourceWeek >= 0) ? weekTargets_[sourceWeek] : minimum_;
  }
}

void HabitTracker::seedWeekTargets_(uint8_t minimum) {
  const uint8_t normalizedMinimum = constrain(minimum, 1, Config::kDaysPerWeek);
  for (uint8_t week = 0; week < Config::kWeeks; ++week) {
    weekTargets_[week] = normalizedMinimum;
  }
}

uint8_t HabitTracker::weekTarget(uint8_t weekIdx) const {
  if (weekIdx >= Config::kWeeks) {
    return minimum_;
  }

  return constrain(weekTargets_[weekIdx], 1, Config::kDaysPerWeek);
}

bool HabitTracker::syncDate(const tm& nowDate) {
  if (!ensureInitialized_(nowDate)) {
    return false;
  }

  const WeekDate currentMonday = mondayOfWeek_(nowDate);
  if (weeksBetween_(lastWeekStart_, currentMonday) == 0) {
    return true;
  }

  lastWeekStart_ = currentMonday;
  return persist_();
}

uint8_t HabitTracker::todayRow(const tm& nowDate) const {
  return static_cast<uint8_t>(dayOfWeekMondayBased_(nowDate));
}

#include "habit_tracker.h"

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

bool HabitTracker::applyCloudState(const String& localDate, bool isDone, const String& effectiveAt, const tm& nowDate) {
  if (!ensureInitialized_(nowDate)) {
    return false;
  }

  checkWeekBoundary(nowDate);

  tm targetDate{};
  if (!parseLocalDate_(localDate, targetDate)) {
    return false;
  }

  return setDayStateForDate_(targetDate, isDone, effectiveAt, nowDate);
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
    const int latestAllowed = Config::kDaysPerWeek - minimum_;
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

String HabitTracker::defaultEffectiveAt_() {
  return "1970-01-01T00:00:00Z";
}

int HabitTracker::dayOfWeekMondayBased_(const tm& date) {
  return (date.tm_wday == 0) ? 6 : (date.tm_wday - 1);
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

  grid_.success[weekIdx] = (count >= minimum_) ? 1 : 0;
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

  isFirstWeek_ = prefs.getBool(kFirstWeekKey, true);
  pendingEvent_.isPending = prefs.getBool(kPendingFlagKey, false);
  pendingEvent_.deviceEventId = prefs.getString(kPendingEventIdKey, "");
  pendingEvent_.localDate = prefs.getString(kPendingDateKey, "");
  pendingEvent_.isDone = prefs.getBool(kPendingDoneKey, false);
  pendingEvent_.effectiveAt = prefs.getString(kPendingAtKey, "");
  prefs.end();

  initialized_ = isValidWeekDate_(lastWeekStart_);
}

bool HabitTracker::markPendingDeviceEventSynced() {
  if (!pendingEvent_.isPending) {
    return true;
  }

  pendingEvent_ = PendingDeviceEvent{};
  return persist_();
}

bool HabitTracker::setMinimum(uint8_t minimum) {
  const uint8_t nextMinimum = constrain(minimum, 1, Config::kDaysPerWeek);
  if (minimum_ == nextMinimum) {
    return true;
  }

  minimum_ = nextMinimum;
  for (uint8_t week = 1; week < Config::kWeeks; ++week) {
    if (grid_.success[week] >= 0) {
      evaluateWeek_(week);
    }
  }

  uint8_t currentCount = 0;
  for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
    if (grid_.days[day][0]) {
      currentCount++;
    }
  }
  grid_.success[0] = (currentCount >= minimum_) ? 1 : -1;
  return persist_();
}

bool HabitTracker::pendingDeviceEvent(PendingDeviceEvent& outEvent) const {
  if (!pendingEvent_.isPending) {
    return false;
  }

  outEvent = pendingEvent_;
  return true;
}

bool HabitTracker::persist_() const {
  Preferences prefs;
  if (!prefs.begin(kNamespace, false)) {
    return false;
  }

  prefs.putBytes(kGridKey, &grid_, sizeof(grid_));
  prefs.putBytes(kWeekStartKey, &lastWeekStart_, sizeof(lastWeekStart_));
  prefs.putUChar(kMinimumKey, minimum_);
  prefs.putBool(kFirstWeekKey, isFirstWeek_);
  prefs.putBool(kPendingFlagKey, pendingEvent_.isPending);
  prefs.putString(kPendingEventIdKey, pendingEvent_.deviceEventId);
  prefs.putString(kPendingDateKey, pendingEvent_.localDate);
  prefs.putBool(kPendingDoneKey, pendingEvent_.isDone);
  prefs.putString(kPendingAtKey, pendingEvent_.effectiveAt);
  prefs.end();
  return true;
}

bool HabitTracker::queueLocalToggleToday(const tm& nowDate, const String& effectiveAt, bool& outIsDone) {
  if (!ensureInitialized_(nowDate)) {
    return false;
  }

  checkWeekBoundary(nowDate);

  const uint8_t row = todayRow(nowDate);
  grid_.days[row][0] = !grid_.days[row][0];
  outIsDone = grid_.days[row][0];

  uint8_t count = 0;
  for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
    if (grid_.days[day][0]) {
      count++;
    }
  }
  grid_.success[0] = (count >= minimum_) ? 1 : -1;

  char localDate[11];
  snprintf(localDate,
           sizeof(localDate),
           "%04d-%02d-%02d",
           nowDate.tm_year + 1900,
           nowDate.tm_mon + 1,
           nowDate.tm_mday);

  pendingEvent_.localDate = localDate;
  pendingEvent_.isDone = outIsDone;
  pendingEvent_.effectiveAt = effectiveAt.isEmpty() ? defaultEffectiveAt_() : effectiveAt;
  pendingEvent_.deviceEventId = generateDeviceEventId_();
  pendingEvent_.isPending = !pendingEvent_.deviceEventId.isEmpty();

  return pendingEvent_.isPending && persist_();
}

bool HabitTracker::setDayStateForDate_(const tm& targetDate, bool isDone, const String& effectiveAt, const tm& nowDate) {
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

  grid_.days[dayOfWeek][weekIdx] = isDone;
  if (weekIdx == 0) {
    uint8_t count = 0;
    for (uint8_t day = 0; day < Config::kDaysPerWeek; ++day) {
      if (grid_.days[day][weekIdx]) {
        count++;
      }
    }
    grid_.success[weekIdx] = (count >= minimum_) ? 1 : -1;
  } else {
    evaluateWeek_(static_cast<uint8_t>(weekIdx));
  }

  char localDate[11];
  snprintf(localDate,
           sizeof(localDate),
           "%04d-%02d-%02d",
           targetDate.tm_year + 1900,
           targetDate.tm_mon + 1,
           targetDate.tm_mday);

  if (pendingEvent_.isPending && pendingEvent_.localDate == String(localDate) && pendingEvent_.isDone == isDone) {
    pendingEvent_ = PendingDeviceEvent{};
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
  }
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

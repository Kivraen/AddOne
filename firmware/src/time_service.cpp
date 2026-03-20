#include "time_service.h"

#include <ctype.h>
#include <sys/time.h>
#include <time.h>

#include "config.h"

namespace {
struct TimezoneMapping {
  const char* value;
  const char* posix;
};

constexpr TimezoneMapping kSupportedTimezones[] = {
    {"UTC", "UTC0"},
    {"Etc/UTC", "UTC0"},
    {"America/Los_Angeles", "PST8PDT,M3.2.0/2,M11.1.0/2"},
    {"America/Denver", "MST7MDT,M3.2.0/2,M11.1.0/2"},
    {"America/Phoenix", "MST7"},
    {"America/Chicago", "CST6CDT,M3.2.0/2,M11.1.0/2"},
    {"America/New_York", "EST5EDT,M3.2.0/2,M11.1.0/2"},
    {"America/Anchorage", "AKST9AKDT,M3.2.0/2,M11.1.0/2"},
    {"Pacific/Honolulu", "HST10"},
    {"Europe/Warsaw", "CET-1CEST,M3.5.0/2,M10.5.0/3"},
    {"Europe/Kyiv", "EET-2EEST,M3.5.0/3,M10.5.0/4"},
};

time_t currentLocalEpoch() {
  time_t now = time(nullptr);
  tm localTime{};
  if (!localtime_r(&now, &localTime)) {
    return -1;
  }

  return mktime(&localTime);
}
} // namespace

void TimeService::applySettings(const DeviceSettingsState& settings) {
  applyTimezone_(settings.timezone);
  dayResetMinutes_ = settings.dayResetMinutes();
}

void TimeService::begin() {
  applyTimezone_(Config::kDefaultTimezoneIana);
  rtc_.begin();
  loadRtcToSystem_();
}

String TimeService::currentLocalDate() const {
  tm now{};
  if (!nowLocal(now)) {
    return String();
  }

  char buffer[11];
  snprintf(buffer,
           sizeof(buffer),
           "%04d-%02d-%02d",
           now.tm_year + 1900,
           now.tm_mon + 1,
           now.tm_mday);
  return String(buffer);
}

String TimeService::currentLogicalDate() const {
  tm now{};
  if (!nowLogical(now)) {
    return String();
  }

  char buffer[11];
  snprintf(buffer,
           sizeof(buffer),
           "%04d-%02d-%02d",
           now.tm_year + 1900,
           now.tm_mon + 1,
           now.tm_mday);
  return String(buffer);
}

String TimeService::currentUtcIsoTimestamp() const {
  if (!hasValidTime()) {
    return String();
  }

  const time_t utc = time(nullptr);
  tm utcTm{};
  gmtime_r(&utc, &utcTm);

  char buffer[21];
  snprintf(buffer,
           sizeof(buffer),
           "%04d-%02d-%02dT%02d:%02d:%02dZ",
           utcTm.tm_year + 1900,
           utcTm.tm_mon + 1,
           utcTm.tm_mday,
           utcTm.tm_hour,
           utcTm.tm_min,
           utcTm.tm_sec);
  return String(buffer);
}

bool TimeService::hasAuthoritativeTime() const {
  return hasValidTime() && !rtc_.lostPower();
}

bool TimeService::hasValidTime() const {
  return saneUtc_(time(nullptr));
}

bool TimeService::loadRtcToSystem_() {
  if (rtcLoaded_) {
    return true;
  }

  if (rtc_.lostPower()) {
    return false;
  }

  time_t rtcUtc = 0;
  if (!rtc_.readUtc(rtcUtc)) {
    return false;
  }

  timeval tv{.tv_sec = rtcUtc, .tv_usec = 0};
  settimeofday(&tv, nullptr);
  rtcLoaded_ = true;
  return true;
}

bool TimeService::nowLocal(tm& outLocalTime) const {
  if (!hasValidTime()) {
    return false;
  }

  time_t now = time(nullptr);
  return localtime_r(&now, &outLocalTime) != nullptr;
}

bool TimeService::nowLogical(tm& outLocalTime) const {
  if (!hasValidTime()) {
    return false;
  }

  const time_t localEpoch = currentLocalEpoch();
  if (localEpoch == -1) {
    return false;
  }

  const time_t shiftedEpoch = localEpoch - static_cast<time_t>(dayResetMinutes_) * 60;
  return localtime_r(&shiftedEpoch, &outLocalTime) != nullptr;
}

void TimeService::applyTimezone_(const char* timezoneValue) {
  char posixTz[48];
  if (!posixTimezoneForValue_(timezoneValue, posixTz, sizeof(posixTz))) {
    strncpy(posixTz, Config::kDefaultTimezonePosix, sizeof(posixTz) - 1);
    posixTz[sizeof(posixTz) - 1] = '\0';
  }
  setenv("TZ", posixTz, 1);
  tzset();
  const char* activeTimezone = (timezoneValue && timezoneValue[0] != '\0') ? timezoneValue : Config::kDefaultTimezoneIana;
  strncpy(activeTimezoneIana_, activeTimezone, sizeof(activeTimezoneIana_) - 1);
  activeTimezoneIana_[sizeof(activeTimezoneIana_) - 1] = '\0';
}

bool TimeService::parseFixedOffsetTimezone_(const char* timezoneValue, int16_t& outOffsetMinutes) {
  if (!timezoneValue || strncmp(timezoneValue, "UTC", 3) != 0) {
    return false;
  }

  const char sign = timezoneValue[3];
  if (sign != '+' && sign != '-') {
    return false;
  }

  if (!isdigit(static_cast<unsigned char>(timezoneValue[4])) ||
      !isdigit(static_cast<unsigned char>(timezoneValue[5])) ||
      timezoneValue[6] != ':' ||
      !isdigit(static_cast<unsigned char>(timezoneValue[7])) ||
      !isdigit(static_cast<unsigned char>(timezoneValue[8])) ||
      timezoneValue[9] != '\0') {
    return false;
  }

  const int hours = (timezoneValue[4] - '0') * 10 + (timezoneValue[5] - '0');
  const int minutes = (timezoneValue[7] - '0') * 10 + (timezoneValue[8] - '0');
  if (minutes % 15 != 0) {
    return false;
  }

  const int totalMinutes = hours * 60 + minutes;
  if (totalMinutes > 14 * 60) {
    return false;
  }

  const int signedOffsetMinutes = sign == '+' ? totalMinutes : totalMinutes * -1;
  if (signedOffsetMinutes < -12 * 60 || signedOffsetMinutes > 14 * 60) {
    return false;
  }

  outOffsetMinutes = static_cast<int16_t>(signedOffsetMinutes);
  return true;
}

bool TimeService::posixTimezoneForValue_(const char* timezoneValue, char* outValue, size_t outValueSize) {
  if (!outValue || outValueSize == 0) {
    return false;
  }

  const char* normalizedTimezone = (timezoneValue && timezoneValue[0] != '\0') ? timezoneValue : Config::kDefaultTimezoneIana;
  for (const TimezoneMapping& mapping : kSupportedTimezones) {
    if (strcmp(normalizedTimezone, mapping.value) == 0) {
      snprintf(outValue, outValueSize, "%s", mapping.posix);
      return true;
    }
  }

  int16_t offsetMinutes = 0;
  if (!parseFixedOffsetTimezone_(normalizedTimezone, offsetMinutes)) {
    return false;
  }

  const int posixOffsetMinutes = offsetMinutes * -1;
  const char* sign = posixOffsetMinutes < 0 ? "-" : "";
  const int absoluteMinutes = abs(posixOffsetMinutes);
  const int absoluteHours = absoluteMinutes / 60;
  const int remainderMinutes = absoluteMinutes % 60;

  if (remainderMinutes == 0) {
    snprintf(outValue, outValueSize, "UTC%s%d", sign, absoluteHours);
  } else {
    snprintf(outValue, outValueSize, "UTC%s%d:%02d", sign, absoluteHours, remainderMinutes);
  }
  return true;
}

bool TimeService::saneUtc_(time_t utc) {
  return utc >= 1577836800 && utc <= 2145916800;
}

void TimeService::startNtpSync_() {
  char posixTz[48];
  if (!posixTimezoneForValue_(activeTimezoneIana_, posixTz, sizeof(posixTz))) {
    strncpy(posixTz, Config::kDefaultTimezonePosix, sizeof(posixTz) - 1);
    posixTz[sizeof(posixTz) - 1] = '\0';
  }
  configTzTime(posixTz,
               Config::kNtpServer,
               Config::kNtpServer2,
               Config::kNtpServer3);
  ntpStarted_ = true;
  lastNtpKickAtMs_ = millis();
}

void TimeService::syncRtcFromSystem_() {
  if (!rtc_.isPresent() || !hasValidTime()) {
    return;
  }

  const unsigned long nowMs = millis();
  if (!rtc_.lostPower() && nowMs - lastRtcWriteAtMs_ < Config::kRtcWriteIntervalMs) {
    return;
  }

  const time_t utc = time(nullptr);
  if (rtc_.setUtc(utc)) {
    lastRtcWriteAtMs_ = nowMs;
  }
}

void TimeService::update(bool wifiConnected) {
  if (!rtcLoaded_) {
    loadRtcToSystem_();
  }

  if (wifiConnected) {
    if (!ntpStarted_ || millis() - lastNtpKickAtMs_ >= Config::kNtpResyncMs) {
      startNtpSync_();
    }
  }

  syncRtcFromSystem_();
}

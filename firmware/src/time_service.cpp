#include "time_service.h"

#include <sys/time.h>
#include <time.h>

#include "config.h"

namespace {
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

void TimeService::applyTimezone_(const char* timezoneIana) {
  const char* posixTz = posixTimezoneForIana_(timezoneIana);
  setenv("TZ", posixTz, 1);
  tzset();
  strncpy(activeTimezoneIana_, timezoneIana ? timezoneIana : Config::kDefaultTimezoneIana, sizeof(activeTimezoneIana_) - 1);
  activeTimezoneIana_[sizeof(activeTimezoneIana_) - 1] = '\0';
}

const char* TimeService::posixTimezoneForIana_(const char* timezoneIana) {
  if (!timezoneIana || timezoneIana[0] == '\0') {
    return Config::kDefaultTimezonePosix;
  }

  if (strcmp(timezoneIana, "UTC") == 0 || strcmp(timezoneIana, "Etc/UTC") == 0) {
    return "UTC0";
  }
  if (strcmp(timezoneIana, "America/Los_Angeles") == 0) {
    return "PST8PDT,M3.2.0/2,M11.1.0/2";
  }
  if (strcmp(timezoneIana, "America/Denver") == 0) {
    return "MST7MDT,M3.2.0/2,M11.1.0/2";
  }
  if (strcmp(timezoneIana, "America/Chicago") == 0) {
    return "CST6CDT,M3.2.0/2,M11.1.0/2";
  }
  if (strcmp(timezoneIana, "America/New_York") == 0) {
    return "EST5EDT,M3.2.0/2,M11.1.0/2";
  }

  return Config::kDefaultTimezonePosix;
}

bool TimeService::saneUtc_(time_t utc) {
  return utc >= 1577836800 && utc <= 2145916800;
}

void TimeService::startNtpSync_() {
  configTzTime(posixTimezoneForIana_(activeTimezoneIana_),
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

#include "time_service.h"

#include <sys/time.h>
#include <time.h>

#include "config.h"

void TimeService::begin() {
  setenv("TZ", Config::kDefaultTimezonePosix, 1);
  tzset();
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

bool TimeService::hasValidTime() const {
  return saneUtc_(time(nullptr));
}

bool TimeService::loadRtcToSystem_() {
  if (rtcLoaded_) {
    return true;
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

bool TimeService::saneUtc_(time_t utc) {
  return utc >= 1577836800 && utc <= 2145916800;
}

void TimeService::startNtpSync_() {
  configTzTime(Config::kDefaultTimezonePosix,
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
  if (nowMs - lastRtcWriteAtMs_ < Config::kRtcWriteIntervalMs) {
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

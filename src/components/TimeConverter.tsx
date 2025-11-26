"use client";

import { useState, useEffect } from "react";
import { getNow } from "@/utils/timeSync";

const COMMON_TIMEZONES = [
  { label: "太平洋时间 (PT)", value: "America/Los_Angeles", abbr: "PST/PDT" },
  { label: "山地时间 (MT)", value: "America/Denver", abbr: "MST/MDT" },
  { label: "中部时间 (CT)", value: "America/Chicago", abbr: "CST/CDT" },
  { label: "东部时间 (ET)", value: "America/New_York", abbr: "EST/EDT" },
  { label: "北京时间 (CST)", value: "Asia/Shanghai", abbr: "CST" },
  { label: "东京时间 (JST)", value: "Asia/Tokyo", abbr: "JST" },
  { label: "首尔时间 (KST)", value: "Asia/Seoul", abbr: "KST" },
  { label: "伦敦时间 (GMT)", value: "Europe/London", abbr: "GMT/BST" },
  { label: "巴黎时间 (CET)", value: "Europe/Paris", abbr: "CET/CEST" },
  { label: "UTC", value: "UTC", abbr: "UTC" },
];

export default function TimeConverter() {
  const [sourceTimezone, setSourceTimezone] = useState("America/Los_Angeles");
  const [sourceDate, setSourceDate] = useState("");
  const [sourceTime, setSourceTime] = useState("");
  const [localTime, setLocalTime] = useState("");
  const [countdown, setCountdown] = useState("");
  const [unixTimestamp, setUnixTimestamp] = useState("");
  const [unixResult, setUnixResult] = useState("");

  // 初始化默认值为今天
  useEffect(() => {
    const now = getNow();
    const dateStr = now.toISOString().split("T")[0];
    setSourceDate(dateStr);
    setSourceTime("08:00");
  }, []);

  // UNIX 时间戳转换
  useEffect(() => {
    if (!unixTimestamp.trim()) {
      setUnixResult("");
      return;
    }

    try {
      const timestamp = parseInt(unixTimestamp);
      if (isNaN(timestamp)) {
        setUnixResult("无效的时间戳");
        return;
      }

      // 判断是秒还是毫秒
      const ms = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
      const date = new Date(ms);

      if (isNaN(date.getTime())) {
        setUnixResult("无效的时间戳");
        return;
      }

      const localFormatter = new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      setUnixResult(localFormatter.format(date));
    } catch {
      setUnixResult("转换失败");
    }
  }, [unixTimestamp]);

  // 计算转换后的时间
  useEffect(() => {
    if (!sourceDate || !sourceTime) return;

    try {
      // 构造源时区的时间
      const sourceDateTimeStr = `${sourceDate}T${sourceTime}:00`;
      const sourceDateTime = new Date(sourceDateTimeStr);

      // 获取源时区的时间戳
      const sourceFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: sourceTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // 解析输入的时间在源时区的实际时间戳
      const parts = sourceFormatter.formatToParts(sourceDateTime);
      const year = parts.find((p) => p.type === "year")?.value;
      const month = parts.find((p) => p.type === "month")?.value;
      const day = parts.find((p) => p.type === "day")?.value;
      const hour = parts.find((p) => p.type === "hour")?.value;
      const minute = parts.find((p) => p.type === "minute")?.value;

      // 创建源时区的准确时间
      const sourceInUTC = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
      const localInUTC = new Date(sourceFormatter.format(sourceDateTime));
      const offset = sourceInUTC.getTime() - localInUTC.getTime();
      const actualTimestamp = sourceDateTime.getTime() - offset;

      // 转换到本地时区
      const localDate = new Date(actualTimestamp);

      const localFormatter = new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      setLocalTime(localFormatter.format(localDate));

      // 计算倒计时
      const now = getNow();
      const diff = actualTimestamp - now.getTime();

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) {
          setCountdown(`还有 ${days} 天 ${hours} 小时 ${minutes} 分钟`);
        } else if (hours > 0) {
          setCountdown(`还有 ${hours} 小时 ${minutes} 分钟 ${seconds} 秒`);
        } else if (minutes > 0) {
          setCountdown(`还有 ${minutes} 分钟 ${seconds} 秒`);
        } else {
          setCountdown(`还有 ${seconds} 秒`);
        }
      } else {
        setCountdown("已经过去了");
      }
    } catch (error) {
      console.error("时间转换失败", error);
      setLocalTime("转换失败");
      setCountdown("");
    }
  }, [sourceTimezone, sourceDate, sourceTime]);

  // 每秒更新倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      if (!sourceDate || !sourceTime) return;

      try {
        const sourceDateTimeStr = `${sourceDate}T${sourceTime}:00`;
        const sourceDateTime = new Date(sourceDateTimeStr);

        const sourceFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: sourceTimezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });

        const parts = sourceFormatter.formatToParts(sourceDateTime);
        const year = parts.find((p) => p.type === "year")?.value;
        const month = parts.find((p) => p.type === "month")?.value;
        const day = parts.find((p) => p.type === "day")?.value;
        const hour = parts.find((p) => p.type === "hour")?.value;
        const minute = parts.find((p) => p.type === "minute")?.value;

        const sourceInUTC = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
        const localInUTC = new Date(sourceFormatter.format(sourceDateTime));
        const offset = sourceInUTC.getTime() - localInUTC.getTime();
        const actualTimestamp = sourceDateTime.getTime() - offset;

        const now = getNow();
        const diff = actualTimestamp - now.getTime();

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (days > 0) {
            setCountdown(`还有 ${days} 天 ${hours} 小时 ${minutes} 分钟`);
          } else if (hours > 0) {
            setCountdown(`还有 ${hours} 小时 ${minutes} 分钟 ${seconds} 秒`);
          } else if (minutes > 0) {
            setCountdown(`还有 ${minutes} 分钟 ${seconds} 秒`);
          } else {
            setCountdown(`还有 ${seconds} 秒`);
          }
        } else {
          setCountdown("已经过去了");
        }
      } catch {}
    }, 1000);

    return () => clearInterval(timer);
  }, [sourceTimezone, sourceDate, sourceTime]);

  return (
    <div className="time-converter">
      <div className="converter-header">
        <h2>🕐 时区转换器</h2>
        <p>快速知道游戏发售、活动开始在你的时区是什么时候</p>
      </div>

      <div className="converter-form">
        <div className="form-group">
          <label>源时区</label>
          <select value={sourceTimezone} onChange={(e) => setSourceTimezone(e.target.value)}>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label} ({tz.abbr})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>日期</label>
            <input type="date" value={sourceDate} onChange={(e) => setSourceDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label>时间</label>
            <input type="time" value={sourceTime} onChange={(e) => setSourceTime(e.target.value)} />
          </div>
        </div>

        {localTime && (
          <div className="converter-result">
            <div className="result-label">你的本地时间</div>
            <div className="result-time">{localTime}</div>
            {countdown && <div className="result-countdown">{countdown}</div>}
          </div>
        )}
      </div>

      <div className="unix-converter">
        <div className="unix-title">UNIX 时间戳转换</div>
        <div className="form-group">
          <input
            type="text"
            placeholder="输入 UNIX 时间戳（秒或毫秒）"
            value={unixTimestamp}
            onChange={(e) => setUnixTimestamp(e.target.value)}
            className="unix-input"
          />
        </div>
        {unixResult && (
          <div className="unix-result">
            <div className="result-label">本地时间</div>
            <div className="result-time">{unixResult}</div>
          </div>
        )}
        <div className="unix-hint">
          当前时间戳：{Math.floor(getNow().getTime() / 1000)}
        </div>
      </div>
    </div>
  );
}

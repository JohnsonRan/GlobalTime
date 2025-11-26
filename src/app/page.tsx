"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getNow } from "@/utils/timeSync";
import TimeConverter from "@/components/TimeConverter";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="loading-screen">
      <div className="loader" />
      <span>加载中...</span>
    </div>
  ),
});

export default function Home() {
  const [localTime, setLocalTime] = useState("");
  const [localDate, setLocalDate] = useState("");
  const [showConverter, setShowConverter] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = getNow(); // 使用 NTP 校准后的时间
      setLocalTime(now.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }));
      setLocalDate(now.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        weekday: "short",
      }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="map-wrapper">
      <WorldMap />
      
      {/* 右上角本地时间 */}
      <div className="local-time-panel">
        <div className="time">{localTime}</div>
        <div className="label">本地时间 · {localDate}</div>
      </div>

      {/* 时区转换器按钮 */}
      <button className="converter-toggle" onClick={() => setShowConverter(!showConverter)} title="时区转换器">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {/* 时区转换器面板 */}
      {showConverter && (
        <div className="converter-overlay" onClick={() => setShowConverter(false)}>
          <div className="converter-panel" onClick={(e) => e.stopPropagation()}>
            <button className="converter-close" onClick={() => setShowConverter(false)}>
              ✕
            </button>
            <TimeConverter />
          </div>
        </div>
      )}
    </main>
  );
}

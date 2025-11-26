"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getNow } from "@/utils/timeSync";

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
    </main>
  );
}

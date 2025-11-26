"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { timezoneCities, TimezoneCity } from "@/data/timezones";

// 计算相对于用户当前日期的标签
function getRelativeDayLabel(targetDate: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "";
  if (diffDays === 1) return "明天";
  if (diffDays === -1) return "昨天";
  if (diffDays === 2) return "后天";
  if (diffDays === -2) return "前天";
  return diffDays > 0 ? `+${diffDays}天` : `${diffDays}天`;
}

function formatTimeForOffset(lng: number): { time: string; date: string; offset: string; dayLabel: string } {
  const offsetHours = Math.round(lng / 15);
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const localTime = new Date(utc + offsetHours * 3600000);
  
  const time = localTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const date = localTime.toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" });
  const sign = offsetHours >= 0 ? "+" : "";
  const offset = `UTC${sign}${offsetHours}`;
  const dayLabel = getRelativeDayLabel(localTime);
  
  return { time, date, offset, dayLabel };
}

interface TimeInfo {
  time: string;
  date: string;
  isDay: boolean;
  offset: string;
  dayLabel: string;
  timeDiff: string;
}

function formatTime(timezone: string): TimeInfo {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  const time = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  
  const date = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(now);
  
  const hour = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(now));
  const isDay = hour >= 6 && hour < 18;

  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const diff = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  const sign = diff >= 0 ? "+" : "";
  const offset = `UTC${sign}${diff}`;
  
  const dayLabel = getRelativeDayLabel(tzDate);
  
  // 计算与本地时间的差异
  const localOffset = -now.getTimezoneOffset() / 60;
  const hourDiff = diff - localOffset;
  const timeDiff = hourDiff === 0 ? "同步" : (hourDiff > 0 ? `+${hourDiff}h` : `${hourDiff}h`);
  
  return { time, date, isDay, offset, dayLabel, timeDiff };
}


function getDefaultLocation(): { lat: number; lng: number; zoom: number } {
  if (typeof navigator === "undefined") return { lat: 25, lng: 0, zoom: 1.5 };
  
  const lang = navigator.language.toLowerCase();
  const locationMap: Record<string, { lat: number; lng: number; zoom: number }> = {
    "zh": { lat: 35, lng: 105, zoom: 3 },
    "zh-cn": { lat: 35, lng: 105, zoom: 3 },
    "zh-tw": { lat: 23.5, lng: 121, zoom: 4 },
    "zh-hk": { lat: 22.3, lng: 114, zoom: 5 },
    "ja": { lat: 36, lng: 138, zoom: 4 },
    "ko": { lat: 36, lng: 128, zoom: 4 },
    "en": { lat: 40, lng: -100, zoom: 3 },
    "en-us": { lat: 40, lng: -100, zoom: 3 },
    "en-gb": { lat: 54, lng: -2, zoom: 4 },
    "de": { lat: 51, lng: 10, zoom: 4 },
    "fr": { lat: 46, lng: 2, zoom: 4 },
  };
  
  if (locationMap[lang]) return locationMap[lang];
  const prefix = lang.split("-")[0];
  if (locationMap[prefix]) return locationMap[prefix];
  return { lat: 25, lng: 0, zoom: 1.5 };
}

// 创建城市标记
function createMarkerElement(city: TimezoneCity): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "city-marker-container";
  
  const updateMarker = () => {
    const info = formatTime(city.timezone);
    const innerColor = info.isDay ? "#f59e0b" : "#6366f1";
    
    // 只有明天/昨天才显示外圈
    let ringClass = "";
    let showRing = false;
    if (info.dayLabel) {
      showRing = true;
      if (info.dayLabel.includes("明") || info.dayLabel.includes("+")) {
        ringClass = "tomorrow";
      } else {
        ringClass = "yesterday";
      }
    }
    
    el.innerHTML = `
      <div class="marker-wrapper ${ringClass}">
        ${showRing ? `<div class="marker-ring"></div>` : ""}
        <div class="marker-dot" style="background: ${innerColor}; box-shadow: 0 0 10px ${innerColor};"></div>
      </div>
    `;
  };
  
  updateMarker();
  const interval = setInterval(updateMarker, 1000);
  el.dataset.intervalId = String(interval);
  
  return el;
}

// 创建弹窗内容
function createPopupContent(city: TimezoneCity): string {
  const info = formatTime(city.timezone);
  const labelClass = info.dayLabel ? (info.dayLabel.includes("明") || info.dayLabel.includes("+") ? "tomorrow" : "yesterday") : "";
  
  return `
    <div class="popup-content">
      <div class="popup-header">
        <div class="status-dot ${info.isDay ? "day" : "night"}"></div>
        <div class="city-info">
          <span class="city-name">${city.name}</span>
          <span class="country-name">${city.country}</span>
        </div>
        ${info.dayLabel ? `<span class="popup-day-label ${labelClass}">${info.dayLabel}</span>` : ""}
      </div>
      <div class="time-display">
        <span class="time">${info.time}</span>
        <span class="date">${info.date}</span>
      </div>
      <div class="popup-footer">
        <span class="offset">${info.offset}</span>
        <span class="time-diff">${info.timeDiff}</span>
        <span class="day-night">${info.isDay ? "☀️" : "🌙"}</span>
      </div>
    </div>
  `;
}


export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupsRef = useRef<maplibregl.Popup[]>([]);
  
  const [mounted, setMounted] = useState(false);
  const [mouseInfo, setMouseInfo] = useState<{ lat: number; lng: number; time: string; date: string; offset: string; dayLabel: string } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // 初始化地图
  useEffect(() => {
    if (!mounted || !mapContainer.current || map.current) return;

    const defaultLoc = getDefaultLocation();
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [0, 25],
      zoom: 1.5,
      minZoom: 1.5,
      maxZoom: 8,
    });

    const m = map.current;

    m.on("load", () => {
      // 添加时区线（仅普通时区线，不再特殊处理日期变更线）
      const timezoneLines: GeoJSON.Feature[] = [];
      for (let lng = -180; lng <= 180; lng += 15) {
        timezoneLines.push({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [[lng, -85], [lng, 85]],
          },
        });
      }

      m.addSource("timezone-lines", {
        type: "geojson",
        data: { type: "FeatureCollection", features: timezoneLines },
      });

      m.addLayer({
        id: "timezone-lines",
        type: "line",
        source: "timezone-lines",
        paint: {
          "line-color": "rgba(255, 255, 255, 0.1)",
          "line-width": 1,
          "line-dasharray": [2, 4],
        },
      });

      // 添加城市标记
      timezoneCities.forEach((city) => {
        const el = createMarkerElement(city);
        const popup = new maplibregl.Popup({
          offset: 15,
          closeButton: false,
          className: "city-popup",
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([city.lng, city.lat])
          .addTo(m);

        el.addEventListener("mouseenter", () => {
          popup.setHTML(createPopupContent(city)).setLngLat([city.lng, city.lat]).addTo(m);
        });
        el.addEventListener("mouseleave", () => {
          popup.remove();
        });

        markersRef.current.push(marker);
        popupsRef.current.push(popup);
      });

      // 飞到默认位置
      setTimeout(() => {
        m.flyTo({
          center: [defaultLoc.lng, defaultLoc.lat],
          zoom: defaultLoc.zoom,
          duration: 2000,
        });
      }, 500);
    });

    // 鼠标移动事件
    m.on("mousemove", (e) => {
      const { lng, lat } = e.lngLat;
      setMouseInfo({ lat, lng, ...formatTimeForOffset(lng) });
    });

    m.on("mouseout", () => {
      setMouseInfo(null);
    });

    return () => {
      markersRef.current.forEach((marker) => {
        const el = marker.getElement();
        const intervalId = el.dataset.intervalId;
        if (intervalId) clearInterval(Number(intervalId));
        marker.remove();
      });
      popupsRef.current.forEach((popup) => popup.remove());
      m.remove();
      map.current = null;
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <span>加载中...</span>
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />

      {/* 鼠标跟随信息 */}
      {mouseInfo && (
        <div className="mouse-info">
          <div className="mouse-header">
            <span className="mouse-time">{mouseInfo.time}</span>
            {mouseInfo.dayLabel && (
              <span className={`mouse-day-label ${mouseInfo.dayLabel.includes("明") || mouseInfo.dayLabel.includes("+") ? "tomorrow" : "yesterday"}`}>
                {mouseInfo.dayLabel}
              </span>
            )}
          </div>
          <div className="mouse-meta">
            <span>{mouseInfo.offset}</span>
            <span className="mouse-date">{mouseInfo.date}</span>
          </div>
        </div>
      )}

      {/* 图例 */}
      <div className="legend">
        <div className="legend-item">
          <span className="legend-marker day" />
          <span>白天</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker night" />
          <span>夜晚</span>
        </div>
        <div className="legend-divider" />
        <div className="legend-item">
          <span className="legend-combo tomorrow">
            <span className="combo-ring" />
            <span className="combo-dot" />
          </span>
          <span>明天</span>
        </div>
        <div className="legend-item">
          <span className="legend-combo yesterday">
            <span className="combo-ring" />
            <span className="combo-dot" />
          </span>
          <span>昨天</span>
        </div>
      </div>
    </div>
  );
}

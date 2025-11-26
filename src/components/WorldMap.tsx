"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { timezoneCities, TimezoneCity } from "@/data/timezones";
import SearchBox from "./SearchBox";

// 存储键
const STORAGE_KEY = "world-timezone-state";

// 获取相对日期标签
function getRelativeDayLabel(targetDate: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "";
  if (diffDays === 1) return "明天";
  if (diffDays === -1) return "昨天";
  return diffDays > 0 ? `+${diffDays}天` : `${diffDays}天`;
}

// 格式化时间信息
function formatTime(timezone: string) {
  const now = new Date();
  const tzDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  const time = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(now);
  
  const date = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone, month: "numeric", day: "numeric", weekday: "short",
  }).format(now);
  
  const hour = parseInt(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(now));
  const isDay = hour >= 6 && hour < 18;
  
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const diff = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  const offset = `UTC${diff >= 0 ? "+" : ""}${diff}`;
  
  const dayLabel = getRelativeDayLabel(tzDate);
  const localOffset = -now.getTimezoneOffset() / 60;
  const hourDiff = diff - localOffset;
  const timeDiff = hourDiff === 0 ? "同步" : (hourDiff > 0 ? `+${hourDiff}h` : `${hourDiff}h`);
  
  return { time, date, isDay, offset, dayLabel, timeDiff };
}

function formatTimeForOffset(lng: number) {
  const offsetHours = Math.round(lng / 15);
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const localTime = new Date(utc + offsetHours * 3600000);
  
  return {
    time: localTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
    date: localTime.toLocaleDateString("zh-CN", { month: "short", day: "numeric", weekday: "short" }),
    offset: `UTC${offsetHours >= 0 ? "+" : ""}${offsetHours}`,
    dayLabel: getRelativeDayLabel(localTime),
  };
}


// 根据用户语言获取默认地区
function getUserRegionLocation() {
  if (typeof navigator === "undefined") return { lat: 25, lng: 0, zoom: 1.5 };
  
  const lang = navigator.language.toLowerCase();
  const locationMap: Record<string, { lat: number; lng: number; zoom: number }> = {
    "zh": { lat: 35, lng: 105, zoom: 3 },
    "zh-cn": { lat: 35, lng: 105, zoom: 3 },
    "ja": { lat: 36, lng: 138, zoom: 4 },
    "ko": { lat: 36, lng: 128, zoom: 4 },
    "en": { lat: 40, lng: -100, zoom: 3 },
    "en-us": { lat: 40, lng: -100, zoom: 3 },
    "en-gb": { lat: 54, lng: -2, zoom: 4 },
    "de": { lat: 51, lng: 10, zoom: 4 },
    "fr": { lat: 46, lng: 2, zoom: 4 },
  };
  
  return locationMap[lang] || locationMap[lang.split("-")[0]] || { lat: 25, lng: 0, zoom: 1.5 };
}

function getDefaultLocation() {
  // 尝试从 localStorage 恢复
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { center, zoom } = JSON.parse(saved);
        if (center && zoom) return { lat: center[1], lng: center[0], zoom };
      }
    } catch {}
  }
  
  return getUserRegionLocation();
}

// 创建弹窗内容
function createPopupContent(city: TimezoneCity, isMobile: boolean): string {
  const info = formatTime(city.timezone);
  const labelClass = info.dayLabel ? (info.dayLabel.includes("明") || info.dayLabel.includes("+") ? "tomorrow" : "yesterday") : "";
  
  return `
    <div class="popup-content">
      ${isMobile ? '<button class="popup-close" onclick="this.closest(\'.maplibregl-popup\').remove()">✕</button>' : ""}
      <div class="popup-header">
        <div class="status-dot ${info.isDay ? "day" : "night"}"></div>
        <div class="city-info">
          <span class="city-name">${city.name}</span>
          <span class="country-name">${city.nameEn} · ${city.country}</span>
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


interface MarkerData {
  marker: maplibregl.Marker;
  popup: maplibregl.Popup;
  city: TimezoneCity;
  element: HTMLDivElement;
}

export default function WorldMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerData[]>([]);
  const updateIntervalRef = useRef<number | null>(null);
  const mouseLngRef = useRef<{ lng: number; lat: number } | null>(null);
  
  const [mounted, setMounted] = useState(false);
  const [mouseInfo, setMouseInfo] = useState<{ lat: number; lng: number; time: string; date: string; offset: string; dayLabel: string } | null>(null);
  const [zoom, setZoom] = useState(1.5);

  useEffect(() => { setMounted(true); }, []);

  // 统一更新所有标记和弹窗（性能优化：单个定时器）
  const updateAllMarkers = useCallback(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    
    markersRef.current.forEach(({ element, city, popup }) => {
      const info = formatTime(city.timezone);
      const innerColor = info.isDay ? "#fbbf24" : "#818cf8";
      const ringClass = info.dayLabel 
        ? (info.dayLabel.includes("明") || info.dayLabel.includes("+") ? "tomorrow" : "yesterday")
        : "";
      
      // 更新标记（仅在状态变化时）
      const currentClass = element.dataset.ringClass || "";
      const currentDay = element.dataset.isDay || "";
      const newDay = info.isDay ? "1" : "0";
      
      if (currentClass !== ringClass || currentDay !== newDay) {
        element.dataset.ringClass = ringClass;
        element.dataset.isDay = newDay;
        element.innerHTML = `
          <div class="marker-wrapper ${ringClass}">
            ${ringClass ? `<div class="marker-ring"></div>` : ""}
            <div class="marker-dot" style="background: ${innerColor}; box-shadow: 0 0 12px ${innerColor};"></div>
          </div>
        `;
      }
      
      // 更新打开的弹窗时间
      if (popup.isOpen()) {
        const timeEl = popup.getElement()?.querySelector(".time-display .time");
        if (timeEl) {
          timeEl.textContent = info.time;
        }
      }
    });
    
    // 更新鼠标位置时间面板
    if (mouseLngRef.current) {
      const { lng, lat } = mouseLngRef.current;
      setMouseInfo({ lat, lng, ...formatTimeForOffset(lng) });
    }
  }, []);

  // 飞到指定城市
  const flyToCity = useCallback((city: TimezoneCity) => {
    if (!map.current) return;
    map.current.flyTo({ center: [city.lng, city.lat], zoom: 5, duration: 1500 });
    
    // 显示弹窗
    const markerData = markersRef.current.find(m => m.city.id === city.id);
    if (markerData) {
      const isMobile = window.innerWidth < 768;
      markerData.popup.setHTML(createPopupContent(city, isMobile)).setLngLat([city.lng, city.lat]).addTo(map.current);
    }
  }, []);

  // 保存地图状态
  const saveMapState = useCallback(() => {
    if (!map.current) return;
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ center: [center.lng, center.lat], zoom }));
    } catch {}
  }, []);


  // 初始化地图
  useEffect(() => {
    if (!mounted || !mapContainer.current || map.current) return;

    const defaultLoc = getDefaultLocation();
    const hasSavedState = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY);
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: hasSavedState ? [defaultLoc.lng, defaultLoc.lat] : [0, 25],
      zoom: hasSavedState ? defaultLoc.zoom : 1.5,
      minZoom: 1.5,
      maxZoom: 10,
    });

    const m = map.current;

    m.on("load", () => {
      // 根据用户语言设置地图标签语言
      const fullLang = navigator.language.toLowerCase();
      const baseLang = fullLang.split("-")[0];
      
      // 获取语言字段，区分简繁体中文
      const getLabelField = (): string => {
        if (fullLang === "zh-tw" || fullLang === "zh-hk" || fullLang === "zh-hant") {
          return "name:zh-Hant"; // 繁体中文
        }
        if (baseLang === "zh") {
          return "name:zh-Hans"; // 简体中文
        }
        const langMap: Record<string, string> = {
          ja: "name:ja",
          ko: "name:ko",
          en: "name:en",
          de: "name:de",
          fr: "name:fr",
          es: "name:es",
          pt: "name:pt",
          ru: "name:ru",
          ar: "name:ar",
        };
        return langMap[baseLang] || "name:en";
      };
      
      const labelField = getLabelField();
      
      // 更新所有文字图层的语言
      m.getStyle().layers.forEach((layer) => {
        if (layer.type === "symbol" && layer.layout?.["text-field"]) {
          m.setLayoutProperty(layer.id, "text-field", [
            "coalesce",
            ["get", labelField],
            ["get", "name:zh"], // 回退到通用中文
            ["get", "name:en"],
            ["get", "name"]
          ]);
        }
      });
      
      // 时区线
      const timezoneLines: GeoJSON.Feature[] = [];
      for (let lng = -180; lng <= 180; lng += 15) {
        timezoneLines.push({
          type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: [[lng, -85], [lng, 85]] },
        });
      }
      m.addSource("timezone-lines", { type: "geojson", data: { type: "FeatureCollection", features: timezoneLines } });
      m.addLayer({
        id: "timezone-lines", type: "line", source: "timezone-lines",
        paint: { "line-color": "rgba(255, 255, 255, 0.08)", "line-width": 1, "line-dasharray": [2, 4] },
      });

      // 城市标记
      timezoneCities.forEach((city) => {
        const el = document.createElement("div");
        el.className = "city-marker-container";
        el.dataset.name = city.name;
        
        const popup = new maplibregl.Popup({ offset: 15, closeButton: false, className: "city-popup" });
        const marker = new maplibregl.Marker({ element: el }).setLngLat([city.lng, city.lat]).addTo(m);

        let isPopupOpen = false;

        // 桌面端：悬停显示
        el.addEventListener("mouseenter", () => {
          if (!isPopupOpen) {
            const isMobile = window.innerWidth < 768;
            popup.setHTML(createPopupContent(city, isMobile)).setLngLat([city.lng, city.lat]).addTo(m);
          }
        });
        el.addEventListener("mouseleave", () => {
          if (!isPopupOpen) {
            popup.remove();
          }
        });

        // 移动端：点击切换
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isPopupOpen) {
            popup.remove();
            isPopupOpen = false;
          } else {
            // 关闭其他弹窗
            markersRef.current.forEach(({ popup: p }) => p.remove());
            const isMobile = window.innerWidth < 768;
            popup.setHTML(createPopupContent(city, isMobile)).setLngLat([city.lng, city.lat]).addTo(m);
            isPopupOpen = true;
          }
        });

        // 弹窗关闭时重置状态
        popup.on("close", () => {
          isPopupOpen = false;
        });

        markersRef.current.push({ marker, popup, city, element: el });
      });

      // 初始更新
      updateAllMarkers();

      // 飞到默认位置（如果没有保存状态）
      if (!hasSavedState) {
        setTimeout(() => {
          m.flyTo({ center: [defaultLoc.lng, defaultLoc.lat], zoom: defaultLoc.zoom, duration: 2000 });
        }, 500);
      }
    });

    // 点击地图关闭所有弹窗
    m.on("click", () => {
      markersRef.current.forEach(({ popup }) => popup.remove());
    });

    // 事件监听
    m.on("mousemove", (e) => {
      const { lng, lat } = e.lngLat;
      mouseLngRef.current = { lng, lat };
      setMouseInfo({ lat, lng, ...formatTimeForOffset(lng) });
    });
    m.on("mouseout", () => {
      mouseLngRef.current = null;
      setMouseInfo(null);
    });
    m.on("zoomend", () => {
      setZoom(m.getZoom());
      saveMapState();
    });
    m.on("moveend", saveMapState);

    // 键盘快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "=" || e.key === "+") m.zoomIn();
      else if (e.key === "-") m.zoomOut();
      else if (e.key === "0") {
        // 重置：清除 localStorage 并飞到用户当前地区
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        const userLoc = getUserRegionLocation();
        m.flyTo({ center: [userLoc.lng, userLoc.lat], zoom: userLoc.zoom, duration: 2000 });
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // 统一定时器更新所有标记
    updateIntervalRef.current = window.setInterval(updateAllMarkers, 1000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
      markersRef.current.forEach(({ marker, popup }) => { marker.remove(); popup.remove(); });
      markersRef.current = [];
      m.remove();
      map.current = null;
    };
  }, [mounted, updateAllMarkers, saveMapState]);


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

      {/* 搜索框 */}
      <div className="search-container">
        <SearchBox onSelect={flyToCity} />
      </div>

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

      {/* 缩放级别显示城市名 */}
      {zoom >= 4 && (
        <style>{`
          .city-marker-container::after {
            content: attr(data-name);
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: rgba(255,255,255,0.8);
            white-space: nowrap;
            margin-top: 2px;
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          }
        `}</style>
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
          <span className="legend-combo tomorrow"><span className="combo-ring" /><span className="combo-dot" /></span>
          <span>明天</span>
        </div>
        <div className="legend-item">
          <span className="legend-combo yesterday"><span className="combo-ring" /><span className="combo-dot" /></span>
          <span>昨天</span>
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="shortcuts-hint">
        <span><kbd>+</kbd><kbd>-</kbd> 缩放</span>
        <span><kbd>0</kbd> 重置</span>
        <span><kbd>Ctrl</kbd><kbd>K</kbd> 搜索</span>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { searchCities, TimezoneCity } from "@/data/timezones";

interface SearchBoxProps {
  onSelect: (city: TimezoneCity) => void;
}

export default function SearchBox({ onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TimezoneCity[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResults(searchCities(query));
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (city: TimezoneCity) => {
    onSelect(city);
    setQuery("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // 全局快捷键
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

  return (
    <div className="search-box">
      <div className="search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="搜索城市..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
        />
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <span className="search-shortcut">⌘K</span>
      </div>
      
      {isOpen && results.length > 0 && (
        <div className="search-results">
          {results.map((city, i) => (
            <div
              key={city.id}
              className={`search-result-item ${i === selectedIndex ? "selected" : ""}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseDown={() => handleSelect(city)}
            >
              <span className="result-name">{city.name}</span>
              <span className="result-meta">{city.nameEn} · {city.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

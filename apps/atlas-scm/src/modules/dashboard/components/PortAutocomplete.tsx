"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PortAutocomplete.tsx
// Premium autocomplete for port / location lookup backed by LocationService.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
  CSSProperties,
} from "react";
import { Location, LocationService } from "../tracker-services/locationService";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PortAutocompleteProps {
  label: string;
  placeholder?: string;
  value?: Location | null;
  onSelect: (location: Location | null) => void;
  disabled?: boolean;
}

// ─── Type-badge colour map ────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  SEAPORT: "#3b82f6",
  AIRPORT: "#8b5cf6",
  INLAND_PORT: "#10b981",
};

function getTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? "#64748b";
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ─── Spinner (CSS keyframe injected once) ─────────────────────────────────────

const SPINNER_ID = "port-autocomplete-spinner-style";

function injectSpinnerStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SPINNER_ID)) return;
  const style = document.createElement("style");
  style.id = SPINNER_ID;
  style.textContent = `
    @keyframes pa-spin { to { transform: rotate(360deg); } }
    .pa-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: var(--accent, #6366f1);
      border-radius: 50%;
      animation: pa-spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    .pa-item-hover:hover {
      background: rgba(99,102,241,0.12) !important;
    }
  `;
  document.head.appendChild(style);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PortAutocomplete: React.FC<PortAutocompleteProps> = ({
  label,
  placeholder = "Search port, city or country…",
  value = null,
  onSelect,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inject spinner CSS once on mount
  useEffect(() => {
    injectSpinnerStyle();
  }, []);

  // Click-outside → close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When the external `value` prop changes, sync the input display text
  useEffect(() => {
    if (value) {
      setInputValue(value.name);
    } else {
      setInputValue("");
    }
  }, [value]);

  // Debounced search
  const runSearch = useCallback((query: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const hits = await LocationService.search(query);
        setResults(hits);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setInputValue(q);
    // If user starts typing again after a selection, clear the selection
    if (value) onSelect(null);
    runSearch(q);
  }

  function handleSelect(loc: Location) {
    onSelect(loc);
    setInputValue(loc.name);
    setIsOpen(false);
    setActiveIndex(-1);
    setResults([]);
  }

  function handleClear() {
    onSelect(null);
    setInputValue("");
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const s: any = {
    wrapper: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      width: "100%",
    },
    label: {
      fontSize: "12px",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--text-secondary, #94a3b8)",
    },
    inputRow: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    iconLeft: {
      position: "absolute",
      left: "12px",
      color: "var(--text-secondary, #64748b)",
      pointerEvents: "none",
      display: "flex",
      alignItems: "center",
    },
    input: {
      width: "100%",
      padding: "10px 40px 10px 38px",
      background: "var(--card-bg, rgba(15,23,42,0.6))",
      border: "1px solid var(--border, rgba(99,102,241,0.25))",
      borderRadius: "10px",
      color: "inherit",
      fontSize: "14px",
      outline: "none",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxSizing: "border-box",
    },
    inputFocused: {
      borderColor: "var(--accent, #6366f1)",
      boxShadow: "0 0 0 3px rgba(99,102,241,0.15)",
    },
    rightAdornment: {
      position: "absolute",
      right: "10px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    clearBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "var(--text-secondary, #64748b)",
      fontSize: "16px",
      lineHeight: 1,
      padding: "2px 4px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      transition: "color 0.15s",
    },
    dropdown: {
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      right: 0,
      zIndex: 1000,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      background: "rgba(15,23,42,0.95)",
      border: "1px solid var(--border, rgba(99,102,241,0.25))",
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      maxHeight: "320px",
      overflowY: "auto",
      padding: "4px",
    },
    item: (active: boolean): CSSProperties => ({
      display: "flex",
      alignItems: "center",
      gap: "10px",
      padding: "9px 12px",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "background 0.15s",
      background: active
        ? "var(--accent-soft, rgba(99,102,241,0.18))"
        : "transparent",
    }),
    flag: {
      fontSize: "20px",
      lineHeight: 1,
      flexShrink: 0,
    },
    itemBody: {
      display: "flex",
      flexDirection: "column",
      gap: "2px",
      minWidth: 0,
      flex: 1,
    },
    itemTop: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    locode: {
      fontWeight: 700,
      fontSize: "13px",
      fontFamily: "monospace",
      color: "#e2e8f0",
      flexShrink: 0,
    },
    locationName: {
      fontSize: "13px",
      color: "#cbd5e1",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    typeBadge: (type: string): CSSProperties => ({
      marginLeft: "auto",
      flexShrink: 0,
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.05em",
      padding: "2px 7px",
      borderRadius: "20px",
      background: `${getTypeColor(type)}22`,
      color: getTypeColor(type),
      border: `1px solid ${getTypeColor(type)}55`,
      whiteSpace: "nowrap",
    }),
    emptyMsg: {
      padding: "16px 12px",
      textAlign: "center",
      color: "var(--text-secondary, #64748b)",
      fontSize: "13px",
    },
  };

  const [focused, setFocused] = useState(false);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={s.wrapper}>
      {/* Label */}
      <label style={s.label}>{label}</label>

      {/* Input row */}
      <div style={s.inputRow}>
        {/* Left search icon */}
        <span style={s.iconLeft}>
          <SearchIcon />
        </span>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true);
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-activedescendant={
            activeIndex >= 0 ? `pa-item-${activeIndex}` : undefined
          }
          style={{
            ...s.input,
            ...(focused ? s.inputFocused : {}),
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "not-allowed" : "text",
          }}
        />

        {/* Right: spinner OR clear button */}
        <span style={s.rightAdornment}>
          {isLoading && <span className="pa-spinner" aria-label="Searching…" />}
          {!isLoading && value && (
            <button
              style={s.clearBtn}
              onClick={handleClear}
              aria-label="Clear selection"
              type="button"
              title="Clear"
            >
              ✕
            </button>
          )}
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          style={s.dropdown}
          role="listbox"
          aria-label={`${label} suggestions`}
        >
          {results.length === 0 ? (
            <div style={s.emptyMsg}>No locations found for "{inputValue}"</div>
          ) : (
            results.map((loc, idx) => {
              const flag = LocationService.getFlag(loc.countryCode);
              const active = idx === activeIndex;
              return (
                <div
                  key={loc.locode}
                  id={`pa-item-${idx}`}
                  role="option"
                  aria-selected={active}
                  className="pa-item-hover"
                  style={s.item(active)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    // Prevent input blur before selection registers
                    e.preventDefault();
                    handleSelect(loc);
                  }}
                >
                  {/* Flag */}
                  <span style={s.flag} aria-hidden="true">
                    {flag}
                  </span>

                  {/* Body */}
                  <div style={s.itemBody}>
                    <div style={s.itemTop}>
                      <span style={s.locode}>{loc.locode}</span>
                      <span style={s.locationName}>
                        {loc.name}
                        {loc.nameAlias ? ` (${loc.nameAlias})` : ""}
                        {", "}
                        {loc.countryName}
                      </span>

                      {/* Type badge */}
                      <span style={s.typeBadge(loc.type)}>
                        {loc.type.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default PortAutocomplete;

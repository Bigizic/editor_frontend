import React, { useState, useRef, useEffect } from "react";
import { FiChevronDown } from "react-icons/fi";

const CUSTOM_VALUE = "__custom__";

/**
 * Modern Select component with optional custom input.
 * @param {Object} props
 * @param {string} props.value - Current value
 * @param {function} props.onChange - (value: string) => void
 * @param {Array<{value: string, label: string}>|string[]} props.options - Options (objects or strings)
 * @param {string} [props.placeholder] - Placeholder when empty
 * @param {boolean} [props.canEdit=false] - When true, allows custom option input
 * @param {boolean} [props.speakerSelect=false] - When true with canEdit, custom input for speaker (Speaker N or custom label)
 * @param {string[]} [props.existingSpeakerLabels=[]] - For speakerSelect: labels to compute max speaker number
 * @param {string} [props.customOptionLabel] - Label for the custom option (default: "Custom...")
 * @param {boolean} [props.disabled] - Disabled state
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.id] - Input id for labels
 */
const Select = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  canEdit = false,
  speakerSelect = false,
  existingSpeakerLabels = [],
  customOptionLabel = "Custom...",
  disabled = false,
  className = "",
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const containerRef = useRef(null);

  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const maxSpeakerNum = (() => {
    if (!speakerSelect || !existingSpeakerLabels?.length) return 0;
    let max = 0;
    existingSpeakerLabels.forEach((lbl) => {
      const m = (lbl || "").match(/^Speaker\s+(\d+)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    });
    return max;
  })();

  const isCustomValue = value === CUSTOM_VALUE || (canEdit && speakerSelect && value && !normalizedOptions.some((o) => o.value === value));

  const displayValue = (() => {
    if (value === "" || value == null) return placeholder;
    if (value === CUSTOM_VALUE) return customOptionLabel;
    const opt = normalizedOptions.find((o) => o.value === value);
    return opt ? opt.label : value;
  })();

  const handleSelect = (val) => {
    if (val === CUSTOM_VALUE) {
      const existingCustom = value && !normalizedOptions.some((o) => o.value === value);
      setCustomInput(existingCustom ? value : speakerSelect ? "Speaker " : "");
      setIsEditingCustom(true);
    } else {
      setIsEditingCustom(false);
      onChange(val);
    }
    setIsOpen(false);
  };

  const handleCustomSubmit = () => {
    const trimmed = (customInput || "").trim();
    if (!trimmed) {
      setIsEditingCustom(false);
      return;
    }
    if (speakerSelect) {
      const match = trimmed.match(/^Speaker\s+(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num <= maxSpeakerNum) {
          return; // invalid, don't submit
        }
      }
    }
    onChange(trimmed);
    setIsEditingCustom(false);
    setCustomInput("");
  };

  const handleCustomKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomSubmit();
    }
    if (e.key === "Escape") {
      setIsEditingCustom(false);
      setCustomInput("");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        if (isEditingCustom && customInput.trim()) {
          handleCustomSubmit();
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditingCustom, customInput]);

  if (isEditingCustom) {
    return (
      <div className={`select-wrapper select-custom-edit ${className}`.trim()} ref={containerRef}>
        <div className="select-custom-input-row">
          <input
            type="text"
            className="select-custom-input"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onBlur={handleCustomSubmit}
            onKeyDown={handleCustomKeyDown}
            placeholder={speakerSelect ? "Speaker N or custom label" : "Enter custom value"}
            autoFocus
            disabled={disabled}
          />
          {speakerSelect && maxSpeakerNum > 0 && (
            <span className="select-custom-hint">
              Number must be &gt; {maxSpeakerNum}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`select-wrapper ${disabled ? "disabled" : ""} ${className}`.trim()}
    >
      <button
        type="button"
        className="select-trigger"
        onClick={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        id={id}
      >
        <span className="select-value">{displayValue}</span>
        <FiChevronDown className={`select-chevron ${isOpen ? "open" : ""}`} />
      </button>
      {isOpen && (
        <div className="select-dropdown">
          {placeholder && (
            <button
              type="button"
              className={`select-option ${(value === "" || value == null) ? "selected" : ""}`}
              onClick={() => handleSelect("")}
            >
              {placeholder}
            </button>
          )}
          {normalizedOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`select-option ${value === opt.value ? "selected" : ""}`}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
          {canEdit && (
            <button
              type="button"
              className={`select-option select-option-custom ${value === CUSTOM_VALUE ? "selected" : ""}`}
              onClick={() => handleSelect(CUSTOM_VALUE)}
            >
              {customOptionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Select;
export { CUSTOM_VALUE };

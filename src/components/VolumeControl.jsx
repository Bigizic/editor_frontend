import React from "react";

/**
 * Compact volume slider: short label, wide flat track, percentage value.
 * Use for dialogue/background gain or per-segment vocal gain.
 */
const VolumeControl = ({
  label,
  value,
  onChange,
  min = 0,
  max = 2,
  step = 0.05,
  title,
  compact = false,
  showPercent = true,
  disabled = false,
}) => {
  /* Display as 0–100% when max=2 (1.0 = 100%), else 0–100 from value/max */
  const percent = showPercent
    ? max === 2
      ? Math.round(value * 100)
      : Math.round((value / max) * 100)
    : value;
  return (
    <div className={`volume-control ${compact ? "volume-control--compact" : ""} ${disabled ? "volume-control--disabled" : ""}`}>
      <span className="volume-control-label" title={title}>
        {label}
      </span>
      <input
        type="range"
        className="volume-control-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        title={title}
        aria-label={label}
        disabled={disabled}
      />
      {showPercent && (
        <span className="volume-control-value" aria-live="polite">
          {percent}%
        </span>
      )}
    </div>
  );
};

export default VolumeControl;

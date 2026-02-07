import React, { useState, useRef } from "react";
import { FiUpload, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";
import Select from "./Select.jsx";
import VolumeControl from "./VolumeControl.jsx";

const SUPPORTED_LANGUAGES = {
  en: { name: "English", flag: "🇺🇸" },
  es: { name: "Spanish", flag: "🇪🇸" },
  fr: { name: "French", flag: "🇫🇷" },
  de: { name: "German", flag: "🇩🇪" },
  ru: { name: "Russian", flag: "🇷🇺" },
  zh: { name: "Chinese (Mandarin)", flag: "🇨🇳" },
  sw: { name: "Swahili", flag: "🇹🇿" },
  yo: { name: "Yoruba", flag: "🇳🇬" }
};

// Source languages include auto_detect for per-segment language detection
const SOURCE_LANGUAGES = {
  auto_detect: { name: "Auto Detect", flag: "🔍" },
  ...SUPPORTED_LANGUAGES
};

const DubbingForm = ({ onSubmit, submitting, lastSubmission }) => {
  const [videoFile, setVideoFile] = useState(null);
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [sourceLanguage, setSourceLanguage] = useState("auto_detect");
  const [dialogueGain, setDialogueGain] = useState(0.5);
  const [backgroundGain, setBackgroundGain] = useState(0.25);
  const [enableVoiceCloning, setEnableVoiceCloning] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!videoFile) {
      return;
    }
    onSubmit({
      videoFile,
      targetLanguage,
      sourceLanguage,
      dialogueGain,
      backgroundGain,
      enableVoiceCloning
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setVideoFile(files[0]);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0] || null;
    setVideoFile(file);
  };

  const handleRemoveFile = () => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form className="card dubbing-form-compact" onSubmit={handleSubmit}>
      <h3 className="card-title">Submit New Dubbing</h3>
      <div className="form-row">
        <label>Video File</label>
        <div
          className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${videoFile ? 'has-file' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {videoFile ? (
            <div className="file-selected">
              <span className="file-name">{videoFile.name}</span>
              <button
                type="button"
                className="file-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
              >
                <FiX />
              </button>
            </div>
          ) : (
            <div className="file-drop-content">
              <FiUpload className="upload-icon" />
              <p>Drag and drop your file here, or click to browse</p>
              <span className="file-hint">Supports video and audio files</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>
      <div className="form-row">
        <label>Source Language</label>
        <Select
          value={sourceLanguage}
          onChange={setSourceLanguage}
          options={Object.entries(SOURCE_LANGUAGES).map(([code, data]) => ({
            value: code,
            label: code === 'auto_detect' ? (
              <span>
                {data.flag} {data.name}
                <span style={{ fontSize: '0.75em', opacity: 0.75, marginLeft: '8px', fontWeight: 'normal' }}>
                  (For best results, we recommend picking a specific language)
                </span>
              </span>
            ) : `${data.flag} ${data.name}`
          }))}
          placeholder="Select source language"
          className="language-select-wrapper"
        />
      </div>
      <div className="form-row">
        <label>Target Language</label>
        <Select
          value={targetLanguage}
          onChange={setTargetLanguage}
          options={Object.entries(SUPPORTED_LANGUAGES).map(([code, data]) => ({
            value: code,
            label: `${data.flag} ${data.name}`
          }))}
          placeholder="Select target language"
          className="language-select-wrapper"
        />
      </div>

      <div className="dubbing-form-advanced">
        <button
          type="button"
          className="advanced-toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? <FiChevronUp /> : <FiChevronDown />}
          <span>Advanced audio &amp; voice</span>
        </button>
        {showAdvanced && (
          <div className="advanced-controls">
            <div className="form-row">
              <label>Vocals (dialogue) level</label>
              <VolumeControl
                label="Dialogue"
                value={dialogueGain}
                onChange={setDialogueGain}
                min={0}
                max={2}
                step={0.05}
                title="Higher = louder speech in the final mix (0.5 ≈ -6dB, 1 = 0dB)"
              />
            </div>
            <div className="form-row">
              <label>Background (music/effects) level</label>
              <VolumeControl
                label="Background"
                value={backgroundGain}
                onChange={setBackgroundGain}
                min={0}
                max={2}
                step={0.05}
                title="Higher = louder background in the final mix (0.25 ≈ -12dB, 1 = 0dB)"
              />
            </div>
            <div className="form-row form-row-checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={enableVoiceCloning}
                  onChange={(e) => setEnableVoiceCloning(e.target.checked)}
                />
                <span>Enable voice cloning</span>
              </label>
              <span className="form-hint">
                Clone speakers’ voices when they have 1–2 min of speech. You can change voices in the editor.
              </span>
            </div>
          </div>
        )}
      </div>

      <button className="button primary" type="submit" disabled={submitting || !videoFile}>
        {submitting ? "Submitting..." : "Submit Job"}
      </button>
      {lastSubmission && (
        <p className="badge">Queued: {lastSubmission.job_id}</p>
      )}
    </form>
  );
};

export default DubbingForm;

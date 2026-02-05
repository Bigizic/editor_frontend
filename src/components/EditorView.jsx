import React, { useState, useMemo, useEffect, useRef } from "react";
import { retranslateSegment, redubSegment } from "../api/editorApi.js";
import { FiPlay, FiCheck, FiX, FiRefreshCw, FiShuffle, FiTrash } from "react-icons/fi";
import GenderIcon from "./GenderIcon.jsx";
import Select from "./Select.jsx";
import VolumeControl from "./VolumeControl.jsx";
import { VOICE_TYPES as VOICE_TYPES_LIST } from "../utils/voiceTypes.js";
import { VOICE_PROFILES, getProfilesForGender, displayVoiceProfile } from "../utils/voiceProfiles.js";

const EditorView = ({
  video,
  segments,
  speakers = [],
  allSpeakerLabels = [],
  speakerSegmentModes = {},
  onReassignSpeaker,
  checkSegmentMismatch,
  onApplyChanges,
  applying,
  changingLanguage,
  redubbing,
  targetLanguage,
  supportedLanguages,
  onChangeLanguage,
  onPlaySegment,
  currentPlaybackTime = 0,
  onRedub,
  onUpdateSegmentMeta,
  onSegmentVocalGainChange,
  onSegmentBackgroundGainChange,
  onDeleteSegment
}) => {
  const LANGUAGE_LABELS = supportedLanguages || {};
  const LANGUAGE_FLAGS = {
    auto_detect: "🔍",
    en: "🇺🇸",
    es: "🇪🇸",
    fr: "🇫🇷",
    de: "🇩🇪",
    ru: "🇷🇺",
    zh: "🇨🇳",
    sw: "🇹🇿"
  };
  const LANGUAGE_LABELS_WITH_AUTO = { auto_detect: "Auto Detect", ...LANGUAGE_LABELS };

  // safety checks - do these first before any other code
  if (!video) {
    return <div className="card">No video data available</div>;
  }
  if (!segments || !Array.isArray(segments)) {
    return <div className="card">No segments available</div>;
  }

  // now safe to use segments
  const speakerOrder = useMemo(() => {
    const order = [];
    (speakers || []).forEach((speaker) => {
      if (speaker?.speaker_label && !order.includes(speaker.speaker_label)) {
        order.push(speaker.speaker_label);
      }
    });
    (segments || []).forEach((segment) => {
      if (segment?.speaker_label && !order.includes(segment.speaker_label)) {
        order.push(segment.speaker_label);
      }
    });
    return order;
  }, [speakers, segments]);

  const speakerMetaMap = useMemo(() => {
    const map = {};
    speakerOrder.forEach((label, index) => {
      const meta = (speakers || []).find(
        (speaker) => speaker?.speaker_label === label
      );
      map[label] = {
        ...(meta || {}),
        displayLabel: meta?.voice_name || `Speaker ${index + 1}`,
        voiceType: meta?.voice_type || meta?.voice_name || null,
        gender: meta?.gender || null
      };
    });
    return map;
  }, [speakerOrder, speakers]);

  const inferGenderFromLabel = (label) => {
    if (!label || typeof label !== "string") return null;
    const clean = label.trim().toLowerCase();
    if (["male", "m"].includes(clean)) return "male";
    if (["female", "f"].includes(clean)) return "female";
    if (["child", "c", "kid"].includes(clean)) return "child";
    return null;
  };

  const getSpeakerDetails = (label) => {
    if (!label) {
      return {
        displayLabel: "Speaker",
        voiceType: null,
        gender: null
      };
    }
    const orderIndex = speakerOrder.indexOf(label);
    const mapped = speakerMetaMap[label] || {};
    const inferredGender = inferGenderFromLabel(label);
    return {
      displayLabel:
        mapped.displayLabel ||
        (orderIndex >= 0 ? `Speaker ${orderIndex + 1}` : label),
      voiceType: mapped.voiceType || null,
      gender: mapped.gender || inferredGender || null
    };
  };

  const formatGender = (gender) => {
    if (!gender || typeof gender !== "string") return null;
    const clean = gender.trim().toLowerCase();
    if (!clean) return null;
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const voiceTypesList = Array.isArray(VOICE_TYPES_LIST) ? VOICE_TYPES_LIST : [];

  const formatMs = (ms) => {
    if (ms === null || ms === undefined) {
      return "--:--.---";
    }
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    const millis = (ms % 1000).toString().padStart(3, "0");
    return `${minutes}:${seconds}.${millis}`;
  };

  const initialEdits = useMemo(() => {
    const map = {};
    if (segments && Array.isArray(segments)) {
      segments.forEach((segment) => {
        if (segment && segment.id) {
          map[segment.id] = {
            source_text: segment.source_text || '',
            target_text: segment.target_text || '',
            speaker_label: segment.speaker_label ?? null,
            gender: segment.gender || '',
            voice_type: segment.voice_type || '',
            voice_profile: segment.voice_profile || ''
          };
        }
      });
    }
    return map;
  }, [segments]);

  const [edits, setEdits] = useState(initialEdits);
  const [retranslations, setRetranslations] = useState({});
  const [retranslatingId, setRetranslatingId] = useState(null);
  const [redubbingId, setRedubbingId] = useState(null);
  const segmentRefs = useRef({});

  useEffect(() => {
    setEdits(initialEdits);
  }, [initialEdits]);

  // auto-resize textareas on mount and when content changes
  useEffect(() => {
    const textareas = document.querySelectorAll('.auto-resize-textarea');
    textareas.forEach((textarea) => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
  }, [edits, segments, retranslations]);

  // auto-scroll to active segment (only within transcript container)
  const transcriptScrollRef = useRef(null);

  useEffect(() => {
    if (!currentPlaybackTime || !segments || !Array.isArray(segments)) return;

    // find the active segment
    const activeSegment = segments.find(
      segment => segment &&
        currentPlaybackTime >= (segment.start_time_ms || 0) &&
        currentPlaybackTime < (segment.end_time_ms || 0)
    );

    if (activeSegment && activeSegment.id && segmentRefs.current[activeSegment.id] && transcriptScrollRef.current) {
      const element = segmentRefs.current[activeSegment.id];
      const container = transcriptScrollRef.current;

      if (element && container) {
        // get positions relative to the container
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // calculate if element is outside visible area
        const isAbove = elementRect.top < containerRect.top;
        const isBelow = elementRect.bottom > containerRect.bottom;

        // only scroll if element is not fully visible
        if (isAbove || isBelow) {
          const scrollTop = container.scrollTop;
          const elementOffsetTop = element.offsetTop;
          const containerHeight = container.clientHeight;
          const elementHeight = element.offsetHeight;

          // calculate target scroll position to center the element
          const targetScroll = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2);

          container.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentPlaybackTime, segments]);

  const handleChange = (segmentId, field, value) => {
    setEdits((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        [field]: value
      }
    }));
  };

  const handleMetaChange = (segmentId, field, value) => {
    setEdits((prev) => {
      const next = { ...prev, [segmentId]: { ...prev[segmentId], [field]: value || '' } };
      if (field === 'gender') {
        const segment = segments?.find((s) => s?.id === segmentId);
        const profiles = getProfilesForGender(value);
        const currentProfile = next[segmentId]?.voice_profile ?? segment?.voice_profile ?? '';
        if (currentProfile && profiles.length > 0 && !profiles.includes(currentProfile)) {
          next[segmentId].voice_profile = '';
        }
      }
      return next;
    });
  };

  const handleSpeakerChange = (segmentId, newLabel) => {
    const value = newLabel === "Unassigned" ? null : newLabel;
    const mode = value ? speakerSegmentModes[value] : null;
    setEdits((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        speaker_label: value,
        ...(mode?.gender && { gender: mode.gender }),
        ...(mode?.voiceType && { voice_type: mode.voiceType }),
        ...(mode?.voiceProfile && { voice_profile: mode.voiceProfile })
      }
    }));
  };

  // safely calculate dirty segments
  const dirtySegments = (segments || [])
    .filter(segment => segment && segment.id)
    .map((segment) => {
      const current = edits[segment.id];
      if (!current) {
        return null;
      }
      const hasSourceChange = current.source_text !== segment.source_text;
      const hasTargetChange = current.target_text !== segment.target_text;
      const hasSpeakerChange = (current.speaker_label ?? null) !== (segment.speaker_label ?? null);
      const hasGenderChange = (current.gender || '') !== (segment.gender || '');
      const hasVoiceTypeChange = (current.voice_type || '') !== (segment.voice_type || '');
      const hasVoiceProfileChange = (current.voice_profile || '') !== (segment.voice_profile || '');
      if (!hasSourceChange && !hasTargetChange && !hasSpeakerChange && !hasGenderChange && !hasVoiceTypeChange && !hasVoiceProfileChange) {
        return null;
      }
      return {
        segment_id: segment.id,
        source_text: current.source_text,
        target_text: current.target_text,
        speaker_label: current.speaker_label ?? null,
        gender: current.gender || null,
        voice_type: current.voice_type || null,
        voice_profile: current.voice_profile || null
      };
    })
    .filter(Boolean);

  const handleTranslateFromSource = async (segment) => {
    try {
      setRetranslatingId(segment.id);
      // get the edited source text if available, otherwise use original
      const sourceText = edits[segment.id]?.source_text || segment.source_text;
      // use per-segment source_language when video used auto_detect
      const segSourceLang = segment.source_language || video.source_language;
      const response = await retranslateSegment(segment.id, {
        source_language: segSourceLang,
        target_language: targetLanguage,
        source_text: sourceText
      });
      setRetranslations((prev) => ({
        ...prev,
        [segment.id]: response.translated_text
      }));
    } finally {
      setRetranslatingId(null);
    }
  };

  const acceptRetranslation = (segmentId) => {
    const text = retranslations[segmentId];
    if (!text) {
      return;
    }
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) {
      return;
    }

    // get current edit state to include source_text if it was edited
    const currentEdit = edits[segmentId] || {};
    const sourceText = currentEdit.source_text || segment.source_text;

    // update the edits with the new translation
    setEdits((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        target_text: text,
        source_text: sourceText
      }
    }));

    // clear the retranslation preview
    setRetranslations((prev) => {
      const next = { ...prev };
      delete next[segmentId];
      return next;
    });

    // automatically trigger Apply Changes with the updated values
    const change = {
      segment_id: segmentId,
      source_text: sourceText,
      target_text: text
    };
    onApplyChanges([change]);
  };

  const discardRetranslation = (segmentId) => {
    setRetranslations((prev) => {
      const next = { ...prev };
      delete next[segmentId];
      return next;
    });
  };

  const handleRedubSegment = async (segment) => {
    try {
      setRedubbingId(segment.id);
      const current = edits[segment.id];
      await redubSegment(segment.id, {
        target_text: current?.target_text ?? segment.target_text,
        gender: current?.gender || segment.gender,
        voice_profile: current?.voice_profile ?? segment.voice_profile
      });
      alert("Segment audio redubbed successfully!");
      window.location.reload();
    } catch (error) {
      alert(`Failed to redub segment: ${error.message}`);
    } finally {
      setRedubbingId(null);
    }
  };

  // final safety check before render
  if (!video || !segments || !Array.isArray(segments)) {
    return (
      <div className="card">
        <h3 className="card-title">Editor Timeline</h3>
        <div>Loading editor data...</div>
      </div>
    );
  }

  return (
    <div className="card editor-view">
      <h3 className="card-title">Editor Timeline</h3>
      <div className="timeline-table transcript-scroll" ref={transcriptScrollRef}>
        {segments && segments.length > 0 ? segments.filter(segment => segment && segment.id).map((segment, index) => {
          const isActive = currentPlaybackTime >= (segment.start_time_ms || 0) &&
            currentPlaybackTime < (segment.end_time_ms || 0);
          const speakerDetails = getSpeakerDetails(segment.speaker_label);
          const effectiveGender = edits[segment.id]?.gender ?? segment.gender ?? speakerDetails.gender ?? "";
          const genderText = formatGender(effectiveGender);
          const profiles = getProfilesForGender(effectiveGender) || [];
          const mismatch = checkSegmentMismatch ? checkSegmentMismatch(segment.speaker_label || "Unassigned", segment) : { gender: false, voiceType: false, voiceProfile: false, any: false };
          const speakerLabels = allSpeakerLabels?.length ? allSpeakerLabels : (speakerOrder.length ? speakerOrder : ["Unassigned"]);
          return (
            <div
              key={segment.id}
              ref={(el) => {
                if (el && segment.id) segmentRefs.current[segment.id] = el;
              }}
              className={`timeline-row-wrapper ${isActive ? 'active-segment' : ''}`}
            >
              <div className="segment-number">{index + 1}</div>
              <div className={`timeline-row ${isActive ? 'active-segment' : ''}`}>
                <div className="segment-header">
                  <div className="segment-line segment-line-meta">
                    <div className="meta-inline">
                      {speakerLabels.length > 0 ? (
                        <div className="meta-select-group compact">
                          <span className="meta-label">Speaker</span>
                          <Select
                            value={(edits[segment.id]?.speaker_label ?? segment.speaker_label) || "Unassigned"}
                            onChange={(val) => handleSpeakerChange(segment.id, val)}
                            options={speakerLabels}
                            canEdit={true}
                            speakerSelect={true}
                            existingSpeakerLabels={speakerLabels.filter((l) => l !== "Unassigned")}
                            customOptionLabel="Custom speaker..."
                            className="meta-select"
                          />
                        </div>
                      ) : null}
                      <div className="meta-select-group compact">
                        <span className="meta-label">Gender</span>
                        <Select
                          value={effectiveGender}
                          onChange={(val) => handleMetaChange(segment.id, "gender", val)}
                          options={[
                            { value: "male", label: "Male" },
                            { value: "female", label: "Female" },
                            { value: "child", label: "Child" },
                            { value: "neutral", label: "Neutral" },
                            { value: "unknown", label: "Unknown" }
                          ]}
                          placeholder="Auto"
                          className="meta-select"
                        />
                      </div>
                      <div className="meta-select-group compact">
                        <span className="meta-label">Voice type</span>
                        <Select
                          value={edits[segment.id]?.voice_type ?? segment.voice_type ?? ""}
                          onChange={(val) => handleMetaChange(segment.id, "voice_type", val)}
                          options={voiceTypesList}
                          placeholder="Pick"
                          className="meta-select"
                        />
                      </div>
                      <div className="meta-select-group compact second">
                        <span className="meta-label">Voice profile</span>
                        <Select
                          value={edits[segment.id]?.voice_profile || segment.voice_profile || ""}
                          onChange={(val) => handleMetaChange(segment.id, "voice_profile", val)}
                          options={profiles.map((p) => ({ value: p, label: displayVoiceProfile(p) }))}
                          placeholder="Select"
                          canEdit={true}
                          customOptionLabel="Custom profile..."
                          className="meta-select"
                        />
                        <span className="meta-hint">
                          {effectiveGender
                            ? `${formatGender(effectiveGender)} profiles`
                            : "Choose gender to filter"}
                        </span>
                      </div>
                      {(onSegmentVocalGainChange || onSegmentBackgroundGainChange) ? (
                        <div className="segment-volume-stack">
                          {onSegmentVocalGainChange ? (
                            <div className="meta-select-group compact vocal-gain-group">
                              <VolumeControl
                                label="Vocal"
                                value={segment.vocal_gain ?? 1}
                                onChange={(v) => onSegmentVocalGainChange(segment.id, v)}
                                min={0}
                                max={2}
                                step={0.05}
                                compact
                                title="Per-segment vocal volume (Apply volume in audio panel to hear)"
                              />
                            </div>
                          ) : null}
                          {onSegmentBackgroundGainChange ? (
                            <div className="meta-select-group compact vocal-gain-group">
                              <VolumeControl
                                label="BG"
                                value={segment.background_gain ?? 1}
                                onChange={(v) => onSegmentBackgroundGainChange(segment.id, v)}
                                min={0}
                                max={2}
                                step={0.05}
                                compact
                                title="Per-segment background volume (Apply volume in audio panel to hear)"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="segment-line segment-line-container">
                    <div className="segment-line third">
                      <button
                        className="icon-button"
                        onClick={() => onPlaySegment(segment)}
                        title={
                          segment.active_audio_take?.id
                            ? "Play audio"
                            : "No audio available for this segment"
                        }
                        disabled={!segment.active_audio_take?.id}
                      >
                        <FiPlay />
                      </button>
                      <button
                        className="icon-button danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSegment(segment.id);
                        }}
                        title="Delete segment"
                        style={{ marginLeft: 8 }}
                      >
                        <FiTrash />
                      </button>
                      {!segment.active_audio_take?.id && (
                        <span className="audio-missing-hint">
                          Audio not found — redub manually
                        </span>
                      )}
                    </div>

                    <div className="segment-line secondary">
                      <div className="timeline-time">
                        <span className="time-range">
                          {formatMs(segment.start_time_ms || 0)} → {formatMs(segment.end_time_ms || 0)}
                        </span>
                      </div>
                      {speakerDetails.voiceType ? (
                        <span className="speaker-voice">{speakerDetails.voiceType}</span>
                      ) : null}
                      {genderText ? (
                        <span className="gender-text">{genderText}</span>
                      ) : null}
                      {mismatch.any ? (
                        <div className="segment-mismatch-badges">
                          {mismatch.gender ? <span className="badge badge-warn">Gender mismatch with {speakerDetails.displayLabel || segment.speaker_label || "speaker"}</span> : null}
                          {mismatch.voiceType ? <span className="badge badge-warn">Voice type mismatch with {speakerDetails.displayLabel || segment.speaker_label || "speaker"}</span> : null}
                          {mismatch.voiceProfile ? <span className="badge badge-warn">Voice profile mismatch with {speakerDetails.displayLabel || segment.speaker_label || "speaker"}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                </div>
                <div className="timeline-text-row">
                  <div className="timeline-text">
                    <div className="label-with-button">
                      <label>Source</label>
                      <button
                        className={`button secondary small ${retranslatingId === segment.id || (edits[segment.id]?.source_text ?? segment.source_text ?? '') === (segment.source_text ?? '') ? 'muted' : ''}`}
                        onClick={() => handleTranslateFromSource(segment)}
                        disabled={retranslatingId === segment.id || changingLanguage || redubbing || redubbingId === segment.id || (edits[segment.id]?.source_text ?? segment.source_text ?? '') === (segment.source_text ?? '')}
                        title={(edits[segment.id]?.source_text ?? segment.source_text ?? '') === (segment.source_text ?? '') ? "Edit source text to retranslate" : "Retranslate this segment"}
                      >
                        {retranslatingId === segment.id ? 'Translating...' : 'Retranslate'}
                      </button>
                    </div>
                    <textarea
                      className="auto-resize-textarea"
                      value={edits[segment.id]?.source_text || ""}
                      onChange={(event) => {
                        handleChange(segment.id, "source_text", event.target.value);
                        // auto-resize textarea
                        event.target.style.height = 'auto';
                        event.target.style.height = event.target.scrollHeight + 'px';
                      }}
                      disabled={applying || changingLanguage || redubbing}
                      rows={1}
                    />
                    {segment.source_language ? (
                      <small className="segment-source-lang-hint">
                        Detected: {LANGUAGE_LABELS_WITH_AUTO[segment.source_language] || segment.source_language}
                      </small>
                    ) : null}
                  </div>
                  <div className="timeline-text">
                    <div className="label-with-button label-with-button-target">
                      <label>Target</label>
                      <button
                        className={`button secondary small ${redubbingId === segment.id ? 'muted' : ''}`}
                        onClick={() => handleRedubSegment(segment)}
                        disabled={retranslatingId === segment.id || changingLanguage || redubbing || redubbingId === segment.id}
                        title="Redub audio for this segment"
                      >
                        <FiShuffle />
                        <span>{redubbingId === segment.id ? 'Redubbing...' : 'Redub'}</span>
                      </button>
                      {retranslations[segment.id] ? (
                        <div className="confirm-row">
                          <button
                            className="button primary"
                            onClick={() => acceptRetranslation(segment.id)}
                          >
                            <FiCheck />
                          </button>
                          <button
                            className="button secondary"
                            onClick={() => discardRetranslation(segment.id)}
                          >
                            <FiX />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <textarea
                      className="auto-resize-textarea"
                      value={
                        retranslations[segment.id] ||
                        edits[segment.id]?.target_text ||
                        ""
                      }
                      onChange={(event) => {
                        handleChange(segment.id, "target_text", event.target.value);
                        // auto-resize textarea
                        event.target.style.height = 'auto';
                        event.target.style.height = event.target.scrollHeight + 'px';
                      }}
                      disabled={applying || changingLanguage || redubbing}
                      rows={1}
                    />
                    {retranslations[segment.id] ? (
                      <div className="new-translation-note">
                        New translation: {retranslations[segment.id]}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : <div className="empty-state">No segments available</div>}
      </div>
      <div className="apply-bar-fixed">
        <span className="apply-label">
          {dirtySegments.length
            ? `${dirtySegments.length} segment(s) modified`
            : "No pending changes"}
        </span>
        <button
          className={`button primary ${!dirtySegments.length ? "muted" : ""}`}
          disabled={!dirtySegments.length || applying || changingLanguage || redubbing}
          onClick={() => onApplyChanges(dirtySegments)}
        >
          {applying ? "Applying..." : "Apply Changes"}
        </button>
      </div>
    </div>
  );
};

export default EditorView;

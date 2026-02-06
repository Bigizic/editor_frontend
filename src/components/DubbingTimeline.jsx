import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import AudioWaveform from "./AudioWaveform.jsx";
import { FiVolume2, FiMic, FiHeadphones, FiMoreHorizontal } from "react-icons/fi";
import "../styles/DubbingTimeline.css";

const DEFAULT_ZOOM = 50; // pixels per second
const SCRUB_ZOOM = 150; // pixels per second when scrubbing

const DubbingTimeline = ({
  audioUrl,
  speakers = [],
  onWaveReady,
  onSelectionChange
}) => {
  const [wavesurfer, setWavesurfer] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);

  // UI State for sidebar controls
  const [solodSpeakers, setSolodSpeakers] = useState({}); // { label: boolean }
  const solodSpeakersRef = useRef({}); // Ref for audioprocess access
  const [speakerVolumes, setSpeakerVolumes] = useState({}); // { label: value }

  const tracksContainerRef = useRef(null);
  const rulerRef = useRef(null);

  // Sync ref
  useEffect(() => {
    solodSpeakersRef.current = solodSpeakers;
  }, [solodSpeakers]);

  // --- WAVESURFER INITIALIZATION & SYNC ---
  const handleInternalWaveReady = useCallback((ws) => {
    setWavesurfer(ws);
    setDuration(ws.getDuration());

    ws.on('ready', () => setDuration(ws.getDuration()));

    // Playback Logic (Solo handling)
    ws.on('audioprocess', (time) => {
      setCurrentTime(time);

      const activeSolos = Object.entries(solodSpeakersRef.current)
        .filter(([_, isActive]) => isActive)
        .map(([label]) => label);

      if (activeSolos.length === 0) {
        // No solos, play full mix
        ws.setVolume(1);
        return;
      }

      // Check if current time is inside any segment of a solo'd speaker
      const timeMs = time * 1000;
      const isAudible = speakers.some(sp => {
        if (!activeSolos.includes(sp.label)) return false;
        // Check this speaker's segments
        return (sp.segments || []).some(seg =>
          timeMs >= seg.start_time_ms && timeMs <= seg.end_time_ms
        );
      });

      // Mute if not in a solo'd segment
      ws.setVolume(isAudible ? 1 : 0);
    });

    ws.on('seek', () => setCurrentTime(ws.getCurrentTime()));

    if (onWaveReady) onWaveReady(ws);
  }, [onWaveReady, speakers]);

  // --- SCROLL SYNC ---
  // When the main container scrolls, we don't need to do much as everything is inside it.
  // But we might need to sync the ruler or sidebar?
  // Sidebar is separate (flex row). Left sidebar is fixed width. 
  // Tracks container (right side) scrolls X.

  const handleScroll = (e) => {
    setScrollLeft(e.target.scrollLeft);
    // If we had a separate ruler container outside, we'd sync it here.
  };

  // --- RULER SCRUBBING LOGIC ---
  const handleRulerMouseDown = (e) => {
    e.preventDefault();
    setIsScrubbing(true);
    setZoom(SCRUB_ZOOM); // Zoom In

    const startX = e.clientX;
    const startScroll = tracksContainerRef.current ? tracksContainerRef.current.scrollLeft : 0;

    // Calculate time at mouse position initially
    updateTimeFromMouse(e.clientX, startScroll);

    const onMouseMove = (moveEvent) => {
      updateTimeFromMouse(moveEvent.clientX, tracksContainerRef.current?.scrollLeft || 0);
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      setZoom(DEFAULT_ZOOM); // Zoom Back Out
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const updateTimeFromMouse = (clientX, scrollLeftOffset) => {
    if (!tracksContainerRef.current || !duration) return;

    const rect = tracksContainerRef.current.getBoundingClientRect();
    // Re-calculate relative X in the timeline CONTENT (including scroll)
    // clientX maps to a visible point. 
    // timeline starts at rect.left.
    // absolute X in pixels = (clientX - rect.left) + scrollLeftOffset

    let clickX = (clientX - rect.left) + scrollLeftOffset;

    // Convert pixels to seconds
    let time = clickX / zoom;
    time = Math.max(0, Math.min(time, duration));

    if (wavesurfer) {
      wavesurfer.setTime(time); // seek
      // Optional: Play a snippet if we want "Scrubbing audio" effect? 
      // wavesurfer.play(time, time + 0.1); 
      // For now, simple seek. 
      setCurrentTime(time);
    }
  };

  // Ensure scroll position is maintained or adjusted when zoom changes?
  // When zooming in at the same playback time, we might want to center the playhead?
  // For simplicity, we just let it reflow. 

  const totalWidth = useMemo(() => {
    return Math.max(duration * zoom, 0);
  }, [duration, zoom]);

  // --- RULER RENDERING ---
  // Generate ticks based on zoom
  const ticks = useMemo(() => {
    if (!duration) return [];
    const tickCount = Math.floor(duration); // 1 tick per second?
    const generated = [];
    // If zoomed in (150px/sec), show every 0.2s? 
    // If zoomed out (50px/sec), show every 1s?

    const step = zoom > 100 ? 0.2 : 1;

    for (let t = 0; t <= duration; t += step) {
      generated.push({
        time: t,
        left: t * zoom,
        isMajor: Number.isInteger(t)
      });
    }
    return generated;
  }, [duration, zoom]);

  // --- HELPER RENDERING ---
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getSpeakerColorClass = (index) => {
    // We only have 2 hardcoded styles requested: Speaker 1 (pink), Speaker 2 (blue).
    // Loop them if more.
    return index % 2 === 0 ? '' : 'speaker-2';
  };

  const toggleSolo = (label) => {
    setSolodSpeakers(prev => ({ ...prev, [label]: !prev[label] }));
    // Logic to mute others would go here
  };

  const handleSegmentClick = (e, seg) => {
    e.stopPropagation();
    if (wavesurfer) {
      const start = seg.start_time_ms / 1000;
      const end = seg.end_time_ms / 1000;
      wavesurfer.play(start, end);
    }
  };

  return (
    <div className="dubbing-timeline-card">
      <div className={`scrub-overlay ${isScrubbing ? 'active' : ''}`} />

      <div className="dubbing-timeline">
        {/* --- SIDEBAR --- */}
        <div className="timeline-sidebar">
          <div className="sidebar-header">
            Tracks
          </div>

          {/* Track 1: Background */}
          <div className="sidebar-track background-track">
            <div className="sidebar-track-content">
              <div className="track-info-row">
                <span className="track-name"><FiMic /> Background</span>
                <div className="track-controls">
                  <button className="control-btn" title="Solo"><FiHeadphones /></button>
                </div>
              </div>
              <div className="volume-slider-container">
                <input type="range" className="volume-slider" min="0" max="1" step="0.1" defaultValue="0.5" />
              </div>
            </div>
          </div>

          {/* Speaker Tracks */}
          {speakers.map((sp, idx) => {
            const isSolo = !!solodSpeakers[sp.label];
            return (
              <div key={sp.label || idx} className={`sidebar-track ${isSolo ? 'selected' : ''}`}>
                <div className="sidebar-track-content">
                  <div className="track-info-row">
                    <span className="track-name" title={sp.displayLabel}>
                      <FiVolume2 /> {sp.displayLabel || `Speaker ${idx + 1}`}
                    </span>
                    <div className="track-controls">
                      <button
                        className={`control-btn ${isSolo ? 'active' : ''}`}
                        onClick={() => toggleSolo(sp.label)}
                        title="Solo Speaker"
                      >
                        <FiHeadphones />
                      </button>
                      <button className="control-btn" title="Options"><FiMoreHorizontal /></button>
                    </div>
                  </div>
                  <div className="volume-slider-container">
                    <input
                      type="range"
                      className="volume-slider"
                      min="0" max="1" step="0.1"
                      defaultValue="1"
                      onChange={(e) => setSpeakerVolumes(p => ({ ...p, [sp.label]: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* --- CONTENT --- */}
        <div className="timeline-content">
          {/* Ruler (Fixed at top of content area) */}
          <div
            className="timeline-ruler-wrapper"
            onMouseDown={handleRulerMouseDown}
            ref={rulerRef}
          >
            <div
              className="timeline-ruler-ticks"
              style={{
                width: totalWidth,
                transform: `translateX(-${scrollLeft}px)` // Sync with scroll
              }}
            >
              {ticks.map((tick) => (
                <div
                  key={tick.time}
                  className={`ruler-tick ${tick.isMajor ? 'major' : 'minor'}`}
                  style={{ left: tick.left }}
                >
                  {tick.isMajor ? formatTime(tick.time) : ''}
                </div>
              ))}
            </div>

            {/* Playhead in Ruler */}
            <div
              className="playhead-triangle"
              style={{ left: (currentTime * zoom) - scrollLeft }}
            />
          </div>

          {/* Scrollable Tracks Area */}
          <div
            className="timeline-tracks-scrollable"
            ref={tracksContainerRef}
            onScroll={handleScroll}
          >
            <div style={{ width: totalWidth, position: 'relative' }}>

              {/* Global Playhead Line (spans height) */}
              <div
                className="playhead-line"
                style={{ left: currentTime * zoom }}
              />

              {/* Track 1: Background Waveform */}
              <div className="track-lane background-track">
                {/* We force AudioWaveform to be specific width */}
                <div style={{ width: '100%', height: '100%' }}>
                  <AudioWaveform
                    audioUrl={audioUrl}
                    timelineContainer={null} // We use custom ruler
                    onReady={handleInternalWaveReady}
                    onSelectionChange={onSelectionChange}
                    zoom={zoom}
                  // Pass specific style or class if needed to override defaults?
                  />
                </div>
              </div>

              {/* Speaker Tracks */}
              {speakers.map((sp, idx) => {
                const colorClass = getSpeakerColorClass(idx);
                return (
                  <div key={sp.label || idx} className="track-lane">
                    {sp.segments && sp.segments.map(seg => {
                      const start = seg.start_time_ms / 1000;
                      const end = seg.end_time_ms / 1000;
                      const width = (end - start) * zoom;
                      const left = start * zoom;

                      return (
                        <React.Fragment key={seg.id}>
                          {/* Row 1: Original */}
                          <div
                            className={`segment-clip original ${colorClass}`}
                            style={{ left, width }}
                            title={`Original: ${seg.source_text}`}
                            onClick={(e) => handleSegmentClick(e, seg)} // Click to Play
                          >
                            <span className="clip-label">ORIG</span>
                            <span className="segment-text">{seg.source_text || "..."}</span>
                          </div>

                          {/* Row 2: Dubbed */}
                          <div
                            className={`segment-clip dubbed ${colorClass}`}
                            style={{ left, width }}
                            title={`Dubbed: ${seg.target_text}`}
                            onClick={(e) => handleSegmentClick(e, seg)} // Click to Play
                          >
                            <span className="segment-text">{seg.target_text || "..."}</span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DubbingTimeline;

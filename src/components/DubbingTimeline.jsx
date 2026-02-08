import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import AudioWaveform from "./AudioWaveform.jsx";
import Loading from "./Loading.jsx";
import { FiVolume2, FiMic, FiHeadphones, FiMoreHorizontal, FiVolumeX } from "react-icons/fi";
import "../styles/DubbingTimeline.css";

const DEFAULT_ZOOM = 50; // pixels per second
const SCRUB_ZOOM = 150; // pixels per second when scrubbing

const DubbingTimeline = ({
  audioUrl,
  speakers = [],
  onWaveReady,
  onSelectionChange,
  onSegmentUpdate
}) => {
  const [wavesurfer, setWavesurfer] = useState(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Refs for event listeners to avoid stale closures
  const isScrubbingRef = useRef(isScrubbing);
  const zoomRef = useRef(zoom);

  useEffect(() => { isScrubbingRef.current = isScrubbing; }, [isScrubbing]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // UI State for sidebar controls
  const [solodSpeakers, setSolodSpeakers] = useState({}); // { label: boolean }
  const solodSpeakersRef = useRef({});

  const [mutedSpeakers, setMutedSpeakers] = useState({}); // { label: boolean }
  const mutedSpeakersRef = useRef({});

  const speakersRef = useRef(speakers); // Ref for latest speakers data

  const [speakerVolumes, setSpeakerVolumes] = useState({}); // { label: value }

  const tracksContainerRef = useRef(null);
  const sidebarRef = useRef(null);
  const rulerRef = useRef(null);

  // Sync refs
  useEffect(() => {
    solodSpeakersRef.current = solodSpeakers;
  }, [solodSpeakers]);

  useEffect(() => {
    mutedSpeakersRef.current = mutedSpeakers;
  }, [mutedSpeakers]);

  useEffect(() => {
    speakersRef.current = speakers;
  }, [speakers]);

  const [dragging, setDragging] = useState(null); // { segmentId, edge: 'start'|'end', initialX, initialTime, originalSegment }

  // Create a flattened list of all segments for easier ripple calculation
  const allSegments = useMemo(() => {
    return speakers.flatMap(sp => sp.segments || []).sort((a, b) => a.order_index - b.order_index);
  }, [speakers]);

  // Handle Resize Start
  const handleResizeStart = (e, segment, edge) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging({
      segmentId: segment.id,
      edge,
      initialX: e.clientX,
      initialStart: segment.start_time_ms,
      initialEnd: segment.end_time_ms,
      originalSegment: segment
    });
  };

  // Global Mouse Handlers for Dragging
  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e) => {
      if (!tracksContainerRef.current) return;

      const deltaPx = e.clientX - dragging.initialX;
      // Convert px to ms: deltaPx / zoom * 1000
      const deltaMs = (deltaPx / zoom) * 1000;

      setDragging(prev => ({ ...prev, deltaMs }));
    };

    const onMouseUp = async () => {
      // Commit change
      if (dragging && dragging.deltaMs) {
        const { segmentId, edge, initialStart, initialEnd, deltaMs } = dragging;

        // Calculate final values (rounded to integer ms)
        let newStart = initialStart;
        let newEnd = initialEnd;

        if (edge === 'start') {
          newStart = Math.round(initialStart + deltaMs);
        } else {
          newEnd = Math.round(initialEnd + deltaMs);
        }

        // Basic validation
        if (newEnd > newStart + 100) { // minimum 100ms duration
          if (onSegmentUpdate) {
            // Trigger update with is_manual_stretch=true
            // If dragging 'end', it's a stretch/compress
            // If dragging 'start', standard move? Or also stretch? 
            // User request specifically mentioned "manual stretch and compress".
            // Usually stretch is changing duration.

            // If we change END, we are changing duration -> Stretch.
            // If we change START, we are also changing duration -> Stretch.
            // Both should trigger manual stretch logic if duration changes.

            onSegmentUpdate(segmentId, {
              start_time_ms: newStart,
              end_time_ms: newEnd,
              is_manual_stretch: true
            });
          }
        }
      }
      setDragging(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, zoom, onSegmentUpdate]);

  // Helper to get effective segment timing (considering drag & ripple)
  const getRenderTiming = (segment) => {
    // 1. If this is the dragged segment
    if (dragging && dragging.segmentId === segment.id) {
      if (dragging.edge === 'start') {
        return {
          start: Math.max(0, dragging.initialStart + (dragging.deltaMs || 0)),
          end: dragging.initialEnd
        };
      } else {
        return {
          start: dragging.initialStart,
          end: Math.max(dragging.initialStart + 100, dragging.initialEnd + (dragging.deltaMs || 0))
        };
      }
    }

    // 2. If this segment is AFTER the dragged segment (Ripple Effect)
    // Only ripple if we are stretching (changing END time of dragged segment)
    // If we move START of dragged segment, does it ripple?
    // "Stretch and compress" usually implies changing the TAIL.
    // If I pull the HEAD, I'm just shortening/lengthening the start. 
    // Let's assume ripple mainly applies when pushing the timeline forward/backward via End Drag.

    if (dragging && dragging.deltaMs && dragging.segmentId !== segment.id) {
      const draggedSeg = dragging.originalSegment;

      // Check if this segment is strictly after the dragged segment
      // We can use order_index if available, or start time.
      // Safety: use order_index if possible, else start_time
      const isAfter = (segment.order_index > draggedSeg.order_index) ||
        (segment.order_index === draggedSeg.order_index && segment.start_time_ms > draggedSeg.start_time_ms) ||
        (segment.start_time_ms >= draggedSeg.end_time_ms); // fallback

      if (isAfter) {
        // If dragging END -> Ripple moves by delta
        // If dragging START -> Ripple usually doesn't move subsequent segments (unless we implement "shove" logic later)
        // Logic: Changing Start of Seg A usually affects Seg A's duration. It doesn't necessarily push Seg B.
        // Logic: Changing End of Seg A directly pushes Seg B.

        if (dragging.edge === 'end') {
          const shift = dragging.deltaMs || 0;
          return {
            start: segment.start_time_ms + shift,
            end: segment.end_time_ms + shift
          };
        }
      }
    }

    return { start: segment.start_time_ms, end: segment.end_time_ms };
  };

  // --- WAVESURFER INITIALIZATION & SYNC ---
  const handleInternalWaveReady = useCallback((ws) => {
    setWavesurfer(ws);
    setDuration(ws.getDuration());

    ws.on('ready', () => setDuration(ws.getDuration()));

    // Playback Logic (Solo overrides Mute)
    ws.on('audioprocess', (time) => {
      setCurrentTime(time);

      const activeSolos = Object.entries(solodSpeakersRef.current)
        .filter(([_, isActive]) => isActive)
        .map(([label]) => label);

      const activeMutes = mutedSpeakersRef.current;
      const currentSpeakers = speakersRef.current;

      // 1. If any Solo is active, ONLY play those
      if (activeSolos.length > 0) {
        const timeMs = time * 1000;
        const isAudible = currentSpeakers.some(sp => {
          if (!activeSolos.includes(sp.label)) return false;
          // Speaker is solo'd, play audio if in their segment
          return (sp.segments || []).some(seg =>
            timeMs >= seg.start_time_ms && timeMs <= seg.end_time_ms
          );
        });

        ws.setVolume(isAudible ? 1 : 0);
        return;
      }

      // 2. No Solos: Check Mutes
      const timeMs = time * 1000;

      // Determine who is speaking now
      const speakingSpeaker = currentSpeakers.find(sp =>
        (sp.segments || []).some(seg => timeMs >= seg.start_time_ms && timeMs <= seg.end_time_ms)
      );

      if (speakingSpeaker) {
        // If this speaker is muted, silence
        if (activeMutes[speakingSpeaker.label]) {
          ws.setVolume(0);
          return;
        }
      } else {
        // Background / Mixed audio segment (no speaker assigned)
        // If "Mixed Audio" track is muted?
        if (activeMutes['__mixed__']) {
          ws.setVolume(0);
          return;
        }
      }

      // Default: Play
      ws.setVolume(1);

      // --- AUTO SCROLL DURING PLAYBACK ---
      const container = tracksContainerRef.current;
      // Use refs to get fresh state inside the callback
      if (container && !isScrubbingRef.current) {
        const currentZoom = zoomRef.current;
        const playheadX = time * currentZoom;
        const currentScroll = container.scrollLeft;
        const containerWidth = container.clientWidth;

        // If playhead moves near end of view, scroll forward
        // "Almost towards the end" -> e.g. 80% or 50px buffer
        const buffer = 100;
        if (playheadX > currentScroll + containerWidth - buffer) {
          // Scroll to keep playhead in view, maybe center it or put it at 20%?
          // "show the other audio area" -> let's advance by a chunk
          const targetScroll = playheadX - (containerWidth * 0.2);
          container.scrollLeft = targetScroll;
        }
      }
    });

    ws.on('seek', () => setCurrentTime(ws.getCurrentTime()));

    if (onWaveReady) onWaveReady(ws);
  }, [onWaveReady]); // speakers removed from dependency to prevent re-bind iteration; ref handles updates

  const handleScroll = (e) => {
    setScrollLeft(e.target.scrollLeft);
    if (sidebarRef.current) {
      sidebarRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Helper for converting mouse X to time, with optional zoom/scroll overrides
  const getEventTime = (clientX, scrollLeftOffset, currentZoom) => {
    if (!tracksContainerRef.current || !duration) return 0;
    const rect = tracksContainerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left; // x position within the track container viewport
    const totalX = relativeX + scrollLeftOffset; // x position within the total track width
    let time = totalX / currentZoom;
    return Math.max(0, Math.min(time, duration));
  };

  const updateTimeFromMouse = (clientX, scrollLeftOffset, currentZoom = zoom) => {
    const time = getEventTime(clientX, scrollLeftOffset, currentZoom);
    if (wavesurfer) {
      wavesurfer.setTime(time);
      setCurrentTime(time);
    }
  };

  const handleRulerMouseDown = (e) => {
    e.preventDefault();
    setIsScrubbing(true);
    setZoom(SCRUB_ZOOM);

    const container = tracksContainerRef.current;
    if (!container) return;

    // Use SCRUB_ZOOM for calculation since we just set it for render
    // Also use current scroll (presumed 0 delay since last render unless moving)
    updateTimeFromMouse(e.clientX, container.scrollLeft, SCRUB_ZOOM);

    let animationFrameId;
    let currentClientX = e.clientX;

    const tick = () => {
      const rect = container.getBoundingClientRect();
      const edgeThreshold = 50; // proximity to edge to trigger scroll
      const scrollSpeed = 15; // px per frame

      if (currentClientX > rect.right - edgeThreshold) {
        container.scrollLeft += scrollSpeed;
      } else if (currentClientX < rect.left + edgeThreshold) {
        container.scrollLeft -= scrollSpeed;
      }

      // Update time based on new position (mouse moved OR scroll moved)
      // Always use SCRUB_ZOOM as we are in scrubbing mode
      updateTimeFromMouse(currentClientX, container.scrollLeft, SCRUB_ZOOM);

      animationFrameId = requestAnimationFrame(tick);
    };

    // Start loop
    animationFrameId = requestAnimationFrame(tick);

    const onMouseMove = (ev) => {
      currentClientX = ev.clientX;
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      setZoom(DEFAULT_ZOOM);

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // --- RENDERING ---
  const totalWidth = useMemo(() => Math.max(duration * zoom, 0), [duration, zoom]);

  const ticks = useMemo(() => {
    if (!duration) return [];
    const step = zoom > 100 ? 0.2 : 1;
    const generated = [];
    for (let t = 0; t <= duration; t += step) {
      generated.push({
        time: t,
        left: t * zoom,
        isMajor: Number.isInteger(t)
      });
    }
    return generated;
  }, [duration, zoom]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getSpeakerColorClass = (index) => index % 2 === 0 ? '' : 'speaker-2';

  const toggleMute = (label) => {
    setMutedSpeakers(prev => {
      const newState = { ...prev, [label]: !prev[label] };
      mutedSpeakersRef.current = newState; // Sync immediately
      return newState;
    });
  };

  const toggleSolo = (label) => {
    setSolodSpeakers(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleSegmentClick = (e, seg) => {
    e.stopPropagation();
    if (wavesurfer) {
      const start = seg.start_time_ms / 1000;
      const end = seg.end_time_ms / 1000;
      wavesurfer.play(start, end);
    }
  };

  const playSpeakerAll = (speakerLabel) => {
    const newSoloState = { [speakerLabel]: true };
    setSolodSpeakers(newSoloState);
    solodSpeakersRef.current = newSoloState;
    if (mutedSpeakers[speakerLabel]) {
      const newMute = { ...mutedSpeakers, [speakerLabel]: false };
      setMutedSpeakers(newMute);
      mutedSpeakersRef.current = newMute;
    }
    const sp = speakers.find(s => s.label === speakerLabel);
    if (sp && sp.segments && sp.segments.length > 0) {
      const sorted = [...sp.segments].sort((a, b) => a.start_time_ms - b.start_time_ms);
      const first = sorted[0];
      if (wavesurfer) {
        wavesurfer.setTime(first.start_time_ms / 1000);
        wavesurfer.play();
      }
    }
  };

  const playMixedAudio = () => {
    // 1. Clear all solos to play full mix
    setSolodSpeakers({});
    solodSpeakersRef.current = {};

    // 2. Unmute mixed if muted
    if (mutedSpeakers['__mixed__']) {
      const newMute = { ...mutedSpeakers, '__mixed__': false };
      setMutedSpeakers(newMute);
      mutedSpeakersRef.current = newMute;
    }

    // 3. Play from start
    if (wavesurfer) {
      wavesurfer.setTime(0);
      wavesurfer.play();
    }
  };

  return (
    <div className="dubbing-timeline-card">
      <div className={`scrub-overlay ${isScrubbing || dragging ? 'active' : ''}`} style={{ cursor: dragging ? 'col-resize' : 'ew-resize' }} />
      <div className="timeline-ruler-fixed">
        <div className="ruler-sidebar-placeholder" />
        <div
          className="ruler-scroll-container"
          onMouseDown={handleRulerMouseDown}
          ref={rulerRef}
        >
          <div
            className="timeline-ruler-ticks"
            style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}
          >
            {ticks.map((tick) => (
              <div key={tick.time} className={`ruler-tick ${tick.isMajor ? 'major' : 'minor'}`} style={{ left: tick.left }}>
                {tick.isMajor ? formatTime(tick.time) : ''}
              </div>
            ))}
            {/* Ruler Playhead - Moved inside ticks to sync with scroll & offset */}
            <div className="playhead-triangle" style={{ left: currentTime * zoom }} />
          </div>
        </div>
      </div>

      <div className="dubbing-timeline">
        <div className="timeline-sidebar">

          <div className="sidebar-tracks-list" ref={sidebarRef}>
            {/* Mixed Audio Track */}
            <div className="sidebar-track background-track">
              <div className="sidebar-track-content">
                <div className="track-info-row">
                  <span
                    className="track-name clickable"
                    onClick={playMixedAudio}
                    title="Click to play full audio"
                    style={{ cursor: 'pointer' }}
                  >
                    <FiMic /> Mixed Audio
                  </span>
                  <div className="track-controls">
                    <button
                      className={`control-btn ${mutedSpeakers['__mixed__'] ? 'active-mute' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleMute('__mixed__'); }}
                      title="Mute Mixed Audio"
                    >
                      <FiVolumeX />
                    </button>
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
              const isMuted = !!mutedSpeakers[sp.label];

              return (
                <div key={sp.label || idx} className={`sidebar-track ${isSolo ? 'selected' : ''}`}>
                  <div className="sidebar-track-content">
                    <div className="track-info-row">
                      <span
                        className="track-name clickable"
                        title={`Click to play: ${sp.displayLabel}`}
                        onClick={() => playSpeakerAll(sp.label)}
                        style={{ cursor: 'pointer' }}
                      >
                        <FiVolume2 /> {sp.displayLabel || `Speaker ${idx + 1}`}
                      </span>
                      <div className="track-controls">
                        <button
                          className={`control-btn ${isMuted ? 'active-mute' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleMute(sp.label); }}
                          title="Mute Speaker"
                        >
                          <FiVolumeX />
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
        </div>

        <div className="timeline-content">
          <div className="timeline-tracks-scrollable" ref={tracksContainerRef} onScroll={handleScroll}>
            <div style={{ width: totalWidth, position: 'relative' }}>
              <div className="playhead-line" style={{ left: currentTime * zoom }} />

              <div className="track-lane background-track">
                <div style={{ width: '100%', height: '100%' }}>
                  <AudioWaveform
                    audioUrl={audioUrl}
                    timelineContainer={null}
                    onReady={handleInternalWaveReady}
                    onSelectionChange={onSelectionChange}
                    zoom={zoom}
                  />
                </div>
              </div>

              {speakers.map((sp, idx) => {
                const colorClass = getSpeakerColorClass(idx);
                return (
                  <div key={sp.label || idx} className="track-lane">
                    {sp.segments && sp.segments.map(seg => {
                      const { start, end } = getRenderTiming(seg);
                      const width = (end - start) / 1000 * zoom;
                      const left = start / 1000 * zoom;
                      return (
                        <div
                          key={seg.id}
                          className={`segment-clip dubbed ${colorClass} ${dragging && dragging.segmentId === seg.id ? 'dragging' : ''}`}
                          style={{ left, width, overflow: 'visible' }} // Overflow visible for handles
                          title={`Dubbed: ${seg.target_text}`}
                          onClick={(e) => handleSegmentClick(e, seg)}
                        >
                          {/* Handles */}
                          <div
                            className="resize-handle left-handle"
                            style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0, width: 8,
                              cursor: 'w-resize', zIndex: 10
                            }}
                            onMouseDown={(e) => handleResizeStart(e, seg, 'start')}
                          />

                          <span className="segment-text" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', paddingLeft: 8, paddingRight: 8 }}>
                            {seg.target_text || "..."}
                          </span>

                          <div
                            className="resize-handle right-handle"
                            style={{
                              position: 'absolute', right: 0, top: 0, bottom: 0, width: 8,
                              cursor: 'e-resize', zIndex: 10
                            }}
                            onMouseDown={(e) => handleResizeStart(e, seg, 'end')}
                          />
                        </div>
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

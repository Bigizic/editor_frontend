import React, { useRef, useState } from 'react';
import AudioWaveform from './AudioWaveform.jsx';
import { FiUser, FiMusic } from 'react-icons/fi';
import './DubbingTimeline.css';

const DubbingTimeline = ({
  audioUrl,
  speakers = [],
  onWaveReady,
  onSelectionChange
}) => {
  const timelineContainerRef = useRef(null);
  const [isTimelineReady, setIsTimelineReady] = useState(false);

  // Process speakers to get display info
  const uniqueSpeakers = Array.from(new Set(speakers.map(s => s.label || s.speaker_label))).filter(Boolean).map(label => {
    const speakerObj = speakers.find(s => (s.label === label || s.speaker_label === label));
    return {
      label,
      displayLabel: speakerObj?.displayLabel || speakerObj?.voice_name || label
    };
  });

  return (
    <div className="card dubbing-timeline-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="dubbing-timeline">
        {/* Left Sidebar */}
        <div className="timeline-sidebar">
          <div className="sidebar-header" /> {/* Empty header for ruler alignment */}

          {/* Mixed Audio Label */}
          <div className="sidebar-track">
            <FiMusic className="track-label-icon" />
            <span>Mixed Audio</span>
          </div>

          {uniqueSpeakers.map((speaker, i) => (
            <div className="sidebar-track" key={speaker.label || i}>
              <FiUser className="track-label-icon" />
              <span>{speaker.displayLabel}</span>
            </div>
          ))}
        </div>

        {/* Right Content */}
        <div className="timeline-content">
          {/* Top Ruler */}
          <div className="timeline-ruler-container" ref={timelineContainerRef}>
            {/* Wavesurfer Timeline plugin attaches here */}
          </div>

          {/* Tracks Area */}
          <div className="timeline-tracks">

            {/* Main Waveform Track */}
            <div className="track-lane">
              <AudioWaveform
                audioUrl={audioUrl}
                onReady={(ws) => {
                  setIsTimelineReady(true);
                  if (onWaveReady) onWaveReady(ws);
                }}
                onSelectionChange={onSelectionChange}
                timelineContainer={timelineContainerRef.current}
              />
            </div>

            {/* Empty lanes for speakers to match sidebar height */}
            {uniqueSpeakers.map((_, i) => (
              <div className="track-lane empty-track" key={i}>
                {/* Future: Render individual segment blocks here */}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DubbingTimeline;

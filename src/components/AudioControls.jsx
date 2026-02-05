import React from "react";
import { FiPause, FiPlay, FiRewind, FiFastForward } from "react-icons/fi";

const AudioControls = ({
  isPlaying,
  onPlayPause,
  onBack,
  onForward
}) => {
  return (
    <div className="media-controls">
      <div className="media-controls__center">
        <button className="icon-button" onClick={onBack} title="Back 10s">
          <FiRewind />
        </button>
        <button className="icon-button" onClick={onPlayPause} title="Play/Pause">
          {isPlaying ? <FiPause /> : <FiPlay />}
        </button>
        <button className="icon-button" onClick={onForward} title="Forward 10s">
          <FiFastForward />
        </button>
      </div>
    </div>
  );
};

export default AudioControls;

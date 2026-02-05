import React from "react";
import { FiPause, FiPlay, FiRewind, FiFastForward } from "react-icons/fi";

const VideoControls = ({ isPlaying, onPlayPause, onBack, onForward }) => {
  return (
    <div className="media-controls">
      <button className="icon-button" onClick={onBack} title="Back 5s">
        <FiRewind />
      </button>
      <button className="icon-button" onClick={onPlayPause} title="Play/Pause">
        {isPlaying ? <FiPause /> : <FiPlay />}
      </button>
      <button className="icon-button" onClick={onForward} title="Forward 5s">
        <FiFastForward />
      </button>
    </div>
  );
};

export default VideoControls;

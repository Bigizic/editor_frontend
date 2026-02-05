import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";

const AudioWaveform = ({ audioUrl, onReady, onSelectionChange, timelineContainer }) => {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);
  const regionsRef = useRef(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  useEffect(() => {
    if (!containerRef.current || !audioUrl) {
      return;
    }

    const plugins = [];
    if (RegionsPlugin) {
      const regions = RegionsPlugin.create();
      regionsRef.current = regions;
      plugins.push(regions);
    }

    if (TimelinePlugin && timelineContainer) {
      plugins.push(TimelinePlugin.create({
        container: timelineContainer,
        height: 20,
        timeInterval: 5,
        primaryLabelInterval: 10,
        style: {
          fontSize: '11px',
          color: '#6b7280'
        }
      }));
    }

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#94a3b8",
      progressColor: "#2563eb",
      height: 64, // Reduced height to match timeline track
      cursorWidth: 1,
      dragToSeek: true,
      interact: true,
      normalize: true,
      responsive: true,
      minPxPerSec: 50, // Zoom level for timeline
      plugins: plugins.length ? plugins : undefined,
    });

    waveSurferRef.current.on("ready", () => {
      if (RegionsPlugin && regionsRef.current) {
        regionsRef.current.enableDragSelection({
          color: "rgba(59, 130, 246, 0.25)",
        });
        const notifySelection = (region) => {
          const startMs = Math.round(region.start * 1000);
          const endMs = Math.round(region.end * 1000);
          onSelectionChangeRef.current?.(startMs, endMs);
        };
        regionsRef.current.on("region-created", (region) => {
          const start = region.start;
          const end = region.end;
          regionsRef.current.clearRegions();
          const single = regionsRef.current.addRegion({
            start,
            end,
            color: "rgba(59, 130, 246, 0.3)",
            drag: true,
            resize: true,
          });
          notifySelection(single);
          single.on("region-updated", () => notifySelection(single));
        });
        regionsRef.current.on("region-updated", (region) => {
          notifySelection(region);
        });
      }
      if (onReady) {
        onReady(waveSurferRef.current);
      }
    });

    waveSurferRef.current.load(audioUrl);

    return () => {
      regionsRef.current = null;
      if (waveSurferRef.current) {
        try {
          waveSurferRef.current.destroy();
        } catch (e) {
          // ignore abort errors during unmount
        }
        waveSurferRef.current = null;
      }
    };
  }, [audioUrl]);

  return <div className="waveform-container" ref={containerRef} />;
};

export default AudioWaveform;

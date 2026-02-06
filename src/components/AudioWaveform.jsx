import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";

const AudioWaveform = ({ audioUrl, onReady, onSelectionChange, timelineContainer, zoom }) => {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);
  const regionsRef = useRef(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  // Track readiness to prevent calling methods before load
  const isReadyRef = useRef(false);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    // Destroy existing if re-initializing (though logic attempts to preserve)
    // Actually our previous logic tried to preserve. Let's stick to safe init.
    if (!waveSurferRef.current) {
      // ... (setup code same as before but cleaner)
      const plugins = [];
      if (RegionsPlugin) plugins.push(RegionsPlugin.create({ regionsRef }));
      if (TimelinePlugin && timelineContainer) {
        const containerNode = typeof timelineContainer === 'string'
          ? document.querySelector(timelineContainer)
          : timelineContainer;
        if (containerNode) {
          plugins.push(TimelinePlugin.create({
            container: containerNode,
            height: 20,
            timeInterval: 2,
            primaryLabelInterval: 2,
            style: { fontSize: '10px', color: '#6b7280' }
          }));
        }
      }

      waveSurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#94a3b8",
        progressColor: "#2563eb",
        height: 64,
        cursorWidth: 0,
        cursorColor: "transparent",
        dragToSeek: true,
        interact: true,
        normalize: true,
        responsive: true,
        autoScroll: true,
        minPxPerSec: 20, // Default init zoom
        plugins: plugins.length ? plugins : undefined,
      });

      waveSurferRef.current.on("ready", () => {
        isReadyRef.current = true;
        // Apply initial zoom if provided
        if (zoom) {
          waveSurferRef.current.zoom(zoom);
        }

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
            regionsRef.current.clearRegions(); // clear old
            const single = regionsRef.current.addRegion({
              start: region.start,
              end: region.end,
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
        if (onReady) onReady(waveSurferRef.current);
      });

      waveSurferRef.current.load(audioUrl);
    }
  }, [audioUrl, timelineContainer]);

  // Handle Zoom Updates safely
  useEffect(() => {
    if (waveSurferRef.current && isReadyRef.current && zoom) {
      try {
        waveSurferRef.current.zoom(zoom);
      } catch (e) {
        console.warn("WaveSurfer zoom error:", e);
      }
    }
  }, [zoom]);

  // Clean up on unmount ONLY
  useEffect(() => {
    return () => {
      regionsRef.current = null;
      if (waveSurferRef.current) {
        try {
          waveSurferRef.current.destroy();
        } catch (e) { }
        waveSurferRef.current = null;
      }
    };
  }, []);

  return <div className="waveform-container" ref={containerRef} />;
};

export default AudioWaveform;

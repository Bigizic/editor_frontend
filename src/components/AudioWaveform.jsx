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

  // Initialize WaveSurfer with robust cleanup and error handling
  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    let ws = null;
    let isMounted = true;

    const initWaveSurfer = async () => {
      // Small delay to ensure container has layout (sometimes an issue in flex containers)
      await new Promise(r => setTimeout(r, 0));
      if (!isMounted) return;

      if (!containerRef.current) return;

      try {
        const plugins = [];
        if (RegionsPlugin) {
          const regions = RegionsPlugin.create();
          regionsRef.current = regions;
          plugins.push(regions);
        }
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

        ws = WaveSurfer.create({
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
          minPxPerSec: 20,
          plugins: plugins.length ? plugins : undefined,
        });

        // Error handling
        ws.on('error', (err) => {
          console.error("WaveSurfer Error:", err);
        });

        ws.on("ready", () => {
          if (!isMounted) return;
          isReadyRef.current = true;
          // Expose regions plugin for parent access
          if (regionsRef.current) {
            ws.regions = regionsRef.current;
          }
          // Apply initial zoom if provided
          if (zoom) {
            try { ws.zoom(zoom); } catch (e) { console.warn(e); }
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
            // Clear existing regions if any
            regionsRef.current.clearRegions();

            regionsRef.current.on("region-created", (region) => {
              // Ensure we only have one region if that's the desired behavior for selection?
              // The previous code cleared regions on creation, implying single selection.
              // We need to be careful not to infinite loop if clearRegions triggers something.
              // But here we are inside region-created.
              // Let's stick to the previous logic but safely.
              // Actually, clearing regions inside region-created might be tricky.
              // Better is: use the region just created.
              // If we want single selection, we can remove OTHERS.
              const regions = regionsRef.current.getRegions();
              regions.forEach(r => {
                if (r.id !== region.id) r.remove();
              });

              // Style the new one
              region.setOptions({
                color: "rgba(59, 130, 246, 0.3)",
                drag: true,
                resize: true
              });

              notifySelection(region);
              region.on("region-updated", () => notifySelection(region));
            });

            regionsRef.current.on("region-updated", (region) => {
              notifySelection(region);
            });
          }

          waveSurferRef.current = ws;
          if (onReady) onReady(ws);
        });

        ws.load(audioUrl);

      } catch (err) {
        console.error("Failed to init WaveSurfer:", err);
      }
    };

    initWaveSurfer();

    return () => {
      isMounted = false;
      isReadyRef.current = false; // logic change: mark not ready immediately
      if (ws) {
        try {
          ws.destroy();
        } catch (e) { console.warn("Destroy error", e); }
      }
      waveSurferRef.current = null;
    };
  }, [audioUrl, timelineContainer]);

  return <div className="waveform-container" ref={containerRef} />;
};

export default AudioWaveform;

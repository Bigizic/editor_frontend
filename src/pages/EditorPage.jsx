import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { FiList, FiUpload, FiLayers, FiSun, FiMoon, FiRefreshCw, FiChevronDown, FiChevronUp, FiVolumeX, FiCheck, FiX } from "react-icons/fi";
import {
  loadEditorByJobId,
  loadEditorByVideoId,
  applyChanges,
  changeLanguage,
  setTargetLanguage,
  redubVideoAction,
  saveSegmentUpdate,
  deleteSegmentAction
} from "../redux/actions/editorActions.js";
import { EDITOR_BUSY, EDITOR_IDLE } from "../redux/constants/editorConstants.js";
import { updateEditorNotification, resetEditorNotification } from "../redux/actions/editorNotificationActions.js";
import EditorNotifications from "../components/EditorNotifications.jsx";
import { useSocket } from "../Socket/index.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import EditorView from "../components/EditorView.jsx";
import AudioWaveform from "../components/AudioWaveform.jsx";
import AudioControls from "../components/AudioControls.jsx";
import VolumeControl from "../components/VolumeControl.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { VOICE_TYPES as VOICE_TYPES_LIST } from "../utils/voiceTypes.js";
import {
  VOICE_PROFILES,
  getProfilesForGender,
  displayVoiceProfile,
  getAllVoiceProfiles
} from "../utils/voiceProfiles.js";
import {
  downloadJobVideoUrl,
  downloadOriginalVideoUrl,
  downloadDubbedAudioUrl,
  fetchJobStatus
} from "../api/jobsApi.js";
import { formatStatusText } from "../utils/formatStatusText.js";
import {
  fetchSpeakers,
  redubSegment,
  fetchCloneStatus,
  cloneSpeakerVoice,
  setSpeakerVoiceProfile,
  trimDubbedAudio,
  cutDubbedAudio,
  normalizeDubbedAudio,
  updateVideoGains,
  remixDubbedAudio,
  silenceVideoRange,
  manualMoveRedubSegment,
  manualStretchRedubSegment
} from "../api/editorApi.js";
import Select from "../components/Select.jsx";
import ConfirmSelection from "../components/ConfirmSelection.jsx";
import LoadingScreenContainer from "../components/LoadingScreenContainer.jsx";
import DubbingTimeline from "../components/DubbingTimeline.jsx";
import {
  getActiveJobStorageKey,
  getActiveEditorJobStorageKey,
  DEFAULT_USER_ID
} from "../helpers/storageKeys.js";
import {
  subscribeAndPersistEditorJob,
  hydrateFromStoredJob,
  setupJobStatusSocketListener
} from "../helpers/jobSubscriptionHelpers.js";
import { STATUS_LABELS } from "../utils/statusLabels.js";

const EDITOR_SECTIONS = [
  { id: "timeline", label: "Editor Timeline", icon: FiList },
  { id: "import", label: "Importing", icon: FiUpload },
  { id: "merge", label: "Merge videos", icon: FiLayers },
];

const EditorPage = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const { theme, toggleTheme } = useTheme();
  const { socket, isConnected, subscribeToJobs } = useSocket() || {};
  const videoRef = useRef(null);
  const timelineRef = useRef(null);
  const waveSurferRef = useRef(null);
  const syncRef = useRef({
    syncingFromWave: false,
    syncingFromVideo: false,
    disableVideoSync: false
  });
  const {
    loading,
    error,
    video,
    segments,
    applying,
    changingLanguage,
    redubbing,
    jobId,
    targetLanguage,
    isEditing,
    editingStatusText
  } = useSelector((state) => state.editor);

  const [editorSection, setEditorSection] = useState("timeline");
  const [videoIdInput, setVideoIdInput] = useState("");
  const [jobIdInput, setJobIdInput] = useState(params.jobId || "");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioRate, setAudioRate] = useState(1);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [speakers, setSpeakers] = useState([]);
  const [expandedSpeakers, setExpandedSpeakers] = useState({});
  const [showVideos, setShowVideos] = useState(true);
  const [showSpeakersSegments, setShowSpeakersSegments] = useState(false);
  const [waveformSelection, setWaveformSelection] = useState(null);
  const [audioCacheBuster, setAudioCacheBuster] = useState(0);
  const [audioOpInProgress, setAudioOpInProgress] = useState(false);
  const [cloneStatus, setCloneStatus] = useState({});
  const [cloningSpeaker, setCloningSpeaker] = useState(null);
  const [leftSectionPercent, setLeftSectionPercent] = useState(50);
  const [audioPanelHeight, setAudioPanelHeight] = useState(280);
  const [resizingLR, setResizingLR] = useState(false);
  const [resizingAudio, setResizingAudio] = useState(false);
  const [remixing, setRemixing] = useState(false);
  const resizeStartRef = useRef({ x: 0, leftPercent: 50 });
  const audioResizeStartRef = useRef({ y: 0, height: 280 });
  const layoutRef = useRef(null);
  const originalVideoRef = useRef(null);
  const voiceTypesList = Array.isArray(VOICE_TYPES_LIST) ? VOICE_TYPES_LIST : [];
  const profileMap = VOICE_PROFILES;

  const handleLRResizeStart = (e) => {
    e.preventDefault();
    setResizingLR(true);
    resizeStartRef.current = { x: e.clientX, leftPercent: leftSectionPercent };
  };
  const handleAudioResizeStart = (e) => {
    e.preventDefault();
    setResizingAudio(true);
    audioResizeStartRef.current = { y: e.clientY, height: audioPanelHeight };
  };

  useEffect(() => {
    if (!resizingLR) return;
    const onMove = (e) => {
      const layout = layoutRef.current;
      if (!layout) return;
      const rect = layout.getBoundingClientRect();
      const deltaPx = e.clientX - resizeStartRef.current.x;
      const deltaPercent = (deltaPx / rect.width) * 100;
      let next = resizeStartRef.current.leftPercent + deltaPercent;
      next = Math.max(22, Math.min(78, next));
      setLeftSectionPercent(next);
    };
    const onUp = () => setResizingLR(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizingLR]);

  useEffect(() => {
    if (!resizingAudio) return;
    const onMove = (e) => {
      const deltaY = audioResizeStartRef.current.y - e.clientY;
      const next = Math.max(140, Math.min(600, audioResizeStartRef.current.height + deltaY));
      setAudioPanelHeight(next);
    };
    const onUp = () => setResizingAudio(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizingAudio]);

  const SUPPORTED_LANGUAGES = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    ru: "Russian",
    zh: "Chinese (Mandarin)",
    sw: "Swahili",
    yo: "Yoruba"
  };
  const LANGUAGE_FLAGS = {
    auto_detect: "🔍",
    en: "🇺🇸",
    es: "🇪🇸",
    fr: "🇫🇷",
    de: "🇩🇪",
    ru: "🇷🇺",
    zh: "🇨🇳",
    sw: "🇹🇿",
    yo: "🇳🇬"
  };
  const LANGUAGE_LABELS_WITH_AUTO = { auto_detect: "Auto Detect", ...SUPPORTED_LANGUAGES };

  // fetch speakers and clone status whenever video changes
  useEffect(() => {
    const loadSpeakers = async () => {
      if (!video?.id) return;
      try {
        const res = await fetchSpeakers(video.id);
        setSpeakers(res?.speakers || []);
      } catch (err) {
        console.error("Failed to load speakers", err);
        setSpeakers([]);
      }
    };
    loadSpeakers();
  }, [video?.id]);

  useEffect(() => {
    const loadCloneStatus = async () => {
      if (!video?.id) return;
      try {
        const res = await fetchCloneStatus(video.id);
        const map = {};
        (res?.speakers || []).forEach((s) => {
          map[s.speaker_label] = s;
        });
        setCloneStatus(map);
      } catch (err) {
        console.error("Failed to load clone status", err);
        setCloneStatus({});
      }
    };
    loadCloneStatus();
  }, [video?.id]);

  // NOTE: socket listener for job_status_update is now inside <EditorNotifications />

  const formatDuration = (ms) => {
    if (ms === null || ms === undefined) {
      return "--:--:--";
    }
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

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

  // Speaker/segment control data
  const allSpeakerLabels = useMemo(() => {
    const set = new Set();
    (speakers || []).forEach((s) => s?.speaker_label && set.add(s.speaker_label));
    (segments || []).forEach((seg) => seg?.speaker_label && set.add(seg.speaker_label));
    if ([...set].length === 0) set.add("Unassigned");
    return Array.from(set);
  }, [speakers, segments]);

  const segmentsBySpeaker = useMemo(() => {
    const map = {};
    (segments || []).forEach((seg) => {
      const key = seg?.speaker_label || "Unassigned";
      if (!map[key]) map[key] = [];
      map[key].push(seg);
    });
    return map;
  }, [segments]);

  const speakerByLabel = useMemo(() => {
    const map = {};
    (speakers || []).forEach((s) => {
      if (s?.speaker_label) map[s.speaker_label] = s;
    });
    return map;
  }, [speakers]);

  const formatMsShort = (ms) => {
    const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const speakerSegmentModes = useMemo(() => {
    const modes = {};
    Object.entries(segmentsBySpeaker).forEach(([label, segs]) => {
      const genderCounts = {};
      const voiceTypeCounts = {};
      const voiceProfileCounts = {};
      segs.forEach((seg) => {
        const g = (seg?.gender || "").trim().toLowerCase();
        if (g) genderCounts[g] = (genderCounts[g] || 0) + 1;
        const vt = (seg?.voice_type || "").trim();
        if (vt) voiceTypeCounts[vt] = (voiceTypeCounts[vt] || 0) + 1;
        const vp = seg?.voice_profile?.trim?.() || seg?.voice_profile;
        if (vp) voiceProfileCounts[vp] = (voiceProfileCounts[vp] || 0) + 1;
      });
      const pickMode = (counts) => {
        let best = null;
        let bestCount = 0;
        Object.entries(counts).forEach(([val, count]) => {
          if (count > bestCount) {
            bestCount = count;
            best = val;
          }
        });
        return best;
      };
      modes[label] = {
        gender: pickMode(genderCounts),
        voiceType: pickMode(voiceTypeCounts),
        voiceProfile: pickMode(voiceProfileCounts)
      };
    });
    return modes;
  }, [segmentsBySpeaker]);

  const checkSegmentMismatch = useCallback((speakerLabel, segment) => {
    const mode = speakerSegmentModes[speakerLabel] || {};
    const segGender = (segment?.gender || "").trim().toLowerCase();
    const segVoiceType = (segment?.voice_type || "").trim();
    const segVoiceProfile = segment?.voice_profile?.trim?.() || segment?.voice_profile;
    const mismatchGender =
      !!segGender &&
      !!mode.gender &&
      segGender !== mode.gender;
    const mismatchVoiceType =
      !!segVoiceType &&
      !!mode.voiceType &&
      segVoiceType !== mode.voiceType;
    const mismatchVoiceProfile =
      !!segVoiceProfile &&
      !!mode.voiceProfile &&
      segVoiceProfile !== mode.voiceProfile;
    return {
      gender: mismatchGender,
      voiceType: mismatchVoiceType,
      voiceProfile: mismatchVoiceProfile,
      any: mismatchGender || mismatchVoiceType || mismatchVoiceProfile
    };
  }, [speakerSegmentModes]);

  const speakerControlData = useMemo(() => {
    return allSpeakerLabels
      .filter((label) => (segmentsBySpeaker[label] || []).length > 0)
      .map((label) => {
        const segmentsFor = segmentsBySpeaker[label] || [];
        const sp = speakerByLabel[label];
        const mismatchSegments = segmentsFor.filter((seg) => checkSegmentMismatch(label, seg).any);
        const mismatchCounts = segmentsFor.reduce(
          (acc, seg) => {
            const m = checkSegmentMismatch(label, seg);
            acc.gender += m.gender ? 1 : 0;
            acc.voiceType += m.voiceType ? 1 : 0;
            acc.voiceProfile += m.voiceProfile ? 1 : 0;
            return acc;
          },
          { gender: 0, voiceType: 0, voiceProfile: 0 }
        );
        const needsRedubSegments = segmentsFor.filter(
          (seg) => !seg?.active_audio_take || !seg?.active_audio_take?.audio_file_path
        );
        const mostCommonVoiceProfile = (() => {
          const counts = {};
          segmentsFor.forEach((seg) => {
            const v = seg?.voice_profile?.trim?.() || seg?.voice_profile;
            if (v) {
              counts[v] = (counts[v] || 0) + 1;
            }
          });
          let best = null;
          let bestCount = 0;
          Object.entries(counts).forEach(([profile, count]) => {
            if (count > bestCount) {
              bestCount = count;
              best = profile;
            }
          });
          return best;
        })();
        const effectiveVoiceProfile = sp?.voice_profile || mostCommonVoiceProfile || null;
        const cs = cloneStatus[label] || {};
        return {
          label,
          displayLabel: sp?.voice_name || label,
          gender: sp?.gender || null,
          voiceType: sp?.voice_type || null,
          voiceProfile: sp?.voice_profile || null,
          effectiveVoiceProfile,
          segments: segmentsFor,
          mismatchSegments,
          mismatchCounts,
          needsRedubSegments,
          speaker: sp,
          canBeCloned: cs.can_be_cloned ?? false,
          cloned: cs.cloned ?? false,
          durationSec: cs.duration_sec ?? 0
        };
      });
  }, [allSpeakerLabels, segmentsBySpeaker, speakerByLabel, cloneStatus]);

  const inferGenderFromLabel = useCallback((label) => {
    if (!label || typeof label !== "string") return null;
    const clean = label.trim().toLowerCase();
    if (["male", "m"].includes(clean)) return "male";
    if (["female", "f"].includes(clean)) return "female";
    if (["child", "c", "kid"].includes(clean)) return "child";
    return null;
  }, []);

  const getSpeakerDetails = useCallback(
    (label) => {
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
    },
    [speakerMetaMap, speakerOrder, inferGenderFromLabel]
  );

  useEffect(() => {
    if (params.jobId) {
      dispatch(loadEditorByJobId(params.jobId));
    }
  }, [dispatch, params.jobId]);

  // Persist active editor job to localStorage and subscribe on connect/reload
  useEffect(() => {
    const jobId = params.jobId || localStorage.getItem(getActiveEditorJobStorageKey(DEFAULT_USER_ID));
    if (!jobId) return;

    subscribeAndPersistEditorJob({
      jobId,
      userId: DEFAULT_USER_ID,
      subscribeToJobs,
      isConnected
    });
  }, [params.jobId, subscribeToJobs, isConnected]);

  // Hydrate job status from API on mount/reload (persists across reload)
  useEffect(() => {
    const jobId = params.jobId || localStorage.getItem(getActiveEditorJobStorageKey(DEFAULT_USER_ID));
    if (!jobId) return;

    hydrateFromStoredJob(jobId, dispatch, {
      fetchJobStatus,
      userId: DEFAULT_USER_ID
    });
  }, [dispatch, params.jobId]);

  // Fetch job status and pass to EDITOR_BUSY when job is processing
  useEffect(() => {
    const resolvedJobId = jobId || params.jobId || localStorage.getItem(getActiveEditorJobStorageKey(DEFAULT_USER_ID));
    if (!resolvedJobId) return;

    const fetchStatus = async () => {
      try {
        const statusData = await fetchJobStatus(resolvedJobId);
        const status = statusData?.status || "unknown";
        const statusLower = status.toLowerCase();
        const processingStatuses = [
          "queued", "processing", "extracting_audio", "analyzing_audio_stems",
          "analyzing_audio", "transcribing_audio", "translating_audio",
          "generating_tts", "adjusting_audio_timing", "creating_final_audio",
          "cleaning_things_up", "cloning", "lip_syncing"
        ];
        if (processingStatuses.includes(statusLower)) {
          const formattedStatus = formatStatusText(status);
          dispatch({ type: EDITOR_BUSY, payload: { statusText: formattedStatus } });
        }
      } catch (err) {
        console.error("Failed to fetch job status:", err);
      }
    };

    fetchStatus();
  }, [jobId, params.jobId, dispatch]);

  // Socket listener + re-subscribe to active/editor jobs when on EditorPage
  useEffect(() => {
    return setupJobStatusSocketListener({
      socket,
      isConnected,
      subscribeToJobs,
      dispatch,
      userId: DEFAULT_USER_ID,
      storageKeysToResubscribe: [
        getActiveJobStorageKey(DEFAULT_USER_ID),
        getActiveEditorJobStorageKey(DEFAULT_USER_ID)
      ]
    });
  }, [dispatch, socket, isConnected, subscribeToJobs]);

  useEffect(() => {
    if (video?.target_language) {
      dispatch(setTargetLanguage(video.target_language));
    }
  }, [dispatch, video]);

  const handleLoadByVideoId = () => {
    if (videoIdInput) {
      dispatch(loadEditorByVideoId(videoIdInput));
    }
  };

  const handleLoadByJobId = () => {
    if (jobIdInput) {
      dispatch(loadEditorByJobId(jobIdInput));
    }
  };

  const handleLanguageChange = async (value) => {
    if (!video?.id || value === video.target_language) {
      dispatch(setTargetLanguage(value));
      return;
    }
    dispatch(setTargetLanguage(value));
    await dispatch(changeLanguage(video.id, value));
    window.location.reload();
  };

  const handleWaveReady = (instance) => {
    waveSurferRef.current = instance;
    if (audioRate) {
      waveSurferRef.current.setPlaybackRate(audioRate);
    }
    instance.on("seek", (progress) => {
      if (
        !videoRef.current ||
        syncRef.current.syncingFromVideo ||
        syncRef.current.disableVideoSync
      ) {
        return;
      }
      syncRef.current.syncingFromWave = true;
      const duration = instance.getDuration() || 0;
      videoRef.current.currentTime = progress * duration;
      setTimeout(() => {
        syncRef.current.syncingFromWave = false;
      }, 0);
    });
    // avoid continuous video seeking; only seek on drag
    instance.on("play", () => setIsAudioPlaying(true));
    instance.on("pause", () => setIsAudioPlaying(false));
    instance.on("finish", () => {
      setIsAudioPlaying(false);
      syncRef.current.disableVideoSync = false;
    });
    // update current playback time from waveform
    const updateWaveformTime = () => {
      if (instance && !syncRef.current.syncingFromVideo) {
        const currentTime = instance.getCurrentTime() || 0;
        setCurrentPlaybackTime(currentTime * 1000); // Convert to milliseconds
      }
    };
    instance.on("audioprocess", updateWaveformTime);
    instance.on("seek", updateWaveformTime);
  };

  const handleSegmentTimingChange = useCallback(async (segmentId, changes) => {
    if (!segmentId) return;
    dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('updating_segment') } });
    try {
      await dispatch(saveSegmentUpdate(segmentId, changes));
      console.log(changes)

      if ((changes.is_manual_stretch || changes.is_manual_move) && video?.id) {
        try {
          if (changes.is_manual_move) {
            await manualMoveRedubSegment(segmentId, changes)
          } else {
            await manualStretchRedubSegment(segmentId, changes)
          }
          // await remixDubbedAudio(video.id);
          setAudioCacheBuster((p) => p + 1);
        } catch (redubErr) {
          console.warn("Auto-redub/remix after manual change failed:", redubErr);
        }
        // Reload to sync ripple effects and ensure frontend state matches backend
        //await dispatch(loadEditorByVideoId(video.id));
      }
    } catch (e) {
      showAlert(`Failed to update segment timing: ${e?.message || e}`, "Error");
    } finally {
      dispatch({ type: EDITOR_IDLE });
    }
  }, [dispatch, video?.id]);

  const handleUpdateMeta = async (segmentId, payload) => {
    if (!segmentId) return;
    await dispatch(saveSegmentUpdate(segmentId, payload));
  };

  const handleReassignSpeaker = async (segmentId, newLabel) => {
    if (!segmentId) return;
    const payload = { speaker_label: newLabel || null };
    const mode = newLabel ? speakerSegmentModes[newLabel] : null;
    if (mode?.gender || mode?.voiceType || mode?.voiceProfile) {
      if (mode.gender) payload.gender = mode.gender;
      if (mode.voiceType) payload.voice_type = mode.voiceType;
      if (mode.voiceProfile) payload.voice_profile = mode.voiceProfile;
    }
    await dispatch(saveSegmentUpdate(segmentId, payload));
  };

  const handleSegmentRedub = async (segment) => {
    dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText(STATUS_LABELS.redubbing_segment) } });
    try {
      await redubSegment(segment.id, {
        target_text: segment.target_text,
        gender: segment.gender,
        voice_type: segment.voice_type,
        voice_profile: segment.voice_profile
      });

      showAlert("Redub started for this segment. The dubbed media will refresh when done.", "Redub Started");
    } catch (e) {
      showAlert(`Failed to redub segment: ${e?.message || e}`, "Error");
    } finally {
      dispatch({ type: EDITOR_IDLE });
    }
  };

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, segmentId: null });
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    isAlert: false,
    confirmText: "OK",
    variant: "info"
  });

  const showAlert = (message, title = "Notification", type = "info") => {
    let finalVariant = type;
    // Auto-detect common variants from title if default 'info' passed
    if (finalVariant === "info") {
      const lowerTitle = (title || "").toLowerCase();
      if (lowerTitle.includes("error") || lowerTitle.includes("fail")) finalVariant = "error";
      else if (lowerTitle.includes("success")) finalVariant = "success";
    }

    setAlertModal({
      isOpen: true,
      title,
      message,
      isAlert: true, // Preserved but overridden by explicit variant
      confirmText: "OK",
      variant: finalVariant
    });
  };

  const handleDeleteSegment = (segmentId) => {
    setDeleteModal({ isOpen: true, segmentId });
  };

  const confirmDelete = async (mode) => {
    if (!deleteModal.segmentId) return;
    setDeleteModal({ isOpen: false, segmentId: null });
    dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('deleting_segment') } });
    try {
      await dispatch(deleteSegmentAction(deleteModal.segmentId, mode, video.id));
    } finally {
      dispatch({ type: EDITOR_IDLE });
    }
  };

  const handleCloneVoice = async (speakerLabel) => {
    if (!video?.id) return;
    setCloningSpeaker(speakerLabel);
    dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('cloning_voice') } });
    try {
      await cloneSpeakerVoice(video.id, speakerLabel);
      const res = await fetchCloneStatus(video.id);
      const map = {};
      (res?.speakers || []).forEach((s) => {
        map[s.speaker_label] = s;
      });
      setCloneStatus(map);
      dispatch(loadEditorByVideoId(video.id));
      setCloneStatus(map);
      dispatch(loadEditorByVideoId(video.id));
      window.location.reload();
    } catch (e) {
      showAlert(`Failed to clone voice: ${e?.response?.data?.detail || e?.message || e}`, "Error");
    } finally {
      setCloningSpeaker(null);
      dispatch({ type: EDITOR_IDLE });
    }
  };

  const handlePlaySpeakerSample = (sp) => {
    const firstSeg = (sp.segments || [])[0];
    if (!firstSeg || !originalVideoRef.current || !originalUrl) return;
    originalVideoRef.current.currentTime = firstSeg.start_time_ms / 1000;
    originalVideoRef.current.play();
    const durationMs = firstSeg.end_time_ms - firstSeg.start_time_ms;
    setTimeout(() => {
      originalVideoRef.current?.pause();
    }, durationMs + 100);
  };

  const handleSetSpeakerVoiceProfile = async (speakerLabel, voiceProfile) => {
    if (!video?.id || !voiceProfile) return;
    dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('setting_voice_profile') } });
    try {
      await setSpeakerVoiceProfile(video.id, speakerLabel, voiceProfile);
      dispatch(loadEditorByVideoId(video.id));
      dispatch(loadEditorByVideoId(video.id));
      window.location.reload();
    } catch (e) {
      showAlert(`Failed to set voice profile: ${e?.response?.data?.detail || e?.message || e}`, "Error");
    } finally {
      dispatch({ type: EDITOR_IDLE });
    }
  };

  const handlePlaySegment = (segment) => {
    if (!waveSurferRef.current) {
      return;
    }
    const startSec = segment.start_time_ms / 1000;
    const endSec = segment.end_time_ms / 1000;
    syncRef.current.disableVideoSync = true;
    waveSurferRef.current.play(startSec, endSec);
    const durationMs = Math.max(0, segment.end_time_ms - segment.start_time_ms);
    setTimeout(() => {
      syncRef.current.disableVideoSync = false;
    }, durationMs + 50);
  };

  const handleAudioPlayPause = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  const handleSeek = (deltaSeconds) => {
    if (waveSurferRef.current) {
      const duration = waveSurferRef.current.getDuration() || 0;
      const current = waveSurferRef.current.getCurrentTime();
      const next = Math.min(Math.max(current + deltaSeconds, 0), duration);
      waveSurferRef.current.setTime(next);
    }
  };

  const handleWaveformSelection = useCallback((startMs, endMs) => {
    setWaveformSelection({ startMs, endMs });
  }, []);

  const runAudioOp = useCallback(async (opName, fn) => {
    if (!video?.id) return;
    setAudioOpInProgress(true);
    dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText(opName.toLowerCase().replace(/\s+/g, '_')) } });
    try {
      await fn();
      setAudioCacheBuster((b) => b + 1);
      setWaveformSelection(null);
    } catch (e) {
      showAlert(`${opName} failed: ${e?.response?.data?.detail ?? e?.message ?? e}`, "Error");
    } finally {
      setAudioOpInProgress(false);
      dispatch({ type: EDITOR_IDLE });
    }
  }, [video?.id, dispatch]);

  const handleTrimToSelection = useCallback(() => {
    if (!waveformSelection) return;
    runAudioOp("Trim", () =>
      trimDubbedAudio(video.id, waveformSelection.startMs, waveformSelection.endMs)
    );
  }, [video?.id, waveformSelection, runAudioOp]);

  const handleCutSelection = useCallback(() => {
    if (!waveformSelection) return;
    runAudioOp("Cut", () =>
      cutDubbedAudio(video.id, waveformSelection.startMs, waveformSelection.endMs)
    );
  }, [video?.id, waveformSelection, runAudioOp]);

  const handleNormalizeSelection = useCallback(() => {
    if (!waveformSelection) return;
    runAudioOp("Normalize", () =>
      normalizeDubbedAudio(video.id, {
        startMs: waveformSelection.startMs,
        endMs: waveformSelection.endMs,
      })
    );
  }, [video?.id, waveformSelection, runAudioOp]);

  const handleNormalizeAll = useCallback(() => {
    runAudioOp("Normalize all", () => normalizeDubbedAudio(video.id, {}));
  }, [video?.id, runAudioOp]);

  const handleSilenceSelection = useCallback(() => {
    try {
      dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('silence_range') } })
      if (!waveformSelection) return;
      runAudioOp("Silence Range", async () => {
        await silenceVideoRange(video.id, waveformSelection.startMs, waveformSelection.endMs);
      });
    } catch (e) {
      showAlert(`${opName} failed: ${e?.response?.data?.detail ?? e?.message ?? e}`, "Error");
    } finally {
      setAudioOpInProgress(false);
      dispatch({ type: EDITOR_IDLE });
    }
  }, [video?.id, waveformSelection, runAudioOp]);

  const [localDialogueGain, setLocalDialogueGain] = useState(0.5);
  const [localBackgroundGain, setLocalBackgroundGain] = useState(0.25);
  useEffect(() => {
    if (video?.dialogue_gain != null) setLocalDialogueGain(Number(video.dialogue_gain));
    if (video?.background_gain != null) setLocalBackgroundGain(Number(video.background_gain));
  }, [video?.id, video?.dialogue_gain, video?.background_gain]);

  const handleDialogueGainChange = useCallback(
    async (value) => {
      setLocalDialogueGain(value);
      if (!video?.id) return;
      try {
        await updateVideoGains(video.id, { dialogue_gain: value });
      } catch (e) {
        console.warn("Failed to update dialogue gain:", e);
      }
    },
    [video?.id]
  );
  const handleBackgroundGainChange = useCallback(
    async (value) => {
      setLocalBackgroundGain(value);
      if (!video?.id) return;
      try {
        await updateVideoGains(video.id, { background_gain: value });
      } catch (e) {
        console.warn("Failed to update background gain:", e);
      }
    },
    [video?.id]
  );
  const handleRemix = useCallback(async () => {
    if (!video?.id) return;
    setRemixing(true);
    dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('remixing_audio') } });
    try {
      await remixDubbedAudio(video.id);
      setAudioCacheBuster((prev) => prev + 1);
    } catch (e) {
      showAlert(`Remix failed: ${e?.response?.data?.detail ?? e?.message ?? e}`, "Error");
    } finally {
      setRemixing(false);
      dispatch({ type: EDITOR_IDLE });
    }
  }, [video?.id, dispatch]);

  const handleSegmentVocalGainChange = useCallback(
    (segmentId, value) => {
      dispatch(saveSegmentUpdate(segmentId, { vocal_gain: value }));
    },
    [dispatch]
  );
  const handleSegmentBackgroundGainChange = useCallback(
    (segmentId, value) => {
      dispatch(saveSegmentUpdate(segmentId, { background_gain: value }));
    },
    [dispatch]
  );
  const handleSegmentSpeechSpeedChange = useCallback(
    (segmentId, value) => {
      dispatch(saveSegmentUpdate(segmentId, { speech_speed: value }));
    },
    [dispatch]
  );

  const handleAudioRateChange = (rate) => {
    setAudioRate(rate);
    if (waveSurferRef.current) {
      waveSurferRef.current.setPlaybackRate(rate);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const onTimeUpdate = () => {
      if (!waveSurferRef.current || syncRef.current.syncingFromWave) {
        return;
      }
      syncRef.current.syncingFromVideo = true;
      const currentTime = video.currentTime * 1000; // Convert to milliseconds
      setCurrentPlaybackTime(currentTime);
      waveSurferRef.current.setTime(video.currentTime);
      setTimeout(() => {
        syncRef.current.syncingFromVideo = false;
      }, 0);
    };
    const onPlay = () => setIsVideoPlaying(true);
    const onPause = () => setIsVideoPlaying(false);

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  // Hot reload state (timestamp) to force media refresh without page reload
  const [mediaKey, setMediaKey] = useState(Date.now());

  const handleHotReload = useCallback(() => {
    if (video?.id) {
      // 1. Reload editor data (segments, transcript)
      dispatch(loadEditorByVideoId(video.id));
      // 2. Update media key to force video/audio tag reload
      setMediaKey(Date.now());
    }
  }, [dispatch, video?.id]);

  const resolvedJobId = jobId || params.jobId || jobIdInput;
  // Append timestamp to bust cache on hot reload
  const videoUrl = resolvedJobId ? `${downloadJobVideoUrl(resolvedJobId)}?t=${mediaKey}` : null;
  const originalUrl = resolvedJobId
    ? downloadOriginalVideoUrl(resolvedJobId)
    : null;
  const dubbedAudioUrl = resolvedJobId
    ? `${downloadDubbedAudioUrl(resolvedJobId)}?t=${mediaKey}`
    : null;

  const totalDurationMs = video?.duration_ms || 1;

  return (
    <div className="editor-page-wrap">
      <header className="editor-top-bar">
        <span className="editor-top-bar-title">Reedapt Editor</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EditorNotifications
            jobId={resolvedJobId}
            userId={DEFAULT_USER_ID}
            onReload={handleHotReload}
          />
          <button
            type="button"
            className="editor-theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <FiSun size={16} /> : <FiMoon size={16} />}
            <span className="editor-theme-label">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      <div className="editor-layout" ref={layoutRef} style={{ display: "flex" }}>
        <aside
          className="editor-left-column"
          style={{ flex: `0 0 calc(${leftSectionPercent}% - 3px)`, minWidth: 220 }}
        >
          <div className="editor-top-controls">
            <div className="editor-top-controls-source">
              <span className="editor-top-controls-label">Source</span>
              <span className="language-pill editor-top-pill">
                <span className="language-flag">{LANGUAGE_FLAGS[video?.source_language] || "🏳️"}</span>
                <span>{LANGUAGE_LABELS_WITH_AUTO[video?.source_language] || "Unknown"}</span>
              </span>
            </div>
            <div className="editor-top-controls-target">
              <span className="editor-top-controls-label">Target</span>
              <Select
                value={targetLanguage}
                onChange={handleLanguageChange}
                options={Object.entries(SUPPORTED_LANGUAGES).map(([code, label]) => ({
                  value: code,
                  label: `${LANGUAGE_FLAGS[code] || "🏳️"} ${label}`
                }))}
                placeholder="Select language"
                disabled={changingLanguage || redubbing || isEditing}
                className="language-select-wrapper"
              />
            </div>
            <div className="editor-top-controls-redub">
              <button
                type="button"
                className={`button secondary small redub-button ${!video?.id || applying || changingLanguage || redubbing || isEditing ? 'muted' : ''}`}
                onClick={async () => {
                  try {
                    if (!video?.id) return;
                    // Ensure socket subscription is active before triggering redub
                    const resolvedJobId = jobId || params.jobId
                      || localStorage.getItem(getActiveEditorJobStorageKey(DEFAULT_USER_ID));
                    if (resolvedJobId && isConnected && subscribeToJobs) {
                      subscribeToJobs([resolvedJobId]);
                    }
                    // Lock all editor actions while redub runs
                    dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('redubbing_video') } });
                    // Show initial loading state — socket events will update in real-time
                    dispatch(updateEditorNotification(STATUS_LABELS.redubbing_video, null, resolvedJobId));
                    await dispatch(redubVideoAction(video.id));
                  } catch (_) {
                    dispatch({ type: EDITOR_IDLE });
                    dispatch(resetEditorNotification());
                  }
                }}
                disabled={!video?.id || applying || changingLanguage || redubbing || isEditing}
                title="Redub video with current transcript"
              >
                <FiRefreshCw size={12} className={isEditing && editingStatusText?.toLowerCase().includes('redub') ? 'spin-icon' : ''} />
                <span>{isEditing && editingStatusText?.toLowerCase().includes('redub') ? 'Redubbing...' : 'Redub entire video'}</span>
              </button>
            </div>
          </div>

          <nav className="editor-section-nav" aria-label="Editor sections">
            {EDITOR_SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`editor-section-btn ${editorSection === id ? "active" : ""}`}
                onClick={() => setEditorSection(id)}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="editor-section-content">

            <ErrorBanner message={error} />
            {editorSection === "timeline" && !loading && !error && video && Array.isArray(segments) && segments.length > 0 && (
              <EditorView
                video={video}
                segments={segments}
                speakers={speakers}
                allSpeakerLabels={allSpeakerLabels}
                speakerSegmentModes={speakerSegmentModes}
                onReassignSpeaker={handleReassignSpeaker}
                checkSegmentMismatch={checkSegmentMismatch}
                onApplyChanges={async (changes) => {
                  dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('applying_changes') } });
                  try {
                    await dispatch(applyChanges(video.id, changes));
                    window.location.reload();
                  } finally {
                    dispatch({ type: EDITOR_IDLE });
                  }
                }}
                applying={applying}
                changingLanguage={changingLanguage}
                redubbing={redubbing}
                isEditing={isEditing}
                targetLanguage={targetLanguage}
                supportedLanguages={SUPPORTED_LANGUAGES}
                onChangeLanguage={handleLanguageChange}
                onPlaySegment={handlePlaySegment}
                currentPlaybackTime={currentPlaybackTime}
                onUpdateSegmentMeta={handleUpdateMeta}
                onSegmentVocalGainChange={handleSegmentVocalGainChange}
                onSegmentBackgroundGainChange={handleSegmentBackgroundGainChange}
                onSegmentSpeechSpeedChange={handleSegmentSpeechSpeedChange}
                onDeleteSegment={handleDeleteSegment}
                onBusy={() => dispatch({ type: EDITOR_BUSY, payload: { statusText: formatStatusText('processing') } })}
                onIdle={() => dispatch({ type: EDITOR_IDLE })}
              />
            )}
            {editorSection === "timeline" && !loading && !error && video && (!Array.isArray(segments) || segments.length === 0) && (
              <div className="card editor-card-compact">
                <h3 className="card-title">Editor Timeline</h3>
                <p className="editor-text-sm">No segments available. Please wait for transcription to complete.</p>
              </div>
            )}
            {editorSection === "timeline" && !loading && !error && !video && (
              <div className="card editor-card-compact">
                <h3 className="card-title">Editor Timeline</h3>
                <p className="editor-text-sm">Please load a job to view the editor.</p>
              </div>
            )}
            {editorSection === "import" && (
              <div className="card editor-card-compact">
                <h3 className="card-title">Importing</h3>
                <p className="editor-text-sm">Import subtitles or transcripts. (Coming soon.)</p>
              </div>
            )}
            {editorSection === "merge" && (
              <div className="card editor-card-compact">
                <h3 className="card-title">Merge videos</h3>
                <p className="editor-text-sm">Combine videos with current project. (Coming soon.)</p>
              </div>
            )}
          </div>
        </aside>
        <div
          className="editor-resizer editor-resizer-vertical"
          onMouseDown={handleLRResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={leftSectionPercent}
        />
        <div
          className="editor-right-column"
          style={{ flex: "1 1 0", minWidth: 0 }}
        >
          <div className="card video-container editor-card-compact">
            <div className="video-comparison-header">
              <h3 className="card-title">Original vs Dubbed</h3>
              <button
                type="button"
                className="section-chevron-toggle"
                onClick={() => setShowVideos((prev) => !prev)}
                title={showVideos ? "Collapse" : "Expand"}
              >
                {showVideos ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
              </button>
            </div>
            {showVideos ? (
              <>
                <div className="video-panel-row">
                  <div className="video-panel">
                    <p className="video-panel-label">Original</p>
                    {originalUrl ? (
                      <video ref={originalVideoRef} src={originalUrl} controls preload="metadata" />
                    ) : (
                      <div className="loading editor-text-sm">Load a job to preview.</div>
                    )}
                  </div>
                  <div className="video-panel">
                    <p className="video-panel-label">Dubbed</p>
                    {videoUrl ? (
                      <video ref={videoRef} src={videoUrl} controls preload="metadata" />
                    ) : (
                      <div className="loading editor-text-sm">Load a job to preview.</div>
                    )}
                  </div>
                </div>
                {video ? (
                  <div className="video-meta-row">
                    <span className="meta-label">ID:</span>
                    <span className="meta-value">{video.id}</span>
                    <span className="meta-label">Duration:</span>
                    <span className="meta-value">{formatDuration(video.duration_ms)}</span>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="speaker-control">
              <div className="speaker-control-header">
                <h4>Speakers & Segments</h4>
                <button
                  className="section-chevron-toggle"
                  onClick={() => setShowSpeakersSegments((prev) => !prev)}
                  title={showSpeakersSegments ? "Collapse" : "Expand"}
                >
                  {showSpeakersSegments ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                </button>
              </div>
              {showSpeakersSegments ? (
                <>
                  <span className="speaker-control-hint">
                    Review speakers, mismatches, and redub segments.
                  </span>
                  <div className="speaker-list">
                    {speakerControlData.map((sp) => {
                      const isExpanded = !!expandedSpeakers[sp.label];
                      const mismatchCount = sp.mismatchSegments.length;
                      const needsRedubCount = sp.needsRedubSegments.length;
                      return (
                        <div
                          key={sp.label}
                          className={`speaker-card ${mismatchCount ? "mismatch" : ""}`}
                        >
                          <div className="speaker-card-header">
                            <div className="speaker-card-title">
                              <span className="speaker-name">{sp.displayLabel}</span>
                              <span className="speaker-label-chip">{sp.label}</span>
                              {sp.mismatchCounts?.gender ? (
                                <span className="badge badge-warn">
                                  Gender mismatch with {sp.displayLabel} ({sp.mismatchCounts.gender})
                                </span>
                              ) : null}
                              {sp.mismatchCounts?.voiceType ? (
                                <span className="badge badge-warn">
                                  Voice type mismatch with {sp.displayLabel} ({sp.mismatchCounts.voiceType})
                                </span>
                              ) : null}
                              {sp.mismatchCounts?.voiceProfile ? (
                                <span className="badge badge-warn">
                                  Voice profile mismatch with {sp.displayLabel} ({sp.mismatchCounts.voiceProfile})
                                </span>
                              ) : null}
                              {needsRedubCount > 0 ? (
                                <span className="badge badge-info">
                                  {needsRedubCount} needs redub
                                </span>
                              ) : null}
                            </div>
                            <div className="speaker-card-meta">
                              {sp.gender ? <span>{sp.gender}</span> : <span>Gender: unset</span>}
                              {sp.voiceType ? <span>Type: {sp.voiceType}</span> : <span>Type: unset</span>}
                              {sp.effectiveVoiceProfile ? (
                                <span>Voice profile: {displayVoiceProfile(sp.effectiveVoiceProfile)}</span>
                              ) : (
                                <span>Voice profile: unset</span>
                              )}
                              {sp.cloned ? (
                                <span className="badge badge-success">Cloned</span>
                              ) : sp.canBeCloned ? (
                                <span className="badge badge-info">Can clone ({Math.round(sp.durationSec || 0)}s)</span>
                              ) : sp.durationSec > 0 ? (
                                <span className="badge badge-muted">Voice similarity ({Math.round(sp.durationSec)}s)</span>
                              ) : null}
                              <button
                                className="speaker-toggle section-chevron-toggle"
                                onClick={() =>
                                  setExpandedSpeakers((prev) => ({
                                    ...prev,
                                    [sp.label]: !isExpanded
                                  }))
                                }
                                title={isExpanded ? "Collapse segments" : "Expand segments"}
                              >
                                {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                              </button>
                            </div>
                            {(sp.canBeCloned && !sp.cloned) ? (
                              <div className="speaker-clone-actions">
                                <button
                                  className="button primary"
                                  disabled={cloningSpeaker === sp.label || isEditing}
                                  onClick={() => handleCloneVoice(sp.label)}
                                >
                                  {cloningSpeaker === sp.label ? "Cloning..." : "Clone voice"}
                                </button>
                              </div>
                            ) : !sp.canBeCloned && !sp.cloned && sp.segments?.length > 0 ? (
                              <div className="speaker-voice-similarity">
                                <span className="voice-similarity-label">Voice similarity (not enough audio to clone):</span>
                                <div className="voice-similarity-controls">
                                  <button
                                    className="button secondary"
                                    onClick={() => handlePlaySpeakerSample(sp)}
                                    disabled={!originalUrl}
                                    title="Play short sample from original"
                                  >
                                    Play sample
                                  </button>
                                  <Select
                                    value={sp.effectiveVoiceProfile || ""}
                                    onChange={(val) => handleSetSpeakerVoiceProfile(sp.label, val)}
                                    options={getAllVoiceProfiles().map((p) => ({ value: p, label: p }))}
                                    placeholder="Select similar voice"
                                    className="meta-select voice-similarity-select"
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                          {isExpanded ? (
                            <div className="speaker-segments">
                              {sp.segments.length === 0 ? (
                                <div className="segment-row-muted">No segments assigned.</div>
                              ) : (
                                sp.segments.map((seg) => {
                                  const mismatch = checkSegmentMismatch(sp.label, seg);
                                  const effectiveGender = seg.gender || sp.gender || "";
                                  return (
                                    <div key={seg.id} className="segment-row-card">
                                      <div className="segment-row-top">
                                        <div className="segment-id">
                                          {formatMsShort(seg.start_time_ms)} - {formatMsShort(seg.end_time_ms)}
                                        </div>
                                        <div className="segment-tags">
                                          {mismatch.gender ? (
                                            <span className="badge badge-warn">Gender mismatch with {sp.displayLabel}</span>
                                          ) : null}
                                          {mismatch.voiceType ? (
                                            <span className="badge badge-warn">Voice type mismatch with {sp.displayLabel}</span>
                                          ) : null}
                                          {mismatch.voiceProfile ? (
                                            <span className="badge badge-warn">Voice profile mismatch with {sp.displayLabel}</span>
                                          ) : null}
                                          {!seg?.active_audio_take ? (
                                            <span className="badge badge-info">Needs redub</span>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="segment-text-preview">
                                        {seg.target_text || seg.source_text || "No text"}
                                      </div>
                                      <div className="segment-meta-grid">
                                        <div>
                                          <span className="meta-label">Gender:</span>{" "}
                                          <span className={mismatch.gender ? "mismatch-text" : ""}>
                                            {effectiveGender || "unset"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="meta-label">Voice Type:</span>{" "}
                                          <span className={mismatch.voiceType ? "mismatch-text" : ""}>
                                            {seg.voice_type || sp.voiceType || "unset"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="meta-label">Voice profile:</span>{" "}
                                          <span className={mismatch.voiceProfile ? "mismatch-text" : ""}>
                                            {seg.voice_profile
                                              ? displayVoiceProfile(seg.voice_profile)
                                              : sp.effectiveVoiceProfile
                                                ? displayVoiceProfile(sp.effectiveVoiceProfile)
                                                : "unset"}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="segment-actions">
                                        <label>
                                          Assign to speaker:
                                          <Select
                                            value={seg.speaker_label || "Unassigned"}
                                            onChange={(val) =>
                                              handleReassignSpeaker(seg.id, val === "Unassigned" ? null : val)
                                            }
                                            options={allSpeakerLabels}
                                            canEdit={true}
                                            speakerSelect={true}
                                            existingSpeakerLabels={allSpeakerLabels.filter((l) => l !== "Unassigned")}
                                            customOptionLabel="Custom speaker..."
                                            className="meta-select-group"
                                          />
                                        </label>
                                        <button className="secondary" onClick={() => handleSegmentRedub(seg)} disabled={isEditing}>
                                          Redub
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

      </div>
      <div
        className="editor-audio-resizer"
        onMouseDown={handleAudioResizeStart}
        role="separator"
        aria-orientation="horizontal"
        title="Drag to resize audio panel"
      />
      <div className="audio-panel-full" style={{ height: audioPanelHeight, minHeight: 140 }}>
        <div className="card audio-panel">
          {dubbedAudioUrl ? (
            <>
              {/* Controls Toolbar (Keep functional buttons, remove labels/dividers if requested, or keep minimal) 
                  User asked to remove "waveform:" and "volume:" labels. 
                  I will keep the controls but remove the explicit labeled sections to clean it up.
              */}
              {/* Controls Toolbar removed as per user request */}

              <DubbingTimeline
                ref={timelineRef}
                audioUrl={dubbedAudioUrl + (audioCacheBuster ? `?t=${audioCacheBuster}` : "")}
                speakers={speakerControlData} /* Passing full speaker control data which has label, displayLabel etc */
                onWaveReady={handleWaveReady}
                onSelectionChange={handleWaveformSelection}
                onSegmentUpdate={handleSegmentTimingChange}
                isEditing={isEditing}
              />

              {waveformSelection && (
                <div className="audio-tools-bar" style={{ display: 'flex', justifyContent: 'center', padding: '10px 0', gap: '10px' }}>
                  <div className="selection-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-secondary)', padding: '5px 15px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                    <span className="selection-label" style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                      Silence Range: {formatMsShort(waveformSelection.startMs)} - {formatMsShort(waveformSelection.endMs)}
                    </span>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        className="button danger small"
                        onClick={handleSilenceSelection}
                        title="Confirm Silence"
                        disabled={isEditing}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}
                      >
                        <FiCheck size={14} /> Confirm
                      </button>
                      <button
                        className="button secondary small"
                        onClick={() => {
                          setWaveformSelection(null);
                          if (timelineRef.current) timelineRef.current.clearRegions();
                        }}
                        title="Cancel Silence"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}
                      >
                        <FiX size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <AudioControls
                isPlaying={isAudioPlaying}
                onPlayPause={handleAudioPlayPause}
                onBack={() => handleSeek(-10)}
                onForward={() => handleSeek(10)}
              />
            </>
          ) : (
            <div className="loading">No dubbed audio available.</div>
          )}
        </div>
      </div>
      <ConfirmSelection
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, segmentId: null })}
        title="Delete Segment"
        message="How would you like to remove this segment?"
        theme={theme}
        options={[
          {
            label: "Delete Vocals Only (Default)",
            description: "Removes text/vocals. Background noise remains.",
            onClick: () => confirmDelete('delete')
          },
          {
            label: "Delete Everything (Silence)",
            description: "Mutes BOTH vocals and background noise.",
            danger: true,
            onClick: () => confirmDelete('silence')
          }
        ]}
      />
      <ConfirmSelection
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        confirmText={alertModal.confirmText}
        cancelText={null} // Hide cancel button for alerts
        isAlert={alertModal.isAlert}
        variant={alertModal.variant} // Pass variant explicitly
        theme={theme}
        onConfirm={() => setAlertModal({ ...alertModal, isOpen: false })}
      />
      <LoadingScreenContainer loading={loading} statusText={editingStatusText} />
    </div>
  );
};

export default EditorPage;

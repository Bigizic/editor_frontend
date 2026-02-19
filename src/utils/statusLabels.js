export const STATUS_LABELS = {
  processing: "Processing",
  extracting_audio: "Extracting audio from video",
  analyzing_audio_stems: "Running stem analysis",
  analyzing_audio: "Analyzing audio",
  transcribing_audio: "Transcribing audio",
  translating_audio: "Translating audio",
  cloning: "Cloning voice",
  segmenting_audio: "Segmenting audio",
  adjusting_audio_timing: "Syncing audio timing",
  generating_tts: "Generating speech audio",
  creating_final_audio: "Creating final audio mix",
  lip_syncing: "Lip syncing video",
  cleaning_things_up: "Cleaning things up",
  done: "Done",
  completed: "Done",
  failed: "Failed",

  // editor statuses
  verifying_audio_stems: "Verifying audio stems",
  re_extracting_audio: "Extracting audio again",
  re_analyzing_audio_stems: "Analyzing audio stems again",
  redubbing_video: "Redubbing video",
  redubbing_segment: "Redubbing segment",
  updating_segment: "Updating segment",
  deleting_segment: "Deleting segment",
  cloning_voice: "Cloning voice",
  setting_voice_profile: "Setting voice profile",
  applying_changes: "Applying changes",
  silence_range: "Silence range",
  remixing_audio: "Remixing audio"
};

/**
 * High-level action names — used as the notification title.
 * Multiple pipeline statuses can map to the same action.
 * NOTE: Terminal statuses (done/completed/failed/cancelled) are intentionally
 * omitted so the reducer preserves the original action name from the first event.
 */
export const ACTION_NAMES = {
  // editor-triggered actions
  redubbing_video: "Redub entire video",
  redubbing_segment: "Redub segment",
  applying_changes: "Apply changes",
  cloning_voice: "Clone voice",
  setting_voice_profile: "Set voice profile",
  remixing_audio: "Remix audio",
  silence_range: "Silence audio range",
  deleting_segment: "Delete segment",
  updating_segment: "Update segment",

  // pipeline statuses that belong to the redub flow
  verifying_audio_stems: "Redub entire video",
  re_extracting_audio: "Redub entire video",
  re_analyzing_audio_stems: "Redub entire video",
  generating_tts: "Redub entire video",
  lip_syncing: "Redub entire video",
  cleaning_things_up: "Redub entire video",
  processing: "Processing",
};
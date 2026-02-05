import { apiClient } from "./client.js";

export const fetchEditorByVideoId = async (videoId) => {
  const response = await apiClient.get(`/editor/videos/${videoId}/editor`);
  console.log(response.data)
  return response.data;
};

export const fetchVideoByJobId = async (jobId) => {
  const response = await apiClient.get(`/editor/videos/by-job/${jobId}`);
  return response.data;
};

export const updateSegment = async (segmentId, payload) => {
  const response = await apiClient.patch(`/editor/segments/${segmentId}`, payload);
  return response.data;
};

export const deleteSegment = async (segmentId, mode = "delete") => {
  const response = await apiClient.delete(`/editor/segments/${segmentId}?delete_mode=${mode}`);
  return response.data;
};

export const splitSegment = async (segmentId, splitTimeMs) => {
  const response = await apiClient.post(`/editor/segments/${segmentId}/split`, {
    split_time_ms: splitTimeMs
  });
  return response.data;
};

export const mergeSegments = async (segmentIds) => {
  const response = await apiClient.post(`/editor/segments/merge`, {
    segment_ids: segmentIds
  });
  return response.data;
};

export const regenerateSegmentDub = async (segmentId) => {
  const response = await apiClient.post(`/editor/segments/${segmentId}/regenerate-dub`);
  return response.data;
};

export const activateAudioTake = async (takeId) => {
  const response = await apiClient.post(`/editor/audio-takes/${takeId}/activate`);
  return response.data;
};

export const fetchPreviewAudio = async (videoId) => {
  const response = await apiClient.get(`/editor/videos/${videoId}/preview-audio`);
  return response.data;
};

export const applySegmentChanges = async (videoId, changes) => {
  const response = await apiClient.post(`/editor/segments/apply-changes`, {
    video_id: videoId,
    changes
  });
  return response.data;
};

export const changeVideoLanguage = async (videoId, targetLanguage) => {
  const response = await apiClient.post(`/editor/videos/change-language`, {
    video_id: videoId,
    target_language: targetLanguage
  });
  return response.data;
};

export const retranslateSegment = async (segmentId, payload) => {
  const response = await apiClient.post(
    `/editor/segments/${segmentId}/retranslate`,
    payload
  );
  return response.data;
};

export const redubVideo = async (videoId) => {
  const response = await apiClient.post(`/editor/videos/redub`, {
    video_id: videoId
  });
  return response.data;
};

export const redubSegment = async (segmentId, overrides = {}) => {
  const response = await apiClient.post(`/editor/segments/${segmentId}/redub`, overrides);
  return response.data;
};

export const audioTakeUrl = (takeId) => {
  return `${apiClient.defaults.baseURL}/editor/audio-takes/${takeId}/audio`;
};

// Speakers
export const fetchSpeakers = async (videoId) => {
  const response = await apiClient.get(`/editor/videos/${videoId}/speakers`);
  return response.data;
};

export const updateSpeaker = async (videoId, speakerId, payload) => {
  const response = await apiClient.put(`/editor/videos/${videoId}/speakers/${speakerId}`, payload);
  return response.data;
};

// Voice cloning
export const fetchCloneStatus = async (videoId) => {
  const response = await apiClient.get(`/editor/videos/${videoId}/speakers/clone-status`);
  return response.data;
};

export const cloneSpeakerVoice = async (videoId, speakerLabel) => {
  const response = await apiClient.post(
    `/editor/videos/${videoId}/speakers/${encodeURIComponent(speakerLabel)}/clone`
  );
  return response.data;
};

export const setSpeakerVoiceProfile = async (videoId, speakerLabel, voiceProfile) => {
  const response = await apiClient.patch(
    `/editor/videos/${videoId}/speakers/${encodeURIComponent(speakerLabel)}/voice-profile`,
    { voice_profile: voiceProfile }
  );
  return response.data;
};

// Waveform audio operations (trim, cut, normalize)
export const trimDubbedAudio = async (videoId, startMs, endMs) => {
  const response = await apiClient.post(
    `/editor/videos/${videoId}/audio/trim`,
    { start_ms: startMs, end_ms: endMs }
  );
  return response.data;
};

export const cutDubbedAudio = async (videoId, startMs, endMs) => {
  const response = await apiClient.post(
    `/editor/videos/${videoId}/audio/cut`,
    { start_ms: startMs, end_ms: endMs }
  );
  return response.data;
};

export const normalizeDubbedAudio = async (videoId, options = {}) => {
  const body = {};
  if (options.startMs != null) body.start_ms = options.startMs;
  if (options.endMs != null) body.end_ms = options.endMs;
  if (options.targetDbfs != null) body.target_dbfs = options.targetDbfs;
  const response = await apiClient.post(
    `/editor/videos/${videoId}/audio/normalize`,
    body
  );
  return response.data;
};

// Volume gains (remix without redub)
export const updateVideoGains = async (videoId, { dialogue_gain, background_gain }) => {
  const body = {};
  if (dialogue_gain != null) body.dialogue_gain = dialogue_gain;
  if (background_gain != null) body.background_gain = background_gain;
  const response = await apiClient.patch(`/editor/videos/${videoId}/gains`, body);
  return response.data;
};

export const remixDubbedAudio = async (videoId) => {
  const response = await apiClient.post(`/editor/videos/${videoId}/remix`);
  return response.data;
};

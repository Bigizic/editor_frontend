import { apiClient } from "./client.js";

export const submitDubbingJob = async ({
  userId,
  videoFile,
  targetLanguage,
  sourceLanguage,
  dialogueGain,
  backgroundGain,
  enableVoiceCloning
}) => {
  const formData = new FormData();
  formData.append("user_id", userId);
  formData.append("video_file", videoFile);
  formData.append("target_language", targetLanguage);
  formData.append("source_language", sourceLanguage);
  if (dialogueGain != null) formData.append("dialogue_gain", String(dialogueGain));
  if (backgroundGain != null) formData.append("background_gain", String(backgroundGain));
  if (enableVoiceCloning != null) formData.append("enable_voice_cloning", enableVoiceCloning ? "true" : "false");

  const response = await apiClient.post(`/dubbing/submit`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return response.data;
};

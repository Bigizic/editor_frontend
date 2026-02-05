import { apiClient } from "./client.js";

export const fetchUserJobs = async (userId) => {
  const response = await apiClient.get(`/jobs/user/${userId}/history`);
  return response.data;
};

export const downloadJobVideoUrl = (jobId) => {
  return `${apiClient.defaults.baseURL}/jobs/${jobId}/download`;
};

export const downloadOriginalVideoUrl = (jobId) => {
  return `${apiClient.defaults.baseURL}/jobs/${jobId}/original`;
};

export const downloadDubbedAudioUrl = (jobId) => {
  return `${apiClient.defaults.baseURL}/jobs/${jobId}/dubbed-audio`;
};

export const deleteJob = async (jobId) => {
  const response = await apiClient.delete(`/jobs/${jobId}`);
  return response.data;
};

export const fetchJobStatus = async (jobId) => {
  const response = await apiClient.get(`/jobs/${jobId}/status`);
  return response.data;
};

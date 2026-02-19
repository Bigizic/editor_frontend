import {
  JOBS_FETCH_REQUEST,
  JOBS_FETCH_SUCCESS,
  JOBS_FETCH_FAILURE,
  JOB_DELETE_REQUEST,
  JOB_DELETE_SUCCESS,
  JOB_DELETE_FAILURE,
  JOB_NOTIFICATIONS_UPDATE,
  JOB_STATUS_BULK_UPDATE
} from "../constants/jobConstants.js";
import { fetchUserJobs, deleteJob } from "../../api/jobsApi.js";

export const loadUserJobs = (userId) => async (dispatch) => {
  dispatch({ type: JOBS_FETCH_REQUEST });
  try {
    const data = await fetchUserJobs(userId);
    console.log('data', data)
    dispatch({ type: JOBS_FETCH_SUCCESS, payload: data });
  } catch (error) {
    dispatch({
      type: JOBS_FETCH_FAILURE,
      payload: error?.response?.data?.detail || error.message
    });
  }
};

export const removeJob = (jobId, userId) => async (dispatch) => {
  dispatch({ type: JOB_DELETE_REQUEST, payload: jobId });
  try {
    await deleteJob(jobId, userId);
    dispatch({ type: JOB_DELETE_SUCCESS, payload: jobId });
    // Reload jobs to ensure frontend is in sync with backend
    if (userId) {
      dispatch(loadUserJobs(userId));
    }
  } catch (error) {
    dispatch({
      type: JOB_DELETE_FAILURE,
      payload: error?.response?.data?.detail || error.message
    });
  }
};

export const setJobNotifications = (items) => ({
  type: JOB_NOTIFICATIONS_UPDATE,
  payload: items
});

export const setJobStatusBulk = (items) => ({
  type: JOB_STATUS_BULK_UPDATE,
  payload: items
});

const ACTIVE_JOB_STORAGE_KEY = (userId) => `dubbing_active_job_${userId}`;

export const initializeActiveJobFromStorage = (userId) => (dispatch, getState) => {
  try {
    const storedJobId = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY(userId));
    if (storedJobId) {
      dispatch(setJobNotifications([{
        job_id: storedJobId,
        status: "queued",
        progress: 0
      }]));
    }
  } catch (error) {
    console.error("Failed to load notifications from localStorage:", error);
  }
};

export const initializeActiveJobFromJobs = (userId) => (dispatch, getState) => {
  const state = getState();
  const jobs = state.jobs.jobs || [];
  const storedJobId = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY(userId));

  if (!storedJobId) {
    return;
  }

  const activeJobs = jobs.filter((job) => {
    const status = job.status || job.job_status;
    return !["done", "completed", "failed", "cancelled"].includes(status);
  });

  const matchedJob = activeJobs.find(
    (job) => (job.job_id || job.id) === storedJobId
  );

  if (matchedJob) {
    const status = (matchedJob?.status || matchedJob?.job_status || "queued").toLowerCase();
    const progress = matchedJob?.progress_percentage || 0;

    dispatch(setJobNotifications([{
      job_id: storedJobId,
      status,
      progress
    }]));
  }
};

export const handleNewJobSubmission = (jobId, userId, subscribeToJobs, isConnected) => (dispatch) => {
  const newNotification = {
    job_id: jobId,
    status: "queued",
    progress: 0
  };

  dispatch(setJobNotifications([newNotification]));
  localStorage.setItem(ACTIVE_JOB_STORAGE_KEY(userId), jobId);

  if (isConnected && subscribeToJobs) {
    console.log("Subscribing to new job:", jobId);
    subscribeToJobs([jobId]);
  }

  dispatch(loadUserJobs(userId));
};

export const syncActiveJobStorage = (userId) => (dispatch, getState) => {
  const state = getState();
  const notifications = state.jobs.notifications || [];

  if (notifications.length === 0) {
    localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY(userId));
    return;
  }

  const active = notifications.find((n) => n?.job_id);
  if (!active) {
    localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY(userId));
    return;
  }

  const status = (active.status || "").toLowerCase();
  if (["done", "completed", "failed", "cancelled"].includes(status)) {
    localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY(userId));
    dispatch(setJobNotifications([]));
  } else {
    localStorage.setItem(ACTIVE_JOB_STORAGE_KEY(userId), active.job_id);
  }
};

export const initializeJobsPage = (userId) => (dispatch) => {
  dispatch(loadUserJobs(userId));
  dispatch(initializeActiveJobFromStorage(userId));
};

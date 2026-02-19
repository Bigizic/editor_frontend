/**
 * Pure helpers for job subscription, notifications, and localStorage sync.
 * All functions accept dependencies (dispatch, fetchJobStatus, etc.) so they
 * can be reused from JobsPage and EditorPage.
 */

import { setJobNotifications, setJobStatusBulk, loadUserJobs } from "../redux/actions/jobActions.js";
import { getActiveJobStorageKey, getActiveEditorJobStorageKey } from "./storageKeys.js";

const TERMINAL_STATUSES = ["done", "completed", "failed", "cancelled"];

/**
 * Hydrate notifications from a stored job id by fetching status from API.
 * Clears storage if job is in a terminal state.
 */
export async function hydrateFromStoredJob(storedJobId, dispatch, { fetchJobStatus, userId }) {
  if (!storedJobId) return;

  const jobKey = getActiveJobStorageKey(userId);
  const editorKey = getActiveEditorJobStorageKey(userId);

  try {
    const statusData = await fetchJobStatus(storedJobId);
    const status = (statusData.status || "queued").toLowerCase();
    const progress = statusData.progress_percentage ?? 0;

    dispatch(
      setJobNotifications([{ job_id: storedJobId, status, progress }])
    );

    if (TERMINAL_STATUSES.includes(status)) {
      localStorage.removeItem(jobKey);
      localStorage.removeItem(editorKey);
    } else {
      localStorage.setItem(jobKey, storedJobId);
      localStorage.setItem(editorKey, storedJobId);
    }
  } catch (err) {
    dispatch(
      setJobNotifications([
        { job_id: storedJobId, status: "queued", progress: 0 },
      ])
    );
  }
}

/**
 * Initialize notifications when jobs have loaded and we have a stored job id.
 */
export function initializeNotificationsFromActiveJobs(activeJobs, storedJobId, dispatch) {
  if (!storedJobId) return;

  const matchedJob = activeJobs.find(
    (job) => (job.job_id || job.id) === storedJobId
  );
  const status = (
    matchedJob?.status ||
    matchedJob?.job_status ||
    "queued"
  ).toLowerCase();
  const progress = matchedJob?.progress_percentage ?? 0;

  dispatch(
    setJobNotifications([{ job_id: storedJobId, status, progress }])
  );
}

/**
 * Handle new job submission: add notification, persist, subscribe, reload jobs.
 */
export function handleNewJobSubmission({
  jobId,
  userId,
  dispatch,
  subscribeToJobs,
  isConnected,
}) {
  if (!jobId) return;

  dispatch(
    setJobNotifications([
      { job_id: jobId, status: "queued", progress: 0 },
    ])
  );

  const storageKey = getActiveJobStorageKey(userId);
  localStorage.setItem(storageKey, jobId);

  if (isConnected && subscribeToJobs) {
    console.log("Subscribing to new job:", jobId);
    subscribeToJobs([jobId]);
  }

  dispatch(loadUserJobs(userId));
}

/**
 * Load initial notifications from stored job id (optimistic, no fetch).
 */
export function loadActiveJobFromStorage(storedJobId, dispatch) {
  if (!storedJobId) return;

  try {
    dispatch(
      setJobNotifications([
        { job_id: storedJobId, status: "queued", progress: 0 },
      ])
    );
  } catch (error) {
    console.error("Failed to load notifications from localStorage:", error);
  }
}

/**
 * Sync localStorage with current notifications. Clear storage when job completes.
 */
export function syncActiveJobStorage(notifications, dispatch, userId) {
  const storageKey = getActiveJobStorageKey(userId);

  if (notifications.length === 0) {
    localStorage.removeItem(storageKey);
    return;
  }

  const active = notifications.find((n) => n?.job_id);
  if (!active) {
    localStorage.removeItem(storageKey);
    return;
  }

  const status = (active.status || "").toLowerCase();
  if (TERMINAL_STATUSES.includes(status)) {
    localStorage.removeItem(storageKey);
    dispatch(setJobNotifications([]));
  } else {
    localStorage.setItem(storageKey, active.job_id);
  }
}

/**
 * Subscribe to a job and persist it to active editor job storage.
 * Use when opening EditorPage with a job id.
 */
export function subscribeAndPersistEditorJob({
  jobId,
  userId,
  subscribeToJobs,
  isConnected,
}) {
  if (!jobId) return;

  const storageKey = getActiveEditorJobStorageKey(userId);
  localStorage.setItem(storageKey, jobId);

  if (isConnected && subscribeToJobs) {
    subscribeToJobs([jobId]);
  }
}

/**
 * Re-subscribe stored job(s) when socket connects/reconnects.
 * Used for both active job (JobsPage) and active editor job (EditorPage).
 */
export function resubscribeStoredJobs(storageKeys, subscribeToJobs) {
  if (!subscribeToJobs) return;

  const keys = Array.isArray(storageKeys) ? storageKeys : [storageKeys];
  keys.forEach((key) => {
    const storedJobId = typeof key === "string" ? localStorage.getItem(key) : null;
    if (storedJobId) {
      subscribeToJobs([storedJobId]);
    }
  });
}

/**
 * Setup socket listener for job_status_update. Re-subscribes on connect.
 * Returns cleanup function.
 */
export function setupJobStatusSocketListener({
  socket,
  isConnected,
  subscribeToJobs,
  dispatch,
  userId,
  /** Optional: storage keys to re-subscribe on connect (e.g. active job + active editor job) */
  storageKeysToResubscribe = [],
}) {
  let isMounted = true;

  if (!socket || !isConnected) {
    return () => {
      isMounted = false;
    };
  }

  const storageKey = getActiveJobStorageKey(userId);
  const editorStorageKey = getActiveEditorJobStorageKey(userId);
  const keysToResub = storageKeysToResubscribe.length
    ? storageKeysToResubscribe
    : [storageKey, editorStorageKey];

  resubscribeStoredJobs(keysToResub, subscribeToJobs);

  const handleJobStatusUpdate = (data) => {
    if (!isMounted) return;

    const { job_id, status, progress_percentage } = data;
    console.log("🔔 [JobSubscription] Received job status update:", data);

    const normalizedStatus = (status || "").toLowerCase();
    const progress =
      progress_percentage != null ? progress_percentage : 0;

    const notificationItem = {
      job_id,
      status: normalizedStatus,
      progress,
    };

    dispatch(setJobStatusBulk([notificationItem]));
    dispatch(setJobNotifications([notificationItem]));

    if (TERMINAL_STATUSES.includes(normalizedStatus)) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(editorStorageKey);
    } else {
      localStorage.setItem(storageKey, job_id);
      localStorage.setItem(editorStorageKey, job_id);
    }
  };

  socket.on("job_status_update", handleJobStatusUpdate);

  return () => {
    isMounted = false;
    socket.off("job_status_update", handleJobStatusUpdate);
  };
}

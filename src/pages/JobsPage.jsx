import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  loadUserJobs,
  removeJob,
  setJobNotifications
} from "../redux/actions/jobActions.js";
import { submitJob } from "../redux/actions/dubbingActions.js";
import JobsGrid from "../components/JobsGrid.jsx";
import LoadingScreenContainer from "../components/LoadingScreenContainer.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import DubbingForm from "../components/DubbingForm.jsx";
import { useSocket } from "../Socket/index.jsx";
import { fetchJobStatus } from "../api/jobsApi.js";
import { formatStatusText } from "../utils/formatStatusText.js";
import {
  getActiveJobStorageKey,
  getActiveEditorJobStorageKey,
  DEFAULT_USER_ID
} from "../helpers/storageKeys.js";
import {
  hydrateFromStoredJob,
  initializeNotificationsFromActiveJobs,
  handleNewJobSubmission,
  loadActiveJobFromStorage,
  syncActiveJobStorage,
  setupJobStatusSocketListener
} from "../helpers/jobSubscriptionHelpers.js";

const JobsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, jobs, deleting, notifications } = useSelector(
    (state) => state.jobs
  );
  const dubbingState = useSelector((state) => state.dubbing);
  const { socket, isConnected, subscribeToJobs } = useSocket() || {};

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = job.status || job.job_status;
        return !["done", "completed", "failed", "cancelled"].includes(status);
      }),
    [jobs]
  );

  // On mount: hydrate from stored job id
  useEffect(() => {
    const storedJobId = localStorage.getItem(getActiveJobStorageKey(DEFAULT_USER_ID));
    if (!storedJobId) return;
    hydrateFromStoredJob(storedJobId, dispatch, {
      fetchJobStatus,
      userId: DEFAULT_USER_ID
    });
  }, [dispatch]);

  // Load user jobs on mount
  useEffect(() => {
    dispatch(loadUserJobs(DEFAULT_USER_ID));
  }, [dispatch]);

  // Initialize notifications for active job when jobs load
  useEffect(() => {
    const storedJobId = localStorage.getItem(getActiveJobStorageKey(DEFAULT_USER_ID));
    initializeNotificationsFromActiveJobs(activeJobs, storedJobId, dispatch);
  }, [activeJobs, dispatch]);

  // Handle new job submission
  useEffect(() => {
    const jobId = dubbingState.lastSubmission?.job_id;
    if (!jobId) return;

    handleNewJobSubmission({
      jobId,
      userId: DEFAULT_USER_ID,
      dispatch,
      subscribeToJobs,
      isConnected
    });
  }, [dispatch, dubbingState.lastSubmission?.job_id, isConnected, subscribeToJobs]);

  // Load active job from localStorage on mount
  useEffect(() => {
    const storedJobId = localStorage.getItem(getActiveJobStorageKey(DEFAULT_USER_ID));
    loadActiveJobFromStorage(storedJobId, dispatch);
  }, [dispatch]);

  // Sync localStorage when notifications change (clear when job completes)
  useEffect(() => {
    syncActiveJobStorage(notifications, dispatch, DEFAULT_USER_ID);
  }, [dispatch, notifications]);

  // Socket listener + re-subscribe on connect
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

  const completedJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = (job.status || job.job_status || "").toLowerCase();
        return status && ["done", "completed"].includes(status);
      }),
    [jobs]
  );

  const uncompletedJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = (job.status || job.job_status || "").toLowerCase();
        return status && !["done", "completed", "failed", "cancelled"].includes(status);
      }),
    [jobs]
  );

  const handleOpenEditor = (job) => {
    navigate(`/editor/${job.job_id}`);
  };

  const handleDelete = (jobId) => {
    dispatch(removeJob(jobId, DEFAULT_USER_ID));
  };

  const handleDeleteAllCompleted = async () => {
    if (completedJobs.length === 0) return;

    if (window.confirm(`Are you sure you want to delete all ${completedJobs.length} completed jobs?`)) {
      for (const job of completedJobs) {
        const jobId = job.job_id || job.id;
        if (jobId) {
          await dispatch(removeJob(jobId, DEFAULT_USER_ID));
        }
      }
    }
  };

  const handleClearNotification = () => {
    localStorage.removeItem(getActiveJobStorageKey(DEFAULT_USER_ID));
    dispatch(setJobNotifications([]));
  };

  const handleSubmit = (formPayload) => {
    dispatch(
      submitJob({
        userId: DEFAULT_USER_ID,
        videoFile: formPayload.videoFile,
        targetLanguage: formPayload.targetLanguage,
        sourceLanguage: formPayload.sourceLanguage,
        dialogueGain: formPayload.dialogueGain,
        backgroundGain: formPayload.backgroundGain,
        enableVoiceCloning: formPayload.enableVoiceCloning
      })
    );
  };

  return (
    <div className="jobs-page">
      <div className="jobs-layout">
        <aside className="jobs-form-side">
          <DubbingForm
            onSubmit={handleSubmit}
            submitting={dubbingState.submitting}
            lastSubmission={dubbingState.lastSubmission}
          />
          <div className="card notifications-card">
            <h3 className="card-title">Notifications</h3>
            {notifications.length === 0 ? (
              <div className="loading">No active jobs.</div>
            ) : (
              <div className="notification-list">
                {notifications.map((item) => (
                  <div key={item.job_id} className="notification-item">
                    <div className="notification-header">
                      <strong>{item.job_id}</strong>
                      <button
                        className="notification-clear"
                        onClick={handleClearNotification}
                        aria-label="Clear notification"
                      >
                        ×
                      </button>
                    </div>
                    <div className="notification-meta">
                      {formatStatusText(item.status)}
                      {item.progress !== null && item.progress !== undefined
                        ? ` • ${item.progress}%`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
        <main className="projects-main">
          <h2>Projects</h2>
          <LoadingScreenContainer loading={loading} statusText="Loading" />
          <ErrorBanner message={error} />
          {!loading && (
            <div className="projects-grid">
              <div className="projects-column">
                <div className="projects-column-header">
                  <h3>Uncompleted Jobs</h3>
                </div>
                {uncompletedJobs.length === 0 ? (
                  <div className="card">No uncompleted jobs.</div>
                ) : (
                  <JobsGrid
                    jobs={uncompletedJobs}
                    onOpenEditor={handleOpenEditor}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                )}
              </div>
              <div className="projects-column">
                <div className="projects-column-header">
                  <h3>Completed Jobs</h3>
                  {completedJobs.length > 0 && (
                    <button
                      className="button secondary"
                      onClick={handleDeleteAllCompleted}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Delete All"}
                    </button>
                  )}
                </div>
                {completedJobs.length === 0 ? (
                  <div className="card">No completed jobs.</div>
                ) : (
                  <JobsGrid
                    jobs={completedJobs}
                    onOpenEditor={handleOpenEditor}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default JobsPage;

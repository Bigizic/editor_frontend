import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  loadUserJobs,
  removeJob,
  setJobNotifications,
  setJobStatusBulk
} from "../redux/actions/jobActions.js";
import { submitJob } from "../redux/actions/dubbingActions.js";
import JobsGrid from "../components/JobsGrid.jsx";
import Loading from "../components/Loading.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import DubbingForm from "../components/DubbingForm.jsx";
import { useSocket } from "../Socket/index.jsx";
import { fetchJobStatus } from "../api/jobsApi.js";

const DEFAULT_USER_ID = "111";
const ACTIVE_JOB_STORAGE_KEY = `dubbing_active_job_${DEFAULT_USER_ID}`;

const JobsPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, jobs, deleting, notifications } = useSelector(
    (state) => state.jobs
  );
  const dubbingState = useSelector((state) => state.dubbing);
  const { socket, isConnected, subscribeToJobs } = useSocket() || {};

  // On mount: hydrate from stored job id
  useEffect(() => {
    const storedJobId = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (!storedJobId) return;

    const hydrate = async () => {
      try {
        const statusData = await fetchJobStatus(storedJobId);
        const status = (statusData.status || "queued").toLowerCase();
        const progress = statusData.progress_percentage || 0;

        dispatch(
          setJobNotifications([
            { job_id: storedJobId, status, progress },
          ])
        );

        if (["done", "completed", "failed", "cancelled"].includes(status)) {
          localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
        } else {
          localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, storedJobId);
        }
      } catch (err) {
        dispatch(
          setJobNotifications([
            { job_id: storedJobId, status: "queued", progress: 0 },
          ])
        );
      }
    };

    hydrate();
  }, [dispatch]);

  useEffect(() => {
    dispatch(loadUserJobs(DEFAULT_USER_ID));
  }, [dispatch]);

  const activeJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const status = job.status || job.job_status;
        return !["done", "completed", "failed", "cancelled"].includes(status);
      }),
    [jobs]
  );

  // initialize notifications for active job when jobs load
  useEffect(() => {
    const storedJobId = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (!storedJobId) {
      return;
    }

    const matchedJob = activeJobs.find(
      (job) => (job.job_id || job.id) === storedJobId
    );
    const status = (matchedJob?.status || matchedJob?.job_status || "queued").toLowerCase();
    const progress = matchedJob?.progress_percentage || 0;

    dispatch(setJobNotifications([
      {
        job_id: storedJobId,
        status,
        progress,
      },
    ]));
  }, [activeJobs, dispatch]);

  useEffect(() => {
    if (dubbingState.lastSubmission?.job_id) {
      const newJobId = dubbingState.lastSubmission.job_id;

      // add initial notification for the new job
      const newNotification = {
        job_id: newJobId,
        status: "queued",
        progress: 0,
      };

      dispatch(setJobNotifications([newNotification]));
      localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, newJobId);

      // optional: subscribe to the newly submitted job immediately
      if (isConnected && subscribeToJobs) {
        console.log("Subscribing to new job:", newJobId);
        subscribeToJobs([newJobId]);
      }

      // reload jobs to get the new one in the list
      dispatch(loadUserJobs(DEFAULT_USER_ID));
    }
  }, [dispatch, dubbingState.lastSubmission, isConnected, subscribeToJobs]);

  // load active job from localStorage on mount
  useEffect(() => {
    try {
      const storedJobId = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
      if (storedJobId) {
        dispatch(setJobNotifications([
          {
            job_id: storedJobId,
            status: "queued",
            progress: 0,
          },
        ]));
      }
    } catch (error) {
      console.error("Failed to load notifications from localStorage:", error);
    }
  }, [dispatch]);

  // clear active job storage when job completes/fails/cancels
  useEffect(() => {
    if (notifications.length === 0) {
      localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      return;
    }

    const active = notifications.find((n) => n?.job_id);
    if (!active) {
      localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      return;
    }

    const status = (active.status || "").toLowerCase();
    if (["done", "completed", "failed", "cancelled"].includes(status)) {
      localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      dispatch(setJobNotifications([]));
    } else {
      localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, active.job_id);
    }
  }, [dispatch, notifications]);

  // socket.IO listener registration (connection handled by SocketProvider)
  useEffect(() => {
    let isMounted = true;

    if (!socket || !isConnected) {
      return () => {
        isMounted = false;
      };
    }

    // re-subscribe stored job on connect/reconnect
    const storedJobId = localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (storedJobId && subscribeToJobs) {
      subscribeToJobs([storedJobId]);
    }

    const handleJobStatusUpdate = (data) => {
      if (!isMounted) return;

      const { job_id, status, progress_percentage } = data;

      console.log("🔔 [JobsPage] Received job status update:", data);

      // normalize status to lowercase for consistency
      const normalizedStatus = (status || "").toLowerCase();

      // Map backend field (progress_percentage) to frontend field (progress)
      // Handle null/undefined/0 correctly
      const progress = progress_percentage !== null && progress_percentage !== undefined
        ? progress_percentage
        : 0;

      const notificationItem = {
        job_id,
        status: normalizedStatus,
        progress: progress
      };

      console.log("📤 [JobsPage] Dispatching notification update:", notificationItem);

      // update job status in bulk first (updates jobs list)
      dispatch(setJobStatusBulk([notificationItem]));

      // dispatch update to notifications - reducer will handle merging and filtering completed jobs
      dispatch(setJobNotifications([notificationItem]));

      // persist latest active job status or clear if done
      if (["done", "completed", "failed", "cancelled"].includes(normalizedStatus)) {
        localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      } else {
        localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, job_id);
      }

      console.log("✅ [JobsPage] Notification update dispatched");
    };

    socket.on("job_status_update", handleJobStatusUpdate);

    // cleanup on unmount
    return () => {
      isMounted = false;
      console.log("🧹 [JobsPage] Cleaning up socket listener");
      socket.off("job_status_update", handleJobStatusUpdate);
    };
  }, [dispatch, socket, isConnected]);


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
      // Delete all completed jobs sequentially
      for (const job of completedJobs) {
        const jobId = job.job_id || job.id;
        if (jobId) {
          await dispatch(removeJob(jobId, DEFAULT_USER_ID));
        }
      }
    }
  };

  const handleClearNotification = () => {
    localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
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

  // helper function to format status text
  const formatStatusText = (status) => {
    if (!status) return "Unknown";
    // convert underscores to spaces and capitalize each word
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
          {loading && <Loading message="Loading jobs..." />}
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

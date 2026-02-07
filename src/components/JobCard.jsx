import React from "react";
import { downloadJobVideoUrl } from "../api/jobsApi.js";

const JobCard = ({ job, onOpenEditor, onDelete, deleting }) => {
  const videoUrl = downloadJobVideoUrl(job.job_id);

  const formatStatusText = (status) => {
    if (!status) return "Unknown";
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const status = (job.status || "").toLowerCase();
  const isCompleted = ["done", "completed"].includes(status);
  const isFailed = ["failed", "cancelled"].includes(status);
  const showProgress = !isCompleted && !isFailed;
  const progress = job.progress_percentage || 0;

  return (
    <div className="card job-card">
      <video src={videoUrl} controls preload="metadata" />
      <div className="job-meta">
        <div className="job-meta-row">
          <strong>File:</strong> <span className="job-file-name">{job.file_name || "Unknown"}</span>
        </div>
        <div className="job-meta-row">
          <strong>Status:</strong> {formatStatusText(job.status)}
        </div>
        <div className="job-meta-row">
          <strong>Languages:</strong> {job.source_language || "?"} →{" "}
          {job.target_language || "?"}
        </div>

        {showProgress && (
          <div className="job-progress-container">
            <div className="progress-bar">
              <div
                className="progress-bar__fill"
                style={{
                  width: `${progress}%`,
                  animation: progress > 0 ? 'none' : undefined
                }}
              />
            </div>
            <span className="progress-label">{progress}%</span>
          </div>
        )}
      </div>
      <div className="job-actions">
        <button className="button primary" onClick={() => onOpenEditor(job)}>
          Open Editor
        </button>
        <a className="button secondary" href={videoUrl} target="_blank" rel="noreferrer">
          Download
        </a>
        <button
          className="button secondary"
          onClick={() => onDelete(job.job_id)}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
};

export default JobCard;

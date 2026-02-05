import React from "react";
import JobCard from "./JobCard.jsx";

const JobsGrid = ({ jobs, onOpenEditor, onDelete, deleting }) => {
  if (!jobs.length) {
    return <div className="card">No dubbed jobs yet.</div>;
  }

  return (
    <div className="job-grid">
      {jobs.map((job) => (
        <JobCard
          key={job.job_id}
          job={job}
          onOpenEditor={onOpenEditor}
          onDelete={onDelete}
          deleting={deleting}
        />
      ))}
    </div>
  );
};

export default JobsGrid;

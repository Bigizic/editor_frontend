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

const initialState = {
  loading: false,
  error: null,
  jobs: [],
  userId: null,
  deleting: false,
  notifications: []
};

export const jobsReducer = (state = initialState, action) => {
  switch (action.type) {
    case JOBS_FETCH_REQUEST:
      return { ...state, loading: true, error: null };
    case JOBS_FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        jobs: action.payload.jobs || [],
        userId: action.payload.user_id
      };
    case JOBS_FETCH_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case JOB_DELETE_REQUEST:
      return { ...state, deleting: true, error: null };
    case JOB_DELETE_SUCCESS:
      const deletedJobId = action.payload;
      return {
        ...state,
        deleting: false,
        jobs: state.jobs.filter((job) => job.job_id !== deletedJobId),
        notifications: state.notifications.filter((notif) => notif.job_id !== deletedJobId)
      };
    case JOB_DELETE_FAILURE:
      return { ...state, deleting: false, error: action.payload };
    case JOB_NOTIFICATIONS_UPDATE: {
      // merge new notifications with existing ones
      const newNotifications = Array.isArray(action.payload) ? action.payload : [action.payload];
      const existingMap = new Map(state.notifications.map(n => [n.job_id, n]));

      console.log("🔄 [Reducer] JOB_NOTIFICATIONS_UPDATE - Current notifications:", state.notifications.length);
      console.log("🔄 [Reducer] New notifications to merge:", newNotifications);

      // update or add new notifications, but filter out completed/done/failed/cancelled
      newNotifications.forEach(item => {
        if (item && item.job_id) {
          const status = (item.status || "").toLowerCase();
          // if status is completed/done/failed/cancelled, remove it instead of adding
          if (["done", "completed", "failed", "cancelled"].includes(status)) {
            console.log(`🗑️ [Reducer] Removing completed job notification: ${item.job_id}`);
            existingMap.delete(item.job_id);
          } else {
            // Always use the new progress value if provided, otherwise preserve existing
            const progress = item.progress !== null && item.progress !== undefined
              ? item.progress
              : (existingMap.get(item.job_id)?.progress ?? 0);

            const updatedNotification = {
              job_id: item.job_id,
              status: status,
              progress: progress
            };

            console.log(`✅ [Reducer] Updating notification for job ${item.job_id}:`, updatedNotification);
            existingMap.set(item.job_id, updatedNotification);
          }
        }
      });

      const updatedNotifications = Array.from(existingMap.values());
      console.log("📊 [Reducer] Final notifications count:", updatedNotifications.length);

      // Always return new state object to ensure React re-renders
      return { ...state, notifications: updatedNotifications };
    }
    case JOB_STATUS_BULK_UPDATE: {
      const statusMap = new Map(
        (action.payload || []).map((item) => [item.job_id, item])
      );
      return {
        ...state,
        jobs: state.jobs.map((job) => {
          const status = statusMap.get(job.job_id);
          if (!status) {
            return job;
          }
          return {
            ...job,
            status: status.status || job.status,
            progress_percentage: status.progress !== undefined ? status.progress : job.progress_percentage
          };
        })
      };
    }
    default:
      return state;
  }
};

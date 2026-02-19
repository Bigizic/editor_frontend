import {
  EDITOR_NOTIFICATION_UPDATE,
  EDITOR_NOTIFICATION_RESET,
  EDITOR_NOTIFICATIONS_SET,
  EDITOR_NOTIFICATION_SOCKET_UPDATE,
  EDITOR_NOTIFICATION_MARK_READ,
} from "../constants/editorNotificationConstants";

import {
  fetchEditorNotificationsApi,
  markEditorNotificationReadApi,
} from "../../api/editorApi";

// --- legacy actions (keep for LoadingScreenContainer) ----------------------
export const updateEditorNotification = (statusText, progress, jobId) => ({
  type: EDITOR_NOTIFICATION_UPDATE,
  payload: { statusText, progress, jobId },
});

export const resetEditorNotification = () => ({
  type: EDITOR_NOTIFICATION_RESET,
});

// --- notification centre actions -------------------------------------------

/** Push an incoming socket event into the store (upsert by job_id) */
export const socketNotificationUpdate = (notificationData) => ({
  type: EDITOR_NOTIFICATION_SOCKET_UPDATE,
  payload: notificationData,
});

/** Fetch persisted notifications from backend */
export const fetchEditorNotifications = (jobId, userId) => async (dispatch) => {
  try {
    const data = await fetchEditorNotificationsApi(jobId, userId);
    dispatch({
      type: EDITOR_NOTIFICATIONS_SET,
      payload: { notifications: data.notifications },
    });
  } catch (err) {
    console.error("Failed to fetch editor notifications:", err);
  }
};

/** Mark a notification as read/deleted */
export const markNotificationRead = (notificationId, readStatus = "read") => async (dispatch) => {
  try {
    await markEditorNotificationReadApi(notificationId, readStatus);
    dispatch({
      type: EDITOR_NOTIFICATION_MARK_READ,
      payload: { notificationId, readStatus },
    });
  } catch (err) {
    console.error("Failed to mark notification as read:", err);
  }
};

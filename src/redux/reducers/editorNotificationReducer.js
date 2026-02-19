import {
  EDITOR_NOTIFICATION_UPDATE,
  EDITOR_NOTIFICATION_RESET,
  EDITOR_NOTIFICATIONS_SET,
  EDITOR_NOTIFICATION_SOCKET_UPDATE,
  EDITOR_NOTIFICATION_MARK_READ,
} from "../constants/editorNotificationConstants";

const initialState = {
  // notification centre list
  notifications: [],
  unreadCount: 0,
  loading: false,

  // legacy fields (LoadingScreenContainer still reads these)
  statusText: null,
  progress: null,
  jobId: null,
  isActive: false,
};

const editorNotificationReducer = (state = initialState, action) => {
  switch (action.type) {
    // ---- legacy -----------------------------------------------------------
    case EDITOR_NOTIFICATION_UPDATE:
      return {
        ...state,
        statusText: action.payload.statusText,
        progress: action.payload.progress,
        jobId: action.payload.jobId,
        isActive: true,
      };
    case EDITOR_NOTIFICATION_RESET:
      return { ...state, statusText: null, progress: null, jobId: null, isActive: false };

    // ---- notification centre ---------------------------------------------
    case EDITOR_NOTIFICATIONS_SET: {
      const list = action.payload.notifications || [];
      return {
        ...state,
        notifications: list,
        unreadCount: list.filter((n) => n.read_status === "unread").length,
        loading: false,
      };
    }

    case EDITOR_NOTIFICATION_SOCKET_UPDATE: {
      // upsert by notification id (not job_id) so each action gets its own entry
      const incoming = action.payload;
      const notifId = incoming.id || incoming.notification_id;
      const idx = notifId
        ? state.notifications.findIndex((n) => n.id === notifId)
        : -1;
      let updated;
      if (idx >= 0) {
        updated = [...state.notifications];
        // Preserve the original action_name from the first status we saw
        updated[idx] = {
          ...updated[idx],
          ...incoming,
          action_name: updated[idx].action_name || incoming.action_name,
          read_status: "unread",
        };
      } else {
        updated = [incoming, ...state.notifications];
      }
      return {
        ...state,
        notifications: updated,
        unreadCount: updated.filter((n) => n.read_status === "unread").length,
      };
    }

    case EDITOR_NOTIFICATION_MARK_READ: {
      const notifId = action.payload.notificationId;
      const readStatus = action.payload.readStatus || "read";
      const next = state.notifications.map((n) =>
        n.id === notifId ? { ...n, read_status: readStatus } : n
      );
      return {
        ...state,
        notifications: next,
        unreadCount: next.filter((n) => n.read_status === "unread").length,
      };
    }

    default:
      return state;
  }
};

export { editorNotificationReducer };
export default editorNotificationReducer;

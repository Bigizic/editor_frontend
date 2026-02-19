import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiBell } from "react-icons/fi";
import { useSocket } from "../Socket/index.jsx";
import {
  fetchEditorNotifications,
  markNotificationRead,
  socketNotificationUpdate,
  updateEditorNotification,
  resetEditorNotification,
} from "../redux/actions/editorNotificationActions.js";
import { STATUS_LABELS, ACTION_NAMES } from "../utils/statusLabels.js";
import { EDITOR_IDLE } from "../redux/constants/editorConstants.js";
import "../styles/EditorNotifications.css";

/**
 * EditorNotifications – bell icon + dropdown notification centre.
 *
 * Props:
 *   jobId    – current job ID in the editor
 *   userId   – current user ID (usually DEFAULT_USER_ID)
 *   onReload – optional callback invoked when the page should reload after completion
 */
const EditorNotifications = ({ jobId, userId, onReload }) => {
  const dispatch = useDispatch();
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);

  const { notifications, unreadCount } = useSelector(
    (state) => state.editorNotification
  );

  // Fetch persisted notifications on mount
  useEffect(() => {
    if (jobId && userId) {
      dispatch(fetchEditorNotifications(jobId, userId));
    }
  }, [jobId, userId, dispatch]);

  // Socket listener – replaces the one formerly in EditorPage
  useEffect(() => {
    if (!socket || !jobId) return;

    const handler = (data) => {
      if (data?.job_id !== jobId) return;

      const status = (data.status || "").toLowerCase();
      const progress = data.progress_percentage ?? null;
      const label = STATUS_LABELS[status] || status.replace(/_/g, " ");
      const actionName = ACTION_NAMES[status] || status.replace(/_/g, " ");

      // Feed the notification centre store
      dispatch(
        socketNotificationUpdate({
          id: data.notification_id || data.job_id,
          job_id: data.job_id,
          user_id: userId,
          status,
          status_label: label,
          action_name: actionName,
          progress_percentage: progress,
          read_status: "unread",
          error_message: data.error_message || null,
          created_at: data.notification_created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );

      // Also drive legacy LoadingScreenContainer (in case still mounted)
      dispatch(updateEditorNotification(status, progress, data.job_id));

      // Terminal states — clear the global isEditing lock
      if (["done", "completed"].includes(status)) {
        dispatch({ type: EDITOR_IDLE });
        setTimeout(() => {
          dispatch(resetEditorNotification());
          if (onReload) onReload();
          else window.location.reload();
        }, 1500);
      } else if (["failed", "cancelled"].includes(status)) {
        dispatch({ type: EDITOR_IDLE });
        setTimeout(() => dispatch(resetEditorNotification()), 1500);
      }
    };

    socket.on("job_status_update", handler);
    return () => socket.off("job_status_update", handler);
  }, [socket, jobId, userId, dispatch, onReload]);

  // Mark as read on click
  const handleItemClick = (notif) => {
    if (notif.read_status === "unread" && notif.id) {
      dispatch(markNotificationRead(notif.id));
    }
  };

  // -- helpers ----------------------------------------------------------------

  /** "2m ago" style label */
  const timeAgo = (isoStr) => {
    if (!isoStr) return "";
    const diff = Math.max(0, (Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  /** Compute human-readable duration between two ISO strings */
  const formatDuration = (startIso, endIso) => {
    if (!startIso || !endIso) return null;
    const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
    if (ms < 0) return null;
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  };

  const statusClass = (status) => {
    if (["done", "completed"].includes(status)) return "completed";
    if (["failed", "cancelled"].includes(status)) return "failed";
    return "";
  };

  const isTerminal = (status) =>
    ["done", "completed", "failed", "cancelled"].includes(status);

  // Visible notifications (hide deleted)
  const visible = useMemo(
    () => notifications.filter((n) => n.read_status !== "deleted"),
    [notifications]
  );

  // Bell rings continuously while there are unread notifications
  const shaking = unreadCount > 0;

  return (
    <div className="editor-notif-wrapper">
      <button
        ref={bellRef}
        className={`editor-notif-bell${shaking ? " shake" : ""}`}
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label="Notifications"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="editor-notif-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          {/* invisible backdrop to close on outside click */}
          <div
            className="editor-notif-backdrop"
            onClick={() => setOpen(false)}
          />

          <div className="editor-notif-dropdown">
            <div className="editor-notif-header">
              <span>Notifications</span>
              {visible.length > 0 && (
                <span className="editor-notif-header-count">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {visible.length === 0 && (
              <div className="editor-notif-empty">No notifications yet</div>
            )}

            {visible.map((notif) => {
              // Use the preserved action name from the first event (not the terminal one)
              const actionTitle =
                notif.action_name ||
                ACTION_NAMES[notif.status] ||
                notif.status_label ||
                notif.status;
              const terminal = isTerminal(notif.status);
              const isFailed = ["failed", "cancelled"].includes(notif.status);
              const duration = terminal
                ? formatDuration(notif.created_at, notif.updated_at)
                : null;

              // Concise status text
              const statusText = terminal
                ? (isFailed ? (notif.status === "cancelled" ? "Cancelled" : "Failed") : "Done")
                : (notif.status_label || STATUS_LABELS[notif.status] || notif.status);

              return (
                <div
                  key={notif.id || notif.job_id}
                  className={`editor-notif-item ${notif.read_status}`}
                  onClick={() => handleItemClick(notif)}
                >
                  {/* Header: action name + time ago */}
                  <div className="editor-notif-item-top">
                    <span className="editor-notif-action-name">{actionTitle}</span>
                    <span className="editor-notif-time">
                      {timeAgo(notif.updated_at)}
                    </span>
                  </div>

                  {/* Status indicator */}
                  <div className="editor-notif-status-row">
                    <span
                      className={`editor-notif-dot ${statusClass(notif.status)}`}
                    />
                    <span
                      className={`editor-notif-status ${statusClass(notif.status)}`}
                    >
                      {statusText}
                    </span>
                    {duration && (
                      <span className="editor-notif-duration"> · {duration}</span>
                    )}
                  </div>

                  {/* Timestamps — compact single line */}
                  {notif.created_at && (
                    <div className="editor-notif-timestamps">
                      <span>{new Date(notif.created_at).toLocaleTimeString()}</span>
                      {terminal && notif.updated_at && (
                        <span> → {new Date(notif.updated_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  )}

                  {notif.error_message && (
                    <span className="editor-notif-error">
                      {notif.error_message}
                    </span>
                  )}

                  {notif.progress_percentage != null &&
                    notif.progress_percentage < 100 &&
                    !["failed", "cancelled"].includes(notif.status) && (
                      <div className="editor-notif-progress-row">
                        <div className="editor-notif-progress">
                          <div
                            className="editor-notif-progress-fill"
                            style={{ width: `${notif.progress_percentage}%` }}
                          />
                        </div>
                        <span className="editor-notif-progress-label">
                          {notif.progress_percentage}%
                        </span>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default EditorNotifications;

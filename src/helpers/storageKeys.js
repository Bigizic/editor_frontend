/**
 * LocalStorage keys for job tracking.
 * Use these to persist active jobs across reloads.
 */

export const DEFAULT_USER_ID = "111";

/** Jobs list page: tracks the last active dubbing job (for notifications) */
export const getActiveJobStorageKey = (userId) =>
  `dubbing_active_job_${userId || DEFAULT_USER_ID}`;

/** Editor page: tracks the job currently being edited (for subscriptions + reload) */
export const getActiveEditorJobStorageKey = (userId) =>
  `dubbing_active_editor_job_${userId || DEFAULT_USER_ID}`;

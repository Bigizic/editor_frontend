import {
  EDITOR_LOAD_REQUEST,
  EDITOR_LOAD_SUCCESS,
  EDITOR_LOAD_FAILURE,
  EDITOR_UPDATE_SEGMENT_REQUEST,
  EDITOR_UPDATE_SEGMENT_SUCCESS,
  EDITOR_UPDATE_SEGMENT_FAILURE,
  EDITOR_APPLY_CHANGES_REQUEST,
  EDITOR_APPLY_CHANGES_SUCCESS,
  EDITOR_APPLY_CHANGES_FAILURE,
  EDITOR_CHANGE_LANGUAGE_REQUEST,
  EDITOR_CHANGE_LANGUAGE_SUCCESS,
  EDITOR_CHANGE_LANGUAGE_FAILURE,
  EDITOR_SET_TARGET_LANGUAGE,
  EDITOR_REDUB_REQUEST,
  EDITOR_REDUB_SUCCESS,
  EDITOR_REDUB_FAILURE,
  EDITOR_DELETE_SEGMENT_REQUEST,
  EDITOR_DELETE_SEGMENT_SUCCESS,
  EDITOR_DELETE_SEGMENT_FAILURE,
  EDITOR_BUSY,
  EDITOR_IDLE
} from "../constants/editorConstants.js";

const initialState = {
  loading: false,
  error: null,
  video: null,
  segments: [],
  videoId: null,
  jobId: null,
  updatingById: {},
  applying: false,
  changingLanguage: false,
  redubbing: false,
  targetLanguage: null,
  isEditing: false,
  editingStatusText: null
};

export const editorReducer = (state = initialState, action) => {
  switch (action.type) {
    case EDITOR_LOAD_REQUEST:
      return { ...state, loading: true, error: null };
    case EDITOR_LOAD_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        video: action.payload.video,
        segments: action.payload.segments || [],
        videoId: action.payload.videoId || action.payload.video?.id,
        jobId: action.payload.jobId || action.payload.video?.job_id || null,
        targetLanguage: action.payload.video?.target_language || state.targetLanguage
      };
    case EDITOR_LOAD_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case EDITOR_UPDATE_SEGMENT_REQUEST:
      return {
        ...state,
        error: null,
        updatingById: {
          ...state.updatingById,
          [action.payload]: true
        }
      };
    case EDITOR_UPDATE_SEGMENT_SUCCESS:
      return {
        ...state,
        segments: state.segments.map((segment) =>
          segment.id === action.payload.segmentId
            ? { ...segment, ...action.payload.updates }
            : segment
        ),
        updatingById: {
          ...state.updatingById,
          [action.payload.segmentId]: false
        }
      };
    case EDITOR_UPDATE_SEGMENT_FAILURE:
      return {
        ...state,
        error: action.payload?.error || action.payload,
        updatingById: {
          ...state.updatingById,
          [action.payload?.segmentId]: false
        }
      };
    case EDITOR_APPLY_CHANGES_REQUEST:
      return { ...state, applying: true, error: null };
    case EDITOR_APPLY_CHANGES_SUCCESS:
      return {
        ...state,
        applying: false,
        segments: action.payload?.segments || state.segments
      };
    case EDITOR_APPLY_CHANGES_FAILURE:
      return { ...state, applying: false, error: action.payload };
    case EDITOR_CHANGE_LANGUAGE_REQUEST:
      return { ...state, changingLanguage: true, error: null };
    case EDITOR_CHANGE_LANGUAGE_SUCCESS:
      return {
        ...state,
        changingLanguage: false,
        segments: action.payload?.segments || state.segments,
        targetLanguage: action.payload?.target_language || state.targetLanguage
      };
    case EDITOR_CHANGE_LANGUAGE_FAILURE:
      return { ...state, changingLanguage: false, error: action.payload };
    case EDITOR_SET_TARGET_LANGUAGE:
      return { ...state, targetLanguage: action.payload };
    case EDITOR_REDUB_REQUEST:
      return { ...state, redubbing: true, error: null };
    case EDITOR_REDUB_SUCCESS:
      return { ...state, redubbing: false };
    case EDITOR_REDUB_FAILURE:
      return { ...state, redubbing: false, error: action.payload };
    case EDITOR_DELETE_SEGMENT_REQUEST:
      return { ...state, loading: true };
    case EDITOR_DELETE_SEGMENT_SUCCESS:
      return {
        ...state,
        loading: false,
        segments: state.segments.filter(s => s.id !== action.payload)
      };
    case EDITOR_DELETE_SEGMENT_FAILURE:
      return { ...state, loading: false, error: action.payload };
    case EDITOR_BUSY:
      return { ...state, isEditing: true, editingStatusText: action.payload?.statusText || null };
    case EDITOR_IDLE:
      return { ...state, isEditing: false, editingStatusText: null };
    default:
      return state;
  }
};

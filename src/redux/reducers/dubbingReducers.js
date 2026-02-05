import {
  DUBBING_SUBMIT_REQUEST,
  DUBBING_SUBMIT_SUCCESS,
  DUBBING_SUBMIT_FAILURE
} from "../constants/dubbingConstants.js";

const initialState = {
  submitting: false,
  error: null,
  lastSubmission: null
};

export const dubbingReducer = (state = initialState, action) => {
  switch (action.type) {
    case DUBBING_SUBMIT_REQUEST:
      return { ...state, submitting: true, error: null };
    case DUBBING_SUBMIT_SUCCESS:
      return { ...state, submitting: false, lastSubmission: action.payload };
    case DUBBING_SUBMIT_FAILURE:
      return { ...state, submitting: false, error: action.payload };
    default:
      return state;
  }
};

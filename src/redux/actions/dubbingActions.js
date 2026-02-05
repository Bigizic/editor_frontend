import {
  DUBBING_SUBMIT_REQUEST,
  DUBBING_SUBMIT_SUCCESS,
  DUBBING_SUBMIT_FAILURE
} from "../constants/dubbingConstants.js";
import { submitDubbingJob } from "../../api/dubbingApi.js";

export const submitJob = (payload) => async (dispatch) => {
  dispatch({ type: DUBBING_SUBMIT_REQUEST });
  try {
    const data = await submitDubbingJob(payload);
    dispatch({ type: DUBBING_SUBMIT_SUCCESS, payload: data });
  } catch (error) {
    dispatch({
      type: DUBBING_SUBMIT_FAILURE,
      payload: error?.response?.data?.detail || error.message
    });
  }
};

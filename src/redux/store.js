import { createStore, combineReducers, applyMiddleware } from "redux";
import { jobsReducer } from "./reducers/jobReducers.js";
import { editorReducer } from "./reducers/editorReducers.js";
import { dubbingReducer } from "./reducers/dubbingReducers.js";

const thunkMiddleware = (store) => (next) => (action) =>
  typeof action === "function" ? action(store.dispatch, store.getState) : next(action);

const rootReducer = combineReducers({
  jobs: jobsReducer,
  editor: editorReducer,
  dubbing: dubbingReducer
});

export const store = createStore(rootReducer, applyMiddleware(thunkMiddleware));

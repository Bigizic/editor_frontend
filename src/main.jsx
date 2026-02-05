import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { SocketProvider } from "./Socket/index.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { store } from "./redux/store.js";
import "./styles/app.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <SocketProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </SocketProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);

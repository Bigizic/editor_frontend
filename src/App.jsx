import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import JobsPage from "./pages/JobsPage.jsx";
import EditorPage from "./pages/EditorPage.jsx";

const App = () => {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<JobsPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/editor/:jobId" element={<EditorPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;

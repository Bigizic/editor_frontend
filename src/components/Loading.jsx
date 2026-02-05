import React from "react";

const Loading = ({ message = "Loading..." }) => {
  return <div className="loading">{message}</div>;
};

export default Loading;

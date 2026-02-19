import { useRef, useEffect, useState, useCallback } from 'react';
import { createSocket } from './provider';
import SocketContext from './context';
import useSocket from './useSocket';
import { resubscribeStoredJobs } from '../helpers/jobSubscriptionHelpers';
import { getActiveJobStorageKey, getActiveEditorJobStorageKey } from '../helpers/storageKeys';

const DEFAULT_USER_ID = '111';

const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socketState, setSocketState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const subscribeToJobs = useCallback((jobIds = []) => {
    if (!socketRef.current || !socketRef.current.connected) return;
    socketRef.current.emit(
      "subscribe_jobs",
      { user_id: DEFAULT_USER_ID, job_ids: jobIds },
      (response) => {
        if (response && response.status === "subscribed") {
          console.log("Subscribed to jobs:", response);
        } else {
          console.error("Failed to subscribe:", response);
        }
      }
    );
  }, []);

  useEffect(() => {
    const sock = createSocket(); // autoConnect true by default
    socketRef.current = sock;
    setSocketState(sock);

    const subscribeStored = () => {
      subscribeToJobs([]);
      resubscribeStoredJobs(
        [getActiveJobStorageKey(DEFAULT_USER_ID), getActiveEditorJobStorageKey(DEFAULT_USER_ID)],
        subscribeToJobs
      );
    };

    sock.on("connect", () => {
      console.log("Socket.IO connected:", sock.id);
      setIsConnected(true);
      subscribeStored();
    });

    sock.on("disconnect", (reason) => {
      console.warn("Socket.IO disconnected:", reason);
      setIsConnected(false);
    });

    sock.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
    });

    sock.on("reconnect", (attemptNumber) => {
      console.log("Socket.IO reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
      subscribeStored();
    });

    return () => {
      sock.removeAllListeners();
      sock.disconnect();
      socketRef.current = null;
      setSocketState(null);
      setIsConnected(false);
    };
  }, [subscribeToJobs]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketState,
        isConnected,
        subscribeToJobs,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { SocketProvider, SocketContext, useSocket, createSocket };

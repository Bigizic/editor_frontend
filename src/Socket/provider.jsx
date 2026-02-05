import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import SocketContext from './context.jsx';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_USER_ID = '111';

export const createSocket = () => (
  io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000,
  })
);

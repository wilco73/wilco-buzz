import { useState, useEffect, useRef } from 'react';

/**
 * Hook that computes elapsed time from room timer state,
 * correcting for clock offset between server and client.
 *
 * Returns `elapsed` in ms (always counting UP from 0).
 * For countdown display, the caller does: remaining = duration*1000 - elapsed
 */
export function useTimer(room) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const offsetRef = useRef(0); // serverTime - clientTime

  // Update clock offset on each room update
  useEffect(() => {
    if (room?.serverTime) {
      offsetRef.current = room.serverTime - Date.now();
    }
  }, [room?.serverTime]);

  useEffect(() => {
    clearInterval(timerRef.current);

    if (room?.timerRunning && room?.timerStart) {
      const base = room.timerElapsed || 0;
      timerRef.current = setInterval(() => {
        // Correct Date.now() by adding offset to align with server clock
        const correctedNow = Date.now() + offsetRef.current;
        setElapsed(base + (correctedNow - room.timerStart));
      }, 50);
    } else {
      setElapsed(room?.timerElapsed || 0);
    }

    return () => clearInterval(timerRef.current);
  }, [room?.timerRunning, room?.timerStart, room?.timerElapsed]);

  return elapsed;
}

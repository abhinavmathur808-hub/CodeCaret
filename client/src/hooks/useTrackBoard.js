import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../config";

/* ══════════════════════════════════════════════════════════════
   useTrackBoard — the leaderboard of the track on screen.

   Read in three places — the record module on the dashboard, the
   placement line on the results screen, and the podium in the
   leaderboard modal — and all three must show the same board. So it
   is fetched once, here, rather than by each of them.

   Fetched with the session token when there is one, which is what
   adds the racer's own standing (`you`) to the public board.
   ══════════════════════════════════════════════════════════════ */

/**
 * @param {string|null} trackId  Catalogue id, or null for custom code
 *                               (which has no board).
 * @param {string|null} token    Session token, if signed in.
 */
export default function useTrackBoard(trackId, token) {
  /* Tagged with the track it belongs to, so a response for the
     previous track can never be shown against the next one — the
     same stamping the old record fetch used, for the same reason. */
  const [state, setState] = useState({
    id: null,
    board: null,
    loading: false,
    error: "",
  });
  const controllerRef = useRef(null);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    if (!trackId) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    setState((prev) => ({
      id: trackId,
      // Keep the board on screen while refreshing the SAME track.
      board: prev.id === trackId ? prev.board : null,
      loading: true,
      error: "",
    }));

    try {
      const res = await fetch(
        `${API_URL}/api/snippets/${encodeURIComponent(trackId)}/leaderboard`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (controller.signal.aborted) return;
      if (!res.ok) throw new Error(data.error || "Could not load this track's leaderboard");
      setState({ id: trackId, board: data, loading: false, error: "" });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState((prev) => ({
        ...prev,
        id: trackId,
        loading: false,
        error:
          err.name === "TypeError"
            ? "Network error — is the server running?"
            : err.message,
      }));
    }
  }, [trackId, token]);

  /* Re-read when the track changes, and when the session does: the
     board itself is public, but `you` depends on who is asking. */
  useEffect(() => {
    refresh();
    return () => controllerRef.current?.abort();
  }, [refresh]);

  /**
   * Adopt a board the server just returned with a race result, so the
   * results screen and the modal reflect the lap without waiting on a
   * second request.
   */
  const adopt = useCallback((id, board) => {
    if (!id || !board) return;
    controllerRef.current?.abort();
    setState({ id, board, loading: false, error: "" });
  }, []);

  const current = state.id === trackId;
  return {
    board: current ? state.board : null,
    loading: current ? state.loading : Boolean(trackId),
    error: current ? state.error : "",
    refresh,
    adopt,
  };
}

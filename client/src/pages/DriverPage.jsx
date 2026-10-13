import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { API_URL } from "../config";
import DriverView from "../components/driver/DriverView";
import "../components/driver/Driver.css";

/* /driver/:username — any driver's public page, reached from the
   standings, the podiums and the track boards. */
export default function DriverPage() {
  const { username } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ key: null, driver: null, error: "" });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API_URL}/api/users/${encodeURIComponent(username)}/public`, { signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) throw new Error(`There's no driver called ${username}.`);
        if (!res.ok) throw new Error(data.error || "Couldn't load this driver.");
        setState({ key: username, driver: data, error: "" });
      })
      .catch((err) => {
        if (err.name !== "AbortError") setState({ key: username, driver: null, error: err.message });
      });
    return () => ctrl.abort();
  }, [username]);

  const loading = state.key !== username;
  const isYou = Boolean(user && state.driver && user.username.toLowerCase() === state.driver.username.toLowerCase());

  return (
    <div className="drv-page">
      {loading ? (
        <p className="std-empty" aria-busy="true">Loading driver…</p>
      ) : state.error ? (
        <div className="std-empty">
          <p role="alert">{state.error}</p>
          <Link to="/standings" className="drv-btn">
            Back to the standings
          </Link>
        </div>
      ) : (
        <DriverView
          driver={state.driver}
          isYou={isYou}
          actions={
            isYou ? (
              <Link to="/profile" className="drv-btn">
                Your profile
              </Link>
            ) : (
              <Link to="/standings" className="drv-btn">
                Standings
              </Link>
            )
          }
        />
      )}
    </div>
  );
}

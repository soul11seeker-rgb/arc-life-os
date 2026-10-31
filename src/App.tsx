import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  ChartNoAxesCombined,
  Stethoscope,
  CalendarRange,
  Settings2,
  Smartphone,
  WifiOff,
  Check,
  X,
  Menu,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Dumbbell,
  Utensils,
} from "lucide-react";
import type { Day, State } from "./domain/model";
import { today } from "./domain/model";
import { generateDay, saveDay } from "./domain/attendance";
import { readState, writeState } from "./storage/db";
import { DayView } from "./components/DayView";
import { AttendanceView, CalendarView } from "./components/AttendanceView";
import { ClinicalView, TimetableView } from "./components/Manage";
import { SettingsView } from "./components/SettingsView";
import { Dialog, Logo } from "./components/ui";
import { TrainingView } from "./components/TrainingView";
import { FuelView } from "./components/FuelView";
import { PowerDraftScope } from "./components/PowerShared";
const nav = [
  { name: "Today", icon: LayoutDashboard },
  { name: "Calendar", icon: CalendarDays },
  { name: "Attendance", icon: ChartNoAxesCombined },
  { name: "Clinical", icon: Stethoscope },
  { name: "Timetable", icon: CalendarRange },
  { name: "Training", icon: Dumbbell },
  { name: "Fuel", icon: Utensils },
  { name: "Settings", icon: Settings2 },
];
export default function App() {
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState("");
  const [day, setDay] = useState<Day | null>(null);
  const [date, setDate] = useState(today());
  const [view, setView] = useState("Today");
  const [dirty, setDirty] = useState(false);
  const [powerDirty, setPowerDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [toast, setToast] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [install, setInstall] = useState(false);
  const [menu, setMenu] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [ready, setReady] = useState(false);
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  const [swError, setSwError] = useState(false);
  useEffect(() => {
    readState()
      .then((s) => {
        setState(s);
        setDay(s.days[date] ?? generateDay(s, date));
      })
      .catch((e) =>
        setLoadError(
          e instanceof Error ? e.message : "Could not open local storage.",
        ),
      );
  }, []); // Initial device state is read once.
  useEffect(() => {
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty || powerDirty || saving.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty, powerDirty]);
  useEffect(() => {
    if (!toast || toast.error) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`, {
          scope: import.meta.env.BASE_URL,
        })
        .then((reg) => {
          if (reg.waiting) setUpdate(reg.waiting);
          const observeInstall = () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setUpdate(worker);
              if (
                worker.state === "redundant" &&
                !navigator.serviceWorker.controller
              )
                setSwError(true);
            });
          };
          observeInstall();
          reg.addEventListener("updatefound", observeInstall);
          return navigator.serviceWorker.ready;
        })
        .then(() => setReady(true))
        .catch(() => setSwError(true));
    }
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, []);
  const commit = async (next: State, message = "Changes saved") => {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    try {
      await writeState(next, state ?? undefined);
      setState(next);
      setDay(next.days[date] ?? generateDay(next, date));
      setDirty(false);
      setToast({ message, error: false });
      return true;
    } catch (e) {
      setToast({
        message: `Could not save. ${e instanceof Error ? e.message : "Please try again."} Your changes are still on screen.`,
        error: true,
      });
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const discard = () => {
    if (saving.current) return false;
    if (
      (dirty || powerDirty) &&
      !confirm("You have unsaved changes. Discard them and continue?")
    )
      return false;
    return true;
  };
  const navigate = (next: string) => {
    if (!state || !discard()) return;
    setView(next);
    setDay(state.days[date] ?? generateDay(state, date));
    setDirty(false);
    setMenu(false);
    window.scrollTo({ top: 0 });
  };
  const changeDate = (next: string) => {
    if (!state || !discard()) return;
    setDate(next);
    setDay(state.days[next] ?? generateDay(state, next));
    setDirty(false);
    setView("Today");
    setMenu(false);
    window.scrollTo({ top: 0 });
  };
  if (loadError)
    return (
      <div className="fatal">
        <Logo />
        <h1>Your records have not been reset.</h1>
        <p>
          ARC could not safely open local data. Close other ARC tabs and reload.
          If this continues, keep your browser data intact and restore a known
          backup in a separate browser.
        </p>
        <pre>{loadError}</pre>
        <button className="button primary" onClick={() => location.reload()}>
          Reload ARC
        </button>
      </div>
    );
  if (!state || !day)
    return (
      <div className="loading">
        <Logo />
        <p>Opening your story…</p>
      </div>
    );
  const year = state.years.find((y) => y.id === state.currentYearId)!;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <span>EVERY DAY WRITES YOUR STORY</span>
        </div>
        <div className="workspace-label">YOUR COMMAND CENTER</div>
        <nav aria-label="Main navigation">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={view === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {view === name && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <ShieldCheck size={18} />
            <div>
              <b>Your story stays yours.</b>
              <span>Private. On this device.</span>
            </div>
          </div>
          <button
            className="install-button"
            onClick={() => {
              setInstall(true);
              setMenu(false);
            }}
          >
            <Smartphone size={18} /> Install ARC <span>↗</span>
          </button>
          <div className="sidebar-footer">
            <span>ARC PROTOCOL</span>
            <b>V 1.1</b>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={21} />
            </button>
            <span className="topbar-arc">ARC</span>
            <span className="breadcrumb-slash">/</span>
            <b>
              {view === "Training"
                ? "TRAINING"
                : view === "Fuel"
                  ? "FUEL"
                  : "ACADEMY"}
            </b>
            <span className="desktop-only breadcrumb-detail">/ {view}</span>
          </div>
          <div className="topbar-right">
            <span className={`connection ${offline ? "is-offline" : ""}`}>
              {offline ? <WifiOff size={13} /> : <span className="live-dot" />}
              {offline
                ? "Offline"
                : ready
                  ? "Offline ready"
                  : import.meta.env.DEV
                    ? "Local preview"
                    : swError
                      ? "Offline setup failed"
                      : "Preparing offline…"}
            </span>
            <label className="year-select">
              <select
                aria-label="Active academic year"
                value={state.currentYearId}
                disabled={busy}
                onChange={(e) => {
                  if (discard())
                    void commit(
                      { ...state, currentYearId: e.target.value },
                      "Academic year selected",
                    );
                }}
              >
                {state.years.map((y) => (
                  <option value={y.id} key={y.id}>
                    {y.name}
                    {y.archived ? " (archived)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} />
            </label>
            <div className="avatar">
              A<span />
            </div>
          </div>
        </header>
        <PowerDraftScope onChange={setPowerDirty}>
          <main inert={busy} aria-busy={busy}>
            {update && (
              <div className="update-banner">
                <RefreshCw size={17} />
                <span>
                  An ARC update is ready. Save any changes before updating.
                </span>
                <button
                  className="text-button"
                  onClick={() => {
                    if (!discard()) return;
                    navigator.serviceWorker.addEventListener(
                      "controllerchange",
                      () => location.reload(),
                      { once: true },
                    );
                    update.postMessage({ type: "SKIP_WAITING" });
                  }}
                >
                  Update now
                </button>
              </div>
            )}
            {swError && (
              <div className="info-strip error-text">
                <AlertCircle size={18} />
                <span>
                  Offline files could not be cached. Saving still works on this
                  device. Reload online before relying on airplane mode.
                </span>
              </div>
            )}
            {view === "Today" && (
              <DayView
                state={state}
                day={day}
                onChange={(next) => {
                  if (saving.current) return;
                  setDay(next);
                  setDirty(true);
                }}
                onDate={changeDate}
                onSave={() =>
                  void commit(saveDay(state, day), "Day saved on this device")
                }
                onRefresh={() => {
                  if (
                    confirm(
                      "Rebuild this day from your current timetable? This replaces the displayed sessions and their marks. Activities and notes stay. Press SAVE DAY to apply, or navigate away to discard.",
                    )
                  ) {
                    setDay({
                      ...day,
                      sessions: generateDay(state, date).sessions,
                    });
                    setDirty(true);
                  }
                }}
                dirty={dirty}
                busy={busy}
                onNavigate={navigate}
              />
            )}
            {view === "Calendar" && (
              <CalendarView
                state={state}
                onDate={changeDate}
                initialDate={date}
              />
            )}
            {view === "Attendance" && (
              <AttendanceView state={state} onDate={changeDate} />
            )}
            {view === "Clinical" && (
              <ClinicalView state={state} commit={commit} />
            )}
            {view === "Timetable" && (
              <TimetableView state={state} commit={commit} />
            )}
            {view === "Training" && (
              <TrainingView state={state} commit={commit} />
            )}
            {view === "Fuel" && <FuelView state={state} commit={commit} />}
            {view === "Settings" && (
              <SettingsView
                state={state}
                commit={commit}
                onInstall={() => setInstall(true)}
              />
            )}
            <footer className="main-footer">
              <span>
                ARC <b>//</b> THE ORIGIN BEGINS.
              </span>
              <span>{year.name} · Local-first by design</span>
            </footer>
          </main>
        </PowerDraftScope>
      </div>
      <nav className="bottom-nav" aria-label="Quick navigation">
        {nav
          .filter((n) =>
            ["Today", "Calendar", "Attendance", "Clinical"].includes(n.name),
          )
          .map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={view === name ? "active" : ""}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
            </button>
          ))}
        <button
          onClick={() => setMenu(true)}
          className={
            ["Settings", "Timetable", "Training", "Fuel"].includes(view)
              ? "active"
              : ""
          }
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </nav>
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <AlertCircle size={19} /> : <Check size={19} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {install && (
        <Dialog
          title="Your command center, in your pocket"
          onClose={() => setInstall(false)}
        >
          <div className="install-hero">
            <Logo />
            <span>ARC 1.1 · ACADEMY / TRAINING / FUEL</span>
          </div>
          <ol className="install-steps">
            <li>
              Open your published ARC link in <b>Safari</b> on your iPhone.
            </li>
            <li>
              Tap <b>Share</b>, then <b>Add to Home Screen</b>. Keep “Open as
              Web App” enabled if shown.
            </li>
            <li>
              Open ARC from its icon while online. Wait for <b>Offline ready</b>{" "}
              before closing.
            </li>
            <li>
              Try airplane mode: reopen, mark a session, press <b>SAVE DAY</b>,
              and reopen again.
            </li>
          </ol>
          <p className="helper">
            On Android or desktop, use your browser’s Install app option. Keep
            regular JSON backups in Files. No App Store or Apple Developer
            account is needed.
          </p>
          <button className="button primary" onClick={() => setInstall(false)}>
            Got it <Check size={16} />
          </button>
        </Dialog>
      )}
    </div>
  );
}

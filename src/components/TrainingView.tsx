import { useState } from "react";
import {
  Dumbbell,
  Footprints,
  CircleDot,
  Moon,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import type { State } from "../domain/model";
import { today, uid } from "../domain/model";
import {
  activityKinds,
  trainingEntrySchema,
  trainingStats,
} from "../domain/power";
import type { TrainingEntry } from "../domain/power";
import type { Commit } from "./Manage";
import { Dialog, Field, PageIntro, Panel, SectionHead, formatDate } from "./ui";
import {
  DateControl,
  Metric,
  numberValue,
  PowerMark,
  SaveForm,
  textValue,
  usePowerDraftGuard,
  WellnessPanel,
} from "./PowerShared";
const labels = {
  gym: "Gym",
  football: "Football",
  running: "Running",
  rest: "Recovery / rest",
};
const icons = {
  gym: Dumbbell,
  football: CircleDot,
  running: Footprints,
  rest: Moon,
};
export function TrainingView({
  state,
  commit,
}: {
  state: State;
  commit: Commit;
}) {
  const [date, setDate] = useState(today());
  const canDiscard = usePowerDraftGuard();
  const [editor, setEditor] = useState<{
    entry?: TrainingEntry;
    kind: TrainingEntry["kind"];
  } | null>(null);
  const [goals, setGoals] = useState(false);
  const stats = trainingStats(state.training, date);
  const [month, setMonth] = useState(date.slice(0, 7));
  const monthStats = trainingStats(state.training, `${month}-01`);
  const changeDate = (d: string) => {
    if (canDiscard()) {
      setDate(d);
      setMonth(d.slice(0, 7));
    }
  };
  const entries = state.training.entries
    .filter((x) => x.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="power-view training-view">
      <PageIntro
        tag="TRAINING // SHOW UP. BUILD UP."
        title="Power comes from practice"
        description="A little movement. A little recovery. Your own pace."
        action={<DateControl date={date} onDate={changeDate} />}
      />
      <div className="power-hero">
        <div>
          <span className="eyebrow crimson">THIS WEEK · MONDAY–SUNDAY</span>
          <h2>One session is a start.</h2>
          <p>
            Tick it, save it, get on with your day. Details are always optional.
          </p>
        </div>
        <PowerMark type="training" />
      </div>
      <div className="power-metrics">
        <Metric
          label="GYM DAYS"
          value={`${stats.gym} / ${state.training.goals.gymWeekly}`}
          detail="Completed this week"
        />
        <Metric
          label="SPORTS DAYS"
          value={`${stats.sports} / ${state.training.goals.sportsWeekly}`}
          detail="Football or running this week"
        />
        <Metric
          label="ACTIVE DAYS"
          value={monthStats.activeDays || "—"}
          detail={`Recorded in ${month}`}
        />
        <Metric
          label="RECOVERY DAYS"
          value={monthStats.restDays || "—"}
          detail={`Recorded in ${month}`}
        />
      </div>
      <Panel>
        <SectionHead
          eyebrow="QUICK LOG"
          title="What did you do?"
          action={
            <button className="text-button" onClick={() => setGoals(true)}>
              Edit goals
            </button>
          }
        />
        <p className="helper">
          {formatDate(date)} · tap to save a completed session. Add details
          below when you want them.
        </p>
        <div className="quick-activities">
          {activityKinds.map((kind) => {
            const Icon = icons[kind];
            return (
              <div key={kind}>
                <button
                  className="quick-activity"
                  aria-label={`${labels[kind]} Save a quick log`}
                  onClick={() =>
                    void commit(
                      {
                        ...state,
                        training: {
                          ...state.training,
                          entries: [
                            ...state.training.entries,
                            {
                              id: uid(),
                              date,
                              kind,
                              completed: true,
                              note: "",
                              exercises: [],
                            },
                          ],
                        },
                      },
                      `${labels[kind]} saved on this device`,
                    )
                  }
                >
                  <Icon size={24} />
                  <b>{labels[kind]}</b>
                  <span>
                    Save a quick log <Plus size={14} />
                  </span>
                </button>
                <button
                  className="text-button"
                  onClick={() => setEditor({ kind })}
                >
                  Add details
                </button>
              </div>
            );
          })}
        </div>
        <p className="helper">
          Training logs stay separate from Academy’s original daily habit
          checkboxes. Weekly goals count distinct days.
        </p>
      </Panel>
      <div className="power-columns">
        <Panel>
          <SectionHead
            eyebrow="CONSISTENCY OVER INTENSITY"
            title="Activity register"
            action={
              <Field label="Activity month">
                <input
                  type="month"
                  required
                  value={month}
                  onChange={(e) => {
                    if (e.target.value) setMonth(e.target.value);
                  }}
                />
              </Field>
            }
          />
          <div className="month-summary">
            <b>{monthStats.sessions} completed sessions</b>
            <span>
              {monthStats.minutes} recorded minutes ·{" "}
              {monthStats.distanceKm.toFixed(1)} km running
            </span>
          </div>
          <div
            className="activity-bars"
            role="img"
            aria-label={`Monthly completed sessions: ${activityKinds.map((k) => `${labels[k]} ${entries.filter((x) => x.kind === k && x.completed).length}`).join(", ")}`}
          >
            {activityKinds.map((kind) => {
              const count = entries.filter(
                (x) => x.kind === kind && x.completed,
              ).length;
              return (
                <div key={kind}>
                  <span>{labels[kind]}</span>
                  <i
                    style={{
                      width: `${Math.max(1, (count / Math.max(1, ...activityKinds.map((k) => entries.filter((x) => x.kind === k && x.completed).length))) * 100)}%`,
                    }}
                  />
                  <b>{count}</b>
                </div>
              );
            })}
          </div>
          {!entries.length && (
            <p className="power-empty">
              No sessions recorded for this month. Rest and activity are both
              worth recording.
            </p>
          )}
          <div className="power-register">
            {entries.map((entry) => {
              const Icon = icons[entry.kind];
              return (
                <article key={entry.id}>
                  <Icon size={20} />
                  <div className="grow">
                    <h3>
                      {labels[entry.kind]}{" "}
                      <small>
                        {formatDate(entry.date, {
                          day: "numeric",
                          month: "short",
                        })}
                      </small>
                    </h3>
                    <p>
                      {entry.minutes !== undefined
                        ? `${entry.minutes} min · `
                        : ""}
                      {entry.distanceKm !== undefined
                        ? `${entry.distanceKm} km · `
                        : ""}
                      {entry.note || "Quick log"}
                    </p>
                    {entry.exercises.map((x, i) => (
                      <p key={i}>
                        {x.done ? "✓" : "○"} {x.name}
                        {x.sets !== undefined ? ` · ${x.sets} sets` : ""}
                        {x.reps !== undefined ? ` × ${x.reps} reps` : ""}
                        {x.weightKg !== undefined ? ` · ${x.weightKg} kg` : ""}
                      </p>
                    ))}
                    <label className="power-check">
                      <input
                        type="checkbox"
                        aria-label={`Completed ${labels[entry.kind]} ${entry.date}`}
                        checked={entry.completed}
                        onChange={(e) =>
                          void commit(
                            {
                              ...state,
                              training: {
                                ...state.training,
                                entries: state.training.entries.map((x) =>
                                  x.id === entry.id
                                    ? { ...x, completed: e.target.checked }
                                    : x,
                                ),
                              },
                            },
                            "Workout checkbox saved",
                          )
                        }
                      />
                      Completed
                    </label>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${labels[entry.kind]} ${entry.date}`}
                    onClick={() => setEditor({ entry, kind: entry.kind })}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${labels[entry.kind]} ${entry.date}`}
                    onClick={() => {
                      if (confirm("Delete only this Training log?"))
                        void commit(
                          {
                            ...state,
                            training: {
                              ...state.training,
                              entries: state.training.entries.filter(
                                (x) => x.id !== entry.id,
                              ),
                            },
                          },
                          "Training log removed",
                        );
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        </Panel>
        <WellnessPanel state={state} commit={commit} date={date} />
      </div>
      {editor && (
        <TrainingEditor
          state={state}
          commit={commit}
          date={date}
          {...editor}
          onClose={() => setEditor(null)}
        />
      )}
      {goals && (
        <Dialog title="Your weekly goals" onClose={() => setGoals(false)}>
          <SaveForm
            onSave={async (f) => {
              const next = {
                ...state,
                training: {
                  ...state.training,
                  goals: {
                    gymWeekly: Number(f.get("gym")),
                    sportsWeekly: Number(f.get("sports")),
                  },
                },
              };
              const ok = await commit(next, "Training goals saved");
              if (ok) setGoals(false);
              return ok;
            }}
          >
            <p className="helper">
              Editable planning goals. A zero target means no goal for that
              activity.
            </p>
            <Field label="Gym days per week">
              <input
                name="gym"
                type="number"
                min="0"
                max="14"
                required
                defaultValue={state.training.goals.gymWeekly}
              />
            </Field>
            <Field label="Sports days per week">
              <input
                name="sports"
                type="number"
                min="0"
                max="14"
                required
                defaultValue={state.training.goals.sportsWeekly}
              />
            </Field>
          </SaveForm>
        </Dialog>
      )}
    </div>
  );
}
function TrainingEditor({
  state,
  commit,
  date,
  entry,
  kind: initialKind,
  onClose,
}: {
  state: State;
  commit: Commit;
  date: string;
  entry?: TrainingEntry;
  kind: TrainingEntry["kind"];
  onClose: () => void;
}) {
  const [kind, setKind] = useState(initialKind);
  const [exercises, setExercises] = useState(entry?.exercises ?? []);
  const [exerciseError, setExerciseError] = useState("");
  return (
    <Dialog
      title={entry ? "Edit Training log" : "Add Training details"}
      onClose={() => {
        if (confirm("Close this Training draft?")) onClose();
      }}
    >
      <SaveForm
        label="Save Training log"
        onSave={async (f) => {
          const pendingName = textValue(f, "exercise");
          const allExercises = pendingName
            ? [
                ...exercises,
                {
                  name: pendingName,
                  done: true,
                  sets: numberValue(f, "sets"),
                  reps: numberValue(f, "reps"),
                  weightKg: numberValue(f, "kg"),
                },
              ]
            : exercises;
          const record = trainingEntrySchema.parse({
            id: entry?.id ?? uid(),
            date: textValue(f, "date"),
            kind,
            completed: f.has("completed"),
            minutes: numberValue(f, "minutes"),
            distanceKm: numberValue(f, "distance"),
            note: textValue(f, "note"),
            exercises: allExercises,
          });
          const entries = entry
            ? state.training.entries.map((x) =>
                x.id === entry.id ? record : x,
              )
            : [...state.training.entries, record];
          const ok = await commit(
            { ...state, training: { ...state.training, entries } },
            "Training log saved on this device",
          );
          if (ok) onClose();
          return ok;
        }}
      >
        <div className="power-fields">
          <Field label="Session date">
            <input
              name="date"
              type="date"
              required
              max={today()}
              defaultValue={entry?.date ?? date}
            />
          </Field>
          <Field label="Activity type">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              {activityKinds.map((k) => (
                <option value={k} key={k}>
                  {labels[k]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <label className="power-check">
          <input
            name="completed"
            type="checkbox"
            defaultChecked={entry?.completed ?? true}
          />
          Completed session
        </label>
        <div className="power-fields">
          <Field label="Minutes (optional)">
            <input
              name="minutes"
              type="number"
              min="0"
              max="1440"
              step="1"
              defaultValue={entry?.minutes}
            />
          </Field>
          <Field label="Distance (km, optional)">
            <input
              name="distance"
              type="number"
              min="0"
              max="1000"
              step="0.01"
              defaultValue={entry?.distanceKm}
            />
          </Field>
        </div>
        <Field label="Session note (optional)">
          <textarea name="note" maxLength={1000} defaultValue={entry?.note} />
        </Field>
        <details open={exercises.length > 0}>
          <summary>Optional exercises ({exercises.length})</summary>
          <p className="helper">
            Exercise names, sets, reps and weight are optional. Add only what
            helps you.
          </p>
          {exercises.map((x, i) => (
            <div className="exercise-row" key={i}>
              <label className="power-check">
                <input
                  type="checkbox"
                  checked={x.done}
                  onChange={(e) =>
                    setExercises(
                      exercises.map((v, j) =>
                        j === i ? { ...v, done: e.target.checked } : v,
                      ),
                    )
                  }
                />
                {x.name}
              </label>
              <span>
                {x.sets ?? "—"} sets × {x.reps ?? "—"} reps ·{" "}
                {x.weightKg ?? "—"} kg
              </span>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setExercises(exercises.filter((_, j) => j !== i))
                }
              >
                Remove
              </button>
            </div>
          ))}
          <div className="power-fields">
            <Field label="Exercise name">
              <input name="exercise" maxLength={160} />
            </Field>
            <Field label="Sets">
              <input name="sets" type="number" min="1" max="100" />
            </Field>
            <Field label="Repetitions">
              <input name="reps" type="number" min="1" max="1000" />
            </Field>
            <Field label="Exercise weight (kg)">
              <input name="kg" type="number" min="0" max="1000" step="0.1" />
            </Field>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={(e) => {
              const form = e.currentTarget.form!;
              const f = new FormData(form);
              const name = textValue(f, "exercise");
              if (!name) {
                setExerciseError("Enter an exercise name before adding it.");
                return;
              }
              try {
                const exercise =
                  trainingEntrySchema.shape.exercises.element.parse({
                    name,
                    done: true,
                    sets: numberValue(f, "sets"),
                    reps: numberValue(f, "reps"),
                    weightKg: numberValue(f, "kg"),
                  });
                setExercises([...exercises, exercise]);
                setExerciseError("");
                for (const key of ["exercise", "sets", "reps", "kg"])
                  (form.elements.namedItem(key) as HTMLInputElement).value = "";
              } catch {
                setExerciseError("Check sets, repetitions and weight.");
              }
            }}
          >
            Add exercise to session
          </button>
          {exerciseError && (
            <p role="alert" className="error-text">
              {exerciseError}
            </p>
          )}
        </details>
      </SaveForm>
    </Dialog>
  );
}

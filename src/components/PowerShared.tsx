import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import type { State } from "../domain/model";
import { today } from "../domain/model";
import { weeklyWeights, wellnessSchema } from "../domain/power";
import type { Commit } from "./Manage";
import { Field, Panel, SectionHead } from "./ui";
const DraftContext = createContext({
  mark: (_id: string, _dirty: boolean) => {},
  hasDrafts: (): boolean => false,
});
export function usePowerDraftGuard() {
  const context = useContext(DraftContext);
  return () =>
    !context.hasDrafts() ||
    confirm("You have unsaved changes. Discard them and continue?");
}
export function PowerDraftScope({
  children,
  onChange,
}: {
  children: ReactNode;
  onChange: (dirty: boolean) => void;
}) {
  const drafts = useRef(new Set<string>());
  const mark = useRef((id: string, dirty: boolean) => {
    if (dirty) drafts.current.add(id);
    else drafts.current.delete(id);
    onChange(drafts.current.size > 0);
  });
  const context = useRef({
    mark: mark.current,
    hasDrafts: () => drafts.current.size > 0,
  });
  return (
    <DraftContext.Provider value={context.current}>
      {children}
    </DraftContext.Provider>
  );
}
export function PowerMark({ type }: { type: "training" | "fuel" }) {
  return (
    <svg className="power-mark" viewBox="0 0 120 120" aria-hidden="true">
      <path
        d="M60 5 108 32v56l-48 27L12 88V32Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M60 16 98 38v44l-38 22-38-22V38Z"
        fill="currentColor"
        opacity=".08"
      />
      {type === "training" ? (
        <path
          d="m25 50 10-10 45 45-10 10M40 35l10-10 45 45-10 10M45 75l30-30M23 63l14 14M63 23l14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
        />
      ) : (
        <>
          <path d="M67 25 43 61h19l-9 34 28-44H62Z" fill="currentColor" />
          <path d="M28 44v29m65-29v29" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <div className="power-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function SaveForm({
  children,
  onSave,
  label = "Save on this device",
  className = "power-form",
  onDirty,
}: {
  children: ReactNode;
  onSave: (form: FormData) => Promise<boolean>;
  label?: string;
  className?: string;
  onDirty?: () => void;
}) {
  const { mark } = useContext(DraftContext);
  const draftId = useId();
  useEffect(() => () => mark(draftId, false), [mark, draftId]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const form = e.currentTarget;
    setPending(true);
    setError("");
    try {
      if (await onSave(new FormData(form))) mark(draftId, false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save; your draft is still here.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <form
      className={className}
      onSubmit={submit}
      onChange={() => {
        mark(draftId, true);
        onDirty?.();
      }}
    >
      <fieldset disabled={pending}>
        {children}
        <button className="button primary" disabled={pending}>
          {pending ? "Saving…" : label}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </form>
  );
}
export const textValue = (f: FormData, k: string) =>
  String(f.get(k) ?? "").trim();
export const numberValue = (f: FormData, k: string) =>
  textValue(f, k) === "" ? undefined : Number(f.get(k));
export function WeightChart({ state, date }: { state: State; date: string }) {
  const points = weeklyWeights(state.training.wellness, date);
  const values = points.flatMap((x) => (x.value === null ? [] : [x.value]));
  const low = Math.floor(Math.min(...values) - 1),
    high = Math.ceil(Math.max(...values) + 1);
  const y = (value: number) => 105 - ((value - low) / (high - low)) * 80;
  return (
    <div className="weight-chart">
      {values.length ? (
        <>
          <svg
            viewBox="0 0 560 135"
            role="img"
            aria-label="Weekly average body weight for the last eight weeks; gaps mean no records"
          >
            <path d="M35 25H550M35 65H550M35 105H550" stroke="var(--border)" />
            <text x="0" y="27">
              {high} kg
            </text>
            <text x="0" y="108">
              {low} kg
            </text>
            {points.map(
              (p, i) =>
                p.value !== null && (
                  <g key={p.week}>
                    {i > 0 && points[i - 1].value !== null && (
                      <line
                        x1={42 + (i - 1) * 71}
                        x2={42 + i * 71}
                        y1={y(points[i - 1].value!)}
                        y2={y(p.value)}
                        stroke="var(--cyan)"
                        strokeWidth="2"
                      />
                    )}
                    <circle
                      cx={42 + i * 71}
                      cy={y(p.value)}
                      r="4"
                      fill="var(--cyan)"
                    />
                    <title>
                      {p.week}: {p.value.toFixed(1)} kg ({p.count} records)
                    </title>
                  </g>
                ),
            )}
          </svg>
          <div className="weight-labels">
            {points.map((p) => (
              <span key={p.week}>
                {p.week.slice(5)}
                <b>{p.value === null ? "—" : p.value.toFixed(1)}</b>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="power-empty">
          Your weight graph begins with your first entry. No target weight is
          assumed.
        </p>
      )}
      <p className="helper">
        Monday-start weekly averages · kg · missing weeks stay blank.
      </p>
    </div>
  );
}
export function WellnessPanel({
  state,
  commit,
  date,
}: {
  state: State;
  commit: Commit;
  date: string;
}) {
  const current = state.training.wellness.find((x) => x.date === date);
  return (
    <Panel>
      <SectionHead eyebrow="OPTIONAL CHECK-IN" title="Body & recovery" />
      <WeightChart state={state} date={date} />
      <SaveForm
        key={date + JSON.stringify(current)}
        label="Save check-in"
        onSave={async (f) => {
          const record = wellnessSchema.parse({
            date,
            weightKg: numberValue(f, "weight"),
            sleepHours: numberValue(f, "sleep"),
            energy: numberValue(f, "energy"),
            digestion: textValue(f, "digestion") || undefined,
          });
          const ok = await commit(
            {
              ...state,
              training: {
                ...state.training,
                wellness: [
                  ...state.training.wellness.filter((x) => x.date !== date),
                  record,
                ],
              },
            },
            "Check-in saved on this device",
          );
          return ok;
        }}
      >
        <p className="helper">
          For {date}. Leave a field blank to keep it unrecorded. Saving replaces
          this date’s check-in.
        </p>
        <div className="power-fields">
          <Field label="Body weight (kg)">
            <input
              name="weight"
              type="number"
              min="20"
              max="500"
              step="0.1"
              defaultValue={current?.weightKg}
            />
          </Field>
          <Field label="Sleep (hours, optional)">
            <input
              name="sleep"
              type="number"
              min="0"
              max="24"
              step="0.1"
              defaultValue={current?.sleepHours}
            />
          </Field>
          <Field label="Energy (optional)">
            <select name="energy" defaultValue={current?.energy ?? ""}>
              <option value="">Not recorded</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </Field>
          <Field label="Digestion (optional)">
            <select name="digestion" defaultValue={current?.digestion ?? ""}>
              <option value="">Not recorded</option>
              {["comfortable", "mixed", "uncomfortable"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
        </div>
      </SaveForm>
    </Panel>
  );
}
export function DateControl({
  date,
  onDate,
  label = "Activity date",
}: {
  date: string;
  onDate: (d: string) => void;
  label?: string;
}) {
  return (
    <Field label={label}>
      <input
        type="date"
        max={today()}
        required
        value={date}
        onChange={(e) => {
          if (e.target.value) onDate(e.target.value);
        }}
      />
    </Field>
  );
}

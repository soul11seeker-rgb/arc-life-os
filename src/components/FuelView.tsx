import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Ghost,
  Package,
  ShoppingBasket,
  Snowflake,
} from "lucide-react";
import type { State } from "../domain/model";
import { today, uid } from "../domain/model";
import type { Food, Meal } from "../domain/power";
import {
  foodSchema,
  mealSchema,
  mealSlots,
  nutrientKeys,
  weekStart,
} from "../domain/power";
import {
  expiryStatus,
  foods,
  fruitRotation,
  ghostBriefing,
  mealEstimate,
  nutrientLabels,
  nutrientUnits,
  nutritionSummary,
} from "../domain/nutrition";
import nutritionSources from "../../docs/NUTRITION_SOURCES.md?raw";
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
const display = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined ? "—" : n.toFixed(digits);
export function FuelView({ state, commit }: { state: State; commit: Commit }) {
  const [date, setDate] = useState(today());
  const canDiscard = usePowerDraftGuard();
  const [mealEditor, setMealEditor] = useState<{
    entry?: Meal;
    slot: Meal["slot"];
  } | null>(null);
  const [foodEditor, setFoodEditor] = useState<{ food?: Food } | null>(null);
  const [preferences, setPreferences] = useState(false);
  const [pantry, setPantry] = useState<
    State["fuel"]["pantry"][number] | "new" | null
  >(null);
  const [shopping, setShopping] = useState<
    State["fuel"]["shopping"][number] | "new" | null
  >(null);
  const fuel = state.fuel,
    meals = fuel.meals.filter((x) => x.date === date),
    summary = nutritionSummary(meals);
  const briefing = ghostBriefing(fuel, date);
  const update = (next: State["fuel"], message: string) =>
    commit({ ...state, fuel: next }, message);
  const removeMeal = (id: string) => {
    if (confirm("Delete only this meal item?"))
      void update(
        {
          ...fuel,
          meals: fuel.meals.filter((x) => x.id !== id),
          completeDays: fuel.completeDays.filter(
            (d) => d !== fuel.meals.find((m) => m.id === id)?.date,
          ),
        },
        "Meal item removed",
      );
  };
  const rotation = fruitRotation(date);
  const start = weekStart(date);
  const weeklyDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  return (
    <div className="power-view fuel-view">
      <PageIntro
        tag="FUEL // SMALL CHOICES. STEADY ENERGY."
        title="Feed your next chapter"
        description="PG meals, a kettle, a tiny stash. Build from what you have."
        action={
          <DateControl
            date={date}
            onDate={(d) => {
              if (canDiscard()) setDate(d);
            }}
            label="Meal date"
          />
        }
      />
      <div className="power-hero">
        <div>
          <span className="eyebrow crimson">YOUR DAILY FUEL BRIEFING</span>
          <h2>Eat. Log. Learn. Repeat.</h2>
          <p>
            Approximate nutrition, honest unknowns. Everything stays on this
            device.
          </p>
        </div>
        <PowerMark type="fuel" />
      </div>
      <div className="power-metrics">
        <Metric
          label="KNOWN PROTEIN"
          value={
            <>
              {display(summary.protein.value)}
              <em>g</em>
            </>
          }
          detail={`Target ${fuel.preferences.proteinTarget} g · ${summary.protein.known}/${meals.length} items estimated`}
        />
        <Metric
          label="KNOWN ENERGY"
          value={
            <>
              {display(summary.calories.value, 0)}
              <em>kcal</em>
            </>
          }
          detail={`${summary.calories.known}/${meals.length} items estimated`}
        />
        <Metric
          label="KNOWN FIBRE"
          value={
            <>
              {display(summary.fibre.value)}
              <em>g</em>
            </>
          }
          detail={`${summary.fibre.known}/${meals.length} items estimated`}
        />
        <Metric
          label="SHOPPING PLAN LEFT"
          value={`₹${briefing.remaining}`}
          detail="Weekly budget less checked estimates"
        />
      </div>
      <div className="power-columns">
        <Panel>
          <SectionHead
            eyebrow="QUICK MEAL LOG"
            title="What’s on your plate?"
            action={
              <button
                className="text-button"
                onClick={() => setPreferences(true)}
              >
                Fuel preferences
              </button>
            }
          />
          <p className="helper">
            {formatDate(date)} · log each food or a favourite meal. Unknown
            portions stay unestimated.
          </p>
          <div className="meal-slots">
            {mealSlots.map((slot) => (
              <section key={slot}>
                <div className="meal-slot-head">
                  <h3>{slot}</h3>
                  <button
                    className="text-button"
                    onClick={() => setMealEditor({ slot })}
                  >
                    <Plus size={16} />
                    Log {slot}
                  </button>
                </div>
                {!meals.some((x) => x.slot === slot) && (
                  <p className="helper">Nothing logged yet.</p>
                )}
                {meals
                  .filter((x) => x.slot === slot)
                  .map((meal) => (
                    <article className="meal-row" key={meal.id}>
                      <div className="grow">
                        <b>{meal.name}</b>
                        <p>
                          {meal.quantity === undefined
                            ? "Quantity unknown"
                            : `${meal.quantity} ${meal.unit}`}{" "}
                          · {display(mealEstimate(meal).protein)} g protein
                        </p>
                        <small>
                          {meal.quantity === undefined ||
                          Object.keys(meal.nutrients).length === 0
                            ? "Nutrition not estimated"
                            : meal.portion}
                        </small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${meal.name}`}
                        onClick={() => setMealEditor({ entry: meal, slot })}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${meal.name}`}
                        onClick={() => removeMeal(meal.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </article>
                  ))}
              </section>
            ))}
          </div>
          <label className="power-check complete-check">
            <input
              type="checkbox"
              checked={fuel.completeDays.includes(date)}
              onChange={(e) =>
                void update(
                  {
                    ...fuel,
                    completeDays: e.target.checked
                      ? [...fuel.completeDays, date]
                      : fuel.completeDays.filter((x) => x !== date),
                  },
                  "Food-log completeness saved",
                )
              }
            />
            I have logged all food and drinks for this day
          </label>
          <p className="helper">
            Only mark this when finished. Partial days and unknown nutrient
            values give insufficient data, even if the known subtotal is low.
          </p>
        </Panel>
        <Panel className="ghost-panel">
          <SectionHead
            eyebrow="GHOST // NUTRI-SENSE"
            title="Your nutrition briefing"
            action={<Ghost size={25} />}
          />
          <p className="muted">
            {!meals.length
              ? "Start with one meal. There’s nothing to assess yet."
              : !briefing.complete
                ? "This day is still open. Known totals are partial; no gap assessment yet."
                : "Compare your logged estimates with general adult reference markers."}
          </p>
          <div className="ghost-gaps">
            {briefing.gaps.map((x) => (
              <div key={x.key}>
                <span>
                  {nutrientLabels[x.key]}
                  <small>
                    {display(x.value)} / {x.target} {nutrientUnits[x.key]} ·{" "}
                    {x.known}/{x.total} items known
                  </small>
                </span>
                <b className={x.status === "estimated gap" ? "gap" : ""}>
                  {x.status}
                </b>
              </div>
            ))}
          </div>
          <h3>Affordable options · planning prices</h3>
          <p className="helper">
            Each option fits individually against entered estimates. Buying
            several may exceed the plan. Prices are examples, not live quotes.
          </p>
          {!briefing.budgetKnown && (
            <p className="helper">
              Enter prices for purchased items before GHOST can assess
              affordability.
            </p>
          )}
          {!briefing.options.length && (
            <p className="helper">
              {briefing.gaps.some((x) => x.status === "estimated gap")
                ? "No listed option fits the recorded gaps and your preferences/budget. Check exclusions and storage settings; for vegan B12, discuss suitable fortified foods with a qualified professional."
                : "Suggestions appear for estimated gaps once the day and nutrient data are complete. You can always use the grocery planner below."}
            </p>
          )}
          {briefing.options.slice(0, 3).map((x) => (
            <article className="ghost-option" key={x.id}>
              <div>
                <b>
                  {x.name} <span>~₹{x.cost}</span>
                </b>
                <p>{x.why}</p>
                <small>{x.storage}</small>
              </div>
              <button
                className="icon-button"
                aria-label={`Add ${x.name} to shopping`}
                onClick={() =>
                  void update(
                    {
                      ...fuel,
                      shopping: [
                        ...fuel.shopping,
                        {
                          id: uid(),
                          name: x.name,
                          checked: false,
                          cost: x.cost,
                        },
                      ],
                    },
                    "Suggestion added to shopping",
                  )
                }
              >
                <Plus size={18} />
              </button>
            </article>
          ))}
          <details>
            <summary>How GHOST reasons & reference sources</summary>
            <p className="helper">
              Offline rules, no AI service. An estimated daily gap is not a
              medical deficiency. One day cannot diagnose anything. “Meets
              reference” does not establish dietary adequacy. Data for other
              nutrients are not assessed.
            </p>
            <p className="helper">
              General adult markers: fibre 25 g, calcium 1000 mg, iron 8 mg,
              vitamin C 75 mg, B12 2.4 µg. These are lower adult reference
              points; many adults need more (for example iron 18 mg for many
              menstruating adults, fibre 38 g and vitamin C 90 mg for adult
              men). Protein defaults to an editable 60 g planning goal. These
              are not personalized prescriptions.
            </p>
            <p className="helper">
              Composition: USDA FoodData Central SR Legacy; household serving
              assumptions are shown when logging. Dal, milk, curd and rice vary
              locally. Source details and portions are bundled in the source
              documentation. Reference markers: NIH Office of Dietary
              Supplements and National Academies Dietary Reference Intakes.
            </p>
            <a
              href="https://fdc.nal.usda.gov/"
              target="_blank"
              rel="noreferrer"
            >
              USDA source (online)
            </a>
            {" · "}
            <a
              href="https://ods.od.nih.gov/factsheets/list-all/"
              target="_blank"
              rel="noreferrer"
            >
              NIH references (online)
            </a>
            <details>
              <summary>Full offline sources, portions & limitations</summary>
              <pre className="nutrition-sources">{nutritionSources}</pre>
            </details>
          </details>
        </Panel>
      </div>
      <div className="power-columns">
        <Panel>
          <SectionHead
            eyebrow="A LITTLE PREPARATION"
            title="Weekly fruit rotation"
          />
          <p className="helper">
            Typical Warangal market seasons · check local availability and
            price. Whole fruit saves fridge space. No automatic nutrition
            credit.
          </p>
          <div className="fruit-rotation">
            {rotation.map((x, i) => (
              <div key={i}>
                <small>
                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i]}
                </small>
                <b>{x.fruit}</b>
              </div>
            ))}
          </div>
          <p className="helper">
            Buy small amounts for ripeness and your storage. Suggestions for
            week starting {start}:
          </p>
          <div className="suggestion-chips">
            {Array.from(new Set(rotation.map((x) => x.fruit))).map((name) => (
              <button
                className="button secondary"
                key={name}
                onClick={() =>
                  void update(
                    {
                      ...fuel,
                      shopping: [
                        ...fuel.shopping,
                        { id: uid(), name, checked: false },
                      ],
                    },
                    "Fruit added to shopping",
                  )
                }
              >
                <Plus size={14} />
                {name}
              </button>
            ))}
          </div>
          <SectionHead eyebrow="LOGGED SUBTOTALS" title="Protein this week" />
          <div
            className="protein-week"
            role="img"
            aria-label="Known protein subtotals by day this week, not complete intake"
          >
            {weeklyDays.map((d) => {
              const total = nutritionSummary(
                fuel.meals.filter((x) => x.date === d),
              ).protein.value;
              return (
                <div key={d}>
                  <span>{d.slice(8)}</span>
                  <i
                    style={{
                      height:
                        total === null
                          ? "2px"
                          : `${Math.min(100, Math.max(2, (total / fuel.preferences.proteinTarget) * 100))}%`,
                    }}
                  />
                  <b>{total === null ? "—" : Math.round(total)}</b>
                </div>
              );
            })}
          </div>
          <p className="helper">
            Grams from known quantities only; missing data stays blank. Bar
            height capped at your protein target.
          </p>
        </Panel>
        <Panel>
          <SectionHead
            eyebrow="YOUR PG SHORTCUTS"
            title="Custom foods & favourites"
            action={
              <button className="text-button" onClick={() => setFoodEditor({})}>
                <Plus size={16} />
                New food / PG meal
              </button>
            }
          />
          <p className="helper">
            Save a favourite PG meal with unknown nutrients until you know its
            portion or recipe. Counts use eggs, glasses, bowls, plates, handfuls
            or packets.
          </p>
          {!fuel.foods.length && (
            <p className="power-empty">
              Your PG menu is yours to discover. No meals or nutrition values
              have been prefilled.
            </p>
          )}
          <div className="power-register">
            {fuel.foods.map((food) => (
              <article key={food.id}>
                <span className="crimson">{food.favourite ? "★" : "◇"}</span>
                <div className="grow">
                  <b>{food.name}</b>
                  <p>
                    {food.portion} · {food.unit}
                  </p>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Edit food ${food.name}`}
                  onClick={() => setFoodEditor({ food })}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete food ${food.name}`}
                  onClick={() => {
                    if (
                      confirm(
                        "Remove this custom food? Saved meal snapshots stay intact.",
                      )
                    )
                      void update(
                        {
                          ...fuel,
                          foods: fuel.foods.filter((x) => x.id !== food.id),
                        },
                        "Custom food removed; meals preserved",
                      );
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        </Panel>
      </div>
      <div className="power-columns">
        <Panel>
          <SectionHead
            eyebrow="MINI STASH"
            title="Small shelf. Smart supplies."
            action={
              <button className="text-button" onClick={() => setPantry("new")}>
                <Package size={16} />
                Add stash item
              </button>
            }
          />
          <p className="helper">
            {fuel.preferences.fridge
              ? "Tiny shared fridge: buy small portions, keep space for others, follow label storage."
              : "No reliable fridge selected. Prefer sealed dry foods, whole fruit and single-use packs."}{" "}
            Expiry reminders appear here while ARC is open.
          </p>
          {!fuel.pantry.length && (
            <p className="power-empty">
              Start with one or two things you actually keep. No stock is
              assumed.
            </p>
          )}
          <div className="power-register">
            {fuel.pantry.map((item) => (
              <article key={item.id}>
                {item.storage === "fridge" ? (
                  <Snowflake size={19} />
                ) : (
                  <Package size={19} />
                )}
                <div className="grow">
                  <h3>{item.name}</h3>
                  <p>
                    {item.quantity} · {item.storage}
                  </p>
                  <small
                    className={
                      item.expires && item.expires <= today() ? "crimson" : ""
                    }
                  >
                    {expiryStatus(item.expires, today())}
                  </small>
                  {item.storage === "fridge" && !fuel.preferences.fridge && (
                    <p className="error-text">
                      Requires refrigeration; fridge access is turned off.
                    </p>
                  )}
                </div>
                <button
                  className="icon-button"
                  aria-label={`Edit stash ${item.name}`}
                  onClick={() => setPantry(item)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    if (confirm(`Remove ${item.name} from your stash?`))
                      void update(
                        {
                          ...fuel,
                          pantry: fuel.pantry.filter((x) => x.id !== item.id),
                        },
                        "Stash item removed",
                      );
                  }}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionHead
            eyebrow="STOCK UP WITH INTENT"
            title="Shopping checklist"
            action={
              <button
                className="text-button"
                onClick={() => setShopping("new")}
              >
                <ShoppingBasket size={16} />
                Add item
              </button>
            }
          />
          <p className="helper">
            Weekly planning budget ₹{fuel.preferences.weeklyBudget}. Edit prices
            to local quotes. A check marks a purchased item; unchecked items do
            not reduce the remaining plan.
          </p>
          {fuel.shopping.some((x) => x.cost === undefined) && (
            <p className="helper">
              Some items have no cost entered; remaining budget is incomplete.
            </p>
          )}
          {fuel.shopping
            .filter((x) => x.checked)
            .reduce((n, x) => n + (x.cost ?? 0), 0) >
            fuel.preferences.weeklyBudget && (
            <p className="error-text">
              Checked estimates exceed your entered budget.
            </p>
          )}
          {!fuel.shopping.length && (
            <p className="power-empty">
              An empty list, ready for your next market run.
            </p>
          )}
          <div className="power-register">
            {fuel.shopping.map((item) => (
              <article key={item.id}>
                <label className="power-check grow">
                  <input
                    type="checkbox"
                    aria-label={`Bought ${item.name}`}
                    checked={item.checked}
                    onChange={(e) =>
                      void update(
                        {
                          ...fuel,
                          shopping: fuel.shopping.map((x) =>
                            x.id === item.id
                              ? { ...x, checked: e.target.checked }
                              : x,
                          ),
                        },
                        "Shopping checklist saved",
                      )
                    }
                  />
                  {item.name}
                </label>
                <button
                  className="text-button"
                  aria-label={`Edit price ${item.name}`}
                  onClick={() => setShopping(item)}
                >
                  {item.cost === undefined ? "Price unknown" : `~₹${item.cost}`}
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove shopping ${item.name}`}
                  onClick={() =>
                    void update(
                      {
                        ...fuel,
                        shopping: fuel.shopping.filter((x) => x.id !== item.id),
                      },
                      "Shopping item removed",
                    )
                  }
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          </div>
          <button
            className="text-button"
            onClick={() => {
              if (
                confirm(
                  "Start a new weekly shopping list? This removes checked items; unchecked items stay.",
                )
              )
                void update(
                  {
                    ...fuel,
                    shopping: fuel.shopping.filter((x) => !x.checked),
                  },
                  "Checked shopping items cleared",
                );
            }}
          >
            Start new week · clear bought items
          </button>
          <p className="helper">
            A kettle is not a pressure cooker. Choose ready-cooked pulses,
            suitable instant oats or foods that require no cooking. No fridge?
            Finish opened milk promptly.
          </p>
        </Panel>
      </div>
      <WellnessPanel state={state} commit={commit} date={date} />
      {mealEditor && (
        <MealEditor
          state={state}
          commit={commit}
          date={date}
          {...mealEditor}
          onClose={() => setMealEditor(null)}
        />
      )}
      {foodEditor && (
        <FoodEditor
          state={state}
          commit={commit}
          {...foodEditor}
          onClose={() => setFoodEditor(null)}
        />
      )}
      {preferences && (
        <FuelPreferences
          state={state}
          commit={commit}
          onClose={() => setPreferences(false)}
        />
      )}
      {pantry && (
        <Dialog
          title={
            pantry === "new" ? "Add MINI STASH item" : "Edit MINI STASH item"
          }
          onClose={() => setPantry(null)}
        >
          <SaveForm
            label="Save stash item"
            onSave={async (f) => {
              const item = {
                id: pantry === "new" ? uid() : pantry.id,
                name: textValue(f, "name"),
                quantity: textValue(f, "quantity"),
                storage: textValue(f, "storage") as "shelf" | "fridge",
                expires: textValue(f, "expires") || undefined,
              };
              const ok = await update(
                {
                  ...fuel,
                  pantry:
                    pantry === "new"
                      ? [...fuel.pantry, item]
                      : fuel.pantry.map((x) => (x.id === pantry.id ? item : x)),
                },
                "Stash item saved",
              );
              if (ok) setPantry(null);
              return ok;
            }}
          >
            <Field label="Stash food">
              <input
                name="name"
                required
                maxLength={160}
                defaultValue={pantry === "new" ? "" : pantry.name}
              />
            </Field>
            <Field label="Quantity in stash">
              <input
                name="quantity"
                required
                maxLength={160}
                placeholder="2 packets, 3 eggs…"
                defaultValue={pantry === "new" ? "" : pantry.quantity}
              />
            </Field>
            <Field label="Storage">
              <select
                name="storage"
                defaultValue={pantry === "new" ? "shelf" : pantry.storage}
              >
                <option value="shelf">Shelf</option>
                <option value="fridge">Shared fridge · small portion</option>
              </select>
            </Field>
            <Field label="Use-by / expiry from label (optional)">
              <input
                name="expires"
                type="date"
                defaultValue={pantry === "new" ? "" : pantry.expires}
              />
            </Field>
            <p className="helper">
              Use-by is entered from the label, not inferred by ARC. Storage and
              signs of spoilage still matter.
            </p>
          </SaveForm>
        </Dialog>
      )}
      {shopping && (
        <Dialog
          title={
            shopping === "new" ? "Add shopping item" : "Edit shopping item"
          }
          onClose={() => setShopping(null)}
        >
          <SaveForm
            label="Save shopping item"
            onSave={async (f) => {
              const item = {
                id: shopping === "new" ? uid() : shopping.id,
                name: textValue(f, "name"),
                cost: numberValue(f, "cost"),
                checked: shopping === "new" ? false : shopping.checked,
              };
              const ok = await update(
                {
                  ...fuel,
                  shopping:
                    shopping === "new"
                      ? [...fuel.shopping, item]
                      : fuel.shopping.map((x) =>
                          x.id === shopping.id ? item : x,
                        ),
                },
                "Shopping item saved",
              );
              if (ok) setShopping(null);
              return ok;
            }}
          >
            <Field label="Shopping item">
              <input
                name="name"
                maxLength={160}
                required
                defaultValue={shopping === "new" ? "" : shopping.name}
              />
            </Field>
            <Field label="Estimated total cost (₹, optional)">
              <input
                name="cost"
                type="number"
                min="0"
                max="100000"
                step="0.01"
                defaultValue={shopping === "new" ? "" : shopping.cost}
              />
            </Field>
          </SaveForm>
        </Dialog>
      )}
    </div>
  );
}
function MealEditor({
  state,
  commit,
  date,
  entry,
  slot,
  onClose,
}: {
  state: State;
  commit: Commit;
  date: string;
  entry?: Meal;
  slot: Meal["slot"];
  onClose: () => void;
}) {
  const choices = [
    ...state.fuel.foods.filter((x) => x.favourite),
    ...foods,
    ...state.fuel.foods.filter((x) => !x.favourite),
  ];
  const [selected, setSelected] = useState(entry ? "snapshot" : "unknown");
  const [known, setKnown] = useState(entry?.quantity !== undefined);
  const [quantity, setQuantity] = useState(entry?.quantity?.toString() ?? "1");
  const choice =
    selected === "snapshot" ? entry : choices.find((x) => x.id === selected);
  return (
    <Dialog
      title={entry ? "Edit meal item" : `Log ${slot}`}
      onClose={() => {
        if (confirm("Close this meal draft?")) onClose();
      }}
    >
      <SaveForm
        label="Save meal item"
        onSave={async (f) => {
          const record = mealSchema.parse({
            id: entry?.id ?? uid(),
            date: textValue(f, "date"),
            slot: textValue(f, "slot"),
            name: choice?.name ?? textValue(f, "name"),
            quantity: known && quantity !== "" ? Number(quantity) : undefined,
            unit: choice?.unit ?? textValue(f, "unit"),
            portion: choice?.portion ?? "Unknown PG portion",
            nutrients: choice?.nutrients ?? {},
            source: choice?.source ?? "User log · composition unknown",
          });
          const meals = entry
            ? state.fuel.meals.map((x) => (x.id === entry.id ? record : x))
            : [...state.fuel.meals, record];
          // Editing a day reopens it, so an old completeness mark cannot silently assess a changed log.
          const ok = await commit(
            {
              ...state,
              fuel: {
                ...state.fuel,
                meals,
                completeDays: state.fuel.completeDays.filter(
                  (d) => d !== record.date && d !== entry?.date,
                ),
              },
            },
            "Meal saved on this device",
          );
          if (ok) onClose();
          return ok;
        }}
      >
        <div className="power-fields">
          <Field label="Food date">
            <input
              name="date"
              type="date"
              max={today()}
              required
              defaultValue={entry?.date ?? date}
            />
          </Field>
          <Field label="Meal">
            <select name="slot" defaultValue={slot}>
              {mealSlots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Food or favourite PG meal">
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setKnown(false);
              setQuantity("1");
            }}
          >
            <option value="unknown">Unknown PG meal / other food</option>
            {entry && (
              <option value="snapshot">Keep original saved food</option>
            )}
            {choices.map((f) => (
              <option key={f.id} value={f.id}>
                {f.favourite ? "★ " : ""}
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        {!choice && (
          <>
            <Field label="Food / PG meal name">
              <input
                name="name"
                required
                maxLength={160}
                placeholder="PG lunch, mixed curry…"
              />
            </Field>
            <Field label="Quantity unit">
              <select name="unit">
                {[
                  "plate",
                  "bowl",
                  "egg",
                  "glass",
                  "handful",
                  "packet",
                  "serving",
                ].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {choice && (
          <div className="portion-note">
            <b>
              One {choice.unit}: {choice.portion}
            </b>
            <p>
              Use this estimate only if your portion matches. Local recipes
              vary. Otherwise leave quantity unknown or create a custom food.
            </p>
            <small>{choice.source}</small>
          </div>
        )}
        <label className="power-check">
          <input
            type="checkbox"
            checked={known}
            onChange={(e) => setKnown(e.target.checked)}
          />
          I know the quantity{choice ? " and it matches this serving" : ""}
        </label>
        {known && (
          <Field label="Number of units">
            <input
              type="number"
              required
              min="0.01"
              max="10000"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
        )}
        <p className="helper">
          {choice && known
            ? `Protein estimate: ${display(mealEstimate({ quantity: quantity ? Number(quantity) : undefined, nutrients: choice.nutrients }).protein)} g.`
            : "Unknown composition or quantity adds no invented nutrients. You can still save this meal."}
        </p>
      </SaveForm>
    </Dialog>
  );
}
function FoodEditor({
  state,
  commit,
  food,
  onClose,
}: {
  state: State;
  commit: Commit;
  food?: Food;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={food ? "Edit custom food" : "Custom food / favourite PG meal"}
      onClose={() => onClose()}
    >
      <SaveForm
        label="Save custom food"
        onSave={async (f) => {
          const nutrients = Object.fromEntries(
            nutrientKeys
              .filter((k) => numberValue(f, k) !== undefined)
              .map((k) => [k, numberValue(f, k)]),
          );
          const record = foodSchema.parse({
            id: food?.id ?? uid(),
            name: textValue(f, "name"),
            unit: textValue(f, "unit"),
            portion: textValue(f, "portion"),
            nutrients,
            source:
              textValue(f, "source") || "User supplied · no source entered",
            favourite: f.has("favourite"),
          });
          const next = food
            ? state.fuel.foods.map((x) => (x.id === food.id ? record : x))
            : [...state.fuel.foods, record];
          const ok = await commit(
            { ...state, fuel: { ...state.fuel, foods: next } },
            "Custom food saved; previous meals unchanged",
          );
          if (ok) onClose();
          return ok;
        }}
      >
        <Field label="Custom food name">
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={food?.name}
          />
        </Field>
        <div className="power-fields">
          <Field label="Serving unit">
            <input
              name="unit"
              required
              maxLength={160}
              list="food-units"
              defaultValue={food?.unit ?? "plate"}
            />
            <datalist id="food-units">
              {["egg", "glass", "bowl", "plate", "handful", "packet"].map(
                (u) => (
                  <option key={u} value={u} />
                ),
              )}
            </datalist>
          </Field>
          <Field label="Portion description">
            <input
              name="portion"
              required
              maxLength={160}
              placeholder="One PG plate · quantity unknown"
              defaultValue={food?.portion}
            />
          </Field>
        </div>
        <label className="power-check">
          <input
            name="favourite"
            type="checkbox"
            defaultChecked={food?.favourite ?? true}
          />
          Favourite PG meal / food
        </label>
        <p className="helper">
          Values below are per one serving as described above. Leave every
          unknown blank. Do not copy per-100 g values unless your serving is 100
          g. Zero means known zero.
        </p>
        <div className="power-fields">
          {nutrientKeys.map((k) => (
            <Field
              key={k}
              label={`${nutrientLabels[k]} per serving (${nutrientUnits[k]}, optional)`}
            >
              <input
                name={k}
                type="number"
                min="0"
                max={
                  k === "calories" || k === "calcium" || k === "vitaminC"
                    ? 100000
                    : 10000
                }
                step="0.01"
                defaultValue={food?.nutrients[k]}
              />
            </Field>
          ))}
        </div>
        <Field label="Label / recipe / source (optional)">
          <input name="source" maxLength={500} defaultValue={food?.source} />
        </Field>
      </SaveForm>
    </Dialog>
  );
}
function FuelPreferences({
  state,
  commit,
  onClose,
}: {
  state: State;
  commit: Commit;
  onClose: () => void;
}) {
  const p = state.fuel.preferences;
  return (
    <Dialog title="Fuel goals & preferences" onClose={onClose}>
      <SaveForm
        label="Save Fuel preferences"
        onSave={async (f) => {
          const preferences = {
            proteinTarget: Number(f.get("protein")),
            weeklyBudget: Number(f.get("budget")),
            maxItemCost: Number(f.get("max")),
            diet: textValue(f, "diet") as typeof p.diet,
            fridge: f.has("fridge"),
            excludedFoods: textValue(f, "exclude")
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          };
          const ok = await commit(
            { ...state, fuel: { ...state.fuel, preferences } },
            "Fuel preferences saved",
          );
          if (ok) onClose();
          return ok;
        }}
      >
        <Field label="Daily protein planning target (g)">
          <input
            name="protein"
            type="number"
            min="10"
            max="300"
            step="0.1"
            required
            defaultValue={p.proteinTarget}
          />
        </Field>
        <p className="helper">
          60 g is a starting placeholder, not a calculated personal requirement.
        </p>
        <div className="power-fields">
          <Field label="Weekly grocery budget (₹)">
            <input
              name="budget"
              type="number"
              min="0"
              max="100000"
              required
              step="0.01"
              defaultValue={p.weeklyBudget}
            />
          </Field>
          <Field label="Maximum suggestion price (₹)">
            <input
              name="max"
              type="number"
              min="0"
              max="10000"
              required
              step="0.01"
              defaultValue={p.maxItemCost}
            />
          </Field>
        </div>
        <Field label="Dietary preference">
          <select name="diet" defaultValue={p.diet}>
            {["vegetarian", "eggetarian", "omnivore", "vegan"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <label className="power-check">
          <input name="fridge" type="checkbox" defaultChecked={p.fridge} />I
          have reliable space in the shared fridge
        </label>
        <Field label="Exclude suggestion foods (comma-separated)">
          <input
            name="exclude"
            maxLength={1500}
            placeholder="peanuts, milk…"
            defaultValue={p.excludedFoods.join(", ")}
          />
        </Field>
        <p className="helper">
          Match suggested food names, for example peanuts, milk, eggs, curd or
          chana. This is a preference filter, not an allergy safety system.
          Check ingredients yourself.
        </p>
      </SaveForm>
    </Dialog>
  );
}

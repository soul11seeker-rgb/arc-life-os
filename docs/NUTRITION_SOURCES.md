# ARC 1.1 offline nutrition data

This is a small reference set of foods commonly available in India, not a laboratory analysis of a Warangal PG menu. No network or account is used at runtime.

## Composition source

USDA FoodData Central, **SR Legacy** (April 2018 release; former USDA National Nutrient Database for Standard Reference), https://fdc.nal.usda.gov/download-datasets/ and https://fdc.nal.usda.gov/food-search . Search the exact food descriptions below. Values are per **100 g edible food**, unfortified unless specified. Columns: protein g, energy kcal, dietary fibre g, calcium mg, iron mg, vitamin C mg, vitamin B12 µg.

| USDA food description (legacy NDB number)                     | Protein | kcal | Fibre |  Ca |   Fe |     C |  B12 |
| ------------------------------------------------------------- | ------: | ---: | ----: | --: | ---: | ----: | ---: |
| Egg, whole, cooked, hard-boiled (01129)                       |   12.58 |  155 |     0 |  50 | 1.19 |     0 | 1.11 |
| Milk, whole, 3.25% milkfat, with added vitamin D (01077)      |    3.15 |   61 |     0 | 113 | 0.03 |     0 | 0.45 |
| Yogurt, plain, whole milk (01116)                             |    3.47 |   61 |     0 | 121 | 0.05 |   0.5 | 0.37 |
| Lentils, mature seeds, cooked, boiled, without salt (16070)   |    9.02 |  116 |   7.9 |  19 | 3.33 |   1.5 |    0 |
| Chickpeas, mature seeds, cooked, boiled, without salt (16057) |    8.86 |  164 |   7.6 |  49 | 2.89 |   1.3 |    0 |
| Peanuts, all types, raw (16087)                               |    25.8 |  567 |   8.5 |  92 | 4.58 |     0 |    0 |
| Bananas, raw (09040)                                          |    1.09 |   89 |   2.6 |   5 | 0.26 |   8.7 |    0 |
| Guavas, common, raw (09139)                                   |    2.55 |   68 |   5.4 |  18 | 0.26 | 228.3 |    0 |
| Oranges, raw, all commercial varieties (09200)                |    0.94 |   47 |   2.4 |  40 |  0.1 |  53.2 |    0 |
| Rice, white, long-grain, regular, unenriched, cooked (20445)  |    2.69 |  130 |   0.4 |  10 |  0.2 |     0 |    0 |
| Oats (20038)                                                  |   16.89 |  389 |  10.6 |  54 | 4.72 |     0 |    0 |

USDA values are reference proxies for familiar foods; local rice, buffalo milk, diluted dal, homemade curd and branded packets can differ substantially. Rice iron is deliberately represented with the unenriched cooked-rice value (0.2 mg, NDB 20445) rather than assuming Indian rice is enriched. No fortification benefits are assumed. Verify package labels where available. IFCT 2017 (ICMR–National Institute of Nutrition, Hyderabad, https://www.nin.res.in/ebooks/IFCT2017.pdf) is a useful Indian reference for future expansion; **these rows are not claimed to be IFCT-derived**.

## Quantities and unknowns

Household portions in `src/domain/nutrition.ts` are **explicit app assumptions**, not universal definitions: egg 50 g edible, milk glass about 200 g/200 ml, curd bowl 100 g, lentil/chana/rice bowl 150 g, handful peanuts 30 g, banana 118 g, guava 100 g, orange 131 g, measured oats packet 40 g. The UI shows these before saving. Change the count to match that assumption; otherwise use an unknown quantity or a custom food with a measured serving. A plate of PG food is never assigned a default nutrition profile. Unknown fields stay absent, not zero. Enter zero only when known. Saved meals contain composition/portion/source snapshots so later custom-food edits cannot rewrite history.

## GHOST rule references and limits

Reference markers are general adult comparison points, not individualized targets: fibre 25 g, calcium 1000 mg, iron 8 mg, vitamin C 75 mg, B12 2.4 µg. Sources: NIH Office of Dietary Supplements fact sheets (https://ods.od.nih.gov/factsheets/list-all/), and Dietary Reference Intakes fibre adequate intakes (National Academies; 25 g adult women, 38 g adult men aged 19–50). Iron 8 mg is a **lower adult reference**, not adequate for everyone (18 mg for many menstruating adults; other life stages differ). Vitamin C 75 mg is also the lower adult reference (90 mg for adult men). These are explained in the app and never used to diagnose deficiency or declare nutritional adequacy. Protein defaults to an editable **60 g planning placeholder**, not a calculated requirement. There is no calorie target or weight-loss prescription.

For each nutrient, a gap is considered only if the user explicitly marks the day fully logged, at least one meal exists, and every logged item has a known quantity and that nutrient. Otherwise GHOST says **insufficient data**, while displaying any known subtotal separately. One day's estimated gap does not establish a medical deficiency. No supplements, diagnoses or paid AI recommendations are generated. Other nutrients are not assessed.

## Groceries, budget, storage

Suggestion costs are **editable planning examples in rupees**, not live Warangal quotes. Weekly budget is a manually managed shopping list; checked estimated line costs are subtracted. Missing costs are called out; no claim of an exact spend is made. Each suggestion must fit the remaining entered budget and maximum item allowance individually; combining several may exceed the budget. Fruit rotation uses broad Telangana market seasons and Monday-based rotation, with no implied nutrient totals until the actual food and quantity are logged.

No fridge is the default. Shelf suggestions emphasize dry sealed foods, whole fruit, unopened shelf-stable UHT milk, or freshly cooked portions eaten promptly. Chana requires thorough cooking; an electric kettle is not assumed to safely cook dried pulses or eggs. Fridge items require explicit access and small portions. Expiry dates are entered by the user from labels; ARC does not invent shelf lives. Reminders appear when the app is open; there are no background push notifications. Expiry is not a guarantee of food safety; storage instructions and spoilage matter.

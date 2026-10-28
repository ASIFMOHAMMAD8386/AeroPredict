# South India synthetic training data

All 6,000 rows are invented educational examples. They are NOT actual airline records, NOT fetched from Aviationstack, and NOT the dataset used by the old project. They require zero API calls. Dates describe fictional schedules. Airport locations are geographic reference points; all traffic, weather, incoming delays, durations and outcomes are synthetic.

## Files

- south_india_synthetic_all.csv: all 6,000 records.
- train.csv: first 210 days, 4,200 rows.
- validation.csv: next 45 days, 900 rows.
- test.csv: last 45 days, 900 rows.

Splits are chronological with no date overlap. Use train to fit preprocessing and models, validation to choose parameters, and test only for final synthetic evaluation. The same generation assumptions apply across all splits; performance on them does not establish real-world accuracy.

## Targets and leakage

For classification, predict delayed_15_plus (1 means synthetic departure delay >=15 minutes). For regression, predict departure_delay_minutes. Exclude BOTH target columns from input features; one reveals the other. Exclude record_id, data_source and split. Use the features array in metadata.json as a starting point. Categorical features need encoding. Origin is always HYD and adds no variation. Day of week is Monday=1 through Sunday=7. Times use IST +05:30.

Weather, congestion_pct and incoming_delay_minutes represent assumed inputs available at prediction time. In a real dataset, they must be observations or forecasts captured BEFORE the prediction cutoff. Do not join later actual outcomes into features.

## Generator

Seed 20261019. Chosen delay equation: round(max(0, -8 + 8*weatherWeight + 0.12*congestion + 0.6*incomingDelay + 7*eveningPeak + noise + rareDisruption)). Weather weights Clear=0, Rain=1.1, Thunderstorm=2.2, Fog=1.7. Evening peak is hours 16 through 22 IST. Noise is the sum of three independent uniform draws minus 1.5, multiplied by 20. A 4% random event adds 20 to 80 minutes. These are demonstration assumptions, not fitted aviation statistics.

## Real training data

Aviationstack free access is for current flight data; historical access is a paid feature according to https://aviationstack.com/pricing checked 19 October 2026. A current flight snapshot is not a historical training dataset. To train a genuine model, obtain licensed historical records with scheduled and actual departures and time-stamped pre-departure features. No API requests were used to generate these files.

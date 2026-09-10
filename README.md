> **Workspace setup:** The folder scaffold and starter notebooks are now available.
> Start with [Project structure and setup](docs/PROJECT_STRUCTURE.md),
> [Four-member workflow](docs/TEAM_WORKFLOW.md), and [Data locations](data/README.md).
> The sections below describe the planned solution; model development has not started.

# UrbanFlow Datathon 2026

An end-to-end data science and machine learning solution developed for the **SLIIT Codefest Datathon 2026 — Urban Flow Analytics Data Challenge**.

The project analyses urban taxi trip data to improve taxi operations through data-quality analysis, fare prediction, trip-time estimation, passenger-demand forecasting, spatial-temporal analysis, and business intelligence.

---

## Project Objectives

The solution addresses four core areas:

1. Data Quality and Exploratory Data Analysis
2. Fare and Trip-Time Prediction
3. Spatial-Temporal and Demand Analytics
4. Solution Architecture and Technical Evaluation

The project also explores the two bonus tracks:

5. AI Mobility Assistant
6. Business Intelligence Dashboard

---

## Problem Statement

Urban taxi companies generate large volumes of trip data containing information about fares, locations, timestamps, passengers, distances, and payment methods.

However, raw operational data can contain invalid records, unusual values, inconsistencies, and complex patterns.

The objective of this project is to transform this raw taxi data into reliable predictions and actionable business insights that can improve:

- Passenger experience
- Taxi availability
- Fleet utilization
- Travel-time estimation
- Upfront pricing
- Operational decision-making

---

# 1. Data Quality and Exploratory Data Analysis

The first stage evaluates and cleans the raw taxi dataset.

### Required anomaly detection

The following cases are investigated:

- Negative fares
- Zero trip distance with non-zero fare
- Zero rider count
- Drop-off timestamp earlier than pickup timestamp
- Unrealistic vehicle speeds
- Missing values
- Duplicate records
- Extreme outliers
- Invalid categorical values

For every anomaly, the analysis records:

- Number of affected records
- Percentage of the total dataset affected
- Selected treatment
- Justification for the treatment

Possible treatments include:

- Removal
- Filtering
- Imputation
- Retention with justification

---

## Exploratory Data Analysis

EDA investigates patterns including:

- Trip volume
- Fare distributions
- Trip-distance distributions
- Trip-duration distributions
- Rider-count distributions
- Hourly demand
- Daily demand
- Zone-level demand
- Payment methods
- Peak travel periods
- Pickup and drop-off patterns

---

# 2. Feature Engineering

Useful features are extracted from the original dataset.

Possible engineered features include:

```text
pickup_hour
pickup_day
day_of_week
month
is_weekend
time_period
trip_duration_minutes
estimated_speed
origin_zone
destination_zone
origin_borough
destination_borough
```

Feature engineering is performed carefully according to the prediction task to prevent target leakage.

---

# 3. Fare Amount Prediction

## Objective

Build an ML pipeline capable of predicting the taxi `base_fare` before a trip begins.

This supports a **No-Surprises Upfront Pricing** system.

### Target

```text
base_fare
```

### Workflow

```text
Clean Data
    ↓
Feature Engineering
    ↓
Train / Validation / Test Split
    ↓
Baseline Model
    ↓
Multiple Regression Models
    ↓
Hyperparameter Tuning
    ↓
Model Validation
    ↓
Performance Comparison
    ↓
Best Model
    ↓
Saved .pkl Model
```

### Evaluation Metrics

Models are evaluated using:

- MAE — Mean Absolute Error
- RMSE — Root Mean Squared Error
- R² — Coefficient of Determination

Multiple algorithms will be experimentally evaluated rather than assuming a particular algorithm is best in advance.

---

# 4. On-Time Arrival Estimator

## Objective

Predict the total duration of a taxi trip in minutes before the journey begins.

### Target

```text
trip_duration_minutes
```

Calculated using:

```text
dropoff_timestamp - pickup_timestamp
```

The modelling process includes:

- Feature selection
- Baseline modelling
- Multiple regression algorithms
- Hyperparameter tuning
- Validation
- Performance comparison
- Final model selection

### Evaluation

```text
MAE
RMSE
R²
```

The best-performing validated model will be saved for deployment.

---

# 5. Passenger Demand Forecasting

## Objective

Help taxi drivers and fleet managers determine where passengers are likely to require taxis in advance.

The system identifies important taxi zones and forecasts pickup demand.

### Forecasting Horizons

```text
Next 24 hours
Next 48 hours
Next 72 hours
```

### Workflow

```text
Historical Trips
      ↓
Aggregate Pickups by Zone and Time
      ↓
Identify Important Taxi Zones
      ↓
Build Time-Series Data
      ↓
Train Forecasting Models
      ↓
Validate Forecasts
      ↓
Generate 24–72 Hour Predictions
```

Forecasting algorithms will be compared experimentally before selecting the final approach.

---

# 6. Hotspot Analysis

The system identifies areas with high concentrations of taxi activity.

Analysis includes:

- Pickup hotspots
- Drop-off hotspots
- High-demand zones
- Time-dependent hotspots
- Borough-level patterns

Hotspot behaviour is analysed across different periods of the day.

Example:

```text
Morning
Afternoon
Evening
Late Night
```

---

# 7. Origin-Destination Flow Analysis

Origin-Destination analysis investigates how passengers move between taxi zones.

```text
Origin Zone
     ↓
Destination Zone
```

The analysis identifies:

- Major travel routes
- Frequent origin-destination pairs
- High-volume movement corridors
- Time-dependent travel behaviour
- Changes between morning and late-night movement

---

# 8. Business Intelligence Dashboard

The interactive dashboard is designed for taxi-company management and business decision-makers.

It transforms analytical results into actionable information.

### Dashboard Areas

Potential dashboard sections include:

- Executive overview
- Trip activity
- Revenue and fare analytics
- Peak demand periods
- High-demand locations
- Low-demand locations
- Demand forecasts
- Trip-duration analysis
- Fare analysis
- Hotspot maps
- Origin-Destination flows
- Payment trends
- Operational recommendations

### Data Story

The dashboard follows the structure:

```text
What is the problem?
        ↓
What does the data tell us?
        ↓
Why is it happening?
        ↓
What should the company do?
        ↓
What business value can be created?
```

---

# 9. AI Mobility Assistant

The AI Mobility Assistant is an intelligent question-answering interface for taxi-company managers.

Instead of requiring users to manually write SQL or Python, users can ask questions using natural language.

Example:

```text
User:
Which zones had the highest taxi demand during the evening?

AI Mobility Assistant:
→ Understand question
→ Generate safe analytical query/code
→ Retrieve relevant data
→ Process result
→ Return understandable answer
```

The assistant should also handle:

- Ambiguous questions
- Invalid questions
- Malformed requests
- Unsupported requests
- Safe code/query execution

---

# Dataset Structure

Two datasets are used.

## Taxi Dataset

Contains taxi trip information including:

```text
provider_code
pickup_timestamp
dropoff_timestamp
rider_count
distance_miles
rate_class_id
offline_record_flag
origin_loc_id
dest_loc_id
fare_settlement_method
base_fare
surcharge_misc
transit_tax
driver_tip_payment
toll_total
service_improvement_fee
charge_total
zone_congestion_fee
airport_pickup_fee
congestion_relief_fee
```

## Zone Dataset

Contains geographical taxi-zone information:

```text
loc_id
borough_name
zone_name
service_zone
```

The zone dataset can be joined with the main taxi dataset using:

```text
origin_loc_id → loc_id
dest_loc_id   → loc_id
```

---

# Team Structure

The project is developed by a four-member team.

## Member 1 — Data Engineering & EDA

Responsibilities:

```text
Data understanding
Data cleaning
Anomaly detection
Missing-value handling
Outlier analysis
EDA
Feature engineering
Taxi + Zone dataset integration
Clean master dataset preparation
```

---

## Member 2 — Supervised Machine Learning

Responsibilities:

```text
Fare prediction
Trip-duration prediction
Baseline modelling
Model experimentation
Hyperparameter tuning
Model validation
MAE / RMSE / R² evaluation
Model comparison
.pkl model export
```

---

## Member 3 — Spatial-Temporal Analytics

Responsibilities:

```text
Demand forecasting
24-hour forecasting
48-hour forecasting
72-hour forecasting
Taxi hotspot analysis
Pickup/drop-off clustering
Origin-Destination analysis
Spatial visualizations
Time-based movement analysis
```

---

## Member 4 — Business Intelligence & AI

Responsibilities:

```text
Interactive dashboard
Business-problem analysis
Business recommendations
AI Mobility Assistant
System integration
Solution architecture
Demo integration
```

---

# Shared Team Responsibilities

All team members contribute to:

```text
Final technical report
Final notebook
Testing
Result verification
Architecture review
Documentation
Demo video
Final submission review
```

---

# Model Evaluation Strategy

Regression models are evaluated using:

### Mean Absolute Error

Measures the average absolute prediction error.

### Root Mean Squared Error

Measures prediction error while penalizing larger errors more strongly.

### R² Score

Measures how much variation in the target variable is explained by the model.

The final model is selected based on validation/test performance rather than training performance alone.

The evaluation process also considers:

- Overfitting
- Generalization
- Hyperparameter optimization
- Feature quality
- Model robustness

---

# Proposed Project Structure

```text
UrbanFlow-Datathon-2026/
│
├── data/
│   ├── raw/
│   ├── cleaned/
│   └── splits/
│       ├── train/
│       ├── validation/
│       └── test/
│
├── notebooks/
│   ├── 01_data_cleaning_eda.ipynb
│   ├── 02_fare_prediction.ipynb
│   ├── 03_trip_duration_prediction.ipynb
│   ├── 04_demand_forecasting.ipynb
│   ├── 05_hotspot_analysis.ipynb
│   └── 06_business_analysis.ipynb
│
├── src/
│   ├── preprocessing/
│   ├── features/
│   ├── models/
│   ├── forecasting/
│   ├── spatial/
│   └── utils/
│
├── models/
│   ├── fare_prediction.pkl
│   ├── trip_duration_prediction.pkl
│   └── demand_forecasting/
│
├── dashboard/
│
├── ai_assistant/
│
├── reports/
│
├── architecture/
│
├── results/
│   ├── figures/
│   ├── metrics/
│   └── maps/
│
├── TeamName_FinalNotebook.ipynb
├── requirements.txt
├── .gitignore
└── README.md
```

---

# Git Workflow

Each team member works on a separate branch.

```text
main
│
├── member1-data-eda
├── member2-prediction
├── member3-demand-spatial
└── member4-dashboard-ai
```

Completed work is reviewed before being merged into `main`.

---

# Important Dataset Rule

The competition datasets and their derivatives must **not be publicly published or redistributed**.

Therefore, competition data should not be committed to a public GitHub repository.

Recommended `.gitignore` rules:

```gitignore
data/raw/
data/cleaned/
data/splits/

*.csv
*.parquet

.env
__pycache__/
.ipynb_checkpoints/
```

Use a **private repository** while collaborating with the team.

---

# Final Deliverables

The final competition submission will contain:

```text
Detailed Technical Report

TeamName_FinalNotebook.ipynb

Source Code

Supporting Notebooks

Trained Models (.pkl)

Training Dataset Split

Validation Dataset Split

Testing Dataset Split

Solution Architecture Diagram

3–5 Minute Demo Video
```

Final ZIP:

```text
TeamName_CodefestDatathon2026.zip
```

---

# Reproducibility

The final notebooks and source code should be executable and capable of reproducing the reported results.

All preprocessing, feature engineering, training, evaluation, and prediction steps should therefore be documented clearly.

---

# Competition

**SLIIT Codefest Datathon 2026**  
**Urban Flow Analytics Data Challenge**

---

## Team

| Member | Responsibility |
|---|---|
| Member 1 | Data Cleaning, EDA & Feature Engineering |
| Member 2 | Fare & Trip-Time Prediction |
| Member 3 | Demand Forecasting & Spatial Analytics |
| Member 4 | Dashboard, AI Assistant & Integration |

---

## Status

Development in progress.

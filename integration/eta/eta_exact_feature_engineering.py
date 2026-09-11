import numpy as np
import pandas as pd


# ==============================
# add_history_features
# ==============================

def add_history_features(
    current,
    history
):

    current = current.copy()

    global_mean = (
        history[
            "trip_duration_minutes"
        ]
        .mean()
    )

    global_median = (
        history[
            "trip_duration_minutes"
        ]
        .median()
    )

    current[
        "global_mean_duration"
    ] = global_mean

    current[
        "global_median_duration"
    ] = global_median


    # --------------------------------------------------------
    # OD HISTORY
    # --------------------------------------------------------

    od = (
        history
        .groupby(
            [
                "origin_loc_id",
                "dest_loc_id"
            ]
        )["trip_duration_minutes"]
        .agg([
            "count",
            "mean",
            "median"
        ])
        .reset_index()
        .rename(columns={
            "count":
                "od_trip_count",

            "mean":
                "od_mean_duration",

            "median":
                "od_median_duration"
        })
    )

    current = current.merge(
        od,
        on=[
            "origin_loc_id",
            "dest_loc_id"
        ],
        how="left"
    )


    # --------------------------------------------------------
    # OD + HOUR HISTORY
    # --------------------------------------------------------

    od_hour = (
        history
        .groupby(
            [
                "origin_loc_id",
                "dest_loc_id",
                "pickup_hour"
            ]
        )["trip_duration_minutes"]
        .agg([
            "count",
            "mean",
            "median"
        ])
        .reset_index()
        .rename(columns={
            "count":
                "od_hour_count",

            "mean":
                "od_hour_mean_duration",

            "median":
                "od_hour_median_duration"
        })
    )

    current = current.merge(
        od_hour,
        on=[
            "origin_loc_id",
            "dest_loc_id",
            "pickup_hour"
        ],
        how="left"
    )


    # --------------------------------------------------------
    # ORIGIN + HOUR
    # --------------------------------------------------------

    origin_hour = (
        history
        .groupby(
            [
                "origin_loc_id",
                "pickup_hour"
            ]
        )["trip_duration_minutes"]
        .agg([
            "count",
            "median"
        ])
        .reset_index()
        .rename(columns={
            "count":
                "origin_hour_count",

            "median":
                "origin_hour_median_duration"
        })
    )

    current = current.merge(
        origin_hour,
        on=[
            "origin_loc_id",
            "pickup_hour"
        ],
        how="left"
    )


    # --------------------------------------------------------
    # DESTINATION + HOUR
    # --------------------------------------------------------

    dest_hour = (
        history
        .groupby(
            [
                "dest_loc_id",
                "pickup_hour"
            ]
        )["trip_duration_minutes"]
        .agg([
            "count",
            "median"
        ])
        .reset_index()
        .rename(columns={
            "count":
                "dest_hour_count",

            "median":
                "dest_hour_median_duration"
        })
    )

    current = current.merge(
        dest_hour,
        on=[
            "dest_loc_id",
            "pickup_hour"
        ],
        how="left"
    )


    # --------------------------------------------------------
    # GENERAL ORIGIN HISTORY
    # --------------------------------------------------------

    origin = (
        history
        .groupby(
            "origin_loc_id"
        )["trip_duration_minutes"]
        .agg([
            "count",
            "median"
        ])
        .reset_index()
        .rename(columns={
            "count":
                "origin_trip_count",

            "median":
                "origin_median_duration"
        })
    )

    current = current.merge(
        origin,
        on="origin_loc_id",
        how="left"
    )


    # --------------------------------------------------------
    # GENERAL DESTINATION HISTORY
    # --------------------------------------------------------

    dest = (
        history
        .groupby(
            "dest_loc_id"
        )["trip_duration_minutes"]
        .agg([
            "count",
            "median"
        ])
        .reset_index()
        .rename(columns={
            "count":
                "dest_trip_count",

            "median":
                "dest_median_duration"
        })
    )

    current = current.merge(
        dest,
        on="dest_loc_id",
        how="left"
    )


    # --------------------------------------------------------
    # MISSING-HISTORY FLAGS
    # --------------------------------------------------------

    current[
        "od_median_duration_missing"
    ] = (
        current[
            "od_median_duration"
        ]
        .isna()
        .astype("int8")
    )

    current[
        "od_hour_median_duration_missing"
    ] = (
        current[
            "od_hour_median_duration"
        ]
        .isna()
        .astype("int8")
    )

    current[
        "origin_hour_median_duration_missing"
    ] = (
        current[
            "origin_hour_median_duration"
        ]
        .isna()
        .astype("int8")
    )

    current[
        "dest_hour_median_duration_missing"
    ] = (
        current[
            "dest_hour_median_duration"
        ]
        .isna()
        .astype("int8")
    )


    # --------------------------------------------------------
    # FALLBACKS
    # --------------------------------------------------------

    duration_cols = [
        "od_mean_duration",
        "od_median_duration",
        "od_hour_mean_duration",
        "od_hour_median_duration",
        "origin_hour_median_duration",
        "dest_hour_median_duration",
        "origin_median_duration",
        "dest_median_duration"
    ]

    for col in duration_cols:

        current[col] = (
            current[col]
            .fillna(global_median)
        )


    count_cols = [
        "od_trip_count",
        "od_hour_count",
        "origin_hour_count",
        "dest_hour_count",
        "origin_trip_count",
        "dest_trip_count"
    ]

    for col in count_cols:

        current[col] = (
            current[col]
            .fillna(0)
        )


    # --------------------------------------------------------
    # BAYESIAN SHRINKAGE / SMOOTHING
    # --------------------------------------------------------

    alpha = 20

    current[
        "od_smoothed_duration"
    ] = (
        current["od_trip_count"]
        * current["od_mean_duration"]
        + alpha * global_mean
    ) / (
        current["od_trip_count"]
        + alpha
    )


    current[
        "od_hour_smoothed_duration"
    ] = (
        current["od_hour_count"]
        * current["od_hour_mean_duration"]
        + alpha * global_mean
    ) / (
        current["od_hour_count"]
        + alpha
    )


    # --------------------------------------------------------
    # LOG COUNTS
    # --------------------------------------------------------

    for col in count_cols:

        current[
            "log_" + col
        ] = np.log1p(
            current[col]
        ).astype("float32")


    return current

"""Unit tests for Python UrbanFlow AI Mobility Assistant."""

import unittest
from datetime import datetime, timezone
from pathlib import Path

from ai_assistant.assistant import answer_question, extract_intent, load_assistant_data


class TestAssistant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load_assistant_data()
        cls.clock = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)

    def test_demand_forecast_variations(self):
        # 1. Peak tomorrow around 8 AM
        ans = answer_question("What areas could be peak tomorrow around 8 AM?", self.data, now=self.clock)
        self.assertEqual(ans["intent"], "demand_forecast")
        self.assertEqual(ans["status"], "ok")
        self.assertEqual(ans["parameters"]["date"], "2026-09-12")
        self.assertEqual(ans["parameters"]["hour"], 8)
        self.assertTrue(len(ans["items"]) <= 5)
        self.assertIn("historical totals", ans["source"])

        # 2. Where will demand be high tomorrow morning
        ans2 = answer_question("Where will demand be high tomorrow morning?", self.data, now=self.clock)
        self.assertEqual(ans2["intent"], "demand_forecast")
        self.assertEqual(ans2["status"], "ok")
        self.assertEqual(ans2["parameters"]["period"], "Morning")

        # 3. Best zones for drivers around 8 (clarification needed for AM/PM)
        ans3 = answer_question("Best zones for drivers around 8?", self.data, now=self.clock)
        self.assertEqual(ans3["intent"], "demand_forecast")
        self.assertEqual(ans3["status"], "clarification")
        self.assertIn("AM or PM", ans3["insight"])

        # 4. Where should drivers position in the morning (historical positioning)
        ans4 = answer_question("Where should drivers position in the morning?", self.data, now=self.clock)
        self.assertEqual(ans4["intent"], "demand_forecast")
        self.assertEqual(ans4["status"], "ok")
        self.assertEqual(ans4["heading"], "Driver positioning · historical pattern")

    def test_historical_hotspots(self):
        ans = answer_question("Which zones are busiest at night?", self.data, now=self.clock)
        self.assertEqual(ans["intent"], "historical_hotspots")
        self.assertEqual(ans["status"], "ok")
        self.assertEqual(ans["parameters"]["period"], "Night")
        self.assertIn("JFK Airport: 689,318 pickups", ans["items"][0])

        ans2 = answer_question("Top pickup zones", self.data, now=self.clock)
        self.assertEqual(ans2["intent"], "historical_hotspots")
        self.assertEqual(ans2["status"], "ok")
        self.assertTrue(len(ans2["items"]) <= 5)

    def test_od_flows(self):
        ans = answer_question("What are the strongest evening movements?", self.data, now=self.clock)
        self.assertEqual(ans["intent"], "od_flows")
        self.assertEqual(ans["status"], "ok")
        self.assertEqual(ans["parameters"]["period"], "Evening")
        self.assertTrue(any("Upper East Side" in item for item in ans["items"]))

        ans2 = answer_question("Show morning OD corridors from zone 236", self.data, now=self.clock)
        self.assertEqual(ans2["intent"], "od_flows")
        self.assertEqual(ans2["status"], "ok")
        self.assertEqual(ans2["parameters"]["origin"], 236)

    def test_zone_clusters(self):
        ans = answer_question("Show similar zone groups", self.data, now=self.clock)
        self.assertEqual(ans["intent"], "zone_clusters")
        self.assertEqual(ans["status"], "ok")
        self.assertTrue(len(ans["items"]) > 0)

        ans2 = answer_question("Which cluster is JFK Airport in?", self.data, now=self.clock)
        self.assertEqual(ans2["intent"], "zone_clusters")
        self.assertEqual(ans2["status"], "ok")
        self.assertEqual(ans2["parameters"]["zone"], 132)
        self.assertTrue(any("JFK Airport" in item for item in ans2["items"]))

    def test_fare_prediction(self):
        ans_missing = answer_question("How much will the fare cost?", self.data, now=self.clock)
        self.assertEqual(ans_missing["intent"], "fare_prediction")
        self.assertEqual(ans_missing["status"], "clarification")
        self.assertIn("origin zone", ans_missing["insight"])

        ans_full = answer_question("Fare from zone 161 to zone 132 tomorrow at 8 AM provider 1", self.data, now=self.clock)
        self.assertEqual(ans_full["intent"], "fare_prediction")
        self.assertEqual(ans_full["status"], "ok")
        self.assertIn("$", ans_full["items"][0])

    def test_eta_prediction(self):
        ans_missing = answer_question("How long will a trip take?", self.data, now=self.clock)
        self.assertEqual(ans_missing["intent"], "eta_prediction")
        self.assertEqual(ans_missing["status"], "clarification")

        ans_full = answer_question("ETA from Midtown Center to JFK Airport tomorrow at 8 AM provider 1", self.data, now=self.clock)
        self.assertEqual(ans_full["intent"], "eta_prediction")
        self.assertEqual(ans_full["status"], "ok")
        self.assertIn("minutes", ans_full["items"][0])

    def test_model_performance(self):
        ans_eta = answer_question("How accurate is our ETA model?", self.data, now=self.clock)
        self.assertEqual(ans_eta["intent"], "model_performance")
        self.assertEqual(ans_eta["status"], "ok")
        self.assertTrue(any("MAE:" in item for item in ans_eta["items"]))

        ans_fare = answer_question("Fare model performance", self.data, now=self.clock)
        self.assertEqual(ans_fare["intent"], "model_performance")
        self.assertEqual(ans_fare["status"], "ok")
        self.assertTrue(any("MAE:" in item for item in ans_fare["items"]))

        ans_demand = answer_question("Show demand RMSE", self.data, now=self.clock)
        self.assertEqual(ans_demand["intent"], "model_performance")
        self.assertEqual(ans_demand["status"], "ok")
        self.assertTrue(any("RMSE:" in item for item in ans_demand["items"]))

    def test_data_quality(self):
        ans = answer_question("Data quality summary", self.data, now=self.clock)
        self.assertEqual(ans["intent"], "data_quality")
        self.assertEqual(ans["status"], "ok")
        self.assertTrue(any("Daily records checked" in item for item in ans["items"]))

    def test_overview(self):
        ans = answer_question("Give me a revenue overview", self.data, now=self.clock)
        self.assertEqual(ans["intent"], "overview")
        self.assertEqual(ans["status"], "ok")
        self.assertTrue(any("Trips:" in item for item in ans["items"]))
        self.assertTrue(any("Base fare revenue:" in item for item in ans["items"]))

    def test_unsupported_and_ambiguous(self):
        ans_joke = answer_question("Tell me a joke", self.data, now=self.clock)
        self.assertEqual(ans_joke["intent"], "unsupported")
        self.assertEqual(ans_joke["status"], "unsupported")

        ans_ambig = answer_question("Fare and ETA prediction", self.data, now=self.clock)
        self.assertEqual(ans_ambig["intent"], "ambiguous")
        self.assertEqual(ans_ambig["status"], "clarification")


if __name__ == "__main__":
    unittest.main()

from argus.eval import Scenario, _aggregate_scenario, _matched


def test_matched_requires_exact_ip_match() -> None:
    assert _matched("139.198.18.205", ["139.198.18.205"]) is True
    assert _matched("139.198.18.205", ["x139.198.18.205x"]) is False


def test_matched_allows_substring_for_named_indicators() -> None:
    assert _matched("iexeplorer.exe", ["C:\\Users\\bob\\AppData\\Local\\Temp\\iexeplorer.exe"])


def test_aggregate_scenario_reports_distribution_and_means() -> None:
    scenario = Scenario("demo", "alert", ["true_positive"], ["ioc"])
    runs = [
        {
            "verdict": "true_positive",
            "verdict_ok": True,
            "indicator_recall": 1.0,
            "grounding_precision": 1.0,
            "mitre_invalid": [],
        },
        {
            "verdict": "inconclusive",
            "verdict_ok": False,
            "indicator_recall": 0.5,
            "grounding_precision": 0.75,
            "mitre_invalid": ["T9999"],
        },
    ]

    agg = _aggregate_scenario(scenario, runs)

    assert agg["passes"] == 1
    assert agg["runs"] == 2
    assert agg["verdict_pass_rate"] == 0.5
    assert agg["verdict_distribution"] == {"true_positive": 1, "inconclusive": 1}
    assert agg["mean_indicator_recall"] == 0.75
    assert agg["mean_grounding_precision"] == 0.875
    assert agg["invalid_mitre"] == 1

export const overviewKPIs = [
  {
    label: "Total Trips",
    value: "44.3M",
    change: 4.8,
    compareLabel: "vs previous period",
    sparkline: [18, 20, 19, 22, 23, 26, 29, 28, 31, 33, 35, 34],
  },
  {
    label: "Total Revenue",
    value: "$948.0M",
    change: 6.2,
    compareLabel: "vs previous period",
    sparkline: [26, 27, 28, 30, 32, 33, 34, 37, 38, 40, 41, 44],
  },
  {
    label: "Average Fare",
    value: "$21.40",
    change: 1.7,
    compareLabel: "vs previous period",
    sparkline: [18, 18, 17, 19, 20, 20, 21, 21, 22, 21, 22, 23],
  },
  {
    label: "Average Trip Duration",
    value: "18.6 min",
    lowerIsBetter: true,
    change: -2.1,
    compareLabel: "vs previous period",
    sparkline: [26, 25, 24, 23, 22, 22, 21, 20, 20, 19, 18, 17],
  },
];

export const overviewInsight = {
  variant: "opportunity",
  title: "High Evening Demand",
  evidence:
    "Demand in central and transit-connected zones rises materially between 5 PM and 8 PM, with pickup queues building ahead of the peak.",
  impact:
    "Potential passenger wait-time increase and higher cancellation risk if supply is not repositioned early.",
  action:
    "Stage additional drivers near the evening peak before 4:30 PM and monitor demand spikes in transit-linked zones.",
};

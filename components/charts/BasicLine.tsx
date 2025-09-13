// import * as chartjs from "npm:chart.js";
import { useEffect, useRef, useState } from "preact/hooks";
// todo: import and register just the things that we need
import Chart from "npm:chart.js/auto";
import { Attempt } from "../../lib/attempt_store.ts";
import dayjs from "dayjs";

export function toDataSet(params: {
  attempts: Attempt[];
  duration: "1W" | "1M" | "1Y"; // | "ALL";
}): {
  labels: string[];
  dataset: number[];
} {
  const { attempts, duration } = params;
  if (duration === "1W") {
    const last7Days = new Array(7).fill(null).map((_, i) =>
      dayjs().subtract(i, "day").format("MM/DD")
    ).reverse();

    const grouping = last7Days.reduce((prev, date) => {
      prev[date] = [];
      return prev;
    }, {} as Record<string, Attempt[]>);

    attempts.forEach((attempt) => {
      const day = dayjs(attempt.timestamp_submitted).format("MM/DD");
      if (day in grouping) {
        grouping[day].push(attempt);
      }
    });

    return {
      labels: last7Days,
      dataset: Object.values(grouping).map((attempts) => attempts.length),
    };
  }

  if (duration === "1M") {
    const dates = new Array(6).fill(null).map((_, i) => {
      return dayjs().subtract((i + 1) * 5, "day").toISOString();
    }).reverse();

    const grouping = dates.reduce((prev, date) => {
      prev[date] = {
        date: dayjs(date).format("MM/DD"),
        attempts: [],
      };
      return prev;
    }, {} as Record<string, { date: string; attempts: Attempt[] }>);

    attempts.forEach((attempt) => {
      const targetGroup = Object.keys(grouping).find((entry) => {
        const start = dayjs(entry);
        const end = start.add(5, "day");
        const attempt_submitted = dayjs(attempt.timestamp_submitted);

        return (attempt_submitted.isAfter(start) ||
          attempt_submitted.isSame(start)) &&
          (attempt_submitted.isBefore(end) || attempt_submitted.isSame(end));
      });

      if (targetGroup) {
        grouping[targetGroup].attempts.push(attempt);
      }
    });

    const labels = Object.entries(grouping).map(([_, value]) => {
      return value.date;
    });

    return {
      labels,
      dataset: Object.values(grouping).map((entry) => entry.attempts.length),
    };
  }

  if (duration === "1Y") {
    const dates = new Array(12).fill(null).map((_, i) => {
      return dayjs().subtract(i, "month").toISOString();
    }).reverse();

    const grouping = dates.reduce((prev, date) => {
      prev[date] = {
        date: dayjs(date).format("MM/YY"),
        attempts: [],
      };
      return prev;
    }, {} as Record<string, { date: string; attempts: Attempt[] }>);

    attempts.forEach((attempt) => {
      const targetGroup = Object.keys(grouping).find((entry) => {
        const start = dayjs(entry);
        const end = start.add(1, "month");
        const attempt_submitted = dayjs(attempt.timestamp_submitted);

        return (attempt_submitted.isAfter(start) ||
          attempt_submitted.isSame(start)) &&
          attempt_submitted.isBefore(end);
      });
      if (targetGroup) {
        grouping[targetGroup].attempts.push(attempt);
      }
    });

    const labels = Object.entries(grouping).map(([_, value]) => {
      return value.date;
    });

    return {
      labels,
      dataset: Object.values(grouping).map((entry) => entry.attempts.length),
    };
  }

  if (duration === "ALL") {
    throw new Error("not implemented");
  }

  return {
    labels: [],
    dataset: [],
  };
}

function getChartData(attempts: Attempt[], selectedDuration: Duration) {
  const totalAttemptsData = toDataSet({
    attempts,
    duration: selectedDuration,
  });

  const successfulAttemptsData = toDataSet({
    attempts: attempts.filter((attempt) => attempt.is_correct),
    duration: selectedDuration,
  });

  const failedAttemptsData = toDataSet({
    attempts: attempts.filter((attempt) => !attempt.is_correct),
    duration: selectedDuration,
  });
  return {
    labels: totalAttemptsData.labels,
    datasets: [
      {
        label: "successful",
        data: successfulAttemptsData.dataset,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderWidth: 2,

        tension: 0.4,
      },
      {
        label: "failed",
        data: failedAttemptsData.dataset,
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        borderWidth: 2,

        tension: 0.4,
      },
      {
        label: "total",
        data: totalAttemptsData?.dataset,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,

        tension: 0.4,
      },
    ],
  };
}

const durations = ["1W", "1M", "1Y"] as const;
type Duration = typeof durations[number];

export default function BasicLine(props: { attempts: Attempt[] }) {
  const { attempts } = props;
  console.log(attempts);
  const [selectedDuration, setSelectedDuration] = useState<Duration>("1W");
  const [chart, setChart] = useState<
    Chart<"line", number[] | undefined, string>
  >();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const chartData = getChartData(attempts, selectedDuration);

    const chart = new Chart(ref.current, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: chartData.datasets,
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "Questions answered over time",
          },
          legend: {
            display: true,
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });

    if (chart) {
      chart.data.labels;
      chart.update();
    }
    setChart(chart);
  }, [ref]);

  useEffect(() => {
    if (!chart) {
      return;
    }

    const chartData = getChartData(attempts, selectedDuration);
    chart.data.labels = chartData.labels;
    chart.data.datasets = chartData.datasets;
    chart.update();
  }, [selectedDuration]);

  return (
    <>
      <canvas ref={ref}></canvas>
      <div role="tablist" className="tabs">
        {durations.map((duration, i) => {
          const tabActive = selectedDuration === duration && "tab-active" || "";
          return (
            <a
              key={i}
              role="tab"
              className={`tab ${tabActive}`}
              onClick={() => setSelectedDuration(duration)}
            >
              {duration}
            </a>
          );
        })}
      </div>
    </>
  );
}

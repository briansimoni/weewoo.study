// import * as chartjs from "npm:chart.js";
import { useEffect, useRef, useState } from "preact/hooks";
// todo: import and register just the things that we need
import Chart from "chart.js/auto";
import type { Attempt } from "../../lib/attempt_store.ts";
// Not dayjs: islands can't load it under the dev server (see lib/dates.ts).
import {
  addDays,
  addMonths,
  formatMonthDay,
  formatMonthYear,
} from "../../lib/dates.ts";

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
      formatMonthDay(addDays(new Date(), -i))
    ).reverse();

    const grouping = last7Days.reduce((prev, date) => {
      prev[date] = [];
      return prev;
    }, {} as Record<string, Attempt[]>);

    attempts.forEach((attempt) => {
      const day = formatMonthDay(new Date(attempt.timestamp_submitted));
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
      return addDays(new Date(), -(i + 1) * 5).toISOString();
    }).reverse();

    const grouping = dates.reduce((prev, date) => {
      prev[date] = {
        date: formatMonthDay(new Date(date)),
        attempts: [],
      };
      return prev;
    }, {} as Record<string, { date: string; attempts: Attempt[] }>);

    attempts.forEach((attempt) => {
      const targetGroup = Object.keys(grouping).find((entry) => {
        const start = new Date(entry).getTime();
        const end = addDays(new Date(entry), 5).getTime();
        const submitted = new Date(attempt.timestamp_submitted).getTime();

        return submitted >= start && submitted <= end;
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
      return addMonths(new Date(), -i).toISOString();
    }).reverse();

    const grouping = dates.reduce((prev, date) => {
      prev[date] = {
        date: formatMonthYear(new Date(date)),
        attempts: [],
      };
      return prev;
    }, {} as Record<string, { date: string; attempts: Attempt[] }>);

    attempts.forEach((attempt) => {
      const targetGroup = Object.keys(grouping).find((entry) => {
        const start = new Date(entry).getTime();
        const end = addMonths(new Date(entry), 1).getTime();
        const submitted = new Date(attempt.timestamp_submitted).getTime();

        return submitted >= start && submitted < end;
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

/** Chart colors from the active DaisyUI theme (hex, see static/styles.css). */
interface ChartColors {
  success: string;
  error: string;
  total: string;
  text: string;
  grid: string;
}

const FALLBACK_COLORS: ChartColors = {
  success: "#10b981",
  error: "#ef4444",
  total: "#3b82f6",
  text: "#666666",
  grid: "#0000001a",
};

function themeColors(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    success: read("--color-success", FALLBACK_COLORS.success),
    error: read("--color-error", FALLBACK_COLORS.error),
    total: read("--color-info", FALLBACK_COLORS.total),
    text: read("--color-base-content", FALLBACK_COLORS.text),
    grid: read("--color-base-300", FALLBACK_COLORS.grid),
  };
}

/** A hex color at about 10% opacity, for the area under a line. */
const tint = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}1a` : hex;

function getChartData(
  attempts: Attempt[],
  selectedDuration: Duration,
  colors: ChartColors = FALLBACK_COLORS,
) {
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
        borderColor: colors.success,
        backgroundColor: tint(colors.success),
        borderWidth: 2,

        tension: 0.4,
      },
      {
        label: "failed",
        data: failedAttemptsData.dataset,
        borderColor: colors.error,
        backgroundColor: tint(colors.error),
        borderWidth: 2,

        tension: 0.4,
      },
      {
        label: "total",
        data: totalAttemptsData?.dataset,
        borderColor: colors.total,
        backgroundColor: tint(colors.total),
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

    const colors = themeColors();
    const chartData = getChartData(attempts, selectedDuration, colors);

    const chart = new Chart(ref.current, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: chartData.datasets,
      },
      options: {
        responsive: true,
        // The wrapper sets the height, so a late resize (hydration, scrollbar)
        // changes only the width and never the page's height.
        maintainAspectRatio: false,
        color: colors.text,
        plugins: {
          title: {
            display: true,
            text: "Questions answered over time",
            color: colors.text,
          },
          legend: {
            display: true,
            position: "top",
            labels: { color: colors.text },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: colors.grid },
            ticks: { color: colors.text },
          },
          x: {
            grid: { color: colors.grid },
            ticks: { color: colors.text },
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

    const chartData = getChartData(attempts, selectedDuration, themeColors());
    chart.data.labels = chartData.labels;
    chart.data.datasets = chartData.datasets;
    chart.update();
  }, [selectedDuration]);

  return (
    <>
      <div class="relative h-64 sm:h-80">
        <canvas ref={ref}></canvas>
      </div>
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

// import * as chartjs from "npm:chart.js";
import { useEffect, useRef } from "preact/hooks";
// todo: import and register just the things that we need
import Chart from "npm:chart.js/auto";
import { Attempt } from "../../lib/attempt_store.ts";
import { CATEGORIES } from "../../lib/categories.ts";
import dayjs from "dayjs";

export default function BasicLine(props: { attempts: Attempt[] }) {
  const { attempts } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) {
      return;
    }

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

    const successfulAttempts = Object.values(grouping).map((attempts) => {
      return attempts.filter((attempt) => attempt.is_correct).length;
    });

    const failedAttempts = Object.values(grouping).map((attempts) => {
      return attempts.filter((attempt) => !attempt.is_correct).length;
    });

    const allAttempts = Object.values(grouping).map((attempts) => {
      return attempts.length;
    });

    console.log(last7Days);

    new Chart(ref.current, {
      type: "line",
      data: {
        labels: last7Days, // copy the array because chartjs complains
        datasets: [
          {
            label: "successful attempts",
            data: successfulAttempts,
            borderColor: "rgb(16, 185, 129)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 2,

            tension: 0.4,
          },
          {
            label: "failed attempts",
            data: failedAttempts,
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 2,

            tension: 0.4,
          },
          {
            label: "total attempts",
            data: allAttempts,
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,

            tension: 0.4,
          },
        ],
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
  }, [ref]);

  return (
    <>
      <canvas ref={ref}></canvas>
      <details className="dropdown">
        <summary className="btn m-1">open or close</summary>
        <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
          <li>
            <a>Item 1</a>
          </li>
          <li>
            <a>Item 2</a>
          </li>
        </ul>
      </details>
    </>
  );
}

import "./main.css";

import { h, render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  BarYOptions,
  DotOptions,
  MarkOptions,
  barY,
  dot,
  lineY,
  plot,
} from "@observablehq/plot";

import {
  Column,
  LineYOptionsWithHidePoints,
  MarkEditor,
  Mark,
} from "../components/marks";

const COLUMN_ID_TO_NAME = {
  id: "ID",
  data: "Data",
  model: "Model",
  gpu: "GPU",
  vllm_extra_args: "Extra vLLM args",
  duration: "Duration",
  completed_request_count: "Completed requests (per replica)",
  completed_request_rate: "QPS (per replica)",
  ttlt_mean: "Time to last token (seconds, mean)",
  ttlt_p50: "Time to last token (seconds, P50)",
  ttlt_p90: "Time to last token (seconds, P90)",
  ttlt_p95: "Time to last token (seconds, P95)",
  ttlt_p99: "Time to last token (seconds, P99)",
  ttft_mean: "Time to first token (seconds, mean)",
  ttft_p50: "Time to first token (seconds, P50)",
  ttft_p90: "Time to first token (seconds, P90)",
  ttft_p95: "Time to first token (seconds, P95)",
  ttft_p99: "Time to first token (seconds, P99)",
  itl_mean: "Inter-token latency (seconds, mean)",
  itl_p50: "Inter-token latency (seconds, P50)",
  itl_p90: "Inter-token latency (seconds, P90)",
  itl_p95: "Inter-token latency (seconds, P95)",
  itl_p99: "Inter-token latency (seconds, P99)",
  kv_cache_usage_mean: "Mean KV cache utilization (%)",
  tpot_median: "Server time per output token (seconds, P50)",
  prompt_tokens: "Number of tokens in prompt",
  generated_tokens: "Number of generated tokens",
};

const SAMPLE_VISUALIZATIONS = [
  {
    key: "Show all benchmarks",
    value:
      '/stopwatch/-/query?sql=select+*+from+benchmarks&_plot-mark=%7B"mark"%3A"dot"%2C"options"%3A%7B"x"%3A"completed_request_rate"%2C"y"%3A"ttlt_p50"%2C"fill"%3A"gpu"%2C"tip"%3Afalse%7D%7D',
  },
  {
    key: "Number of H100 GPUs vs. time-to-last-token for Llama-3.1-8B",
    value:
      '/stopwatch/-/query?sql=select+*+from+benchmarks+where+gpu+like+"H100%25"+and+%28vllm_extra_args+%3D+"%5B%5D"+or+vllm_extra_args+like+"%25tensor-parallel-size%25"%29+and+model+like+"%258B%25"+and+generated_tokens+%3D+128',
  },
  {
    key: "KV cache utilization vs. number of generated tokens on A100-80GB",
    value:
      '/stopwatch/-/query?sql=select+*+from+benchmarks+where+gpu+%3D+"A100-80GB"+and+vllm_extra_args+%3D+%27%5B%5D%27&_plot-mark=%7B"mark"%3A"line-y"%2C"options"%3A%7B"x"%3A"completed_request_rate"%2C"y"%3A"ttlt_p50"%2C"stroke"%3A"id"%2C"tip"%3Afalse%2C"hidePoints"%3Afalse%7D%7D',
  },
  {
    key: "GPU vs. P95 time-to-last-token",
    value:
      '/stopwatch/-/query?sql=select+*+from+benchmarks+where+generated_tokens+%3D+512+and+vllm_extra_args+%3D+%27%5B%5D%27&_plot-mark=%7B"mark"%3A"line-y"%2C"options"%3A%7B"x"%3A"completed_request_rate"%2C"y"%3A"ttlt_p50"%2C"stroke"%3A"id"%2C"tip"%3Afalse%2C"hidePoints"%3Afalse%7D%7D',
  },
  {
    key: "Enable-chunked-prefill and enforce-eager vs. P50 time-to-first-token",
    value:
      '/stopwatch/-/query?sql=select+*+from+benchmarks+where+gpu+%3D+"H100"+and+generated_tokens+%3D+128&_plot-mark=%7B"mark"%3A"bar-y"%2C"options"%3A%7B"x"%3A"vllm_extra_args"%2C"y"%3A"ttlt_p50"%2C"fill"%3A"vllm_extra_args"%2C"tip"%3Atrue%7D%7D',
  },
];

const getSampleVisualizations = (hostname: string, search: string) => {
  if (
    hostname === "jackcook--datasette.modal.run" &&
    search.includes("from+benchmarks")
  ) {
    return SAMPLE_VISUALIZATIONS;
  }

  return [];
};

function interestingColumns(columns: Column[], sample: { [key: string]: any }) {
  let x, y;
  for (const column of columns) {
    if (column.id === "rowid" || column.id === "id") continue;
    if (typeof sample[column.id] === "number") {
      if (x === undefined) {
        x = column;
      } else if (y === undefined) {
        y = column;
        break;
      }
    }
  }
  if (x === undefined) columns[0];
  if (y === undefined) columns[1];
  return [x, y];
}

interface Row {
  [key: string]: string | null | number | Date;
}

function PlotEditor(props: {
  data: any;
  columns: Column[];
  initialMarks?: { mark: Mark; options: MarkOptions }[];
}) {
  const { data, columns, initialMarks } = props;
  const init = useMemo(() => {
    const [x, y] = interestingColumns(columns, data[0]);
    return { mark: Mark.Dot, options: { x, y } } as {
      mark: Mark;
      options: MarkOptions;
    };
  }, []);
  const [marks, setMarks] = useState<{ mark: Mark; options: MarkOptions }[]>(
    props.initialMarks ?? [init]
  );

  function onAddMark() {
    let x, y;
    if (marks.length) {
      // @ts-ignore TODO: x/y dont exist in MarkOptions
      x = marks[marks.length - 1].options.x;
      // @ts-ignore TODO: x/y dont exist in MarkOptions
      y = marks[marks.length - 1].options.y;
    } else {
      [x, y] = interestingColumns(props.columns, props.data[0]);
    }

    setMarks([
      ...marks,
      {
        mark: Mark.Dot,
        // @ts-ignore TODO: x/y dont exist in MarkOptions
        options: { x, y },
      },
    ]);
  }

  return (
    <div>
      <div>
        <Preview data={props.data} marks={marks} />
      </div>
      <strong>Marks</strong>
      {marks.map((mark, idx) => (
        <MarkEditor
          columns={props.columns}
          initalMark={mark.mark}
          initialOptions={mark.options}
          onUpdate={(mark, options) => {
            setMarks(marks.map((d, i) => (i === idx ? { mark, options } : d)));
          }}
          onDelete={() => {
            setMarks(marks.filter((d, i) => i !== idx));
          }}
        />
      ))}
      <button onClick={onAddMark}>Add new visualization mark</button>
    </div>
  );
}

function Preview(props: {
  data: any;
  marks: { mark: Mark; options: MarkOptions }[];
}) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!target.current) return;
    const options = props.marks[0].options as
      | BarYOptions
      | DotOptions
      | LineYOptionsWithHidePoints;

    // TODO: Clean this up
    const minY = Math.min(
      0,
      props.data.reduce((min: number, row: any) => {
        return Math.min(
          min,
          ...props.marks.map((m) =>
            props.data.reduce(
              (markMin, row) => Math.min(markMin, row[m.options.y as string]),
              Infinity
            )
          )
        );
      }, Infinity)
    );

    const maxY = props.data.reduce((max: number, row: any) => {
      return Math.max(
        max,
        ...props.marks.map((m) =>
          props.data.reduce(
            (markMax, row) => Math.max(markMax, row[m.options.y as string]),
            -Infinity
          )
        )
      );
    }, -Infinity);

    const p = plot({
      width: 800,
      color: { legend: true },
      x: {
        label: COLUMN_ID_TO_NAME[options.x as string],
      },
      y: {
        label: COLUMN_ID_TO_NAME[options.y as string],
        domain: [minY, maxY],
      },
      marks: props.marks
        .map((m) => {
          // Tooltip options for all dot marks
          const tooltipOptions = {
            channels: {
              Model: "model",
              Data: "data",
              GPU: "gpu",
              Region: "region",
              "Extra vLLM args": "vllm_extra_args",
            },
            tip: {
              format: {
                fill: false,
                model: true,
                data: true,
                gpu: true,
                region: true,
                vllm_extra_args: true,
              },
            },
          };

          switch (m.mark) {
            case Mark.Dot:
              return [dot(props.data, { ...m.options, ...tooltipOptions })];
            case Mark.LineY:
              // Render an extra dot mark along with line marks
              const options = m.options as LineYOptionsWithHidePoints;
              return [
                lineY(
                  // Ensure lines are drawn from left to right
                  props.data.sort((a, b) =>
                    a[options.x as string] - b[options.x as string] < 0 ? 1 : -1
                  ),
                  options
                ),
                dot(props.data, {
                  x: options.x,
                  y: options.y,
                  r: options.hidePoints ? 0 : undefined,
                  fill: options.stroke,
                  ...tooltipOptions,
                }),
              ];
            case Mark.BarY:
              return [barY(props.data, m.options)];
          }
        })
        .flat(),
    });

    target.current.appendChild(p);
    return () => target.current.removeChild(p);
  }, [target, props.data, props.marks]);

  const url = (() => {
    const baseUrl = new URL(window.location.href);
    baseUrl.searchParams.delete("_plot-mark");
    for (const mark of props.marks) {
      baseUrl.searchParams.append("_plot-mark", JSON.stringify(mark));
    }
    return baseUrl.toString();
  })();

  return (
    <div>
      <div ref={target}></div>
      <a href={url}>Link to this plot</a>
    </div>
  );
}

function App(props: {
  rows: any[];
  next: string | null;
  columns: Column[];
  initialMarks?: { mark: Mark; options: MarkOptions }[];
}) {
  const { rows, next, columns, initialMarks } = props;

  const samples = getSampleVisualizations(
    window.location.hostname,
    window.location.search
  );

  return (
    <div className="datasette-plot">
      {samples.length > 0 && (
        <div className="preset-buttons-container">
          <div>Sample visualizations:</div>
          <div className="preset-buttons">
            <ul>
              {samples.map(({ key, value }) => (
                <li>
                  <a href={value}>{key}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <PlotEditor data={rows} columns={columns} initialMarks={initialMarks} />
      {next !== undefined ? (
        <div>Warning: not all table rows returned, only {rows.length} rows</div>
      ) : null}
    </div>
  );
}

interface DatasetteJsonResponse {
  rows: { [key: string]: null | string | number }[];
  ok: boolean;
  next: string | null;
  truncated: boolean;
}

export async function main() {
  const dataUrl = new URL(
    window.location.origin +
      window.location.pathname +
      ".json" +
      window.location.search
  );
  if (!dataUrl.searchParams.has("_size")) {
    dataUrl.searchParams.set("_size", "max");
  }

  const data = (await fetch(dataUrl).then((r) =>
    r.json()
  )) as DatasetteJsonResponse;

  const columns = Object.keys(data.rows[0]).map((id) => ({
    id,
    name: COLUMN_ID_TO_NAME[id] ?? id,
    numeric: data.rows.every((row) => typeof row[id] === "number"),
  }));

  // for now, any column named "date" should be converted to JS dates.
  const rows: Row[] = data.rows.slice();
  for (const column of columns) {
    if (column.id.toLowerCase() == "date") {
      for (const row of rows) {
        row[column.id] = new Date(row[column.id]);
      }
    }
  }

  const target =
    document.querySelector("form.sql") ||
    document.querySelector("form.filters");
  const root = target.insertAdjacentElement(
    "afterend",
    document.createElement("div")
  );

  const url = new URL(window.location.href);
  const initialMarks = url.searchParams.has("_plot-mark")
    ? url.searchParams.getAll("_plot-mark").map((d) => JSON.parse(d))
    : [
        {
          mark: Mark.LineY,
          options: {
            x: "completed_request_rate",
            y: "ttlt_p50",
            stroke: "group_id",
          },
        },
      ];
  render(
    <App
      initialMarks={initialMarks}
      rows={rows}
      columns={columns}
      next={data.next}
    />,
    root
  );
}

document.addEventListener("DOMContentLoaded", main);

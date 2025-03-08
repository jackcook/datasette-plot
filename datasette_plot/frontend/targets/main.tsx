import "./main.css";

import { h, render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { MarkOptions, barY, dot, lineY, plot } from "@observablehq/plot";

import {
  LineYOptionsWithHidePoints,
  MarkEditor,
  Mark,
} from "../components/marks";

function interestingColumns(columns: string[], sample: { [key: string]: any }) {
  let x, y;
  for (const column of columns) {
    if (column === "rowid" || column === "id") continue;
    if (typeof sample[column] === "number") {
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
  columns: string[];
  initialMarks?: { mark: Mark; options: MarkOptions }[];
}) {
  const init = useMemo(() => {
    const [x, y] = interestingColumns(props.columns, props.data[0]);
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
    const p = plot({
      width: 800,
      color: { legend: true },
      marks: props.marks
        .map((m) => {
          // Tooltip options for all dot marks
          const tooltipOptions = {
            channels: { gpu: "gpu" },
            tip: { format: { fill: false, gpu: true } },
          };

          switch (m.mark) {
            case Mark.Dot:
              return [dot(props.data, { ...m.options, ...tooltipOptions })];
            case Mark.LineY:
              // Render an extra dot mark along with line marks
              const options = m.options as LineYOptionsWithHidePoints;
              return [
                lineY(props.data, options),
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
  columns: string[];
  initialMarks?: { mark: Mark; options: MarkOptions }[];
}) {
  const { rows, next, columns, initialMarks } = props;

  return (
    <div className="datasette-plot">
      <PlotEditor data={rows} columns={columns} initialMarks={initialMarks} />
      {next !== null ? (
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
  const columns = Object.keys(data.rows[0]);

  // for now, any column named "date" should be converted to JS dates.
  const rows: Row[] = data.rows.slice();
  for (const column of columns) {
    if (column.toLowerCase() == "date") {
      for (const row of rows) {
        row[column] = new Date(row[column]);
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
            x: "requests_per_second",
            y: "ttlt_p50",
            stroke: "id",
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

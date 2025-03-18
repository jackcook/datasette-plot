import { h } from "preact";
import { useEffect, useId, useState } from "preact/hooks";
import {
  MarkOptions,
  DotOptions,
  BarYOptions,
  LineYOptions,
} from "@observablehq/plot";

export interface LineYOptionsWithHidePoints extends LineYOptions {
  hidePoints?: boolean;
}

export interface Column {
  id: string;
  name: string;
  numeric: boolean;
}

function ValueSelector(props: {
  required: boolean;
  title: string;
  columns?: Column[];
  value: string | boolean | undefined;
  setValue: (v: string | boolean | undefined) => void;
}) {
  const { title, columns, value, setValue, required } = props;
  const [show, setShow] = useState<boolean>(required || value !== undefined);

  useEffect(() => {
    if (!show && !value) setValue(undefined);
  }, [show, value]);

  return (
    <div className="channel-value-selector">
      <div
        className={"title-bar " + (!required ? "toggleable" : "")}
        onClick={!show ? () => setShow((d) => !d) : null}
      >
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div className="dp-title">{title}</div>
          <div>
            {(show || required) &&
              (columns ? (
                <select
                  value={value as string}
                  onChange={(e) =>
                    setValue((e.target as HTMLSelectElement).value)
                  }
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="checkbox"
                  checked={value as boolean}
                  onChange={(e) =>
                    setValue((e.target as HTMLInputElement).checked)
                  }
                />
              ))}
          </div>
        </div>
        <div
          onClick={() => {
            if (!required) setShow((d) => !d);
            // hiding this should remove any value
            if (show) {
              setValue(undefined);
            }
          }}
          style={{
            marginLeft: ".5rem",
            color: required ? "rgba(0,0,0,0)" : "",
          }}
        >
          {required ? "-" : show ? "-" : "+"}
        </div>
      </div>
    </div>
  );
}

function DotEditor(props: {
  columns: Column[];
  onUpdate: (options: DotOptions) => void;
  options: DotOptions;
}) {
  const { columns, onUpdate, options } = props;

  const [x, setX] = useState<string>(options.x as string);
  const [y, setY] = useState<string>(options.y as string);
  const [fill, setFill] = useState<string>(options.fill as string);

  useEffect(() => {
    onUpdate({ x, y, fill: fill ?? "group_id", tip: options.tip });
  }, [x, y, fill]);

  return (
    <div>
      <ValueSelector
        required={true}
        title="X"
        value={x}
        setValue={(v) => setX(v as string)}
        columns={columns.filter((c) => c.numeric)}
      />
      <ValueSelector
        required={true}
        title="Y"
        value={y}
        setValue={(v) => setY(v as string)}
        columns={columns.filter((c) => c.numeric)}
      />
      <ValueSelector
        required={false}
        title="Fill"
        value={fill}
        setValue={(v) => setFill(v as string)}
        columns={columns.filter((c) => !c.numeric)}
      />
    </div>
  );
}
function BarEditor(props: {
  columns: Column[];
  onUpdate: (options: BarYOptions) => void;
  options: BarYOptions;
}) {
  const { columns, onUpdate, options } = props;

  const [x, setX] = useState<string>(options.x as string);
  const [y, setY] = useState<string>(options.y as string);
  const [fill, setFill] = useState<string>(options.fill as string);

  useEffect(() => {
    onUpdate({ x, y, fill, tip: true });
  }, [x, y, fill]);

  return (
    <div>
      <ValueSelector
        required={true}
        title="X"
        value={x}
        setValue={(v) => setX(v as string)}
        columns={columns.filter((c) => !c.numeric)}
      />
      <ValueSelector
        required={true}
        title="Y"
        value={y}
        setValue={(v) => setY(v as string)}
        columns={columns.filter((c) => c.numeric)}
      />
      <ValueSelector
        required={false}
        title="Fill"
        value={fill}
        setValue={(v) => setFill(v as string)}
        columns={columns.filter((c) => !c.numeric)}
      />
    </div>
  );
}

function LineYEditor(props: {
  columns: Column[];
  onUpdate: (options: LineYOptionsWithHidePoints) => void;
  options: LineYOptionsWithHidePoints;
}) {
  const { columns, onUpdate, options } = props;

  const [x, setX] = useState<string>(options.x as string);
  const [y, setY] = useState<string>(options.y as string);
  const [hidePoints, setHidePoints] = useState<boolean>(
    options.hidePoints ?? false
  );

  useEffect(() => {
    onUpdate({ x, y, stroke: "group_id", tip: false, hidePoints });
  }, [x, y, hidePoints]);

  return (
    <div>
      <ValueSelector
        required={true}
        title="X"
        value={x}
        setValue={(v) => setX(v as string)}
        columns={columns.filter((c) => c.numeric)}
      />
      <ValueSelector
        required={true}
        title="Y"
        value={y}
        setValue={(v) => setY(v as string)}
        columns={columns.filter((c) => c.numeric)}
      />
      <ValueSelector
        required={true}
        title="Hide points"
        value={hidePoints}
        setValue={(v) => setHidePoints(v as boolean)}
      />
    </div>
  );
}

export const enum Mark {
  Dot = "dot",
  BarY = "bar-y",
  LineY = "line-y",
}

export function MarkEditor(props: {
  columns: Column[];
  initalMark: Mark;
  initialOptions: MarkOptions;
  onUpdate: (m: Mark, o: MarkOptions) => void;
  onDelete: () => void;
}) {
  const { columns, initalMark, initialOptions, onUpdate, onDelete } = props;

  let [mark, setMark] = useState<Mark>(initalMark);
  let [options, setOptions] = useState<MarkOptions>(initialOptions);

  useEffect(() => {
    onUpdate(mark, options);
  }, [mark, options]);

  function render() {
    switch (mark) {
      case Mark.Dot:
        return (
          <DotEditor
            columns={columns}
            onUpdate={setOptions}
            options={options}
          />
        );
      case Mark.BarY:
        return (
          <BarEditor
            columns={columns}
            onUpdate={setOptions}
            options={options}
          />
        );
      case Mark.LineY:
        return (
          <LineYEditor
            columns={columns}
            onUpdate={setOptions}
            options={options}
          />
        );
    }
  }
  return (
    <div className="mark-editor">
      <div className="mark-editor-header">
        <div>
          <select
            value={mark}
            onChange={(e) =>
              setMark((e.target as HTMLSelectElement).value as Mark)
            }
          >
            <option value={Mark.Dot}>Dot</option>
            <option value={Mark.BarY}>Bar (y)</option>
            <option value={Mark.LineY}>Line (y)</option>
          </select>
        </div>
        <div>
          <button className="delete-mark" onClick={onDelete}>
            Delete mark
          </button>
        </div>
      </div>
      <div>{render()}</div>
    </div>
  );
}

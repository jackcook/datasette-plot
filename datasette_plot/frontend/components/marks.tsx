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

function ChannelValueSelector(props: {
  required: boolean;
  title: string;
  columns: string[];
  value: string | undefined;
  setValue: (v: string | undefined) => void;
}) {
  const { title, columns, value, setValue, required } = props;
  const [show, setShow] = useState<boolean>(
    props.required || value !== undefined
  );

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
            {(show || required) && (
              <select
                value={value}
                onChange={(e) =>
                  setValue((e.target as HTMLSelectElement).value)
                }
              >
                {columns.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
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

function Checkbox(props: {
  required: boolean;
  title: string;
  value: boolean;
  setValue: (v: boolean | undefined) => void;
}) {
  const { title, required, value, setValue } = props;
  const [show, setShow] = useState<boolean>(required || value);

  useEffect(() => {
    if (!show && !value) setValue(false);
  }, [show, value]);

  return (
    <div className="channel-value-selector">
      <div className="title-bar">
        <div style="display: flex; justify-content: space-between; width: 100%;">
          <div className="dp-title">{title}</div>
          <div>
            {(show || required) && (
              <input
                type="checkbox"
                checked={value}
                onChange={(e) =>
                  setValue((e.target as HTMLInputElement).checked)
                }
              />
            )}
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
  columns: string[];
  onUpdate: (options: DotOptions) => void;
  options: DotOptions;
}) {
  const [x, setX] = useState<string>(props.options.x as string);
  const [y, setY] = useState<string>(props.options.y as string);
  const [tip, setTip] = useState<boolean>(props.options.tip as boolean);

  useEffect(() => {
    props.onUpdate({ x, y, fill: "id", tip });
  }, [x, y, tip]);

  const id = useId();

  return (
    <div>
      <ChannelValueSelector
        required={true}
        title="X"
        value={x}
        setValue={setX}
        columns={props.columns}
      />
      <ChannelValueSelector
        required={true}
        title="Y"
        value={y}
        setValue={setY}
        columns={props.columns}
      />
    </div>
  );
}
function BarEditor(props: {
  columns: string[];
  onUpdate: (options: BarYOptions) => void;
  options: BarYOptions;
}) {
  const [x, setX] = useState<string>(props.options.x as string);
  const [y, setY] = useState<string>(props.options.y as string);
  const [fill, setFill] = useState<string>(props.options.fill as string);
  useEffect(() => {
    props.onUpdate({ x, y, fill, tip: true });
  }, [x, y, fill]);
  return (
    <div>
      <ChannelValueSelector
        required={true}
        title="X"
        value={x}
        setValue={setX}
        columns={props.columns}
      />
      <ChannelValueSelector
        required={true}
        title="Y"
        value={y}
        setValue={setY}
        columns={props.columns}
      />
      <ChannelValueSelector
        required={false}
        title="Fill"
        value={fill}
        setValue={setFill}
        columns={props.columns}
      />
    </div>
  );
}
function LineYEditor(props: {
  columns: string[];
  onUpdate: (options: LineYOptionsWithHidePoints) => void;
  options: LineYOptionsWithHidePoints;
}) {
  const [x, setX] = useState<string>(props.options.x as string);
  const [y, setY] = useState<string>(props.options.y as string);
  const [hidePoints, setHidePoints] = useState<boolean>(
    props.options.hidePoints ?? false
  );
  useEffect(() => {
    props.onUpdate({ x, y, stroke: "id", tip: false, hidePoints });
  }, [x, y, hidePoints]);
  return (
    <div>
      <ChannelValueSelector
        required={true}
        title="X"
        value={x}
        setValue={setX}
        columns={props.columns}
      />
      <ChannelValueSelector
        required={true}
        title="Y"
        value={y}
        setValue={setY}
        columns={props.columns}
      />
      <Checkbox
        required={true}
        title="Hide points"
        value={hidePoints}
        setValue={setHidePoints}
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
  columns: string[];
  initalMark: Mark;
  initialOptions: MarkOptions;
  onUpdate: (m: Mark, o: MarkOptions) => void;
  onDelete: () => void;
}) {
  let [mark, setMark] = useState<Mark>(props.initalMark);
  let [options, setOptions] = useState<MarkOptions>(props.initialOptions);

  useEffect(() => {
    props.onUpdate(mark, options);
  }, [mark, options]);

  function render() {
    switch (mark) {
      case Mark.Dot:
        return (
          <DotEditor
            columns={props.columns}
            onUpdate={setOptions}
            options={options}
          />
        );
      case Mark.BarY:
        return (
          <BarEditor
            columns={props.columns}
            onUpdate={setOptions}
            options={options}
          />
        );
      case Mark.LineY:
        return (
          <LineYEditor
            columns={props.columns}
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
          <button className="delete-mark" onClick={props.onDelete}>
            Delete mark
          </button>
        </div>
      </div>
      <div>{render()}</div>
    </div>
  );
}

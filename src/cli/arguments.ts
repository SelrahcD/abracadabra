import { Selection } from "../editor/selection";

export type ParsedPosition = {
  path: string;
  selection: Selection;
};

const SINGLE = /^(.+):(\d+):(\d+)$/;
const RANGE = /^(.+):(\d+):(\d+)-(\d+):(\d+)$/;

export function parsePosition(raw: string): ParsedPosition {
  const range = RANGE.exec(raw);
  if (range) {
    const [, path, sl, sc, el, ec] = range;
    return {
      path,
      selection: new Selection(
        [toZeroIndexed(sl, "line"), toZeroIndexed(sc, "column")],
        [toZeroIndexed(el, "line"), toZeroIndexed(ec, "column")]
      )
    };
  }
  const single = SINGLE.exec(raw);
  if (single) {
    const [, path, l, c] = single;
    return {
      path,
      selection: Selection.cursorAt(
        toZeroIndexed(l, "line"),
        toZeroIndexed(c, "column")
      )
    };
  }
  throw new Error(
    `Invalid position '${raw}'. Expected 'path:line:col' or 'path:line:col-line:col'.`
  );
}

function toZeroIndexed(raw: string, kind: "line" | "column"): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Invalid ${kind} '${raw}': must be >= 1.`);
  }
  return n - 1;
}

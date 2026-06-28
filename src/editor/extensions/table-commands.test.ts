import { describe, expect, it } from "vitest";

import {
  deriveTableHeaders,
  type TableLike,
  type TableRowLike,
} from "./table-commands";

type CellName = "tableCell" | "tableHeader";

function cell(name: CellName) {
  return { type: { name } };
}
function row(...cells: CellName[]): TableRowLike {
  const nodes = cells.map(cell);
  return {
    childCount: nodes.length,
    firstChild: nodes[0] ?? null,
    forEach: (cb) => {
      for (const c of nodes) cb(c);
    },
  };
}
function table(...rows: TableRowLike[]): TableLike {
  return {
    childCount: rows.length,
    firstChild: rows[0] ?? null,
    forEach: (cb) => {
      for (const r of rows) cb(r);
    },
  };
}

describe("deriveTableHeaders", () => {
  it("reports neither for a null or empty table", () => {
    expect(deriveTableHeaders(null)).toEqual({
      headerRow: false,
      headerColumn: false,
    });
    expect(deriveTableHeaders(table())).toEqual({
      headerRow: false,
      headerColumn: false,
    });
  });

  it("detects a header row when the whole first row is headers", () => {
    const t = table(
      row("tableHeader", "tableHeader"),
      row("tableCell", "tableCell"),
    );
    expect(deriveTableHeaders(t)).toEqual({
      headerRow: true,
      headerColumn: false,
    });
  });

  it("detects a header column when every row starts with a header", () => {
    const t = table(
      row("tableHeader", "tableCell"),
      row("tableHeader", "tableCell"),
    );
    expect(deriveTableHeaders(t)).toEqual({
      headerRow: false,
      headerColumn: true,
    });
  });

  it("detects both when the first row is all headers and every row starts with one", () => {
    const t = table(
      row("tableHeader", "tableHeader"),
      row("tableHeader", "tableCell"),
    );
    expect(deriveTableHeaders(t)).toEqual({
      headerRow: true,
      headerColumn: true,
    });
  });

  it("reports neither for a plain table", () => {
    const t = table(
      row("tableCell", "tableCell"),
      row("tableCell", "tableCell"),
    );
    expect(deriveTableHeaders(t)).toEqual({
      headerRow: false,
      headerColumn: false,
    });
  });
});

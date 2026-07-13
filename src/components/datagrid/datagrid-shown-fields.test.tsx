import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DatagridView } from "@/data/datagrid-views";
import { datagridViewsKey } from "@/data/query-keys";
import type { Json } from "@/lib/database.types";
import type { DatagridField } from "@/lib/datagrid-schema";
import {
  parseDatagridViewConfig,
  selectVisibleFields,
} from "@/lib/datagrid-schema";
import { makeDatagridView } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import {
  pickCardVisibilityView,
  toggleVisibleFieldId,
} from "./datagrid-field-visibility";
import { DatagridShownFields } from "./datagrid-shown-fields";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

const DGID = "dg-1";
const VIEWID = "view-1";
const VIEWS_URL = "http://supabase.test/rest/v1/datagrid_views";

const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value));

const fields: DatagridField[] = [
  { id: "about", name: "About", type: "text", config: {} },
  { id: "age", name: "Age", type: "number", config: {} },
  { id: "hair", name: "Hair", type: "text", config: {} },
];

function seed(visibleFieldIds: string[] = []) {
  const client = createTestQueryClient();
  client.setQueryData(datagridViewsKey(DGID), [
    makeDatagridView({
      id: VIEWID,
      datagrid_id: DGID,
      is_default: true,
      config: asJson({
        layout: "gallery",
        filters: [],
        sorts: [],
        groupBy: null,
        visibleFieldIds,
        columnWidths: {},
      }),
    }),
  ]);
  return client;
}

beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("selectVisibleFields", () => {
  it("returns all fields when visibleFieldIds is empty", () => {
    expect(selectVisibleFields(fields, [])).toEqual(fields);
  });

  it("filters and orders by visibleFieldIds", () => {
    expect(
      selectVisibleFields(fields, ["hair", "about"]).map((f) => f.id),
    ).toEqual(["hair", "about"]);
  });
});

describe("toggleVisibleFieldId", () => {
  it("hides a field from an all-visible (empty) list", () => {
    expect(toggleVisibleFieldId(fields, [], "age")).toEqual(["about", "hair"]);
  });

  it("shows a previously hidden field", () => {
    expect(toggleVisibleFieldId(fields, ["about", "hair"], "age")).toEqual([
      "about",
      "age",
      "hair",
    ]);
  });
});

describe("pickCardVisibilityView", () => {
  it("prefers the default view", () => {
    const views = [
      makeDatagridView({ id: "v1", is_default: false }),
      makeDatagridView({ id: "v2", is_default: true }),
    ];
    expect(pickCardVisibilityView(views)?.id).toBe("v2");
  });
});

describe("DatagridShownFields", () => {
  it("hides a field on the default view for cards and embeds", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    let patched: Record<string, unknown> | undefined;
    server.use(
      http.patch(VIEWS_URL, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = seed();
    renderWithProviders(
      <DatagridShownFields datagridId={DGID} fields={fields} />,
      { client },
    );

    await user.click(screen.getByRole("button", { name: "Shown on cards" }));
    await user.click(screen.getByRole("button", { name: "Hide Age" }));

    await waitFor(() => {
      expect(patched?.config).toBeDefined();
    });
    const config = parseDatagridViewConfig(patched?.config);
    expect(config.cardVisibleFieldIds).toEqual(["about", "hair"]);

    const cached = client
      .getQueryData<DatagridView[]>(datagridViewsKey(DGID))
      ?.find((view) => view.id === VIEWID);
    expect(parseDatagridViewConfig(cached?.config).cardVisibleFieldIds).toEqual(
      ["about", "hair"],
    );
  });
});

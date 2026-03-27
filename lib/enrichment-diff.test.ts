import { describe, expect, it } from "vitest";
import { buildGeminiPreviewState } from "./gemini-enrichment-preview";
import { buildEnrichmentDiff, defaultFieldSelection } from "./enrichment-diff";

describe("enrichment diff utilities", () => {
  it("builds fixed field diffs and marks changed values", () => {
    const diff = buildEnrichmentDiff(
      {
        name: "Old Name",
        description: "Old desc",
      },
      {
        name: "New Name",
        description: "Old desc",
      },
      null,
    );

    const name = diff.find((item) => item.path === "name");
    const description = diff.find((item) => item.path === "description");
    expect(name?.changed).toBe(true);
    expect(description?.changed).toBe(false);
  });

  it("flattens dynamic fields into dynamic:path diff entries", () => {
    const diff = buildEnrichmentDiff(
      {
        geminiMappedFields: {
          attributes: { color: "red" },
        },
      },
      null,
      {
        attributes: { color: "blue", finish: "matte" },
      },
    );

    expect(diff.some((item) => item.path === "dynamic:attributes.color")).toBe(true);
    expect(diff.some((item) => item.path === "dynamic:attributes.finish")).toBe(true);
  });

  it("defaults field selection to changed fields only", () => {
    const diff = buildEnrichmentDiff(
      { name: "A" },
      { name: "B", description: "" },
      null,
    );
    const selected = defaultFieldSelection(diff);
    expect(selected.name).toBe(true);
    expect(selected.description).toBe(false);
  });

  it("builds preview state with media disabled by default", () => {
    const state = buildGeminiPreviewState({
      current: { name: "Old" },
      mappedFields: {
        name: "New",
        images: [{ url: "https://example.com/a.jpg", alt: "x" }],
      },
      dynamicFields: null,
    });

    expect(state.changedCount).toBe(1);
    expect(state.proposedImages).toEqual([]);
    expect(state.proposedDocuments).toEqual([]);
  });
});

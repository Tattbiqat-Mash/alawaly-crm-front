import { describe, expect, it } from "vitest";
import { fileName, isImagePath, mediaUrl } from "./media";

describe("mediaUrl", () => {
  it("sends stored paths through the media route, segment by segment", () => {
    expect(mediaUrl("projects/oasis/cover.jpg")).toBe("/bff/media/projects/oasis/cover.jpg");
    expect(mediaUrl("/projects/my file.jpg")).toBe("/bff/media/projects/my%20file.jpg");
  });

  it("keeps full URLs and ignores blanks", () => {
    expect(mediaUrl("https://cdn.example.test/a.jpg")).toBe("https://cdn.example.test/a.jpg");
    expect(mediaUrl("  ")).toBeNull();
    expect(mediaUrl(null)).toBeNull();
  });

  it("names files and spots images", () => {
    expect(fileName("docs/license.pdf")).toBe("license.pdf");
    expect(isImagePath("a/b.webp")).toBe(true);
    expect(isImagePath("docs/license.pdf")).toBe(false);
  });
});

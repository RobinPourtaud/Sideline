import { describe, expect, it } from "vitest";
import { channelUrl, imageUrl } from "../../src/youtube/media";

describe("YouTube asset boundaries", () => {
  it("accepts supported HTTPS images without broad host suffix matching", () => {
    expect(imageUrl("https://yt3.ggpht.com/avatar=s48")).toBe("https://yt3.ggpht.com/avatar=s48");
    expect(imageUrl("https://yt4.ggpht.com/avatar=s32")).toBe("https://yt4.ggpht.com/avatar=s32");
    expect(imageUrl("https://lh3.googleusercontent.com/sticker=w96")).toBe(
      "https://lh3.googleusercontent.com/sticker=w96",
    );
    expect(imageUrl("/s/gaming/emoji/example.png")).toContain("https://www.youtube.com/s/");
    for (const value of [
      "http://yt3.ggpht.com/a",
      "https://yt3.ggpht.com.evil.test/a",
      "https://evil.test/a",
      "data:image/png;base64,a",
      "javascript:alert(1)",
      "https://user:pass@yt3.ggpht.com/a",
      "https://yt3.ggpht.com:444/a",
      "https://www.youtube.com/watch?v=a",
      "https://www.gstatic.com/other/a",
      "https://yt3.ggpht.com/" + "x".repeat(2048),
    ])
      expect(imageUrl(value)).toBeUndefined();
  });
  it("accepts channel destinations and strips query tracking", () => {
    expect(channelUrl("/@viewer?feature=chat")).toBe("https://www.youtube.com/@viewer");
    expect(channelUrl("/channel/UCexample")).toBe("https://www.youtube.com/channel/UCexample");
    for (const value of [
      "/watch?v=a",
      "https://evil.test/@viewer",
      "javascript:alert(1)",
      "https://user:pass@www.youtube.com/@viewer",
      "/redirect?q=evil",
      "/@viewer/videos",
    ])
      expect(channelUrl(value)).toBeUndefined();
  });
});

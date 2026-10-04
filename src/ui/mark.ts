const namespace = "http://www.w3.org/2000/svg";

function node<K extends keyof SVGElementTagNameMap>(
  document: Document,
  tag: K,
  attributes: Record<string, string> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(namespace, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

function base(document: Document, size: number) {
  return node(document, "svg", {
    viewBox: `0 0 ${size} ${size}`,
    "aria-hidden": "true",
    focusable: "false",
    fill: "none",
  });
}

export function mark(document: Document): SVGSVGElement {
  const svg = base(document, 64);
  svg.classList.add("sideline-mark");
  svg.append(
    node(document, "path", {
      d: "M10 54c3-10 1-21 10-31C30 12 44 10 55 11c1 14-3 27-13 33-9 6-20 3-32 10Z",
      stroke: "currentColor",
      "stroke-width": "3.5",
      "stroke-linejoin": "round",
    }),
    node(document, "path", {
      d: "M19 43c8-10 16-7 25-18",
      stroke: "currentColor",
      "stroke-width": "3.5",
      "stroke-linecap": "round",
    }),
  );
  return svg;
}

export function settingsMark(document: Document): SVGSVGElement {
  const svg = base(document, 24);
  svg.append(
    node(document, "path", {
      d: "M4 7h8m4 0h4M4 17h4m4 0h8M12 4v6m-4 4v6",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }),
  );
  return svg;
}

export function birdMark(document: Document): SVGSVGElement {
  const svg = base(document, 64);
  const group = node(document, "g", {
    stroke: "currentColor",
    "stroke-width": "3",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });
  const body = node(document, "g", { class: "robin-body" });
  const tilt = node(document, "g", { transform: "rotate(-7 32 44)" });
  tilt.append(
    node(document, "path", {
      d: "M12 27l10 4c-1-10 4-18 12-18 8 0 13 6 12 13l6 3-7 4c-2 8-8 13-16 11-9-1-14-8-17-17Z",
    }),
    node(document, "path", { d: "M22 31c0 6 5 10 11 8" }),
    node(document, "path", { d: "M36.2 23q1.8-2.2 3.6 0", "stroke-width": "2.3" }),
  );
  body.append(tilt);
  group.append(
    node(document, "path", {
      class: "twig",
      d: "M15 53c13 1 24-1 35-6m-1 1c-1-6 2-10 7-11 0 6-3 10-7 11Z",
    }),
    node(document, "path", { d: "M30 45v7m7-8v7" }),
    body,
  );
  svg.append(group);
  return svg;
}

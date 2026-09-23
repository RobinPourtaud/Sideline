import birdSvg from "../assets/robin.svg?raw";
import sidelineSvg from "../assets/sideline.svg?raw";

function icon(document: Document, data: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", data);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

export function mark(document: Document): SVGSVGElement {
  const svg = brandMark(document, sidelineSvg);
  svg.classList.add("sideline-mark");
  return svg;
}

export function settingsMark(document: Document): SVGSVGElement {
  return icon(document, "M4 7h8m4 0h4M4 17h4m4 0h8M12 4v6m-4 4v6");
}

function brandMark(document: Document, source: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.querySelector("title")?.remove();
  return svg;
}

export function birdMark(document: Document): SVGSVGElement {
  return brandMark(document, birdSvg);
}

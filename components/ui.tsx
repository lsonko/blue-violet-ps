import React from "react";

// Brand mark + icon helpers, ported from the prototype.

export function logo(stroke: string, fill: string) {
  const petal = (rot: number) =>
    React.createElement("ellipse", {
      cx: 24,
      cy: 13,
      rx: 6.4,
      ry: 9.2,
      transform: `rotate(${rot} 24 24)`,
      fill,
      opacity: 0.92,
    });
  return React.createElement(
    "svg",
    { viewBox: "0 0 48 48", width: "100%", height: "100%" },
    petal(0),
    petal(72),
    petal(144),
    petal(216),
    petal(288),
    React.createElement("circle", {
      cx: 24,
      cy: 24,
      r: 5,
      fill: stroke === "#fff" ? "#fff" : "#F4C64B",
    })
  );
}

type IcExtra = Partial<{
  width: number;
  height: number;
  stroke: string;
}> &
  Record<string, unknown>;

export function ic(paths: string[], extra?: IcExtra) {
  return React.createElement(
    "svg",
    Object.assign(
      {
        width: 16,
        height: 16,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      },
      extra || {}
    ),
    paths.map((d, i) => React.createElement("path", { key: i, d }))
  );
}

const ICON_PATHS: Record<string, string[]> = {
  dashboard: ["M4 13h7V4H4zM13 20h7v-9h-7zM13 4v4h7V4zM4 20h7v-4H4z"],
  income: ["M12 2v20", "M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
  deductions: ["M20 12V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6", "M4 9h16", "M15 16l2 2 4-4"],
  cme: ["M22 10L12 5 2 10l10 5 10-5z", "M6 12v5c0 1 3 2.5 6 2.5s6-1.5 6-2.5v-5"],
  credentials: [
    "M15 3h4a2 2 0 0 1 2 2v4",
    "M21 15v4a2 2 0 0 1-2 2h-4",
    "M9 21H5a2 2 0 0 1-2-2v-4",
    "M3 9V5a2 2 0 0 1 2-2h4",
    "M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  ],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V1a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H23a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
  ],
};

export function iconFor(key: string, extra?: IcExtra) {
  return ic(ICON_PATHS[key], extra);
}

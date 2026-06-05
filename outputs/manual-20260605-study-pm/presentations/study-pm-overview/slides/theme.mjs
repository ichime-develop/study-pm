export const C = {
  paper: "#F7F2EA",
  ink: "#111827",
  navy: "#0F172A",
  soft: "#687386",
  muted: "#9AA3B2",
  line: "#D9D6CE",
  white: "#FFFFFF",
  blue: "#2563EB",
  blue2: "#DCE8FF",
  amber: "#D08A22",
  amber2: "#F3DFC1",
  green: "#14A76C",
  green2: "#DDF3E8",
  red: "#C94A3A",
};

export const font = {
  title: "Hiragino Sans",
  body: "Hiragino Sans",
  mono: "Aptos Mono",
};

export function bg(slide, ctx, fill = C.paper) {
  ctx.addShape(slide, { left: 0, top: 0, width: ctx.W, height: ctx.H, fill, line: ctx.line() });
}

export function text(slide, ctx, value, left, top, width, height, opts = {}) {
  return ctx.addText(slide, {
    text: value,
    left,
    top,
    width,
    height,
    fontSize: opts.size ?? 22,
    color: opts.color ?? C.ink,
    bold: opts.bold ?? false,
    typeface: opts.face ?? font.body,
    align: opts.align ?? "left",
    valign: opts.valign ?? "top",
    fill: opts.fill ?? "#00000000",
    line: opts.line ?? ctx.line(),
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
    name: opts.name,
  });
}

export function rect(slide, ctx, left, top, width, height, fill, opts = {}) {
  return ctx.addShape(slide, {
    left,
    top,
    width,
    height,
    fill,
    geometry: opts.geometry ?? "rect",
    line: opts.line ?? ctx.line(),
    name: opts.name,
  });
}

export function rule(slide, ctx, left, top, width, color = C.line, height = 1) {
  rect(slide, ctx, left, top, width, height, color);
}

export function kicker(slide, ctx, label, opts = {}) {
  const x = opts.x ?? 58;
  const y = opts.y ?? 46;
  rect(slide, ctx, x, y + 6, 10, 10, opts.color ?? C.blue, { name: `kicker-${label}-marker` });
  text(slide, ctx, label.toUpperCase().split("").join(" "), x + 22, y, 440, 22, {
    size: 9.5,
    color: opts.textColor ?? C.soft,
    bold: true,
    valign: "middle",
    name: `kicker-${label}-label`,
  });
}

export function title(slide, ctx, value, opts = {}) {
  text(slide, ctx, value, opts.x ?? 58, opts.y ?? 82, opts.w ?? 860, opts.h ?? 76, {
    size: opts.size ?? 36,
    color: opts.color ?? C.ink,
    bold: true,
    face: font.title,
  });
}

export function body(slide, ctx, value, left, top, width, height, opts = {}) {
  text(slide, ctx, value, left, top, width, height, {
    size: opts.size ?? 16,
    color: opts.color ?? C.soft,
    bold: opts.bold ?? false,
    valign: opts.valign ?? "top",
    insets: opts.insets ?? { left: 0, right: 0, top: 0, bottom: 0 },
  });
}

export function footer(slide, ctx, page, source = "Source: study-pm repository requirements, UI mock, and mock data") {
  rule(slide, ctx, 58, 682, 1110, C.line, 1);
  text(slide, ctx, source, 58, 690, 820, 15, { size: 7.8, color: C.soft });
  text(slide, ctx, String(page).padStart(2, "0"), 1176, 684, 48, 24, {
    size: 12,
    color: C.soft,
    bold: true,
    align: "right",
  });
}

export function node(slide, ctx, label, sub, left, top, width, height, opts = {}) {
  rect(slide, ctx, left, top, width, height, opts.fill ?? C.white, {
    line: opts.line ?? { style: "solid", fill: opts.stroke ?? C.line, width: 1 },
  });
  text(slide, ctx, label, left + 16, top + 14, width - 32, 24, {
    size: opts.labelSize ?? 16,
    color: opts.color ?? C.ink,
    bold: true,
  });
  if (sub) {
    body(slide, ctx, sub, left + 16, top + 42, width - 32, height - 52, {
      size: opts.subSize ?? 11.5,
      color: opts.subColor ?? C.soft,
    });
  }
}

export function arrow(slide, ctx, x1, y1, x2, y2, color = C.blue, thickness = 3) {
  const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
  if (horizontal) {
    rect(slide, ctx, Math.min(x1, x2), y1 - thickness / 2, Math.abs(x2 - x1), thickness, color);
    const dir = x2 >= x1 ? 1 : -1;
    rect(slide, ctx, x2 - (dir > 0 ? 0 : 10), y2 - 5, 10, 10, color);
  } else {
    rect(slide, ctx, x1 - thickness / 2, Math.min(y1, y2), thickness, Math.abs(y2 - y1), color);
    const dir = y2 >= y1 ? 1 : -1;
    rect(slide, ctx, x2 - 5, y2 - (dir > 0 ? 0 : 10), 10, 10, color);
  }
}

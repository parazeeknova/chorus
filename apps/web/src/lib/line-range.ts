interface LineRange {
  end: number;
  start: number;
}

const LINE_RANGE_REGEX = /#(\d+)(?:-(\d+))?$/;

export function extractLineRange(query: string): {
  cleanQuery: string;
  range: LineRange | null;
} {
  const match = query.match(LINE_RANGE_REGEX);
  if (!match) {
    return { cleanQuery: query, range: null };
  }

  const start = Number.parseInt(match[1], 10);
  const end = match[2] ? Number.parseInt(match[2], 10) : start;

  return {
    cleanQuery: query.slice(0, match.index),
    range: { start, end },
  };
}

export function removeLineRange(query: string): string {
  return query.replace(LINE_RANGE_REGEX, "");
}

export function formatLineRange(range: LineRange | null): string {
  if (!range) {
    return "";
  }
  if (range.start === range.end) {
    return `#${range.start}`;
  }
  return `#${range.start}-${range.end}`;
}

export function buildFileUrl(path: string, range?: LineRange | null): string {
  const url = `file://${path}`;
  if (range) {
    return `${url}?start=${range.start}&end=${range.end}`;
  }
  return url;
}

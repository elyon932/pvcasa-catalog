// Keeps a paginated CSS grid filled. The column count comes from auto-fill, so
// a fixed page size leaves gaps in the last row; rounding the visible slice up
// to whole rows keeps every rendered row complete.

export function gridColumnCount(container) {
  return Math.max(getComputedStyle(container).gridTemplateColumns.split(" ").length, 1);
}

export function rowAlignedCount(count, columns) {
  return Math.ceil(count / columns) * columns;
}

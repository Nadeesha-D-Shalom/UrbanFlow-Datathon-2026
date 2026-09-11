import { useMemo, useState } from "react";
import { EmptyState } from "../common/EmptyState";
export function DataTable({
  columns,
  rows,
  rowKey = "id",
  pageSize = 8,
  title = "Results",
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState({ key: null, direction: 1 });
  const filtered = useMemo(() => {
    const result = rows.filter((row) =>
      columns.some((c) =>
        String(row[c.key] ?? "")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    );
    if (sort.key)
      result.sort((a, b) => {
        const x = a[sort.key],
          y = b[sort.key];
        return (
          sort.direction *
          (typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x ?? "").localeCompare(String(y ?? ""), undefined, {
                numeric: true,
              }))
        );
      });
    return result;
  }, [rows, columns, query, sort]);
  const size = Math.max(1, pageSize),
    pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages - 1);
  return (
    <section className="analytics-card" aria-label={title}>
      <div className="table-toolbar">
        <strong>{title}</strong>
        <input
          type="search"
          aria-label={`Search ${title}`}
          placeholder="Search results..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
        />
      </div>
      {filtered.length ? (
        <div
          className="table-scroll"
          tabIndex="0"
          aria-label="Scrollable results"
        >
          <table className="data-table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.numeric ? "numeric" : ""}
                    aria-sort={
                      sort.key === c.key
                        ? sort.direction === 1
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {c.sortable === false ? (
                      c.label
                    ) : (
                      <button
                        onClick={() => {
                          setSort({
                            key: c.key,
                            direction: sort.key === c.key ? -sort.direction : 1,
                          });
                          setPage(0);
                        }}
                      >
                        {c.label}{" "}
                        <span aria-hidden="true">
                          {sort.key === c.key
                            ? sort.direction === 1
                              ? " \u2191"
                              : " \u2193"
                            : " \u2195"}
                        </span>
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice(current * size, (current + 1) * size)
                .map((row) => (
                  <tr key={row[rowKey]}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.numeric ? "numeric" : ""}>
                        {c.render
                          ? c.render(row[c.key], row)
                          : (row[c.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title={
            query
              ? "No matching trips were found."
              : "No data available for the selected filters."
          }
          description="Adjust your search or filter selection."
        />
      )}
      <div className="table-pagination">
        <span role="status">
          {filtered.length
            ? `${current * size + 1}-${Math.min((current + 1) * size, filtered.length)} of ${filtered.length}`
            : "0 results"}
        </span>
        <div>
          <button
            className="secondary-button"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            Previous
          </button>
          <button
            className="secondary-button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

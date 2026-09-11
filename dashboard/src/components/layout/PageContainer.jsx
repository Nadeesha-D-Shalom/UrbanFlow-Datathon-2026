export function PageContainer({ children, className = "" }) {
  return <div className={`page ${className}`}>{children}</div>;
}

/* UI primitives dùng chung — port CSS từ thiết kế dashboard đã duyệt */

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-line rounded-xl p-4 flex flex-col ${className}`}>
      {title && (
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted mb-3">
          {title}
        </h2>
      )}
      {/* Khi Card bị kéo giãn bằng chiều cao 1 thẻ khác cao hơn trong cùng hàng grid (vd Dashboard),
          nội dung căn giữa theo chiều dọc thay vì dồn lên trên để lại khoảng trống xấu bên dưới */}
      <div className="flex-1 flex flex-col justify-center">{children}</div>
    </div>
  );
}

const TAG_STYLE = {
  critical: "bg-critical text-white",
  warning: "bg-warn text-[#5b3c00]",
  good: "bg-good text-white",
  neutral: "bg-grid text-ink-2",
} as const;

export function Tag({
  children,
  sev = "neutral",
}: {
  children: React.ReactNode;
  sev?: keyof typeof TAG_STYLE;
}) {
  return (
    <span
      className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TAG_STYLE[sev]}`}
    >
      {children}
    </span>
  );
}

const DOT = {
  good: "var(--good)",
  warning: "var(--warning)",
  serious: "var(--serious)",
  critical: "var(--critical)",
  neutral: "var(--text-muted)",
} as const;

export function StatusPill({
  status,
  label,
}: {
  status: keyof typeof DOT;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: DOT[status] }} />
      {label}
    </span>
  );
}

export function Button({
  children,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "danger" }) {
  const styles = {
    default: "border border-line bg-surface hover:bg-page text-ink",
    primary: "bg-brand text-white hover:opacity-90",
    danger: "bg-critical text-white hover:opacity-90",
  };
  return (
    <button
      {...props}
      className={`text-[13px] font-semibold rounded-lg px-3.5 py-1.5 disabled:opacity-50 ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Input(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`w-full border border-line rounded-lg px-3 py-1.5 text-sm bg-page outline-none focus:border-brand ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full border border-line rounded-lg px-3 py-1.5 text-sm bg-page outline-none focus:border-brand ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full border border-line rounded-lg px-3 py-1.5 text-sm bg-page outline-none focus:border-brand ${props.className ?? ""}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ink-2 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="text-center py-10 text-muted">
      <div className="text-3xl mb-2">🗂️</div>
      <p className="font-medium text-ink-2">{title}</p>
      {sub && <p className="text-sm mt-1">{sub}</p>}
    </div>
  );
}

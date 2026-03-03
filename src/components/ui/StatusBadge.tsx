type StatusBadgeProps = {
  label: string;
  tone?:
    | "neutral"
    | "pending"
    | "progress"
    | "success"
    | "danger"
    | "orange"
    | "purple"
    | "blue"
    | "green"
    | "gray";
};

export default function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const toneClass =
    tone === "orange" || tone === "pending"
      ? "bg-yellow-100 text-yellow-700"
      : tone === "purple"
        ? "bg-purple-100 text-purple-700"
        : tone === "blue" || tone === "progress"
        ? "bg-blue-100 text-blue-700"
        : tone === "green" || tone === "success"
          ? "bg-emerald-100 text-emerald-700"
          : tone === "danger"
            ? "bg-red-100 text-red-700"
            : tone === "gray"
              ? "bg-gray-100 text-gray-700"
            : "bg-gray-100 text-gray-700";

  return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${toneClass}`}>{label}</span>;
}
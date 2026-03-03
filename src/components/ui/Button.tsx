type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  type = "button",
  className = "",
}: ButtonProps) {
  const base = "rounded-lg font-medium transition-all duration-200 whitespace-nowrap";

  const sizes = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-3 text-sm";

  const styles =
    variant === "primary"
      ? "bg-[#6d28d9] text-white hover:opacity-90"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  return (
    <button type={type} onClick={onClick} className={`${base} ${sizes} ${styles} ${className}`}>
      {children}
    </button>
  );
}
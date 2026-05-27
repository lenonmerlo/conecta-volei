import "./Button.css";

function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  type = "button",
  fullWidth = false,
  size = "md",
  icon = null,
  className = "",
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? "btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {icon && (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="btn__label">{children}</span>
    </button>
  );
}

export default Button;

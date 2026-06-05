const mono = "'IBM Plex Mono', monospace";

export function MeshPageHeader({
  letter,
  title,
  description,
  color,
  onClick,
  active = false,
  children,
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={{
        width: "100%",
        padding: "18px 24px 16px",
        border: "none",
        borderBottom: `1px solid ${active ? color + "55" : "#ffffff0e"}`,
        flexShrink: 0,
        background: active ? `linear-gradient(180deg,${color}12,transparent)` : "linear-gradient(180deg,#ffffff05,transparent)",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        outline: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          fontFamily: mono,
          fontSize: 16,
          color,
          letterSpacing: 1,
          fontWeight: 700,
          border: `1px solid ${color}55`,
          background: `linear-gradient(180deg,${color}24,${color}0b)`,
          borderRadius: 7,
          lineHeight: 1,
          boxShadow: `0 0 22px ${color}0d`,
          flexShrink: 0,
        }}>
          {letter}
        </div>
        <div style={{ fontFamily: mono, fontSize: 22, color: "#e8e8e8", fontWeight: 700, letterSpacing: 0.2 }}>
          {title}
        </div>
      </div>
      {description && (
        <div style={{
          fontFamily: mono,
          fontSize: 10,
          color: "#ffffff62",
          marginTop: 9,
          lineHeight: 1.65,
          maxWidth: "72ch",
          textWrap: "balance",
        }}>
          {description}
        </div>
      )}
      {children}
    </Wrapper>
  );
}

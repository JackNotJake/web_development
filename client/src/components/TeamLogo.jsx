export default function TeamLogo({ team, size = 40, className = '' }) {
  if (!team) return null;
  const initial = team.name?.charAt(0) || '?';
  const sizeStyle = { width: size, height: size, fontSize: Math.max(12, size * 0.45) };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-bold text-white shadow ${className}`}
      style={{
        ...sizeStyle,
        background: `linear-gradient(135deg, ${team.color || '#16a34a'}, ${team.secondaryColor || '#15803d'})`,
      }}
      title={team.name}
    >
      {initial}
    </div>
  );
}

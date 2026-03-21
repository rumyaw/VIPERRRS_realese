export default function BackgroundParticles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="stars-layer stars-layer-1" />
      <div className="stars-layer stars-layer-2" />
      <div className="stars-layer stars-layer-3" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.10),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.08),transparent_28%),radial-gradient(circle_at_40%_80%,rgba(236,72,153,0.08),transparent_30%)]" />
    </div>
  );
}


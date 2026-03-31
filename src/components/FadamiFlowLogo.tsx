interface FadamiFlowLogoProps {
  showTagline?: boolean;
  compact?: boolean;
}

export function FadamiFlowLogo({ showTagline = false, compact = false }: FadamiFlowLogoProps) {
  if (compact) {
    // Sidebar collapsed: shield icon only
    return (
      <div className="w-8 h-8 rounded-lg bg-[hsl(217,91%,60%)] flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_hsl(217_91%_60%/0.35)]">
        <span className="text-white font-extrabold text-sm tracking-tighter">F</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      {/* Shield icon */}
      <div className="w-8 h-8 rounded-lg bg-[hsl(217,91%,60%)] flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_hsl(217_91%_60%/0.35)]">
        <span className="text-white font-extrabold text-sm tracking-tighter">F</span>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        {/* Logo text */}
        <span className="font-bold text-base whitespace-nowrap tracking-tight">
          <span className="fadamiflow-fadami">Fadami</span>
          <span className="fadamiflow-glow">Flow</span>
        </span>

        {/* Tagline */}
        {showTagline && (
          <>
            <span className="text-border mx-0.5 select-none">|</span>
            <span className="text-[11px] text-[hsl(220,9%,64%)] whitespace-nowrap font-medium">
              O Fluxo Total do seu Projeto!
            </span>
          </>
        )}
      </div>
    </div>
  );
}

import menuIcon from "@/assets/menu-icon.png";

interface FadamiFlowLogoProps {
  showTagline?: boolean;
  compact?: boolean;
  showIcon?: boolean;
}

export function FadamiFlowLogo({ showTagline = false, compact = false, showIcon = false }: FadamiFlowLogoProps) {
  if (compact) {
    return null;
  }

  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <div className="flex items-center gap-2 min-w-0">
        {showIcon && (
          <img src={menuIcon} alt="FadamiFlow" className="w-5 h-5 opacity-60 dark:invert dark:opacity-50 flex-shrink-0" />
        )}
        <span className="font-bold text-base whitespace-nowrap tracking-tight">
          <span className="fadamiflow-fadami">Fadami</span>
          <span className="fadamiflow-glow">Flow</span>
        </span>

        {showTagline && (
          <>
            <span className="text-border mx-0.5 select-none">|</span>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap font-medium">
              O Fluxo Total do seu Projeto!
            </span>
          </>
        )}
      </div>
    </div>
  );
}

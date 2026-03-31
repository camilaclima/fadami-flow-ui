import { GitBranch } from "lucide-react";

interface FadamiFlowLogoProps {
  showTagline?: boolean;
  compact?: boolean;
}

export function FadamiFlowLogo({ showTagline = false, compact = false }: FadamiFlowLogoProps) {
  if (compact) {
    return (
      <GitBranch className="w-5 h-5 text-muted-foreground/60 flex-shrink-0" />
    );
  }

  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <GitBranch className="w-5 h-5 text-muted-foreground/60 flex-shrink-0" />

      <div className="flex items-center gap-2 min-w-0">
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

import { motion } from "framer-motion";

interface FadamiFlowLogoProps {
  showTagline?: boolean;
  compact?: boolean;
}

export function FadamiFlowLogo({ showTagline = false, compact = false }: FadamiFlowLogoProps) {
  return (
    <div className="flex items-center gap-3 overflow-hidden">
      {/* Icon */}
      <div className="w-8 h-8 rounded-xl bg-[hsl(24,95%,53%)] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_hsl(24_95%_53%/0.4)]">
        <span className="text-white font-bold text-sm">F</span>
      </div>

      {!compact && (
        <div className="flex items-center gap-2 min-w-0">
          {/* Logo text */}
          <span className="font-bold text-base whitespace-nowrap tracking-tight">
            <span className="text-foreground">Fadami</span>
            <span className="fadamiflow-glow">Flow</span>
          </span>

          {/* Tagline separator + text */}
          {showTagline && (
            <>
              <span className="text-border mx-0.5 select-none">|</span>
              <span className="text-[11px] text-[hsl(24,95%,53%)] whitespace-nowrap font-medium opacity-80">
                Guardião de Receita Online da Fadami
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

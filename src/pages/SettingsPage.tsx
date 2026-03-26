import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie as configurações do sistema</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
        <Settings className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Em breve</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          As configurações do sistema estarão disponíveis em uma versão futura.
        </p>
      </div>
    </div>
  );
}

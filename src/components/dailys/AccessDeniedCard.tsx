import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function AccessDeniedCard({ message }: { message?: string }) {
  return (
    <div className="p-4 md:p-6 w-full max-w-[900px] mx-auto">
      <Card className="rounded-2xl border-orange-500/30 bg-orange-500/5">
        <CardContent className="py-10 flex flex-col items-center text-center gap-3">
          <ShieldAlert className="w-10 h-10 text-orange-500" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {message ?? "Este usuário simulado não possui permissão para visualizar esta área. Alterne para outro perfil no seletor acima."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
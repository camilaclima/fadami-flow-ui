import { useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function CobrancaPopover({ message, title }: { message: string; title: string }) {
  const [text, setText] = useState(message || `Olá, precisamos destravar: ${title}. Pode nos dar uma previsão?`);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Mensagem copiada");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-2"><MessageSquare className="w-4 h-4" /> Gerar Mensagem de Cobrança</Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Mensagem sugerida pela IA — edite e copie para enviar no Slack/Teams.</p>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
          <Button size="sm" onClick={copy} className="w-full gap-2">
            {copied ? <><Check className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
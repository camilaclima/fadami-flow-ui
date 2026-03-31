import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { useRoles } from "@/hooks/useRoles";
import { useAccessGroups } from "@/hooks/useAccessGroups";
import { useUpdateProfile, type Profile } from "@/hooks/useProfiles";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile?: Profile | null;
  cloneData?: Partial<Profile> | null;
}

export function UserFormModalSupabase({ open, onOpenChange, profile, cloneData }: Props) {
  const { data: products = [] } = useProducts();
  const { data: roles = [] } = useRoles();
  const { data: accessGroups = [] } = useAccessGroups();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();
  const activeProducts = products.filter((p) => p.status === "active");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [productId, setProductId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setEmail(profile.email);
      setProductId(profile.product_id ?? "");
      setRoleId(profile.role_id ?? "");
      setGroupId(profile.group_id ?? "");
    } else if (cloneData) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setProductId(cloneData.product_id ?? "");
      setRoleId(cloneData.role_id ?? "");
      setGroupId(cloneData.group_id ?? "");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setProductId("");
      setRoleId("");
      setGroupId("");
    }
    setGeneratedPassword(null);
    setCopied(false);
  }, [profile, cloneData, open]);

  const handleSubmit = async () => {
    if (!firstName.trim() || !email.trim() || !productId || !roleId || !groupId) return;
    setSaving(true);

    try {
      if (profile) {
        // Update existing profile
        updateProfile.mutate({
          id: profile.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          product_id: productId,
          role_id: roleId,
          group_id: groupId,
        });
        toast.success("Usuário atualizado!");
        onOpenChange(false);
      } else {
        // Create new user via edge function
        const tempPassword = Math.random().toString(36).slice(-8);
        const { data, error } = await supabase.functions.invoke("create-user", {
          body: {
            email: email.trim(),
            password: tempPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            productId,
            roleId,
            groupId,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setGeneratedPassword(tempPassword);
        toast.success("Usuário criado!");
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isEditing = !!profile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Usuário" : cloneData ? "Clonar Usuário" : "Novo Usuário"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados do usuário." : "Preencha os dados para criar um novo usuário."}
          </DialogDescription>
        </DialogHeader>

        {generatedPassword ? (
          <div className="py-6 space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center space-y-2">
              <p className="text-sm text-foreground font-medium">Usuário criado com sucesso!</p>
              <p className="text-xs text-muted-foreground">Senha temporária gerada:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-secondary px-4 py-2 rounded-lg text-lg font-mono font-bold text-foreground">
                  {generatedPassword}
                </code>
                <Button size="icon" variant="ghost" onClick={copyPassword}>
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">O usuário deverá alterar a senha no primeiro acesso.</p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nome" />
                </div>
                <div className="space-y-2">
                  <Label>Sobrenome</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sobrenome" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" disabled={isEditing} />
              </div>
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {activeProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select value={roleId} onValueChange={setRoleId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grupo de Acesso</Label>
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {accessGroups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={saving || !firstName.trim() || !email.trim() || !productId || !roleId || !groupId}>
                {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

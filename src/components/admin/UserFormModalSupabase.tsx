import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useRoles } from "@/hooks/useRoles";
import { useAccessGroups } from "@/hooks/useAccessGroups";
import { useUpdateProfile, type Profile } from "@/hooks/useProfiles";
import {
  useProfileGroups,
  useSyncProfileGroups,
  useProfileSquads,
  useSyncProfileSquads,
} from "@/hooks/useProfileRelations";
import { useSquads } from "@/hooks/useSquads";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, ChevronDown, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile?: Profile | null;
  cloneData?: any | null;
}

export function UserFormModalSupabase({ open, onOpenChange, profile, cloneData }: Props) {
  const { data: roles = [] } = useRoles();
  const { data: accessGroups = [] } = useAccessGroups();
  const { data: profileGroups = [] } = useProfileGroups();
  const { data: profileSquads = [] } = useProfileSquads();
  const { data: squads = [] } = useSquads();
  const updateProfile = useUpdateProfile();
  const syncGroups = useSyncProfileGroups();
  const syncSquads = useSyncProfileSquads();
  const queryClient = useQueryClient();
  const activeSquads = squads.filter((s) => s.active);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setGeneratedPassword(null);
      setCopied(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setRoleId("");
      setSelectedSquadIds([]);
      setSelectedGroupIds([]);
      return;
    }

    if (generatedPassword) return;

    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setEmail(profile.email);
      setRoleId(profile.role_id ?? "");
      setSelectedSquadIds(profileSquads.filter((ps) => ps.profile_id === profile.id).map((ps) => ps.squad_id));
      setSelectedGroupIds(profileGroups.filter((pg) => pg.profile_id === profile.id).map((pg) => pg.group_id));
    } else if (cloneData) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setRoleId(cloneData.role_id ?? "");
      setSelectedSquadIds(cloneData.selectedSquadIds || []);
      setSelectedGroupIds(cloneData.selectedGroupIds || []);
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setRoleId("");
      setSelectedSquadIds([]);
      setSelectedGroupIds([]);
    }
  }, [profile, cloneData, open, profileSquads, profileGroups, generatedPassword]);

  const toggleSquad = (id: string) => {
    setSelectedSquadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!firstName.trim() || !email.trim() || !roleId) return;
    if (selectedSquadIds.length === 0) {
      toast.error("Selecione ao menos uma squad");
      return;
    }
    setSaving(true);

    try {
      if (profile) {
        updateProfile.mutate({
          id: profile.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          role_id: roleId,
        });
        await syncSquads.mutateAsync({ profileId: profile.id, squadIds: selectedSquadIds });
        await syncGroups.mutateAsync({ profileId: profile.id, groupIds: selectedGroupIds });

        // Sincronização automática de Squads e Funções baseada no Grupo de Acesso
        await autoSyncSquadRelations(email.trim(), selectedGroupIds, selectedSquadIds);

        toast.success("Usuário atualizado!");
        onOpenChange(false);
      } else {
        const tempPassword = "Fadami";
        const { data, error } = await supabase.functions.invoke("create-user", {
          body: {
            email: email.trim(),
            password: tempPassword,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            productId: null,
            roleId,
            groupId: selectedGroupIds[0] || null,
          },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const { data: newProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email.trim())
          .maybeSingle();

        if (newProfile) {
          await syncSquads.mutateAsync({ profileId: newProfile.id, squadIds: selectedSquadIds });
          await syncGroups.mutateAsync({ profileId: newProfile.id, groupIds: selectedGroupIds });
        }

        // Sincronização automática de Squads e Funções baseada no Grupo de Acesso
        await autoSyncSquadRelations(email.trim(), selectedGroupIds, selectedSquadIds);

        setGeneratedPassword(tempPassword);
        toast.success("Usuário criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["profiles"] });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  // NOVA LÓGICA AUTOMÁTICA DE VÍNCULO DE SQUADS E GRUPOS (LÍDER / DEV)
  const autoSyncSquadRelations = async (userEmail: string, groupIds: string[], squadIds: string[]) => {
    try {
      if (squadIds.length === 0 || !userEmail) return;

      // 1. Busca o ID do colaborador correspondente na tabela team_members
      const { data: tm } = await (supabase.from("team_members") as any)
        .select("id")
        .ilike("email", userEmail)
        .eq("active", true)
        .maybeSingle();

      if (!tm?.id) {
        toast.info("Cadastre o usuário em Colaboradores se quiser vinculá-lo automaticamente às squads.");
        return;
      }

      // 2. Mapeia os nomes dos Grupos de Acesso selecionados
      const selectedGroupNames = groupIds
        .map((gid) =>
          accessGroups
            .find((g) => g.id === gid)
            ?.name?.trim()
            .toLowerCase(),
        )
        .filter(Boolean);

      const isDeveloperGroup = selectedGroupNames.includes("desenvolvedor");
      const isLeaderGroup =
        selectedGroupNames.includes("líderes") ||
        selectedGroupNames.includes("lideres") ||
        selectedGroupNames.includes("lider");

      // --- Sincronização de MEMBROS DE TIME (squad_members) ---
      if (isDeveloperGroup) {
        // Busca os vínculos atuais na tabela squad_members para este colaborador
        const { data: currentMembers } = await (supabase.from("squad_members") as any)
          .select("squad_id")
          .eq("team_member_id", tm.id);

        const currentMemberSquadIds = new Set((currentMembers ?? []).map((m: any) => m.squad_id));

        // Filtra as squads que precisam ser inseridas
        const membersToInsert = squadIds
          .filter((sid) => !currentMemberSquadIds.has(sid))
          .map((sid) => ({ squad_id: sid, team_member_id: tm.id }));

        // Filtra as squads que foram desmarcadas e precisam ser removidas
        const squadIdsToKeep = new Set(squadIds);
        const membersToRemove = [...currentMemberSquadIds].filter((sid) => !squadIdsToKeep.has(sid));

        if (membersToInsert.length > 0) {
          await (supabase.from("squad_members") as any).insert(membersToInsert);
        }
        if (membersToRemove.length > 0) {
          await (supabase.from("squad_members") as any)
            .delete()
            .eq("team_member_id", tm.id)
            .in("squad_id", membersToRemove);
        }
      } else {
        // Se não for do grupo desenvolvedor, remove todos os vínculos de membro de time destas squads
        await (supabase.from("squad_members") as any).delete().eq("team_member_id", tm.id);
      }

      // --- Sincronização de LÍDERES DE SQUAD (squad_leaders) ---
      if (isLeaderGroup) {
        // Busca os vínculos atuais na tabela squad_leaders para este colaborador
        const { data: currentLeaders } = await (supabase.from("squad_leaders") as any)
          .select("squad_id")
          .eq("team_member_id", tm.id);

        const currentLeaderSquadIds = new Set((currentLeaders ?? []).map((l: any) => l.squad_id));

        // Filtra os líderes que precisam ser inseridos
        const leadersToInsert = squadIds
          .filter((sid) => !currentLeaderSquadIds.has(sid))
          .map((sid) => ({ squad_id: sid, team_member_id: tm.id }));

        // Filtra os líderes que foram removidos
        const squadIdsToKeep = new Set(squadIds);
        const leadersToRemove = [...currentLeaderSquadIds].filter((sid) => !squadIdsToKeep.has(sid));

        if (leadersToInsert.length > 0) {
          await (supabase.from("squad_leaders") as any).insert(leadersToInsert);
        }
        if (leadersToRemove.length > 0) {
          await (supabase.from("squad_leaders") as any)
            .delete()
            .eq("team_member_id", tm.id)
            .in("squad_id", leadersToRemove);
        }
      } else {
        // Se não for do grupo líder, remove todos os vínculos de liderança deste usuário
        await (supabase.from("squad_leaders") as any).delete().eq("team_member_id", tm.id);
      }

      queryClient.invalidateQueries({ queryKey: ["squads"] });
    } catch (e) {
      console.error("Falha ao sincronizar as relações automáticas de Squads", e);
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
      <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="px-8 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Usuário" : cloneData ? "Clonar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize os dados do usuário." : "Preencha os dados para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {generatedPassword ? (
          <div className="px-8 py-6 space-y-4">
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
            <DialogFooter className="pb-6 px-8">
              <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 py-2 overflow-y-auto flex-1 px-8">
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
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  disabled={isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 flex flex-col">
                <Label>Squads *</Label>
                <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-auto min-h-[40px] px-3 py-2 text-left font-normal bg-background border-input hover:bg-background/80"
                    >
                      <div className="flex flex-wrap gap-1.5 max-w-[90%]">
                        {selectedSquadIds.length === 0 ? (
                          <span className="text-muted-foreground">Selecione as squads...</span>
                        ) : (
                          selectedSquadIds.map((id) => {
                            const name = squads.find((s) => s.id === id)?.name || id;
                            return (
                              <Badge
                                key={id}
                                variant="secondary"
                                className="bg-[#6366F1]/10 text-[#818CF8] hover:bg-[#6366F1]/20 border border-[#6366F1]/15 gap-1 py-0.5 px-2 text-xs font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSquad(id);
                                }}
                              >
                                {name}
                                <X className="h-3 w-3 hover:text-red-400 transition-colors" />
                              </Badge>
                            );
                          })
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]"
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <Command className="bg-card border border-border w-full">
                      <CommandInput placeholder="Pesquisar squad..." className="border-none focus:ring-0" />
                      <CommandEmpty className="py-2 text-center text-sm text-muted-foreground">
                        Nenhuma squad encontrada.
                      </CommandEmpty>
                      <CommandList className="max-h-[180px] overflow-y-auto overflow-x-hidden">
                        <CommandGroup className="p-1">
                          {activeSquads.map((s) => {
                            const isChecked = selectedSquadIds.includes(s.id);
                            return (
                              <CommandItem
                                key={s.id}
                                onSelect={() => toggleSquad(s.id)}
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent/50 rounded-md transition-colors"
                              >
                                <Checkbox checked={isChecked} onCheckedChange={() => toggleSquad(s.id)} />
                                <span className="text-sm text-foreground">{s.name}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Grupos de Acesso</Label>
                <div className="bg-secondary/50 rounded-lg p-3 border border-border/40">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 max-h-32 overflow-y-auto pr-1">
                    {accessGroups.map((g) => (
                      <label
                        key={g.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-secondary/80 rounded px-1 py-0.5 transition-colors"
                      >
                        <Checkbox checked={selectedGroupIds.includes(g.id)} onCheckedChange={() => toggleGroup(g.id)} />
                        <span className="text-foreground truncate">{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="px-8 pb-6 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !firstName.trim() || !email.trim() || !roleId || selectedSquadIds.length === 0}
              >
                {saving ? "Salvando..." : isEditing ? "Salvar" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

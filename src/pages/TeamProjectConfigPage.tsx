import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Archive, Trash2, Users, Package, UserCircle2, Briefcase, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronsUpDown } from "lucide-react";
import { useProducts, useUpdateProduct, type Product } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { useAllTeamMembers, useAddTeamMember, useUpdateTeamMember, useTeamMembers } from "@/hooks/useTeamMembers";
import {
  useStakeholders, useSaveStakeholder, useDeleteStakeholder,
  IMPORTANCE_LABELS, IMPORTANCE_STYLES, type Stakeholder, type StakeholderImportance,
} from "@/hooks/useStakeholders";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthorizedProducts } from "@/hooks/useAuthorizedProducts";
import { useSquads } from "@/hooks/useSquads";
import { useProfiles } from "@/hooks/useProfiles";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TEAM_ROLE_LABELS, SENIORITY_LABELS, SPECIALTY_LABELS,
  type TeamRole, type Seniority, type Specialty, type TeamMember,
} from "@/types/sprint";

const PROJECT_STATUS_OPTIONS = [
  { value: "active", label: "Ativo", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" },
  { value: "paused", label: "Em Pausa", className: "bg-amber-500/15 text-amber-600 border-amber-500/20" },
  { value: "inactive", label: "Concluído", className: "bg-muted text-muted-foreground border-border" },
] as const;

const ALLOCATION_OPTIONS = [100, 75, 50, 25];

/* Hook: project allocations via team_member_products junction */
function useTeamMemberProducts() {
  return useQuery({
    queryKey: ["team_member_products"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("team_member_products" as any) as any).select("*");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; team_member_id: string; product_id: string }>;
    },
  });
}

function useAddMemberToProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ team_member_id, product_id }: { team_member_id: string; product_id: string }) => {
      const { error } = await (supabase.from("team_member_products" as any) as any).insert({ team_member_id, product_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_member_products"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao alocar"),
  });
}

function useRemoveMemberFromProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ team_member_id, product_id }: { team_member_id: string; product_id: string }) => {
      const { error } = await (supabase.from("team_member_products" as any) as any)
        .delete().eq("team_member_id", team_member_id).eq("product_id", product_id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_member_products"] }),
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const SENIORITY_BADGE: Record<Seniority, string> = {
  estagiario: "bg-teal-500/15 text-teal-600 border-teal-500/20",
  junior: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  pleno: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  senior: "bg-purple-500/15 text-purple-600 border-purple-500/20",
  especialista: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

export default function TeamProjectConfigPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [tab, setTab] = useState<"projects" | "team">("projects");
  const [openMemberModal, setOpenMemberModal] = useState(false);

  return (
    <div className="fade-in space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração do Time e do Projeto</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie projetos, stakeholders e colaboradores em um único lugar.
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="projects" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Package className="w-4 h-4" /> Projetos</TabsTrigger>
            <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"><Users className="w-4 h-4" /> Time</TabsTrigger>
          </TabsList>
          {tab === "team" && (
            <Button className="gap-2" onClick={() => setOpenMemberModal(true)}>
              <Plus className="w-4 h-4" /> Novo Colaborador
            </Button>
          )}
        </div>
        <TabsContent value="projects" className="mt-6">
          <ProjectsSection />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <TeamSection openForm={openMemberModal} setOpenForm={setOpenMemberModal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------- PROJECTS -------------------------------------- */

function ProjectsSection() {
  const { data: allProducts = [] } = useProducts();
  const { isAdmin, productIds } = useAuthorizedProducts();
  const products = useMemo(() => {
    if (isAdmin || productIds === null) return allProducts;
    const set = new Set(productIds);
    return allProducts.filter((p) => set.has(p.id));
  }, [allProducts, productIds, isAdmin]);
  const { data: stakeholders = [] } = useStakeholders();
  const { data: allMembers = [] } = useAllTeamMembers();
  const { data: allocations = [] } = useTeamMemberProducts();
  const updateProduct = useUpdateProduct();
  const saveStakeholder = useSaveStakeholder();
  const deleteStakeholder = useDeleteStakeholder();
  const qc = useQueryClient();

  // Project details modal
  const [detailProject, setDetailProject] = useState<Product | null>(null);

  const allocationCount = useMemo(() => {
    const map: Record<string, number> = {};
    allocations.forEach((a) => { map[a.product_id] = (map[a.product_id] ?? 0) + 1; });
    return map;
  }, [allocations]);

  const handleArchive = (p: Product) => {
    updateProduct.mutate({ id: p.id, status: p.status === "inactive" ? "active" : "inactive" });
  };

  const getCleanDesc = (d: string) => d.replace(/^\[Cliente:[^\]]+\]\s?/, "");

  return (
    <div className="space-y-6">
      {/* Project cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground/80 mb-3">Projetos Cadastrados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const statusCfg = PROJECT_STATUS_OPTIONS.find((s) => s.value === p.status) ?? PROJECT_STATUS_OPTIONS[0];
            const desc = getCleanDesc(p.description);
            const projectStakeholders = stakeholders.filter((s) => s.product_id === p.id);
            const memberCount = allocationCount[p.id] ?? 0;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className="rounded-2xl h-full flex flex-col cursor-pointer hover:border-primary/40 hover:shadow-md transition"
                  onClick={() => setDetailProject(p)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${p.color}20` }}>
                          <Briefcase className="w-4 h-4" style={{ color: p.color }} />
                        </div>
                        <CardTitle className="text-base truncate">{p.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[40px]">{desc || "Sem descrição."}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" /> {memberCount} colaborador(es)
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <UserCircle2 className="w-3 h-3" /> {projectStakeholders.length} stakeholder(s)
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={(e) => { e.stopPropagation(); handleArchive(p); }}>
                        <Archive className="w-3.5 h-3.5" /> {p.status === "inactive" ? "Reativar" : "Arquivar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {products.length === 0 && (
            <Card className="rounded-2xl md:col-span-2 lg:col-span-3">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum projeto vinculado ao seu usuário.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ProjectDetailsModal
        project={detailProject}
        onClose={() => setDetailProject(null)}
      />
    </div>
  );
}

/* -------------------------------------- PROJECT DETAILS MODAL -------------------------------------- */

function ProjectDetailsModal({ project, onClose }: { project: Product | null; onClose: () => void }) {
  const { user } = useAuth();
  const { data: stakeholders = [] } = useStakeholders();
  const { data: members = [] } = useTeamMembers();
  const { data: allMembersAll = [] } = useAllTeamMembers();
  const { data: products = [] } = useProducts();
  const { data: allocations = [] } = useTeamMemberProducts();
  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();
  const { isAdmin, productIds } = useAuthorizedProducts();
  const myProfileId = useMemo(
    () => profiles.find((p) => p.user_id === user?.id)?.id ?? null,
    [profiles, user?.id],
  );
  const squadMemberIds = useMemo(() => {
    const ids = new Set<string>();
    const allowed = authorizedProductIds ? new Set(authorizedProductIds) : null;
    squads.forEach((s) => {
      const isLeader = !!myProfileId && s.leader_profile_id === myProfileId;
      const sharesProduct = isAdmin || !allowed || s.product_ids.some((pid) => allowed.has(pid));
      if (isLeader || sharesProduct) {
        s.member_ids.forEach((id) => ids.add(id));
      }
    });
    return ids;
  }, [squads, myProfileId, authorizedProductIds, isAdmin]);
  const saveStakeholder = useSaveStakeholder();
  const deleteStakeholder = useDeleteStakeholder();
  const addToProject = useAddMemberToProject();
  const removeFromProject = useRemoveMemberFromProject();

  const [shEditing, setShEditing] = useState<Stakeholder | null>(null);
  const [shName, setShName] = useState("");
  const [shEmail, setShEmail] = useState("");
  const [shPhone, setShPhone] = useState("");
  const [shConcession, setShConcession] = useState("");
  const [shArea, setShArea] = useState("");
  const [showShForm, setShowShForm] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);
  // Squad do usuário logado = membros que ele cadastrou + membros das squads que ele lidera
  const squadMembers = useMemo(
    () => members.filter((m) => m.coordinator_id === user?.id || squadMemberIds.has(m.id)),
    [members, user?.id, squadMemberIds],
  );
  const allocByMember = useMemo(() => {
    const map: Record<string, string[]> = {};
    allocations.forEach((a) => {
      (map[a.team_member_id] ??= []).push(a.product_id);
    });
    return map;
  }, [allocations]);

  // Mapa de projetos por e-mail (cross-squad): identifica a mesma pessoa entre coordenadores diferentes
  const projectsByEmail = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    allMembersAll.forEach((m: any) => {
      const key = (m.email ?? "").trim().toLowerCase();
      if (!key) return;
      (allocByMember[m.id] ?? []).forEach((pid) => {
        (map[key] ??= new Set<string>()).add(pid);
      });
    });
    return map;
  }, [allMembersAll, allocByMember]);

  const otherProjectsFor = (m: any) => {
    const key = (m.email ?? "").trim().toLowerCase();
    const set = key ? projectsByEmail[key] : null;
    if (!set) return [] as string[];
    return Array.from(set)
      .filter((pid) => pid !== project?.id)
      .map((pid) => productMap[pid])
      .filter(Boolean) as string[];
  };

  const allocatedMembers = useMemo(
    () => squadMembers.filter((m) => project && allocByMember[m.id]?.includes(project.id)),
    [squadMembers, allocByMember, project],
  );
  const availableMembers = useMemo(
    () => squadMembers.filter((m) => !project || !allocByMember[m.id]?.includes(project.id)),
    [squadMembers, allocByMember, project],
  );

  const projectStakeholders = useMemo(
    () => stakeholders.filter((s) => s.product_id === project?.id),
    [stakeholders, project?.id],
  );

  const reset = () => {
    setShEditing(null); setShName(""); setShEmail(""); setShPhone(""); setShConcession(""); setShArea("");
    setShowShForm(false);
  };

  const handleEdit = (s: Stakeholder) => {
    setShEditing(s);
    setShName(s.name);
    setShEmail(s.email ?? "");
    setShPhone(s.phone ?? "");
    setShConcession(s.concession ?? "");
    setShArea(s.area);
    setShowShForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !shName.trim()) { toast.error("Informe o nome"); return; }
    saveStakeholder.mutate({
      id: shEditing?.id,
      product_id: project.id,
      name: shName.trim(),
      email: shEmail.trim(),
      phone: shPhone.trim(),
      concession: shConcession.trim(),
      area: shArea.trim(),
      updated_by: user?.id,
    } as any, { onSuccess: reset });
  };


  return (
    <Dialog open={!!project} onOpenChange={(open) => { if (!open) { reset(); onClose(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project?.name}</DialogTitle>
          <DialogDescription>Gerencie stakeholders e colaboradores alocados neste projeto.</DialogDescription>
        </DialogHeader>

        {project && (
          <div className="space-y-6 pt-2">
            {/* Stakeholders */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Stakeholders</h3>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowShForm(true)}>
                  <Plus className="w-4 h-4" /> Adicionar Stakeholder
                </Button>
              </div>
              <Dialog open={showShForm} onOpenChange={(o) => { if (!o) reset(); else setShowShForm(true); }}>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>{shEditing ? "Editar Stakeholder" : "Adicionar Stakeholder"}</DialogTitle>
                    <DialogDescription>Cadastre os dados de contato do stakeholder.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome</Label>
                      <Input value={shName} onChange={(e) => setShName(e.target.value)} placeholder="Nome do stakeholder" autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Área</Label>
                      <Input value={shArea} onChange={(e) => setShArea(e.target.value)} placeholder="Ex: Infra, Produto" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">E-mail</Label>
                      <Input type="email" value={shEmail} onChange={(e) => setShEmail(e.target.value)} placeholder="email@empresa.com" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Telefone</Label>
                      <Input value={shPhone} onChange={(e) => setShPhone(maskPhone(e.target.value))} placeholder="(99) 99999-9999" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Concessão</Label>
                      <Input value={shConcession} onChange={(e) => setShConcession(e.target.value)} placeholder="Concessão / vínculo" />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" size="sm" onClick={reset}>Cancelar</Button>
                      <Button type="submit" size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> {shEditing ? "Salvar" : "Adicionar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="space-y-2">
                {projectStakeholders.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum stakeholder cadastrado.</p>
                )}
                {projectStakeholders.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{s.name}</span>
                        {s.area && <Badge variant="outline">{s.area}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[s.email, s.phone, s.concession].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteStakeholder.mutate(s.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </section>

            {/* Team allocation */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Colaboradores Alocados</h3>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowMemberPicker(true)}>
                  <Plus className="w-4 h-4" /> Adicionar Colaborador
                </Button>
              </div>

              {allocatedMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                  Nenhum colaborador alocado neste projeto ainda.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {allocatedMembers.map((m) => {
                    const memberProjects = otherProjectsFor(m);
                    return (
                      <div key={m.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{TEAM_ROLE_LABELS[m.role as TeamRole]}</div>
                          </div>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => removeFromProject.mutate({ team_member_id: m.id, product_id: project.id })}
                            title="Remover deste projeto"
                          >
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className={SENIORITY_BADGE[m.seniority as Seniority]}>
                            {SENIORITY_LABELS[m.seniority as Seniority]}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {memberProjects.length > 0
                            ? <>Também em: <span className="text-foreground/80">{memberProjects.join(", ")}</span></>
                            : <span className="italic">Apenas neste projeto</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>

      {/* Member picker dialog */}
      <Dialog open={showMemberPicker} onOpenChange={setShowMemberPicker}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Colaborador</DialogTitle>
            <DialogDescription>Selecione um colaborador do time para alocar neste projeto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {availableMembers.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Todos os colaboradores já estão alocados aqui.</p>
            )}
            {availableMembers.map((m) => {
              const memberProjects = otherProjectsFor(m);
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={SENIORITY_BADGE[m.seniority as Seniority]}>
                        {SENIORITY_LABELS[m.seniority as Seniority]}
                      </Badge>
                      <span>{TEAM_ROLE_LABELS[m.role as TeamRole]}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {memberProjects.length > 0
                        ? <>Já em: <span className="text-foreground/80">{memberProjects.join(", ")}</span></>
                        : <span className="italic">Sem projetos</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!project) return;
                      addToProject.mutate(
                        { team_member_id: m.id, product_id: project.id },
                        { onSuccess: () => toast.success(`${m.name} adicionado`) },
                      );
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

/* -------------------------------------- TEAM -------------------------------------- */

function TeamSection({ openForm, setOpenForm }: { openForm: boolean; setOpenForm: (v: boolean) => void }) {
  const { user } = useAuth();
  const { data: allMembers = [] } = useAllTeamMembers();
  const { data: squads = [] } = useSquads();
  const { data: profiles = [] } = useProfiles();
  const { isAdmin, productIds } = useAuthorizedProducts();
  const myProfileId = useMemo(
    () => profiles.find((p) => p.user_id === user?.id)?.id ?? null,
    [profiles, user?.id],
  );
  const squadMemberIds = useMemo(() => {
    const ids = new Set<string>();
    const allowed = productIds ? new Set(productIds) : null;
    squads.forEach((s) => {
      const isLeader = !!myProfileId && s.leader_profile_id === myProfileId;
      const sharesProduct = isAdmin || !allowed || s.product_ids.some((pid) => allowed.has(pid));
      if (isLeader || sharesProduct) {
        s.member_ids.forEach((id) => ids.add(id));
      }
    });
    return ids;
  }, [squads, myProfileId, productIds, isAdmin]);
  const members = useMemo(
    () => allMembers.filter((m) => m.coordinator_id === user?.id || squadMemberIds.has(m.id)),
    [allMembers, user?.id, squadMemberIds],
  );
  const { data: products = [] } = useProducts();
  const addMember = useAddTeamMember();
  const updateMember = useUpdateTeamMember();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [seniority, setSeniority] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");
  const [productId, setProductId] = useState<string>("__none__");
  const [productIds, setProductIds] = useState<string[]>([]);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);

  const reset = () => {
    setEditing(null); setOpenForm(false); setName(""); setEmail(""); setRole(""); setSeniority("");
    setSpecialty(""); setProductId("__none__"); setProductIds([]);
  };

  const requiresSpecialty = role === "dev" || role === "devops";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!email.trim()) { toast.error("Informe o e-mail do colaborador"); return; }
    if (!role || !seniority) { toast.error("Preencha cargo e senioridade"); return; }
    if (requiresSpecialty && !specialty) { toast.error("Preencha a especialidade"); return; }
    const payload = {
      name: name.trim(), email: email.trim().toLowerCase(), role, seniority, specialty,
      daily_capacity_hours: 8,
      allocation_percent: 100,
      product_id: productIds[0] ?? null,
      coordinator_id: user?.id ?? "",
    } as any;
    let memberId = editing?.id;
    try {
      if (editing) {
        await updateMember.mutateAsync({ id: editing.id, ...payload });
      } else {
        const created: any = await addMember.mutateAsync(payload);
        memberId = created?.id;
      }
      if (memberId) {
        await (supabase.from("team_member_products" as any) as any)
          .delete().eq("team_member_id", memberId);
        if (productIds.length > 0) {
          await (supabase.from("team_member_products" as any) as any).insert(
            productIds.map((pid) => ({ team_member_id: memberId, product_id: pid })),
          );
        }
        qc.invalidateQueries({ queryKey: ["team_member_products"] });
      }
      reset();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar colaborador");
    }
  };

  const handleEdit = async (m: TeamMember) => {
    setEditing(m);
    setName(m.name);
    setEmail((m as any).email ?? "");
    setRole(m.role);
    setSeniority(m.seniority);
    setSpecialty(m.specialty);
    setProductId(m.product_id ?? "__none__");
    const { data } = await (supabase.from("team_member_products" as any) as any)
      .select("product_id").eq("team_member_id", m.id);
    const ids = (data ?? []).map((r: any) => r.product_id).filter(Boolean);
    setProductIds(ids.length > 0 ? ids : (m.product_id ? [m.product_id] : []));
    setOpenForm(true);
  };

  const handleDelete = async (m: TeamMember) => {
    if (!confirm(`Excluir ${m.name}?`)) return;
    const { error } = await (supabase.from("team_members") as any).delete().eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Colaborador excluído");
    qc.invalidateQueries({ queryKey: ["team_members"] });
    qc.invalidateQueries({ queryKey: ["team_members_all"] });
  };

  return (
    <div className="space-y-6">
      {/* Team member modal */}
      <Dialog open={openForm} onOpenChange={(o) => { if (!o) reset(); else setOpenForm(true); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Colaborador" : "Novo Colaborador"}</DialogTitle>
            <DialogDescription>Preencha as informações do colaborador.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Nome Completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do colaborador" required autoFocus />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" required />
            </div>
            <div className="space-y-2">
              <Label>Cargo / Função</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TEAM_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Senioridade</Label>
              <Select value={seniority} onValueChange={setSeniority}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SENIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Especialidade</Label>
              <Select value={specialty} onValueChange={setSpecialty} disabled={!requiresSpecialty}>
                <SelectTrigger><SelectValue placeholder={requiresSpecialty ? "Selecione" : "Não aplicável"} /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SPECIALTY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Projetos</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal h-10">
                    <span className="flex flex-wrap gap-1 items-center text-left">
                      {productIds.length === 0 ? (
                        <span className="text-muted-foreground">Selecione (opcional)</span>
                      ) : (
                        productIds.map((pid) => (
                          <Badge key={pid} variant="secondary" className="text-xs">{productMap[pid] ?? pid}</Badge>
                        ))
                      )}
                    </span>
                    <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {products.length === 0 && (
                      <p className="text-sm text-muted-foreground p-2">Nenhum projeto cadastrado.</p>
                    )}
                    {products.map((p) => {
                      const checked = productIds.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              setProductIds((prev) =>
                                prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                              )
                            }
                          />
                          <span className="text-sm">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
              <Button type="submit" className="gap-2"><Plus className="w-4 h-4" /> {editing ? "Salvar" : "Adicionar Colaborador"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div>
        <h2 className="text-sm font-semibold text-foreground/80 mb-3">Membros do Time</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const alloc = ((m as any).allocation_percent as number) ?? Math.round((m.daily_capacity_hours / 8) * 100);
            const sen = m.seniority as Seniority;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-2xl h-full">
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserCircle2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground truncate flex items-center gap-2">
                          {m.name}
                          {!m.active && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">Inativo</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {TEAM_ROLE_LABELS[m.role as TeamRole]} • {SPECIALTY_LABELS[m.specialty as Specialty]}
                        </div>
                        {(m as any).email && (
                          <div className="text-[11px] text-muted-foreground truncate">{(m as any).email}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={SENIORITY_BADGE[sen] ?? ""}>{SENIORITY_LABELS[sen]}</Badge>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{alloc}% alocado</Badge>
                      {m.product_id && (
                        <Badge variant="outline" className="text-xs">{productMap[m.product_id] ?? "—"}</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => handleEdit(m)}>
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => handleDelete(m)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" /> Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {members.length === 0 && (
            <Card className="rounded-2xl md:col-span-2 lg:col-span-3">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nenhum colaborador cadastrado ainda.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
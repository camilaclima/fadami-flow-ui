import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Archive, Trash2, Users, Package, UserCircle2, Briefcase } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useProducts, useAddProduct, useUpdateProduct, type Product } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { useAllTeamMembers, useAddTeamMember, useUpdateTeamMember, useTeamMembers } from "@/hooks/useTeamMembers";
import {
  useStakeholders, useSaveStakeholder, useDeleteStakeholder,
  IMPORTANCE_LABELS, IMPORTANCE_STYLES, type Stakeholder, type StakeholderImportance,
} from "@/hooks/useStakeholders";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
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

const SENIORITY_BADGE: Record<Seniority, string> = {
  estagiario: "bg-teal-500/15 text-teal-600 border-teal-500/20",
  junior: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  pleno: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  senior: "bg-purple-500/15 text-purple-600 border-purple-500/20",
  especialista: "bg-amber-500/15 text-amber-600 border-amber-500/20",
};

export default function TeamProjectConfigPage() {
  return (
    <div className="fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração do Time e do Projeto</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie projetos, stakeholders e colaboradores em um único lugar.
        </p>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects" className="gap-2"><Package className="w-4 h-4" /> Projetos</TabsTrigger>
          <TabsTrigger value="team" className="gap-2"><Users className="w-4 h-4" /> Time</TabsTrigger>
        </TabsList>
        <TabsContent value="projects" className="mt-6">
          <ProjectsSection />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <TeamSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------- PROJECTS -------------------------------------- */

function ProjectsSection() {
  const { user } = useAuth();
  const { data: products = [] } = useProducts();
  const { data: clients = [] } = useClients();
  const { data: stakeholders = [] } = useStakeholders();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const saveStakeholder = useSaveStakeholder();
  const deleteStakeholder = useDeleteStakeholder();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<Product | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string>("__none__");
  const [status, setStatus] = useState<string>("active");

  // Project details modal
  const [detailProject, setDetailProject] = useState<Product | null>(null);

  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.name])), [clients]);

  const resetProject = () => {
    setEditing(null); setName(""); setDescription(""); setClientId("__none__"); setStatus("active");
  };

  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const desc = clientId !== "__none__"
      ? `[Cliente:${clientId}] ${description}`
      : description;
    if (editing) {
      updateProduct.mutate({ id: editing.id, name: name.trim(), description: desc, status });
    } else {
      addProduct.mutate({ name: name.trim(), description: desc, color: "hsl(243 75% 59%)", status });
    }
    resetProject();
  };

  const handleEditProject = (p: Product) => {
    setEditing(p);
    setName(p.name);
    const m = p.description.match(/^\[Cliente:([^\]]+)\]\s?(.*)$/);
    if (m) { setClientId(m[1]); setDescription(m[2]); } else { setClientId("__none__"); setDescription(p.description); }
    setStatus(p.status);
  };

  const handleArchive = (p: Product) => {
    updateProduct.mutate({ id: p.id, status: p.status === "inactive" ? "active" : "inactive" });
  };

  const getCleanDesc = (d: string) => d.replace(/^\[Cliente:[^\]]+\]\s?/, "");
  const getProjectClient = (d: string) => {
    const m = d.match(/^\[Cliente:([^\]]+)\]/);
    return m ? clientMap[m[1]] : null;
  };

  return (
    <div className="space-y-6">
      {/* Project form toggle */}
      {(showProjectForm || editing) ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">{editing ? "Editar Projeto" : "Novo Projeto"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitProject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Projeto</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Portal do Cliente" required />
              </div>
              <div className="space-y-2">
                <Label>Cliente / Área</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição Breve</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Resumo do projeto" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { resetProject(); setShowProjectForm(false); }}>Cancelar</Button>
                <Button type="submit" className="gap-2"><Plus className="w-4 h-4" /> {editing ? "Salvar" : "Cadastrar Projeto"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setShowProjectForm(true)}><Plus className="w-4 h-4" /> Novo Projeto</Button>
        </div>
      )}

      {/* Project cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground/80 mb-3">Projetos Cadastrados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const statusCfg = PROJECT_STATUS_OPTIONS.find((s) => s.value === p.status) ?? PROJECT_STATUS_OPTIONS[0];
            const client = getProjectClient(p.description);
            const desc = getCleanDesc(p.description);
            const projectStakeholders = stakeholders.filter((s) => s.product_id === p.id);
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
                    {client && <div className="text-xs text-muted-foreground"><span className="font-medium text-foreground/70">Cliente:</span> {client}</div>}
                    <p className="text-sm text-muted-foreground line-clamp-3 min-h-[40px]">{desc || "Sem descrição."}</p>
                    {projectStakeholders.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{projectStakeholders.length}</span> stakeholder(s)
                      </div>
                    )}
                    <div className="flex gap-2 mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={(e) => { e.stopPropagation(); handleEditProject(p); }}>
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Button>
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
                Nenhum projeto cadastrado ainda.
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
  const saveStakeholder = useSaveStakeholder();
  const deleteStakeholder = useDeleteStakeholder();
  const updateMember = useUpdateTeamMember();

  const [shEditing, setShEditing] = useState<Stakeholder | null>(null);
  const [shName, setShName] = useState("");
  const [shContact, setShContact] = useState("");
  const [shArea, setShArea] = useState("");
  const [shImportance, setShImportance] = useState<StakeholderImportance>("medium");

  const projectStakeholders = useMemo(
    () => stakeholders.filter((s) => s.product_id === project?.id),
    [stakeholders, project?.id],
  );

  const reset = () => {
    setShEditing(null); setShName(""); setShContact(""); setShArea(""); setShImportance("medium");
  };

  const handleEdit = (s: Stakeholder) => {
    setShEditing(s); setShName(s.name); setShContact(s.contact); setShArea(s.area); setShImportance(s.importance);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !shName.trim()) { toast.error("Informe o nome"); return; }
    saveStakeholder.mutate({
      id: shEditing?.id,
      product_id: project.id,
      name: shName.trim(),
      contact: shContact.trim(),
      area: shArea.trim(),
      importance: shImportance,
      updated_by: user?.id,
    } as any, { onSuccess: reset });
  };

  const toggleMember = (memberId: string, assigned: boolean) => {
    if (!project) return;
    updateMember.mutate({
      id: memberId,
      product_id: assigned ? project.id : null,
    } as any);
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
              <h3 className="text-sm font-semibold text-foreground">Stakeholders</h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome</Label>
                  <Input value={shName} onChange={(e) => setShName(e.target.value)} placeholder="Nome do stakeholder" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Contato</Label>
                  <Input value={shContact} onChange={(e) => setShContact(e.target.value)} placeholder="E-mail ou telefone" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Área</Label>
                  <Input value={shArea} onChange={(e) => setShArea(e.target.value)} placeholder="Ex: Infra, Produto" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Importância</Label>
                  <Select value={shImportance} onValueChange={(v) => setShImportance(v as StakeholderImportance)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(IMPORTANCE_LABELS) as StakeholderImportance[]).map((k) => (
                        <SelectItem key={k} value={k}>{IMPORTANCE_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  {shEditing && <Button type="button" variant="outline" size="sm" onClick={reset}>Cancelar</Button>}
                  <Button type="submit" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> {shEditing ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </form>

              <div className="space-y-2">
                {projectStakeholders.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum stakeholder cadastrado.</p>
                )}
                {projectStakeholders.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{s.name}</span>
                        <Badge variant="outline" className={IMPORTANCE_STYLES[s.importance]}>{IMPORTANCE_LABELS[s.importance]}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[s.area, s.contact].filter(Boolean).join(" · ") || "—"}
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
              <div>
                <h3 className="text-sm font-semibold text-foreground">Colaboradores Alocados</h3>
                <p className="text-xs text-muted-foreground">Selecione os membros do time que atuam neste projeto.</p>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {members.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum colaborador cadastrado.</p>
                )}
                {members.map((m) => {
                  const assignedHere = m.product_id === project.id;
                  const assignedElsewhere = !!m.product_id && m.product_id !== project.id;
                  return (
                    <label key={m.id} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/40 cursor-pointer">
                      <Checkbox
                        checked={assignedHere}
                        onCheckedChange={(v) => toggleMember(m.id, !!v)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{m.name}</span>
                          <Badge variant="outline" className={SENIORITY_BADGE[m.seniority as Seniority]}>
                            {SENIORITY_LABELS[m.seniority as Seniority]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{TEAM_ROLE_LABELS[m.role as TeamRole]}</span>
                        </div>
                        {assignedElsewhere && (
                          <p className="text-[11px] text-amber-600 mt-0.5">
                            Atualmente em outro projeto — marcar irá realocar.
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{(m as any).allocation_percent ?? 100}%</span>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------- TEAM -------------------------------------- */

function TeamSection() {
  const { user } = useAuth();
  const { data: members = [] } = useAllTeamMembers();
  const { data: products = [] } = useProducts();
  const addMember = useAddTeamMember();
  const updateMember = useUpdateTeamMember();
  const qc = useQueryClient();

  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("dev");
  const [seniority, setSeniority] = useState<Seniority>("pleno");
  const [specialty, setSpecialty] = useState<Specialty>("fullstack");
  const [allocation, setAllocation] = useState<number>(100);
  const [productId, setProductId] = useState<string>("__none__");

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);

  const reset = () => {
    setEditing(null); setShowForm(false); setName(""); setRole("dev"); setSeniority("pleno");
    setSpecialty("fullstack"); setAllocation(100); setProductId("__none__");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const dailyHours = +(8 * (allocation / 100)).toFixed(2);
    const payload = {
      name: name.trim(), role, seniority, specialty,
      daily_capacity_hours: dailyHours,
      allocation_percent: allocation,
      product_id: productId === "__none__" ? null : productId,
      coordinator_id: user?.id ?? "",
    } as any;
    if (editing) {
      updateMember.mutate({ id: editing.id, ...payload });
    } else {
      addMember.mutate(payload);
    }
    reset();
  };

  const handleEdit = (m: TeamMember) => {
    setEditing(m);
    setName(m.name);
    setRole(m.role as TeamRole);
    setSeniority(m.seniority as Seniority);
    setSpecialty(m.specialty as Specialty);
    setAllocation(((m as any).allocation_percent as number) ?? Math.round((m.daily_capacity_hours / 8) * 100));
    setProductId(m.product_id ?? "__none__");
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
      {/* Team member form toggle */}
      {(showForm || editing) ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">{editing ? "Editar Colaborador" : "Novo Colaborador"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label>Nome Completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do colaborador" required />
              </div>
              <div className="space-y-2">
                <Label>Cargo / Função</Label>
                <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEAM_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Senioridade</Label>
                <Select value={seniority} onValueChange={(v) => setSeniority(v as Seniority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SENIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Select value={specialty} onValueChange={(v) => setSpecialty(v as Specialty)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SPECIALTY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fator de Carga / Disponibilidade</Label>
                <Select value={String(allocation)} onValueChange={(v) => setAllocation(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALLOCATION_OPTIONS.map((a) => <SelectItem key={a} value={String(a)}>{a}% Alocado</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Projeto Principal</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>
                <Button type="submit" className="gap-2"><Plus className="w-4 h-4" /> {editing ? "Salvar" : "Adicionar Colaborador"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button className="gap-2" onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Novo Colaborador</Button>
        </div>
      )}

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
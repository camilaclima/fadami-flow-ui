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
import { useProducts, useAddProduct, useUpdateProduct, type Product } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { useAllTeamMembers, useAddTeamMember, useUpdateTeamMember } from "@/hooks/useTeamMembers";
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState<string>("__none__");
  const [status, setStatus] = useState<string>("active");

  // Stakeholder form
  const [shProductId, setShProductId] = useState<string>("");
  const [shName, setShName] = useState("");
  const [shContact, setShContact] = useState("");
  const [shArea, setShArea] = useState("");
  const [shImportance, setShImportance] = useState<StakeholderImportance>("medium");
  const [shEditing, setShEditing] = useState<Stakeholder | null>(null);

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

  const resetStakeholder = () => {
    setShEditing(null); setShName(""); setShContact(""); setShArea(""); setShImportance("medium");
  };

  const handleSubmitStakeholder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shProductId || !shName.trim()) {
      toast.error("Selecione um projeto e informe o nome");
      return;
    }
    saveStakeholder.mutate({
      id: shEditing?.id,
      product_id: shProductId,
      name: shName.trim(),
      contact: shContact.trim(),
      area: shArea.trim(),
      importance: shImportance,
      updated_by: user?.id,
    } as any, { onSuccess: resetStakeholder });
  };

  const handleEditStakeholder = (s: Stakeholder) => {
    setShEditing(s);
    setShProductId(s.product_id);
    setShName(s.name);
    setShContact(s.contact);
    setShArea(s.area);
    setShImportance(s.importance);
  };

  const getCleanDesc = (d: string) => d.replace(/^\[Cliente:[^\]]+\]\s?/, "");
  const getProjectClient = (d: string) => {
    const m = d.match(/^\[Cliente:([^\]]+)\]/);
    return m ? clientMap[m[1]] : null;
  };

  return (
    <div className="space-y-6">
      {/* Project form */}
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
              {editing && <Button type="button" variant="outline" onClick={resetProject}>Cancelar</Button>}
              <Button type="submit" className="gap-2"><Plus className="w-4 h-4" /> {editing ? "Salvar" : "Cadastrar Projeto"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
                <Card className="rounded-2xl h-full flex flex-col">
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
                    <div className="flex gap-2 mt-auto pt-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => handleEditProject(p)}>
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => handleArchive(p)}>
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

      {/* Stakeholders */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Stakeholders</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitStakeholder} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={shProductId || "__none__"} onValueChange={(v) => setShProductId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" disabled>Selecione</SelectItem>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={shName} onChange={(e) => setShName(e.target.value)} placeholder="Nome do stakeholder" />
            </div>
            <div className="space-y-2">
              <Label>Contato</Label>
              <Input value={shContact} onChange={(e) => setShContact(e.target.value)} placeholder="E-mail ou telefone" />
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Input value={shArea} onChange={(e) => setShArea(e.target.value)} placeholder="Ex: Infra, Produto, Negócio" />
            </div>
            <div className="space-y-2">
              <Label>Importância</Label>
              <Select value={shImportance} onValueChange={(v) => setShImportance(v as StakeholderImportance)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(IMPORTANCE_LABELS) as StakeholderImportance[]).map((k) => (
                    <SelectItem key={k} value={k}>{IMPORTANCE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              {shEditing && <Button type="button" variant="outline" onClick={resetStakeholder}>Cancelar</Button>}
              <Button type="submit" className="gap-2 flex-1"><Plus className="w-4 h-4" /> {shEditing ? "Salvar" : "Adicionar"}</Button>
            </div>
          </form>

          <div className="mt-6 space-y-2">
            {stakeholders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum stakeholder cadastrado.</p>
            )}
            {stakeholders.map((s) => {
              const product = products.find((p) => p.id === s.product_id);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{s.name}</span>
                      <Badge variant="outline" className={IMPORTANCE_STYLES[s.importance]}>{IMPORTANCE_LABELS[s.importance]}</Badge>
                      {product && <Badge variant="outline" className="text-xs">{product.name}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {s.area && <span className="mr-2">Área: {s.area}</span>}
                      {s.contact && <span>• {s.contact}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleEditStakeholder(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteStakeholder.mutate(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
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
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("dev");
  const [seniority, setSeniority] = useState<Seniority>("pleno");
  const [specialty, setSpecialty] = useState<Specialty>("fullstack");
  const [allocation, setAllocation] = useState<number>(100);
  const [productId, setProductId] = useState<string>("__none__");

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p.name])), [products]);

  const reset = () => {
    setEditing(null); setName(""); setRole("dev"); setSeniority("pleno");
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
              {editing && <Button type="button" variant="outline" onClick={reset}>Cancelar</Button>}
              <Button type="submit" className="gap-2"><Plus className="w-4 h-4" /> {editing ? "Salvar" : "Adicionar Colaborador"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
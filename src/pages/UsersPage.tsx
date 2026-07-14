import { useProfiles, type Profile } from "@/hooks/useProfiles";
import { useRoles } from "@/hooks/useRoles";
import { useAccessGroups } from "@/hooks/useAccessGroups";
import { useProfileGroups, useProfileSquads } from "@/hooks/useProfileRelations";
import { useSquads } from "@/hooks/useSquads";
import { useState } from "react";
import { UserPlus, Pencil, Copy, UserX, UserCheck, KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { useToggleProfileActive } from "@/hooks/useProfiles";
import { UserFormModalSupabase } from "@/components/admin/UserFormModalSupabase";
import { AdminChangePasswordModal } from "@/components/admin/AdminChangePasswordModal";
import { useAuth } from "@/contexts/AuthContext";

export default function UsersPage() {
  const { data: profiles = [] } = useProfiles();
  const { data: roles = [] } = useRoles();
  const { data: accessGroups = [] } = useAccessGroups();
  const { data: profileGroups = [] } = useProfileGroups();
  const { data: profileSquads = [] } = useProfileSquads();
  const { data: squads = [] } = useSquads();
  const toggleActive = useToggleProfileActive();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [cloneData, setCloneData] = useState<any | null>(null);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<Profile | null>(null);
  const { permissions } = useAuth();
  const isAdmin = permissions.includes("users");

  // Estados dos novos filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedSquad, setSelectedSquad] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const handleNew = () => {
    setEditing(null);
    setCloneData(null);
    setModalOpen(true);
  };

  const handleEdit = (u: Profile) => {
    setEditing(u);
    setCloneData(null);
    setModalOpen(true);
  };

  const handleClone = (u: Profile) => {
    setEditing(null);

    const selectedSquadIds = profileSquads.filter((ps) => ps.profile_id === u.id).map((ps) => ps.squad_id);

    const selectedGroupIds = profileGroups.filter((pg) => pg.profile_id === u.id).map((pg) => pg.group_id);

    setCloneData({
      role_id: u.role_id,
      selectedSquadIds,
      selectedGroupIds,
    });

    setModalOpen(true);
  };

  const handleToggle = (u: Profile) => {
    toggleActive.mutate({ id: u.id, active: u.active });
  };

  const handleChangePassword = (u: Profile) => {
    setPwTarget(u);
    setPwModalOpen(true);
  };

  const getSquadNames = (profileId: string) => {
    const ids = profileSquads.filter((ps) => ps.profile_id === profileId).map((ps) => ps.squad_id);
    return (
      ids
        .map((id) => squads.find((s) => s.id === id)?.name)
        .filter(Boolean)
        .join(", ") || "-"
    );
  };

  const getRoleName = (id: string | null) => roles.find((r) => r.id === id)?.title ?? "-";

  const getGroupNames = (profileId: string) => {
    const ids = profileGroups.filter((pg) => pg.profile_id === profileId).map((pg) => pg.group_id);
    return (
      ids
        .map((id) => accessGroups.find((g) => g.id === id)?.name)
        .filter(Boolean)
        .join(", ") || "-"
    );
  };

  // Lógica dinâmica de filtragem em tempo real
  const filteredProfiles = profiles.filter((u) => {
    // 1. Filtro por nome ou e-mail (texto livre)
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const email = (u.email || "").toLowerCase();
    const matchesSearch =
      !searchTerm || fullName.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());

    // 2. Filtro por cargo
    const matchesRole = !selectedRole || u.role_id === selectedRole;

    // 3. Filtro por squad
    const userSquads = profileSquads.filter((ps) => ps.profile_id === u.id).map((ps) => ps.squad_id);
    const matchesSquad = !selectedSquad || userSquads.includes(selectedSquad);

    // 4. Filtro por status (ativo/inativo)
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && u.active) ||
      (selectedStatus === "inactive" && !u.active);

    return matchesSearch && matchesRole && matchesSquad && matchesStatus;
  });

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os usuários e seus acessos</p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <UserPlus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      {/* Grid de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-card border border-border p-5 rounded-2xl">
        {/* Texto Livre */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Busca</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
        </div>

        {/* Cargo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-border text-foreground"
          >
            <option value="" className="bg-background">
              Todos os cargos
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id} className="bg-background">
                {r.title}
              </option>
            ))}
          </select>
        </div>

        {/* Squad */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Squad</label>
          <select
            value={selectedSquad}
            onChange={(e) => setSelectedSquad(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-border text-foreground"
          >
            <option value="" className="bg-background">
              Todas as squads
            </option>
            {squads.map((s) => (
              <option key={s.id} value={s.id} className="bg-background">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border-border text-foreground"
          >
            <option value="all" className="bg-background">
              Todos
            </option>
            <option value="active" className="bg-background">
              Ativos
            </option>
            <option value="inactive" className="bg-background">
              Inativos
            </option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários Filtrados */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Squads</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Grupos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((u) => (
                <TableRow key={u.id} className={!u.active ? "opacity-50" : ""}>
                  <TableCell className="font-medium text-foreground">
                    {u.first_name} {u.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate">{getSquadNames(u.id)}</TableCell>
                  <TableCell className="text-sm">{getRoleName(u.role_id)}</TableCell>
                  <TableCell className="text-sm max-w-[160px] truncate">{getGroupNames(u.id)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={u.active ? "default" : "secondary"}
                      className={
                        u.active
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }
                    >
                      {u.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(u)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleClone(u)} title="Clonar">
                        <Copy className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => handleChangePassword(u)} title="Alterar senha">
                          <KeyRound className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggle(u)}
                        title={u.active ? "Inativar" : "Ativar"}
                      >
                        {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhum usuário encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </motion.div>

      <UserFormModalSupabase open={modalOpen} onOpenChange={setModalOpen} profile={editing} cloneData={cloneData} />
      <AdminChangePasswordModal open={pwModalOpen} onOpenChange={setPwModalOpen} profile={pwTarget} />
    </div>
  );
}

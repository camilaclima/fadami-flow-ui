import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  phone: string;
  email: string;
  concession: string;
  area: string;
  description: string;
}

export function useClientContacts(clientId?: string) {
  return useQuery({
    queryKey: ["client_contacts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at");
      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!clientId,
  });
}

export function useAllClientContacts() {
  return useQuery({
    queryKey: ["client_contacts_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data as ClientContact[];
    },
  });
}

export function useAddClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      contacts,
    }: {
      name: string;
      contacts: Omit<ClientContact, "id" | "client_id">[];
    }) => {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({ name })
        .select("id")
        .single();
      if (clientError) throw clientError;

      if (contacts.length > 0) {
        const rows = contacts.map((c) => ({ ...c, client_id: client.id }));
        const { error: contactsError } = await supabase
          .from("client_contacts")
          .insert(rows);
        if (contactsError) throw contactsError;
      }

      return client;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client_contacts_all"] });
      toast.success("Cliente criado com sucesso!");
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      contacts,
    }: {
      id: string;
      name: string;
      contacts: Omit<ClientContact, "id" | "client_id">[];
    }) => {
      const { error: clientError } = await supabase
        .from("clients")
        .update({ name })
        .eq("id", id);
      if (clientError) throw clientError;

      // Replace all contacts
      await supabase.from("client_contacts").delete().eq("client_id", id);
      if (contacts.length > 0) {
        const rows = contacts.map((c) => ({ ...c, client_id: id }));
        const { error: contactsError } = await supabase
          .from("client_contacts")
          .insert(rows);
        if (contactsError) throw contactsError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client_contacts_all"] });
      qc.invalidateQueries({ queryKey: ["client_contacts"] });
      toast.success("Cliente atualizado com sucesso!");
    },
  });
}

export function useToggleClientActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("clients").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success(active ? "Cliente reativado!" : "Cliente desativado!");
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_contacts_all"] });
      qc.invalidateQueries({ queryKey: ["client_contacts"] });
      toast.success("Contato removido!");
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ClientContact> & { id: string }) => {
      const { error } = await supabase
        .from("client_contacts")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_contacts_all"] });
      qc.invalidateQueries({ queryKey: ["client_contacts"] });
      toast.success("Contato atualizado!");
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client_contacts_all"] });
      toast.success("Cliente removido!");
    },
  });
}

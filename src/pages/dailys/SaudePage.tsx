import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Camera, VolumeX } from "lucide-react";
import { useDailyMeetings, useAllAttendance } from "@/hooks/useDailyMeetings";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { format, parseISO, subDays } from "date-fns";
import { useDailySim, isSquadAllowed } from "@/contexts/DailySimContext";
import { AccessDeniedCard } from "@/components/dailys/AccessDeniedCard";

function useAllEntries() {
  return useQuery({
    queryKey: ["dev_daily_entries", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("dev_daily_entries") as any).select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export default function SaudePage() {
  const { current: sim } = useDailySim();
  const { data: allEntries = [] } = useAllEntries();
  const { data: allMeetings = [] } = useDailyMeetings();
  const { data: allAttendance = [] } = useAllAttendance();

  const entries = useMemo(
    () => allEntries.filter((e: any) => isSquadAllowed(sim, e.squad_id)),
    [allEntries, sim]
  );
  const meetings = useMemo(
    () => allMeetings.filter((m: any) => isSquadAllowed(sim, m.squad_id)),
    [allMeetings, sim]
  );
  const allowedMeetingIds = useMemo(() => new Set(meetings.map((m: any) => m.id)), [meetings]);
  const attendance = useMemo(
    () => allAttendance.filter((a: any) => allowedMeetingIds.has(a.meeting_id)),
    [allAttendance, allowedMeetingIds]
  );

  const today = new Date();
  const last7 = useMemo(() => Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i)), []);

  if (sim.role === "dev") {
    return <AccessDeniedCard message="Métricas de saúde são restritas a GPs e Diretores." />;
  }

  const impedimentRate = useMemo(() => {
    const sevenAgo = subDays(today, 7).toISOString().slice(0, 10);
    const recent = entries.filter(e => e.entry_date >= sevenAgo);
    if (!recent.length) return 0;
    const withImp = recent.filter(e => (e.impediments ?? "").trim().length > 0).length;
    return Math.round((withImp / recent.length) * 100);
  }, [entries]);

  const punctualityRate = useMemo(() => {
    if (!entries.length) return 0;
    // entrega antecipada = created_at <= entry_date 00:00 do dia
    const ant = entries.filter(e => {
      const created = new Date(e.created_at);
      const target = parseISO(e.entry_date);
      return created < target;
    }).length;
    return Math.round((ant / entries.length) * 100);
  }, [entries]);

  const audiovisualByDate = useMemo(() => {
    return last7.map(d => {
      const iso = d.toISOString().slice(0, 10);
      const meetingIds = meetings.filter(m => m.meeting_date === iso).map(m => m.id);
      const rows = attendance.filter(a => meetingIds.includes(a.meeting_id));
      const total = rows.length;
      return {
        date: format(d, "dd/MM"),
        camera: rows.filter(r => r.camera_on).length,
        silent: rows.filter(r => r.stayed_silent).length,
        total,
      };
    });
  }, [last7, meetings, attendance]);

  const impedimentTrend = useMemo(() => {
    return last7.map(d => {
      const iso = d.toISOString().slice(0, 10);
      const rows = entries.filter(e => e.entry_date === iso);
      const imp = rows.filter(r => (r.impediments ?? "").trim().length > 0).length;
      return { date: format(d, "dd/MM"), impedimentos: imp, total: rows.length };
    });
  }, [last7, entries]);

  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6" /> Saúde e Engajamento</h1>
        <p className="text-sm text-muted-foreground">Métricas consolidadas das dailies dos últimos 7 dias.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <div><div className="text-2xl font-bold">{impedimentRate}%</div><div className="text-xs text-muted-foreground">Impedimentos ativos (7d)</div></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <Activity className="w-8 h-8 text-emerald-500" />
            <div><div className="text-2xl font-bold">{punctualityRate}%</div><div className="text-xs text-muted-foreground">Assiduidade (preenchimento antecipado)</div></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="pt-5 flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            <div><div className="text-2xl font-bold">{meetings.length}</div><div className="text-xs text-muted-foreground">Dailies registradas</div></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Câmeras ligadas vs <VolumeX className="w-4 h-4" /> silêncio</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={audiovisualByDate}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="camera" name="Câmera ligada" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="silent" name="Silêncio" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Tendência de impedimentos</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={impedimentTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="impedimentos" stroke="#F97316" strokeWidth={2} dot />
                <Line type="monotone" dataKey="total" name="Registros" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

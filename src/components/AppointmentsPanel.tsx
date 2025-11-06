import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: string;
  world?: { code: string; name: string; theme_colors: any };
}

const AppointmentsPanel = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayAppointments();
  }, []);

  const fetchTodayAppointments = async () => {
    try {
      const today = new Date();
      const startDate = startOfDay(today).toISOString();
      const endDate = endOfDay(today).toISOString();

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setAppointments([]);
        return;
      }

      // 1) RDV du jour
      let { data: todayData, error: todayError } = await supabase
        .from('appointments')
        .select('id,title,description,start_time,end_time,status,user_id,world_id')
        .eq('user_id', userId)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true });

      if (todayError) {
        console.error('Error fetching today appointments:', todayError);
        return;
      }

      // 2) Sinon, prochains RDV
      let rows = todayData ?? [];
      if (rows.length === 0) {
        const { data: upcomingData, error: upcomingError } = await supabase
          .from('appointments')
          .select('id,title,description,start_time,end_time,status,user_id,world_id')
          .eq('user_id', userId)
          .gt('start_time', endDate)
          .eq('status', 'scheduled')
          .order('start_time', { ascending: true })
          .limit(5);

        if (upcomingError) {
          console.error('Error fetching upcoming appointments:', upcomingError);
          return;
        }
        rows = upcomingData ?? [];
      }

      // 3) Enrichir avec worlds via une requête séparée
      if (rows.length > 0) {
        const worldIds = Array.from(new Set(rows.map(r => r.world_id).filter(Boolean)));
        let worldMap: Record<string, any> = {};
        if (worldIds.length > 0) {
          const { data: worldsData } = await supabase
            .from('worlds')
            .select('id, code, name, theme_colors')
            .in('id', worldIds);

          if (worldsData) {
            worldMap = Object.fromEntries(worldsData.map(w => [w.id, w]));
          }
        }

        setAppointments(
          rows.map(a => ({
            ...a,
            world: a.world_id ? worldMap[a.world_id] : undefined,
          }))
        );
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="border-0 shadow-vuexy-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Rendez-vous du jour
          </CardTitle>
          <Button size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-1" />
            Nouveau RDV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun rendez-vous aujourd'hui
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg bg-primary/10">
                    <span className="text-xs font-medium text-primary">
                      {format(new Date(appointment.start_time), 'HH:mm')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(appointment.end_time), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">{appointment.title}</h4>
                      {appointment.world && (
                        <Badge 
                          style={{ 
                            backgroundColor: `${appointment.world.theme_colors.primary}15`,
                            color: appointment.world.theme_colors.primary,
                            borderColor: `${appointment.world.theme_colors.primary}30`
                          }}
                          className="text-xs"
                        >
                          {appointment.world.code}
                        </Badge>
                      )}
                    </div>
                    {appointment.description && (
                      <p className="text-xs text-muted-foreground">{appointment.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsPanel;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface AppointmentsTabProps {
  dossierId: string;
  worldId: string;
}

interface Appointment {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type: string;
}

const AppointmentsTab = ({ dossierId, worldId }: AppointmentsTabProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [dossierId]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('dossier_id', dossierId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Erreur lors du chargement des rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      reconnaissance: 'Reconnaissance',
      pointage_chiffrage: 'Pointage chiffrage',
      rcci: 'RCCI',
      cloture: 'Clôture',
    };
    return labels[type] || type;
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      scheduled: 'secondary',
      completed: 'outline',
      cancelled: 'outline',
    };
    return variants[status] || 'secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Rendez-vous liés au dossier
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun rendez-vous planifié</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{appointment.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {appointment.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusBadgeVariant(appointment.status)}>
                        {appointment.status}
                      </Badge>
                      {appointment.appointment_type && (
                        <Badge variant="outline">
                          {getAppointmentTypeLabel(appointment.appointment_type)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      📅 {format(new Date(appointment.start_time), 'dd MMMM yyyy', { locale: fr })}
                    </span>
                    <span>
                      🕐 {format(new Date(appointment.start_time), 'HH:mm', { locale: fr })} -{' '}
                      {format(new Date(appointment.end_time), 'HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AppointmentsTab;

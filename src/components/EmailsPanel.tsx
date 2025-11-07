import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Star, Paperclip, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Email {
  id: string;
  sender: string;
  senderAvatar: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  starred: boolean;
  hasAttachment: boolean;
  priority: 'high' | 'normal' | 'low';
}

const DEMO_EMAILS: Email[] = [
  {
    id: '1',
    sender: 'Marie Dubois',
    senderAvatar: 'MD',
    subject: 'URGENT - Sinistre incendie habitation Somain',
    preview: 'Bonjour, notre maison a subi un incendie hier soir. L\'assurance nous a conseillé de vous contacter pour une expertise...',
    time: '08:40 AM',
    unread: true,
    starred: false,
    hasAttachment: false,
    priority: 'high'
  },
  {
    id: '2',
    sender: 'AXA Assurances',
    senderAvatar: 'AX',
    subject: 'Dossier 45892 - Demande complément expertise',
    preview: 'Veuillez trouver en pièce jointe notre rapport préliminaire concernant le dossier de dégât des eaux...',
    time: '10:12 AM',
    unread: true,
    starred: false,
    hasAttachment: true,
    priority: 'normal'
  },
  {
    id: '3',
    sender: 'Pierre Lefevre',
    senderAvatar: 'PL',
    subject: 'Projet extension maison - Demande devis',
    preview: 'Nous souhaitons faire réaliser une extension de 30m² sur notre pavillon à Somain. Pourriez-vous nous établir un devis...',
    time: '12:44 PM',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'normal'
  },
  {
    id: '4',
    sender: 'Mairie de Somain',
    senderAvatar: 'MS',
    subject: 'Permis de construire PC 2025-034 - Avis favorable',
    preview: 'Nous avons le plaisir de vous informer que votre demande de permis de construire a reçu un avis favorable...',
    time: 'Hier',
    unread: false,
    starred: true,
    hasAttachment: false,
    priority: 'low'
  }
];

const EmailsPanel = () => {
  const navigate = useNavigate();
  const unreadCount = DEMO_EMAILS.filter(e => e.unread).length;

  return (
    <Card className="border-0 shadow-vuexy-md hover:shadow-vuexy-lg transition-shadow">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <span>Boîte de réception</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-2">
                {unreadCount} nouveaux
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mailbox')}
            className="h-8"
          >
            Voir tout
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {DEMO_EMAILS.map((email) => (
            <div
              key={email.id}
              onClick={() => navigate('/mailbox')}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                email.unread
                  ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                  : 'bg-card hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {email.senderAvatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-sm truncate ${email.unread ? 'font-semibold' : 'font-medium'}`}>
                        {email.sender}
                      </p>
                      {email.priority === 'high' && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1">
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {email.starred && (
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      )}
                      {email.hasAttachment && (
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">{email.time}</span>
                    </div>
                  </div>
                  <p className={`text-xs truncate mb-1 ${email.unread ? 'font-medium' : ''}`}>
                    {email.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {email.preview}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailsPanel;

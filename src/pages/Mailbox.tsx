import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  Send,
  FileText,
  Star,
  Inbox,
  Trash2,
  AlertCircle,
  Search,
  Archive,
  Tag,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  labels: string[];
}

const DEMO_EMAILS: Email[] = [
  {
    id: '1',
    sender: 'Marie Dubois',
    senderAvatar: 'MD',
    subject: 'URGENT - Sinistre incendie habitation Somain',
    preview: 'Bonjour, notre maison a subi un incendie hier soir. L\'assurance nous a conseillé de vous contacter pour une expertise d\'assuré. Pouvons-nous prévoir un rendez-vous rapidement ?',
    time: '08:40 AM',
    unread: true,
    starred: false,
    hasAttachment: false,
    priority: 'high',
    labels: ['urgent', 'JDE']
  },
  {
    id: '2',
    sender: 'AXA Assurances',
    senderAvatar: 'AX',
    subject: 'Dossier 45892 - Demande complément expertise',
    preview: 'Veuillez trouver en pièce jointe notre rapport préliminaire concernant le dossier de dégât des eaux. Nous aurions besoin de compléments d\'information sur l\'évaluation des dommages.',
    time: '10:12 AM',
    unread: true,
    starred: false,
    hasAttachment: true,
    priority: 'normal',
    labels: ['JDE']
  },
  {
    id: '3',
    sender: 'Pierre Lefevre',
    senderAvatar: 'PL',
    subject: 'Projet extension maison - Demande devis',
    preview: 'Nous souhaitons faire réaliser une extension de 30m² sur notre pavillon à Somain. Pourriez-vous nous établir un devis pour la maîtrise d\'œuvre complète ?',
    time: '12:44 PM',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'normal',
    labels: ['JDMO']
  },
  {
    id: '4',
    sender: 'Mairie de Somain',
    senderAvatar: 'MS',
    subject: 'Permis de construire PC 2025-034 - Avis favorable',
    preview: 'Nous avons le plaisir de vous informer que votre demande de permis de construire a reçu un avis favorable de la commission d\'urbanisme. Le document officiel est disponible en mairie.',
    time: 'Hier',
    unread: false,
    starred: true,
    hasAttachment: false,
    priority: 'low',
    labels: ['JDMO']
  },
  {
    id: '5',
    sender: 'Jean Martin',
    senderAvatar: 'JM',
    subject: 'Chantier Rue Pasteur - Point avancement travaux',
    preview: 'Les travaux de maçonnerie sont terminés. Début des travaux de plâtrerie prévu lundi prochain. Le planning est respecté, livraison matériaux confirmée pour vendredi.',
    time: 'Hier',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'normal',
    labels: ['DBCS']
  },
  {
    id: '6',
    sender: 'Sophie Bertrand',
    senderAvatar: 'SB',
    subject: 'Devis rénovation énergétique - Immeuble Lille',
    preview: 'Suite à notre visite du site jeudi dernier, veuillez trouver ci-joint notre devis détaillé pour l\'isolation thermique et la rénovation énergétique de l\'immeuble.',
    time: 'Il y a 2 jours',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'high',
    labels: ['DBCS', 'urgent']
  },
  {
    id: '7',
    sender: 'MAIF Assurances',
    senderAvatar: 'MF',
    subject: 'Fissures pavillon Douai - Acceptation dossier',
    preview: 'Nous accusons réception de votre dossier d\'expertise concernant les fissures du pavillon suite à la sécheresse. L\'indemnisation proposée est conforme à vos conclusions.',
    time: 'Il y a 2 jours',
    unread: false,
    starred: true,
    hasAttachment: false,
    priority: 'low',
    labels: ['JDE']
  },
  {
    id: '8',
    sender: 'Thomas Durand',
    senderAvatar: 'TD',
    subject: 'Plans architecturaux - Validation cliente',
    preview: 'Les clients ont validé les plans d\'architecture pour l\'extension. Nous pouvons passer à la phase suivante : dépôt du permis de construire et consultation des entreprises.',
    time: 'Il y a 3 jours',
    unread: false,
    starred: false,
    hasAttachment: false,
    priority: 'normal',
    labels: ['JDMO']
  },
  {
    id: '9',
    sender: 'Comptabilité DBCS',
    senderAvatar: 'CO',
    subject: 'Factures novembre - Validation requise',
    preview: 'Merci de valider les factures fournisseurs pour le mois de novembre avant vendredi. Le fichier récapitulatif est en pièce jointe avec tous les détails.',
    time: 'Il y a 4 jours',
    unread: false,
    starred: false,
    hasAttachment: true,
    priority: 'normal',
    labels: ['DBCS']
  },
  {
    id: '10',
    sender: 'Groupama Nord-Est',
    senderAvatar: 'GR',
    subject: 'Sinistre dégât des eaux Valenciennes - Clôture',
    preview: 'Nous vous confirmons la clôture du dossier suite à l\'accord trouvé avec l\'assuré. Le règlement de vos honoraires d\'expertise sera effectué sous 8 jours.',
    time: 'Il y a 5 jours',
    unread: false,
    starred: false,
    hasAttachment: false,
    priority: 'low',
    labels: ['JDE']
  }
];

const SIDEBAR_ITEMS = [
  { icon: Inbox, label: 'Inbox', count: 21, color: 'text-primary' },
  { icon: Send, label: 'Sent', count: 0, color: 'text-foreground' },
  { icon: FileText, label: 'Draft', count: 2, color: 'text-foreground' },
  { icon: Star, label: 'Starred', count: 0, color: 'text-foreground' },
  { icon: AlertCircle, label: 'Spam', count: 4, color: 'text-foreground' },
  { icon: Trash2, label: 'Trash', count: 0, color: 'text-foreground' }
];

const LABELS = [
  { name: 'JDE', color: 'bg-emerald-500' },
  { name: 'JDMO', color: 'bg-orange-500' },
  { name: 'DBCS', color: 'bg-red-500' },
  { name: 'urgent', color: 'bg-amber-500' }
];

const Mailbox = () => {
  const navigate = useNavigate();
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [activeFolder, setActiveFolder] = useState('Inbox');

  const toggleSelectEmail = (id: string) => {
    setSelectedEmails(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmails.length === DEMO_EMAILS.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(DEMO_EMAILS.map(e => e.id));
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-card rounded-2xl border shadow-vuexy-md p-4 h-full flex flex-col">
          <Button className="w-full mb-6 bg-gradient-primary hover:opacity-90">
            <Mail className="mr-2 h-4 w-4" />
            Compose
          </Button>

          <ScrollArea className="flex-1">
            <nav className="space-y-1 mb-6">
              {SIDEBAR_ITEMS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setActiveFolder(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeFolder === item.label
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`h-4 w-4 ${activeFolder === item.label ? 'text-primary' : item.color}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {item.count}
                    </Badge>
                  )}
                </button>
              ))}
            </nav>

            <Separator className="my-4" />

            <div className="space-y-1">
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                LABELS
              </p>
              {LABELS.map((label) => (
                <button
                  key={label.name}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-foreground"
                >
                  <div className={`w-2 h-2 rounded-full ${label.color}`} />
                  <span>{label.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="bg-card rounded-2xl border shadow-vuexy-md h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search mail"
                  className="pl-9 bg-muted/50 border-0"
                />
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedEmails.length === DEMO_EMAILS.length}
                  onCheckedChange={toggleSelectAll}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Mail className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Email List */}
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {DEMO_EMAILS.map((email) => (
                <div
                  key={email.id}
                  className={`flex items-start gap-4 p-4 cursor-pointer transition-colors ${
                    email.unread ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  <Checkbox
                    checked={selectedEmails.includes(email.id)}
                    onCheckedChange={() => toggleSelectEmail(email.id)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        email.starred
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>

                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {email.senderAvatar}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm ${email.unread ? 'font-semibold' : 'font-medium'}`}>
                        {email.sender}
                      </p>
                      {email.priority === 'high' && (
                        <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                          Urgent
                        </Badge>
                      )}
                      {email.labels.map(label => (
                        <Badge key={label} variant="secondary" className="text-[10px] h-4 px-1.5">
                          {label}
                        </Badge>
                      ))}
                    </div>
                    <p className={`text-sm mb-1 ${email.unread ? 'font-medium' : ''}`}>
                      {email.subject}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {email.preview}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {email.hasAttachment && (
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">{email.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default Mailbox;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileText, Upload, Download, Trash2, FileIcon, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ADMIN_DOCUMENTS_CONFIG: Record<string, string[]> = {
  locataire: ['CERFA', 'BAIL', 'QUITTANCE_LOYER', 'BANQUE', 'POUVOIR', 'AUTRE'],
  proprietaire: ['CERFA', 'ATTEST_PROPRI', 'BANQUE', 'POUVOIR', 'AUTRE'],
  proprietaire_non_occupant: ['CERFA', 'ATTEST_PROPRI', 'BANQUE', 'POUVOIR', 'AUTRE'],
  professionnel: ['CERFA', 'STATUTS', 'CP_CG', 'KBIS', 'BILANS', 'BANQUE', 'POUVOIR', 'AUTRE'],
};

const DOCUMENT_LABELS: Record<string, string> = {
  CERFA: 'CERFA',
  BAIL: 'Bail',
  QUITTANCE_LOYER: 'Quittance loyer',
  ATTEST_PROPRI: 'Attest. Propri.',
  STATUTS: 'Statuts',
  CP_CG: 'CP/CG',
  KBIS: 'KBIS',
  BILANS: 'Bilans',
  BANQUE: 'Banque',
  POUVOIR: 'Pouvoir',
  AUTRE: 'Autre',
};

interface DocumentsTabProps {
  dossierId: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  document_type: string;
  uploaded_by: string;
  is_generated: boolean;
  created_at: string;
  uploader: {
    display_name: string;
  };
}

const DocumentsTab = ({ dossierId }: DocumentsTabProps) => {
  const { user } = useAuthStore();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [clientType, setClientType] = useState<string | null>(null);
  const [adminDocs, setAdminDocs] = useState<Record<string, { received: boolean; id?: string }>>({});
  const [adminDocsLoading, setAdminDocsLoading] = useState(false);

  useEffect(() => {
    fetchAttachments();
    fetchClientType();
    fetchAdminDocuments();
  }, [dossierId]);

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('dossier_attachments')
        .select(`
          *,
          uploader:profiles!dossier_attachments_uploaded_by_fkey(display_name)
        `)
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientType = async () => {
    try {
      const { data, error } = await supabase
        .from('dossier_client_info')
        .select('client_type')
        .eq('dossier_id', dossierId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setClientType(data?.client_type || null);
    } catch (error) {
      console.error('Error fetching client type:', error);
    }
  };

  const fetchAdminDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('dossier_admin_documents')
        .select('*')
        .eq('dossier_id', dossierId);

      if (error) throw error;

      const docsMap: Record<string, { received: boolean; id: string }> = {};
      data?.forEach(doc => {
        docsMap[doc.document_type] = { received: doc.received, id: doc.id };
      });
      setAdminDocs(docsMap);
    } catch (error) {
      console.error('Error fetching admin documents:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${dossierId}/${Date.now()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('dossier-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create database record
        const { error: dbError } = await supabase.from('dossier_attachments').insert({
          dossier_id: dossierId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: fileName,
          document_type: 'upload',
          uploaded_by: user?.id,
          is_generated: false,
        });

        if (dbError) throw dbError;
      }

      toast.success('Documents téléversés avec succès');
      fetchAttachments();
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error('Erreur lors du téléversement');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('dossier-attachments')
        .download(attachment.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('dossier-attachments')
        .remove([attachment.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('dossier_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      toast.success('Document supprimé');
      fetchAttachments();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleDocument = async (docType: string, checked: boolean) => {
    setAdminDocsLoading(true);
    try {
      const existingDoc = adminDocs[docType];

      if (existingDoc?.id) {
        // Update existing
        const { error } = await supabase
          .from('dossier_admin_documents')
          .update({
            received: checked,
            received_at: checked ? new Date().toISOString() : null,
          })
          .eq('id', existingDoc.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('dossier_admin_documents')
          .insert({
            dossier_id: dossierId,
            document_type: docType,
            received: checked,
            received_at: checked ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (error) throw error;

        setAdminDocs(prev => ({
          ...prev,
          [docType]: { received: checked, id: data.id },
        }));
        return;
      }

      setAdminDocs(prev => ({
        ...prev,
        [docType]: { ...prev[docType], received: checked },
      }));
    } catch (error) {
      console.error('Error toggling document:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setAdminDocsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const groupedAttachments = attachments.reduce((acc, att) => {
    const type = att.document_type || 'Autre';
    if (!acc[type]) acc[type] = [];
    acc[type].push(att);
    return acc;
  }, {} as Record<string, Attachment[]>);

  const documentsForClientType = clientType ? ADMIN_DOCUMENTS_CONFIG[clientType] || [] : [];

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
          <div className="flex items-center justify-between">
            <CardTitle>Documents et pièces jointes</CardTitle>
            <div className="relative">
              <Input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <Button asChild disabled={uploading} className="bg-primary hover:bg-primary/90">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Téléversement...' : 'Ajouter des documents'}
                </label>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="text-center py-12">
              <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun document pour le moment</p>
              <p className="text-sm text-muted-foreground mt-2">
                Cliquez sur "Ajouter des documents" pour téléverser des fichiers
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedAttachments).map(([type, docs]) => (
                <div key={type} className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase">{type}</h4>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.file_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                              <span>•</span>
                              <span>{doc.uploader?.display_name}</span>
                            </div>
                          </div>
                          {doc.is_generated && (
                            <Badge variant="secondary" className="text-xs">
                              Généré
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {doc.uploaded_by === user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Documents Checklist */}
      {clientType && documentsForClientType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Documents administratifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {documentsForClientType.map(docType => (
                <div key={docType} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <Checkbox
                    id={`doc-${docType}`}
                    checked={adminDocs[docType]?.received || false}
                    onCheckedChange={(checked) => handleToggleDocument(docType, checked as boolean)}
                    disabled={adminDocsLoading}
                  />
                  <Label
                    htmlFor={`doc-${docType}`}
                    className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {DOCUMENT_LABELS[docType]}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentsTab;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Camera, Upload, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PhotosTabProps {
  dossierId: string;
}

interface Photo {
  id: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
  taken_at: string | null;
  uploader: {
    display_name: string;
  };
}

const PhotosTab = ({ dossierId }: PhotosTabProps) => {
  const { user } = useAuthStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [dossierId]);

  useEffect(() => {
    if (selectedPhoto) {
      loadPhotoPreview(selectedPhoto);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedPhoto]);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('dossier_photos')
        .select(`
          *,
          uploader:profiles!dossier_photos_uploaded_by_fkey(display_name)
        `)
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Erreur lors du chargement des photos');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoPreview = async (photo: Photo) => {
    try {
      const { data, error } = await supabase.storage
        .from('dossier-attachments')
        .download(photo.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error loading photo preview:', error);
      toast.error('Erreur lors du chargement de l\'aperçu');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Vérifier que c'est bien une image
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} n'est pas une image valide`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${dossierId}/photos/${Date.now()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('dossier-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create database record
        const { error: dbError } = await supabase.from('dossier_photos').insert({
          dossier_id: dossierId,
          file_name: file.name,
          file_size: file.size,
          storage_path: fileName,
          uploaded_by: user?.id,
          taken_at: new Date().toISOString(),
        });

        if (dbError) throw dbError;

        // Add comment
        await supabase.from('dossier_comments').insert({
          dossier_id: dossierId,
          user_id: user?.id,
          comment_type: 'document_added',
          content: `Photo "${file.name}" ajoutée`,
          metadata: { file_name: file.name },
        });
      }

      toast.success('Photos téléversées avec succès');
      fetchPhotos();
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast.error('Erreur lors du téléversement');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('dossier-attachments')
        .remove([photo.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('dossier_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      toast.success('Photo supprimée');
      setSelectedPhoto(null);
      fetchPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getThumbnailUrl = (photo: Photo) => {
    const { data } = supabase.storage
      .from('dossier-attachments')
      .getPublicUrl(photo.storage_path);
    return data.publicUrl;
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Photos du dossier</CardTitle>
            <div className="relative">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="photo-upload"
              />
              <Button asChild disabled={uploading}>
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Téléversement...' : 'Ajouter des photos'}
                </label>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucune photo pour le moment</p>
              <p className="text-sm text-muted-foreground mt-2">
                Cliquez sur "Ajouter des photos" pour téléverser des images
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg border hover:border-primary transition-colors"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={getThumbnailUrl(photo)}
                    alt={photo.caption || photo.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="text-white text-xs space-y-1 w-full">
                      <p className="font-medium truncate">{photo.file_name}</p>
                      <p className="text-white/80">
                        {format(new Date(photo.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Preview Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {selectedPhoto && (
            <div className="relative">
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt={selectedPhoto.caption || selectedPhoto.file_name}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              )}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedPhoto.file_name}</h3>
                  {selectedPhoto.caption && (
                    <p className="text-muted-foreground mt-2">{selectedPhoto.caption}</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <p>Uploadé par {selectedPhoto.uploader?.display_name}</p>
                    <p>
                      {format(new Date(selectedPhoto.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </p>
                    <p>{formatFileSize(selectedPhoto.file_size)}</p>
                  </div>
                  {selectedPhoto.uploaded_by === user?.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(selectedPhoto)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotosTab;

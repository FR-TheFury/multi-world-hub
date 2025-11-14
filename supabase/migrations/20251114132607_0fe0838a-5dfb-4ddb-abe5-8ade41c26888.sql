-- Phase 2.1 : Ajout des nouveaux statuts de dossiers
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'attente_validation_devis';
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'attente_devis';
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'attente_rdv';
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'attente_validation_compagnie';
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'attente_la';
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'attente_documents_admin';
ALTER TYPE dossier_status ADD VALUE IF NOT EXISTS 'procedure_judiciaire';

-- Phase 2.2A : Ajout champs dommages dans dossier_client_info
ALTER TABLE dossier_client_info
  ADD COLUMN IF NOT EXISTS montant_dommage_batiment DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS montant_demolition_deblayage DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS montant_mise_conformite DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS adresse_client TEXT,
  ADD COLUMN IF NOT EXISTS adresse_identique_sinistre BOOLEAN DEFAULT false;

-- Ajouter une colonne calculée pour le montant total (sera utilisée dans le code)
COMMENT ON COLUMN dossier_client_info.montant_dommage_batiment IS 'Montant des dommages au bâtiment';
COMMENT ON COLUMN dossier_client_info.montant_demolition_deblayage IS 'Montant démolition et déblayage';
COMMENT ON COLUMN dossier_client_info.montant_mise_conformite IS 'Montant mise en conformité';

-- Phase 2.2B : Ajout champs CA et importance dans dossiers
ALTER TABLE dossiers
  ADD COLUMN IF NOT EXISTS chiffre_affaires DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_cloture TIMESTAMPTZ;

-- Phase 2.2C : Nouvelle table dossier_photos
CREATE TABLE IF NOT EXISTS dossier_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  caption TEXT,
  taken_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossier_photos_dossier ON dossier_photos(dossier_id);
CREATE INDEX IF NOT EXISTS idx_dossier_photos_order ON dossier_photos(dossier_id, display_order);

ALTER TABLE dossier_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view photos for accessible dossiers"
  ON dossier_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dossiers d
      WHERE d.id = dossier_photos.dossier_id
      AND has_world_access(auth.uid(), d.world_id)
    )
  );

CREATE POLICY "Users can upload photos to accessible dossiers"
  ON dossier_photos FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM dossiers d
      WHERE d.id = dossier_photos.dossier_id
      AND has_world_access(auth.uid(), d.world_id)
    )
  );

CREATE POLICY "Users can delete their own photos"
  ON dossier_photos FOR DELETE
  USING (uploaded_by = auth.uid());

-- Phase 2.2D : Améliorer dossier_attachments pour docs admin
ALTER TABLE dossier_attachments
  ADD COLUMN IF NOT EXISTS is_admin_document BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_doc_status TEXT CHECK (admin_doc_status IN ('recu', 'manquant', 'en_attente')),
  ADD COLUMN IF NOT EXISTS is_visible_to_client BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dossier_attachments_admin ON dossier_attachments(dossier_id, is_admin_document);

-- Phase 2.2E : appointments - Liaison Google Calendar
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_event_id TEXT,
  ADD COLUMN IF NOT EXISTS synced_to_google BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_appointments_google ON appointments(google_event_id) WHERE google_event_id IS NOT NULL;

-- Phase 2.3 : Fonction de validation du montant avant clôture
CREATE OR REPLACE FUNCTION check_montant_before_cloture()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  world_code TEXT;
  total_montant DECIMAL(12,2);
BEGIN
  -- Vérifier si on passe à "cloture" depuis un autre statut
  IF NEW.status = 'cloture' AND (OLD.status IS NULL OR OLD.status != 'cloture') THEN
    -- Récupérer le code du monde
    SELECT w.code INTO world_code
    FROM worlds w
    WHERE w.id = NEW.world_id;
    
    -- Si c'est JDE, vérifier le montant total
    IF world_code = 'JDE' THEN
      -- Calculer le montant total
      SELECT 
        COALESCE(montant_dommage_batiment, 0) + 
        COALESCE(montant_demolition_deblayage, 0) + 
        COALESCE(montant_mise_conformite, 0)
      INTO total_montant
      FROM dossier_client_info
      WHERE dossier_id = NEW.id;
      
      -- Si le montant total est 0 ou NULL, empêcher la clôture
      IF total_montant IS NULL OR total_montant <= 0 THEN
        RAISE EXCEPTION 'Impossible de clôturer ce dossier JDE : le montant total du dommage doit être renseigné (minimum > 0€)';
      END IF;
    END IF;
    
    -- Mettre à jour la date de clôture
    NEW.date_cloture := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS check_cloture_montant ON dossiers;

-- Créer le nouveau trigger
CREATE TRIGGER check_cloture_montant
  BEFORE UPDATE ON dossiers
  FOR EACH ROW
  EXECUTE FUNCTION check_montant_before_cloture();
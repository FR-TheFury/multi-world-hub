-- ============================================
-- DBCS WORKFLOW - Base de Connaissance et Statistiques
-- ============================================
-- Workflow simple d'archivage en 4 étapes
-- DBCS reçoit les dossiers clôturés depuis JDE et JDMO

DO $$
DECLARE
  v_workflow_id UUID;
  v_world_id UUID;
  
  -- Step IDs
  v_step1_id UUID;
  v_step2_id UUID;
  v_step3_id UUID;
  v_step4_id UUID;
BEGIN
  -- Get DBCS world ID
  SELECT id INTO v_world_id FROM public.worlds WHERE code = 'DBCS';
  
  IF v_world_id IS NULL THEN
    RAISE EXCEPTION 'DBCS world not found';
  END IF;

  -- Delete existing DBCS workflows
  DELETE FROM public.workflow_steps 
  WHERE workflow_template_id IN (
    SELECT id FROM public.workflow_templates WHERE world_id = v_world_id
  );
  
  DELETE FROM public.workflow_templates WHERE world_id = v_world_id;

  -- Create new workflow template
  INSERT INTO public.workflow_templates (world_id, name, description, version, is_active)
  VALUES (
    v_world_id,
    'Workflow DBCS - Archivage',
    'Workflow simplifié pour l''archivage et l''indexation des dossiers clôturés',
    1,
    true
  )
  RETURNING id INTO v_workflow_id;

  -- ============================================
  -- ÉTAPE 1: Réception du dossier
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 1,
    'Réception du dossier',
    'Vérification de la complétude du dossier transféré',
    'action',
    '[
      {"name": "origine", "type": "select", "label": "Origine du dossier", "options": ["JDE", "JDMO", "Autre"], "required": true},
      {"name": "reference_origine", "type": "text", "label": "Référence d''origine", "required": true},
      {"name": "documents_complets", "type": "select", "label": "Documents complets ?", "options": ["Oui", "Non - documents manquants"], "required": true},
      {"name": "observations", "type": "textarea", "label": "Observations"}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step1_id;

  -- ============================================
  -- ÉTAPE 2: Classement et catégorisation
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 2,
    'Classement et catégorisation',
    'Attribution des catégories et mots-clés pour la recherche',
    'action',
    '[
      {"name": "categorie_principale", "type": "select", "label": "Catégorie principale", "options": ["Expertise juridique", "Maîtrise d''œuvre", "Sinistre", "Contentieux", "Autre"], "required": true},
      {"name": "sous_categorie", "type": "text", "label": "Sous-catégorie"},
      {"name": "mots_cles", "type": "textarea", "label": "Mots-clés (séparés par des virgules)", "required": true},
      {"name": "niveau_complexite", "type": "select", "label": "Niveau de complexité", "options": ["Simple", "Moyen", "Complexe"], "required": true},
      {"name": "valeur_pedagogique", "type": "select", "label": "Valeur pédagogique", "options": ["Faible", "Moyenne", "Élevée"], "required": true}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step2_id;

  -- ============================================
  -- ÉTAPE 3: Indexation et analyse
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, is_required
  ) VALUES (
    v_workflow_id, 3,
    'Indexation et analyse',
    'Analyse détaillée et extraction des données statistiques',
    'action',
    '[
      {"name": "resume_executif", "type": "textarea", "label": "Résumé exécutif", "required": true},
      {"name": "lecons_apprises", "type": "textarea", "label": "Leçons apprises", "required": true},
      {"name": "duree_traitement_jours", "type": "number", "label": "Durée de traitement (jours)"},
      {"name": "montant_dossier", "type": "number", "label": "Montant du dossier (€)"},
      {"name": "points_attention", "type": "textarea", "label": "Points d''attention pour dossiers similaires"},
      {"name": "documents_cles", "type": "textarea", "label": "Liste des documents clés"}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step3_id;

  -- ============================================
  -- ÉTAPE 4: Archivage final
  -- ============================================
  INSERT INTO public.workflow_steps (
    workflow_template_id, step_number, name, description, step_type,
    form_fields, auto_actions, is_required
  ) VALUES (
    v_workflow_id, 4,
    'Archivage final',
    'Validation et archivage définitif dans la base de connaissance',
    'action',
    '[
      {"name": "validation_archivage", "type": "select", "label": "Validation de l''archivage", "options": ["Validé", "À revoir"], "required": true},
      {"name": "accessible_publiquement", "type": "select", "label": "Accessible publiquement", "options": ["Oui", "Non - confidentiel"], "required": true},
      {"name": "date_archivage", "type": "date", "label": "Date d''archivage", "required": true},
      {"name": "commentaires_finaux", "type": "textarea", "label": "Commentaires finaux"}
    ]'::jsonb,
    '[
      {"type": "create_notification", "message": "Dossier archivé avec succès dans DBCS"}
    ]'::jsonb,
    true
  ) RETURNING id INTO v_step4_id;

  -- ============================================
  -- LINKING DES ÉTAPES
  -- ============================================
  
  -- Séquence linéaire: 1 -> 2 -> 3 -> 4
  UPDATE public.workflow_steps SET next_step_id = v_step2_id WHERE id = v_step1_id;
  UPDATE public.workflow_steps SET next_step_id = v_step3_id WHERE id = v_step2_id;
  UPDATE public.workflow_steps SET next_step_id = v_step4_id WHERE id = v_step3_id;
  -- v_step4_id -> NULL (fin du workflow)

  RAISE NOTICE 'Workflow DBCS créé avec succès!';
  RAISE NOTICE 'Template ID: %', v_workflow_id;
  RAISE NOTICE 'Total étapes: 4 (processus linéaire d''archivage)';
  RAISE NOTICE '- Étape 1: Réception';
  RAISE NOTICE '- Étape 2: Classement';
  RAISE NOTICE '- Étape 3: Indexation';
  RAISE NOTICE '- Étape 4: Archivage final';
END $$;
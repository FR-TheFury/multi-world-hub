-- Insert DBCS Workflow Template (Simplified Archive Workflow)
-- This workflow is designed for archiving completed dossiers from JDMO

DO $$
DECLARE
  v_world_id UUID;
  v_workflow_id UUID;
  v_step_reception_id UUID;
  v_step_verification_id UUID;
  v_step_archive_id UUID;
  v_step_cloture_id UUID;
BEGIN
  -- Get DBCS world ID
  SELECT id INTO v_world_id FROM worlds WHERE code = 'DBCS';
  
  IF v_world_id IS NULL THEN
    RAISE EXCEPTION 'DBCS world not found';
  END IF;

  -- Create workflow template
  INSERT INTO workflow_templates (name, description, world_id, version, is_active)
  VALUES (
    'Workflow d''Archivage DBCS',
    'Workflow simplifié pour l''archivage des dossiers clôturés depuis JDMO',
    v_world_id,
    1,
    true
  )
  RETURNING id INTO v_workflow_id;

  -- Step 1: Réception automatique du dossier
  INSERT INTO workflow_steps (
    workflow_template_id,
    step_number,
    name,
    description,
    step_type,
    requires_decision,
    is_required,
    is_optional,
    assigned_role,
    estimated_duration,
    metadata
  )
  VALUES (
    v_workflow_id,
    1,
    'Réception du dossier',
    'Réception automatique du dossier transféré depuis JDMO',
    'task',
    false,
    true,
    false,
    'archiviste',
    INTERVAL '1 hour',
    '{"auto_complete": true, "description": "Cette étape est automatiquement complétée lors du transfert"}'
  )
  RETURNING id INTO v_step_reception_id;

  -- Step 2: Vérification des documents
  INSERT INTO workflow_steps (
    workflow_template_id,
    step_number,
    name,
    description,
    step_type,
    requires_decision,
    is_required,
    is_optional,
    assigned_role,
    estimated_duration,
    form_fields,
    metadata
  )
  VALUES (
    v_workflow_id,
    2,
    'Vérification des documents',
    'Vérifier que tous les documents sont présents et conformes',
    'review',
    false,
    true,
    false,
    'archiviste',
    INTERVAL '2 hours',
    '[
      {
        "name": "documents_complets",
        "label": "Documents complets",
        "type": "checkbox",
        "required": true
      },
      {
        "name": "documents_conformes",
        "label": "Documents conformes",
        "type": "checkbox",
        "required": true
      },
      {
        "name": "notes_verification",
        "label": "Notes de vérification",
        "type": "textarea",
        "required": false
      }
    ]'::jsonb,
    '{"description": "Vérifier l''intégrité et la conformité des documents archivés"}'
  )
  RETURNING id INTO v_step_verification_id;

  -- Step 3: Archivage
  INSERT INTO workflow_steps (
    workflow_template_id,
    step_number,
    name,
    description,
    step_type,
    requires_decision,
    is_required,
    is_optional,
    assigned_role,
    estimated_duration,
    form_fields,
    auto_actions,
    metadata
  )
  VALUES (
    v_workflow_id,
    3,
    'Archivage',
    'Classer et indexer le dossier dans la base d''archivage',
    'task',
    false,
    true,
    false,
    'archiviste',
    INTERVAL '1 hour',
    '[
      {
        "name": "reference_archive",
        "label": "Référence d''archivage",
        "type": "text",
        "required": true
      },
      {
        "name": "mots_cles",
        "label": "Mots-clés",
        "type": "text",
        "required": false
      },
      {
        "name": "notes_archivage",
        "label": "Notes d''archivage",
        "type": "textarea",
        "required": false
      }
    ]'::jsonb,
    '[
      {
        "type": "update_status",
        "params": {"status": "archive"}
      }
    ]'::jsonb,
    '{"description": "Indexer et classer le dossier pour archivage long terme"}'
  )
  RETURNING id INTO v_step_archive_id;

  -- Step 4: Clôture
  INSERT INTO workflow_steps (
    workflow_template_id,
    step_number,
    name,
    description,
    step_type,
    requires_decision,
    is_required,
    is_optional,
    assigned_role,
    estimated_duration,
    auto_actions,
    metadata
  )
  VALUES (
    v_workflow_id,
    4,
    'Clôture',
    'Clôturer définitivement le dossier archivé',
    'task',
    false,
    true,
    false,
    'archiviste',
    INTERVAL '30 minutes',
    '[
      {
        "type": "update_status",
        "params": {"status": "cloture"}
      },
      {
        "type": "create_notification",
        "params": {
          "title": "Dossier archivé et clôturé",
          "message": "Le dossier a été archivé avec succès dans DBCS"
        }
      }
    ]'::jsonb,
    '{"description": "Finaliser l''archivage et clôturer le dossier", "is_final_step": true}'
  )
  RETURNING id INTO v_step_cloture_id;

  -- Link workflow steps
  UPDATE workflow_steps SET next_step_id = v_step_verification_id WHERE id = v_step_reception_id;
  UPDATE workflow_steps SET next_step_id = v_step_archive_id WHERE id = v_step_verification_id;
  UPDATE workflow_steps SET next_step_id = v_step_cloture_id WHERE id = v_step_archive_id;

  RAISE NOTICE 'DBCS workflow created successfully with ID: %', v_workflow_id;
END $$;

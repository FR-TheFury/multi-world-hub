import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DecisionStepFormProps {
  stepName: string;
  stepDescription: string;
  onSubmit: (decision: boolean, notes: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const DecisionStepForm = ({
  stepName,
  stepDescription,
  onSubmit,
  onCancel,
  isSubmitting = false
}: DecisionStepFormProps) => {
  const [decision, setDecision] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (decision === null) return;
    await onSubmit(decision, notes);
  };

  return (
    <Card className="border-2 border-accent">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-accent" />
          <CardTitle>{stepName}</CardTitle>
        </div>
        <CardDescription>{stepDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Prendre une décision</Label>
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              size="lg"
              variant={decision === true ? "default" : "outline"}
              onClick={() => setDecision(true)}
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <CheckCircle className="w-6 h-6" />
              <span className="font-semibold">OUI</span>
            </Button>
            <Button
              type="button"
              size="lg"
              variant={decision === false ? "destructive" : "outline"}
              onClick={() => setDecision(false)}
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <XCircle className="w-6 h-6" />
              <span className="font-semibold">NON</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">
            Notes et justification {decision !== null ? '(requis)' : '(optionnel)'}
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Expliquez la raison de votre décision..."
            rows={4}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={decision === null || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider la décision'}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
          )}
        </div>

        {decision !== null && (
          <div className={`p-4 rounded-lg border-2 ${
            decision 
              ? 'bg-primary/10 border-primary text-primary' 
              : 'bg-destructive/10 border-destructive text-destructive'
          }`}>
            <p className="text-sm font-medium">
              {decision 
                ? '✓ Vous avez sélectionné OUI - Le workflow continuera selon la branche positive'
                : '✗ Vous avez sélectionné NON - Le workflow suivra la branche alternative'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'boolean' | 'email';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface WorkflowStepFormProps {
  formFields: FormFieldConfig[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

const WorkflowStepForm = ({
  formFields,
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel = 'Soumettre',
  isLoading = false,
}: WorkflowStepFormProps) => {
  // Dynamically build zod schema based on formFields
  const buildSchema = () => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    formFields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email({ message: 'Email invalide' });
          break;
        case 'number':
          fieldSchema = z.coerce.number();
          if (field.validation?.min !== undefined) {
            fieldSchema = (fieldSchema as z.ZodNumber).min(field.validation.min, {
              message: `Minimum ${field.validation.min}`,
            });
          }
          if (field.validation?.max !== undefined) {
            fieldSchema = (fieldSchema as z.ZodNumber).max(field.validation.max, {
              message: `Maximum ${field.validation.max}`,
            });
          }
          break;
        case 'date':
          fieldSchema = z.date({ required_error: 'Date requise' });
          break;
        case 'boolean':
          fieldSchema = z.boolean().default(false);
          break;
        case 'text':
        case 'textarea':
        case 'select':
          fieldSchema = z.string();
          if (field.validation?.min) {
            fieldSchema = (fieldSchema as z.ZodString).min(field.validation.min, {
              message: `Minimum ${field.validation.min} caractères`,
            });
          }
          if (field.validation?.max) {
            fieldSchema = (fieldSchema as z.ZodString).max(field.validation.max, {
              message: `Maximum ${field.validation.max} caractères`,
            });
          }
          if (field.validation?.pattern) {
            fieldSchema = (fieldSchema as z.ZodString).regex(
              new RegExp(field.validation.pattern),
              { message: 'Format invalide' }
            );
          }
          break;
        default:
          fieldSchema = z.string();
      }

      if (!field.required) {
        fieldSchema = fieldSchema.optional();
      }

      schemaFields[field.name] = fieldSchema;
    });

    return z.object(schemaFields);
  };

  const formSchema = buildSchema();
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values);
    form.reset(values);
  };

  const renderField = (field: FormFieldConfig) => {
    switch (field.type) {
      case 'date':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !formField.value && 'text-muted-foreground'
                        )}
                      >
                        {formField.value ? (
                          format(formField.value as Date, 'PPP')
                        ) : (
                          <span>{field.placeholder || 'Sélectionner une date'}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formField.value as Date}
                      onSelect={formField.onChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'select':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  defaultValue={formField.value as string}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || 'Sélectionner'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'textarea':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={field.placeholder}
                    className="min-h-[100px]"
                    {...formField}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'boolean':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                  {field.description && (
                    <FormDescription>{field.description}</FormDescription>
                  )}
                </div>
                <FormControl>
                  <Switch
                    checked={formField.value as boolean}
                    onCheckedChange={formField.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );

      case 'number':
      case 'email':
      case 'text':
      default:
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    {...formField}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {formFields.map((field) => renderField(field))}
        
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'En cours...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkflowStepForm;

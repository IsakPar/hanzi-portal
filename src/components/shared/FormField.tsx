import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  helpText?: string;
  className?: string;
  type?: string;
  rows?: number;
}

export function FormField({
  label,
  value,
  onChange,
  placeholder,
  required,
  multiline,
  helpText,
  className,
  type = "text",
  rows = 4
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5 w-full min-w-0", className)}>
      <Label className="text-sm font-medium text-foreground/90">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="resize-y w-full min-w-0 text-sm"
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-w-0 text-sm"
        />
      )}
      {helpText && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {helpText}
        </p>
      )}
    </div>
  );
}


import { Input, Label } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type ConfirmDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  entityName: string;
  buttonLabel: string;
  description: string;
};

export function ConfirmDeleteForm({
  action,
  entityName,
  buttonLabel,
  description,
}: ConfirmDeleteFormProps) {
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="space-y-2">
        <Label htmlFor="confirm">
          Type <span className="font-semibold text-foreground">{entityName}</span> to confirm
        </Label>
        <Input
          id="confirm"
          name="confirm"
          placeholder={entityName}
          autoComplete="off"
          required
        />
      </div>
      <SubmitButton variant="destructive" pendingLabel="Deleting…">
        {buttonLabel}
      </SubmitButton>
    </form>
  );
}

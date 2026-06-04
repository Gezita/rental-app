import { Button, Input, Label } from "@/components/ui";

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
      <p className="text-sm text-slate-600">{description}</p>
      <div className="space-y-2">
        <Label htmlFor="confirm">
          Type <span className="font-semibold text-slate-900">{entityName}</span> to confirm
        </Label>
        <Input
          id="confirm"
          name="confirm"
          placeholder={entityName}
          autoComplete="off"
          required
        />
      </div>
      <Button type="submit" variant="destructive">
        {buttonLabel}
      </Button>
    </form>
  );
}

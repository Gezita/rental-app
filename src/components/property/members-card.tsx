import { Users } from "lucide-react";
import type { PropertyRole } from "@prisma/client";
import {
  changeMemberRoleAction,
  inviteMemberAction,
  leavePropertyAction,
  removeMemberAction,
  resendInviteAction,
  revokeInviteAction,
} from "@/app/actions/members";
import { PROPERTY_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/property-members";
import { SubmitButton } from "@/components/submit-button";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";

type MemberRow = {
  id: string;
  userId: string;
  role: PropertyRole;
  user: { name: string | null; email: string };
};

type InviteRow = {
  id: string;
  email: string;
  role: PropertyRole;
  createdAt: Date;
  token: string;
};

export function PropertyMembersCard({
  propertyId,
  currentUserId,
  currentRole,
  members,
  invites,
  inviteBaseUrl,
}: {
  propertyId: string;
  currentUserId: string;
  currentRole: PropertyRole;
  members: MemberRow[];
  invites: InviteRow[];
  inviteBaseUrl: string;
}) {
  const isOwner = currentRole === "OWNER";
  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>People with access</CardTitle>
        </div>
        <CardDescription>
          {isOwner
            ? "Invite a co-owner or property manager to share access to this property. They manage it from their own account and aren't billed for it."
            : "These people can access this property. Statements you send use your own profile and payment details."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Member roster */}
        <ul className="divide-y divide-border-subtle">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isLastOwner = member.role === "OWNER" && ownerCount <= 1;
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.user.name || member.user.email}
                    {isSelf && <span className="ml-1 text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && !isLastOwner ? (
                    <>
                      <form action={changeMemberRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="propertyId" value={propertyId} />
                        <input type="hidden" name="memberId" value={member.id} />
                        <Select name="role" defaultValue={member.role} className="h-9 w-32">
                          {PROPERTY_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </Select>
                        <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">
                          Update
                        </SubmitButton>
                      </form>
                      <form action={removeMemberAction}>
                        <input type="hidden" name="propertyId" value={propertyId} />
                        <input type="hidden" name="memberId" value={member.id} />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="Removing…">
                          Remove
                        </SubmitButton>
                      </form>
                    </>
                  ) : (
                    <Badge variant={member.role === "OWNER" ? "secondary" : "secondary"}>
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Pending invites
            </p>
            <ul className="divide-y divide-border-subtle">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted">
                      {ROLE_LABELS[invite.role]} · invited{" "}
                      {invite.createdAt.toLocaleDateString("en-CA")}
                    </p>
                    {isOwner && (
                      <p className="mt-1 break-all text-xs text-muted">
                        Invite link:{" "}
                        <a
                          href={`${inviteBaseUrl}/invite/${invite.token}`}
                          className="text-primary hover:underline"
                        >
                          {inviteBaseUrl}/invite/{invite.token}
                        </a>
                      </p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      <form action={resendInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <SubmitButton variant="outline" size="sm" pendingLabel="Sending…">
                          Resend
                        </SubmitButton>
                      </form>
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="inviteId" value={invite.id} />
                        <SubmitButton variant="ghost" size="sm" pendingLabel="Revoking…">
                          Revoke
                        </SubmitButton>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Invite form (owners only) */}
        {isOwner && (
          <form
            action={inviteMemberAction}
            className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-4"
          >
            <input type="hidden" name="propertyId" value={propertyId} />
            <p className="text-sm font-semibold text-foreground">Invite someone</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="person@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select id="invite-role" name="role" defaultValue="MANAGER" className="w-36">
                  {PROPERTY_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              </div>
              <SubmitButton pendingLabel="Sending…">Send invite</SubmitButton>
            </div>
            <ul className="space-y-0.5 text-xs text-muted">
              {PROPERTY_ROLES.map((role) => (
                <li key={role}>
                  <span className="font-medium text-foreground">{ROLE_LABELS[role]}</span> —{" "}
                  {ROLE_DESCRIPTIONS[role]}
                </li>
              ))}
            </ul>
          </form>
        )}

        {/* Leave property (non-owners, or owners who aren't the last one) */}
        {(!isOwner || ownerCount > 1) && (
          <form action={leavePropertyAction} className="border-t border-border-subtle pt-4">
            <input type="hidden" name="propertyId" value={propertyId} />
            <SubmitButton variant="ghost" size="sm" pendingLabel="Leaving…">
              Leave this property
            </SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

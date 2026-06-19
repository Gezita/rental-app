import type { PropertyRole } from "@prisma/client";
import {
  renderEmailLayout,
  emailParagraph,
  emailButton,
  emailCallout,
  emailInfoRow,
  emailInfoTable,
} from "@/lib/email-templates";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/property-members";

export type PropertyInviteEmailParams = {
  inviterName: string;
  propertyName: string;
  role: PropertyRole;
  acceptUrl: string;
};

/**
 * Branded "you've been invited to a property" email. Landlord-to-landlord, so the
 * footer signs off as the inviter rather than a tenant-facing landlord.
 */
export function buildPropertyInviteEmail(params: PropertyInviteEmailParams) {
  const { inviterName, propertyName, role, acceptUrl } = params;
  const roleLabel = ROLE_LABELS[role];

  const bodyHtml = [
    emailParagraph(
      `<strong>${inviterName}</strong> has invited you to help manage <strong>${propertyName}</strong> on Lessora.`
    ),
    emailInfoTable(
      [
        emailInfoRow("Property", propertyName),
        emailInfoRow("Your role", roleLabel),
        emailInfoRow("Invited by", inviterName),
      ].join("")
    ),
    emailParagraph(`As a ${roleLabel}: ${ROLE_DESCRIPTIONS[role]}`),
    emailButton("Accept invitation", acceptUrl),
    emailParagraph(
      `If the button doesn't work, copy and paste this link into your browser:<br /><a href="${acceptUrl}" style="color:#c46b41;word-break:break-all;">${acceptUrl}</a>`
    ),
    emailCallout(
      "You won't be charged for properties you're invited to — billing stays with the property owner.",
      "info"
    ),
    emailParagraph(
      `This invitation expires in 14 days. If you weren't expecting it, you can safely ignore this email.`
    ),
  ].join("\n");

  return {
    subject: `${inviterName} invited you to manage ${propertyName} on Lessora`,
    html: renderEmailLayout({
      title: "You've been invited to a property",
      preheader: `${inviterName} invited you to manage ${propertyName} as a ${roleLabel}.`,
      landlordName: inviterName,
      bodyHtml,
    }),
    text:
      `${inviterName} invited you to help manage ${propertyName} on Lessora as a ${roleLabel}.\n\n` +
      `Accept your invitation: ${acceptUrl}\n\n` +
      `You won't be charged for properties you're invited to. This invitation expires in 14 days.`,
  };
}

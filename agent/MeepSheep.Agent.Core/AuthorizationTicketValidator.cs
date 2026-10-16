using System.Security.Cryptography;
using System.Text;

namespace MeepSheep.Agent.Core;

/// <summary>
/// Checks that an authorization ticket is structurally valid and bound to the
/// exact envelope. This does not authenticate the ticket issuer or prove that
/// the ticket is signed; callers must verify issuer authentication separately.
/// </summary>
public static class AuthorizationTicketValidator
{
    public static EnvelopeValidationResult Validate(
        AuthorizationTicket ticket,
        TaskAuthorizationEnvelope envelope,
        DateTimeOffset now,
        TimeSpan maximumLifetime,
        bool approvalRequired)
    {
        ArgumentNullException.ThrowIfNull(ticket);
        ArgumentNullException.ThrowIfNull(envelope);

        if (maximumLifetime <= TimeSpan.Zero)
        {
            return EnvelopeValidationResult.Reject(
                "invalid_ticket_validator_configuration",
                "Maximum ticket lifetime must be positive.");
        }

        if (ticket.TicketId == Guid.Empty ||
            ticket.RequestId == Guid.Empty ||
            string.IsNullOrWhiteSpace(ticket.DeviceId) ||
            string.IsNullOrWhiteSpace(ticket.TargetDigest))
        {
            return EnvelopeValidationResult.Reject(
                "ticket_missing_required_field",
                "Ticket identifiers, device ID, and target digest are required.");
        }

        if (ticket.DeviceId.Length > 128 || ticket.TargetDigest.Length != 64 ||
            (ticket.ApprovalId is not null &&
             (string.IsNullOrWhiteSpace(ticket.ApprovalId) || ticket.ApprovalId.Length > 128)))
        {
            return EnvelopeValidationResult.Reject(
                "ticket_field_invalid",
                "One or more ticket fields are malformed.");
        }

        if (!Enum.IsDefined(ticket.Capability))
        {
            return EnvelopeValidationResult.Reject(
                "ticket_unknown_capability",
                "The ticket contains an unknown capability.");
        }

        if (ticket.ExpiresAtUtc <= ticket.IssuedAtUtc ||
            ticket.ExpiresAtUtc - ticket.IssuedAtUtc > maximumLifetime)
        {
            return EnvelopeValidationResult.Reject(
                "ticket_invalid_lifetime",
                "The ticket lifetime is invalid or exceeds the configured maximum.");
        }

        if (ticket.IssuedAtUtc > now || ticket.ExpiresAtUtc <= now)
        {
            return EnvelopeValidationResult.Reject(
                "ticket_not_current",
                "The ticket is not currently valid.");
        }

        if (ticket.RequestId != envelope.RequestId ||
            !string.Equals(ticket.DeviceId, envelope.DeviceId, StringComparison.Ordinal) ||
            ticket.Capability != envelope.Capability)
        {
            return EnvelopeValidationResult.Reject(
                "ticket_binding_mismatch",
                "The ticket does not match the request ID, device, and capability.");
        }

        // Reject malformed targets as data instead of allowing digest computation to throw.
        if (string.IsNullOrWhiteSpace(envelope.OperationTarget) ||
            envelope.OperationTarget.Length > 1024)
        {
            return EnvelopeValidationResult.Reject(
                "ticket_envelope_target_invalid",
                "The envelope operation target is missing or exceeds the allowed size.");
        }

        var expectedDigest = ComputeTargetDigest(envelope.OperationTarget);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(ticket.TargetDigest.ToLowerInvariant()),
                Encoding.ASCII.GetBytes(expectedDigest.ToLowerInvariant())))
        {
            return EnvelopeValidationResult.Reject(
                "ticket_target_mismatch",
                "The ticket is not bound to the exact operation target.");
        }

        if (approvalRequired && string.IsNullOrWhiteSpace(ticket.ApprovalId))
        {
            return EnvelopeValidationResult.Reject(
                "ticket_approval_reference_missing",
                "An approval reference is required for this capability.");
        }

        return EnvelopeValidationResult.Accept();
    }

    public static string ComputeTargetDigest(string operationTarget)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(operationTarget);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(operationTarget)));
    }
}

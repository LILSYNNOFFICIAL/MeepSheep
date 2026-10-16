namespace MeepSheep.Agent.Core;

public static class TaskEnvelopeValidator
{
    public static EnvelopeValidationResult Validate(
        TaskAuthorizationEnvelope envelope,
        DateTimeOffset now,
        TimeSpan maximumLifetime,
        TimeSpan allowedClockSkew)
    {
        ArgumentNullException.ThrowIfNull(envelope);

        if (maximumLifetime <= TimeSpan.Zero || allowedClockSkew < TimeSpan.Zero)
        {
            return EnvelopeValidationResult.Reject(
                "invalid_validator_configuration",
                "Lifetime must be positive and clock skew cannot be negative.");
        }

        if (envelope.RequestId == Guid.Empty)
        {
            return EnvelopeValidationResult.Reject("missing_request_id", "A non-empty request ID is required.");
        }

        if (!Enum.IsDefined(envelope.Capability))
        {
            return EnvelopeValidationResult.Reject(
                "unknown_capability",
                "The requested capability is not recognized.");
        }

        if (string.IsNullOrWhiteSpace(envelope.DeviceId) ||
            string.IsNullOrWhiteSpace(envelope.Nonce) ||
            string.IsNullOrWhiteSpace(envelope.OperationTarget))
        {
            return EnvelopeValidationResult.Reject(
                "missing_required_field",
                "Device ID, nonce, and operation target are required.");
        }

        if (envelope.DeviceId.Length > 128 ||
            envelope.Nonce.Length > 256 ||
            envelope.OperationTarget.Length > 1024)
        {
            return EnvelopeValidationResult.Reject(
                "field_too_long",
                "One or more envelope fields exceed the configured size limits.");
        }

        if (envelope.ExpiresAt <= envelope.IssuedAt)
        {
            return EnvelopeValidationResult.Reject(
                "invalid_time_window",
                "Expiry must be later than issue time.");
        }

        if (envelope.ExpiresAt - envelope.IssuedAt > maximumLifetime)
        {
            return EnvelopeValidationResult.Reject(
                "lifetime_too_long",
                "The requested authorization lifetime exceeds the allowed maximum.");
        }

        if (envelope.IssuedAt > now + allowedClockSkew)
        {
            return EnvelopeValidationResult.Reject(
                "issued_in_future",
                "The envelope issue time is too far in the future.");
        }

        if (envelope.ExpiresAt <= now)
        {
            return EnvelopeValidationResult.Reject(
                "authorization_expired",
                "The authorization envelope has expired.");
        }

        return EnvelopeValidationResult.Accept();
    }
}

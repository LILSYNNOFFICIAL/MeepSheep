namespace MeepSheep.Agent.Core;

/// <summary>
/// Describes a proposed task. This DTO is not authenticated and must never be
/// treated as proof of authorization by itself.
/// </summary>
public sealed record TaskAuthorizationEnvelope(
    Guid RequestId,
    string DeviceId,
    AgentCapability Capability,
    DateTimeOffset IssuedAt,
    DateTimeOffset ExpiresAt,
    string Nonce,
    string OperationTarget);

public sealed record EnvelopeValidationResult(bool IsValid, string Code, string Message)
{
    public static EnvelopeValidationResult Reject(string code, string message) =>
        new(false, code, message);

    public static EnvelopeValidationResult Accept() =>
        new(true, "valid_shape_and_time", "Envelope shape and time bounds are valid; authentication and authorization remain separate checks.");
}

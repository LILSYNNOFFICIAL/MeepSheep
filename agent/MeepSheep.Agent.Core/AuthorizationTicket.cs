namespace MeepSheep.Agent.Core;

/// <summary>
/// Internal authorization data that must come from an authenticated issuer.
/// Do not populate this record directly from an untrusted network payload.
/// </summary>
public sealed record AuthorizationTicket(
    Guid TicketId,
    string DeviceId,
    Guid RequestId,
    AgentCapability Capability,
    string TargetDigest,
    DateTimeOffset IssuedAtUtc,
    DateTimeOffset ExpiresAtUtc,
    string? ApprovalId = null);

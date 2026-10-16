namespace MeepSheep.Agent.Core;

/// <summary>
/// Inputs for a local policy decision. This request intentionally contains no
/// approval flag: approval must be established by a trusted local mechanism,
/// not asserted by the caller or copied from a client/network payload.
/// </summary>
public sealed record PolicyRequest(
    AgentCapability Capability,
    bool RequiresAdminPrivileges = false);

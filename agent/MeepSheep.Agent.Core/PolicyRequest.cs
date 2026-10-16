namespace MeepSheep.Agent.Core;

/// <summary>
/// Inputs for a local policy decision. ApprovalGranted must be derived from
/// trusted local approval state, never copied directly from an untrusted
/// client request or network payload. This record does not prove approval.
/// </summary>
public sealed record PolicyRequest(
    AgentCapability Capability,
    bool ApprovalGranted = false,
    bool RequiresAdminPrivileges = false);

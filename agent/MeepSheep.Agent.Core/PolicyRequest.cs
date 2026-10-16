namespace MeepSheep.Agent.Core;

public sealed record PolicyRequest(
    AgentCapability Capability,
    bool ApprovalGranted = false,
    bool RequestsElevation = false);

namespace MeepSheep.Agent.Core;

/// <summary>
/// Inputs for a local policy decision. Privilege requirements and approval
/// status are not caller-supplied flags; operation handlers must derive them
/// from trusted capability metadata and verified operation details.
/// </summary>
public sealed record PolicyRequest(AgentCapability Capability);

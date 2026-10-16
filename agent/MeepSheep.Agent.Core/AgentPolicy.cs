namespace MeepSheep.Agent.Core;

public sealed record AgentPolicy(
    IReadOnlySet<AgentCapability> AllowedCapabilities,
    IReadOnlySet<AgentCapability> ApprovalRequiredCapabilities)
{
    public static AgentPolicy DenyAll { get; } = new(
        new HashSet<AgentCapability>(),
        new HashSet<AgentCapability>());
}

using System.Collections.Frozen;

namespace MeepSheep.Agent.Core;

public sealed class AgentPolicy
{
    public IReadOnlySet<AgentCapability> AllowedCapabilities { get; }
    public IReadOnlySet<AgentCapability> ApprovalRequiredCapabilities { get; }

    public AgentPolicy(
        IEnumerable<AgentCapability> allowedCapabilities,
        IEnumerable<AgentCapability> approvalRequiredCapabilities)
    {
        ArgumentNullException.ThrowIfNull(allowedCapabilities);
        ArgumentNullException.ThrowIfNull(approvalRequiredCapabilities);

        AllowedCapabilities = allowedCapabilities.ToFrozenSet();
        ApprovalRequiredCapabilities = approvalRequiredCapabilities.ToFrozenSet();
    }

    public static AgentPolicy DenyAll { get; } = new(
        Array.Empty<AgentCapability>(),
        Array.Empty<AgentCapability>());
}

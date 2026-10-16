namespace MeepSheep.Agent.Core;

/// <summary>
/// Evaluates local policy only. This is a defense-in-depth gate, not proof of
/// authentication, approval, target safety, or permission to execute an OS operation.
/// </summary>
public static class PolicyEvaluator
{
    // Until an operation-specific approval verifier exists, these capabilities
    // must never be made executable by configuration alone.
    private static readonly HashSet<AgentCapability> ApprovalRequiredByDefault =
    [
        AgentCapability.CaptureScreen,
        AgentCapability.ControlMouse,
        AgentCapability.ControlKeyboard,
        AgentCapability.ReadClipboard,
        AgentCapability.ReadFiles,
        AgentCapability.WriteFiles,
        AgentCapability.DeleteFiles,
        AgentCapability.RunCommand,
        AgentCapability.InstallSoftware,
        AgentCapability.ChangeFirewall
    ];

    // These high-impact operations require dedicated implementations and
    // controls. They remain blocked even if a caller mistakenly allowlists them.
    private static readonly HashSet<AgentCapability> NotImplementedCapabilities =
    [
        AgentCapability.RunCommand,
        AgentCapability.InstallSoftware,
        AgentCapability.ChangeFirewall
    ];

    public static PolicyDecision Evaluate(AgentPolicy policy, PolicyRequest request)
    {
        ArgumentNullException.ThrowIfNull(policy);
        ArgumentNullException.ThrowIfNull(request);

        if (!Enum.IsDefined(request.Capability))
        {
            return PolicyDecision.Deny(
                "unknown_capability",
                "The requested capability is not recognized.");
        }

        if (NotImplementedCapabilities.Contains(request.Capability))
        {
            return PolicyDecision.Deny(
                "capability_not_implemented",
                "This high-impact capability is disabled until its dedicated security controls are implemented.");
        }

        if (!policy.AllowedCapabilities.Contains(request.Capability))
        {
            return PolicyDecision.Deny(
                "capability_not_allowed",
                "The requested capability is not explicitly allowed.");
        }

        // A policy configuration cannot downgrade a capability's baseline
        // approval requirement. A trusted, operation-bound approval verifier
        // does not exist yet, so these capabilities fail closed.
        if (ApprovalRequiredByDefault.Contains(request.Capability) ||
            policy.ApprovalRequiredCapabilities.Contains(request.Capability))
        {
            return PolicyDecision.Deny(
                "approval_required",
                "This capability remains blocked until trusted local approval and execution-time enforcement are implemented.");
        }

        return PolicyDecision.Permit();
    }
}

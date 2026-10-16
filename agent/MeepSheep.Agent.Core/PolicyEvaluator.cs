namespace MeepSheep.Agent.Core;

/// <summary>
/// Evaluates local policy only. Approval-required capabilities remain denied
/// until a trusted, operation-bound local approval mechanism is implemented.
/// </summary>
public static class PolicyEvaluator
{
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

        if (request.RequiresAdminPrivileges)
        {
            return PolicyDecision.Deny(
                "admin_privileges_not_granted",
                "Administrator privileges are never granted by this policy.");
        }

        if (!policy.AllowedCapabilities.Contains(request.Capability))
        {
            return PolicyDecision.Deny(
                "capability_not_allowed",
                "The requested capability is not explicitly allowed.");
        }

        // Deliberately fail closed. A caller-supplied bool is not trustworthy
        // evidence that a user approved this exact operation.
        if (policy.ApprovalRequiredCapabilities.Contains(request.Capability))
        {
            return PolicyDecision.Deny(
                "approval_required",
                "This capability remains blocked until trusted local approval is implemented.");
        }

        return PolicyDecision.Permit();
    }
}

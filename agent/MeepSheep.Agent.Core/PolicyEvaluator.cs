namespace MeepSheep.Agent.Core;

public static class PolicyEvaluator
{
    public static PolicyDecision Evaluate(AgentPolicy policy, PolicyRequest request)
    {
        ArgumentNullException.ThrowIfNull(policy);
        ArgumentNullException.ThrowIfNull(request);

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

        if (policy.ApprovalRequiredCapabilities.Contains(request.Capability) &&
            !request.ApprovalGranted)
        {
            return PolicyDecision.Deny(
                "approval_required",
                "This capability requires a separate, explicit user approval.");
        }

        return PolicyDecision.Permit();
    }
}

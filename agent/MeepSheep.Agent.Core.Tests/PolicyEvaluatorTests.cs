using MeepSheep.Agent.Core;
using Xunit;

namespace MeepSheep.Agent.Core.Tests;

public sealed class PolicyEvaluatorTests
{
    [Fact]
    public void DenyAllPolicyRejectsEveryCapability()
    {
        var decision = PolicyEvaluator.Evaluate(
            AgentPolicy.DenyAll,
            new PolicyRequest(AgentCapability.CaptureScreen));

        Assert.False(decision.Allowed);
        Assert.Equal("capability_not_allowed", decision.Code);
    }

    [Fact]
    public void UnknownCapabilityIsRejectedEvenIfPolicyContainsIt()
    {
        var unknownCapability = (AgentCapability)int.MaxValue;
        var policy = new AgentPolicy(
            new HashSet<AgentCapability> { unknownCapability },
            new HashSet<AgentCapability>());

        var decision = PolicyEvaluator.Evaluate(
            policy,
            new PolicyRequest(unknownCapability));

        Assert.False(decision.Allowed);
        Assert.Equal("unknown_capability", decision.Code);
    }

    [Fact]
    public void ExplicitlyAllowedCapabilityCanProceed()
    {
        var policy = new AgentPolicy(
            new HashSet<AgentCapability> { AgentCapability.LaunchApplication },
            new HashSet<AgentCapability>());

        var decision = PolicyEvaluator.Evaluate(
            policy,
            new PolicyRequest(AgentCapability.LaunchApplication));

        Assert.True(decision.Allowed);
        Assert.Equal("allowed", decision.Code);
    }

    [Fact]
    public void SensitiveCapabilityRequiresSeparateApproval()
    {
        var policy = new AgentPolicy(
            new HashSet<AgentCapability> { AgentCapability.DeleteFiles },
            new HashSet<AgentCapability> { AgentCapability.DeleteFiles });

        var decision = PolicyEvaluator.Evaluate(
            policy,
            new PolicyRequest(AgentCapability.DeleteFiles));

        Assert.False(decision.Allowed);
        Assert.Equal("approval_required", decision.Code);
    }

    [Fact]
    public void SensitiveCapabilityCanProceedAfterApproval()
    {
        var policy = new AgentPolicy(
            new HashSet<AgentCapability> { AgentCapability.DeleteFiles },
            new HashSet<AgentCapability> { AgentCapability.DeleteFiles });

        var decision = PolicyEvaluator.Evaluate(
            policy,
            new PolicyRequest(AgentCapability.DeleteFiles, ApprovalGranted: true));

        Assert.True(decision.Allowed);
    }

    [Fact]
    public void AdministratorPrivilegesAreAlwaysRejected()
    {
        var policy = new AgentPolicy(
            new HashSet<AgentCapability> { AgentCapability.RunCommand },
            new HashSet<AgentCapability>());

        var decision = PolicyEvaluator.Evaluate(
            policy,
            new PolicyRequest(AgentCapability.RunCommand, RequiresAdminPrivileges: true));

        Assert.False(decision.Allowed);
        Assert.Equal("admin_privileges_not_granted", decision.Code);
    }

    [Fact]
    public void MutatingInputSetsDoesNotChangeThePolicy()
    {
        var allowed = new HashSet<AgentCapability>
        {
            AgentCapability.LaunchApplication,
            AgentCapability.DeleteFiles
        };
        var approvalRequired = new HashSet<AgentCapability> { AgentCapability.DeleteFiles };
        var policy = new AgentPolicy(allowed, approvalRequired);

        allowed.Clear();
        approvalRequired.Clear();

        var allowedDecision = PolicyEvaluator.Evaluate(
            policy,
            new PolicyRequest(AgentCapability.LaunchApplication));
        var sensitiveDecision = PolicyEvaluator.Evaluate(
            policy,
            new PolicyRequest(AgentCapability.DeleteFiles));

        Assert.True(allowedDecision.Allowed);
        Assert.False(sensitiveDecision.Allowed);
        Assert.Equal("approval_required", sensitiveDecision.Code);
    }

    [Fact]
    public void ExplicitApprovalDoesNotOverrideCapabilityAllowlist()
    {
        var decision = PolicyEvaluator.Evaluate(
            AgentPolicy.DenyAll,
            new PolicyRequest(AgentCapability.ChangeFirewall, ApprovalGranted: true));

        Assert.False(decision.Allowed);
        Assert.Equal("capability_not_allowed", decision.Code);
    }
}

using MeepSheep.Agent.Core;
using Xunit;

namespace MeepSheep.Agent.Core.Tests;

public sealed class AgentTaskLifecycleTests
{
    [Theory]
    [InlineData(AgentTaskState.Created, AgentTaskState.AwaitingApproval)]
    [InlineData(AgentTaskState.Created, AgentTaskState.Authorized)]
    [InlineData(AgentTaskState.AwaitingApproval, AgentTaskState.Authorized)]
    [InlineData(AgentTaskState.Authorized, AgentTaskState.Running)]
    [InlineData(AgentTaskState.Running, AgentTaskState.Succeeded)]
    [InlineData(AgentTaskState.Running, AgentTaskState.Failed)]
    [InlineData(AgentTaskState.Running, AgentTaskState.Cancelled)]
    [InlineData(AgentTaskState.Created, AgentTaskState.Expired)]
    [InlineData(AgentTaskState.Authorized, AgentTaskState.Revoked)]
    public void AllowsDefinedTransitions(AgentTaskState current, AgentTaskState next)
    {
        Assert.True(AgentTaskLifecycle.CanTransition(current, next));
    }

    [Theory]
    [InlineData(AgentTaskState.Succeeded, AgentTaskState.Running)]
    [InlineData(AgentTaskState.Failed, AgentTaskState.Authorized)]
    [InlineData(AgentTaskState.Cancelled, AgentTaskState.Running)]
    [InlineData(AgentTaskState.Expired, AgentTaskState.Authorized)]
    [InlineData(AgentTaskState.Revoked, AgentTaskState.Running)]
    [InlineData(AgentTaskState.Running, AgentTaskState.Expired)]
    [InlineData(AgentTaskState.Running, AgentTaskState.Revoked)]
    [InlineData(AgentTaskState.AwaitingApproval, AgentTaskState.Running)]
    [InlineData(AgentTaskState.Created, AgentTaskState.Succeeded)]
    public void RejectsUndefinedTransitions(AgentTaskState current, AgentTaskState next)
    {
        Assert.False(AgentTaskLifecycle.CanTransition(current, next));
    }

    [Theory]
    [InlineData(AgentTaskState.Succeeded)]
    [InlineData(AgentTaskState.Failed)]
    [InlineData(AgentTaskState.Cancelled)]
    [InlineData(AgentTaskState.Expired)]
    [InlineData(AgentTaskState.Revoked)]
    public void TerminalStatesCannotTransition(AgentTaskState terminal)
    {
        foreach (var next in Enum.GetValues<AgentTaskState>())
        {
            Assert.False(AgentTaskLifecycle.CanTransition(terminal, next));
        }
    }
}

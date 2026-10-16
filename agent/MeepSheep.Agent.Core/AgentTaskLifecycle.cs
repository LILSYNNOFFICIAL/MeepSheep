namespace MeepSheep.Agent.Core;

/// <summary>
/// Lifecycle labels for a task request. This model does not execute work,
/// persist state, or provide synchronization for concurrent state updates.
/// </summary>
public enum AgentTaskState
{
    Created,
    AwaitingApproval,
    Authorized,
    Running,
    Succeeded,
    Failed,
    Cancelled,
    Expired,
    Revoked
}

/// <summary>
/// Evaluates allowed task-state transitions. Callers must persist transitions
/// atomically and enforce authentication, policy, approval, and cancellation
/// independently before dispatching any operation.
/// </summary>
public static class AgentTaskLifecycle
{
    public static bool CanTransition(AgentTaskState current, AgentTaskState next)
    {
        return current switch
        {
            AgentTaskState.Created =>
                next is AgentTaskState.AwaitingApproval
                    or AgentTaskState.Authorized
                    or AgentTaskState.Cancelled
                    or AgentTaskState.Expired
                    or AgentTaskState.Revoked,

            AgentTaskState.AwaitingApproval =>
                next is AgentTaskState.Authorized
                    or AgentTaskState.Cancelled
                    or AgentTaskState.Expired
                    or AgentTaskState.Revoked,

            AgentTaskState.Authorized =>
                next is AgentTaskState.Running
                    or AgentTaskState.Cancelled
                    or AgentTaskState.Expired
                    or AgentTaskState.Revoked,

            AgentTaskState.Running =>
                next is AgentTaskState.Succeeded
                    or AgentTaskState.Failed
                    or AgentTaskState.Cancelled,

            AgentTaskState.Succeeded
                or AgentTaskState.Failed
                or AgentTaskState.Cancelled
                or AgentTaskState.Expired
                or AgentTaskState.Revoked => false,

            _ => false
        };
    }
}

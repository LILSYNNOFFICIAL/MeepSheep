namespace MeepSheep.Agent.Core;

public sealed record PolicyDecision(
    bool Allowed,
    string Code,
    string Message)
{
    public static PolicyDecision Deny(string code, string message) =>
        new(false, code, message);

    public static PolicyDecision Permit() =>
        new(true, "allowed", "The requested capability is permitted by the active policy.");
}

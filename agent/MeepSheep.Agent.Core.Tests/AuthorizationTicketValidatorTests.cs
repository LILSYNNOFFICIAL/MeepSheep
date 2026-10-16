using MeepSheep.Agent.Core;
using Xunit;

namespace MeepSheep.Agent.Core.Tests;

public sealed class AuthorizationTicketValidatorTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);

    private static TaskAuthorizationEnvelope Envelope() =>
        new(Guid.NewGuid(), "device-01", AgentCapability.DeleteFiles,
            Now.AddSeconds(-10), Now.AddSeconds(30), "nonce-01", @"C:\safe\file.txt");

    private static AuthorizationTicket Ticket(TaskAuthorizationEnvelope envelope,
        string? approvalId = "approval-01") =>
        new(Guid.NewGuid(), envelope.DeviceId, envelope.RequestId, envelope.Capability,
            AuthorizationTicketValidator.ComputeTargetDigest(envelope.OperationTarget),
            Now.AddSeconds(-5), Now.AddSeconds(20), approvalId);

    [Fact]
    public void AcceptsTicketBoundToExactEnvelopeAndApprovalReference()
    {
        var envelope = Envelope();
        var result = AuthorizationTicketValidator.Validate(Ticket(envelope), envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: true);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void RejectsTicketForDifferentRequestDeviceOrCapability()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope) with { RequestId = Guid.NewGuid() };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_binding_mismatch", result.Code);
    }

    [Fact]
    public void RejectsTargetSubstitution()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope);
        var changedEnvelope = envelope with { OperationTarget = @"C:\safe\other.txt" };

        var result = AuthorizationTicketValidator.Validate(ticket, changedEnvelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_target_mismatch", result.Code);
    }

    [Fact]
    public void RejectsMissingApprovalReferenceWhenRequired()
    {
        var envelope = Envelope();

        var result = AuthorizationTicketValidator.Validate(Ticket(envelope, approvalId: null),
            envelope, Now, TimeSpan.FromMinutes(1), approvalRequired: true);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_approval_reference_missing", result.Code);
    }

    [Fact]
    public void RejectsExpiredTicket()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope) with { ExpiresAtUtc = Now };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_not_current", result.Code);
    }

    [Fact]
    public void RejectsTicketLifetimeAboveConfiguredMaximum()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope) with { ExpiresAtUtc = Now.AddMinutes(2) };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_invalid_lifetime", result.Code);
    }

    [Fact]
    public void TargetDigestIsDeterministicAndCaseSensitive()
    {
        var first = AuthorizationTicketValidator.ComputeTargetDigest("File.txt");
        var same = AuthorizationTicketValidator.ComputeTargetDigest("File.txt");
        var different = AuthorizationTicketValidator.ComputeTargetDigest("file.txt");

        Assert.Equal(first, same);
        Assert.NotEqual(first, different);
    }
}

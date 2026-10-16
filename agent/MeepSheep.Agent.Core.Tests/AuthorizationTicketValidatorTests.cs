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
    public void RejectsEnvelopeWithMissingTargetWithoutThrowing()
    {
        var envelope = Envelope() with { OperationTarget = "  " };
        var ticket = Ticket(Envelope()) with
        {
            RequestId = envelope.RequestId,
            DeviceId = envelope.DeviceId,
            Capability = envelope.Capability
        };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_envelope_target_invalid", result.Code);
    }

    [Fact]
    public void RejectsEnvelopeWithOversizedTarget()
    {
        var envelope = Envelope() with { OperationTarget = new string('x', 1025) };
        var ticket = Ticket(Envelope()) with
        {
            RequestId = envelope.RequestId,
            DeviceId = envelope.DeviceId,
            Capability = envelope.Capability
        };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_envelope_target_invalid", result.Code);
    }

    [Fact]
    public void RejectsExpiredEnvelope()
    {
        var envelope = Envelope() with { ExpiresAt = Now };
        var ticket = Ticket(envelope) with { ExpiresAtUtc = Now.AddSeconds(10) };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_envelope_not_current", result.Code);
    }

    [Fact]
    public void RejectsTicketExpiryAfterEnvelopeExpiry()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope) with { ExpiresAtUtc = envelope.ExpiresAt.AddSeconds(1) };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_envelope_time_mismatch", result.Code);
    }

    [Fact]
    public void RejectsTicketIssuedBeforeEnvelope()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope) with { IssuedAtUtc = envelope.IssuedAt.AddSeconds(-1) };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_envelope_time_mismatch", result.Code);
    }

    [Fact]
    public void RejectsTargetDigestContainingNonHexCharacters()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope) with { TargetDigest = new string('g', 64) };

        var result = AuthorizationTicketValidator.Validate(ticket, envelope,
            Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.False(result.IsValid);
        Assert.Equal("ticket_field_invalid", result.Code);
    }

    [Fact]
    public void RejectsUnknownCapabilityAndInvalidValidatorConfiguration()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope) with { Capability = (AgentCapability)int.MaxValue };

        var unknownCapability = AuthorizationTicketValidator.Validate(
            ticket, envelope, Now, TimeSpan.FromMinutes(1), approvalRequired: false);
        var invalidLifetime = AuthorizationTicketValidator.Validate(
            Ticket(envelope), envelope, Now, TimeSpan.Zero, approvalRequired: false);

        Assert.False(unknownCapability.IsValid);
        Assert.Equal("ticket_unknown_capability", unknownCapability.Code);
        Assert.False(invalidLifetime.IsValid);
        Assert.Equal("invalid_ticket_validator_configuration", invalidLifetime.Code);
    }

    [Fact]
    public void RejectsMalformedTicketIdentifiersAndApprovalReferences()
    {
        var envelope = Envelope();
        var valid = Ticket(envelope);
        var cases = new[]
        {
            (Ticket: valid with { TicketId = Guid.Empty }, ExpectedCode: "ticket_missing_required_field"),
            (Ticket: valid with { DeviceId = new string('d', 129) }, ExpectedCode: "ticket_field_invalid"),
            (Ticket: valid with { ApprovalId = " " }, ExpectedCode: "ticket_field_invalid"),
            (Ticket: valid with { ApprovalId = new string('a', 129) }, ExpectedCode: "ticket_field_invalid")
        };

        foreach (var item in cases)
        {
            var result = AuthorizationTicketValidator.Validate(
                item.Ticket, envelope, Now, TimeSpan.FromMinutes(1), approvalRequired: false);

            Assert.False(result.IsValid);
            Assert.Equal(item.ExpectedCode, result.Code);
        }
    }

    [Fact]
    public void AcceptsLowercaseHexDigestWithoutChangingTargetBinding()
    {
        var envelope = Envelope();
        var ticket = Ticket(envelope) with
        {
            TargetDigest = AuthorizationTicketValidator
                .ComputeTargetDigest(envelope.OperationTarget)
                .ToLowerInvariant()
        };

        var result = AuthorizationTicketValidator.Validate(
            ticket, envelope, Now, TimeSpan.FromMinutes(1), approvalRequired: false);

        Assert.True(result.IsValid);
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

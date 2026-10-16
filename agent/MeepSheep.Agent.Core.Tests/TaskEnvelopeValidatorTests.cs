using MeepSheep.Agent.Core;
using Xunit;

namespace MeepSheep.Agent.Core.Tests;

public sealed class TaskEnvelopeValidatorTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);

    private static TaskAuthorizationEnvelope ValidEnvelope(
        DateTimeOffset? issuedAt = null,
        DateTimeOffset? expiresAt = null) =>
        new(
            Guid.NewGuid(),
            "device-test-01",
            AgentCapability.CaptureScreen,
            issuedAt ?? Now.AddSeconds(-5),
            expiresAt ?? Now.AddSeconds(25),
            "nonce-test-01",
            "interactive-session");

    [Fact]
    public void AcceptsWellFormedUnexpiredEnvelope()
    {
        var result = TaskEnvelopeValidator.Validate(
            ValidEnvelope(), Now, TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(5));

        Assert.True(result.IsValid);
        Assert.Equal("valid_shape_and_time", result.Code);
    }

    [Fact]
    public void RejectsUnknownCapability()
    {
        var result = TaskEnvelopeValidator.Validate(
            ValidEnvelope() with { Capability = (AgentCapability)int.MaxValue },
            Now,
            TimeSpan.FromMinutes(1),
            TimeSpan.FromSeconds(5));

        Assert.False(result.IsValid);
        Assert.Equal("unknown_capability", result.Code);
    }

    [Fact]
    public void RejectsExpiredEnvelope()
    {
        var result = TaskEnvelopeValidator.Validate(
            ValidEnvelope(expiresAt: Now), Now, TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(5));

        Assert.False(result.IsValid);
        Assert.Equal("authorization_expired", result.Code);
    }

    [Fact]
    public void RejectsLifetimeLongerThanConfiguredMaximum()
    {
        var result = TaskEnvelopeValidator.Validate(
            ValidEnvelope(issuedAt: Now.AddSeconds(-1), expiresAt: Now.AddMinutes(2)),
            Now,
            TimeSpan.FromMinutes(1),
            TimeSpan.FromSeconds(5));

        Assert.False(result.IsValid);
        Assert.Equal("lifetime_too_long", result.Code);
    }

    [Fact]
    public void RejectsIssueTimeTooFarInFuture()
    {
        var result = TaskEnvelopeValidator.Validate(
            ValidEnvelope(issuedAt: Now.AddMinutes(1), expiresAt: Now.AddMinutes(2)),
            Now,
            TimeSpan.FromMinutes(5),
            TimeSpan.FromSeconds(5));

        Assert.False(result.IsValid);
        Assert.Equal("issued_in_future", result.Code);
    }

    [Fact]
    public void RejectsMissingRequestIdentifier()
    {
        var result = TaskEnvelopeValidator.Validate(
            ValidEnvelope() with { RequestId = Guid.Empty },
            Now,
            TimeSpan.FromMinutes(1),
            TimeSpan.FromSeconds(5));

        Assert.False(result.IsValid);
        Assert.Equal("missing_request_id", result.Code);
    }

    [Fact]
    public void RejectsBlankDeviceNonceOrTarget()
    {
        var result = TaskEnvelopeValidator.Validate(
            ValidEnvelope() with { OperationTarget = " " },
            Now,
            TimeSpan.FromMinutes(1),
            TimeSpan.FromSeconds(5));

        Assert.False(result.IsValid);
        Assert.Equal("missing_required_field", result.Code);
    }

    [Fact]
    public void RejectsOversizedDeviceNonceAndTargetFields()
    {
        var cases = new[]
        {
            ValidEnvelope() with { DeviceId = new string('d', 129) },
            ValidEnvelope() with { Nonce = new string('n', 257) },
            ValidEnvelope() with { OperationTarget = new string('t', 1025) }
        };

        foreach (var envelope in cases)
        {
            var result = TaskEnvelopeValidator.Validate(
                envelope, Now, TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(5));

            Assert.False(result.IsValid);
            Assert.Equal("field_too_long", result.Code);
        }
    }

    [Fact]
    public void RejectsInvalidValidatorConfiguration()
    {
        var invalidLifetime = TaskEnvelopeValidator.Validate(
            ValidEnvelope(), Now, TimeSpan.Zero, TimeSpan.FromSeconds(5));
        var negativeClockSkew = TaskEnvelopeValidator.Validate(
            ValidEnvelope(), Now, TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(-1));

        Assert.False(invalidLifetime.IsValid);
        Assert.Equal("invalid_validator_configuration", invalidLifetime.Code);
        Assert.False(negativeClockSkew.IsValid);
        Assert.Equal("invalid_validator_configuration", negativeClockSkew.Code);
    }

    [Fact]
    public void RejectsExpiryThatDoesNotFollowIssueTime()
    {
        var envelope = ValidEnvelope() with
        {
            IssuedAt = Now,
            ExpiresAt = Now
        };

        var result = TaskEnvelopeValidator.Validate(
            envelope, Now, TimeSpan.FromMinutes(1), TimeSpan.FromSeconds(5));

        Assert.False(result.IsValid);
        Assert.Equal("invalid_time_window", result.Code);
    }
}

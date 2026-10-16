using MeepSheep.Agent.Core;
using Xunit;

namespace MeepSheep.Agent.Core.Tests;

public sealed class ReplayProtectionStoreTests
{
    private static readonly DateTimeOffset Now =
        new(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void ConsumesNonceAndRequestIdOnlyOnce()
    {
        var store = new ReplayProtectionStore();
        var requestId = Guid.NewGuid();

        Assert.True(store.TryConsume("device-a", "nonce-a", requestId, Now.AddMinutes(1), Now));
        Assert.False(store.TryConsume("device-a", "nonce-a", Guid.NewGuid(), Now.AddMinutes(1), Now));
        Assert.False(store.TryConsume("device-a", "nonce-b", requestId, Now.AddMinutes(1), Now));
    }

    [Fact]
    public void NonceIsScopedToDevice()
    {
        var store = new ReplayProtectionStore();

        Assert.True(store.TryConsume("device-a", "same-nonce", Guid.NewGuid(), Now.AddMinutes(1), Now));
        Assert.True(store.TryConsume("device-b", "same-nonce", Guid.NewGuid(), Now.AddMinutes(1), Now));
    }

    [Fact]
    public void RejectsExpiredAndMalformedInputs()
    {
        var store = new ReplayProtectionStore();

        Assert.False(store.TryConsume("device-a", "nonce-a", Guid.NewGuid(), Now, Now));
        Assert.False(store.TryConsume(" ", "nonce-b", Guid.NewGuid(), Now.AddMinutes(1), Now));
        Assert.False(store.TryConsume("device-a", "nonce-c", Guid.Empty, Now.AddMinutes(1), Now));
    }

    [Fact]
    public void RemovesExpiredEntriesBeforeAcceptingNewOnes()
    {
        var store = new ReplayProtectionStore(maximumEntries: 2);
        var firstRequest = Guid.NewGuid();

        Assert.True(store.TryConsume("device-a", "nonce-a", firstRequest, Now.AddSeconds(1), Now));
        Assert.True(store.TryConsume("device-a", "nonce-b", Guid.NewGuid(), Now.AddMinutes(1), Now.AddSeconds(1)));
    }

    [Fact]
    public void FailsClosedWhenCapacityIsReached()
    {
        var store = new ReplayProtectionStore(maximumEntries: 2);

        Assert.True(store.TryConsume("device-a", "nonce-a", Guid.NewGuid(), Now.AddMinutes(1), Now));
        Assert.False(store.TryConsume("device-a", "nonce-b", Guid.NewGuid(), Now.AddMinutes(1), Now));
    }

    [Fact]
    public async Task ConcurrentAttemptsCanConsumeAuthorizationOnlyOnce()
    {
        var store = new ReplayProtectionStore();
        var requestId = Guid.NewGuid();

        var attempts = Enumerable.Range(0, 32)
            .Select(_ => Task.Run(() =>
                store.TryConsume("device-a", "one-shot-nonce", requestId, Now.AddMinutes(1), Now)));

        var results = await Task.WhenAll(attempts);

        Assert.Single(results.Where(result => result));
    }
}

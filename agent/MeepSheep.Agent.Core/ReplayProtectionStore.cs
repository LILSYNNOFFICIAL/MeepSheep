namespace MeepSheep.Agent.Core;

/// <summary>
/// Process-local, bounded replay guard for already-authenticated task envelopes.
/// This is not durable across restarts and does not authenticate envelopes.
/// Call only after cryptographic authentication and envelope validation.
/// </summary>
public sealed class ReplayProtectionStore
{
    private readonly object _gate = new();
    private readonly Dictionary<(string Kind, string Value), DateTimeOffset> _seen = new();
    private readonly int _maximumEntries;

    public ReplayProtectionStore(int maximumEntries = 10_000)
    {
        if (maximumEntries < 2)
        {
            throw new ArgumentOutOfRangeException(
                nameof(maximumEntries),
                "Capacity must allow at least a nonce and a request ID.");
        }

        _maximumEntries = maximumEntries;
    }

    /// <summary>
    /// Atomically consumes a device-scoped nonce and request ID.
    /// A false result means the envelope must not be executed.
    /// </summary>
    public bool TryConsume(
        string deviceId,
        string nonce,
        Guid requestId,
        DateTimeOffset expiresAt,
        DateTimeOffset now)
    {
        if (string.IsNullOrWhiteSpace(deviceId) || deviceId.Length > 128 ||
            string.IsNullOrWhiteSpace(nonce) || nonce.Length > 256 ||
            requestId == Guid.Empty || expiresAt <= now)
        {
            return false;
        }

        var nonceKey = (Kind: "nonce", Value: deviceId + "\0" + nonce);
        var requestKey = (Kind: "request", Value: requestId.ToString("N"));

        lock (_gate)
        {
            foreach (var key in _seen
                         .Where(pair => pair.Value <= now)
                         .Select(pair => pair.Key)
                         .ToArray())
            {
                _seen.Remove(key);
            }

            if (_seen.ContainsKey(nonceKey) || _seen.ContainsKey(requestKey))
            {
                return false;
            }

            // Fail closed when full. Do not evict unexpired entries, because
            // doing so could make a previously consumed authorization replayable.
            if (_seen.Count > _maximumEntries - 2)
            {
                return false;
            }

            _seen.Add(nonceKey, expiresAt);
            _seen.Add(requestKey, expiresAt);
            return true;
        }
    }
}

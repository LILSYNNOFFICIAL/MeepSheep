using MeepSheep.Agent.Core;

namespace MeepSheep.Agent.Host;

public static class AgentConsoleRuntime
{
    public static async Task RunAsync(
        TextReader input,
        TextWriter output,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(input);
        ArgumentNullException.ThrowIfNull(output);

        output.WriteLine("MeepSheep local agent shell");
        output.WriteLine("---------------------------");
        output.WriteLine("Status: LOCAL ONLY");
        output.WriteLine("Remote session: not configured");
        output.WriteLine("Computer-control capabilities: disabled");
        output.WriteLine($"Policy: deny all ({AgentPolicy.DenyAll.AllowedCapabilities.Count} capabilities allowed)");
        output.WriteLine();
        output.WriteLine("This is a lifecycle/stop-control prototype, not a remote-control agent.");
        output.WriteLine("Type STOP and press Enter, or press Ctrl+C, to stop.");
        output.WriteLine();

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var line = await input.ReadLineAsync(cancellationToken);
                if (line is null ||
                    string.Equals(line.Trim(), "STOP", StringComparison.OrdinalIgnoreCase))
                {
                    break;
                }

                output.WriteLine("No command execution is available. Type STOP to exit.");
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Expected local stop path.
        }
        finally
        {
            output.WriteLine("Status: STOPPED");
        }
    }
}

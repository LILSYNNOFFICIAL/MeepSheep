using MeepSheep.Agent.Core;

using var stop = new CancellationTokenSource();

Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    stop.Cancel();
};

Console.WriteLine("MeepSheep local agent shell");
Console.WriteLine("---------------------------");
Console.WriteLine("Status: LOCAL ONLY");
Console.WriteLine("Remote session: not configured");
Console.WriteLine("Computer-control capabilities: disabled");
Console.WriteLine($"Policy: deny all ({AgentPolicy.DenyAll.AllowedCapabilities.Count} capabilities allowed)");
Console.WriteLine();
Console.WriteLine("This is a lifecycle/stop-control prototype, not a remote-control agent.");
Console.WriteLine("Type STOP and press Enter, or press Ctrl+C, to stop.");
Console.WriteLine();

try
{
    while (!stop.IsCancellationRequested)
    {
        var line = await Console.In.ReadLineAsync(stop.Token);
        if (line is null || string.Equals(line.Trim(), "STOP", StringComparison.OrdinalIgnoreCase))
        {
            stop.Cancel();
            break;
        }

        Console.WriteLine("No command execution is available. Type STOP to exit.");
    }
}
catch (OperationCanceledException) when (stop.IsCancellationRequested)
{
    // Expected local stop path.
}
finally
{
    Console.WriteLine("Status: STOPPED");
}

using MeepSheep.Agent.Host;

using var stop = new CancellationTokenSource();

Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    stop.Cancel();
};

await AgentConsoleRuntime.RunAsync(Console.In, Console.Out, stop.Token);

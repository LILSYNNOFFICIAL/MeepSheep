using MeepSheep.Agent.Host;
using Xunit;

namespace MeepSheep.Agent.Core.Tests;

public sealed class AgentConsoleRuntimeTests
{
    [Theory]
    [InlineData("STOP")]
    [InlineData(" stop ")]
    [InlineData("Stop")]
    public async Task StopCommandEndsTheLocalSession(string command)
    {
        using var input = new StringReader(command + Environment.NewLine);
        using var output = new StringWriter();

        await AgentConsoleRuntime.RunAsync(input, output);

        Assert.Contains("Status: LOCAL ONLY", output.ToString());
        Assert.Contains("Status: STOPPED", output.ToString());
        Assert.DoesNotContain("No command execution is available.", output.ToString());
    }

    [Fact]
    public async Task OrdinaryInputDoesNotExecuteCommands()
    {
        using var input = new StringReader("whoami" + Environment.NewLine + "STOP" + Environment.NewLine);
        using var output = new StringWriter();

        await AgentConsoleRuntime.RunAsync(input, output);

        Assert.Contains("No command execution is available. Type STOP to exit.", output.ToString());
        Assert.Contains("Status: STOPPED", output.ToString());
    }

    [Fact]
    public async Task EndOfInputStopsTheLocalSession()
    {
        using var input = new StringReader(string.Empty);
        using var output = new StringWriter();

        await AgentConsoleRuntime.RunAsync(input, output);

        Assert.Contains("Status: STOPPED", output.ToString());
    }

    [Fact]
    public async Task PreCancelledTokenStopsWithoutReadingInput()
    {
        using var input = new StringReader("whoami" + Environment.NewLine);
        using var output = new StringWriter();
        using var stop = new CancellationTokenSource();
        stop.Cancel();

        await AgentConsoleRuntime.RunAsync(input, output, stop.Token);

        Assert.Contains("Status: STOPPED", output.ToString());
        Assert.DoesNotContain("No command execution is available.", output.ToString());
    }
}

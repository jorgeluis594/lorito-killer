using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Lorito.PrintGateway;

public sealed class RealtimeClient(GatewayConfiguration configuration, ILogger<RealtimeClient> logger)
{
    private readonly ConcurrentDictionary<Task, byte> activeJobs = new();

    internal int ActiveJobCount => activeJobs.Count;

    public async Task ListenAsync(string clientId, Func<Task> refreshInventory, Func<string, Task> processJob, CancellationToken cancellationToken)
    {
        var uri = new Uri(configuration.SupabaseUrl.Replace("https://", "wss://", StringComparison.OrdinalIgnoreCase) + $"/realtime/v1/websocket?apikey={Uri.EscapeDataString(configuration.SupabasePublishableKey)}&vsn=1.0.0");
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                using var socket = new ClientWebSocket();
                await socket.ConnectAsync(uri, cancellationToken);
                logger.LogInformation("operation=connection status=connected client={ClientId}", clientId);
                await SendAsync(socket, new { topic = $"realtime:print-client:{clientId}", @event = "phx_join", payload = new { config = new { broadcast = new { ack = false, self = false }, presence = new { key = "" } } }, @ref = "1" }, cancellationToken);
                await refreshInventory();
                await ReceiveAsync(socket, refreshInventory, processJob, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { return; }
            catch (Exception exception) { logger.LogWarning(exception, "operation=connection status=reconnecting client={ClientId}", clientId); await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken); }
        }
    }

    internal async Task ReceiveAsync(WebSocket socket, Func<Task> refreshInventory, Func<string, Task> processJob, CancellationToken cancellationToken)
    {
        var buffer = new byte[16 * 1024];
        using var message = new MemoryStream();
        while (socket.State == WebSocketState.Open)
        {
            var result = await socket.ReceiveAsync(buffer, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close) return;
            message.Write(buffer, 0, result.Count);
            if (!result.EndOfMessage) continue;
            try
            {
                using var json = JsonDocument.Parse(message.ToArray());
                if (json.RootElement.TryGetProperty("event", out var eventName) && eventName.GetString() == "broadcast" && json.RootElement.TryGetProperty("payload", out var payload) && payload.TryGetProperty("payload", out var body) && body.TryGetProperty("type", out var type) && body.TryGetProperty("version", out var version) && version.GetInt32() == 1)
                {
                    if (type.GetString() == "REFRESH_PRINTER_INVENTORY") await refreshInventory();
                    else if (type.GetString() == "PRINT_JOB_AVAILABLE" && body.TryGetProperty("jobId", out var jobId) && Guid.TryParse(jobId.GetString(), out _)) StartJob(processJob, jobId.GetString()!, cancellationToken);
                }
            }
            catch (JsonException) { }
            message.SetLength(0);
        }
    }

    private void StartJob(Func<string, Task> processJob, string jobId, CancellationToken cancellationToken)
    {
        Task task;
        try { task = processJob(jobId); }
        catch (Exception exception) { logger.LogError(exception, "Print job failed before starting for {JobId}", jobId); return; }

        activeJobs.TryAdd(task, 0);
        _ = ObserveJobAsync(task, jobId, cancellationToken);
    }

    private async Task ObserveJobAsync(Task task, string jobId, CancellationToken cancellationToken)
    {
        try { await task; }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { }
        catch (Exception exception) { logger.LogError(exception, "Print job failed for {JobId}", jobId); }
        finally { activeJobs.TryRemove(task, out _); }
    }

    private static async Task SendAsync(WebSocket socket, object value, CancellationToken cancellationToken)
    {
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value));
        await socket.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);
    }
}

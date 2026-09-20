using System.Collections.Concurrent;
using System.Globalization;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace Lorito.PrintGateway;

public sealed class RealtimeClient(GatewayConfiguration configuration, ILogger<RealtimeClient> logger)
{
    private readonly ConcurrentDictionary<Task, byte> activeJobs = new();

    internal int ActiveJobCount => activeJobs.Count;
    internal TimeSpan HeartbeatInterval { get; init; } = TimeSpan.FromSeconds(25);

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
                await RunConnectionAsync(socket, clientId, refreshInventory, processJob, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { return; }
            catch (Exception exception) { logger.LogWarning(exception, "operation=connection status=reconnecting client={ClientId}", clientId); await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken); }
        }
    }

    internal async Task RunConnectionAsync(WebSocket socket, string clientId, Func<Task> refreshInventory, Func<string, Task> processJob, CancellationToken cancellationToken)
    {
        await SendAsync(socket, new { topic = $"realtime:print-client:{clientId}", @event = "phx_join", payload = new { config = new { broadcast = new { ack = false, self = false }, presence = new { key = "" } } }, @ref = "1" }, cancellationToken);
        await refreshInventory();

        using var connectionCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var heartbeat = new HeartbeatState();
        var receiveTask = ReceiveAsync(socket, refreshInventory, processJob, heartbeat, connectionCancellation.Token, cancellationToken);
        var heartbeatTask = SendHeartbeatsAsync(socket, heartbeat, connectionCancellation.Token);
        var completedTask = await Task.WhenAny(receiveTask, heartbeatTask);
        connectionCancellation.Cancel();
        try { await Task.WhenAll(receiveTask, heartbeatTask); }
        catch (OperationCanceledException) when (!completedTask.IsFaulted) { }
        await completedTask;
    }

    internal Task ReceiveAsync(WebSocket socket, Func<Task> refreshInventory, Func<string, Task> processJob, CancellationToken cancellationToken) =>
        ReceiveAsync(socket, refreshInventory, processJob, null, cancellationToken, cancellationToken);

    private async Task ReceiveAsync(WebSocket socket, Func<Task> refreshInventory, Func<string, Task> processJob, HeartbeatState? heartbeat, CancellationToken cancellationToken, CancellationToken jobCancellationToken)
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
                var root = json.RootElement;
                if (heartbeat is not null && root.TryGetProperty("topic", out var topic) && topic.GetString() == "phoenix" && root.TryGetProperty("event", out var replyEvent) && replyEvent.GetString() == "phx_reply" && root.TryGetProperty("ref", out var replyRef)) heartbeat.Confirm(replyRef.GetString());
                else if (root.TryGetProperty("event", out var eventName) && eventName.GetString() == "broadcast" && root.TryGetProperty("payload", out var payload) && payload.TryGetProperty("payload", out var body) && body.TryGetProperty("type", out var type) && body.TryGetProperty("version", out var version) && version.GetInt32() == 1)
                {
                    if (type.GetString() == "REFRESH_PRINTER_INVENTORY") await refreshInventory();
                    else if (type.GetString() == "PRINT_JOB_AVAILABLE" && body.TryGetProperty("jobId", out var jobId) && Guid.TryParse(jobId.GetString(), out _)) StartJob(processJob, jobId.GetString()!, jobCancellationToken);
                }
            }
            catch (JsonException) { }
            message.SetLength(0);
        }
    }

    private async Task SendHeartbeatsAsync(WebSocket socket, HeartbeatState heartbeat, CancellationToken cancellationToken)
    {
        var nextRef = 2;
        while (socket.State == WebSocketState.Open)
        {
            await Task.Delay(HeartbeatInterval, cancellationToken);
            var reference = nextRef++.ToString(CultureInfo.InvariantCulture);
            if (!heartbeat.Begin(reference)) throw new TimeoutException("Realtime heartbeat was not acknowledged");
            await SendAsync(socket, new { topic = "phoenix", @event = "heartbeat", payload = new { }, @ref = reference }, cancellationToken);
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

    private sealed class HeartbeatState
    {
        private string? pendingRef;
        public bool Begin(string reference) => Interlocked.CompareExchange(ref pendingRef, reference, null) is null;
        public void Confirm(string? reference)
        {
            var pending = Volatile.Read(ref pendingRef);
            if (pending == reference) Interlocked.CompareExchange(ref pendingRef, null, pending);
        }
    }
}

using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace Lorito.PrintGateway;

public sealed class RealtimeClient(GatewayConfiguration configuration)
{
    public async Task ListenAsync(string clientId, Func<Task> refreshInventory, CancellationToken cancellationToken)
    {
        var uri = new Uri(configuration.SupabaseUrl.Replace("https://", "wss://", StringComparison.OrdinalIgnoreCase) + $"/realtime/v1/websocket?apikey={Uri.EscapeDataString(configuration.SupabasePublishableKey)}&vsn=1.0.0");
        using var socket = new ClientWebSocket();
        await socket.ConnectAsync(uri, cancellationToken);
        await SendAsync(socket, new { topic = $"realtime:print-client:{clientId}", @event = "phx_join", payload = new { config = new { broadcast = new { ack = false, self = false }, presence = new { key = "" } } }, @ref = "1" }, cancellationToken);

        var buffer = new byte[16 * 1024];
        while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            var result = await socket.ReceiveAsync(buffer, cancellationToken);
            if (result.MessageType == WebSocketMessageType.Close) return;
            using var json = JsonDocument.Parse(buffer[..result.Count]);
            if (!json.RootElement.TryGetProperty("event", out var eventName) || eventName.GetString() != "broadcast") continue;
            if (!json.RootElement.TryGetProperty("payload", out var payload) || !payload.TryGetProperty("payload", out var message)) continue;
            if (message.TryGetProperty("type", out var type) && type.GetString() == "REFRESH_PRINTER_INVENTORY" && message.TryGetProperty("version", out var version) && version.GetInt32() == 1)
                await refreshInventory();
        }
    }

    private static async Task SendAsync(ClientWebSocket socket, object value, CancellationToken cancellationToken)
    {
        var bytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value));
        await socket.SendAsync(bytes, WebSocketMessageType.Text, true, cancellationToken);
    }
}

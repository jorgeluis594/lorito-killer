using System.Collections.Concurrent;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Lorito.PrintGateway;
using Microsoft.Extensions.Logging;
using Xunit;

namespace Lorito.PrintGateway.Tests;

public sealed class RealtimeClientTests
{
    [Fact]
    public async Task Heartbeat_uses_phoenix_format_and_matching_reply_allows_the_next_one()
    {
        var client = ClientWithFastHeartbeat();
        var socket = new HeartbeatWebSocket();
        using var cancellation = new CancellationTokenSource();
        var connection = client.RunConnectionAsync(socket, "client-1", () => Task.CompletedTask, _ => Task.CompletedTask, cancellation.Token);

        await WaitUntilAsync(() => socket.Sent.Count >= 2);
        AssertHeartbeat(socket.Sent.ElementAt(1), "2");
        socket.Reply("2");
        await WaitUntilAsync(() => socket.Sent.Count >= 3);
        AssertHeartbeat(socket.Sent.ElementAt(2), "3");

        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => connection);
    }

    [Fact]
    public async Task Heartbeat_reply_with_a_different_reference_does_not_confirm_it()
    {
        var client = ClientWithFastHeartbeat();
        var socket = new HeartbeatWebSocket();
        var connection = client.RunConnectionAsync(socket, "client-1", () => Task.CompletedTask, _ => Task.CompletedTask, CancellationToken.None);

        await WaitUntilAsync(() => socket.Sent.Count >= 2);
        socket.Reply("999");

        await Assert.ThrowsAsync<TimeoutException>(() => connection);
        Assert.Equal(2, socket.Sent.Count);
    }

    [Fact]
    public async Task Missing_heartbeat_reply_ends_the_connection()
    {
        var client = ClientWithFastHeartbeat();
        var socket = new HeartbeatWebSocket();

        await Assert.ThrowsAsync<TimeoutException>(() => client.RunConnectionAsync(socket, "client-1", () => Task.CompletedTask, _ => Task.CompletedTask, CancellationToken.None));

        Assert.Equal(2, socket.Sent.Count);
    }

    [Fact]
    public async Task Jobs_are_received_independently_failures_are_observed_and_completed_jobs_are_removed()
    {
        var logger = new CapturingLogger();
        var client = new RealtimeClient(new GatewayConfiguration(), logger);
        var firstStarted = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var secondStarted = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var thirdStarted = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var releaseFirst = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var socket = new FakeWebSocket(Message("job-1"), Message("job-2"), Message("job-3"));

        var receive = client.ReceiveAsync(socket, () => Task.CompletedTask, async jobId =>
        {
            if (jobId.EndsWith("001", StringComparison.Ordinal))
            {
                firstStarted.SetResult(true);
                await releaseFirst.Task;
            }
            else if (jobId.EndsWith("002", StringComparison.Ordinal))
            {
                secondStarted.SetResult(true);
                throw new InvalidOperationException("expected");
            }
            else thirdStarted.SetResult(true);
        }, CancellationToken.None);

        await Task.WhenAll(firstStarted.Task, secondStarted.Task, thirdStarted.Task);
        Assert.True(client.ActiveJobCount >= 1);
        releaseFirst.SetResult(true);
        await receive;
        await WaitUntilAsync(() => client.ActiveJobCount == 0);

        Assert.Contains(logger.Errors, error => error.Contains("Print job failed", StringComparison.Ordinal));
    }

    private static byte[] Message(string suffix) => Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new
    {
        @event = "broadcast",
        payload = new { payload = new { type = "PRINT_JOB_AVAILABLE", version = 1, jobId = $"00000000-0000-0000-0000-00000000000{suffix[^1]}" } }
    }));

    private static RealtimeClient ClientWithFastHeartbeat() => new(new GatewayConfiguration(), new CapturingLogger())
    {
        HeartbeatInterval = TimeSpan.FromMilliseconds(100)
    };

    private static void AssertHeartbeat(byte[] message, string reference)
    {
        using var json = JsonDocument.Parse(message);
        Assert.Equal("phoenix", json.RootElement.GetProperty("topic").GetString());
        Assert.Equal("heartbeat", json.RootElement.GetProperty("event").GetString());
        Assert.Equal(JsonValueKind.Object, json.RootElement.GetProperty("payload").ValueKind);
        Assert.Empty(json.RootElement.GetProperty("payload").EnumerateObject());
        Assert.Equal(reference, json.RootElement.GetProperty("ref").GetString());
    }

    private static async Task WaitUntilAsync(Func<bool> condition)
    {
        for (var i = 0; i < 100 && !condition(); i++) await Task.Delay(10);
        Assert.True(condition());
    }

    private sealed class CapturingLogger : ILogger<RealtimeClient>
    {
        public List<string> Errors { get; } = [];
        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            if (logLevel >= LogLevel.Error) Errors.Add(formatter(state, exception));
        }
        private sealed class NullScope : IDisposable
        {
            public static NullScope Instance { get; } = new();
            public void Dispose() { }
        }
    }

    private sealed class FakeWebSocket(params byte[][] messages) : WebSocket
    {
        private int index;
        public override WebSocketCloseStatus? CloseStatus => null;
        public override string? CloseStatusDescription => null;
        public override WebSocketState State { get; } = WebSocketState.Open;
        public override string? SubProtocol => null;
        public override void Abort() { }
        public override Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken) => Task.CompletedTask;
        public override Task CloseOutputAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken) => Task.CompletedTask;
        public override void Dispose() { }
        public override Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken cancellationToken)
        {
            if (index == messages.Length) return Task.FromResult(new WebSocketReceiveResult(0, WebSocketMessageType.Close, true));
            var message = messages[index++];
            Buffer.BlockCopy(message, 0, buffer.Array!, buffer.Offset, message.Length);
            return Task.FromResult(new WebSocketReceiveResult(message.Length, WebSocketMessageType.Text, true));
        }
        public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken) => Task.CompletedTask;
    }

    private sealed class HeartbeatWebSocket : WebSocket
    {
        private readonly Channel<byte[]> incoming = Channel.CreateUnbounded<byte[]>();
        public ConcurrentQueue<byte[]> Sent { get; } = [];
        public override WebSocketCloseStatus? CloseStatus => null;
        public override string? CloseStatusDescription => null;
        public override WebSocketState State => WebSocketState.Open;
        public override string? SubProtocol => null;
        public override void Abort() { }
        public override Task CloseAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken) => Task.CompletedTask;
        public override Task CloseOutputAsync(WebSocketCloseStatus closeStatus, string? statusDescription, CancellationToken cancellationToken) => Task.CompletedTask;
        public override void Dispose() { }
        public void Reply(string reference) => incoming.Writer.TryWrite(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { topic = "phoenix", @event = "phx_reply", payload = new { }, @ref = reference })));
        public override async Task<WebSocketReceiveResult> ReceiveAsync(ArraySegment<byte> buffer, CancellationToken cancellationToken)
        {
            var message = await incoming.Reader.ReadAsync(cancellationToken);
            Buffer.BlockCopy(message, 0, buffer.Array!, buffer.Offset, message.Length);
            return new WebSocketReceiveResult(message.Length, WebSocketMessageType.Text, true);
        }
        public override Task SendAsync(ArraySegment<byte> buffer, WebSocketMessageType messageType, bool endOfMessage, CancellationToken cancellationToken)
        {
            Sent.Enqueue(buffer.ToArray());
            return Task.CompletedTask;
        }
    }
}

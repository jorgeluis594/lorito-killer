using System.Buffers.Binary;
using System.IO.Pipes;
using System.Text;
using System.Text.Json;

namespace Lorito.PrintGateway;

public static class PipeProtocol
{
    public const string Name = "LoritoPrintGateway.v1";
    public const int MaxMessageBytes = 8 * 1024;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public static byte[] Frame(string json)
    {
        var payload = Encoding.UTF8.GetBytes(json);
        if (payload.Length > MaxMessageBytes) throw new ArgumentOutOfRangeException(nameof(json));
        var frame = new byte[payload.Length + 4];
        BinaryPrimitives.WriteInt32LittleEndian(frame, payload.Length);
        payload.CopyTo(frame, 4);
        return frame;
    }

    public static async Task HandleAsync(Stream stream, BindingStore store, BackendClient backend, Func<Binding, Task> onLinked, CancellationToken cancellationToken)
    {
        var lengthBytes = new byte[4];
        await stream.ReadExactlyAsync(lengthBytes, cancellationToken);
        var length = BinaryPrimitives.ReadInt32LittleEndian(lengthBytes);
        if (length is < 1 or > MaxMessageBytes) throw new InvalidDataException("Invalid pipe message length");
        var payload = new byte[length];
        await stream.ReadExactlyAsync(payload, cancellationToken);
        var request = JsonSerializer.Deserialize<Request>(payload, JsonOptions) ?? throw new InvalidDataException("Invalid pipe JSON");
        if (request.Version != 1) throw new InvalidDataException("Unsupported pipe version");

        Response response;
        if (request.Operation == "GET_STATUS")
        {
            var binding = store.Read();
            response = new(true, binding is null ? null : new(binding.CompanyId, string.IsNullOrWhiteSpace(binding.CompanyName) ? "Empresa vinculada" : binding.CompanyName));
        }
        else if (request.Operation == "LINK")
        {
            if (request.Code is null || !System.Text.RegularExpressions.Regex.IsMatch(request.Code, "^[0-9]{4}$")) throw new InvalidDataException("Code must contain four digits");
            lock (store)
            {
                if (store.Read() is not null) { response = new(false, null, "Already linked"); goto Write; }
            }
            var linked = await backend.LinkAsync(request.Code, Environment.MachineName, cancellationToken);
            if (linked is null) response = new(false, null, "Code invalid or expired");
            else { store.Write(linked); await onLinked(linked); response = new(true, new(linked.CompanyId, string.IsNullOrWhiteSpace(linked.CompanyName) ? "Empresa vinculada" : linked.CompanyName)); }
        }
        else throw new InvalidDataException("Unsupported pipe operation");

    Write:
        var json = JsonSerializer.Serialize(response, JsonOptions);
        await stream.WriteAsync(Frame(json), cancellationToken);
        await stream.FlushAsync(cancellationToken);
    }

    public static async Task<string> ReadAsync(Stream stream, CancellationToken cancellationToken)
    {
        var lengthBytes = new byte[4];
        await stream.ReadExactlyAsync(lengthBytes, cancellationToken);
        var length = BinaryPrimitives.ReadInt32LittleEndian(lengthBytes);
        if (length is < 1 or > MaxMessageBytes) throw new InvalidDataException("Invalid pipe response length");
        var payload = new byte[length];
        await stream.ReadExactlyAsync(payload, cancellationToken);
        return Encoding.UTF8.GetString(payload);
    }

    private sealed record Request(int Version, string Operation, string? Code);
    private sealed record Response(bool Success, Status? Status, string? Error = null);
    private sealed record Status(string CompanyId, string CompanyName);
}

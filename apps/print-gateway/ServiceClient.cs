#if WINDOWS
using System.IO.Pipes;

namespace Kogoz.PrintGateway;

internal static class ServiceClient
{
    public static async Task<string> SendAsync(object request, int timeoutMs = 3000)
    {
        using var pipe = new NamedPipeClientStream(".", PipeProtocol.Name, PipeDirection.InOut, PipeOptions.Asynchronous);
        await pipe.ConnectAsync(timeoutMs);
        return await PipeClientExchange.SendAsync(pipe, PipeFactory.ServiceSid, request, CancellationToken.None);
    }
}
#endif

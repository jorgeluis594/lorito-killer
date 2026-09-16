#if WINDOWS
using System.Windows.Forms;
using System.IO.Pipes;
using System.Text.Json;

namespace Lorito.PrintGateway;

internal static class TrayApp
{
    public static void Run()
    {
        using var icon = new NotifyIcon { Text = "Lorito Print Gateway", Visible = true, Icon = SystemIcons.Application };
        using var menu = new ContextMenuStrip();
        var open = new ToolStripMenuItem("Abrir");
        open.Click += (_, _) => new LinkForm().ShowDialog();
        menu.Items.Add(open);
        icon.ContextMenuStrip = menu;
        Application.Run();
    }

    private sealed class LinkForm : Form
    {
        private readonly TextBox code = new() { MaxLength = 4, Width = 120 };
        private readonly Label status = new() { AutoSize = true, Text = "Consultando vínculo..." };

        public LinkForm()
        {
            Text = "Lorito Print Gateway";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            Controls.Add(status);
            status.Top = 15; status.Left = 15;
            Controls.Add(code);
            code.Top = 45; code.Left = 15;
            var link = new Button { Text = "Autenticarse", Top = 44, Left = 145, Width = 110 };
            link.Click += async (_, _) => await LinkAsync();
            Controls.Add(link);
            Shown += async (_, _) => await StatusAsync();
            FormClosing += (_, e) => { e.Cancel = true; Hide(); };
            ClientSize = new Size(280, 100);
        }

        private async Task StatusAsync()
        {
            try
            {
                var result = await SendAsync(new { version = 1, operation = "GET_STATUS" });
                using var json = JsonDocument.Parse(result);
                status.Text = json.RootElement.GetProperty("success").GetBoolean() && json.RootElement.TryGetProperty("status", out var binding) && binding.ValueKind != JsonValueKind.Null ? $"Empresa: {binding.GetProperty("companyName").GetString()}" : "Autenticarse";
            }
            catch { status.Text = "Servicio no disponible"; }
        }

        private async Task LinkAsync()
        {
            if (!System.Text.RegularExpressions.Regex.IsMatch(code.Text, "^[0-9]{4}$")) { status.Text = "El código debe tener 4 dígitos"; return; }
            try
            {
                var result = await SendAsync(new { version = 1, operation = "LINK", code = code.Text });
                using var json = JsonDocument.Parse(result);
                status.Text = json.RootElement.GetProperty("success").GetBoolean() ? "Vinculado" : json.RootElement.GetProperty("error").GetString() ?? "No se pudo vincular";
            }
            catch { status.Text = "Servicio no disponible"; }
        }

        private static async Task<string> SendAsync(object request)
        {
            using var pipe = new NamedPipeClientStream(".", PipeProtocol.Name, PipeDirection.InOut, PipeOptions.Asynchronous);
            await pipe.ConnectAsync(3000);
            await pipe.WriteAsync(PipeProtocol.Frame(JsonSerializer.Serialize(request)));
            await pipe.FlushAsync();
            return await PipeProtocol.ReadAsync(pipe, CancellationToken.None);
        }
    }
}
#endif

#if WINDOWS
using System.Windows.Forms;
using System.Text.Json;

namespace Kogoz.PrintGateway;

internal static class TrayApp
{
    public static void Run()
    {
        Application.EnableVisualStyles();
        using var icon = new NotifyIcon { Text = "Kogoz Print Gateway", Visible = true, Icon = SystemIcons.Application };
        using var menu = new ContextMenuStrip();
        var status = new ToolStripMenuItem("Consultando...") { Enabled = false };
        var login = new ToolStripMenuItem("Iniciar sesión") { Visible = false };
        var logout = new ToolStripMenuItem("Cerrar sesión") { Visible = false };
        login.Click += (_, _) => new LinkForm().ShowDialog();
        logout.Click += async (_, _) =>
        {
            if (MessageBox.Show("¿Cerrar sesión? Esta PC dejará de imprimir hasta que vuelvas a iniciar sesión.", "Kogoz Print Gateway", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
            try
            {
                using var json = JsonDocument.Parse(await ServiceClient.SendAsync(new { version = 1, operation = "UNLINK" }));
                if (!json.RootElement.GetProperty("success").GetBoolean()) throw new InvalidOperationException();
                icon.ShowBalloonTip(3000, "Kogoz Print Gateway", "Sesión cerrada", ToolTipIcon.Info);
            }
            catch { MessageBox.Show("Servicio no disponible", "Kogoz Print Gateway", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        };
        menu.Items.AddRange([status, new ToolStripSeparator(), login, logout]);
        menu.Opening += async (_, _) =>
        {
            try
            {
                var company = await CompanyAsync();
                status.Text = company is null ? "Sin sesión" : $"Empresa: {company}";
                login.Visible = company is null;
                logout.Visible = company is not null;
            }
            catch { status.Text = "Servicio no disponible"; login.Visible = true; logout.Visible = false; }
        };
        icon.ContextMenuStrip = menu;
        // NotifyIcon only opens its menu on right click; reuse the private method so left click works too.
        icon.MouseClick += (_, e) => { if (e.Button == MouseButtons.Left) typeof(NotifyIcon).GetMethod("ShowContextMenu", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)?.Invoke(icon, null); };
        Application.Run();
    }

    private static async Task<string?> CompanyAsync()
    {
        using var json = JsonDocument.Parse(await ServiceClient.SendAsync(new { version = 1, operation = "GET_STATUS" }));
        return json.RootElement.TryGetProperty("status", out var binding) && binding.ValueKind != JsonValueKind.Null ? binding.GetProperty("companyName").GetString() : null;
    }

    private sealed class LinkForm : Form
    {
        private readonly TextBox code = new() { MaxLength = 4, Width = 120 };
        private readonly Label status = new() { AutoSize = true, Text = "Consultando vínculo..." };

        public LinkForm()
        {
            Text = "Kogoz Print Gateway";
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

        private static Task<string> SendAsync(object request) => ServiceClient.SendAsync(request);
    }
}
#endif

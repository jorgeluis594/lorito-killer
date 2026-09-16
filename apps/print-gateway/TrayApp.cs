#if NET10_0_WINDOWS
using System.Windows.Forms;

namespace Lorito.PrintGateway;

internal static class TrayApp
{
    public static void Run()
    {
        using var icon = new NotifyIcon { Text = "Lorito Print Gateway", Visible = true, Icon = SystemIcons.Application };
        using var menu = new ContextMenuStrip();
        var open = new ToolStripMenuItem("Autenticarse");
        open.Click += (_, _) => MessageBox.Show("La bandeja se comunica con el servicio LoritoPrintGateway.");
        menu.Items.Add(open);
        icon.ContextMenuStrip = menu;
        Application.Run();
    }
}
#endif

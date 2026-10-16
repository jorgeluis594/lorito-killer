#if WINDOWS
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing.Printing;
using System.Security.Principal;
using System.ServiceProcess;
using System.Text.Json;
using System.Windows.Forms;
using Microsoft.Win32;

namespace Kogoz.PrintGateway;

internal static class Installer
{
    private const string ServiceName = "KogozPrintGateway";
    // Pre-rebrand install; removed on install so two services don't claim the same jobs.
    private const string LegacyName = "LoritoPrintGateway";
    private const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\KogozPrintGateway";
    private static readonly string InstallDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Kogoz", "PrintGateway");
    private static readonly string InstalledExe = Path.Combine(InstallDir, "Kogoz.PrintGateway.exe");
    private static readonly string DataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Kogoz", "PrintGateway");
    private static readonly string ShortcutPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonStartup), "Kogoz Print Gateway.lnk");

    public static void Run(string[] args)
    {
        if (!EnsureAdministrator(args)) return;
        Application.EnableVisualStyles();
        Application.Run(new InstallForm());
    }

    public static void Uninstall(string[] args)
    {
        if (!EnsureAdministrator(args)) return;
        if (MessageBox.Show("¿Desinstalar Kogoz Print Gateway? Se conservará el vínculo con la empresa.", "Kogoz Print Gateway", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return;
        // Killing the service host first looks like a crash to SCM, which restarts it per the failure actions set on install.
        try { StopAndDeleteService(); }
        catch (Exception error) { MessageBox.Show($"No se pudo desinstalar el servicio: {error.Message}", "Kogoz Print Gateway", MessageBoxButtons.OK, MessageBoxIcon.Error); return; }
        foreach (var process in Process.GetProcessesByName("Kogoz.PrintGateway").Where(p => p.Id != Environment.ProcessId)) { try { process.Kill(); process.WaitForExit(5000); } catch { } }
        try { File.Delete(ShortcutPath); } catch { }
        try { Registry.LocalMachine.DeleteSubKeyTree(UninstallKey, false); } catch { }
        MessageBox.Show("Kogoz Print Gateway se desinstaló.", "Kogoz Print Gateway");
        // The running exe can't delete itself; a detached shell removes the folder once we exit. Retry: the exe stays locked for a moment after we go.
        Process.Start(new ProcessStartInfo("cmd.exe", $"/c for /l %i in (1,1,10) do (ping 127.0.0.1 -n 3 >nul & rmdir /s /q \"{InstallDir}\" 2>nul & if not exist \"{InstallDir}\" exit)") { CreateNoWindow = true, UseShellExecute = false });
    }

    private static bool EnsureAdministrator(string[] args)
    {
        using var identity = WindowsIdentity.GetCurrent();
        if (new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator)) return true;
        try
        {
            Process.Start(new ProcessStartInfo(Environment.ProcessPath!, string.Join(" ", args)) { UseShellExecute = true, Verb = "runas" });
        }
        catch (Win32Exception) { MessageBox.Show("Se necesitan permisos de administrador para instalar.", "Kogoz Print Gateway", MessageBoxButtons.OK, MessageBoxIcon.Warning); }
        return false;
    }

    private static void StopAndDeleteService(string name = ServiceName)
    {
        try
        {
            using var service = new ServiceController(name);
            if (service.Status != ServiceControllerStatus.Stopped) { service.Stop(); service.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(20)); }
        }
        catch (InvalidOperationException) { return; } // service does not exist
        RunTool("sc.exe", "delete", name);
    }

    private static void RunTool(string file, params string[] arguments)
    {
        var info = new ProcessStartInfo(file) { CreateNoWindow = true, UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true };
        foreach (var argument in arguments) info.ArgumentList.Add(argument);
        using var process = Process.Start(info)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        process.WaitForExit();
        var output = stdout.Result + stderr.Result;
        if (process.ExitCode != 0) throw new InvalidOperationException($"{file} {arguments[0]} falló: {output.Trim()}");
    }

    private static void GrantDataAccess(string path) =>
        RunTool("icacls.exe", path, "/inheritance:r", "/grant:r", "*S-1-5-18:(OI)(CI)F", "*S-1-5-32-544:(OI)(CI)F", $"NT SERVICE\\{ServiceName}:(OI)(CI)M");

    private static void CreateShortcut()
    {
        dynamic shell = Activator.CreateInstance(Type.GetTypeFromProgID("WScript.Shell")!)!;
        var shortcut = shell.CreateShortcut(ShortcutPath);
        shortcut.TargetPath = InstalledExe;
        shortcut.Arguments = "--tray";
        shortcut.WorkingDirectory = InstallDir;
        shortcut.Save();
    }

    private static void RegisterUninstall()
    {
        using var key = Registry.LocalMachine.CreateSubKey(UninstallKey);
        key.SetValue("DisplayName", "Kogoz Print Gateway");
        key.SetValue("Publisher", "Kogoz");
        key.SetValue("InstallLocation", InstallDir);
        key.SetValue("UninstallString", $"\"{InstalledExe}\" --uninstall");
        key.SetValue("NoModify", 1);
        key.SetValue("NoRepair", 1);
    }

    private static void RemoveLegacyInstall()
    {
        StopAndDeleteService(LegacyName);
        foreach (var process in Process.GetProcessesByName("Lorito.PrintGateway")) { try { process.Kill(); process.WaitForExit(5000); } catch { } }
        try { File.Delete(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonStartup), "Lorito Print Gateway.lnk")); } catch { }
        try { Registry.LocalMachine.DeleteSubKeyTree($@"Software\Microsoft\Windows\CurrentVersion\Uninstall\{LegacyName}", false); } catch { }
        try { Directory.Delete(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Lorito"), true); } catch { }
    }

    private static void Install(IReadOnlyList<string> printers)
    {
        RemoveLegacyInstall();
        StopAndDeleteService();
        foreach (var process in Process.GetProcessesByName("Kogoz.PrintGateway").Where(p => p.Id != Environment.ProcessId)) { try { process.Kill(); process.WaitForExit(5000); } catch { } }
        Directory.CreateDirectory(InstallDir);
        if (!string.Equals(Path.GetFullPath(Environment.ProcessPath!), InstalledExe, StringComparison.OrdinalIgnoreCase)) File.Copy(Environment.ProcessPath!, InstalledExe, true);
        Directory.CreateDirectory(DataDir);
        Directory.CreateDirectory(Path.Combine(DataDir, "jobs"));

        RunTool("sc.exe", "create", ServiceName, "binPath=", $"\"{InstalledExe}\" --service", "start=", "auto", "obj=", $"NT SERVICE\\{ServiceName}", "DisplayName=", ServiceName);
        RunTool("sc.exe", "sidtype", ServiceName, "unrestricted");
        RunTool("sc.exe", "failure", ServiceName, "reset=", "86400", "actions=", "restart/5000/restart/5000/restart/5000");
        GrantDataAccess(DataDir);
        GrantDataAccess(Path.Combine(DataDir, "jobs"));

        if (printers.Count > 0)
            RunTool("powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", PrinterPermissionScript.Encode(PrinterPermissionScript.Build(ServiceName, printers)));

        using (var service = new ServiceController(ServiceName)) { service.Start(); service.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(30)); }
        RegisterUninstall();
        CreateShortcut();
        // Opening the .lnk through explorer starts the tray as the signed-in user instead of elevated.
        Process.Start(new ProcessStartInfo("explorer.exe", $"\"{ShortcutPath}\"") { UseShellExecute = false });
    }

    private static async Task<string?> LinkAsync(string code)
    {
        Exception? last = null;
        for (var attempt = 0; attempt < 20; attempt++)
        {
            try
            {
                using var json = JsonDocument.Parse(await ServiceClient.SendAsync(new { version = 1, operation = "LINK", code }));
                var root = json.RootElement;
                if (root.GetProperty("success").GetBoolean()) return null;
                return root.TryGetProperty("error", out var error) && error.GetString() == "Already linked" ? null : "El código es inválido o venció. Genera uno nuevo y vincula desde la bandeja.";
            }
            catch (Exception exception) { last = exception; await Task.Delay(1000); }
        }
        return $"El servicio no respondió ({last?.Message}). Vincula desde la bandeja.";
    }

    private static async Task<bool> IsLinkedAsync()
    {
        try
        {
            using var json = JsonDocument.Parse(await ServiceClient.SendAsync(new { version = 1, operation = "GET_STATUS" }));
            return json.RootElement.GetProperty("success").GetBoolean() && json.RootElement.TryGetProperty("status", out var s) && s.ValueKind != JsonValueKind.Null;
        }
        catch { return false; }
    }

    private sealed class InstallForm : Form
    {
        private readonly CheckedListBox printerList = new() { Left = 15, Top = 40, Width = 350, Height = 120, CheckOnClick = true };
        private readonly TextBox code = new() { Left = 15, Top = 190, Width = 120, MaxLength = 4 };
        private readonly Button install = new() { Text = "Instalar", Left = 255, Top = 188, Width = 110 };
        private readonly Label status = new() { Left = 15, Top = 225, Width = 350, Height = 50 };

        public InstallForm()
        {
            Text = "Instalar Kogoz Print Gateway";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            ClientSize = new Size(380, 285);
            Controls.Add(new Label { Text = "Impresoras que usará Kogoz:", Left = 15, Top = 15, Width = 350 });
            Controls.Add(printerList);
            Controls.Add(new Label { Text = "Código de 4 dígitos (generado en la web):", Left = 15, Top = 167, Width = 350 });
            Controls.Add(code);
            Controls.Add(install);
            Controls.Add(status);
            foreach (var name in PrinterSettings.InstalledPrinters.Cast<string>().Distinct(StringComparer.OrdinalIgnoreCase)) printerList.Items.Add(name, true);
            install.Click += async (_, _) => await InstallAsync();
        }

        private async Task InstallAsync()
        {
            if (code.Text.Length > 0 && !System.Text.RegularExpressions.Regex.IsMatch(code.Text, "^[0-9]{4}$")) { status.Text = "El código debe tener 4 dígitos."; return; }
            if (!new GatewayConfiguration().IsValid(out var configError)) { status.Text = $"Configuración inválida: {configError}"; return; }
            install.Enabled = false; code.Enabled = false; printerList.Enabled = false;
            status.Text = "Instalando...";
            var printers = printerList.CheckedItems.Cast<string>().ToArray();
            try
            {
                await Task.Run(() => Install(printers));
                var message = "Instalado. Kogoz Print Gateway ya se ejecuta en segundo plano.";
                if (code.Text.Length == 4)
                {
                    status.Text = "Vinculando...";
                    var linkError = await LinkAsync(code.Text);
                    message = linkError ?? "Instalado y vinculado. Ya puedes imprimir desde Kogoz.";
                }
                else if (!await IsLinkedAsync()) message += " Falta vincular: abre el icono de la bandeja e ingresa el código.";
                MessageBox.Show(message, "Kogoz Print Gateway");
                Close();
            }
            catch (Exception exception)
            {
                status.Text = $"No se pudo instalar: {exception.Message}";
                install.Enabled = true; code.Enabled = true; printerList.Enabled = true;
            }
        }
    }
}
#endif

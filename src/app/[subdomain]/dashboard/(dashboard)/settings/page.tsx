import { Separator } from "@/shared/components/ui/separator";
import UserForm from "@/user/components/user-form";
import ChangePasswordForm from "@/user/components/change-password-form";

export default function SettingsPage() {
  return (
    <div>
      <h3 className="text-lg font-medium">Perfil</h3>
      <p className="text-sm text-muted-foreground">
        Edita tus datos y cambia de contraseña
      </p>
      <Separator className="my-4" />
      <UserForm />
      <Separator className="mt-6 mb-4" />
      <ChangePasswordForm />
    </div>
  );
}

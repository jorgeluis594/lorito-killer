import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  initialTakeAwayFormState,
  TakeAwayForm,
  type TakeAwayFormState,
} from "./take-away-sheet";

function Frame({
  mode = "create",
  state,
}: {
  mode?: "create" | "edit";
  state: TakeAwayFormState;
}) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-xl border bg-card">
      <div className="px-5 pb-2 pt-5">
        <h2 className="text-lg font-semibold">
          {mode === "edit" ? "Nombre del cliente" : "Nuevo pedido para llevar"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === "edit"
            ? "Se actualiza en Mesas. Las comandas ya impresas no cambian: usa Reimprimir si cocina necesita el nombre nuevo."
            : "¿A nombre de quién? Así se ve en la tarjeta y en la comanda."}
        </p>
      </div>
      <TakeAwayForm
        mode={mode}
        state={state}
        onNameChange={() => {}}
        onPaste={() => {}}
        onSubmit={(event) => event.preventDefault()}
      />
    </div>
  );
}

const meta = {
  title: "Delivery/TakeAwayForm",
  component: Frame,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Frame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vacio: Story = {
  args: { state: initialTakeAwayFormState(null) },
};

export const ConNombre: Story = {
  args: {
    state: { ...initialTakeAwayFormState(null), name: "Rosa" },
  },
};

export const Edicion: Story = {
  args: { mode: "edit", state: initialTakeAwayFormState("Rosa") },
};

export const Recortado: Story = {
  args: {
    state: {
      ...initialTakeAwayFormState(null),
      name: "a".repeat(120),
      truncated: true,
    },
  },
};

export const ErrorDelServidor: Story = {
  args: {
    state: {
      ...initialTakeAwayFormState(null),
      name: "a".repeat(121),
      fieldError: "El nombre puede tener hasta 120 caracteres.",
    },
  },
};

export const ConflictoDeNombre: Story = {
  args: {
    mode: "edit",
    state: {
      ...initialTakeAwayFormState("Rosa"),
      name: "Rosa M.",
      expectedName: "Rosita",
      message:
        "Otro dispositivo cambió el nombre a Rosita. Revisa y vuelve a guardar.",
    },
  },
};

export const SinRespuesta: Story = {
  args: {
    state: {
      ...initialTakeAwayFormState(null),
      name: "Rosa",
      uncertain: true,
      message:
        "No se recibió la respuesta. Vuelve a tocar Continuar al pedido: si el pedido ya se creó, se abre ese mismo.",
    },
  },
};

export const Espera: Story = {
  args: {
    state: { ...initialTakeAwayFormState(null), name: "Rosa", busy: true },
  },
};

export const PedidoCerrado: Story = {
  args: {
    mode: "edit",
    state: {
      ...initialTakeAwayFormState("Rosa"),
      unavailable: true,
      message: "Este pedido ya se cerró.",
    },
  },
};

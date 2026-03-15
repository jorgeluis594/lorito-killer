"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Input } from "@/shared/components/ui/input";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  Receipt,
  X,
  UserRoundPlus,
  Ban,
  ArrowRightLeft,
  Search,
  ShoppingCart,
  Loader2,
  Minus,
  Plus,
  Eye,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useToast } from "@/shared/components/ui/use-toast";
import type { TableWithSession } from "../types";
import { getTableDerivedStatus } from "../types";
import { TableStatusBadge } from "./table-status-badge";
import {
  closeTable,
  requestBillAction,
  addRoundAction,
  transferTableAction,
} from "../actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { getMany } from "@/product/api_repository";
import type { Product } from "@/product/types";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { differenceInMinutes } from "date-fns";

type CartItem = {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
};

interface TableActionsMenuProps {
  table: TableWithSession;
  waiters: Array<{ id: string; name: string | null }>;
  open: boolean;
  onClose: () => void;
  onAction: () => void;
}

export function TableActionsMenu({
  table,
  waiters,
  open,
  onClose,
  onAction,
}: TableActionsMenuProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transferWaiterId, setTransferWaiterId] = useState<string>("");
  const [showTransfer, setShowTransfer] = useState(false);
  const status = getTableDerivedStatus(table);
  const session = table.activeSession;

  // Product search state
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sendingRound, setSendingRound] = useState(false);

  // View existing order toggle (for BILL_REQUESTED)
  const [showOrder, setShowOrder] = useState(false);

  const hasOrderItems = (session?.currentRound ?? 0) > 0;
  const elapsedMinutes = session
    ? differenceInMinutes(new Date(), new Date(session.openedAt))
    : 0;

  // Debounced product search
  useEffect(() => {
    if (status !== "OCCUPIED") return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setProducts([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await getMany({ q: searchQuery, limit: 20 });
        if (result.success) {
          setProducts(result.data);
        }
      } catch {
        // Silently fail search
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, status]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setProducts([]);
      setCart([]);
      setShowTransfer(false);
      setTransferWaiterId("");
      setShowOrder(false);
    }
  }, [open]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id!);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id!
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id!,
          productName: product.name,
          productPrice: product.price,
          quantity: 1,
        },
      ];
    });
  }, []);

  const updateCartQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getCartQuantity = useCallback(
    (productId: string) => {
      const item = cart.find((c) => c.productId === productId);
      return item?.quantity || 0;
    },
    [cart]
  );

  const handleSendRound = async () => {
    if (cart.length === 0) return;
    setSendingRound(true);
    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        productPrice: item.productPrice,
      }));
      const result = await addRoundAction(table.id, items);
      if (result.success) {
        toast({
          title: `Ronda ${result.data.round} enviada`,
          description: `${cartCount} items agregados`,
          duration: 2000,
        });
        setCart([]);
        setSearchQuery("");
        setProducts([]);
        onAction();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo enviar la ronda", variant: "destructive", duration: 5000 });
    } finally {
      setSendingRound(false);
    }
  };

  const handleRequestBill = async () => {
    setLoading(true);
    const result = await requestBillAction(table.id);
    setLoading(false);
    if (result.success) {
      toast({ title: "Cuenta solicitada", duration: 2000 });
      onAction();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
    }
  };

  const handleClose = async (cancelled: boolean) => {
    setLoading(true);
    const result = await closeTable(table.id, cancelled);
    setLoading(false);
    if (result.success) {
      toast({ title: cancelled ? "Sesion cancelada" : "Mesa cerrada", duration: 2000 });
      onAction();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
    }
  };

  const handleTransfer = async () => {
    if (!transferWaiterId) return;
    setLoading(true);
    const result = await transferTableAction(table.id, transferWaiterId);
    setLoading(false);
    if (result.success) {
      toast({ title: "Mesa transferida", duration: 2000 });
      onAction();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive", duration: 5000 });
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setShowTransfer(false);
      setTransferWaiterId("");
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl max-h-[85vh] flex flex-col"
      >
        {/* Drag handle */}
        <div className="mx-auto mt-2 mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/20 shrink-0" />

        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-3">
            Mesa {table.label || table.number}
            <TableStatusBadge status={status} />
            {session && elapsedMinutes > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {elapsedMinutes} min
              </span>
            )}
            {session && session.currentRound > 0 && (
              <span className="text-xs font-medium bg-muted rounded-full px-2 py-0.5">
                R{session.currentRound}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Session info */}
        {session && (
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground shrink-0">
            {session.waiter?.name && (
              <span>Mozo: <span className="font-medium text-foreground">{session.waiter.name}</span></span>
            )}
            {session.guestCount && (
              <span>Comensales: {session.guestCount}</span>
            )}
          </div>
        )}

        {/* ===== OCCUPIED TABLE: Mini-POS ===== */}
        {status === "OCCUPIED" && (
          <div className="flex flex-col flex-1 min-h-0 mt-3 gap-3">
            {/* Search input */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                inputMode="search"
                className="pl-9"
              />
              {searchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Scrollable content area */}
            <ScrollArea className="flex-1 min-h-0">
              {searchQuery.trim() ? (
                /* Product search results */
                products.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 pr-3">
                    {products.map((product) => {
                      const qty = getCartQuantity(product.id!);
                      return (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className={cn(
                            "relative flex flex-col items-center justify-center rounded-lg border p-2.5 text-center transition-all active:scale-95 min-h-[80px]",
                            qty > 0
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-accent",
                          )}
                        >
                          {qty > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                              {qty}
                            </span>
                          )}
                          <span className="text-xs font-medium leading-tight line-clamp-2">
                            {product.name}
                          </span>
                          <span className="mt-1 text-xs text-muted-foreground">
                            {formatPrice(product.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : !searchLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    No se encontraron productos
                  </div>
                ) : null
              ) : (
                /* Default view: cart summary or session info */
                <div className="space-y-3 pr-3">
                  {cart.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Ronda actual</p>
                      {cart.map((item) => (
                        <div
                          key={item.productId}
                          className="flex items-center justify-between rounded-lg border p-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(item.productPrice)} c/u
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            <button
                              onClick={() => updateCartQuantity(item.productId, -1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-accent"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(item.productId, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md border hover:bg-accent"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="ml-2 text-sm font-medium w-16 text-right tabular-nums">
                            {formatPrice(item.productPrice * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : hasOrderItems ? (
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        {session!.currentRound} {session!.currentRound === 1 ? "ronda enviada" : "rondas enviadas"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Busca un producto para agregar a la siguiente ronda
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Busca un producto para empezar la primera ronda
                      </p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Sticky cart bar */}
            {cart.length > 0 && (
              <div className="shrink-0 border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="font-medium">{cartCount} items</span>
                    <span className="text-muted-foreground">&middot;</span>
                    <span className="font-bold">{formatPrice(cartTotal)}</span>
                  </div>
                </div>
                <Button
                  className="w-full gap-2 min-h-[44px]"
                  onClick={handleSendRound}
                  disabled={sendingRound}
                >
                  {sendingRound ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="h-4 w-4" />
                  )}
                  Enviar ronda
                </Button>
              </div>
            )}

            {/* Secondary actions row */}
            <div className="shrink-0 space-y-2">
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 min-h-[44px]"
                  variant="outline"
                  onClick={handleRequestBill}
                  disabled={loading || !hasOrderItems}
                  title={!hasOrderItems ? "Agrega productos antes de pedir la cuenta" : ""}
                >
                  <Receipt className="h-4 w-4" />
                  Pedir cuenta
                </Button>
                <Button
                  className="gap-2 min-h-[44px]"
                  variant="outline"
                  onClick={() => setShowTransfer(!showTransfer)}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Transferir
                </Button>
              </div>

              {/* Transfer dropdown - progressive disclosure */}
              {showTransfer && (
                <div className="flex gap-2">
                  <Select value={transferWaiterId} onValueChange={setTransferWaiterId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar mozo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {waiters
                        .filter((w) => w.id !== session?.waiterId)
                        .map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name || w.id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    onClick={handleTransfer}
                    disabled={!transferWaiterId || loading}
                  >
                    <UserRoundPlus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Destructive action */}
              <Separator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full gap-2 min-h-[44px] text-destructive"
                    variant="ghost"
                    disabled={loading}
                  >
                    <Ban className="h-4 w-4" />
                    Cancelar sesion
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar sesion</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta accion cancelara la sesion de la mesa {table.label || table.number}. Esta accion no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleClose(true)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancelar sesion
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}

        {/* ===== BILL_REQUESTED TABLE ===== */}
        {status === "BILL_REQUESTED" && (
          <div className="mt-4 space-y-3">
            {/* Session summary */}
            {session && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                {session.waiter?.name && (
                  <p><span className="font-medium">Mozo:</span> {session.waiter.name}</p>
                )}
                {session.currentRound > 0 && (
                  <p><span className="font-medium">Rondas:</span> {session.currentRound}</p>
                )}
                {session.notes && (
                  <p><span className="font-medium">Notas:</span> {session.notes}</p>
                )}
              </div>
            )}

            {/* Primary action */}
            <Button
              className="w-full gap-2 min-h-[48px]"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Cerrar mesa
            </Button>

            {/* View order toggle */}
            <Button
              className="w-full gap-2 min-h-[44px]"
              variant="outline"
              onClick={() => setShowOrder(!showOrder)}
            >
              <Eye className="h-4 w-4" />
              {showOrder ? "Ocultar pedido" : "Ver pedido"}
            </Button>

            {showOrder && session && hasOrderItems && (
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {session.currentRound} {session.currentRound === 1 ? "ronda" : "rondas"} enviadas
                </p>
                {session.notes && (
                  <p className="text-muted-foreground">Notas: {session.notes}</p>
                )}
              </div>
            )}

            {/* Destructive action */}
            <Separator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full gap-2 min-h-[44px] text-destructive"
                  variant="ghost"
                  disabled={loading}
                >
                  <Ban className="h-4 w-4" />
                  Cancelar sesion
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar sesion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta accion cancelara la sesion de la mesa {table.label || table.number}. Esta accion no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleClose(true)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancelar sesion
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

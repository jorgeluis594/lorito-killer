import { Button } from "@/components/ui/button";
import { DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Plus } from "lucide-react";
import { ProductForm } from "@/components/forms/product-form/product-form";


export default function ProductoModalForm() {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="text-xs md:text-sm"><Plus className="mr-2 h-4 w-4" /> Agregar producto</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[450px] w-full flex flex-col justify-center items-center">
          <ProductForm/>
        </DialogContent>
      </Dialog>
    )
}

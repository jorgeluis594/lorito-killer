
import ListCategories from "./category";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Plus } from "lucide-react";

export default function CategoryModal() {
  
  return (
    <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="text-xs md:text-sm"><Plus className="mr-2 h-4 w-4" />Mostrar Categorías</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[350px] sm:h-[350px] w-full flex flex-col justify-center items-center p-0">
          <ListCategories/>
        </DialogContent>
      </Dialog>
  )
}
  

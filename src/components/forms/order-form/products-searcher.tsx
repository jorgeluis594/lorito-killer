import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function ProductsSearcher() {
  return (
    <div className="h-100 w-100 p-5">
      <div className="flex w-100 items-center space-x-2">
        <Button type="submit">
          <Search className="h-4 w-5" />
        </Button>
        <Input placeholder="Nombre del producto" />
      </div>
    </div>
  );
}

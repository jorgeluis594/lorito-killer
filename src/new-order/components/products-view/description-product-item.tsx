
import { Info } from "lucide-react";
import {Product} from "@/product/types";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/shared/components/ui/tooltip";

interface DescriptionProductProps {
  description: string;
}

export function DescriptionProduct({ description }: DescriptionProductProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info />
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex justify-between space-x-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Descripción</h4>
              <p className="text-sm">
                {description}
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
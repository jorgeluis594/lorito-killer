"use client";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/shared/components/ui/select";
import DateFilterDashboard from "@/sales-dashboard/components/filter/date-filter";
import {useState} from "react";

export default function DateFilterSelect() {

  const [period, setPeriod] = useState<string>("")

  const handleSelectChange = (value: string) => {
    setPeriod(value);
  };

  return (
    <div className="flex flex-row gap-4">
      <div>
        <Select onValueChange={handleSelectChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccione periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Diario</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensual</SelectItem>
            <SelectItem value="annual">Anual</SelectItem>
            <SelectItem value="personalized">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <DateFilterDashboard period={period}/>
      </div>
    </div>
  );
}
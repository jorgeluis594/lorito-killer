export type PrintClientIdentity = {
  id: string;
  companyId: string;
};

export type LinkedPrintClient = PrintClientIdentity & {
  credential: string;
};

export type PrinterInventory = {
  version: 1;
  printers: { localName: string }[];
};

export type PrinterProfile = {
  id: string;
  status: "ACTIVE" | "INACTIVE";
  paperWidth: "MM58" | "MM80";
  columns: number;
  codepageMapping: "epson";
  cutEnabled: boolean;
  feedBeforeCut: number;
};

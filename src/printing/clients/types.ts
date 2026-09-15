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

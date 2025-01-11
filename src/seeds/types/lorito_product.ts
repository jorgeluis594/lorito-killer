interface Warehouse {
  warehouse_description: string;
  stock: string;
}

interface ItemUnitType {
  id: number;
  description: string;
  item_id: number;
  unit_type_id: string;
  quantity_unit: string;
  price1: string;
  price2: string;
  price3: string;
  price_default: number;
  stock: string;
  internal_id: string;
  unit_type: {
    id: string;
    active: number;
    symbol: string | null;
    description: string;
  };
}

export interface Product {
  id: number;
  unit_type_id: string;
  description: string;
  name: string | null;
  second_name: string | null;
  model: string | null;
  barcode: string;
  warehouse_id: string | null;
  internal_id: string | null;
  item_code: string | null;
  item_code_gs1: string | null;
  stock: string;
  stock_min: string;
  currency_type_id: string;
  currency_type_symbol: string;
  sale_affectation_igv_type_id: string;
  amount_sale_unit_price: string;
  calculate_quantity: boolean;
  has_igv: boolean;
  active: boolean;
  has_igv_description: string;
  purchase_has_igv_description: string;
  sale_unit_price: string;
  purchase_unit_price: string;
  purchase: string;
  created_at: string;
  updated_at: string;
  warehouses: Warehouse[];
  apply_store: boolean;
  image_url: string;
  image_url_medium: string;
  image_url_small: string;
  tags: any[];
  tags_id: any[];
  item_unit_types: ItemUnitType[];
  technical_specifications: string | null;
  item_type_id: string;
  item_code_gsl: string | null;
  has_isc: boolean;
  system_isc_type_id: string | null;
  percentage_isc: string;
  suggested_price: string;
  percentage_of_profit: string;
  purchase_affectation_igv_type_id: string;
  purchase_has_igv: boolean;
  has_perception: boolean;
  lots_enabled: boolean;
  percentage_perception: string;
  image: string;
  account_id: string | null;
  category_id?: number | null;
  brand_id: number;
  date_of_due: string;
  has_plastic_bag_taxes: boolean;
  is_favorite: boolean;
  commission_amount: string | null;
  lot_code: string | null;
  line: string | null;
  show_sale: boolean;
  show_purchase: boolean;
  lots: any[];
  commission_type: string;
  attributes: any[];
  series_enabled: boolean;
  individual_items: any[];
  insumo_items: any[];
  complement_items: any[];
  web_platform_id: string | null;
  printer: string | null;
  sanitary: string | null;
  cod_digemid: string | null;
  item_config_prices: any[];
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

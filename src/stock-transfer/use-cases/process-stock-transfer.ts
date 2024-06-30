import { response } from "@/lib/types";
import { StockTransfer } from "@/stock-transfer/types";
import { Product, SingleProductType } from "@/product/types";
import { plus } from "@/lib/utils";

type FindProduct = (productId: string) => Promise<response<Product>>;

interface Repository {
  findProduct: FindProduct;
  updateStock: (stockTransfer: StockTransfer) => Promise<response<undefined>>;
  createStockTransfer: (
    stockTransfer: StockTransfer,
  ) => Promise<response<StockTransfer>>;
}

/**
 * This function processes a stock transfer.
 *
 * @async
 * @function processStockTransfer
 * @param {Object} params - An object containing the repository and stockTransfer.
 * @param {Repository} params.repository - The repository object that contains the methods to interact with the database.
 * @param {StockTransfer} params.stockTransfer - The stockTransfer object that contains the details of the stock transfer.
 * @returns {Promise<response<boolean>>} - Returns a promise that resolves to a response object. The response object contains a success property that indicates whether the operation was successful or not. If successful, the data property will be true.
 *
 * @throws {Error} - Throws an error if the stock transfer is invalid (i.e., the value is negative and the stock transfer fails validation).
 *
 * The function works as follows:
 * 1. It first checks if the stock transfer is valid. If the stock transfer value is negative and the stock transfer fails validation, it returns a response object with success set to false and a message indicating an invalid stock transfer.
 * 2. It then concurrently creates a stock transfer record and updates the stock using the repository methods. The results of these operations are stored in createResponse and updateStockResponse respectively.
 * 3. If the creation of the stock transfer record fails, it returns the createResponse.
 * 4. If the update of the stock fails, it returns the updateStockResponse.
 * 5. If both operations are successful, it returns a response object with success set to true and data set to true.
 */
export const processStockTransfer = async ({
  repository,
  stockTransfer,
}: {
  repository: Repository;
  stockTransfer: StockTransfer;
}): Promise<response<boolean>> => {
  if (
    stockTransfer.value < 0 &&
    !(await validateStockTransfer(repository.findProduct, stockTransfer))
  ) {
    return { success: false, message: "Invalid stock transfer" };
  }

  const [createResponse, updateStockResponse] = await Promise.all([
    repository.createStockTransfer(stockTransfer),
    repository.updateStock(stockTransfer),
  ]);

  if (!createResponse.success) {
    return createResponse;
  }

  if (!updateStockResponse.success) {
    return updateStockResponse;
  }

  return { success: true, data: true };
};

/**
 * This function validates a stock transfer.
 *
 * @async
 * @function validateStockTransfer
 * @param {FindProduct} findProduct - A function that takes a product ID and returns a promise that resolves to a response object. The response object contains a success property that indicates whether the operation was successful or not. If successful, the data property will contain the product details.
 * @param {StockTransfer} stockTransfer - The stockTransfer object that contains the details of the stock transfer.
 * @returns {Promise<response<boolean>>} - Returns a promise that resolves to a response object. The response object contains a success property that indicates whether the operation was successful or not. If successful, the data property will be true.
 *
 * @throws {Error} - Throws an error if the product type is not SingleProductType.
 *
 * The function works as follows:
 * 1. It first finds the product using the findProduct function. If the product is not found, it returns the productFoundResponse.
 * 2. It then checks if the product type is SingleProductType. If not, it throws an error.
 * 3. It then checks if the stock of the product is enough for the stock transfer. If not, it returns a response object with success set to false and a message indicating not enough stock.
 * 4. If all checks pass, it returns a response object with success set to true and data set to true.
 */
export const validateStockTransfer = async (
  findProduct: FindProduct,
  stockTransfer: StockTransfer,
): Promise<response<boolean>> => {
  const productFoundResponse = await findProduct(stockTransfer.productId);
  if (!productFoundResponse.success) {
    return productFoundResponse;
  }

  const product = productFoundResponse.data;
  if (product.type != SingleProductType) {
    throw new Error("Only single products are supported");
  }

  if (plus(product.stock)(stockTransfer.value) < 0) {
    return { success: false, message: "Not enough stock" };
  }

  return { success: true, data: true };
};

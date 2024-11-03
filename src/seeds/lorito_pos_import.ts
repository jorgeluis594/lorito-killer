import puppeteer from "puppeteer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  let page: any;
  const login = async (email: string, password: string) => {
    await page.goto("https://ladoce.loritosoft.online/login");
    await page.type("input[name='email']", email);
    await page.type("input[name='password']", password);
    await page.click("button[type='submit'].btn.btn-success.col-sm-12.btn-lg");
  };

  const sendRequest = async (url: string): Promise<any> => {
    console.log(`From sendRequest", fetching ${url}`);
    return await page.evaluate(async (url: string) => {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
        },
      });
      return await response.json();
    }, url);
  };

  const getCategories = async () => {
    const response = await sendRequest(
      "https://ladoce.loritosoft.online/categories/records?column=name&customer_id=1&page=1&value",
    );

    const lastPage = parseInt(response.meta.last_page);
    const data: any[] = [...response.data];
    for (let i = 1; i <= lastPage; i++) {
      const response = await sendRequest(
        `https://ladoce.loritosoft.online/categories/records?column=name&customer_id=1&page=${i}&value`,
      );

      if (Array.isArray(response.data)) {
        data.push(...response.data);
      } else {
        console.log("response.data is not an array", { response });
      }
      await sleep(1000);
    }
    return data;
  };

  const getProperty = async (id: string) => {
    const response = await sendRequest(
      `https://ladoce.loritosoft.online/items/record/${id}`,
    );

    return response.data;
  };

  const getProducts = async () => {
    const response = await sendRequest(
      "https://ladoce.loritosoft.online/items/records?column=description&customer_id&page=1&value",
    );

    const lastPage = parseInt(response.meta.last_page);
    const data: any[] = [];
    for (const item of response.data) {
      const product = await getProperty(item.id);
      await sleep(500);
      data.push({ ...item, ...product });
    }
    for (let i = 1; i <= lastPage; i++) {
      const response = await sendRequest(
        `https://ladoce.loritosoft.online/items/records?column=description&customer_id&page=${i}&value`,
      );

      for (const item of response.data) {
        const product = await getProperty(item.id);
        await sleep(500);
        data.push({ ...item, ...product });
      }
      await sleep(500);
    }

    return data;
  };

  const browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();

  await login(
    process.env.LADOCE_EMAIL || "admin@ladoce.com",
    process.env.LADOCE_PASSWORD || "ladoce147",
  );

  const categories = await getCategories();
  const products = await getProducts();
  await browser.close();
  // write data to a file as json
  const fs = require("fs");
  fs.writeFileSync("categories.json", JSON.stringify(categories, null, 2));
  fs.writeFileSync("products.json", JSON.stringify(products, null, 2));
  console.log("**Done**");
})();

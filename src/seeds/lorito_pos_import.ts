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
    console.log("From sendRequest");
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

  const browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();

  await login(
    process.env.LADOCE_EMAIL || "admin@ladoce.com",
    process.env.LADOCE_PASSWORD || "ladoce147",
  );

  const response = await sendRequest(
    "https://ladoce.loritosoft.online/items/records?column=description&customer_id&page=1&value",
  );

  const lastPage = parseInt(response.meta.last_page);
  const data: any[] = [...response.data];
  for (let i = 1; i <= lastPage; i++) {
    const response = await sendRequest(
      `https://ladoce.loritosoft.online/items/records?column=description&customer_id&page=${i}&value`,
    );

    data.push(...response.data);
    await sleep(1000);
  }
  await browser.close();
  // write data to a file as json
  const fs = require("fs");
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
  console.log("Listo buey");
})();

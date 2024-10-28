import express from "express";
import { config } from "dotenv";
import cors from "cors";
const app = express();
const port = 3000;

config({
  path: [".env.local", ".env"],
});

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/get-invoice", async (req, res) => {
  const { id, type } = req.query;
  const IS_PRODUCTION = process.env.PRODUCTION;
  if (id && id.length > 0) {
    const URL =
      "https://invogennn.netlify.app/create/preview/671e5b28000f028b9e88";
    const outputType = type ?? "json";
    if (IS_PRODUCTION === "false") {
      const playwright = import("playwright");
      try {
        const browser = await (
          await playwright
        ).chromium.launch({
          headless: true,
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(URL, { waitUntil: "networkidle" });
        const pdf = await page.pdf({
          format: "a4",
          printBackground: false,
        });

        if (outputType === "json") {
          res.setHeader("Content-type", "application/json");
          return res.json({ status: true, result: pdf.toString("base64") });
        }
        res.setHeader("Content-type", "application/pdf");
        res.send(pdf);
        res.end();
      } catch (error) {
        console.log(error);
        return res.json({ status: false, error });
      } finally {
        await context.close();
        await browser.close();
      }
    } else {
      const playwright = import("playwright-aws-lambda");
      let browser = null;

      try {
        browser = await (
          await playwright
        ).launchChromium({
          headless: true,
        });
        const context = await browser.newContext();

        const page = await context.newPage();
        await page.goto(URL, { waitUntil: "networkidle" });
        const pdf = await page.pdf({
          format: "a4",
          printBackground: false,
        });

        await context.close();
        await browser.close();

        if (outputType === "json") {
          res.setHeader("Content-type", "application/json");
          return res.json({ status: true, result: pdf.toString("base64") });
        }
        res.setHeader("Content-type", "application/pdf");
        res.send(pdf);
        res.end();
      } catch (error) {
        console.log(error);
        return res.json({ status: false, error });
      }
    }
  }
  return res.json({
    success: false,
    error: {
      message: "id can't be empty.",
    },
  });
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});

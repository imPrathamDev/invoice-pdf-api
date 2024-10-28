import express from "express";
import { config } from "dotenv";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

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

  if (!id || id.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: "id can't be empty.",
      },
    });
  }

  const URL = `https://invogennn.netlify.app/create/preview/${id}`;
  const outputType = type ?? "json";

  try {
    let browser = null;

    if (IS_PRODUCTION === "false") {
      // Development environment
      const playwright = await import("playwright");
      browser = await playwright.chromium.launch({
        headless: true,
      });
    } else {
      // Production environment (Vercel)
      const chromium = await import("@sparticuz/chromium");
      const playwright = await import("playwright-core");

      // Configure Chrome for AWS Lambda
      await chromium.default.font("/var/task/fonts/");

      browser = await playwright.chromium.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    await page
      .goto(URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      })
      .catch((error) => {
        throw new Error(`Navigation failed: ${error.message}`);
      });

    const pdf = await page.pdf({
      format: "a4",
      printBackground: false,
    });

    await context.close();
    await browser.close();

    if (outputType === "json") {
      res.setHeader("Content-type", "application/json");
      return res.json({
        status: true,
        result: pdf.toString("base64"),
      });
    }

    res.setHeader("Content-type", "application/pdf");
    res.send(pdf);
    return res.end();
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return res.status(500).json({
      status: false,
      error: {
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

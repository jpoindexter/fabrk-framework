"use server";

import puppeteer from 'puppeteer';

export async function screenshot(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30_000 });
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    return Buffer.from(buffer).toString('base64');
  } finally {
    await browser.close();
  }
}

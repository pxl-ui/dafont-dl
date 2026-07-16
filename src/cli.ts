#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cwd } from "node:process";
import { pipeline } from "node:stream/promises";
import { program } from "commander";
import extract from "extract-zip";
import pkg from "../package.json" with { type: "json" };

async function downloadDaFont(
	fontIdOrUrl: string,
	output?: string,
	options?: { output: string },
) {
	const fontId = fontIdOrUrl.startsWith("http")
		? fontIdOrUrl
				.split("/")
				.pop()
				?.replace(/\.[^.]+$/, "")
				.replaceAll("-", "_")
		: fontIdOrUrl;

	if (!fontId) {
		throw new Error(`Unable to resolve fontId from argument: "${fontIdOrUrl}"`);
	}

	const dlUrl = `https://dl.dafont.com/dl/?f=${fontId}`;

	const outputDir = options?.output ?? output ?? join(cwd(), fontId);

	const tmpDir = await mkdtemp(join(tmpdir(), `${pkg.name}-`));
	const zipPath = join(tmpDir, `${fontId}.zip`);

	console.log(`Downloading ${dlUrl}`);

  try {
  	const response = await fetch(dlUrl);

    if (!response.ok || !response.body) {
      throw new Error(
        `Download failed (${response.status} ${response.statusText})`,
      );
    }

    if (response.headers.get("content-type") !== "application/zip") {
      throw new Error(
        `Download returned wrong content type ${response.headers.get("content-type")}`
      )
    }

	  await pipeline(response.body, createWriteStream(zipPath));

    await mkdir(outputDir, { recursive: true });

    console.log(`Extracting to ${outputDir}`);

    await extract(zipPath, {
      dir: outputDir,
    });

    await unlink(zipPath);

  	console.log(`Done: ${outputDir}`);
  } finally {
    await rm(tmpDir, {
      recursive: true,
      force: true,
    });
  }
}

program
	.name(pkg.name)
	.version(pkg.version)
	.description("CLI to download assets from dafont")
	.option("-o, --output <path>", "Output directory")
	.argument("<fontId>", "Dafont url or font id")
	.argument("[output]", "Output directory")
	.action(downloadDaFont);

program.parse();

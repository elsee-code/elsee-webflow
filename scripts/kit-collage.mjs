#!/usr/bin/env node
// kit-collage.mjs — produit, pour un commit, le code à coller dans Webflow.
//
// webflow/ décrit chaque emplacement de code personnalisé du site (réglages du site, des pages,
// des modèles CMS, blocs Embed). Les fichiers du dépôt y sont appelés par trois marqueurs :
// {{jsdelivr:<fichier>}} (l'URL jsDelivr) et {{sri:<fichier>}} (l'empreinte `integrity`) dans une
// balise, ou {{inline:<fichier>}} comme contenu d'un <script> collé en ligne (formulaires : ils ne
// doivent pas dépendre de jsDelivr). Ce script les remplace par l'URL épinglée sur <commit>,
// l'empreinte sha384 ou le contenu du fichier à ce commit, et écrit le résultat dans <dossier>,
// emplacement par emplacement.
//
//   node scripts/kit-collage.mjs <commit> <dossier> [--verifier-jsdelivr]
//
// <commit> doit être sur main, mergé : jsDelivr sert n'importe quel commit du dépôt, mais seul
// un commit de main reste garanti. --verifier-jsdelivr télécharge chaque fichier chez jsDelivr et
// compare son empreinte à celle calculée ici (à faire avant de coller : une empreinte fausse
// bloque le script dans le navigateur, sans autre signe qu'une erreur en console).

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const [ref, outDir, ...flags] = process.argv.slice(2);
if (!ref || !outDir) {
  console.error("usage : node scripts/kit-collage.mjs <commit> <dossier> [--verifier-jsdelivr]");
  process.exit(2);
}
const verifyCdn = flags.includes("--verifier-jsdelivr");
const REPO = "elsee-code/elsee-webflow";
const MARKER = /\{\{(jsdelivr|sri|inline):([A-Za-z0-9._-]+\.js)\}\}/g;

const sha = execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { encoding: "utf8" }).trim();

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : p.endsWith(".html") ? [p] : [];
  });
}

const show = (file) => execFileSync("git", ["show", `${sha}:${file}`], { maxBuffer: 16 * 1024 * 1024 });

const cache = new Map();
function sri(file) {
  if (!cache.has(file)) cache.set(file, "sha384-" + createHash("sha384").update(show(file)).digest("base64"));
  return cache.get(file);
}

// Contenu d'un fichier collé en ligne, sans le saut de ligne final. check-webflow.mjs a déjà
// refusé un fichier qui contiendrait « </script » ou « <!-- » : il fermerait la balise.
const inlined = new Set();
function inline(file) {
  inlined.add(file);
  return show(file).toString("utf8").replace(/\n+$/, "");
}
const url = (file) => `https://cdn.jsdelivr.net/gh/${REPO}@${sha}/${file}`;

const sources = listFiles("webflow");
let written = 0;
for (const src of sources) {
  const text = readFileSync(src, "utf8");
  const out = text.replace(MARKER, (_, kind, file) =>
    kind === "jsdelivr" ? url(file) : kind === "sri" ? sri(file) : inline(file),
  );
  const dest = join(outDir, relative("webflow", src));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, out);
  written++;
}
console.log(`${written} emplacements écrits dans ${outDir}, commit ${sha}`);
console.log(`${cache.size} fichiers épinglés : ${[...cache.keys()].sort().join(", ")}`);
console.log(`${inlined.size} fichiers collés en ligne : ${[...inlined].sort().join(", ")}`);

if (verifyCdn) {
  let failed = 0;
  for (const [file, expected] of cache) {
    const res = await fetch(url(file));
    const got = res.ok
      ? "sha384-" + createHash("sha384").update(Buffer.from(await res.arrayBuffer())).digest("base64")
      : `HTTP ${res.status}`;
    const ok = got === expected;
    if (!ok) failed++;
    console.log(`${ok ? "✅" : "❌"} ${file} ${ok ? "" : `jsDelivr : ${got}, attendu : ${expected}`}`);
  }
  if (failed) {
    console.error(`✖ ${failed} fichier(s) servi(s) différemment par jsDelivr : ne pas coller`);
    process.exit(1);
  }
}

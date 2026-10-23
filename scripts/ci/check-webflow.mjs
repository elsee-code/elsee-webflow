#!/usr/bin/env node
// check-webflow — le code à coller dans Webflow (webflow/) est cohérent avec le dépôt.
//
// Pour chaque fichier de webflow/ :
//   - chaque {{jsdelivr:<fichier>}} et {{sri:<fichier>}} désigne un fichier .js suivi par git, et
//     les deux marqueurs vont par paire dans la même balise ;
//   - aucun autre marqueur {{…}} hors des modèles de champs CMS des blocs Embed des cartes ;
//   - chaque <script> en ligne (hors JSON) se parse : collé dans Webflow, une erreur de syntaxe
//     casse la page sans alerte ;
//   - aucune balise externe sans `integrity`, hors liste des fournisseurs qui n'en publient pas.
// Appelé par check-js-syntax.sh. Sortie 0 si tout va bien, 1 sinon.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

// Balises externes sans `integrity`, connues et voulues : chargeurs de fournisseurs dont le
// contenu change sans version (SRI impossible), et la balise Google Maps.
const SANS_INTEGRITY = [
  /^https:\/\/maps\.googleapis\.com\/maps\/api\/js\?/,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/@finsweet\/attributes-(accordion|copyclip)@1\//,
  /^https:\/\/cdn\.jsdelivr\.net\/gh\/elsee-code\/elsee-webflow@[0-9a-f]{7,40}\//, // anciennes balises, avec integrity en ligne
];

const tracked = new Set(execFileSync("git", ["ls-files", "*.js"], { encoding: "utf8" }).split("\n").filter(Boolean));

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? listFiles(p) : p.endsWith(".html") ? [p] : [];
  });
}

const files = listFiles("webflow");
if (files.length === 0) {
  console.log("✖ webflow/ est vide : le contrôle n'exerce rien");
  process.exit(1);
}

// Retire les commentaires HTML <!-- … --> par recherche de bornes, sans expression régulière : un
// commentaire non fermé coupe le reste du fichier, comme le ferait le navigateur.
function withoutComments(text) {
  let out = "";
  let i = 0;
  for (;;) {
    const start = text.indexOf("<!--", i);
    if (start < 0) return out + text.slice(i);
    out += text.slice(i, start);
    const end = text.indexOf("-->", start + 4);
    if (end < 0) return out;
    i = end + 3;
  }
}

// Balises <script> du fichier, par recherche de bornes (casse ignorée) : une fermeture
// « </script …> » s'arrête au premier « > », comme dans le navigateur.
function* scriptTags(html) {
  const lower = html.toLowerCase();
  let i = 0;
  for (;;) {
    const open = lower.indexOf("<script", i);
    if (open < 0) return;
    const next = lower[open + 7];
    if (next !== ">" && !/\s/.test(next ?? "")) {
      i = open + 7;
      continue;
    }
    const openEnd = lower.indexOf(">", open);
    const close = openEnd < 0 ? -1 : lower.indexOf("</script", openEnd);
    if (close < 0) return;
    const closeEnd = lower.indexOf(">", close);
    yield { attrs: html.slice(open + 7, openEnd), body: html.slice(openEnd + 1, close) };
    if (closeEnd < 0) return;
    i = closeEnd + 1;
  }
}

let errors = 0;
const fail = (f, msg) => {
  errors++;
  console.log(`❌ ${f} : ${msg}`);
};

for (const f of files) {
  const text = readFileSync(f, "utf8");
  // HTML en commentaire (consignes de collage) : ignoré pour les contrôles qui suivent.
  const html = withoutComments(text);

  for (const m of html.matchAll(/\{\{([^}]*)\}\}/g)) {
    const marker = m[1];
    const ref = /^(jsdelivr|sri):([A-Za-z0-9._-]+\.js)$/.exec(marker);
    if (ref) {
      if (!tracked.has(ref[2])) fail(f, `{{${marker}}} : ${ref[2]} n'est pas un fichier du dépôt`);
    } else if (!/^embeds\/fiche-carte-/.test(f.replace(/^webflow\//, ""))) {
      fail(f, `marqueur inconnu {{${marker}}}`);
    }
  }

  for (const { attrs, body } of scriptTags(html)) {
    const src = /\bsrc="([^"]+)"/.exec(attrs)?.[1];
    if (src) {
      const j = /^\{\{jsdelivr:([^}]+)\}\}$/.exec(src);
      if (j) {
        if (!attrs.includes(`{{sri:${j[1]}}}`)) fail(f, `balise ${j[1]} sans {{sri:${j[1]}}} assorti`);
        if (!/\bdefer\b/.test(attrs)) fail(f, `balise ${j[1]} sans defer`);
      } else if (!/\bintegrity="sha(256|384|512)-/.test(attrs) && !SANS_INTEGRITY.some((re) => re.test(src))) {
        fail(f, `balise externe sans integrity : ${src}`);
      }
      continue;
    }
    if (/type="application\/ld\+json"/.test(attrs)) continue;
    try {
      new vm.Script(body, { filename: f });
    } catch (e) {
      fail(f, `script en ligne qui ne se parse pas : ${e.message}`);
    }
  }
}

console.log(errors ? `✖ ${errors} problème(s) dans webflow/` : `✅ webflow/ : ${files.length} emplacements cohérents`);
process.exit(errors ? 1 : 0);

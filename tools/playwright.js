/* Finding Playwright, once, for every tool here that draws something.
 *
 * It is a GLOBAL install rather than a dependency, because this project has
 * no package.json and no node_modules by design - the game is classic
 * scripts and the tools are single files you run with node. So the tools
 * have to go looking for it, and where a global lives is per platform:
 *
 *   POSIX     <prefix>/lib/node_modules/playwright
 *   Windows   <prefix>\node_modules\playwright        (no lib/)
 *
 * This used to be copy-pasted into shot.js, icon.js and storetest.js, all
 * three of them POSIX-only, so every one of them said "playwright not
 * found" on Windows with Playwright installed and its Chromium already
 * downloaded. One copy now, and `npm root -g` as the last resort: it is the
 * only answer that is right everywhere, and it costs a subprocess on the
 * path where we were about to give up anyway.
 */
const path=require("path");

function loadPlaywright(extra){
  const pre=process.env.npm_config_prefix;
  const tries=["playwright",
    "/opt/node22/lib/node_modules/playwright",
    pre&&path.join(pre,"lib","node_modules","playwright"),
    pre&&path.join(pre,"node_modules","playwright"),
    process.env.APPDATA&&path.join(process.env.APPDATA,"npm","node_modules","playwright")];
  for(const t of tries){ if(t) try{ return require(t); }catch(e){} }
  try{
    const root=require("child_process").execSync("npm root -g",{encoding:"utf8"}).trim();
    return require(path.join(root,"playwright"));
  }catch(e){}
  console.error("playwright not found. `npm i -g playwright`"
    +(extra?" "+extra:"")+"\n  Chromium comes with it; if only the package is "
    +"there, `npx playwright install chromium`.");
  process.exit(2);
}

module.exports={loadPlaywright};

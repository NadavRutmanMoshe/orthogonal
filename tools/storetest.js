"use strict";
/* Drive the ads and the shop through every path, headless, with no phone.
 *
 *   node tools/storetest.js
 *
 * js/24-ads.js and js/25-shop.js only do anything inside the app, where
 * window.Capacitor is the native bridge. This loads the real index.html in
 * headless Chromium and puts a FAKE bridge there first: an AdMob and a
 * NativePurchases that answer the way the real plugins do - including the
 * awkward ways, which were read out of their Java, Kotlin and Swift: a
 * video closed early whose promise never settles, a reward that arrives
 * after the close, a PENDING Android purchase, "already owned" arriving as
 * the same error as a cancel. Then it checks what the game does with each.
 *
 * It proves the game handles every answer. It cannot prove the real plugin
 * gives those answers - that is what the phone is for.
 *
 * Playwright is found the way tools/shot.js finds it (NODE_PATH works too).
 */
const path=require("path");
const PAGE=require("url").pathToFileURL(path.join(__dirname,"..","index.html")).href;
const {loadPlaywright}=require("./playwright.js");
const pw=loadPlaywright();

let fails=0, passes=0;
function ok(cond,msg){ if(cond){passes++;console.log("  ok   "+msg);} else {fails++;console.log("  FAIL "+msg);} }

function fakeNative(opts){
  window.__log=[];
  const L=window.__log;
  const F=window.__fake=Object.assign({fill:true, adMode:"watch", buyMode:"ok",
    storeOwned:[], platform:"android", consent:{status:"NOT_REQUIRED"}},opts);
  const listeners={};
  const emit=(ev,d)=>(listeners[ev]||[]).forEach(fn=>fn(d));
  const later=(ms,fn)=>setTimeout(fn,ms);
  const AdMob={
    addListener(ev,fn){(listeners[ev]=listeners[ev]||[]).push(fn);return Promise.resolve({remove(){}});},
    requestConsentInfo(o){L.push(["consentInfo",o]);
      /* SEEN ON A REAL PHONE: the call reaches native and no answer ever
         comes back - not a resolve, not a reject. Google's UMP SDK simply
         never calls either callback, and adSoon() in js/24-ads.js is the
         clock that gets past it. */
      if(F.consentMode==="hang")return new Promise(()=>{});
      return Promise.resolve(Object.assign({},F.consent));},
    showConsentForm(){L.push(["consentForm"]);return Promise.resolve({status:"OBTAINED",privacyOptionsRequirementStatus:"REQUIRED"});},
    showPrivacyOptionsForm(){L.push(["privacyForm"]);return Promise.resolve();},
    initialize(o){L.push(["initialize",o]);return Promise.resolve();},
    prepareRewardVideoAd(o){L.push(["prepare",o]);
      return new Promise((res,rej)=>later(30,()=>F.fill?res({adUnitId:o.adId}):rej(new Error("no fill"))));},
    showRewardVideoAd(){L.push(["show"]);
      return new Promise((res,rej)=>{
        if(F.adMode==="watch")later(250,()=>{emit("onRewardedVideoAdReward",{});res({});later(30,()=>emit("onRewardedVideoAdDismissed"));});
        else if(F.adMode==="close")later(60,()=>emit("onRewardedVideoAdDismissed"));
        else if(F.adMode==="iosorder")later(60,()=>{emit("onRewardedVideoAdDismissed");later(250,()=>{emit("onRewardedVideoAdReward",{});res({});});});
        else if(F.adMode==="failshow")later(60,()=>{emit("onRewardedVideoAdFailedToShow",{});rej(new Error("x"));});
      });
    },
  };
  const tx=(id,state,ack)=>({productIdentifier:id,purchaseState:state||"1",isAcknowledged:ack!==false,purchaseToken:"tok-"+id});
  const Shop={
    addListener(ev,fn){(listeners["shop:"+ev]=listeners["shop:"+ev]||[]).push(fn);return Promise.resolve({remove(){}});},
    getProducts(o){L.push(["getProducts",o]);
      return Promise.resolve({products:o.productIdentifiers.map(id=>({identifier:id,priceString:"\u20aa"+(id==="pass_all"?"39.90":id==="pass_all_upgrade"?"21.90":id==="pass_nolimits"?"19.90":"11.90")}))});},
    getPurchases(o){L.push(["getPurchases",o]);return Promise.resolve({purchases:F.storeOwned.map(x=>typeof x==="string"?tx(x):x)});},
    purchaseProduct(o){L.push(["purchase",o.productIdentifier]);
      /* A FLOW THAT NEVER LAUNCHED. The plugin drops launchBillingFlow's
         result on the floor, so a refused flow never reaches the listener
         and this call is never resolved OR rejected - see shopBusy() in
         js/25-shop.js. This is that promise. */
      if(F.buyMode==="hang")return new Promise(()=>{});
      return new Promise((res,rej)=>later(120,()=>{
        if(F.buyMode==="ok"){F.storeOwned.push(o.productIdentifier);res(tx(o.productIdentifier));}
        else if(F.buyMode==="pending")rej(new Error("Purchase is pending"));
        else if(F.buyMode==="cancel")rej(new Error("Purchase is not purchased"));
        else if(F.buyMode==="alreadyOwned"){F.storeOwned.push(o.productIdentifier);rej(new Error("Purchase is not purchased"));}
      }));},
    restorePurchases(){L.push(["restore"]);return Promise.resolve();},
    acknowledgePurchase(o){L.push(["ack",o.purchaseToken]);return Promise.resolve();},
  };
  window.__emitShop=(ev,d)=>(listeners["shop:"+ev]||[]).forEach(fn=>fn(d));
  /* SHAPED LIKE THE BRIDGE A DEVICE ACTUALLY INJECTS, which is the whole
     point of a fake. The native side writes a generated proxy per plugin
     INTO Capacitor.Plugins and there is no registerPlugin anywhere in a
     WebView with no bundler - the paragraph is at capPlugin() in
     js/19-bindings.js. This fake used to offer the exact mirror image,
     registerPlugin and no Plugins at all, so every test here passed while
     the app found no plugins whatsoever on a real phone: no ads, no BUY
     button, and the back button quitting mid-level.

     `bridge:"bundled"` is the OTHER shape, the one @capacitor/core gives a
     project with a build step. Both have to work, so both are testable. */
  var caps={isNativePlatform:()=>true,getPlatform:()=>F.platform,
    isPluginAvailable:n=>Object.prototype.hasOwnProperty.call(caps.Plugins,n)};
  if(F.bridge==="bundled"){
    caps.Plugins={};
    caps.registerPlugin=n=>n==="AdMob"?AdMob:n==="NativePurchases"?Shop:null;
  }else{
    caps.Plugins={AdMob:AdMob,NativePurchases:Shop};
  }
  window.Capacitor=caps;
}

async function openGame(browser,{native,settings,progress,wardrobe,fake,tag}){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  const page=await ctx.newPage();
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
  await page.route(/^https?:/,r=>r.abort());
  const seed={"orthogonal:settings":JSON.stringify(Object.assign({hintAsked:true,starAsked:true,volume:0,volTouched:true},settings||{}))};
  if(progress)seed["orthogonal:progress"]=JSON.stringify(progress);
  if(wardrobe)seed["orthogonal:wardrobe"]=JSON.stringify(wardrobe);
  await page.addInitScript(seed=>{for(const k in seed)localStorage.setItem(k,seed[k]);},seed);
  if(native)await page.addInitScript(fakeNative,fake||{});
  await page.goto(PAGE);
  await page.waitForFunction(()=>typeof splashState!=="undefined"&&typeof renderer!=="undefined");
  await page.waitForTimeout(600);
  await page.evaluate(()=>{if(splashState!=="done"){splashState="running";splashEnd();}});
  await page.waitForTimeout(500);
  page.errors=errors;
  return {ctx,page};
}
const toast=page=>page.evaluate(()=>$("toast").textContent);
const log=page=>page.evaluate(()=>window.__log||[]);

(async()=>{
  const browser=await pw.chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
  const midSave={"00 - Tutorial":1};

  console.log("\n[web] no Capacitor: ads pay at once, shop is dead with a note");
  {
    const {ctx,page}=await openGame(browser,{native:false,settings:{ageBand:"a26"},progress:midSave});
    const r=await page.evaluate(()=>{var got=null;adWatch(function(ok){got=ok;});return got;});
    ok(r===true,"adWatch calls back true synchronously in a browser");
    await page.evaluate(()=>wardrobePanel("deal"));
    await page.waitForTimeout(700);
    const meta=await page.evaluate(()=>$("wMeta").innerHTML);
    ok(/Buying opens in the phone app/.test(meta),"deal tab says buying opens in the app");
    ok(!/wRestore/.test(meta),"no RESTORE in a browser");
    ok(/<button disabled="" class="wbuyusd">/.test(meta),"BUY disabled in a browser");
    ok(/\$4\.99/.test(meta),"browser shows dollar price");
    ok(!page.errors.length,"no page errors "+page.errors.join(" | "));
    await ctx.close();
  }

  /* THE SHAPE OF THE BRIDGE IS ITSELF A TEST NOW, because getting it wrong
     is what shipped: every other test in this file passed while the phone
     found no plugins at all. A device fills Capacitor.Plugins from the
     native side and has no registerPlugin; a bundled build is the other way
     round. capPlugin() has to find the plugin in both. */
  console.log("\n[native] the bridge shape: Plugins on a device, registerPlugin when bundled");
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"a26"},progress:midSave});
    const r=await page.evaluate(()=>({reg:typeof Capacitor.registerPlugin,
      ad:!!adPlugin(),shop:!!shopPlugin(),avail:Capacitor.isPluginAvailable("AdMob")}));
    ok(r.reg==="undefined","a device bridge has no registerPlugin");
    ok(r.avail===true,"isPluginAvailable reads Capacitor.Plugins");
    ok(r.ad,"adPlugin() found on a device-shaped bridge");
    ok(r.shop,"shopPlugin() found on a device-shaped bridge");
    await ctx.close();
  }
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"a26"},progress:midSave,fake:{bridge:"bundled"}});
    const r=await page.evaluate(()=>({ad:!!adPlugin(),shop:!!shopPlugin()}));
    ok(r.ad&&r.shop,"both found on a bundled bridge too");
    await ctx.close();
  }

  console.log("\n[native] adult save: starts after 3s, not child-directed");
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"a26"},progress:midSave});
    let l=await log(page);
    ok(!l.some(e=>e[0]==="initialize"),"not initialised on launch");
    await page.waitForTimeout(3200);
    l=await log(page);
    const init=l.find(e=>e[0]==="initialize");
    ok(init&&init[1].tagForChildDirectedTreatment===false&&init[1].tagForUnderAgeOfConsent===false,"initialize with child flags false");
    ok(l.findIndex(e=>e[0]==="consentInfo")<l.findIndex(e=>e[0]==="initialize"),"consent info asked before initialize");
    const prep=l.find(e=>e[0]==="prepare");
    ok(prep&&prep[1].npa===false&&/5224354917/.test(prep[1].adId),"preloads a test rewarded unit, personalised allowed");

    // hint refill card -> tap the ad button -> hints granted after the video
    await page.evaluate(()=>{homeHide&&homeUp()&&homeHide();$("intro").classList.add("gone");hintBank.n=0;hintBank.t=Date.now();hintRefillOffer();});
    await page.waitForTimeout(300);
    const before=await page.evaluate(()=>hintBank.n);
    await page.click("#hrAd");
    await page.waitForTimeout(50);
    ok(await page.evaluate(()=>hintBank.n)===before,"no hints before the video ends");
    await page.waitForTimeout(400);
    ok(await page.evaluate(()=>hintBank.n)===before+3,"+3 hints after the video");
    ok(await page.evaluate(()=>!panelOpen()),"refill card closed");

    // early close
    await page.evaluate(()=>{__fake.adMode="close";});
    let got=await page.evaluate(()=>new Promise(r=>adWatch(r)));
    ok(got===false,"closing early pays nothing");
    ok(/closed early/.test(await toast(page)),"says closed early");
    ok(await page.evaluate(()=>!AD.busy),"not stuck busy after early close");

    // iOS ordering: dismissed then reward 250ms later
    await page.evaluate(()=>{__fake.adMode="iosorder";});
    got=await page.evaluate(()=>new Promise(r=>adWatch(r)));
    ok(got===true,"reward arriving after the close still pays (grace window)");

    // failed to show
    await page.evaluate(()=>{__fake.adMode="failshow";});
    got=await page.evaluate(()=>new Promise(r=>adWatch(r)));
    ok(got===false&&/didn't play/.test(await toast(page)),"failed to show pays nothing and says so");

    // no fill
    await page.evaluate(()=>{__fake.adMode="watch";__fake.fill=false;AD.ready=false;});
    got=await page.evaluate(()=>new Promise(r=>adWatch(r)));
    ok(got===false&&/no video to show/.test(await toast(page)),"no fill pays nothing and says so");
    await page.evaluate(()=>{__fake.fill=true;clearTimeout(AD.retryT);AD.retry=0;});

    // double tap ignored while busy
    const n=await page.evaluate(()=>new Promise(r=>{var c=0;adWatch(()=>{c++;});adWatch(()=>{c++;});setTimeout(()=>r(c),600);}));
    ok(n===1,"a second tap while a video is up is ignored");

    // tally: world costs 3
    const tally=await page.evaluate(()=>new Promise(async r=>{
      var opened=0, key="world:TEST";
      const one=()=>new Promise(res=>{adToward(key,3,()=>{opened++;},null);setTimeout(res,400);});
      await one(); var s1=adsSay(key,3); await one(); var s2=adsSay(key,3); var stored=localStorage.getItem("orthogonal:adtally");
      await one();
      r({opened,s1,s2,stored,after:adTally[key]});
    }));
    ok(tally.s1==="2 MORE ADS"&&tally.s2==="1 MORE AD","label counts down: "+tally.s1+" / "+tally.s2);
    ok(/"world:TEST":2/.test(tally.stored),"tally persisted to storage");
    ok(tally.opened===1&&tally.after===undefined,"opens on the third and clears the tally");

    // map sheet label with a partial tally on a locked boss
    const sheet=await page.evaluate(()=>{
      var i=-1;for(var j=0;j<LEVELS.length;j++)if(LEVELS[j].boss&&!LEVELS[j].tutorial&&mapState(j)==="locked"&&mapSkippable(j)){i=j;break;}
      if(i<0)return null;
      adTally["level:"+LEVELS[i].name]=1;
      levelPicker(mapSecOf(i));mapSheet(i);return {i,html:$("mSheet").innerHTML};
    });
    if(sheet){
      ok(/THE BOSS · 2 MORE ADS/.test(sheet.html),"map sheet says THE BOSS · 2 MORE ADS on a boss with one watched");
      await page.waitForTimeout(900);
    } else console.log("  (no locked skippable boss in this save to check the sheet)");

    ok(!page.errors.length,"no page errors "+page.errors.join(" | "));
    await ctx.close();
  }

  console.log("\n[native] child band and first run");
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"u18"},progress:midSave});
    await page.waitForTimeout(3200);
    const l=await log(page);
    const init=l.find(e=>e[0]==="initialize"), prep=l.find(e=>e[0]==="prepare");
    ok(init&&init[1].tagForChildDirectedTreatment===true&&init[1].tagForUnderAgeOfConsent===true,"u18: child-directed");
    ok(prep&&prep[1].npa===true,"u18: non-personalised");
    ok(l.find(e=>e[0]==="consentInfo")[1].tagForUnderAgeOfConsent===true,"u18: consent request tagged under age");
    await ctx.close();
  }
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{},progress:null});
    await page.waitForTimeout(3300);
    let l=await log(page);
    ok(!l.some(e=>e[0]==="initialize"),"first run: nothing starts while the age card is up");
    await page.evaluate(()=>applyAgeBand("a40"));
    await page.waitForTimeout(200);
    l=await log(page);
    const init=l.find(e=>e[0]==="initialize");
    ok(init&&init[1].tagForChildDirectedTreatment===false,"first run: starts on the band, as an adult for 40-59");
    await ctx.close();
  }
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"dmed"},progress:midSave});
    await page.waitForTimeout(3200);
    const init=(await log(page)).find(e=>e[0]==="initialize");
    ok(init&&init[1].tagForChildDirectedTreatment===true,"I'D RATHER NOT SAY (dmed): child-directed");
    await ctx.close();
  }

  console.log("");
  console.log("[native] a native call that never answers must not kill ads");
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"a26"},progress:midSave,
      fake:{consentMode:"hang"}});
    await page.evaluate(()=>{AD_CALL_MS=500;});
    await page.waitForTimeout(3400);
    ok(await page.evaluate(()=>!!AD.started),"adStart still runs when consent never answers");
    await page.waitForTimeout(900);
    const l=await log(page);
    ok(l.some(e=>e[0]==="initialize"),"it gives up on consent and initialises anyway");
    ok(l.some(e=>e[0]==="prepare"),"and still preloads a video");
    ok(await page.evaluate(()=>!adPrivacyNeeded()),"a null consent reads as no form required");
    const paid=await page.evaluate(()=>new Promise(r=>{adWatch(r);setTimeout(()=>r("stuck"),4000);}));
    ok(paid===true,"the ad button still pays after a hung consent call");
    ok(await page.evaluate(()=>!AD.busy),"and busy is released");
    await ctx.close();
  }

  console.log("\n[native] consent form (EU)");
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"a26"},progress:midSave,
      fake:{consent:{status:"REQUIRED",isConsentFormAvailable:true,privacyOptionsRequirementStatus:"REQUIRED"}}});
    await page.waitForTimeout(3200);
    let l=await log(page);
    ok(!l.some(e=>e[0]==="consentForm"),"form not shown on launch");
    ok(!l.some(e=>e[0]==="prepare"),"no ad loaded before consent");
    const got=await page.evaluate(()=>new Promise(r=>adWatch(r)));
    l=await log(page);
    ok(l.some(e=>e[0]==="consentForm")&&got===true,"form shown on first ad tap, then the video pays");
    await page.evaluate(()=>menuPanel());
    await page.waitForTimeout(400);
    ok(await page.evaluate(()=>!!$("mAdPriv")),"AD PRIVACY row appears when Google requires it");
    await page.click("#mAdPriv");
    await page.waitForTimeout(100);
    ok((await log(page)).some(e=>e[0]==="privacyForm"),"AD PRIVACY opens the privacy options form");
    await ctx.close();
  }
  {
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"a26"},progress:midSave});
    await page.evaluate(()=>menuPanel());
    await page.waitForTimeout(400);
    ok(await page.evaluate(()=>!$("mAdPriv")),"no AD PRIVACY row outside consent regions");
    await ctx.close();
  }

  console.log("\n[native] shop");
  {
    const unacked={productIdentifier:"cat",purchaseState:"1",isAcknowledged:false,purchaseToken:"tok-cat"};
    const pending={productIdentifier:"robot",purchaseState:"2",isAcknowledged:false,purchaseToken:"tok-robot"};
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"a26"},progress:midSave,
      fake:{storeOwned:[unacked,pending,"mystery_product"]}});
    await page.waitForTimeout(300);
    let w=await page.evaluate(()=>wardrobe.owned.slice());
    ok(w.includes("cat"),"launch sync: store-owned cat written into the wardrobe");
    ok(!w.includes("robot"),"launch sync: a PENDING purchase unlocks nothing");
    ok(!w.includes("mystery_product"),"launch sync: unknown product ids ignored");
    ok((await log(page)).some(e=>e[0]==="ack"&&e[1]==="tok-cat"),"unacknowledged purchase gets acknowledged");
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("orthogonal:wardrobe")||"{}").owned||[]);
    ok(stored.includes("cat"),"and saved to storage");

    await page.evaluate(()=>{homeHide&&homeUp()&&homeHide();wardrobePanel("deal");});
    await page.waitForTimeout(800);
    await page.evaluate(()=>{wardSel.deal="pass_nolimits";wardRefresh();});
    await page.waitForTimeout(200);
    let meta=await page.evaluate(()=>$("wMeta").innerHTML);
    ok(/BUY · ₪19\.90/.test(meta),"BUY shows the store's local price");
    ok(/id="wRestore"/.test(meta),"RESTORE PURCHASES on the deals tab");

    await page.click("#wBuyUsd");
    await page.waitForTimeout(20);
    meta=await page.evaluate(()=>$("wMeta").innerHTML);
    ok(/ONE MOMENT/.test(meta),"button says ONE MOMENT while the store sheet is up");
    await page.waitForTimeout(300);
    ok(await page.evaluate(()=>noLimits()),"buying NO LIMITS turns it on");

    await page.evaluate(()=>{wardSel.deal="pass_all";wardRefresh();});
    await page.waitForTimeout(200);
    meta=await page.evaluate(()=>$("wMeta").innerHTML);
    ok(/wwas">₪39\.90<\/s>₪21\.90/.test(meta),"EVERYTHING shows ₪39.90 struck through, ₪21.90 upgrade");
    ok(/BUY · ₪21\.90/.test(meta),"upgrade BUY price");
    await page.click("#wBuyUsd");
    await page.waitForTimeout(300);
    const l=await log(page);
    ok(l.filter(e=>e[0]==="purchase").pop()[1]==="pass_all_upgrade","the upgrade PRODUCT is what gets bought");
    w=await page.evaluate(()=>wardrobe.owned.slice());
    ok(w.includes("pass_all")&&!w.includes("pass_all_upgrade"),"upgrade unlocks pass_all, and its own id never enters the wardrobe");
    ok(await page.evaluate(()=>owns("rook")&&owns("pup")&&hasPass("pass_all")),"everything is owned after the upgrade");

    // pending, cancel, already-owned
    await page.evaluate(()=>{__fake.buyMode="pending";wardSel.deal="robot";});
    await page.evaluate(()=>{wardrobe.owned=wardrobe.owned.filter(x=>x!=="pass_all"&&x!=="pass_nolimits");wardRefresh();});
    await page.click("#wBuyUsd");await page.waitForTimeout(200);
    ok(/payment pending/.test(await toast(page))&&!(await page.evaluate(()=>owns("robot"))),"pending: says so, unlocks nothing");
    await page.evaluate(()=>{__fake.buyMode="cancel";__fake.storeOwned=[];wardSel.deal="pup";wardRefresh();});
    await page.click("#wBuyUsd");await page.waitForTimeout(200);
    ok(!(await page.evaluate(()=>owns("pup")))&&await page.evaluate(()=>!SHOP.busy),"cancel: nothing unlocked, not stuck");
    await page.evaluate(()=>{__fake.buyMode="alreadyOwned";wardSel.deal="rook";wardRefresh();});
    await page.click("#wBuyUsd");await page.waitForTimeout(250);
    ok(await page.evaluate(()=>owns("rook"))&&/restored/.test(await toast(page)),"already owned on the store: restored instead of an error");

    // A PURCHASE THAT NEVER ANSWERS: the shelf must let go by itself.
    await page.evaluate(()=>{__fake.buyMode="hang";__fake.storeOwned=[];
      wardrobe.owned=[];SHOP_STUCK_MS=600;wardSel.deal="cat";wardRefresh();});
    await page.click("#wBuyUsd");await page.waitForTimeout(200);
    ok(await page.evaluate(()=>SHOP.busy)&&/ONE MOMENT/.test(await page.evaluate(()=>$("wMeta").innerHTML)),
       "a hung purchase shows ONE MOMENT while it waits");
    await page.waitForTimeout(900);
    ok(await page.evaluate(()=>!SHOP.busy),"and lets go of the shelf when the store never answers");
    ok(/didn't answer/.test(await toast(page)),"and says nothing was charged");
    ok(/BUY/.test(await page.evaluate(()=>$("wMeta").innerHTML)),"BUY is pressable again");
    // the same hang, but the money DID go through: say so rather than deny it
    await page.evaluate(()=>{__fake.storeOwned=["cat"];wardrobe.owned=[];
      wardSel.deal="cat";wardRefresh();});
    await page.click("#wBuyUsd");await page.waitForTimeout(900);
    ok(await page.evaluate(()=>owns("cat")),"a hang that was actually paid unlocks on the re-sync");
    await page.evaluate(()=>{SHOP_STUCK_MS=180000;__fake.buyMode="ok";});

    // restore
    await page.evaluate(()=>{__fake.storeOwned=["pup"];wardRefresh();});
    await page.click("#wRestore");await page.waitForTimeout(250);
    ok(await page.evaluate(()=>owns("pup"))&&/restored · Pup/.test(await toast(page)),"RESTORE PURCHASES writes back what the store has");
    ok(!(await log(page)).some(e=>e[0]==="restore"),"android restore does not call the plugin's racing restore");
    /* WHEN NOTHING VISIBLY HAPPENS, A CARD SAYS WHAT THE BUTTON IS FOR - the
       owner pressed it, read "nothing to restore" as a dead button, and did
       not know what it was for. The card must come up, name the store, and
       GOT IT must put the player back on the sheet they pressed it on. */
    const card=()=>page.evaluate(()=>panelKind==="offer"?$("panel").textContent:"");
    await page.click("#wRestore");await page.waitForTimeout(250);
    let c=await card();
    ok(/Already here/.test(c)&&/Google Play account/.test(c),"second restore: a card says they are already here, and what the button is for");
    await page.click("#rsOk");await page.waitForTimeout(250);
    ok(await page.evaluate(()=>panelKind==="wardrobe"&&!!$("wRestore")),"GOT IT goes back to the DEALS shelf");
    /* THE THIRD ANSWER: an account that never bought anything is a different
       fact from one whose purchases are already in place, and only the first
       is a reason to go looking at which store account you are signed in to. */
    await page.evaluate(()=>{__fake.storeOwned=[];wardrobe.owned=[];wardRefresh();});
    await page.click("#wRestore");await page.waitForTimeout(250);
    c=await card();
    ok(/Nothing to restore/.test(c)&&/different account/.test(c),"restore with nothing bought anywhere: a card says so and names the other cause");
    await page.click("#rsOk");await page.waitForTimeout(250);
    // The same button in Settings > More, and GOT IT back to Settings.
    await page.evaluate(()=>menuPanel());await page.waitForTimeout(250);
    ok(await page.evaluate(()=>!!$("mRestore")),"RESTORE PURCHASES is in Settings too");
    await page.click("#mRestore");await page.waitForTimeout(250);
    ok(/Nothing to restore/.test(await card()),"the Settings copy gets the same card");
    await page.click("#rsOk");await page.waitForTimeout(250);
    ok(await page.evaluate(()=>panelKind==="menu"),"GOT IT goes back to Settings");
    // Walk away while the store is thinking: no card from nowhere, a toast.
    await page.evaluate(()=>{wardrobePanel("deal");});await page.waitForTimeout(250);
    await page.evaluate(()=>{shopRestore();hidePanel();});await page.waitForTimeout(250);
    ok(!(await page.evaluate(()=>panelOpen()))&&/no purchases found/.test(await toast(page)),"a player who left the sheet gets a toast, not a card out of nowhere");
    // Leave the wardrobe open, as the old ending of this block did: the tests
    // below drive it with wardRefresh() and expect to find it on screen.
    await page.evaluate(()=>wardrobePanel("deal"));await page.waitForTimeout(250);

    // iOS later approval (Ask to Buy)
    await page.evaluate(()=>__emitShop("transactionUpdated",{productIdentifier:"robot",transactionId:"9"}));
    await page.waitForTimeout(100);
    ok(await page.evaluate(()=>owns("robot")),"a transaction approved later (Ask to Buy) unlocks when it arrives");

    // wardrobe item ad
    const item=await page.evaluate(()=>{var s=SKIN_SHAPES.find(x=>!x.deal&&!x.reward&&x.cost>10&&!owns(x.id));wardrobe.spent=9999;wardTab="shape";wardSel.shape=s.id;wardRefresh();return {id:s.id,need:adsFor(s.cost)};});
    await page.waitForTimeout(3300); // ads start
    for(let k=0;k<item.need;k++){await page.click("#wAd");await page.waitForTimeout(400);}
    ok(await page.evaluate(id=>owns(id)&&wardrobe.shape===id,item.id),"wardrobe item unlocks and is worn after "+item.need+" videos");
    ok(!page.errors.length,"no page errors "+page.errors.join(" | "));
    await ctx.close();
  }
  {
    // iOS restore calls AppStore sync first
    const {ctx,page}=await openGame(browser,{native:true,settings:{ageBand:"a26"},progress:midSave,fake:{platform:"ios",storeOwned:["cat"]}});
    await page.evaluate(()=>{wardrobe.owned=[];});
    await page.evaluate(()=>new Promise(r=>{shopRestore();setTimeout(r,300);}));
    const l=await log(page);
    ok(l.some(e=>e[0]==="restore")&&await page.evaluate(()=>owns("cat")),"iOS restore syncs with the App Store, then reads");
    const init=l.find(e=>e[0]==="prepare");
    await page.waitForTimeout(3200);
    const p2=(await log(page)).find(e=>e[0]==="prepare");
    ok(p2&&/1712485313/.test(p2[1].adId),"iOS uses the iOS test unit");
    await ctx.close();
  }

  await browser.close();
  console.log("\n"+passes+" passed, "+fails+" failed");
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});

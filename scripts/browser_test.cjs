const {chromium}=require('playwright');
const assert=require('node:assert/strict');
require('node:fs').mkdirSync(require('node:path').join(__dirname,'../validation'),{recursive:true});
(async()=>{
 const n='1';
 const base=process.env.VMS_API_URL || 'http://localhost:9001/api';
 const plate='BROWSER-'+n+'-'+Date.now();
 const browser=await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const api=async(method,path,data)=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return r.status===204?null:r.json()};
 let vehicle;
 async function fillForm(){
   for(const [label,value] of [['Vehicle Number *',plate],['Brand *','Browser Brand'],['Model *','Browser Model'],['Color','Silver']]){
     await page.getByRole('group',{name:label,exact:true}).getByRole('textbox').click();
     await page.waitForTimeout(150);
     await page.keyboard.press('ControlOrMeta+A');
     await page.waitForTimeout(60);
     await page.keyboard.type(value,{delay:25});
     await page.keyboard.press('Tab');
     await page.waitForTimeout(80);
   }
   await page.getByRole('button',{name:'Vehicle Type * Select vehicle type',exact:true}).click();
   await page.getByText('Car',{exact:true}).last().click();
   await page.getByRole('button',{name:'Fuel Type * Select fuel type',exact:true}).click();
   await page.getByText('Petrol',{exact:true}).last().click();
 }
 try{
   await page.goto(process.env.VMS_WEB_URL || 'http://localhost:8000',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('flt-semantics-placeholder',{state:'attached'});
   await page.locator('flt-semantics-placeholder').evaluate(e=>e.click());
   await page.getByRole('button',{name:'Add Vehicle',exact:true}).last().click();
   await fillForm();
   console.log('Form filled');
   await page.getByRole('button',{name:'Create Vehicle',exact:true}).last().click();
   await page.getByRole('button',{name:'Add Vehicle',exact:true}).last().waitFor();
   vehicle=(await api('GET','/vehicles?size=100')).content.find(v=>v.vehicleNumber===plate);
   assert(vehicle,'UI-created vehicle must exist in MySQL-backed API');
   assert.equal(vehicle.color,'Silver');
   console.log('PASS: UI registration and database-backed list');
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForSelector('flt-semantics-placeholder',{state:'attached'});
   await page.locator('flt-semantics-placeholder').evaluate(e=>e.click());
   await page.getByRole('group',{name:new RegExp('^'+plate+' ')}).waitFor();
   console.log('PASS: saved vehicle survives browser reload');
   await page.getByRole('button',{name:'Add Vehicle',exact:true}).last().click();
   await fillForm();
   await page.getByRole('button',{name:'Create Vehicle',exact:true}).last().click();
   await page.getByRole('group',{name:/Vehicle Number .*already exists/}).waitFor();
   console.log('PASS: duplicate number feedback in registration UI');
   await page.getByRole('button',{name:'Back',exact:true}).last().click();
   const row=page.getByRole('group',{name:new RegExp('^'+plate+' ')});
   await row.getByRole('button').nth(1).click();
   await page.getByRole('group',{name:'Color',exact:true}).getByRole('textbox').click();
   await page.waitForTimeout(150);
     await page.keyboard.press('ControlOrMeta+A');
     await page.waitForTimeout(60);
   await page.keyboard.type('Blue',{delay:25});
   await page.keyboard.press('Tab');
   await page.waitForTimeout(80);
   await page.getByRole('button',{name:'Save Changes',exact:true}).last().click();
   await page.getByRole('button',{name:'Add Vehicle',exact:true}).last().waitFor();
   assert.equal((await api('GET','/vehicles/'+vehicle.id)).color,'Blue');
   console.log('PASS: UI edit persisted');
   await row.getByRole('button').last().click();
   const deleted=page.waitForResponse(r=>r.url()===base+'/vehicles/'+vehicle.id&&r.request().method()==='DELETE');
   await page.getByRole('button',{name:'Delete Vehicle',exact:true}).last().click();
   assert.equal((await deleted).status(),204);
   await row.waitFor({state:'detached'});
   const missing=await fetch(base+'/vehicles/'+vehicle.id);
   assert.equal(missing.status,404);
   console.log('PASS: UI delete persisted');
   assert.deepEqual(errors,[]);
   console.log('PASS: Assignment '+n+' browser CRUD workflow without JavaScript errors');
 }catch(e){console.log(await page.locator('body').ariaSnapshot());await page.screenshot({path:require('node:path').join(__dirname,'../validation/browser-failure.png')});throw e;}
 finally{if(vehicle)await api('DELETE','/vehicles/'+vehicle.id);await browser.close();}
})();

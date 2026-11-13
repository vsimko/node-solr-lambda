import { summarizeProgress } from "./progress.js";
const el=(id)=>document.getElementById(id);
function makeCard(title,status,details,url){
  const node=document.createElement("article");node.className="card";
  const badge=document.createElement("span");badge.className="badge "+String(status||"").replace(/[^a-z_]/g,"");badge.textContent=String(status||"unknown");node.append(badge);
  const h=document.createElement("h3");
  if(url){const a=document.createElement("a");a.href=url;a.textContent=title;h.append(a)}else h.textContent=title;
  node.append(h);
  for(const detail of details.filter(Boolean)){const p=document.createElement("p");p.textContent=String(detail);node.append(p)}
  return node;
}
function render(id,items,fn){const target=el(id);target.replaceChildren();for(const item of items)target.append(fn(item))}
function renderProgress(data){
  const target=el("implementation-progress");
  target.replaceChildren();
  const api=data.apiCoverage?.records||[];
  const metrics=summarizeProgress(api,data.roadmap?.records||[]);
  for(const metric of metrics){
    const article=document.createElement("article");article.className="progress-card";
    const top=document.createElement("div");top.className="progress-card-top";
    const title=document.createElement("h3");title.textContent=metric.label;
    const count=document.createElement("strong");count.textContent=metric.total?metric.value+" / "+metric.total:"—";
    top.append(title,count);article.append(top);
    const bar=document.createElement("progress");bar.max=metric.total||1;bar.value=metric.value;bar.setAttribute("aria-label",metric.label+": "+metric.value+" of "+metric.total);
    article.append(bar);
    const detail=document.createElement("p");detail.textContent=metric.total?metric.detail+" · "+Math.round(metric.value/metric.total*100)+"%": "No current source data";article.append(detail);
    target.append(article);
  }
  const updated=el("progress-updated");
  updated.textContent="Inventory snapshot · "+new Date(data.generatedAt).toLocaleString();
}
async function main(){
  try{
    const response=await fetch("data/site-data.json");
    if(!response.ok)throw new Error("HTTP "+response.status);
    const data=await response.json();
    el("package-version").textContent=data.package.version;
    renderProgress(data);
    const api=data.apiCoverage.records||[];
    el("api-summary").textContent=api.length+" documented operations · operation-level implementation and compatibility evidence";
    const drawApi=()=>{
      const query=el("api-search").value.toLowerCase(),version=el("version-filter").value;
      const filtered=api.filter(x=>(x.area+" "+x.method+" "+x.operationId).toLowerCase().includes(query)&&(!version||(x.versions||[]).includes(version)));
      render("api-list",filtered.slice(0,90),x=>{
        const node=makeCard(x.area+": "+x.method,x.status,["Types: "+x.typeCoverage,"Unit tests: "+x.unitTests,"Integration: "+x.integrationTests,"Solr versions: "+(x.versions||[]).join(", "),"Evidence: "+Object.entries(x.versionEvidence||{}).map(([v,state])=>v+": "+state).join(", ")],x.documentation?"https://github.com/vsimko/solr-ts-client/blob/master/"+x.documentation:null);
        for(const path of x.testFiles||[]){const p=document.createElement("p"),a=document.createElement("a");a.href="https://github.com/vsimko/solr-ts-client/blob/master/"+path;a.textContent="Test: "+path;p.append(a);node.append(p)}
        return node;
      });
    };
    drawApi();el("api-search").addEventListener("input",drawApi);el("version-filter").addEventListener("change",drawApi);
    const docs=data.documentation.records||[];
    const drawDocs=()=>render("docs-list",docs.filter(x=>(x.title+" "+x.path).toLowerCase().includes(el("docs-search").value.toLowerCase())),x=>makeCard(x.title,"guide",[x.path],x.url));
    drawDocs();el("docs-search").addEventListener("input",drawDocs);
    const npm=data.npm.records?.[0];
    const npmStatus=document.createElement("p");
    if(npm){
      el("npm-version").textContent=npm.version;
      npmStatus.textContent=(Number.isFinite(npm.downloads)?npm.downloads.toLocaleString()+" downloads in the last 7 days":"Download count unavailable")+" · published package";
    }else{
      el("npm-version").textContent="solr-ts-client";
      npmStatus.textContent="Package details will appear after the first public release.";
    }
    el("npm-version").after(npmStatus);
    const copy=el("copy-install");
    copy?.addEventListener("click",async()=>{try{await navigator.clipboard.writeText("npm install solr-ts-client");copy.textContent="Copied"}catch{copy.textContent="Copy unavailable"}});
  }catch(error){
    el("api-summary").textContent="API inventory unavailable: "+error.message;
    el("docs-list").textContent="Documentation catalogue unavailable. Use the repository documentation link.";
  }
}
main();
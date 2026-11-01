import { Buffer } from "node:buffer";
import { SolrHttpError, SolrValidationError } from "./errors.js";
import type { CommitOptions, RequestOptions, SolrClientConfig, SolrDelete, SolrDocument, SolrQuery, UpdateOptions, ValidationSchema } from "./types.js";

const DEFAULT_BASE_URL="http://localhost:8983/";
function appendQuery(url:URL, query:RequestOptions["query"]):void {
  if(!query)return;
  const entries=query instanceof URLSearchParams ? query.entries() : Object.entries(query).flatMap(([key,value])=>(Array.isArray(value)?value:[value]).map(item=>[key,String(item)] as [string,string]));
  for(const [key,value] of entries)url.searchParams.append(key,value);
}
export class SolrClient {
  readonly clientConfig:Readonly<SolrClientConfig>;
  private readonly requestFetch:typeof fetch;
  constructor(config:SolrClientConfig={}) {
    this.clientConfig=Object.freeze({...config});
    this.requestFetch=config.fetch??globalThis.fetch;
    if(!this.requestFetch)throw new Error("Node.js 20 or later with global fetch is required");
  }
  private async validate(operation:string,direction:"inputs"|"outputs",value:unknown):Promise<unknown> {
    const schema:ValidationSchema|undefined=this.clientConfig.validation?.[direction]?.[operation];
    if(!schema)return value;
    const result=await schema.safeParseAsync(value);
    if(result.success)return result.data;
    if(this.clientConfig.validation?.onError==="ignore")return value;
    throw new SolrValidationError(operation,result.error.issues);
  }
  async request<T=unknown>(path:string,options:RequestOptions={}):Promise<T> {
    const method=options.method??"GET";
    const operation=options.operation??method;
    const input=this.clientConfig.validation?await this.validate(operation,"inputs",options.body??options.query):(options.body??options.query);
    const url=new URL(path.replace(/^\//,""),this.clientConfig.baseUrl??DEFAULT_BASE_URL);
    appendQuery(url,options.body===undefined ? input as RequestOptions["query"] : options.query);
    const headers:Record<string,string>={
      accept:"application/json",
      ...(options.body===undefined?{}:{"content-type":"application/json"}),
      ...(this.clientConfig.username!==undefined?{authorization:`Basic ${Buffer.from(`${this.clientConfig.username}:${this.clientConfig.password??""}`).toString("base64")}`}:{}),
      ...this.clientConfig.headers,...options.headers
    };
    const response=await this.requestFetch(url,{method,headers,...(options.body===undefined?{}:{body:JSON.stringify(input)}),signal:options.signal??AbortSignal.timeout(this.clientConfig.timeoutMs??30_000)});
    const text=await response.text();
    let payload:unknown;
    if(text){try{payload=JSON.parse(text) as unknown;}catch{payload=text;}}
    if(!response.ok)throw new SolrHttpError(response.status,response.statusText,payload);
    return (this.clientConfig.validation?await this.validate(operation,"outputs",payload):payload) as T;
  }
  private endpoint(path:string):string {
    const target=this.clientConfig.core??this.clientConfig.collection;
    if(!target)throw new Error("Set 'core' or 'collection' in the Solr client configuration");
    return `/solr/${encodeURIComponent(target)}${path}`;
  }
  query<T=unknown>(query:SolrQuery):Promise<T> {
    const params:Record<string,unknown>={...(query.params??{}),...query};
    if(query.query!==undefined)params.q=query.query;
    if(query.filter!==undefined)params.fq=query.filter;
    if(query.fields!==undefined)params.fl=query.fields;
    if(query.limit!==undefined)params.rows=query.limit;
    if(query.offset!==undefined)params.start=query.offset;
    delete params.query;delete params.params;delete params.filter;delete params.fields;delete params.limit;delete params.offset;
    const flat:Record<string,string|number|boolean|readonly (string|number)[]>={};
    for(const [key,value] of Object.entries(params))if(typeof value==="string"||typeof value==="number"||typeof value==="boolean"||(Array.isArray(value)&&value.every(x=>typeof x==="string"||typeof x==="number")))flat[key]=value as string|number|boolean|readonly (string|number)[];
    return this.request<T>(this.endpoint("/select"),{method:"GET",query:flat,operation:"query"});
  }
  add<T=unknown>(documents:SolrDocument|readonly SolrDocument[],options:UpdateOptions={}):Promise<T> {
    return this.request<T>(this.endpoint("/update"),{method:"POST",body:Array.isArray(documents)?documents:[documents],query:{...options},operation:"add"});
  }
  update<T=unknown>(documents:SolrDocument|readonly SolrDocument[],options:UpdateOptions={}):Promise<T> {
    return this.add<T>(documents,options);
  }
  delete<T=unknown>(command:SolrDelete):Promise<T> {
    return this.request<T>(this.endpoint("/update"),{method:"POST",body:{delete:typeof command==="string"?{id:command}:command},operation:"delete"});
  }
  commit<T=unknown>(options:CommitOptions={}):Promise<T>{return this.request<T>(this.endpoint("/update"),{method:"POST",body:{commit:options},operation:"commit"});}
  softCommit<T=unknown>():Promise<T>{return this.commit<T>({softCommit:true,waitSearcher:false});}
  optimize<T=unknown>(maxSegments=1):Promise<T>{return this.request<T>(this.endpoint("/update"),{method:"POST",body:{optimize:{maxSegments}},operation:"optimize"});}
  rollback<T=unknown>():Promise<T>{return this.request<T>(this.endpoint("/update"),{method:"POST",body:{rollback:{}},operation:"rollback"});}
  ping<T=unknown>():Promise<T>{return this.request<T>(this.endpoint("/admin/ping"),{operation:"ping"});}
  schema<T=unknown>(command:Readonly<Record<string,unknown>>):Promise<T>{return this.request<T>(this.endpoint("/schema"),{method:"POST",body:command,operation:"schema"});}
  config<T=unknown>(command:Readonly<Record<string,unknown>>):Promise<T>{return this.request<T>(this.endpoint("/config"),{method:"POST",body:command,operation:"config"});}

  queryJson<T=unknown>(request:Readonly<Record<string,unknown>>):Promise<T> {
    return this.request<T>(this.endpoint("/query"),{method:"POST",body:request,operation:"queryJson"});
  }
  coreAdmin<T=unknown>(action:import("./types.js").CoreAdminAction,params:import("./types.js").SolrAdminParams={}):Promise<T> {
    return this.request<T>("/solr/admin/cores",{query:{action,...params},operation:"coreAdmin"});
  }
  collections<T=unknown>(action:import("./types.js").CollectionAdminAction,params:import("./types.js").SolrAdminParams={}):Promise<T> {
    return this.request<T>("/solr/admin/collections",{query:{action,...params},operation:"collections"});
  }
  systemInfo<T=unknown>():Promise<T> {
    return this.request<T>("/solr/admin/info/system",{operation:"systemInfo"});
  }
  metrics<T=unknown>(params:import("./types.js").SolrAdminParams={}):Promise<T> {
    return this.request<T>("/solr/admin/metrics",{query:params,operation:"metrics"});
  }
  security<T=unknown>(area:"authentication"|"authorization",command?:Readonly<Record<string,unknown>>):Promise<T> {
    return this.request<T>(`/solr/admin/${area}`,{method:command===undefined?"GET":"POST",...(command===undefined?{}:{body:command}),operation:"security"});
  }
  stream<T=unknown>(expression:string):Promise<T> {
    return this.request<T>(this.endpoint("/stream"),{query:{expr:expression,wt:"json"},operation:"stream"});
  }
  async requestRaw(path:string,options:RequestOptions={}):Promise<Response> {
    const method=options.method??"GET";
    const operation=options.operation??method;
    const input=this.clientConfig.validation?await this.validate(operation,"inputs",options.body??options.query):(options.body??options.query);
    const url=new URL(path.startsWith("/")?path.slice(1):path,this.clientConfig.baseUrl??DEFAULT_BASE_URL);
    appendQuery(url,options.body===undefined?input as RequestOptions["query"]:options.query);
    const headers:Record<string,string>={accept:"*/*",...(options.body===undefined?{}:{"content-type":"application/json"}),...(this.clientConfig.username!==undefined?{authorization:`Basic ${Buffer.from(`${this.clientConfig.username}:${this.clientConfig.password??""}`).toString("base64")}`}:{}),...this.clientConfig.headers,...options.headers};
    const response=await this.requestFetch(url,{method,headers,...(options.body===undefined?{}:{body:JSON.stringify(input)}),signal:options.signal??AbortSignal.timeout(this.clientConfig.timeoutMs??30_000)});
    if(!response.ok){const text=await response.text();let payload:unknown=text;try{payload=text?JSON.parse(text) as unknown:undefined;}catch{}throw new SolrHttpError(response.status,response.statusText,payload);}
    return response;
  }
  export(params:import("./types.js").SolrAdminParams):Promise<Response> {
    return this.requestRaw(this.endpoint("/export"),{query:params,operation:"export"});
  }
}

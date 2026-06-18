import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// ═══════════════════════════════════════════════════════════════════
// TOKENS
// ═══════════════════════════════════════════════════════════════════
const C = {
  bg:'#1E1E1E', card:'#262626', sidebar:'#1A1A1A', border:'#383838',
  borderLight:'#2F2F2F', accent:'#333333', muted:'#A1A1A1', fg:'#F2F2F2',
  primary:'#1282C9', primaryBg:'rgba(18,130,201,0.12)', primaryBdr:'rgba(18,130,201,0.30)',
  success:'#00A87A', successBg:'rgba(0,168,122,0.12)', successBdr:'rgba(0,168,122,0.30)',
  destructive:'#E0142D', destBg:'rgba(224,20,45,0.12)', destBdr:'rgba(224,20,45,0.30)',
  warning:'#F0A200', warnBg:'rgba(240,162,0,0.12)', warnBdr:'rgba(240,162,0,0.30)',
  chart:['hsl(207,90%,54%)','hsl(168,100%,40%)','hsl(280,65%,60%)','hsl(38,92%,50%)','hsl(340,80%,55%)'],
};
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CATS_PADRAO = ['Eletrônicos','Periféricos','Componentes','Móveis','Acessórios','Cabos','Rede','Armazenamento','Segurança','Ferramentas','Software','Peças','Outros'];
const fmt     = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const fmtDate = (d: string) => new Date(d+'T12:00:00').toLocaleDateString('pt-BR');
const fmtPct  = (v: number) => `${v.toFixed(1)}%`;
const TIP     = {background:'#1A1A1A',border:`1px solid ${C.border}`,borderRadius:8,color:C.fg,fontSize:13};

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════
type Fornecedor   = {id:number;nome:string;cnpj:string;telefone:string;email:string;endereco:string;observacoes:string};
type Produto      = {id:number;code:string;nome:string;categoria:string;precoCompra:number;precoVenda:number;estoque:number;estoqueMin:number;fornecedorId:number|null;lote?:string;validade?:string;codigoBarras?:string};
type Movimentacao = {id:number;produtoId:number;produto:string;tipo:'entrada'|'saida';qtd:number;valor:number;lucroTotal:number;data:string;observacao?:string};
type AppState     = {produtos:Produto[];movimentacoes:Movimentacao[];fornecedores:Fornecedor[];categorias:string[]};

// ═══════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════
function useLS<T>(key:string,init:T):[T,React.Dispatch<React.SetStateAction<T>>]{
  const [s,set]=useState<T>(()=>{try{const v=localStorage.getItem(key);return v?JSON.parse(v):init}catch{return init}});
  useEffect(()=>{localStorage.setItem(key,JSON.stringify(s))},[key,s]);
  return [s,set];
}
function dl(blob:Blob,name:string){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}
function exportCSV(rows:string[][],name:string){dl(new Blob(['\uFEFF'+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(';')).join('\n')],{type:'text/csv;charset=utf-8;'}),name)}
function exportBackup(st:AppState){dl(new Blob([JSON.stringify({versao:'2.0',exportadoEm:new Date().toISOString(),...st},null,2)],{type:'application/json'}),`estoquepro-backup-${new Date().toISOString().split('T')[0]}.json`)}
function restaurarBackup(file:File,ok:(s:AppState)=>void,err:(m:string)=>void){
  const r=new FileReader();
  r.onload=e=>{try{const d=JSON.parse(e.target?.result as string);if(!d.produtos||!d.movimentacoes||!d.fornecedores){err('Arquivo inválido.');return}ok({produtos:d.produtos,movimentacoes:d.movimentacoes,fornecedores:d.fornecedores,categorias:d.categorias??[]})}catch{err('Não foi possível ler o backup.')}};
  r.readAsText(file);
}

// ═══════════════════════════════════════════════════════════════════
// UI KIT
// ═══════════════════════════════════════════════════════════════════
function Badge({children,color,bg}:{children:React.ReactNode;color:string;bg:string}){
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:99,fontSize:11,fontWeight:700,background:bg,color}}>{children}</span>
}
function Btn({children,onClick,variant='primary',small}:{children:React.ReactNode;onClick?:()=>void;variant?:'primary'|'success'|'danger'|'ghost';small?:boolean}){
  const [h,setH]=useState(false);
  const map:{[k:string]:[string,string]}={primary:[C.primary,'#0f6ea8'],success:[C.success,'#008a63'],danger:[C.destructive,'#b50f24'],ghost:['transparent',C.accent]};
  const [base,hover]=map[variant];
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:h?hover:base,border:variant==='ghost'?`1px solid ${C.border}`:'none',borderRadius:8,padding:small?'6px 14px':'9px 18px',color:variant==='ghost'?C.muted:'#fff',cursor:'pointer',fontSize:small?12:14,fontWeight:600,display:'flex',alignItems:'center',gap:8,transition:'background 0.2s',whiteSpace:'nowrap'}}>{children}</button>
}
function Card_({title,value,subtitle,icon,color,bg,bdr,glow}:{title:string;value:string;subtitle?:string;icon:string;color:string;bg:string;bdr:string;glow?:string}){
  const [h,setH]=useState(false);
  return <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:C.card,borderRadius:14,border:`1px solid ${bdr}`,padding:20,boxShadow:glow?`0 0 24px -6px ${glow}`:'none',transform:h?'scale(1.02)':'scale(1)',transition:'transform 0.2s'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        <span style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>{title}</span>
        <span style={{fontSize:24,fontWeight:700,color:C.fg,letterSpacing:'-0.5px'}}>{value}</span>
        {subtitle&&<span style={{fontSize:12,color:C.muted}}>{subtitle}</span>}
      </div>
      <div style={{background:bg,borderRadius:10,padding:10,fontSize:20,color}}>{icon}</div>
    </div>
  </div>
}
function Modal_({title,onClose,children,width=540}:{title:string;onClose:()=>void;children:React.ReactNode;width?:number}){
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)'}} onClick={onClose}>
    <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:28,width,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h2 style={{fontSize:18,fontWeight:700,color:C.fg,margin:0}}>{title}</h2>
        <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:C.muted,fontSize:18,lineHeight:1}}>✕</button>
      </div>
      {children}
    </div>
  </div>
}
function MI({label,value,onChange,type='text',optional,placeholder}:{label:string;value:string|number;onChange:(v:string)=>void;type?:string;optional?:boolean;placeholder?:string}){
  const [f,setF]=useState(false);
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}{optional&&<span style={{fontWeight:400,textTransform:'none',letterSpacing:0,marginLeft:4,fontSize:10}}>(opcional)</span>}</label>
    <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{background:C.bg,border:`1px solid ${f?C.primary:C.border}`,borderRadius:8,padding:'9px 12px',color:C.fg,fontSize:14,outline:'none',width:'100%',boxSizing:'border-box',transition:'border-color 0.2s'}}/>
  </div>
}
function MS({label,value,onChange,options}:{label:string;value:string|number;onChange:(v:string)=>void;options:{value:string|number;label:string}[]}){
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:C.fg,fontSize:14,outline:'none',width:'100%'}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
}
function MTA({label,value,onChange,optional}:{label:string;value:string;onChange:(v:string)=>void;optional?:boolean}){
  const [f,setF]=useState(false);
  return <div style={{display:'flex',flexDirection:'column',gap:6}}>
    <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}{optional&&<span style={{fontWeight:400,textTransform:'none',letterSpacing:0,marginLeft:4,fontSize:10}}>(opcional)</span>}</label>
    <textarea value={value} rows={3} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{background:C.bg,border:`1px solid ${f?C.primary:C.border}`,borderRadius:8,padding:'9px 12px',color:C.fg,fontSize:14,outline:'none',width:'100%',boxSizing:'border-box',resize:'vertical',transition:'border-color 0.2s',fontFamily:'inherit'}}/>
  </div>
}
function PH({title,subtitle,children}:{title:string;subtitle:string;children?:React.ReactNode}){
  return <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28}}>
    <div><h1 style={{fontSize:26,fontWeight:700,color:C.fg,margin:0,letterSpacing:'-0.5px'}}>{title}</h1><p style={{color:C.muted,fontSize:14,marginTop:4}}>{subtitle}</p></div>
    {children&&<div style={{display:'flex',gap:10}}>{children}</div>}
  </div>
}
function SI({value,onChange,placeholder='Buscar...'}:{value:string;onChange:(v:string)=>void;placeholder?:string}){
  return <div style={{position:'relative',maxWidth:320}}>
    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:C.muted,pointerEvents:'none',fontSize:14}}>🔍</span>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:'100%',background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px 9px 36px',color:C.fg,fontSize:14,outline:'none',boxSizing:'border-box'}}/>
  </div>
}
function TC({children}:{children:React.ReactNode}){
  return <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>{children}</table></div>
  </div>
}
function TH_({cols}:{cols:{label:string;right?:boolean}[]}){
  return <thead><tr style={{borderBottom:`1px solid ${C.border}`}}>
    {cols.map(c=><th key={c.label} style={{padding:'12px 20px',textAlign:c.right?'right':'left',color:C.muted,fontWeight:700,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap'}}>{c.label}</th>)}
  </tr></thead>
}
function TR_({children,onClick}:{children:React.ReactNode;onClick?:()=>void}){
  const [h,setH]=useState(false);
  return <tr onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={onClick}
    style={{borderBottom:`1px solid ${C.border}33`,background:h?C.accent+'55':'transparent',cursor:onClick?'pointer':'default',transition:'background 0.15s'}}>{children}</tr>
}
function TD_({children,right,mono,muted}:{children:React.ReactNode;right?:boolean;mono?:boolean;muted?:boolean}){
  return <td style={{padding:'12px 20px',textAlign:right?'right':'left',color:muted?C.muted:C.fg,fontFamily:mono?'monospace':'inherit',fontSize:mono?12:14}}>{children}</td>
}
function Empty_({msg}:{msg:string}){return <div style={{padding:48,textAlign:'center',color:C.muted,fontSize:14}}>{msg}</div>}

// ─── PAGINAÇÃO ───────────────────────────────────────────────────────────────
const POR_PAGINA = 15;
function Paginacao({total,pagina,setPagina}:{total:number;pagina:number;setPagina:(p:number)=>void}){
  const totalPags=Math.ceil(total/POR_PAGINA);
  if(totalPags<=1)return null;
  const inicio=(pagina-1)*POR_PAGINA+1;const fim=Math.min(pagina*POR_PAGINA,total);
  const btn=(p:number,label:React.ReactNode,disabled:boolean)=>{
    const [h,setH]=useState(false);
    return <button key={String(p)+String(label)} disabled={disabled} onClick={()=>setPagina(p)}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{minWidth:36,height:36,padding:'0 10px',borderRadius:8,border:`1px solid ${p===pagina?C.primaryBdr:C.border}`,background:p===pagina?C.primaryBg:h?C.accent:'transparent',color:p===pagina?C.primary:disabled?C.border:C.muted,cursor:disabled?'default':'pointer',fontSize:13,fontWeight:p===pagina?700:400,transition:'all 0.15s'}}>{label}</button>;
  };
  // gera range de páginas visíveis
  const pages:number[]=[];const delta=2;
  for(let i=Math.max(1,pagina-delta);i<=Math.min(totalPags,pagina+delta);i++)pages.push(i);
  return <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderTop:`1px solid ${C.border}`,background:C.card,borderRadius:'0 0 14px 14px',flexWrap:'wrap',gap:10}}>
    <span style={{fontSize:12,color:C.muted}}>Mostrando <b style={{color:C.fg}}>{inicio}–{fim}</b> de <b style={{color:C.fg}}>{total}</b> registros</span>
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      {btn(1,'«',pagina===1)}{btn(pagina-1,'‹',pagina===1)}
      {pages[0]>1&&<span style={{color:C.muted,padding:'0 4px'}}>…</span>}
      {pages.map(p=>btn(p,p,false))}
      {pages[pages.length-1]<totalPags&&<span style={{color:C.muted,padding:'0 4px'}}>…</span>}
      {btn(pagina+1,'›',pagina===totalPags)}{btn(totalPags,'»',pagina===totalPags)}
    </div>
  </div>;
}
function SecT({children}:{children:React.ReactNode}){
  return <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${C.borderLight}`}}>{children}</div>
}
function IBtn({children,onClick,title,hc,hbg}:{children:React.ReactNode;onClick:()=>void;title:string;hc:string;hbg:string}){
  const [h,setH]=useState(false);
  return <button title={title} onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:h?hbg:'none',border:'none',cursor:'pointer',padding:6,borderRadius:6,color:h?hc:C.muted,transition:'all 0.15s',lineHeight:1,fontSize:14}}>{children}</button>
}
function Label_({c}:{c:string}){return <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>{c}</label>}
function SmStat({label,value,color}:{label:string;value:string;color:string}){
  return <div style={{background:C.card,borderRadius:10,border:`1px solid ${C.border}`,padding:'14px 18px'}}>
    <div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>{label}</div>
    <div style={{fontSize:22,fontWeight:800,color}}>{value}</div>
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE DIÁLOGO INTERNO (substitui alert/confirm nativos)
// ═══════════════════════════════════════════════════════════════════
type DialogState={open:boolean;type:'alert'|'confirm';msg:string;onOk:()=>void;onCancel?:()=>void};
const dialogSub:{listeners:((s:DialogState)=>void)[]}={listeners:[]};
function showAlert(msg:string):Promise<void>{
  return new Promise(res=>{
    dialogSub.listeners.forEach(fn=>fn({open:true,type:'alert',msg,onOk:()=>{dialogSub.listeners.forEach(f=>f({open:false,type:'alert',msg:'',onOk:()=>{}}));res();}}));
  });
}
function showConfirm(msg:string):Promise<boolean>{
  return new Promise(res=>{
    dialogSub.listeners.forEach(fn=>fn({open:true,type:'confirm',msg,
      onOk:()=>{dialogSub.listeners.forEach(f=>f({open:false,type:'confirm',msg:'',onOk:()=>{}}));res(true);},
      onCancel:()=>{dialogSub.listeners.forEach(f=>f({open:false,type:'confirm',msg:'',onOk:()=>{}}));res(false);}
    }));
  });
}
function DialogProvider(){
  const [state,setState]=useState<DialogState>({open:false,type:'alert',msg:'',onOk:()=>{}});
  useEffect(()=>{dialogSub.listeners.push(setState);return()=>{dialogSub.listeners=dialogSub.listeners.filter(f=>f!==setState)}},[]);
  if(!state.open)return null;
  return <div style={{position:'fixed',inset:0,zIndex:99999,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}
    onClick={e=>{if(e.target===e.currentTarget&&state.type==='alert'){state.onOk()}}}>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:28,maxWidth:400,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.5)',animation:'fadeIn 0.15s ease-out'}}>
      <div style={{fontSize:14,color:C.fg,lineHeight:1.6,marginBottom:24,whiteSpace:'pre-wrap'}}>{state.msg}</div>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
        {state.type==='confirm'&&<button onClick={state.onCancel} style={{padding:'9px 20px',borderRadius:8,border:`1px solid ${C.border}`,background:'transparent',color:C.muted,cursor:'pointer',fontSize:13,fontWeight:600}}>Cancelar</button>}
        <button onClick={state.onOk} autoFocus style={{padding:'9px 20px',borderRadius:8,border:'none',background:C.primary,color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>OK</button>
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════════════
const NAV=[{to:'/',label:'Dashboard',icon:'🏠'},{to:'/produtos',label:'Produtos',icon:'📦'},{to:'/movimentacoes',label:'Movimentações',icon:'🔄'},{to:'/fornecedores',label:'Fornecedores',icon:'🏢'},{to:'/relatorios',label:'Relatórios',icon:'📊'},{to:'/manual',label:'Manual',icon:'📖'},{to:'/sobre',label:'Sobre',icon:'ℹ️'}];

function Sidebar({collapsed,onToggle,produtos}:{collapsed:boolean;onToggle:()=>void;produtos:Produto[]}){
  const loc=useLocation();
  const low=produtos.filter(p=>p.estoque<=p.estoqueMin).length;
  return <aside style={{width:collapsed?72:240,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',transition:'width 0.3s',flexShrink:0,height:'100vh',position:'sticky',top:0,overflow:'hidden'}}>
    <div style={{height:64,display:'flex',alignItems:'center',padding:'0 18px',borderBottom:`1px solid ${C.border}`,gap:12,whiteSpace:'nowrap'}}>
      <div style={{width:32,height:32,background:'#0f2460',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16,boxShadow:'0 0 18px rgba(15,36,96,0.5)'}}>📦</div>
      {!collapsed&&<span style={{fontWeight:800,fontSize:15,color:C.fg}}>Don<span style={{color:'#4a90d9'}}>Estok</span></span>}
    </div>
    <nav style={{flex:1,padding:'12px 10px',display:'flex',flexDirection:'column',gap:3,overflowY:'auto'}}>
      {NAV.map(item=>{
        const active=loc.pathname===item.to;
        const badge=item.to==='/produtos'&&low>0;
        return <Link key={item.to} to={item.to}
          style={{display:'flex',alignItems:'center',gap:12,padding:collapsed?'11px 20px':'11px 14px',borderRadius:10,textDecoration:'none',whiteSpace:'nowrap',background:active?C.primaryBg:'transparent',border:`1px solid ${active?C.primaryBdr:'transparent'}`,color:active?C.primary:C.muted,fontWeight:active?600:500,fontSize:14,transition:'all 0.2s',position:'relative'}}
          onMouseEnter={e=>{if(!active){e.currentTarget.style.background=C.accent;e.currentTarget.style.color=C.fg}}}
          onMouseLeave={e=>{if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color=C.muted}}}>
          <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
          {!collapsed&&<span style={{flex:1}}>{item.label}</span>}
          {badge&&<span style={{background:C.destructive,color:'#fff',fontSize:10,fontWeight:700,borderRadius:99,padding:'2px 6px',position:collapsed?'absolute':'relative',top:collapsed?4:'auto',right:collapsed?4:'auto'}}>{low}</span>}
        </Link>
      })}
    </nav>
    <div style={{borderTop:`1px solid ${C.border}`}}>
      <button onClick={onToggle} style={{width:'100%',height:40,background:'none',border:'none',cursor:'pointer',color:C.muted,fontSize:18}}
        onMouseEnter={e=>e.currentTarget.style.color=C.fg} onMouseLeave={e=>e.currentTarget.style.color=C.muted}>
        {collapsed?'→':'←'}
      </button>
      {!collapsed&&<div style={{padding:'10px 18px 14px',borderTop:`1px solid ${C.border}`,textAlign:'center'}}>
        <div style={{fontSize:10,color:C.muted,letterSpacing:'0.08em'}}>Desenvolvido por</div>
        <div style={{fontSize:12,fontWeight:800,color:'#4a90d9',letterSpacing:'0.05em',marginTop:2}}>GHZ Plugin</div>
      </div>}
    </div>
  </aside>
}

// ═══════════════════════════════════════════════════════════════════
// MODAL PRODUTO
// ═══════════════════════════════════════════════════════════════════
function ModalProduto({produto,onClose,onSave,categorias,fornecedores}:{produto:Partial<Produto>|null;onClose:()=>void;onSave:(p:Produto)=>void;categorias:string[];fornecedores:Fornecedor[]}){
  const [form,setForm]=useState<Partial<Produto>>(produto??{categoria:categorias[0]??'',estoqueMin:5,fornecedorId:null});
  const set=(k:keyof Produto,v:any)=>setForm(f=>({...f,[k]:v}));
  const margem=form.precoCompra!=null&&form.precoVenda!=null&&Number(form.precoVenda)>0?((Number(form.precoVenda)-Number(form.precoCompra))/Number(form.precoVenda))*100:null;
  const save=async()=>{
    if(!form.nome?.trim()){await showAlert('Informe o nome do produto.');return}
    if(!form.precoVenda||Number(form.precoVenda)<=0){await showAlert('Informe o preço de venda.');return}
    if(!form.categoria?.trim()){await showAlert('Informe a categoria do produto.');return}
    onSave({id:form.id??Date.now(),code:form.code?.trim()||`SKU-${String(Date.now()).slice(-6)}`,nome:form.nome.trim(),categoria:form.categoria,precoCompra:Number(form.precoCompra??0),precoVenda:Number(form.precoVenda),estoque:Number(form.estoque??0),estoqueMin:Number(form.estoqueMin??5),fornecedorId:form.fornecedorId?Number(form.fornecedorId):null,lote:form.lote?.trim()||undefined,validade:form.validade||undefined,codigoBarras:form.codigoBarras?.trim()||undefined});
  };
  return <Modal_ title={form.id?'Editar Produto':'Novo Produto'} onClose={onClose} width={580}>
    <SecT>Identificação</SecT>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
      <MI label="Nome do Produto *" value={form.nome??''} onChange={v=>set('nome',v)}/>
      <MI label="Código SKU" value={form.code??''} onChange={v=>set('code',v)} optional/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
      <MI label="Categoria * (ex: Roupas, Alimentos...)" value={form.categoria??''} onChange={v=>set('categoria',v)} placeholder="Digite a categoria do produto"/>
      <MS label="Fornecedor" value={String(form.fornecedorId??'')} onChange={v=>set('fornecedorId',v?Number(v):null)} options={[{value:'',label:'— Nenhum —'},...fornecedores.map(f=>({value:String(f.id),label:f.nome}))]}/>
    </div>
    <div style={{marginBottom:20}}><MI label="Código de Barras" value={form.codigoBarras??''} onChange={v=>set('codigoBarras',v)} optional/></div>
    <SecT>Preços & Estoque</SecT>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:14,marginBottom:14,alignItems:'start'}}>
      <MI label="Preço de Custo" value={form.precoCompra??''} onChange={v=>set('precoCompra',v)} type="number"/>
      <MI label="Preço de Venda *" value={form.precoVenda??''} onChange={v=>set('precoVenda',v)} type="number"/>
      <MI label="Qtd. Estoque" value={form.estoque??0} onChange={v=>set('estoque',v)} type="number"/>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Alerta de Estoque Baixo</label>
        <input type="number" value={form.estoqueMin??5} onChange={e=>set('estoqueMin',e.target.value)}
          style={{background:C.bg,border:`1px solid ${C.warnBdr}`,borderRadius:8,padding:'9px 12px',color:C.fg,fontSize:14,outline:'none',width:'100%',boxSizing:'border-box'}}/>
        <span style={{fontSize:10,color:C.warning}}>⚠ Alerta quando estoque ficar abaixo desse número</span>
      </div>
    </div>
    {margem!==null&&<div style={{background:margem>=0?C.successBg:C.destBg,border:`1px solid ${margem>=0?C.successBdr:C.destBdr}`,borderRadius:8,padding:'10px 14px',marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontSize:13,color:C.muted}}>Margem sobre preço de venda</span>
      <span style={{fontWeight:700,fontSize:16,color:margem>=0?C.success:C.destructive}}>{fmtPct(margem)}</span>
    </div>}
    <SecT>Controle Adicional</SecT>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:28}}>
      <MI label="Lote" value={form.lote??''} onChange={v=>set('lote',v)} optional/>
      <MI label="Validade" value={form.validade??''} onChange={v=>set('validade',v)} type="date" optional/>
    </div>
    <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn variant="primary" onClick={save}>✓ Salvar</Btn>
    </div>
  </Modal_>
}

// ═══════════════════════════════════════════════════════════════════
// MODAL FORNECEDOR
// ═══════════════════════════════════════════════════════════════════
function ModalFornecedor({fornecedor,onClose,onSave}:{fornecedor:Partial<Fornecedor>|null;onClose:()=>void;onSave:(f:Fornecedor)=>void}){
  const [form,setForm]=useState<Partial<Fornecedor>>(fornecedor??{});
  const set=(k:keyof Fornecedor,v:string)=>setForm(f=>({...f,[k]:v}));
  const save=async()=>{if(!form.nome?.trim()){await showAlert('Informe o nome do fornecedor.');return}onSave({id:form.id??Date.now(),nome:form.nome.trim(),cnpj:form.cnpj?.trim()??'',telefone:form.telefone?.trim()??'',email:form.email?.trim()??'',endereco:form.endereco?.trim()??'',observacoes:form.observacoes?.trim()??''})};
  return <Modal_ title={form.id?'Editar Fornecedor':'Novo Fornecedor'} onClose={onClose} width={500}>
    <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:28}}>
      <MI label="Nome da Empresa *" value={form.nome??''} onChange={v=>set('nome',v)}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <MI label="CNPJ" value={form.cnpj??''} onChange={v=>set('cnpj',v)} optional/>
        <MI label="Telefone" value={form.telefone??''} onChange={v=>set('telefone',v)} optional/>
      </div>
      <MI label="E-mail" value={form.email??''} onChange={v=>set('email',v)} type="email" optional/>
      <MI label="Endereço" value={form.endereco??''} onChange={v=>set('endereco',v)} optional/>
      <MTA label="Observações" value={form.observacoes??''} onChange={v=>set('observacoes',v)} optional/>
    </div>
    <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
      <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
      <Btn variant="primary" onClick={save}>✓ Salvar</Btn>
    </div>
  </Modal_>
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function Dashboard({produtos,movimentacoes}:{produtos:Produto[];movimentacoes:Movimentacao[]}){
  const hoje=new Date();
  const stats=useMemo(()=>{
    const saidas=movimentacoes.filter(m=>m.tipo==='saida');
    const totalValor=produtos.reduce((a,p)=>a+p.precoVenda*p.estoque,0);
    const baixos=produtos.filter(p=>p.estoque<=p.estoqueMin);
    const saidasMes=saidas.filter(m=>{const d=new Date(m.data+'T12:00:00');return d.getMonth()===hoje.getMonth()&&d.getFullYear()===hoje.getFullYear()});
    const lucroMes=saidasMes.reduce((a,m)=>a+m.lucroTotal,0);
    const fatMes=saidasMes.reduce((a,m)=>a+m.valor,0);
    const ticket=saidas.length>0?saidas.reduce((a,m)=>a+m.valor,0)/saidas.length:0;
    const vendas:{[k:number]:{nome:string;qtd:number;lucro:number}}={};
    saidas.forEach(m=>{if(!vendas[m.produtoId])vendas[m.produtoId]={nome:m.produto,qtd:0,lucro:0};vendas[m.produtoId].qtd+=m.qtd;vendas[m.produtoId].lucro+=m.lucroTotal});
    const rank=Object.values(vendas).sort((a,b)=>b.qtd-a.qtd);
    let tp=0,tm=0;produtos.forEach(p=>{if(p.precoVenda>0){const w=p.precoVenda*p.estoque,mg=((p.precoVenda-p.precoCompra)/p.precoVenda)*100;tp+=w;tm+=mg*w}});
    return {totalValor,baixos,lucroMes,fatMes,ticket,rank:rank.slice(0,5),margem:tp>0?tm/tp:0};
  },[produtos,movimentacoes]);

  const lineData=useMemo(()=>Array.from({length:30},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(29-i));const ds=d.toISOString().split('T')[0];
    return {date:`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,entradas:movimentacoes.filter(m=>m.data===ds&&m.tipo==='entrada').reduce((a,m)=>a+m.qtd,0),saidas:movimentacoes.filter(m=>m.data===ds&&m.tipo==='saida').reduce((a,m)=>a+m.qtd,0)};
  }),[movimentacoes]);

  const pieData=useMemo(()=>{
    const map:{[k:string]:number}={};produtos.forEach(p=>{map[p.categoria]=(map[p.categoria]??0)+p.precoVenda*p.estoque});
    const total=Object.values(map).reduce((a,v)=>a+v,0);
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value],i)=>({name,value:total>0?Math.round((value/total)*100):0,fill:C.chart[i%C.chart.length]}));
  },[produtos]);

  return <div style={{animation:'fadeIn 0.4s ease-out'}}>
    <div style={{marginBottom:28}}>
      <h1 style={{fontSize:26,fontWeight:700,color:C.fg,margin:0,letterSpacing:'-0.5px'}}>Dashboard</h1>
      <p style={{color:C.muted,fontSize:14,marginTop:4}}>Visão geral e inteligência do seu negócio</p>
    </div>
    {produtos.length===0&&<div style={{background:C.primaryBg,border:`1px solid ${C.primaryBdr}`,borderRadius:12,padding:24,marginBottom:28,display:'flex',gap:16,alignItems:'center'}}>
      <span style={{fontSize:32}}>👋</span>
      <div><div style={{fontWeight:700,color:C.fg,marginBottom:4}}>Bem-vindo ao DonEstok!</div><div style={{color:C.muted,fontSize:13}}>Comece cadastrando seus produtos e fornecedores. As métricas serão preenchidas automaticamente.</div></div>
    </div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:14,marginBottom:14}}>
      <Card_ title="Valor do Estoque" value={fmt(stats.totalValor)} icon="💰" color={C.primary} bg={C.primaryBg} bdr={C.primaryBdr} glow={C.primary+'44'}/>
      <Card_ title="Produtos" value={String(produtos.length)} subtitle="cadastrados" icon="📦" color={C.success} bg={C.successBg} bdr={C.successBdr} glow={C.success+'44'}/>
      <Card_ title="Estoque Baixo" value={String(stats.baixos.length)} subtitle="precisam de reposição" icon="⚠️" color={C.destructive} bg={C.destBg} bdr={C.destBdr}/>
      <Card_ title="Margem Média" value={fmtPct(stats.margem)} subtitle="ponderada pelo estoque" icon="📈" color={C.warning} bg={C.warnBg} bdr={C.warnBdr}/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:14,marginBottom:28}}>
      <Card_ title="Lucro do Mês" value={fmt(stats.lucroMes)} subtitle={MESES[hoje.getMonth()]} icon="🏆" color={C.success} bg={C.successBg} bdr={C.successBdr} glow={C.success+'44'}/>
      <Card_ title="Faturamento do Mês" value={fmt(stats.fatMes)} subtitle="receita bruta" icon="💵" color={C.primary} bg={C.primaryBg} bdr={C.primaryBdr}/>
      <Card_ title="Ticket Médio" value={fmt(stats.ticket)} subtitle="por saída" icon="🎫" color={C.warning} bg={C.warnBg} bdr={C.warnBdr}/>
      <Card_ title="Mais Vendido" value={stats.rank[0]?.nome.split(' ').slice(0,3).join(' ')||'—'} subtitle={stats.rank[0]?`${stats.rank[0].qtd} un.`:'sem saídas'} icon="⭐" color={C.chart[2]} bg="rgba(160,100,220,0.12)" bdr="rgba(160,100,220,0.3)"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20,marginBottom:28}}>
      <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:20}}>
        <h2 style={{fontSize:15,fontWeight:600,color:C.fg,marginBottom:4}}>Movimentações — Últimos 30 dias</h2>
        <p style={{fontSize:12,color:C.muted,marginBottom:16}}>Quantidade real de itens por dia</p>
        <ResponsiveContainer width="100%" height={230}><LineChart data={lineData}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
          <XAxis dataKey="date" tick={{fill:C.muted,fontSize:11}} tickLine={false} axisLine={false} interval={4}/>
          <YAxis tick={{fill:C.muted,fontSize:11}} tickLine={false} axisLine={false} allowDecimals={false}/>
          <Tooltip contentStyle={TIP}/>
          <Line type="monotone" dataKey="entradas" stroke={C.chart[0]} strokeWidth={2.5} dot={false} name="Entradas"/>
          <Line type="monotone" dataKey="saidas" stroke={C.chart[1]} strokeWidth={2.5} dot={false} name="Saídas"/>
        </LineChart></ResponsiveContainer>
      </div>
      <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:20}}>
        <h2 style={{fontSize:15,fontWeight:600,color:C.fg,marginBottom:4}}>Por Categoria</h2>
        <p style={{fontSize:12,color:C.muted,marginBottom:8}}>% sobre valor de estoque</p>
        {pieData.length>0?<>
          <ResponsiveContainer width="100%" height={155}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={4} dataKey="value" stroke="none">
            {pieData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
          </Pie><Tooltip contentStyle={TIP} formatter={(v:any)=>[`${v}%`]}/></PieChart></ResponsiveContainer>
          <div style={{display:'flex',flexDirection:'column',gap:7,marginTop:8}}>
            {pieData.map(c=><div key={c.name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:9,height:9,borderRadius:'50%',background:c.fill,flexShrink:0}}/><span style={{color:C.muted}}>{c.name}</span></div>
              <span style={{fontWeight:700,color:C.fg}}>{c.value}%</span>
            </div>)}
          </div>
        </>:<div style={{textAlign:'center',color:C.muted,fontSize:13,paddingTop:40}}>Sem produtos</div>}
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
      <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`}}><h2 style={{fontSize:14,fontWeight:700,color:C.fg,margin:0}}>🏅 Top 5 Mais Vendidos</h2></div>
        {stats.rank.length>0?<div style={{padding:'8px 0'}}>{stats.rank.map((item,i)=><div key={item.nome} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 20px'}}>
          <span style={{width:22,height:22,borderRadius:'50%',background:C.primaryBg,color:C.primary,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{i+1}</span>
          <div style={{flex:1,overflow:'hidden'}}><div style={{fontSize:13,fontWeight:600,color:C.fg,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.nome}</div>
          <div style={{fontSize:11,color:C.muted}}>{item.qtd} un. · Lucro: {fmt(item.lucro)}</div></div>
        </div>)}</div>:<div style={{padding:32,textAlign:'center',color:C.muted,fontSize:13}}>Nenhuma saída ainda</div>}
      </div>
      <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2 style={{fontSize:14,fontWeight:700,color:C.fg,margin:0}}>⚠ Produtos para Repor</h2>
          {stats.baixos.length>0&&<Badge color={C.destructive} bg={C.destBg}>{stats.baixos.length} itens</Badge>}
        </div>
        {stats.baixos.length>0?<div style={{padding:'8px 0',maxHeight:240,overflowY:'auto'}}>{stats.baixos.map(p=><div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 20px'}}>
          <div><div style={{fontSize:13,fontWeight:600,color:C.fg}}>{p.nome}</div><div style={{fontSize:11,color:C.muted}}>Mínimo: {p.estoqueMin} un.</div></div>
          <Badge color={p.estoque===0?C.destructive:C.warning} bg={p.estoque===0?C.destBg:C.warnBg}>{p.estoque===0?'ZERADO':`${p.estoque} un.`}</Badge>
        </div>)}</div>:<div style={{padding:32,textAlign:'center',color:C.success,fontSize:13,fontWeight:600}}>✓ Todos os produtos OK</div>}
      </div>
    </div>
    {movimentacoes.length>0&&<div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
      <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`}}><h2 style={{fontSize:14,fontWeight:700,color:C.fg,margin:0}}>Últimas Movimentações</h2></div>
      <TC><TH_ cols={[{label:'Produto'},{label:'Tipo'},{label:'Qtd',right:true},{label:'Valor',right:true},{label:'Lucro',right:true},{label:'Data',right:true}]}/>
      <tbody>{movimentacoes.slice(0,8).map(m=><TR_ key={m.id}>
        <TD_>{m.produto}</TD_>
        <td style={{padding:'10px 20px'}}><Badge color={m.tipo==='entrada'?C.success:C.destructive} bg={m.tipo==='entrada'?C.successBg:C.destBg}>{m.tipo==='entrada'?'↓ Entrada':'↑ Saída'}</Badge></td>
        <TD_ right>{m.qtd}</TD_><TD_ right>{fmt(m.valor)}</TD_>
        <td style={{padding:'10px 20px',textAlign:'right',color:m.tipo==='saida'?C.success:C.muted,fontWeight:m.tipo==='saida'?600:400}}>{m.tipo==='saida'?fmt(m.lucroTotal):'—'}</td>
        <TD_ right muted>{fmtDate(m.data)}</TD_>
      </TR_>)}</tbody></TC>
    </div>}
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// PRODUTOS PAGE
// ═══════════════════════════════════════════════════════════════════
function ProdutosPage({produtos,setProdutos,fornecedores,categorias,setCategorias,setMovimentacoes,movimentacoes}:{produtos:Produto[];setProdutos:React.Dispatch<React.SetStateAction<Produto[]>>;fornecedores:Fornecedor[];categorias:string[];setCategorias:React.Dispatch<React.SetStateAction<string[]>>;setMovimentacoes:React.Dispatch<React.SetStateAction<Movimentacao[]>>;movimentacoes:Movimentacao[]}){
  const [busca,setBusca]=useState('');const [fCat,setFCat]=useState('');const [fSt,setFSt]=useState('');
  const [pagina,setPagina]=useState(1);
  const [modal,setModal]=useState<Partial<Produto>|null|false>(false);const [mCat,setMCat]=useState(false);const [nCat,setNCat]=useState('');
  // Categorias do filtro = só as que existem nos produtos cadastrados
  const catsNoFiltro=useMemo(()=>{const s=new Set(produtos.map(p=>p.categoria).filter(Boolean));return Array.from(s).sort()},[produtos]);
  const cats=useMemo(()=>{const b=[...CATS_PADRAO];categorias.forEach(c=>{if(!b.includes(c))b.push(c)});return b.sort()},[categorias]);
  const filtrados=useMemo(()=>{setPagina(1);return produtos.filter(p=>{
    const mb=!busca||p.nome.toLowerCase().includes(busca.toLowerCase())||p.code.toLowerCase().includes(busca.toLowerCase())||p.categoria.toLowerCase().includes(busca.toLowerCase())||(p.codigoBarras??'').includes(busca);
    return mb&&(!fCat||p.categoria===fCat)&&(!fSt||(fSt==='baixo'?p.estoque<=p.estoqueMin:p.estoque>p.estoqueMin));
  })},[produtos,busca,fCat,fSt]);
  const paginados=useMemo(()=>filtrados.slice((pagina-1)*POR_PAGINA,pagina*POR_PAGINA),[filtrados,pagina]);
  const salvar=(p:Produto)=>{
    const isNovo=!produtos.find(x=>x.id===p.id);
    setProdutos(prev=>isNovo?[p,...prev]:prev.map(x=>x.id===p.id?p:x));
    // Se for produto novo com estoque inicial > 0, registrar entrada automática
    if(isNovo&&p.estoque>0){
      const mov:Movimentacao={id:Date.now(),produtoId:p.id,produto:p.nome,tipo:'entrada',qtd:p.estoque,valor:p.estoque*p.precoCompra,lucroTotal:0,data:new Date().toISOString().split('T')[0],observacao:'Estoque inicial (cadastro do produto)'};
      setMovimentacoes(prev=>[mov,...prev]);
    }
    setModal(false);
  };
  const excluir=async(id:number)=>{
    const hist=movimentacoes?.filter((m:Movimentacao)=>m.produtoId===id)??[];
    if(hist.length>0){
      const ok=await showConfirm(`Este produto tem ${hist.length} movimentação(ões) no histórico.\n\nExcluir o produto NÃO apaga o histórico — os registros ficarão com o nome do produto, mas sem vínculo.\n\nDeseja excluir mesmo assim?`);
      if(!ok)return;
    } else {
      const ok=await showConfirm('Excluir este produto?\nEsta ação não pode ser desfeita.');
      if(!ok)return;
    }
    setProdutos(prev=>prev.filter(p=>p.id!==id));
  };
  const expCSV=()=>{exportCSV([['Código','Nome','Categoria','Fornecedor','Custo','Venda','Margem%','Estoque','EstMin','Status','Lote','Validade','CódBarras'],...filtrados.map(p=>{const f=fornecedores.find(x=>x.id===p.fornecedorId);const m=p.precoVenda>0?((p.precoVenda-p.precoCompra)/p.precoVenda*100).toFixed(1):'0';return[p.code,p.nome,p.categoria,f?.nome??'',p.precoCompra.toFixed(2),p.precoVenda.toFixed(2),m,String(p.estoque),String(p.estoqueMin),p.estoque<=p.estoqueMin?'Baixo':'OK',p.lote??'',p.validade??'',p.codigoBarras??'']})],`produtos-${new Date().toISOString().split('T')[0]}.csv`)};
  const addCat=async()=>{const n=nCat.trim();if(!n)return;if(cats.includes(n)){await showAlert('Esta categoria já existe.');return}setCategorias(prev=>[...prev,n]);setNCat('');setMCat(false)};
  const sel:React.CSSProperties={background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 12px',color:C.fg,fontSize:13,outline:'none'};
  return <div style={{animation:'fadeIn 0.4s ease-out'}}>
    {modal!==false&&<ModalProduto produto={modal} onClose={()=>setModal(false)} onSave={salvar} categorias={cats} fornecedores={fornecedores}/>}
    {mCat&&<Modal_ title="Nova Categoria" onClose={()=>setMCat(false)} width={380}>
      <div style={{marginBottom:16}}><MI label="Nome da Categoria" value={nCat} onChange={setNCat}/></div>
      <div style={{marginBottom:20,display:'flex',flexWrap:'wrap',gap:6}}>{cats.map(c=><span key={c} style={{padding:'4px 10px',background:C.accent,borderRadius:99,fontSize:11,color:C.muted}}>{c}</span>)}</div>
      <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}><Btn variant="ghost" onClick={()=>setMCat(false)}>Cancelar</Btn><Btn variant="primary" onClick={addCat}>Adicionar</Btn></div>
    </Modal_>}
    <PH title="Produtos" subtitle="Gerencie seu catálogo de produtos">
      <Btn variant="ghost" small onClick={()=>setMCat(true)}>🏷 Categorias</Btn>
      <Btn variant="ghost" small onClick={expCSV}>⬇ CSV</Btn>
      <Btn variant="primary" onClick={()=>setModal({})}>+ Novo Produto</Btn>
    </PH>
    <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
      <SI value={busca} onChange={setBusca} placeholder="Nome, SKU, código de barras..."/>
      <select value={fCat} onChange={e=>setFCat(e.target.value)} style={sel}><option value="">Todas as categorias</option>{catsNoFiltro.map(c=><option key={c} value={c}>{c}</option>)}</select>
      <select value={fSt} onChange={e=>setFSt(e.target.value)} style={sel}><option value="">Todos os status</option><option value="ok">OK</option><option value="baixo">Estoque Baixo</option></select>
      <span style={{fontSize:12,color:C.muted,marginLeft:'auto'}}>{filtrados.length} produto(s)</span>
    </div>
    <TC><TH_ cols={[{label:'Código'},{label:'Produto'},{label:'Categoria'},{label:'Fornecedor'},{label:'Custo',right:true},{label:'Venda',right:true},{label:'Margem',right:true},{label:'Estoque',right:true},{label:'Status'},{label:'Ações'}]}/>
    <tbody>{paginados.map(p=>{
      const baixo=p.estoque<=p.estoqueMin;const margem=p.precoVenda>0?((p.precoVenda-p.precoCompra)/p.precoVenda)*100:0;const forn=fornecedores.find(f=>f.id===p.fornecedorId);
      return <TR_ key={p.id}>
        <TD_ mono muted>{p.code}</TD_>
        <td style={{padding:'12px 20px'}}>
          <div style={{fontWeight:600,color:C.fg,fontSize:13}}>{p.nome}</div>
          {(p.lote||p.validade||p.codigoBarras)&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{p.codigoBarras&&`🔖 ${p.codigoBarras}`}{p.lote&&` · Lote: ${p.lote}`}{p.validade&&` · Val: ${p.validade}`}</div>}
        </td>
        <TD_ muted>{p.categoria}</TD_><TD_ muted>{forn?.nome??'—'}</TD_>
        <TD_ right>{fmt(p.precoCompra)}</TD_><TD_ right>{fmt(p.precoVenda)}</TD_>
        <td style={{padding:'12px 20px',textAlign:'right'}}><span style={{color:margem>=30?C.success:margem>=10?C.warning:C.destructive,fontWeight:700,fontSize:13}}>{fmtPct(margem)}</span></td>
        <td style={{padding:'12px 20px',textAlign:'right'}}><span style={{fontWeight:700,color:p.estoque===0?C.destructive:C.fg}}>{p.estoque}</span><span style={{color:C.muted,fontSize:11}}> / {p.estoqueMin}</span></td>
        <td style={{padding:'12px 20px'}}><Badge color={baixo?C.destructive:C.success} bg={baixo?C.destBg:C.successBg}>{p.estoque===0?'ZERADO':baixo?'Baixo':'OK'}</Badge></td>
        <td style={{padding:'12px 20px'}}><div style={{display:'flex',gap:4}}>
          <IBtn title="Editar" hc={C.fg} hbg={C.accent} onClick={()=>setModal(p)}>✏️</IBtn>
          <IBtn title="Excluir" hc={C.destructive} hbg={C.destBg} onClick={()=>excluir(p.id)}>🗑️</IBtn>
        </div></td>
      </TR_>
    })}</tbody></TC>
    <Paginacao total={filtrados.length} pagina={pagina} setPagina={setPagina}/>
    {filtrados.length===0&&<Empty_ msg={produtos.length===0?'Nenhum produto cadastrado. Clique em "+ Novo Produto" para começar.':'Nenhum resultado encontrado.'}/>}
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// MOVIMENTAÇÕES PAGE
// ═══════════════════════════════════════════════════════════════════
function MovimentacoesPage({produtos,setProdutos,movimentacoes,setMovimentacoes}:{produtos:Produto[];setProdutos:React.Dispatch<React.SetStateAction<Produto[]>>;movimentacoes:Movimentacao[];setMovimentacoes:React.Dispatch<React.SetStateAction<Movimentacao[]>>}){
  const [tipo,setTipo]=useState<'entrada'|'saida'>('entrada');const [pid,setPid]=useState('');const [qtd,setQtd]=useState('');const [obs,setObs]=useState('');
  const [busca,setBusca]=useState('');const [fTipo,setFTipo]=useState('');const [fDataDe,setFDataDe]=useState('');const [fDataAte,setFDataAte]=useState('');const [erro,setErro]=useState('');const [ok,setOk]=useState('');const [paginaMov,setPaginaMov]=useState(1);
  const prod=useMemo(()=>produtos.find(p=>String(p.id)===pid),[produtos,pid]);
  const registrar=()=>{
    setErro('');
    if(!pid){setErro('Selecione um produto.');return}
    if(!qtd||Number(qtd)<=0){setErro('Quantidade inválida.');return}
    if(!prod)return;const q=Number(qtd);
    if(tipo==='saida'&&prod.estoque<q){setErro(`Estoque insuficiente. Disponível: ${prod.estoque} un.`);return}
    const mov:Movimentacao={id:Date.now(),produtoId:prod.id,produto:prod.nome,tipo,qtd:q,valor:tipo==='entrada'?q*prod.precoCompra:q*prod.precoVenda,lucroTotal:tipo==='saida'?q*(prod.precoVenda-prod.precoCompra):0,data:new Date().toISOString().split('T')[0],observacao:obs.trim()||undefined};
    setMovimentacoes(prev=>[mov,...prev]);
    setProdutos(prev=>prev.map(p=>p.id===prod.id?{...p,estoque:Math.max(0,p.estoque+(tipo==='entrada'?q:-q))}:p));
    setOk(`${tipo==='entrada'?'Entrada':'Saída'} de ${q}x "${prod.nome}" registrada!`);setTimeout(()=>setOk(''),4000);
    setPid('');setQtd('');setObs('');
  };
  const excluirMov=async(m:Movimentacao)=>{
    const ok=await showConfirm(`Excluir esta movimentação?\n\nIsso irá ${m.tipo==='entrada'?'remover':'devolver'} ${m.qtd} un. do estoque de "${m.produto}".`);
    if(!ok)return;
    setProdutos(prev=>prev.map(p=>p.id===m.produtoId?{...p,estoque:Math.max(0,p.estoque+(m.tipo==='entrada'?-m.qtd:m.qtd))}:p));
    setMovimentacoes(prev=>prev.filter(x=>x.id!==m.id));
    setOk('Movimentação excluída e estoque atualizado.');setTimeout(()=>setOk(''),4000);
  };
  const filtradas=useMemo(()=>movimentacoes.filter(m=>{
    const matchBusca=!busca||m.produto.toLowerCase().includes(busca.toLowerCase());
    const matchTipo=!fTipo||m.tipo===fTipo;
    const matchDe=!fDataDe||m.data>=fDataDe;
    const matchAte=!fDataAte||m.data<=fDataAte;
    return matchBusca&&matchTipo&&matchDe&&matchAte;
  }),[movimentacoes,busca,fTipo,fDataDe,fDataAte]);
  // reset página quando filtro muda
  useEffect(()=>{setPaginaMov(1)},[busca,fTipo,fDataDe,fDataAte]);
  const paginadasMov=useMemo(()=>filtradas.slice((paginaMov-1)*POR_PAGINA,paginaMov*POR_PAGINA),[filtradas,paginaMov]);
  const inp:React.CSSProperties={background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:C.fg,fontSize:14,outline:'none'};
  return <div style={{animation:'fadeIn 0.4s ease-out'}}>
    <PH title="Movimentações" subtitle="Registre entradas e saídas do estoque"/>
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:24,marginBottom:24}}>
      <h2 style={{fontSize:14,fontWeight:700,color:C.fg,marginBottom:18}}>Nova Movimentação</h2>
      <div style={{display:'flex',flexWrap:'wrap',gap:14,alignItems:'flex-end'}}>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <Label_ c="Tipo"/>
          <div style={{display:'flex',gap:8}}>
            {(['entrada','saida'] as const).map(t=><button key={t} onClick={()=>setTipo(t)} style={{padding:'9px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700,border:`1px solid ${tipo===t?(t==='entrada'?C.success:C.destructive):C.border}`,background:tipo===t?(t==='entrada'?C.successBg:C.destBg):'transparent',color:tipo===t?(t==='entrada'?C.success:C.destructive):C.muted,transition:'all 0.2s'}}>{t==='entrada'?'↓ Entrada':'↑ Saída'}</button>)}
          </div>
        </div>
        <div style={{flex:1,minWidth:220,display:'flex',flexDirection:'column',gap:6}}>
          <Label_ c="Produto"/>
          <select value={pid} onChange={e=>setPid(e.target.value)} style={{...inp,width:'100%'}}>
            <option value="">Selecione...</option>{produtos.map(p=><option key={p.id} value={p.id}>{p.nome} (Estoque: {p.estoque})</option>)}
          </select>
        </div>
        <div style={{width:110,display:'flex',flexDirection:'column',gap:6}}><Label_ c="Quantidade"/><input type="number" value={qtd} onChange={e=>setQtd(e.target.value)} min={1} style={inp}/></div>
        <div style={{flex:1,minWidth:180,display:'flex',flexDirection:'column',gap:6}}><Label_ c="Observação (opcional)"/><input value={obs} onChange={e=>setObs(e.target.value)} style={inp} placeholder="NFe, fornecedor..."/></div>
        <Btn variant={tipo==='entrada'?'primary':'danger'} onClick={registrar}>✓ Registrar</Btn>
      </div>
      {prod&&qtd&&Number(qtd)>0&&<div style={{marginTop:16,padding:'12px 16px',background:C.bg,borderRadius:8,border:`1px solid ${C.border}`,display:'flex',gap:32,flexWrap:'wrap'}}>
        {[{l:'Produto',v:prod.nome},{l:'Estoque atual',v:`${prod.estoque} un.`},{l:'Após movimentação',v:`${Math.max(0,prod.estoque+(tipo==='entrada'?Number(qtd):-Number(qtd)))} un.`},{l:'Valor total',v:fmt(Number(qtd)*prod.precoVenda)},...(tipo==='saida'?[{l:'Lucro estimado',v:fmt(Number(qtd)*(prod.precoVenda-prod.precoCompra))}]:[])].map(({l,v})=><div key={l}><div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:C.fg}}>{v}</div></div>)}
      </div>}
      {erro&&<div style={{marginTop:12,padding:'10px 14px',background:C.destBg,border:`1px solid ${C.destBdr}`,borderRadius:8,fontSize:13,color:C.destructive,fontWeight:600}}>⚠ {erro}</div>}
      {ok&&<div style={{marginTop:12,padding:'10px 14px',background:C.successBg,border:`1px solid ${C.successBdr}`,borderRadius:8,fontSize:13,color:C.success,fontWeight:600}}>✓ {ok}</div>}
    </div>
    <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 18px',marginBottom:16,display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
      <div style={{display:'flex',flexDirection:'column',gap:5,flex:1,minWidth:180}}>
        <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Produto</label>
        <SI value={busca} onChange={setBusca} placeholder="Filtrar por produto..."/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Tipo</label>
        <select value={fTipo} onChange={e=>setFTipo(e.target.value)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:C.fg,fontSize:13,outline:'none'}}>
          <option value="">Todos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option>
        </select>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Data de</label>
        <input type="date" value={fDataDe} onChange={e=>setFDataDe(e.target.value)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:fDataDe?C.fg:C.muted,fontSize:13,outline:'none'}}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        <label style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Data até</label>
        <input type="date" value={fDataAte} onChange={e=>setFDataAte(e.target.value)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'9px 12px',color:fDataAte?C.fg:C.muted,fontSize:13,outline:'none'}}/>
      </div>
      {(busca||fTipo||fDataDe||fDataAte)&&<Btn variant="ghost" small onClick={()=>{setBusca('');setFTipo('');setFDataDe('');setFDataAte('')}}>✕ Limpar</Btn>}
      <span style={{marginLeft:'auto',fontSize:12,color:C.muted,alignSelf:'center'}}>{filtradas.length} registro(s)</span>
    </div>
    <TC><TH_ cols={[{label:'Produto'},{label:'Tipo'},{label:'Qtd',right:true},{label:'Valor',right:true},{label:'Lucro',right:true},{label:'Observação'},{label:'Data',right:true},{label:'Excluir'}]}/>
    <tbody>{paginadasMov.map(m=><TR_ key={m.id}>
      <TD_>{m.produto}</TD_>
      <td style={{padding:'12px 20px'}}><Badge color={m.tipo==='entrada'?C.success:C.destructive} bg={m.tipo==='entrada'?C.successBg:C.destBg}>{m.tipo==='entrada'?'↓ Entrada':'↑ Saída'}</Badge></td>
      <TD_ right>{m.qtd}</TD_><TD_ right>{fmt(m.valor)}</TD_>
      <td style={{padding:'12px 20px',textAlign:'right',color:m.tipo==='saida'?C.success:C.muted,fontWeight:m.tipo==='saida'?600:400}}>{m.tipo==='saida'?fmt(m.lucroTotal):'—'}</td>
      <TD_ muted>{m.observacao??'—'}</TD_><TD_ right muted>{fmtDate(m.data)}</TD_>
      <td style={{padding:'12px 20px'}}>
        <IBtn title="Excluir movimentação" hc={C.destructive} hbg={C.destBg} onClick={()=>excluirMov(m)}>🗑️</IBtn>
      </td>
    </TR_>)}</tbody></TC>
    <Paginacao total={filtradas.length} pagina={paginaMov} setPagina={setPaginaMov}/>
    {filtradas.length===0&&<Empty_ msg={movimentacoes.length===0?'Nenhuma movimentação registrada ainda.':'Sem resultados.'}/>}
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// FORNECEDORES PAGE
// ═══════════════════════════════════════════════════════════════════
function FornecedoresPage({fornecedores,setFornecedores,produtos}:{fornecedores:Fornecedor[];setFornecedores:React.Dispatch<React.SetStateAction<Fornecedor[]>>;produtos:Produto[]}){
  const [busca,setBusca]=useState('');const [modal,setModal]=useState<Partial<Fornecedor>|null|false>(false);const [det,setDet]=useState<Fornecedor|null>(null);
  const filtrados=useMemo(()=>fornecedores.filter(f=>!busca||f.nome.toLowerCase().includes(busca.toLowerCase())||f.cnpj.includes(busca)||f.email.toLowerCase().includes(busca.toLowerCase())),[fornecedores,busca]);
  const salvar=(f:Fornecedor)=>{setFornecedores(prev=>prev.find(x=>x.id===f.id)?prev.map(x=>x.id===f.id?f:x):[f,...prev]);setModal(false)};
  const excluir=async(id:number)=>{if(produtos.filter(p=>p.fornecedorId===id).length>0){await showAlert('Fornecedor vinculado a produtos.\nRemova o vínculo antes de excluir.');return}const ok=await showConfirm('Excluir este fornecedor?\nEsta ação não pode ser desfeita.');if(!ok)return;setFornecedores(prev=>prev.filter(f=>f.id!==id))};
  const prods=(id:number)=>produtos.filter(p=>p.fornecedorId===id);
  return <div style={{animation:'fadeIn 0.4s ease-out'}}>
    {modal!==false&&<ModalFornecedor fornecedor={modal} onClose={()=>setModal(false)} onSave={salvar}/>}
    {det&&<Modal_ title={det.nome} onClose={()=>setDet(null)} width={500}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {[['CNPJ',det.cnpj||'—'],['Telefone',det.telefone||'—'],['E-mail',det.email||'—'],['Endereço',det.endereco||'—'],['Observações',det.observacoes||'—']].map(([l,v])=><div key={l}><div style={{fontSize:10,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>{l}</div><div style={{fontSize:14,color:C.fg}}>{v}</div></div>)}
        <div style={{paddingTop:16,borderTop:`1px solid ${C.border}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.muted,textTransform:'uppercase',marginBottom:10}}>Produtos vinculados ({prods(det.id).length})</div>
          {prods(det.id).length>0?<div style={{display:'flex',flexDirection:'column',gap:6}}>{prods(det.id).map(p=><div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:C.bg,borderRadius:8,fontSize:13}}><span style={{color:C.fg,fontWeight:500}}>{p.nome}</span><span style={{color:C.muted}}>{p.estoque} un.</span></div>)}</div>:<span style={{fontSize:13,color:C.muted}}>Nenhum</span>}
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}><Btn variant="ghost" onClick={()=>setDet(null)}>Fechar</Btn><Btn variant="primary" onClick={()=>{setDet(null);setModal(det)}}>Editar</Btn></div>
      </div>
    </Modal_>}
    <PH title="Fornecedores" subtitle="Gerencie fornecedores e parceiros comerciais"><Btn variant="primary" onClick={()=>setModal({})}>+ Novo Fornecedor</Btn></PH>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:24}}>
      <SmStat label="Total" value={String(fornecedores.length)} color={C.primary}/>
      <SmStat label="Produtos vinculados" value={String(produtos.filter(p=>p.fornecedorId!==null).length)} color={C.success}/>
      <SmStat label="Sem fornecedor" value={String(produtos.filter(p=>!p.fornecedorId).length)} color={C.warning}/>
    </div>
    <div style={{marginBottom:16}}><SI value={busca} onChange={setBusca} placeholder="Nome, CNPJ ou e-mail..."/></div>
    <TC><TH_ cols={[{label:'Fornecedor'},{label:'CNPJ'},{label:'Telefone'},{label:'E-mail'},{label:'Produtos',right:true},{label:'Ações'}]}/>
    <tbody>{filtrados.map(f=>{const q=prods(f.id).length;return <TR_ key={f.id} onClick={()=>setDet(f)}>
      <td style={{padding:'12px 20px'}}><div style={{fontWeight:600,color:C.fg}}>{f.nome}</div>{f.endereco&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>{f.endereco}</div>}</td>
      <TD_ muted>{f.cnpj||'—'}</TD_><TD_ muted>{f.telefone||'—'}</TD_><TD_ muted>{f.email||'—'}</TD_>
      <td style={{padding:'12px 20px',textAlign:'right'}}><span style={{fontWeight:700,color:q>0?C.success:C.muted}}>{q}</span></td>
      <td style={{padding:'12px 20px'}} onClick={e=>e.stopPropagation()}><div style={{display:'flex',gap:4}}>
        <IBtn title="Ver" hc={C.primary} hbg={C.primaryBg} onClick={()=>setDet(f)}>🔍</IBtn>
        <IBtn title="Editar" hc={C.fg} hbg={C.accent} onClick={()=>setModal(f)}>✏️</IBtn>
        <IBtn title="Excluir" hc={C.destructive} hbg={C.destBg} onClick={()=>excluir(f.id)}>🗑️</IBtn>
      </div></td>
    </TR_>})}</tbody></TC>
    {filtrados.length===0&&<Empty_ msg={fornecedores.length===0?'Nenhum fornecedor cadastrado ainda.':'Sem resultados.'}/>}
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// RELATÓRIOS PAGE
// ═══════════════════════════════════════════════════════════════════
function RelatoriosPage({produtos,movimentacoes,fornecedores,categorias,onRestaurar}:AppState&{onRestaurar:(s:AppState)=>void}){
  const agora=new Date();const [mes,setMes]=useState(agora.getMonth());const [ano,setAno]=useState(agora.getFullYear());const [msg,setMsg]=useState('');const fileRef=useRef<HTMLInputElement>(null);
  const movsPer=useMemo(()=>movimentacoes.filter(m=>{const d=new Date(m.data+'T12:00:00');return d.getMonth()===mes&&d.getFullYear()===ano}),[movimentacoes,mes,ano]);
  const saidas=movsPer.filter(m=>m.tipo==='saida');const entradas=movsPer.filter(m=>m.tipo==='entrada');
  const fatMes=saidas.reduce((a,m)=>a+m.valor,0);const lucroMes=saidas.reduce((a,m)=>a+m.lucroTotal,0);
  const ticket=saidas.length>0?fatMes/saidas.length:0;const margem=fatMes>0?(lucroMes/fatMes)*100:0;
  const chartDia=useMemo(()=>{const dias=new Date(ano,mes+1,0).getDate();return Array.from({length:dias},(_,i)=>{const dia=String(i+1).padStart(2,'0');const ds=`${ano}-${String(mes+1).padStart(2,'0')}-${dia}`;const ms2=saidas.filter(m=>m.data===ds);return{dia,faturamento:ms2.reduce((a,m)=>a+m.valor,0),lucro:ms2.reduce((a,m)=>a+m.lucroTotal,0)}}).filter(d=>d.faturamento>0)},[saidas,mes,ano]);
  const topProd=useMemo(()=>{const map:{[k:number]:{nome:string;qtd:number;fat:number;lucro:number}}={};saidas.forEach(m=>{if(!map[m.produtoId])map[m.produtoId]={nome:m.produto,qtd:0,fat:0,lucro:0};map[m.produtoId].qtd+=m.qtd;map[m.produtoId].fat+=m.valor;map[m.produtoId].lucro+=m.lucroTotal});return Object.values(map).sort((a,b)=>b.lucro-a.lucro).slice(0,10)},[saidas]);
  const anos=useMemo(()=>{const s=new Set<number>();movimentacoes.forEach(m=>s.add(new Date(m.data+'T12:00:00').getFullYear()));s.add(agora.getFullYear());return Array.from(s).sort((a,b)=>b-a)},[movimentacoes]);
  const expCSV_=()=>{exportCSV([['Data','Produto','Tipo','Qtd','Valor','Lucro','Obs'],...movsPer.map(m=>[fmtDate(m.data),m.produto,m.tipo==='entrada'?'Entrada':'Saída',String(m.qtd),m.valor.toFixed(2),m.lucroTotal.toFixed(2),m.observacao??''])],`relatorio-${MESES[mes].toLowerCase()}-${ano}.csv`)};
  const bkp=()=>{exportBackup({produtos,movimentacoes,fornecedores,categorias});setMsg('Backup exportado!');setTimeout(()=>setMsg(''),4000)};
  const rest=async(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const ok=await showConfirm('Isso substituirá TODOS os dados atuais.\n\nTem certeza que deseja continuar?');if(!ok){e.target.value='';return}restaurarBackup(f,s=>{onRestaurar(s);setMsg('Backup restaurado com sucesso!');setTimeout(()=>setMsg(''),4000)},async(msg:string)=>await showAlert(msg));e.target.value=''};
  const sel:React.CSSProperties={background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:'8px 14px',color:C.fg,fontSize:14,outline:'none'};
  return <div style={{animation:'fadeIn 0.4s ease-out'}}>
    <input type="file" accept=".json" ref={fileRef} style={{display:'none'}} onChange={rest}/>
    <PH title="Relatórios" subtitle="Análise financeira e exportação de dados">
      <Btn variant="ghost" small onClick={()=>fileRef.current?.click()}>⬆ Restaurar Backup</Btn>
      <Btn variant="ghost" small onClick={bkp}>⬇ Backup JSON</Btn>
      <Btn variant="primary" small onClick={expCSV_}>⬇ Exportar CSV</Btn>
    </PH>
    {msg&&<div style={{marginBottom:20,padding:'12px 16px',background:C.successBg,border:`1px solid ${C.successBdr}`,borderRadius:8,fontSize:13,color:C.success,fontWeight:600}}>✓ {msg}</div>}
    <div style={{display:'flex',gap:12,marginBottom:24,alignItems:'center',background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 20px'}}>
      <span style={{fontSize:13,color:C.muted,fontWeight:600}}>Período:</span>
      <select value={mes} onChange={e=>setMes(Number(e.target.value))} style={sel}>{MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
      <select value={ano} onChange={e=>setAno(Number(e.target.value))} style={sel}>{anos.map(a=><option key={a} value={a}>{a}</option>)}</select>
      <span style={{marginLeft:'auto',fontSize:13,color:C.muted}}>{movsPer.length} movimentação(ões)</span>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:14,marginBottom:24}}>
      {[{l:'Faturamento',v:fmt(fatMes),c:C.primary},{l:'Lucro',v:fmt(lucroMes),c:C.success},{l:'Margem',v:fmtPct(margem),c:margem>=30?C.success:margem>=10?C.warning:C.destructive},{l:'Ticket Médio',v:fmt(ticket),c:C.warning},{l:'Itens Saídos',v:`${saidas.reduce((a,m)=>a+m.qtd,0)} un.`,c:C.chart[2]},{l:'Itens Entrados',v:`${entradas.reduce((a,m)=>a+m.qtd,0)} un.`,c:C.chart[0]}].map(({l,v,c})=><SmStat key={l} label={l} value={v} color={c}/>)}
    </div>
    {chartDia.length>0&&<div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:20,marginBottom:24}}>
      <h2 style={{fontSize:15,fontWeight:600,color:C.fg,marginBottom:4}}>Faturamento & Lucro por Dia — {MESES[mes]}/{ano}</h2>
      <p style={{fontSize:12,color:C.muted,marginBottom:16}}>Apenas dias com movimentações</p>
      <ResponsiveContainer width="100%" height={210}><BarChart data={chartDia} barSize={12}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
        <XAxis dataKey="dia" tick={{fill:C.muted,fontSize:11}} tickLine={false} axisLine={false}/>
        <YAxis tick={{fill:C.muted,fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>fmt(v).replace('R$\xa0','')}/>
        <Tooltip contentStyle={TIP} formatter={(v:any)=>fmt(v)}/>
        <Bar dataKey="faturamento" fill={C.chart[0]} name="Faturamento" radius={[4,4,0,0]}/>
        <Bar dataKey="lucro" fill={C.chart[1]} name="Lucro" radius={[4,4,0,0]}/>
      </BarChart></ResponsiveContainer>
    </div>}
    {topProd.length>0&&<div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden',marginBottom:24}}>
      <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`}}><h2 style={{fontSize:14,fontWeight:700,color:C.fg,margin:0}}>Top Produtos — {MESES[mes]}/{ano}</h2></div>
      <TC><TH_ cols={[{label:'#'},{label:'Produto'},{label:'Qtd',right:true},{label:'Faturamento',right:true},{label:'Lucro',right:true},{label:'Margem',right:true}]}/>
      <tbody>{topProd.map((p,i)=>{const m=p.fat>0?(p.lucro/p.fat)*100:0;return <TR_ key={p.nome}>
        <td style={{padding:'10px 20px',color:C.muted,fontSize:13,fontWeight:700}}>#{i+1}</td>
        <TD_>{p.nome}</TD_><TD_ right>{p.qtd}</TD_><TD_ right>{fmt(p.fat)}</TD_>
        <td style={{padding:'12px 20px',textAlign:'right',color:C.success,fontWeight:700}}>{fmt(p.lucro)}</td>
        <td style={{padding:'12px 20px',textAlign:'right',color:m>=30?C.success:m>=10?C.warning:C.destructive,fontWeight:700}}>{m.toFixed(1)}%</td>
      </TR_>})}</tbody></TC>
    </div>}
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden'}}>
      <div style={{padding:'16px 20px',borderBottom:`1px solid ${C.border}`}}><h2 style={{fontSize:14,fontWeight:700,color:C.fg,margin:0}}>Movimentações — {MESES[mes]}/{ano} <span style={{fontSize:12,color:C.muted,fontWeight:400}}>({movsPer.length} registros)</span></h2></div>
      {movsPer.length>0?<TC><TH_ cols={[{label:'Data',right:true},{label:'Produto'},{label:'Tipo'},{label:'Qtd',right:true},{label:'Valor',right:true},{label:'Lucro',right:true},{label:'Obs.'}]}/>
      <tbody>{movsPer.map(m=><TR_ key={m.id}>
        <TD_ right muted>{fmtDate(m.data)}</TD_><TD_>{m.produto}</TD_>
        <td style={{padding:'12px 20px'}}><Badge color={m.tipo==='entrada'?C.success:C.destructive} bg={m.tipo==='entrada'?C.successBg:C.destBg}>{m.tipo==='entrada'?'↓ Entrada':'↑ Saída'}</Badge></td>
        <TD_ right>{m.qtd}</TD_><TD_ right>{fmt(m.valor)}</TD_>
        <td style={{padding:'12px 20px',textAlign:'right',color:m.tipo==='saida'?C.success:C.muted,fontWeight:m.tipo==='saida'?600:400}}>{m.tipo==='saida'?fmt(m.lucroTotal):'—'}</td>
        <TD_ muted>{m.observacao??'—'}</TD_>
      </TR_>)}</tbody></TC>:<Empty_ msg={`Nenhuma movimentação em ${MESES[mes]}/${ano}.`}/>}
    </div>
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// MANUAL PAGE
// ═══════════════════════════════════════════════════════════════════
function ManualPage(){
  const sections=[
    {icon:'📦',title:'Cadastrando Produtos',color:C.primary,bg:C.primaryBg,bdr:C.primaryBdr,steps:[
      'Clique em "Produtos" no menu lateral.',
      'Clique no botão "+ Novo Produto" no canto superior direito.',
      'Preencha o nome do produto (obrigatório) e o preço de venda (obrigatório).',
      'Informe o preço de custo para que a margem de lucro seja calculada automaticamente.',
      'Em "Qtd. Estoque", coloque a quantidade atual que você tem em mãos.',
      'Em "Alerta de Estoque Baixo", coloque o número mínimo. Quando o estoque cair abaixo disso, um alerta vermelho aparecerá.',
      'A categoria é livre — escreva o que quiser (ex: Roupas, Alimentos, Eletrônicos).',
      'Clique em "✓ Salvar". O produto aparece na lista e a entrada inicial é registrada automaticamente.',
    ]},
    {icon:'🔄',title:'Registrando Movimentações',color:C.success,bg:C.successBg,bdr:C.successBdr,steps:[
      'Clique em "Movimentações" no menu lateral.',
      'Selecione o tipo: "↓ Entrada" (produto chegou ao estoque) ou "↑ Saída" (produto foi vendido/retirado).',
      'Escolha o produto na lista suspensa.',
      'Informe a quantidade.',
      'Opcionalmente, adicione uma observação (ex: número da NF, nome do cliente).',
      'Clique em "✓ Registrar". O estoque do produto é atualizado automaticamente.',
      'Para excluir uma movimentação por engano, clique no ícone 🗑️ na linha. O estoque será revertido automaticamente.',
    ]},
    {icon:'🏢',title:'Gerenciando Fornecedores',color:C.warning,bg:C.warnBg,bdr:C.warnBdr,steps:[
      'Clique em "Fornecedores" no menu lateral.',
      'Clique em "+ Novo Fornecedor" e preencha os dados (nome é obrigatório).',
      'Após cadastrar, vincule o fornecedor ao produto editando o produto e selecionando o fornecedor no campo "Fornecedor".',
      'Para ver os produtos de um fornecedor, clique na linha dele na tabela.',
      'Fornecedores vinculados a produtos não podem ser excluídos — remova o vínculo primeiro.',
    ]},
    {icon:'📊',title:'Usando os Relatórios',color:C.chart[2],bg:'rgba(160,100,220,0.12)',bdr:'rgba(160,100,220,0.3)',steps:[
      'Clique em "Relatórios" no menu lateral.',
      'Selecione o mês e ano desejado para analisar o período.',
      'Veja o faturamento, lucro, margem, ticket médio e quantidade de itens vendidos.',
      'O gráfico de barras mostra o faturamento e lucro dia a dia.',
      'A tabela "Top Produtos" mostra os itens mais lucrativos do período.',
      'Clique em "⬇ Exportar CSV" para baixar os dados em planilha (Excel/Google Sheets).',
      'Use "⬇ Backup JSON" para salvar todos os dados do sistema em um arquivo.',
      'Para restaurar um backup, clique em "⬆ Restaurar Backup" e selecione o arquivo .json salvo anteriormente.',
    ]},
    {icon:'⚠️',title:'Alertas de Estoque Baixo',color:C.destructive,bg:C.destBg,bdr:C.destBdr,steps:[
      'Cada produto tem um "Alerta de Estoque Baixo" configurável.',
      'Quando o estoque de um produto for menor ou igual ao valor do alerta, o status muda para "Baixo" em vermelho.',
      'O número vermelho na aba "Produtos" do menu mostra quantos produtos estão com estoque baixo.',
      'No Dashboard, a seção "Produtos para Repor" lista todos os itens que precisam de reposição.',
      'Para ajustar o valor do alerta, edite o produto (ícone ✏️) e altere o campo "Alerta de Estoque Baixo".',
    ]},
    {icon:'💾',title:'Backup e Segurança dos Dados',color:C.success,bg:C.successBg,bdr:C.successBdr,steps:[
      'Os dados são salvos automaticamente no computador onde o app está instalado.',
      'Faça backup regularmente: vá em Relatórios → "⬇ Backup JSON".',
      'Guarde o arquivo de backup em um local seguro (pendrive, e-mail, nuvem).',
      'Para transferir os dados para outro computador, instale o DonEstok e use "⬆ Restaurar Backup".',
      'ATENÇÃO: desinstalar o app pode apagar os dados. Sempre faça backup antes.',
    ]},
  ];
  return <div style={{animation:'fadeIn 0.4s ease-out'}}>
    <PH title="Manual de Uso" subtitle="Aprenda a utilizar todos os recursos do DonEstok"/>
    <div style={{background:C.primaryBg,border:`1px solid ${C.primaryBdr}`,borderRadius:12,padding:'18px 24px',marginBottom:28,display:'flex',gap:14,alignItems:'center'}}>
      <span style={{fontSize:28}}>💡</span>
      <div><div style={{fontWeight:700,color:C.fg,marginBottom:3}}>Dica Rápida</div>
      <div style={{color:C.muted,fontSize:13,lineHeight:1.6}}>Comece cadastrando seus fornecedores → depois os produtos → e então registre as movimentações de entrada e saída. O Dashboard e os Relatórios serão preenchidos automaticamente.</div></div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {sections.map(s=><div key={s.title} style={{background:C.card,borderRadius:14,border:`1px solid ${s.bdr}`,overflow:'hidden'}}>
        <div style={{padding:'16px 24px',background:s.bg,display:'flex',alignItems:'center',gap:12,borderBottom:`1px solid ${s.bdr}`}}>
          <span style={{fontSize:22}}>{s.icon}</span>
          <h2 style={{fontSize:15,fontWeight:700,color:s.color,margin:0}}>{s.title}</h2>
        </div>
        <div style={{padding:'16px 24px'}}>
          <ol style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:10}}>
            {s.steps.map((step,i)=><li key={i} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
              <span style={{minWidth:24,height:24,borderRadius:'50%',background:s.bg,border:`1px solid ${s.bdr}`,color:s.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0,marginTop:1}}>{i+1}</span>
              <span style={{color:C.muted,fontSize:13,lineHeight:1.65}}>{step}</span>
            </li>)}
          </ol>
        </div>
      </div>)}
    </div>
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// SOBRE PAGE
// ═══════════════════════════════════════════════════════════════════
function SobrePage(){
  const recursos=[
    '✅ Dashboard com KPIs em tempo real',
    '✅ Cadastro de produtos com alerta de estoque',
    '✅ Movimentações de entrada e saída',
    '✅ Gerenciamento de fornecedores',
    '✅ Relatórios mensais com gráficos',
    '✅ Exportação CSV e Backup JSON',
    '✅ Paginação e filtros avançados',
    '✅ Dados salvos localmente no PC',
  ];
  return <div style={{animation:'fadeIn 0.4s ease-out',maxWidth:700}}>
    <PH title="Sobre o DonEstok" subtitle="Informações do sistema e suporte"/>
    {/* Logo e nome */}
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.primaryBdr}`,padding:32,marginBottom:20,display:'flex',flexDirection:'column',alignItems:'center',gap:12,textAlign:'center'}}>
      <div style={{width:72,height:72,background:'#0f2460',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,boxShadow:'0 0 32px rgba(15,36,96,0.5)'}}>📦</div>
      <div>
        <div style={{fontSize:28,fontWeight:800,color:C.fg,letterSpacing:'-0.5px'}}>Don<span style={{color:'#4a90d9'}}>Estok</span></div>
        <div style={{fontSize:13,color:C.muted,marginTop:4}}>Sistema de Gestão de Estoque</div>
      </div>
      <div style={{display:'flex',gap:16,marginTop:8}}>
        <span style={{padding:'6px 16px',background:C.primaryBg,border:`1px solid ${C.primaryBdr}`,borderRadius:99,fontSize:12,fontWeight:700,color:C.primary}}>Versão 1.0.0</span>
        <span style={{padding:'6px 16px',background:C.successBg,border:`1px solid ${C.successBdr}`,borderRadius:99,fontSize:12,fontWeight:700,color:C.success}}>✓ Atualizado</span>
      </div>
    </div>
    {/* Desenvolvedor */}
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:24,marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:16}}>Desenvolvido por</div>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        <div style={{width:48,height:48,background:'linear-gradient(135deg,#1a3a8f,#4a90d9)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚡</div>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:'#4a90d9'}}>GHZ Plugin</div>
          <div style={{fontSize:13,color:C.muted,marginTop:2}}>Desenvolvimento de Software</div>
        </div>
      </div>
    </div>
    {/* Suporte */}
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:24,marginBottom:20}}>
      <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:16}}>Suporte & Contato</div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {[
          {icon:'💬',label:'WhatsApp',valor:'(11) 94898-1459'},
          {icon:'📧',label:'E-mail',valor:'GHZPLUGIN@GMAIL.COM'},
        ].map(({icon,label,valor})=><div key={label} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
          <span style={{fontSize:18}}>{icon}</span>
          <div><div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em'}}>{label}</div><div style={{fontSize:13,color:C.fg,fontWeight:500,marginTop:2}}>{valor}</div></div>
        </div>)}
      </div>
    </div>
    {/* Recursos */}
    <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:24}}>
      <div style={{fontSize:11,fontWeight:800,color:C.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:16}}>Recursos Incluídos</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {recursos.map(r=><div key={r} style={{fontSize:13,color:C.muted,padding:'6px 0'}}>{r}</div>)}
      </div>
      <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`,fontSize:12,color:C.muted,textAlign:'center'}}>
        © 2026 GHZ Plugin — Todos os direitos reservados. DonEstok v1.0.0
      </div>
    </div>
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE LICENÇA
// ═══════════════════════════════════════════════════════════════════
const SALT = 'GHZ2026DNSTK';

function gerarChave(n: number): string {
  const p1 = String(n).padStart(4,'0');
  const p2 = btoa(n + SALT).replace(/[^A-Z0-9]/gi,'').slice(0,4).toUpperCase();
  const p3 = String((n * 13) % 9999).padStart(4,'0');
  return `DNSTK-${p1}-${p2}-${p3}`;
}

function validarChave(key: string): boolean {
  const clean = key.trim().toUpperCase();
  const parts = clean.split('-');
  if(parts.length !== 4 || parts[0] !== 'DNSTK') return false;
  const n = parseInt(parts[1]);
  if(isNaN(n)) return false;
  return gerarChave(n) === clean;
}

function TelaLicenca({onAtivado}:{onAtivado:()=>void}){
  const [chave,setChave]=useState('');
  const [erro,setErro]=useState('');
  const [h,setH]=useState(false);
  const tentar=()=>{
    if(validarChave(chave)){
      localStorage.setItem('@DNSTK:licenca',chave.trim().toUpperCase());
      onAtivado();
    } else {
      setErro('Chave inválida. Verifique e tente novamente.');
      setTimeout(()=>setErro(''),3000);
    }
  };
  return <div style={{position:'fixed',inset:0,background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter',system-ui,sans-serif"}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>
    <div style={{width:420,background:'#1A1A1A',borderRadius:20,border:'1px solid #383838',padding:40,display:'flex',flexDirection:'column',alignItems:'center',gap:24}}>
      <div style={{width:72,height:72,background:'#0f2460',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,boxShadow:'0 0 40px rgba(15,36,96,0.6)'}}>📦</div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:26,fontWeight:800,color:'#F2F2F2',letterSpacing:'-0.5px'}}>Don<span style={{color:'#4a90d9'}}>Estok</span></div>
        <div style={{fontSize:13,color:'#A1A1A1',marginTop:6}}>Insira sua chave de licença para continuar</div>
      </div>
      <div style={{width:'100%',display:'flex',flexDirection:'column',gap:8}}>
        <label style={{fontSize:10,fontWeight:700,color:'#A1A1A1',textTransform:'uppercase',letterSpacing:'0.1em'}}>Chave de Licença</label>
        <input value={chave} onChange={e=>setChave(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&tentar()}
          placeholder="DNSTK-XXXX-XXXX-XXXX" maxLength={20}
          style={{background:'#111',border:`1px solid ${erro?'#E0142D':'#383838'}`,borderRadius:10,padding:'12px 16px',color:'#F2F2F2',fontSize:15,outline:'none',width:'100%',textAlign:'center',letterSpacing:'0.1em',fontFamily:'monospace',fontWeight:700,transition:'border-color 0.2s'}}/>
        {erro&&<div style={{fontSize:12,color:'#E0142D',fontWeight:600,textAlign:'center'}}>⚠ {erro}</div>}
      </div>
      <button onClick={tentar} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
        style={{width:'100%',padding:'13px',background:h?'#0f6ea8':'#1282C9',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',transition:'background 0.2s'}}>
        ✓ Ativar Licença
      </button>
      <div style={{textAlign:'center',borderTop:'1px solid #2F2F2F',paddingTop:16,width:'100%'}}>
        <div style={{fontSize:11,color:'#555'}}>Não tem uma chave?</div>
        <div style={{fontSize:12,color:'#4a90d9',marginTop:4,fontWeight:600}}>WhatsApp: (11) 94898-1459</div>
        <div style={{fontSize:10,color:'#555',marginTop:8,fontWeight:700,letterSpacing:'0.06em'}}>GHZ Plugin © 2026</div>
      </div>
    </div>
  </div>
}

// ═══════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════
export default function App(){
  const [licenciado,setLicenciado]=useState(()=>validarChave(localStorage.getItem('@DNSTK:licenca')??''));
  const [collapsed,setCollapsed]=useState(false);
  const [produtos,      setProdutos]      = useLS<Produto[]>('@EP2:produtos',[]);
  const [movimentacoes, setMovimentacoes] = useLS<Movimentacao[]>('@EP2:movs',[]);
  const [fornecedores,  setFornecedores]  = useLS<Fornecedor[]>('@EP2:fornecedores',[]);
  const [categorias,    setCategorias]    = useLS<string[]>('@EP2:categorias',[]);
  const restaurar=(s:AppState)=>{setProdutos(s.produtos);setMovimentacoes(s.movimentacoes);setFornecedores(s.fornecedores);setCategorias(s.categorias)};
  if(!licenciado) return <TelaLicenca onAtivado={()=>setLicenciado(true)}/>;
  return <HashRouter>
    <DialogProvider/>
    <div style={{display:'flex',height:'100vh',background:C.bg,color:C.fg,fontFamily:"'Inter',system-ui,sans-serif",overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(161,161,161,0.25);border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:rgba(161,161,161,0.45)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        select option{background:#262626;color:#F2F2F2}
        a{transition:background 0.2s,color 0.2s}
      `}</style>
      <Sidebar collapsed={collapsed} onToggle={()=>setCollapsed(c=>!c)} produtos={produtos}/>
      <main style={{flex:1,overflowY:'auto',padding:32}}>
        <Routes>
          <Route path="/" element={<Dashboard produtos={produtos} movimentacoes={movimentacoes}/>}/>
          <Route path="/produtos" element={<ProdutosPage produtos={produtos} setProdutos={setProdutos} fornecedores={fornecedores} categorias={categorias} setCategorias={setCategorias} setMovimentacoes={setMovimentacoes} movimentacoes={movimentacoes}/>}/>
          <Route path="/movimentacoes" element={<MovimentacoesPage produtos={produtos} setProdutos={setProdutos} movimentacoes={movimentacoes} setMovimentacoes={setMovimentacoes}/>}/>
          <Route path="/fornecedores" element={<FornecedoresPage fornecedores={fornecedores} setFornecedores={setFornecedores} produtos={produtos}/>}/>
          <Route path="/relatorios" element={<RelatoriosPage produtos={produtos} movimentacoes={movimentacoes} fornecedores={fornecedores} categorias={categorias} onRestaurar={restaurar}/>}/>
          <Route path="/manual" element={<ManualPage/>}/>
          <Route path="/sobre" element={<SobrePage/>}/>
          <Route path="*" element={<div style={{textAlign:'center',paddingTop:80,color:C.muted}}><div style={{fontSize:48,marginBottom:16}}>404</div><div>Página não encontrada</div></div>}/>
        </Routes>
      </main>
    </div>
  </HashRouter>
}

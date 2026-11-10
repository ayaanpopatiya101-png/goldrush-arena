/** Pure rendering/price definitions. No simulation modifiers or arbitrary SVG. */
export const MOTIFS = ['chevron','circuit','checker','sunburst','wave','facets','racing','crosshatch'] as const;
export const TEXTURES = ['none','etched','grain'] as const;
export const PADDLE_FINISHES = [
  {id:'default',name:'Classic',price:0,motif:'racing',base:'#F36B3F',ink:'#252A2B',accent:'#EEE9DE',density:3,texture:'etched'},
  {id:'plasma',name:'Plasma',price:150,motif:'chevron',base:'#B4533A',ink:'#EEE9DE',accent:'#EDBA3C',density:4,texture:'none'},
  {id:'frost',name:'Frost',price:150,motif:'facets',base:'#B7BFBE',ink:'#23344B',accent:'#EEE9DE',density:5,texture:'etched'},
  {id:'toxic',name:'Toxic',price:200,motif:'crosshatch',base:'#7F9065',ink:'#252A2B',accent:'#EDBA3C',density:5,texture:'grain'},
  {id:'void',name:'Void',price:250,motif:'circuit',base:'#77746D',ink:'#252A2B',accent:'#EEE9DE',density:4,texture:'none'},
  {id:'inferno',name:'Inferno',price:300,motif:'sunburst',base:'#C27E49',ink:'#252A2B',accent:'#EDBA3C',density:6,texture:'etched'},
  {id:'chrome',name:'Chrome',price:350,motif:'checker',base:'#D4D0C6',ink:'#575D5C',accent:'#EEE9DE',density:6,texture:'etched'},
  {id:'cosmic',name:'Cosmic',price:500,motif:'wave',base:'#A99572',ink:'#23344B',accent:'#EEE9DE',density:4,texture:'grain'},
  {id:'season_aurora',name:'Aurora',price:0,motif:'wave',base:'#B1BA91',ink:'#23344B',accent:'#EDBA3C',density:6,texture:'etched',exclusive:true},
  {id:'season_phantom',name:'Phantom',price:0,motif:'facets',base:'#9D998F',ink:'#252A2B',accent:'#EEE9DE',density:3,texture:'grain',exclusive:true},
] as const;
export type Artwork = {motif:typeof MOTIFS[number];base:string;ink:string;accent:string;density:number;texture:typeof TEXTURES[number]};
export function artworkFor(id:string): Artwork { return PADDLE_FINISHES.find(p=>p.id===id) ?? PADDLE_FINISHES[0]; }
export const THEME_FINISHES = [
  {id:'default',name:'Court Navy',price:0,floor:'#23344B',line:'#EEE9DE',motif:'plain'},
  {id:'solar',name:'Solar Flare',price:300,floor:'#572F27',line:'#EDBA3C',motif:'rings'},
  {id:'arctic',name:'Arctic Ice',price:300,floor:'#354F61',line:'#E3DFD3',motif:'lines'},
  {id:'toxic',name:'Foundry Moss',price:350,floor:'#394638',line:'#EDBA3C',motif:'lines'},
  {id:'cosmic',name:'Cosmic Brass',price:400,floor:'#453E36',line:'#EDBA3C',motif:'rings'},
  {id:'golden',name:'Gold Rush',price:500,floor:'#594824',line:'#EEE9DE',motif:'lines'},
  {id:'cobalt_court',name:'Cobalt Court',price:300,floor:'#23465A',line:'#A9D3D5',motif:'rings'},
] as const;
export const STRIKE_FINISHES = [
  {id:'default',name:'Standard impact',price:0,color:'#F36B3F',motif:'rays'},
  {id:'cobalt_strike',name:'Cobalt Strike',price:200,color:'#A9D3D5',motif:'rings'},
  {id:'brass_strike',name:'Brass Sparks',price:150,color:'#EDBA3C',motif:'rays'},
] as const;
export const COBALT_SET={id:'cobalt_set',name:'Cobalt matching set',items:['theme:cobalt_court','strike:cobalt_strike'],price:200} as const;
export function cosmeticItem(key:string){
  const [kind,id,...extra]=key.split(':');
  if(!id || extra.length)return undefined;
  const list: readonly {id:string;name:string;price:number;exclusive?:boolean}[]=kind==='skin'?PADDLE_FINISHES:kind==='theme'?THEME_FINISHES:kind==='strike'?STRIKE_FINISHES:[];
  return list.find(i=>i.id===id);
}
export function cobaltQuote(owned:readonly string[]){
  const remaining=COBALT_SET.items.filter(id=>!owned.includes(id));
  const separate=remaining.reduce((sum,id)=>sum+(cosmeticItem(id)?.price??0),0);
  // Prorate the real 60% set discount; never charge for owned pieces.
  const price=Math.round(separate*COBALT_SET.price/500);
  return {remaining,separate,price,savings:separate-price};
}

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Menu, X, ChevronDown, ChevronRight, ArrowRight, ArrowUpRight,
  Shield, Pill, Activity, Brain, GraduationCap, Building2, Star,
  Check, AlertTriangle, AlertCircle, Info, Users, Clock, Award,
  Lock, Zap, FileText, BarChart3, Microscope, ExternalLink,
  Calculator, Layers, Settings, Bookmark, Download, RefreshCw,
  Sparkles, BookOpen, Stethoscope, Heart, TrendingUp, FlaskConical,
  CircleCheck, Moon, Sun, ChevronUp, Filter, Hash, Beaker,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ── cn utility ─────────────────────────────────────────────────────────────
function cn(...classes: (string|undefined|null|false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ── Types ───────────────────────────────────────────────────────────────────
type Page = "home"|"disease"|"drug"|"guidelines"|"calculators"|"ai-assistant"|"cme"|"enterprise"|"pricing"|"about";
type EvidCls = "I"|"IIa"|"IIb"|"III";
type EvidLvl = "A"|"B"|"C";

interface AIRec  { cls:EvidCls; lvl:EvidLvl; org:string; text:string; }
interface AIDrug { name:string; cls:string; start:string; target:string; trial:string; evid:string; }
interface AISrc  { n:number; ref:string; grade:string; }
interface AImsg  {
  role:"user"|"ai"; text:string;
  summary?:string; recommendations?:AIRec[];
  drugs?:AIDrug[]; evidence?:string[]; sources?:AISrc[];
  confidence?:number;
}
interface ChaScores { chf:boolean; htn:boolean; age75:boolean; dm:boolean; stroke:boolean; vasc:boolean; age65:boolean; female:boolean; }

// ── Static data ─────────────────────────────────────────────────────────────
const DISEASES = [
  { name:"Heart Failure (HFrEF)",        icd:"I50.20", spec:"Cardiology",    grade:"I" as EvidCls, lvl:"A" as EvidLvl, prev:"26M worldwide",   tag:"Chronic" },
  { name:"Type 2 Diabetes Mellitus",     icd:"E11",    spec:"Endocrinology", grade:"I" as EvidCls, lvl:"A" as EvidLvl, prev:"537M worldwide",  tag:"Chronic" },
  { name:"Atrial Fibrillation",          icd:"I48",    spec:"Cardiology",    grade:"I" as EvidCls, lvl:"A" as EvidLvl, prev:"59M worldwide",   tag:"Arrhythmia" },
  { name:"Community-Acquired Pneumonia", icd:"J18.9",  spec:"Pulmonology",   grade:"I" as EvidCls, lvl:"B" as EvidLvl, prev:"450M/yr global",  tag:"Acute" },
  { name:"Chronic Kidney Disease",       icd:"N18",    spec:"Nephrology",    grade:"I" as EvidCls, lvl:"A" as EvidLvl, prev:"850M worldwide",  tag:"Chronic" },
  { name:"COPD",                         icd:"J44",    spec:"Pulmonology",   grade:"I" as EvidCls, lvl:"A" as EvidLvl, prev:"380M worldwide",  tag:"Chronic" },
];

const DRUGS_DATA = [
  {
    name:"Sacubitril/Valsartan", brand:"Entresto", cls:"ARNI", indication:"HFrEF (EF ≤40%)",
    dose:{ initial:"24/26 mg BID", target:"97/103 mg BID", renal:"Caution if eGFR <30", hepatic:"Avoid severe hepatic impairment" },
    contraindications:["History of angioedema with ACEi/ARB","Pregnancy","Concurrent ACEi (36-hr washout required)","Severe hepatic impairment (Child-Pugh C)"],
    blackBox:"Fetal toxicity — can cause fetal harm when administered to a pregnant woman. Discontinue immediately when pregnancy detected.",
    keyTrial:"PARADIGM-HF", nnt:"21 to prevent 1 CV death over 27 months",
    grade:"I" as EvidCls, lvl:"A" as EvidLvl,
  },
  {
    name:"Dapagliflozin", brand:"Farxiga", cls:"SGLT2 Inhibitor", indication:"HFrEF, T2DM, CKD",
    dose:{ initial:"10 mg once daily", target:"10 mg once daily", renal:"Hold if eGFR <20", hepatic:"No dose adjustment" },
    contraindications:["eGFR <20 mL/min/1.73m²","Active genital mycotic infection","Ketoacidosis risk states"],
    blackBox:null,
    keyTrial:"DAPA-HF", nnt:"19 to prevent 1 CV death/worsening HF over 18 months",
    grade:"I" as EvidCls, lvl:"A" as EvidLvl,
  },
];

const CALC_LIST = [
  { name:"CHA₂DS₂-VASc",   cat:"Cardiology",   desc:"Stroke risk in non-valvular AF",   uses:"6.2M/yr" },
  { name:"HEART Score",     cat:"Cardiology",   desc:"MACE risk in chest pain",          uses:"4.1M/yr" },
  { name:"Wells PE Score",  cat:"Pulmonology",  desc:"Pre-test probability for PE",       uses:"3.8M/yr" },
  { name:"CURB-65",         cat:"Pulmonology",  desc:"CAP severity & admission criteria", uses:"2.9M/yr" },
  { name:"GFR (CKD-EPI)",   cat:"Nephrology",   desc:"Estimated glomerular filtration rate",uses:"8.4M/yr" },
  { name:"MELD-Na Score",   cat:"Hepatology",   desc:"Liver disease severity & mortality",uses:"1.2M/yr" },
  { name:"NEWS2 Score",     cat:"Critical Care",desc:"National Early Warning Score 2",    uses:"5.6M/yr" },
  { name:"Child-Pugh",      cat:"Hepatology",   desc:"Cirrhosis severity classification", uses:"1.8M/yr" },
];

const GUIDE_ROWS = [
  { cat:"First-line agent", accha:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"ARNI (sacubitril/valsartan) preferred over ACEi" }, esc:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"ACEi first-line; ARNI if symptomatic despite ACEi" }, nice:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"ACEi first-line; ARNI if ACEi-intolerant" } },
  { cat:"Beta-blocker",     accha:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"Carvedilol, metoprolol succinate, or bisoprolol" },   esc:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"Bisoprolol, carvedilol, or extended-release metoprolol" }, nice:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"Bisoprolol or carvedilol preferred" } },
  { cat:"MRA",              accha:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"Spironolactone or eplerenone, eGFR >30" },            esc:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"Spironolactone/eplerenone for all HFrEF" },            nice:{ cls:"I" as EvidCls, lvl:"B" as EvidLvl, text:"Add if symptoms persist on ACEi + BB" } },
  { cat:"SGLT2 inhibitor",  accha:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"Dapagliflozin or empagliflozin regardless of T2DM" }, esc:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"Dapagliflozin or empagliflozin" },                  nice:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"Dapagliflozin — newly recommended 2023" } },
  { cat:"ICD",              accha:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"LVEF ≤35%, NYHA II-III, on GDMT ≥3 months" },        esc:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"LVEF ≤35%, symptomatic despite OMT" },                nice:{ cls:"I" as EvidCls, lvl:"A" as EvidLvl, text:"LVEF ≤35% on optimal medical therapy" } },
];

const TESTIMONIALS = [
  { name:"Dr. Sarah Chen, MD", role:"Interventional Cardiologist · Johns Hopkins Medicine", av:"SC", q:"MedEvidence AI has transformed guideline retrieval at point of care. The ACC/AHA vs ESC comparison saves 30 minutes per complex case — and the evidence grades give me confidence I am not missing a Class I recommendation." },
  { name:"Dr. James Okafor, MD, PhD", role:"Chief Medical Resident · UCSF Internal Medicine", av:"JO", q:"The structured AI responses are exactly what I need as a resident. Recommendations with inline evidence grades, drug tables, and key trials — it is like having a senior consultant available 24/7 for complex cases." },
  { name:"Dr. Priya Nair, MBBS FRCP", role:"Chief Medical Officer · Apollo Hospitals Group", av:"PN", q:"We deployed MedEvidence AI enterprise-wide across 14 hospitals. The local protocol integration, audit trails, and HIPAA compliance were critical for our JCI accreditation review. ROI was measurable in 90 days." },
];

const USAGE_STATS = [
  { m:"Jan",q:1.2 },{ m:"Feb",q:1.5 },{ m:"Mar",q:1.9 },
  { m:"Apr",q:2.1 },{ m:"May",q:2.4 },{ m:"Jun",q:2.7 },
];
const QUERY_ANALYTICS = [
  { m:"Jan",q:8200 },{ m:"Feb",q:9100 },{ m:"Mar",q:10800 },
  { m:"Apr",q:11200 },{ m:"May",q:12100 },{ m:"Jun",q:13400 },
];

const SEED_MSGS: AImsg[] = [
  { role:"user", text:"What are the current treatment recommendations for HFrEF?" },
  {
    role:"ai", text:"",
    summary:"Heart failure with reduced ejection fraction (HFrEF, LVEF ≤40%) is managed with guideline-directed medical therapy (GDMT) targeting neurohormonal blockade via a 'four-pillar' approach. Current 2022 ACC/AHA and 2021 ESC guidelines recommend simultaneous initiation of an ARNI, beta-blocker, mineralocorticoid receptor antagonist, and SGLT2 inhibitor in eligible patients, with each pillar demonstrating independent mortality benefit.",
    recommendations:[
      { cls:"I", lvl:"A", org:"ACC/AHA 2022", text:"Sacubitril/valsartan (ARNI) to reduce cardiovascular mortality and HF hospitalisation — preferred over ACEi in eligible patients (PARADIGM-HF: 20% RRR in primary outcome)" },
      { cls:"I", lvl:"A", org:"ACC/AHA 2022", text:"Evidence-based beta-blocker (carvedilol, metoprolol succinate, or bisoprolol) in clinically stable patients. Do not initiate during decompensated HF" },
      { cls:"I", lvl:"A", org:"ACC/AHA 2022", text:"Mineralocorticoid receptor antagonist (spironolactone or eplerenone) for NYHA class II–IV HFrEF with eGFR >30 and K⁺ <5.0 mEq/L" },
      { cls:"I", lvl:"A", org:"ACC/AHA 2022", text:"SGLT2 inhibitor (dapagliflozin 10 mg or empagliflozin 10 mg daily) regardless of T2DM status — reduces CV death and worsening HF" },
      { cls:"I", lvl:"C", org:"ACC/AHA 2022", text:"Loop diuretics (furosemide/torsemide) for relief of congestion; titrate to minimum effective dose to maintain euvolemia" },
    ],
    drugs:[
      { name:"Sacubitril/Valsartan", cls:"ARNI",          start:"24/26 mg BID",  target:"97/103 mg BID",     trial:"PARADIGM-HF", evid:"Class I-A" },
      { name:"Carvedilol",           cls:"Beta-blocker",   start:"3.125 mg BID",  target:"25 mg BID",         trial:"COPERNICUS",  evid:"Class I-A" },
      { name:"Spironolactone",       cls:"MRA",            start:"12.5–25 mg/day",target:"25–50 mg/day",      trial:"RALES",       evid:"Class I-A" },
      { name:"Dapagliflozin",        cls:"SGLT2 inhibitor",start:"10 mg once daily",target:"10 mg once daily",trial:"DAPA-HF",     evid:"Class I-A" },
      { name:"Furosemide",           cls:"Loop diuretic",  start:"20–40 mg/day",  target:"Titrate to euvolemia",trial:"—",          evid:"Class I-C" },
    ],
    evidence:[
      "PARADIGM-HF (2014, NEJM): Sacubitril/valsartan vs enalapril — 20% RRR in CV death/HF hospitalisation (HR 0.80; 95% CI 0.73–0.87; p<0.001); NNT=21 over 27 months",
      "DAPA-HF (2019, NEJM): Dapagliflozin vs placebo in HFrEF — 26% RRR in worsening HF/CV death (HR 0.74; 95% CI 0.65–0.85; p<0.001); benefit in non-diabetics confirmed",
      "EMPEROR-Reduced (2020, NEJM): Empagliflozin vs placebo — 25% RRR in CV death/HF hospitalisation (HR 0.75; 95% CI 0.65–0.86; p<0.001)",
      "RALES (1999, NEJM): Spironolactone vs placebo — 30% RRR in all-cause mortality (HR 0.70; 95% CI 0.60–0.82; p<0.001)",
    ],
    sources:[
      { n:1, ref:"2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure. JACC 2022;79(17):e263–e421. DOI:10.1016/j.jacc.2021.12.012", grade:"Guideline" },
      { n:2, ref:"2021 ESC Guidelines for the diagnosis and treatment of acute and chronic heart failure. Eur Heart J 2021;42(36):3599–3726. DOI:10.1093/eurheartj/ehab368", grade:"Guideline" },
      { n:3, ref:"McMurray JJV et al. Angiotensin–Neprilysin Inhibition versus Enalapril in Heart Failure. NEJM 2014;371:993–1004. DOI:10.1056/NEJMoa1409077", grade:"RCT" },
    ],
    confidence:96,
  },
];

const CME_COURSES = [
  { title:"2022 ACC/AHA Heart Failure Guidelines: What's New",            cat:"Cardiology",    cme:1.5, dur:"45 min",  level:"Intermediate", enrolled:4820 },
  { title:"SGLT2 Inhibitors Beyond Diabetes: Heart & Kidney Protection",  cat:"Cardiology",    cme:1.0, dur:"30 min",  level:"Intermediate", enrolled:6210 },
  { title:"Diagnosis and Management of Pulmonary Embolism",               cat:"Pulmonology",   cme:2.0, dur:"60 min",  level:"Advanced",     enrolled:3150 },
  { title:"ADA Standards of Medical Care in Diabetes 2024",               cat:"Endocrinology", cme:2.5, dur:"75 min",  level:"Intermediate", enrolled:8940 },
  { title:"KDIGO 2024 CKD Management Guidelines",                         cat:"Nephrology",    cme:1.5, dur:"45 min",  level:"Advanced",     enrolled:2680 },
  { title:"Antimicrobial Stewardship in Community-Acquired Pneumonia",    cat:"Infectious Disease",cme:1.0,dur:"30 min",level:"Foundational", enrolled:5320 },
];

const PRICING_PLANS = [
  {
    name:"Free", price:"$0", period:"forever", desc:"For medical students and residents exploring the platform.",
    features:["50 clinical queries/month","Basic disease summaries","Limited drug monographs","3 clinical calculators","Community support"],
    limits:["No guideline comparison","No AI structured responses","No CME credits"],
    cta:"Get started free", highlight:false,
  },
  {
    name:"Professional", price:"$49", period:"/month", desc:"For attending physicians and clinicians in practice.",
    features:["Unlimited clinical queries","Full AI structured responses","Complete drug database","All 340+ calculators","Guideline comparison engine","25 CME credits/year","Email support"],
    limits:[],
    cta:"Start 14-day free trial", highlight:true,
  },
  {
    name:"Enterprise", price:"Custom", period:"", desc:"For hospitals, health systems, and medical schools.",
    features:["Everything in Professional","Local formulary & protocol integration","SAML 2.0 / OIDC SSO","HIPAA BAA included","Dedicated customer success","Usage analytics & audit trails","FHIR R4 EHR integration","Unlimited CME credits","99.9% SLA"],
    limits:[],
    cta:"Contact sales", highlight:false,
  },
];

const BOARD_MEMBERS = [
  { name:"Prof. Eric J. Velazquez, MD", role:"Section Chief, Cardiovascular Medicine · Yale School of Medicine", specialty:"Heart Failure, Cardiac Imaging" },
  { name:"Dr. Kavitha Ramachandran, DM", role:"Director, Endocrinology · Christian Medical College Vellore", specialty:"Diabetes, Thyroid Disorders" },
  { name:"Prof. David R. Holmes, MD", role:"Emeritus Interventional Cardiologist · Mayo Clinic", specialty:"Interventional Cardiology, Structural Heart" },
  { name:"Dr. Anita Bhagat, MRCP PhD", role:"Consultant Nephrologist · Royal Free Hospital London", specialty:"CKD, Renal Transplantation" },
  { name:"Prof. Sunita Maheshwari, MD", role:"Head of Paediatric Cardiology · Fortis Escorts Heart Institute", specialty:"Congenital Heart Disease" },
  { name:"Dr. Mark T. Connelly, MD MPH", role:"Clinical Epidemiologist · Harvard Medical School", specialty:"Evidence Synthesis, Clinical Trials" },
];

// ── Micro-components ────────────────────────────────────────────────────────
const CLS_MAP: Record<EvidCls,string> = {
  "I":   "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-200",
  "IIa": "bg-blue-50 text-blue-700 border-blue-200 ring-blue-200",
  "IIb": "bg-amber-50 text-amber-700 border-amber-200 ring-amber-200",
  "III": "bg-red-50 text-red-700 border-red-200 ring-red-200",
};
const LVL_MAP: Record<EvidLvl,string> = {
  "A": "bg-slate-800 text-white",
  "B": "bg-slate-200 text-slate-700",
  "C": "bg-slate-100 text-slate-500",
};
const ORG_MAP: Record<string,string> = {
  "ACC/AHA":"bg-blue-50 text-blue-700","ACC/AHA 2022":"bg-blue-50 text-blue-700",
  "ESC":"bg-indigo-50 text-indigo-700","ESC 2021":"bg-indigo-50 text-indigo-700",
  "ADA":"bg-teal-50 text-teal-700","NICE":"bg-purple-50 text-purple-700",
  "WHO":"bg-sky-50 text-sky-700","IDSA":"bg-orange-50 text-orange-700",
  "KDIGO":"bg-cyan-50 text-cyan-700",
};

function EvidClass({ cls, sm }: { cls:EvidCls; sm?:boolean }) {
  return (
    <span className={cn("font-mono font-semibold border rounded px-1.5 py-0.5 leading-none", sm?"text-[10px]":"text-[11px]", CLS_MAP[cls])}>
      Class {cls}
    </span>
  );
}
function EvidLevel({ lvl, sm }: { lvl:EvidLvl; sm?:boolean }) {
  return (
    <span className={cn("font-mono font-semibold rounded px-1.5 py-0.5 leading-none", sm?"text-[10px]":"text-[11px]", LVL_MAP[lvl])}>
      Level {lvl}
    </span>
  );
}
function OrgBadge({ org }: { org:string }) {
  const c = ORG_MAP[org] ?? "bg-slate-100 text-slate-600";
  return <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", c)}>{org}</span>;
}
function Chip({ children, color="slate" }: { children:React.ReactNode; color?:string }) {
  const map: Record<string,string> = {
    slate:"bg-slate-100 text-slate-600", green:"bg-emerald-50 text-emerald-700",
    blue:"bg-blue-50 text-blue-700", amber:"bg-amber-50 text-amber-700",
    red:"bg-red-50 text-red-700", purple:"bg-purple-50 text-purple-700",
    navy:"bg-slate-800 text-slate-100",
  };
  return <span className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full", map[color]??map.slate)}>{children}</span>;
}
function AlertBox({ type="info", children }: { type?:"info"|"warning"|"danger"; children:React.ReactNode }) {
  const s = { info:{c:"bg-blue-50 border-blue-200 text-blue-800",i:<Info size={14}/>}, warning:{c:"bg-amber-50 border-amber-200 text-amber-800",i:<AlertTriangle size={14}/>}, danger:{c:"bg-red-50 border-red-200 text-red-800",i:<AlertCircle size={14}/>} };
  const { c, i } = s[type];
  return (
    <div className={cn("flex gap-2.5 p-3 rounded-lg border text-[12px] font-medium leading-relaxed", c)}>
      <span className="shrink-0 mt-0.5">{i}</span>
      <span>{children}</span>
    </div>
  );
}

function Counter({ to, suffix="" }: { to:number; suffix?:string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
      const t = setInterval(() => {
        start += step;
        if (start >= to) { setVal(to); clearInterval(t); } else setVal(start);
      }, 16);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ── Hero search bar ─────────────────────────────────────────────────────────
const PLACEHOLDERS = [
  "HFrEF treatment guidelines...",
  "Warfarin drug interactions...",
  "CHA₂DS₂-VASc score interpretation...",
  "Metformin in CKD: when to hold?",
  "SGLT2 inhibitors in heart failure...",
];

function HeroSearch({ onNav }: { onNav:(p:Page)=>void }) {
  const [val, setVal] = useState("");
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const SUGGESTIONS = ["HFrEF treatment algorithm","Atrial fibrillation anticoagulation","Sepsis management bundle","Hypertension treatment guidelines","Type 2 diabetes first-line therapy"];
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i+1)%PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative max-w-2xl mx-auto">
      <div className={cn("flex items-center gap-3 bg-white border shadow-sm rounded-xl px-4 py-3.5 transition-all", open||val?"border-accent shadow-accent/10 shadow-md":"border-border hover:border-slate-300")}>
        <Search size={18} className="text-muted-foreground shrink-0"/>
        <input
          value={val} onChange={e=>{setVal(e.target.value);setOpen(e.target.value.length>0);}}
          onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}
          onKeyDown={e=>{ if(e.key==="Enter"&&val.trim()){onNav("ai-assistant");setOpen(false);} }}
          placeholder={PLACEHOLDERS[idx]}
          className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground min-w-0"
        />
        {val && <button onClick={()=>{setVal("");setOpen(false);}} className="text-muted-foreground hover:text-foreground"><X size={15}/></button>}
        <button onClick={()=>onNav("ai-assistant")} className="shrink-0 bg-accent text-white text-[13px] font-semibold px-3.5 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">
          Search
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:4}} transition={{duration:0.15}}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-lg shadow-slate-200/60 overflow-hidden z-50">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Suggested queries</span>
            </div>
            {SUGGESTIONS.map((s,i) => (
              <button key={i} onMouseDown={()=>{setVal(s);setOpen(false);onNav("ai-assistant");}}
                className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-secondary text-[14px] text-foreground transition-colors">
                <Search size={13} className="text-muted-foreground shrink-0"/>
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Navigation ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { l:"Disease Hub",     p:"disease" as Page },
  { l:"Drug Database",   p:"drug" as Page },
  { l:"Guidelines",      p:"guidelines" as Page },
  { l:"Calculators",     p:"calculators" as Page },
  { l:"CME",             p:"cme" as Page },
];

function NavBar({ page, onNav, dark, setDark }: { page:Page; onNav:(p:Page)=>void; dark:boolean; setDark:(d:boolean)=>void }) {
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", fn); fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <>
      <nav className={cn("fixed top-0 left-0 right-0 z-40 transition-all duration-200 bg-white/95 backdrop-blur-sm", scrolled?"border-b border-border shadow-sm":"border-b border-transparent")}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-6">
            {/* Logo */}
            <button onClick={()=>onNav("home")} className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <Stethoscope size={14} className="text-white"/>
              </div>
              <span className="font-bold text-[16px] text-foreground" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                Med<span className="text-accent">Evidence</span>
                <sup className="text-[9px] font-semibold text-muted-foreground ml-0.5">AI</sup>
              </span>
            </button>
            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map(n=>(
                <button key={n.l} onClick={()=>onNav(n.p)}
                  className={cn("px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors", page===n.p?"bg-secondary text-foreground":"text-muted-foreground hover:text-foreground hover:bg-secondary/60")}>
                  {n.l}
                </button>
              ))}
              <button onClick={()=>onNav("ai-assistant")}
                className={cn("ml-1 flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors", page==="ai-assistant"?"bg-accent/10 text-accent":"text-muted-foreground hover:text-accent hover:bg-accent/8")}>
                <Sparkles size={13}/> AI Assistant
              </button>
            </div>
            {/* Right */}
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={()=>setDark(!dark)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                {dark ? <Sun size={15}/> : <Moon size={15}/>}
              </button>
              <button onClick={()=>onNav("enterprise")} className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">Enterprise</button>
              <button onClick={()=>onNav("pricing")} className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</button>
              <button onClick={()=>onNav("ai-assistant")} className="bg-accent text-white text-[13px] font-semibold px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors">
                Get Access
              </button>
            </div>
            {/* Mobile menu toggle */}
            <button className="lg:hidden w-8 h-8 flex items-center justify-center" onClick={()=>setMobile(!mobile)}>
              {mobile ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>
      </nav>
      {/* Mobile menu */}
      <AnimatePresence>
        {mobile && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.15}}
            className="fixed top-16 left-0 right-0 z-39 bg-white border-b border-border shadow-lg lg:hidden">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {[...NAV_ITEMS,{l:"AI Assistant",p:"ai-assistant" as Page},{l:"Enterprise",p:"enterprise" as Page},{l:"Pricing",p:"pricing" as Page}].map(n=>(
                <button key={n.l} onClick={()=>{onNav(n.p);setMobile(false);}}
                  className={cn("w-full text-left px-3.5 py-2.5 rounded-lg text-[14px] font-medium transition-colors", page===n.p?"bg-secondary text-foreground":"text-muted-foreground hover:text-foreground hover:bg-secondary")}>
                  {n.l}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — HOME
// ══════════════════════════════════════════════════════════════════════════════
function HomePage({ onNav }: { onNav:(p:Page)=>void }) {
  return (
    <div>
      {/* Hero */}
      <section className="hero-canvas relative overflow-hidden pt-32 pb-24">
        <div className="absolute inset-0 dot-grid opacity-60 pointer-events-none"/>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="fade-up flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold px-3.5 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
              Updated weekly · RAG-powered · HIPAA-safe
            </span>
          </div>
          <h1 className="fade-up-1 text-[52px] sm:text-[64px] text-foreground mb-6 max-w-4xl mx-auto" style={{lineHeight:1.08}}>
            Evidence-based answers,<br/>
            <span className="text-accent">at the speed of care.</span>
          </h1>
          <p className="fade-up-2 text-[17px] text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            AI-synthesised clinical intelligence grounded in ACC/AHA, ESC, ADA, and NICE guidelines — trusted by 47,000+ physicians at leading hospitals worldwide.
          </p>
          <div className="fade-up-3">
            <HeroSearch onNav={onNav}/>
            <p className="text-[12px] text-muted-foreground mt-3">Try: <button onClick={()=>onNav("disease")} className="text-accent hover:underline">HFrEF treatment</button>, <button onClick={()=>onNav("drug")} className="text-accent hover:underline">Sacubitril/valsartan dosing</button>, <button onClick={()=>onNav("calculators")} className="text-accent hover:underline">CHA₂DS₂-VASc calculator</button></p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-secondary/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { n:47200, s:"+", l:"Conditions & syndromes" },
              { n:12800, s:"+", l:"Drug monographs" },
              { n:2800,  s:"+", l:"Indexed guidelines" },
              { n:340,   s:"+", l:"Clinical calculators" },
            ].map(stat=>(
              <div key={stat.l}>
                <div className="text-[30px] font-bold text-foreground" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                  <Counter to={stat.n}/>{stat.s}
                </div>
                <div className="text-[13px] text-muted-foreground mt-1">{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Chip color="green">Clinical intelligence platform</Chip>
            <h2 className="text-[38px] text-foreground mt-4 mb-4">Everything a clinician needs,<br/>in one trusted platform.</h2>
            <p className="text-[16px] text-muted-foreground max-w-lg mx-auto">From bedside queries to complex guideline comparisons — structured, evidence-graded, and always current.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon:<Sparkles size={20}/>, title:"AI Clinical Assistant", desc:"Ask any clinical question. Get structured responses: summary, evidence-graded recommendations, drug table, key trials, and references — not paragraphs.", badge:"New", page:"ai-assistant" as Page },
              { icon:<Microscope size={20}/>, title:"Disease Knowledge Hub", desc:"47,200+ structured disease pages with ICD-10 codes, diagnostic criteria, treatment algorithms, and complication management.", badge:null, page:"disease" as Page },
              { icon:<Pill size={20}/>, title:"Drug Intelligence Center", desc:"Full monographs with dosing, pharmacokinetics, interactions, pregnancy safety (FDA/ADEC), and evidence-based indications.", badge:null, page:"drug" as Page },
              { icon:<Layers size={20}/>, title:"Guideline Comparison Engine", desc:"Side-by-side ACC/AHA, ESC, ADA, NICE, and KDIGO recommendations on the same clinical question — spot divergence instantly.", badge:null, page:"guidelines" as Page },
              { icon:<Calculator size={20}/>, title:"Clinical Calculators", desc:"340+ validated risk scores, dosing calculators, and diagnostic tools including CHA₂DS₂-VASc, HEART, Wells, eGFR, and MELD-Na.", badge:null, page:"calculators" as Page },
              { icon:<GraduationCap size={20}/>, title:"CME Learning Center", desc:"1,200+ accredited modules aligned to the latest guidelines. Earn up to 50 CME credits per year with instant certificate delivery.", badge:null, page:"cme" as Page },
            ].map((f,i)=>(
              <motion.div key={f.title} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} transition={{delay:i*0.07,duration:0.4}} viewport={{once:true}}
                className="group bg-card border border-border rounded-xl p-6 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5 transition-all cursor-pointer"
                onClick={()=>onNav(f.page)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    {f.icon}
                  </div>
                  {f.badge && <span className="text-[10px] font-bold bg-accent text-white px-2 py-0.5 rounded-full">{f.badge}</span>}
                </div>
                <h4 className="text-[15px] font-semibold text-foreground mb-2">{f.title}</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{f.desc}</p>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent group-hover:gap-2 transition-all">
                  Explore <ArrowRight size={12}/>
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-secondary/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-[34px] text-foreground">From question to bedside answer<br/>in under 10 seconds.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { n:"01", icon:<Search size={22}/>, title:"Ask your clinical question", desc:"Type naturally — drug interactions, guideline recommendations, risk calculators, or disease management. No structured query syntax needed." },
              { n:"02", icon:<Sparkles size={22}/>, title:"AI synthesises the evidence", desc:"Our RAG pipeline retrieves the most current guidelines, landmark trials, and drug labelling. Each claim is grounded to a source." },
              { n:"03", icon:<CircleCheck size={22}/>, title:"Get structured, graded answers", desc:"Recommendations arrive with evidence class (I/IIa/IIb/III), level (A/B/C), and the guideline organisation — not unstructured paragraphs." },
            ].map((s,i)=>(
              <div key={s.n} className="relative">
                {i<2 && <div className="hidden md:block absolute top-5 left-[calc(100%+16px)] right-[-16px] h-px bg-border"/>}
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-white border-2 border-accent/20 flex items-center justify-center text-accent shadow-sm">
                      {s.icon}
                    </div>
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">{i+1}</span>
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold text-foreground mb-2">{s.title}</h4>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-[34px] text-foreground mb-3">Trusted by physicians<br/>at the world's leading hospitals.</h2>
            <p className="text-[15px] text-muted-foreground">Over 47,000 clinicians across 68 countries.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t=>(
              <motion.div key={t.name} initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} transition={{duration:0.4}} viewport={{once:true}}
                className="bg-card border border-border rounded-xl p-6 flex flex-col gap-5">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_,j)=><Star key={j} size={13} className="fill-amber-400 text-amber-400"/>)}
                </div>
                <p className="text-[14px] text-foreground leading-relaxed flex-1">"{t.q}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-[12px] font-bold shrink-0">{t.av}</div>
                  <div>
                    <div className="text-[13px] font-semibold text-foreground">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {/* Trust logos */}
          <div className="mt-16 pt-12 border-t border-border">
            <p className="text-center text-[12px] font-semibold text-muted-foreground uppercase tracking-widest mb-8">Trusted by clinicians at</p>
            <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
              {["Mayo Clinic","Cleveland Clinic","Johns Hopkins","NHS England","Apollo Hospitals","Aga Khan University","UCSF Health","Brigham & Women's"].map(org=>(
                <span key={org} className="text-[14px] font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-default">{org}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-foreground">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-[38px] text-white mb-4">Start your free 14-day trial.</h2>
          <p className="text-[16px] text-slate-400 mb-8 leading-relaxed">No credit card required. Full Professional access. Upgrade, downgrade, or cancel anytime.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={()=>onNav("ai-assistant")} className="bg-accent text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-emerald-600 transition-colors text-[15px]">
              Try AI Assistant free
            </button>
            <button onClick={()=>onNav("enterprise")} className="bg-white/10 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-white/15 transition-colors text-[15px] border border-white/10">
              Enterprise enquiry
            </button>
          </div>
          <p className="text-[12px] text-slate-500 mt-5">HIPAA-compliant · SOC 2 Type II · ISO 27001 certified</p>
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 2 — DISEASE HUB
// ══════════════════════════════════════════════════════════════════════════════
function DiseasePage({ onNav }: { onNav:(p:Page)=>void }) {
  const [tab, setTab] = useState("Overview");
  const [selectedDisease, setSelectedDisease] = useState(DISEASES[0]);
  const [search, setSearch] = useState("");
  const [spec, setSpec] = useState("All");
  const TABS = ["Overview","Diagnosis","Treatment","Evidence","Guidelines","Calculator"];
  const SPECS = ["All","Cardiology","Endocrinology","Pulmonology","Nephrology"];
  const filtered = DISEASES.filter(d=>(spec==="All"||d.spec===spec)&&(d.name.toLowerCase().includes(search.toLowerCase())||d.icd.includes(search)));

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="border-b border-border bg-secondary/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <Chip color="green">Disease Knowledge Hub</Chip>
          <h1 className="text-[32px] text-foreground mt-2 mb-1">47,200+ structured disease pages</h1>
          <p className="text-[14px] text-muted-foreground">ICD-10 coded · Specialty-organised · Evidence-graded treatment algorithms</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-7">
          {/* Sidebar */}
          <aside className="w-64 shrink-0 lg:sticky lg:top-[72px] lg:self-start space-y-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search diseases..."
                className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-lg text-[13px] outline-none focus:border-accent transition-colors"/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Specialty</p>
              <div className="space-y-0.5">
                {SPECS.map(s=>(
                  <button key={s} onClick={()=>setSpec(s)}
                    className={cn("w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",spec===s?"bg-secondary text-foreground":"text-muted-foreground hover:text-foreground hover:bg-secondary/60")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Conditions</p>
              <div className="space-y-0.5">
                {filtered.map(d=>(
                  <button key={d.icd} onClick={()=>setSelectedDisease(d)}
                    className={cn("w-full text-left px-3 py-2 rounded-lg transition-all", selectedDisease.icd===d.icd?"bg-accent/8 border border-accent/20 text-accent":"hover:bg-secondary text-muted-foreground hover:text-foreground")}>
                    <div className="text-[13px] font-medium leading-tight">{d.name}</div>
                    <div className="text-[11px] font-mono mt-0.5 opacity-70">{d.icd}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Disease header */}
            <div className="bg-card border border-border rounded-xl p-6 mb-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Chip color="slate">{selectedDisease.spec}</Chip>
                    <Chip color="blue">{selectedDisease.tag}</Chip>
                    <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">{selectedDisease.icd}</span>
                  </div>
                  <h2 className="text-[24px] text-foreground">{selectedDisease.name}</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">Prevalence: {selectedDisease.prev}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <EvidClass cls={selectedDisease.grade}/>
                  <EvidLevel lvl={selectedDisease.lvl}/>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex gap-0 border-b border-border -mx-6 px-6 overflow-x-auto">
                {TABS.map(t=>(
                  <button key={t} onClick={()=>setTab(t)}
                    className={cn("px-4 py-2.5 text-[13px] font-medium border-b-2 whitespace-nowrap transition-colors", tab===t?"border-accent text-accent":"border-transparent text-muted-foreground hover:text-foreground")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div key={tab+selectedDisease.icd} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.15}}>
                {tab==="Overview" && (
                  <div className="space-y-4">
                    <div className="bg-card border border-border rounded-xl p-5">
                      <h4 className="font-semibold text-foreground text-[14px] mb-3">Definition & Pathophysiology</h4>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {selectedDisease.name} is a complex clinical syndrome characterised by structural and functional cardiac abnormalities, resulting in impaired ventricular filling or ejection, or both. The hallmark is LVEF ≤40%, with neurohormonal activation driving progressive cardiac remodelling, congestion, and end-organ hypoperfusion.
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-card border border-border rounded-xl p-5">
                        <h4 className="font-semibold text-foreground text-[14px] mb-3">Key Symptoms (NYHA Classification)</h4>
                        <div className="space-y-2.5">
                          {["NYHA I — No limitation of physical activity","NYHA II — Slight limitation; comfortable at rest","NYHA III — Marked limitation; comfortable only at rest","NYHA IV — Symptoms at rest or minimal activity"].map((s,i)=>(
                            <div key={i} className="flex items-start gap-2.5 text-[13px]">
                              <span className={cn("w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5",i===0?"bg-emerald-100 text-emerald-700":i===1?"bg-blue-100 text-blue-700":i===2?"bg-amber-100 text-amber-700":"bg-red-100 text-red-700")}>{["I","II","III","IV"][i]}</span>
                              <span className="text-muted-foreground">{s.split("—")[1].trim()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-card border border-border rounded-xl p-5">
                        <h4 className="font-semibold text-foreground text-[14px] mb-3">Common Aetiology</h4>
                        <div className="space-y-1.5">
                          {["Ischaemic heart disease (most common, ~60%)","Dilated cardiomyopathy (idiopathic)","Hypertensive heart disease","Valvular heart disease","Toxin-related (alcohol, chemotherapy)","Inherited cardiomyopathies"].map((e,i)=>(
                            <div key={i} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                              <div className="w-1 h-1 rounded-full bg-accent shrink-0"/>
                              {e}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <AlertBox type="warning">
                      Patients with HFrEF have a 5-year mortality of approximately 50%. Early initiation of all four pillars of GDMT is associated with the greatest survival benefit (combined NNT ≈8 over 2 years).
                    </AlertBox>
                  </div>
                )}
                {tab==="Treatment" && (
                  <div className="space-y-4">
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className="bg-secondary/60 border-b border-border px-5 py-3 flex items-center justify-between">
                        <h4 className="font-semibold text-foreground text-[14px]">Four-Pillar GDMT</h4>
                        <div className="flex gap-1.5">
                          <EvidClass cls="I" sm/><EvidLevel lvl="A" sm/>
                          <OrgBadge org="ACC/AHA 2022"/>
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {[
                          { pillar:"Pillar 1", name:"ARNI / ACEi / ARB", drug:"Sacubitril/valsartan preferred", trial:"PARADIGM-HF", cls:"I" as EvidCls, lvl:"A" as EvidLvl },
                          { pillar:"Pillar 2", name:"Beta-blocker", drug:"Carvedilol · Metoprolol succinate · Bisoprolol", trial:"COPERNICUS, MERIT-HF, CIBIS-II", cls:"I" as EvidCls, lvl:"A" as EvidLvl },
                          { pillar:"Pillar 3", name:"Mineralocorticoid receptor antagonist", drug:"Spironolactone · Eplerenone", trial:"RALES, EMPHASIS-HF", cls:"I" as EvidCls, lvl:"A" as EvidLvl },
                          { pillar:"Pillar 4", name:"SGLT2 inhibitor", drug:"Dapagliflozin 10 mg · Empagliflozin 10 mg", trial:"DAPA-HF, EMPEROR-Reduced", cls:"I" as EvidCls, lvl:"A" as EvidLvl },
                        ].map((row,i)=>(
                          <div key={i} className="px-5 py-4 flex items-start gap-4 hover:bg-secondary/30 transition-colors">
                            <span className="text-[10px] font-mono font-bold text-accent bg-accent/8 px-2 py-1 rounded shrink-0 mt-0.5">{row.pillar}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[13px] font-semibold text-foreground">{row.name}</span>
                                <EvidClass cls={row.cls} sm/><EvidLevel lvl={row.lvl} sm/>
                              </div>
                              <p className="text-[12px] text-muted-foreground font-mono">{row.drug}</p>
                            </div>
                            <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-medium shrink-0">{row.trial}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <AlertBox type="info">
                      Simultaneous initiation of all four GDMT pillars is preferred when haemodynamically stable. Sequence titration based on tolerability, not guideline sequence.
                    </AlertBox>
                  </div>
                )}
                {tab==="Evidence" && (
                  <div className="space-y-3">
                    {[
                      { trial:"PARADIGM-HF",year:"2014",journal:"NEJM",n:"8,442",outcome:"20% RRR in CV death/HF hospitalisation (HR 0.80; p<0.001)",drug:"Sacubitril/valsartan vs enalapril",grade:"Class I-A",impact:"High" },
                      { trial:"DAPA-HF",year:"2019",journal:"NEJM",n:"4,744",outcome:"26% RRR in worsening HF/CV death (HR 0.74; p<0.001)",drug:"Dapagliflozin vs placebo",grade:"Class I-A",impact:"High" },
                      { trial:"EMPEROR-Reduced",year:"2020",journal:"NEJM",n:"3,730",outcome:"25% RRR in CV death/HF hospitalisation (HR 0.75; p<0.001)",drug:"Empagliflozin vs placebo",grade:"Class I-A",impact:"High" },
                      { trial:"RALES",year:"1999",journal:"NEJM",n:"1,663",outcome:"30% RRR in all-cause mortality (HR 0.70; p<0.001)",drug:"Spironolactone vs placebo",grade:"Class I-A",impact:"High" },
                    ].map(ev=>(
                      <div key={ev.trial} className="bg-card border border-border rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[14px] text-foreground">{ev.trial}</span>
                            <span className="text-[11px] text-muted-foreground">{ev.journal} {ev.year} · n={ev.n}</span>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono shrink-0">{ev.grade}</span>
                        </div>
                        <p className="text-[13px] text-muted-foreground mb-2"><span className="font-medium text-foreground">Drug:</span> {ev.drug}</p>
                        <p className="text-[13px] text-foreground font-medium">{ev.outcome}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(tab==="Diagnosis"||tab==="Guidelines"||tab==="Calculator") && (
                  <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
                      {tab==="Calculator"?<Calculator size={22} className="text-muted-foreground"/>:tab==="Guidelines"?<FileText size={22} className="text-muted-foreground"/>:<Stethoscope size={22} className="text-muted-foreground"/>}
                    </div>
                    <h4 className="font-semibold text-foreground mb-2">{tab} content</h4>
                    <p className="text-[13px] text-muted-foreground mb-4">Detailed {tab.toLowerCase()} data for {selectedDisease.name}</p>
                    {tab==="Calculator" && <button onClick={()=>onNav("calculators")} className="bg-accent text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:bg-emerald-600 transition-colors">Open Calculators</button>}
                    {tab==="Guidelines" && <button onClick={()=>onNav("guidelines")} className="bg-accent text-white text-[13px] font-semibold px-5 py-2 rounded-lg hover:bg-emerald-600 transition-colors">Open Guideline Engine</button>}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 3 — DRUG DATABASE
// ══════════════════════════════════════════════════════════════════════════════
function DrugPage() {
  const [tab, setTab] = useState("Overview");
  const [drug, setDrug] = useState(DRUGS_DATA[0]);
  const TABS = ["Overview","Dosing","Pharmacology","Interactions","Pregnancy & Lactation","Adverse Effects","References"];

  const INTERACTIONS = [
    { drug:"ACE inhibitors / ARBs", severity:"Contraindicated", mechanism:"Dual RAAS blockade → symptomatic hypotension, hyperkalaemia, renal impairment", action:"Do not co-prescribe. 36-hour washout required when switching from ACEi to sacubitril/valsartan." },
    { drug:"Potassium-sparing diuretics", severity:"Major", mechanism:"Additive hyperkalaemia risk, particularly with spironolactone/eplerenone", action:"Monitor serum K⁺ closely; reassess if K⁺ >5.0 mEq/L" },
    { drug:"NSAIDs", severity:"Moderate", mechanism:"Blunted antihypertensive and diuretic effect; increased renal impairment risk", action:"Avoid chronic use; if necessary, monitor renal function and BP" },
    { drug:"Lithium", severity:"Moderate", mechanism:"ARNI may increase lithium levels via reduced renal clearance", action:"Monitor lithium levels; consider dose reduction" },
  ];

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="border-b border-border bg-secondary/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <Chip color="blue">Drug Intelligence Center</Chip>
          <h1 className="text-[32px] text-foreground mt-2 mb-1">12,800+ drug monographs</h1>
          <p className="text-[14px] text-muted-foreground">Full prescribing information · FDA/EMA approved · Evidence-graded indications</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-7">
          {/* Sidebar */}
          <aside className="w-52 shrink-0 lg:sticky lg:top-[72px] lg:self-start space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">Featured drugs</p>
            {DRUGS_DATA.map(d=>(
              <button key={d.name} onClick={()=>setDrug(d)}
                className={cn("w-full text-left px-3 py-2.5 rounded-lg transition-all",drug.name===d.name?"bg-accent/8 border border-accent/20 text-accent":"hover:bg-secondary text-muted-foreground hover:text-foreground")}>
                <div className="text-[13px] font-medium">{d.name}</div>
                <div className="text-[11px] mt-0.5 opacity-70">{d.brand} · {d.cls}</div>
              </button>
            ))}
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Drug header */}
            <div className="bg-card border border-border rounded-xl p-6 mb-5">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Chip color="slate">{drug.cls}</Chip>
                    <EvidClass cls={drug.grade}/><EvidLevel lvl={drug.lvl}/>
                  </div>
                  <h2 className="text-[26px] text-foreground">{drug.name}</h2>
                  <p className="text-[14px] text-muted-foreground mt-1">{drug.brand} · {drug.indication}</p>
                </div>
                <div className="shrink-0">
                  <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg block text-center">Key trial<br/><span className="text-[13px]">{drug.keyTrial}</span></span>
                </div>
              </div>
              {drug.blackBox && (
                <div className="mt-4">
                  <AlertBox type="danger">
                    <span className="font-bold">Black Box Warning:</span> {drug.blackBox}
                  </AlertBox>
                </div>
              )}
              {/* Tabs */}
              <div className="flex gap-0 border-b border-border -mx-6 px-6 mt-4 overflow-x-auto">
                {TABS.map(t=>(
                  <button key={t} onClick={()=>setTab(t)}
                    className={cn("px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 whitespace-nowrap transition-colors",tab===t?"border-accent text-accent":"border-transparent text-muted-foreground hover:text-foreground")}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={tab+drug.name} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.15}}>
                {tab==="Overview" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-xl p-5">
                      <h4 className="font-semibold text-foreground text-[14px] mb-3">Indications</h4>
                      <div className="space-y-2 text-[13px] text-muted-foreground">
                        <div className="flex items-start gap-2"><CircleCheck size={14} className="text-accent shrink-0 mt-0.5"/><span><strong className="text-foreground">HFrEF (EF ≤40%)</strong> — to reduce CV mortality and HF hospitalisations <EvidClass cls="I" sm/><EvidLevel lvl="A" sm/></span></div>
                        <div className="flex items-start gap-2"><CircleCheck size={14} className="text-accent shrink-0 mt-0.5"/><span>Post-MI with LV dysfunction (EF ≤40%, haemodynamically stable) <EvidClass cls="IIa" sm/><EvidLevel lvl="B" sm/></span></div>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-5">
                      <h4 className="font-semibold text-foreground text-[14px] mb-3">Contraindications</h4>
                      <div className="space-y-1.5">
                        {drug.contraindications.map((c,i)=>(
                          <div key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"/>
                            {c}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2 bg-card border border-border rounded-xl p-5">
                      <h4 className="font-semibold text-foreground text-[14px] mb-3">NNT / Clinical benefit</h4>
                      <p className="text-[13px] text-muted-foreground">{drug.nnt}</p>
                    </div>
                  </div>
                )}
                {tab==="Dosing" && (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-secondary/60 border-b border-border px-5 py-3">
                      <h4 className="font-semibold text-foreground text-[14px]">Dosing & Administration</h4>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { l:"Starting dose", v:drug.dose.initial },
                          { l:"Target dose", v:drug.dose.target },
                          { l:"Renal impairment", v:drug.dose.renal },
                          { l:"Hepatic impairment", v:drug.dose.hepatic },
                        ].map(row=>(
                          <div key={row.l} className="bg-secondary rounded-lg p-3.5">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{row.l}</p>
                            <p className="text-[13px] font-mono font-medium text-foreground">{row.v}</p>
                          </div>
                        ))}
                      </div>
                      <AlertBox type="info">Titrate every 2–4 weeks as tolerated. Check renal function and serum potassium before each up-titration. Target dose achieved in ~70% of patients in PARADIGM-HF.</AlertBox>
                    </div>
                  </div>
                )}
                {tab==="Interactions" && (
                  <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="bg-secondary/60 border-b border-border px-5 py-3 flex items-center justify-between">
                      <h4 className="font-semibold text-foreground text-[14px]">Drug Interactions</h4>
                      <span className="text-[11px] text-muted-foreground">{INTERACTIONS.length} interactions identified</span>
                    </div>
                    <div className="divide-y divide-border">
                      {INTERACTIONS.map(ix=>(
                        <div key={ix.drug} className="px-5 py-4">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-[13px] text-foreground">{ix.drug}</span>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded",ix.severity==="Contraindicated"?"bg-red-100 text-red-700":ix.severity==="Major"?"bg-amber-100 text-amber-700":"bg-blue-100 text-blue-700")}>
                              {ix.severity}
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-foreground mb-1.5"><span className="font-medium text-foreground">Mechanism:</span> {ix.mechanism}</p>
                          <p className="text-[12px] text-muted-foreground"><span className="font-medium text-foreground">Action:</span> {ix.action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(tab==="Pharmacology"||tab==="Pregnancy & Lactation"||tab==="Adverse Effects"||tab==="References") && (
                  <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <FlaskConical size={28} className="text-muted-foreground mx-auto mb-3"/>
                    <h4 className="font-semibold text-foreground mb-2">{tab}</h4>
                    <p className="text-[13px] text-muted-foreground">Full {tab.toLowerCase()} data available in the complete monograph.</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 4 — GUIDELINE COMPARISON ENGINE
// ══════════════════════════════════════════════════════════════════════════════
function GuidelinesPage() {
  const [topic, setTopic] = useState("HFrEF Management");
  const TOPICS = ["HFrEF Management","Atrial Fibrillation","Type 2 Diabetes","Hypertension","CKD Management"];

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="border-b border-border bg-secondary/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <Chip color="purple">Guideline Comparison Engine</Chip>
          <h1 className="text-[32px] text-foreground mt-2 mb-1">Side-by-side guideline comparison</h1>
          <p className="text-[14px] text-muted-foreground">Identify concordance and divergence across ACC/AHA, ESC, ADA, NICE, and KDIGO — instantly.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Topic selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TOPICS.map(t=>(
            <button key={t} onClick={()=>setTopic(t)}
              className={cn("px-4 py-2 rounded-lg text-[13px] font-medium transition-all border",t===topic?"bg-accent text-white border-accent shadow-sm":"bg-card border-border text-muted-foreground hover:text-foreground hover:border-slate-300")}>
              {t}
            </button>
          ))}
        </div>

        {/* Comparison table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-secondary/60 border-b border-border">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr]">
              <div className="px-5 py-4 font-semibold text-[13px] text-muted-foreground">Recommendation</div>
              {[
                { org:"ACC/AHA", year:"2022", color:"text-blue-700 bg-blue-50 border-blue-200" },
                { org:"ESC", year:"2021", color:"text-indigo-700 bg-indigo-50 border-indigo-200" },
                { org:"NICE", year:"2023", color:"text-purple-700 bg-purple-50 border-purple-200" },
              ].map(o=>(
                <div key={o.org} className="px-4 py-4 text-center border-l border-border">
                  <span className={cn("inline-block text-[12px] font-bold px-3 py-1 rounded-lg border", o.color)}>{o.org} {o.year}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border">
            {GUIDE_ROWS.map((row,ri)=>(
              <div key={ri} className={cn("grid grid-cols-[1.4fr_1fr_1fr_1fr] hover:bg-secondary/20 transition-colors", ri%2===0?"":"bg-secondary/8")}>
                <div className="px-5 py-4">
                  <span className="text-[13px] font-semibold text-foreground">{row.cat}</span>
                </div>
                {[row.accha, row.esc, row.nice].map((col,ci)=>(
                  <div key={ci} className="px-4 py-4 border-l border-border">
                    <div className="flex flex-wrap gap-1 mb-2">
                      <EvidClass cls={col.cls} sm/><EvidLevel lvl={col.lvl} sm/>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{col.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 items-center p-4 bg-secondary/30 rounded-xl border border-border">
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Evidence Classes:</span>
          {(["I","IIa","IIb","III"] as EvidCls[]).map(c=>(
            <div key={c} className="flex items-center gap-1.5">
              <EvidClass cls={c} sm/>
              <span className="text-[11px] text-muted-foreground">{{ I:"Benefit>>Risk", IIa:"Benefit>Risk", IIb:"Benefit≥Risk", III:"No benefit/harm" }[c]}</span>
            </div>
          ))}
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider ml-2">Levels:</span>
          {(["A","B","C"] as EvidLvl[]).map(l=>(
            <div key={l} className="flex items-center gap-1.5">
              <EvidLevel lvl={l} sm/>
              <span className="text-[11px] text-muted-foreground">{{ A:"Multiple RCTs", B:"Single RCT/registry", C:"Expert opinion" }[l]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 5 — CALCULATORS
// ══════════════════════════════════════════════════════════════════════════════
function CalculatorsPage() {
  const [activeCalc, setActiveCalc] = useState("CHA₂DS₂-VASc");
  const [filter, setFilter] = useState("All");
  const CATS = ["All","Cardiology","Pulmonology","Nephrology","Critical Care","Hepatology","Infectious Disease"];
  const [sc, setSc] = useState<ChaScores>({ chf:false, htn:false, age75:false, dm:false, stroke:false, vasc:false, age65:false, female:false });

  const total = [sc.chf,sc.htn,sc.dm,sc.vasc,sc.age65,sc.female].filter(Boolean).length
    + (sc.age75?2:0) + (sc.stroke?2:0);

  const riskData = total===0?{ risk:"Low",rate:"0%",rec:"Anticoagulation not generally recommended",color:"emerald"}:total===1?{ risk:"Low-Moderate",rate:"1.3%/yr",rec:"Consider anticoagulation; weigh bleeding risk (HAS-BLED)",color:"blue"}:total<=3?{ risk:"Moderate",rate:"2.2–3.2%/yr",rec:"Oral anticoagulation recommended (DOAC preferred)",color:"amber"}:{ risk:"High",rate:"4.0–6.7%/yr",rec:"Oral anticoagulation strongly recommended",color:"red"};

  const ITEMS: { label:string; k:keyof ChaScores; pts:number; note:string }[] = [
    { label:"Congestive heart failure / LV dysfunction", k:"chf",    pts:1, note:"EF <40% or recent decompensation" },
    { label:"Hypertension",                              k:"htn",    pts:1, note:"BP >140/90 or on antihypertensive therapy" },
    { label:"Age ≥75 years",                             k:"age75",  pts:2, note:"Counts as 2 points" },
    { label:"Diabetes mellitus",                         k:"dm",     pts:1, note:"Fasting glucose >125 mg/dL or on treatment" },
    { label:"Prior stroke / TIA / thromboembolism",      k:"stroke", pts:2, note:"Counts as 2 points — highest risk modifier" },
    { label:"Vascular disease (MI, peripheral arterial, aortic plaque)", k:"vasc", pts:1, note:"" },
    { label:"Age 65–74 years",                           k:"age65",  pts:1, note:"Only if age75 not checked" },
    { label:"Female sex",                                k:"female", pts:1, note:"Only modifies risk when ≥2 other risk factors present" },
  ];

  const filteredCalcs = CALC_LIST.filter(c=>filter==="All"||c.cat===filter);

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="border-b border-border bg-secondary/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <Chip color="amber">Clinical Calculators</Chip>
          <h1 className="text-[32px] text-foreground mt-2 mb-1">340+ validated clinical calculators</h1>
          <p className="text-[14px] text-muted-foreground">Evidence-based risk scores, dosing tools, and diagnostic calculators.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-7">
          {/* Sidebar */}
          <aside className="w-56 shrink-0 lg:sticky lg:top-[72px] lg:self-start space-y-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categories</p>
              <div className="space-y-0.5">
                {CATS.map(c=>(
                  <button key={c} onClick={()=>setFilter(c)}
                    className={cn("w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",filter===c?"bg-secondary text-foreground":"text-muted-foreground hover:bg-secondary/60 hover:text-foreground")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Calculators</p>
              <div className="space-y-0.5">
                {filteredCalcs.map(c=>(
                  <button key={c.name} onClick={()=>setActiveCalc(c.name)}
                    className={cn("w-full text-left px-3 py-2 rounded-lg transition-all",activeCalc===c.name?"bg-accent/8 border border-accent/20 text-accent":"hover:bg-secondary text-muted-foreground hover:text-foreground")}>
                    <div className="text-[12.5px] font-medium">{c.name}</div>
                    <div className="text-[10.5px] opacity-70 mt-0.5">{c.cat}</div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Calculator main */}
          <div className="flex-1 min-w-0">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-secondary/60 border-b border-border px-6 py-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[18px] font-bold text-foreground">{activeCalc}</h3>
                    <EvidClass cls="I" sm/><EvidLevel lvl="A" sm/>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground">{CALC_LIST.find(c=>c.name===activeCalc)?.desc}</p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">{CALC_LIST.find(c=>c.name===activeCalc)?.uses} uses/yr</span>
              </div>

              {activeCalc==="CHA₂DS₂-VASc" ? (
                <div className="p-6">
                  <div className="grid lg:grid-cols-[1fr_300px] gap-6">
                    <div>
                      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Risk factors</p>
                      <div className="space-y-2">
                        {ITEMS.map(item=>(
                          <button key={item.k} onClick={()=>setSc(s=>({...s,[item.k]:!s[item.k]}))}
                            className={cn("w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all",sc[item.k]?"bg-accent/6 border-accent/25":"bg-white border-border hover:border-slate-300")}>
                            <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",sc[item.k]?"bg-accent border-accent":"border-slate-300")}>
                              {sc[item.k] && <Check size={11} className="text-white" strokeWidth={3}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                                <span className={cn("text-[10px] font-bold font-mono shrink-0", item.pts===2?"text-red-600":"text-slate-500")}>+{item.pts}</span>
                              </div>
                              {item.note && <p className="text-[11px] text-muted-foreground mt-0.5">{item.note}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Score panel */}
                    <div className="space-y-4">
                      <AnimatePresence mode="wait">
                        <motion.div key={total} initial={{scale:0.97,opacity:0.7}} animate={{scale:1,opacity:1}} transition={{duration:0.2}}
                          className={cn("rounded-xl border-2 p-5 text-center",riskData.color==="emerald"?"bg-emerald-50 border-emerald-200":riskData.color==="blue"?"bg-blue-50 border-blue-200":riskData.color==="amber"?"bg-amber-50 border-amber-200":"bg-red-50 border-red-200")}>
                          <p className={cn("text-[11px] font-bold uppercase tracking-widest mb-1",riskData.color==="emerald"?"text-emerald-600":riskData.color==="blue"?"text-blue-600":riskData.color==="amber"?"text-amber-600":"text-red-600")}>CHA₂DS₂-VASc Score</p>
                          <div className={cn("text-[64px] font-black leading-none mb-1",riskData.color==="emerald"?"text-emerald-700":riskData.color==="blue"?"text-blue-700":riskData.color==="amber"?"text-amber-700":"text-red-700")} style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{total}</div>
                          <p className={cn("text-[13px] font-bold mb-1",riskData.color==="emerald"?"text-emerald-700":riskData.color==="blue"?"text-blue-700":riskData.color==="amber"?"text-amber-700":"text-red-700")}>{riskData.risk} Risk</p>
                          <p className={cn("text-[12px] font-mono",riskData.color==="emerald"?"text-emerald-600":riskData.color==="blue"?"text-blue-600":riskData.color==="amber"?"text-amber-600":"text-red-600")}>Stroke rate: {riskData.rate}</p>
                        </motion.div>
                      </AnimatePresence>
                      <div className="bg-card border border-border rounded-xl p-4">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Clinical recommendation</p>
                        <p className="text-[12.5px] text-foreground leading-relaxed">{riskData.rec}</p>
                      </div>
                      <div className="bg-secondary rounded-xl p-4">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reference</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">Lip GYH et al. Eur Heart J 2010. 2020 ESC AF Guidelines — Class I, Level A recommendation for CHA₂DS₂-VASc ≥2 in men, ≥3 in women.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Calculator size={32} className="text-muted-foreground mx-auto mb-4"/>
                  <h4 className="font-semibold text-foreground mb-2">{activeCalc}</h4>
                  <p className="text-[13px] text-muted-foreground mb-4">{CALC_LIST.find(c=>c.name===activeCalc)?.desc}</p>
                  <p className="text-[12px] text-muted-foreground">Full calculator available in the complete platform.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 6 — AI CLINICAL ASSISTANT
// ══════════════════════════════════════════════════════════════════════════════
function AIAssistantPage() {
  const [msgs, setMsgs] = useState<AImsg[]>(SEED_MSGS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const QUICK_Q = ["Warfarin vs DOAC in AF","Metformin in CKD stage 3","Beta-blocker contraindications in HFrEF","ACEi vs ARB in diabetic nephropathy"];

  const send = useCallback(() => {
    const q = input.trim(); if (!q) return;
    setMsgs(m=>[...m,{ role:"user", text:q }]);
    setInput(""); setLoading(true);
    setTimeout(()=>{
      setMsgs(m=>[...m,{
        role:"ai", text:"",
        summary:`Based on current guidelines, here is the structured evidence summary for: "${q}". This response reflects ACC/AHA, ESC, and NICE guideline positions current to 2024.`,
        recommendations:[
          { cls:"I", lvl:"A", org:"ACC/AHA", text:"Review the latest guideline recommendations for this clinical scenario. Verify with local protocols and patient-specific factors." },
          { cls:"IIa", lvl:"B", org:"ESC", text:"Consider individualised patient assessment including comorbidities, contraindications, and patient preference before initiating therapy." },
        ],
        sources:[
          { n:1, ref:"Relevant ACC/AHA Guideline 2022–2024", grade:"Guideline" },
          { n:2, ref:"Relevant ESC Guideline 2021–2024", grade:"Guideline" },
        ],
        confidence:89,
      }]);
      setLoading(false);
    },1800);
  }, [input]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[msgs,loading]);

  return (
    <div className="flex h-screen bg-background pt-16">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border flex-col bg-secondary/20">
        <div className="p-4 border-b border-border">
          <button className="w-full flex items-center justify-center gap-2 bg-accent text-white text-[13px] font-semibold py-2.5 rounded-lg hover:bg-emerald-600 transition-colors">
            <span className="text-lg">+</span> New consultation
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Recent queries</p>
          {["HFrEF treatment algorithm","Warfarin reversal in AF","SGLT2i in T2DM + CKD","CAP antibiotic selection","Hypertension in CKD"].map((q,i)=>(
            <button key={i} className="w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">{q}</button>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <div className="bg-secondary rounded-lg p-3 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">RAG-grounded responses</p>
            <p>All answers are cited to indexed guidelines. Not a substitute for clinical judgement.</p>
          </div>
        </div>
      </aside>

      {/* Chat main */}
      <div className="flex-1 flex flex-col min-w-0 max-w-4xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {msgs.map((m,i)=>(
            <div key={i} className={cn("flex gap-3", m.role==="user"?"justify-end":"")}>
              {m.role==="ai" && (
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={14} className="text-white"/>
                </div>
              )}
              <div className={cn("max-w-[85%]", m.role==="user"?"bg-foreground text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 text-[14px]":"flex-1")}>
                {m.role==="user" ? m.text : (
                  <div className="space-y-3">
                    {/* Confidence badge */}
                    {m.confidence && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse"/>
                        <span className="text-[11px] font-semibold text-muted-foreground">AI Clinical Assistant · {m.confidence}% confidence · Grounded to 2024 guidelines</span>
                      </div>
                    )}
                    {/* Clinical summary */}
                    {m.summary && (
                      <div className="bg-secondary border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/80 border-b border-border">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent"/>
                          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Clinical Summary</span>
                        </div>
                        <p className="px-4 py-3.5 text-[13.5px] text-foreground leading-relaxed">{m.summary}</p>
                      </div>
                    )}
                    {/* Recommendations */}
                    {m.recommendations && m.recommendations.length>0 && (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/60 border-b border-border">
                          <CircleCheck size={13} className="text-accent"/>
                          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Evidence-Graded Recommendations</span>
                        </div>
                        <div className="divide-y divide-border">
                          {m.recommendations.map((rec,ri)=>(
                            <div key={ri} className="flex gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                              <span className="w-5 h-5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{ri+1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                  <EvidClass cls={rec.cls} sm/><EvidLevel lvl={rec.lvl} sm/><OrgBadge org={rec.org}/>
                                </div>
                                <p className="text-[13px] text-foreground leading-relaxed">{rec.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Drug table */}
                    {m.drugs && m.drugs.length>0 && (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/60 border-b border-border">
                          <Pill size={13} className="text-muted-foreground"/>
                          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Drug Options</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[12px]">
                            <thead>
                              <tr className="border-b border-border bg-secondary/30">
                                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Drug</th>
                                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Class</th>
                                <th className="px-4 py-2.5 text-left font-mono font-semibold text-muted-foreground">Starting dose</th>
                                <th className="px-4 py-2.5 text-left font-mono font-semibold text-muted-foreground">Target dose</th>
                                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Key trial</th>
                                <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground">Evidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.drugs.map((d,di)=>(
                                <tr key={di} className="border-b border-border hover:bg-secondary/20 transition-colors last:border-0">
                                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{d.name}</td>
                                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{d.cls}</td>
                                  <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{d.start}</td>
                                  <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{d.target}</td>
                                  <td className="px-4 py-3 text-blue-600 whitespace-nowrap">{d.trial}</td>
                                  <td className="px-4 py-3 text-center"><span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">{d.evid}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {/* Key evidence */}
                    {m.evidence && m.evidence.length>0 && (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/60 border-b border-border">
                          <Activity size={13} className="text-muted-foreground"/>
                          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Key Evidence</span>
                        </div>
                        <div className="px-4 py-3.5 space-y-2.5">
                          {m.evidence.map((ev,ei)=>(
                            <div key={ei} className="flex gap-2.5 text-[12.5px] text-muted-foreground">
                              <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded h-fit mt-0.5 shrink-0">{ei+1}</span>
                              {ev}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* References */}
                    {m.sources && m.sources.length>0 && (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary/60 border-b border-border">
                          <FileText size={13} className="text-muted-foreground"/>
                          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">References</span>
                        </div>
                        <div className="px-4 py-3.5 space-y-2">
                          {m.sources.map(s=>(
                            <div key={s.n} className="flex gap-2.5 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary/40">
                              <span className="font-mono font-bold text-accent shrink-0 mt-0.5">[{s.n}]</span>
                              <div>
                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1.5">{s.grade}</span>
                                {s.ref}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {m.role==="user" && (
                <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-primary-foreground">MD</span>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Sparkles size={14} className="text-white"/>
              </div>
              <div className="bg-secondary border border-border rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-[12px] text-muted-foreground">Synthesising evidence</span>
                <div className="flex gap-1 ml-1">
                  <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick queries */}
        <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-border bg-background/80 backdrop-blur-sm">
          {QUICK_Q.map(q=>(
            <button key={q} onClick={()=>setInput(q)} className="px-3 py-1.5 bg-secondary border border-border rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-slate-300 transition-all whitespace-nowrap">{q}</button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-3 bg-secondary border border-border rounded-xl px-4 py-3 focus-within:border-accent focus-within:shadow-sm focus-within:shadow-accent/10 transition-all">
            <textarea
              value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();} }}
              placeholder="Ask a clinical question — e.g., 'When should I start anticoagulation in atrial fibrillation?'"
              rows={2}
              className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
            />
            <button onClick={send} disabled={!input.trim()||loading}
              className="self-end bg-accent text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-40 shrink-0">
              <ArrowRight size={14}/>
            </button>
          </div>
          <p className="text-[10.5px] text-muted-foreground text-center mt-2">For educational and clinical decision support only. Not a substitute for professional medical judgement.</p>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 7 — CME LEARNING CENTER
// ══════════════════════════════════════════════════════════════════════════════
function CMEPage() {
  const [filter, setFilter] = useState("All");
  const CATS = ["All","Cardiology","Endocrinology","Pulmonology","Nephrology","Infectious Disease"];
  const filtered = CME_COURSES.filter(c=>filter==="All"||c.cat===filter);

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="border-b border-border bg-secondary/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto flex items-start justify-between">
          <div>
            <Chip color="slate">CME Learning Center</Chip>
            <h1 className="text-[32px] text-foreground mt-2 mb-1">1,200+ accredited CME modules</h1>
            <p className="text-[14px] text-muted-foreground">ACCME-accredited · AMA PRA Category 1 credits · Instant certificate delivery</p>
          </div>
          <div className="hidden sm:block bg-card border border-border rounded-xl p-5 text-center min-w-[180px]">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your CME balance</p>
            <div className="text-[36px] font-black text-accent" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>14.5</div>
            <p className="text-[12px] text-muted-foreground">of 50 credits this year</p>
            <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div initial={{width:0}} animate={{width:"29%"}} transition={{duration:1,delay:0.3}} className="h-full bg-accent rounded-full"/>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATS.map(c=>(
            <button key={c} onClick={()=>setFilter(c)}
              className={cn("px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-all border",c===filter?"bg-foreground text-primary-foreground border-foreground":"bg-card border-border text-muted-foreground hover:text-foreground hover:border-slate-300")}>
              {c}
            </button>
          ))}
        </div>
        {/* Course grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c,i)=>(
            <motion.div key={c.title} initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} transition={{delay:i*0.06}} viewport={{once:true}}
              className="group bg-card border border-border rounded-xl overflow-hidden hover:border-accent/25 hover:shadow-md hover:shadow-accent/5 transition-all cursor-pointer">
              <div className="h-2 bg-gradient-to-r from-accent to-emerald-400"/>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Chip color="green">{c.cat}</Chip>
                  <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-lg",c.level==="Advanced"?"bg-red-50 text-red-600":c.level==="Intermediate"?"bg-amber-50 text-amber-600":"bg-blue-50 text-blue-600")}>{c.level}</span>
                </div>
                <h4 className="text-[14px] font-semibold text-foreground leading-snug mb-3">{c.title}</h4>
                <div className="flex items-center gap-4 text-[12px] text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Clock size={12}/> {c.dur}</span>
                  <span className="flex items-center gap-1"><Award size={12}/> {c.cme} CME credits</span>
                  <span className="flex items-center gap-1"><Users size={12}/> {c.enrolled.toLocaleString()}</span>
                </div>
                <button className="w-full bg-secondary hover:bg-accent hover:text-white border border-border hover:border-accent text-foreground text-[12.5px] font-semibold py-2.5 rounded-lg transition-all">
                  Start module
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 8 — ENTERPRISE
// ══════════════════════════════════════════════════════════════════════════════
function EnterprisePage({ onNav }: { onNav:(p:Page)=>void }) {
  return (
    <div className="min-h-screen bg-background pt-16">
      {/* Hero */}
      <section className="border-b border-border bg-foreground text-primary-foreground px-4 sm:px-6 lg:px-8 py-24">
        <div className="max-w-7xl mx-auto">
          <Chip color="navy">Enterprise</Chip>
          <h1 className="text-[44px] text-white mt-4 mb-4 max-w-2xl">Clinical intelligence<br/>at hospital scale.</h1>
          <p className="text-[17px] text-slate-400 max-w-xl mb-10 leading-relaxed">Trusted by Mayo Clinic, Cleveland Clinic, Apollo Hospitals, and NHS England. Deploy MedEvidence AI enterprise-wide with SSO, HIPAA compliance, and EHR integration.</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={()=>onNav("pricing")} className="bg-accent text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-600 transition-colors text-[14px]">Request a demo</button>
            <button className="bg-white/10 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/15 transition-colors border border-white/10 text-[14px]">Contact sales</button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
          {[
            { icon:<Shield size={20}/>,    title:"HIPAA & GDPR Compliant",       desc:"BAA included. Data residency options (US/EU/APAC). PHI never stored in AI training. AES-256 encryption at rest, TLS 1.3 in transit." },
            { icon:<Lock size={20}/>,      title:"SSO & Identity Management",    desc:"SAML 2.0 and OIDC SSO. MFA enforcement. SCIM provisioning/de-provisioning. Zero-trust architecture with role-based access control." },
            { icon:<FileText size={20}/>,  title:"Local Protocol Integration",   desc:"Upload your hospital formulary, local antibiograms, and care protocols. AI integrates local and global evidence seamlessly." },
            { icon:<BarChart3 size={20}/>, title:"Usage Analytics & Audit Trails",desc:"Clinician adoption dashboards, query analytics by department, and exportable HIPAA-compliant audit logs for accreditation reviews." },
            { icon:<Zap size={20}/>,       title:"EHR Integration",              desc:"REST API and FHIR R4 support. Epic, Cerner, and Meditech connectors. Webhooks for real-time clinical decision support triggers." },
            { icon:<GraduationCap size={20}/>, title:"Unlimited CME Credits",    desc:"Unlimited CME credits for all clinicians on the account. Custom CME tracks aligned to departmental education goals." },
          ].map((f,i)=>(
            <motion.div key={f.title} initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} transition={{delay:i*0.07}} viewport={{once:true}}
              className="bg-card border border-border rounded-xl p-5 hover:border-accent/25 transition-all">
              <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-accent mb-4">{f.icon}</div>
              <h4 className="font-semibold text-foreground text-[14px] mb-2">{f.title}</h4>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Analytics chart */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-[30px] text-foreground mb-3">Measurable outcomes<br/>from day one.</h2>
            <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">Hospitals using MedEvidence AI enterprise report reduced time-to-treatment-decision, improved guideline adherence, and higher CME completion rates.</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { n:"73%", l:"Reduction in guideline search time" },
                { n:"91%", l:"Clinician satisfaction score" },
                { n:"2.4×", l:"CME completion rate increase" },
                { n:"90d", l:"Median time to measurable ROI" },
              ].map(s=>(
                <div key={s.l} className="bg-secondary border border-border rounded-xl p-4">
                  <div className="text-[28px] font-black text-accent" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{s.n}</div>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-snug">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <h4 className="font-semibold text-foreground text-[13px] mb-1">Monthly query volume — Enterprise hospitals</h4>
            <p className="text-[11px] text-muted-foreground mb-4">Average across 14 enterprise deployments</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={QUERY_ANALYTICS} margin={{top:4,right:4,bottom:0,left:-20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)"/>
                  <XAxis dataKey="m" tick={{fontSize:11,fill:"#64748b"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:"#64748b"}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:"#0f172a",border:"none",borderRadius:8,fontSize:11,color:"#e8edf4",padding:"6px 10px"}} cursor={{fill:"rgba(0,0,0,0.03)"}}/>
                  <Bar dataKey="q" fill="#059669" radius={[4,4,0,0]} opacity={0.9}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 9 — PRICING
// ══════════════════════════════════════════════════════════════════════════════
function PricingPage({ onNav }: { onNav:(p:Page)=>void }) {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center mb-14">
          <Chip color="slate">Pricing</Chip>
          <h1 className="text-[40px] text-foreground mt-4 mb-3">Simple, transparent pricing.</h1>
          <p className="text-[16px] text-muted-foreground mb-8">Start free. Upgrade when you need more. Cancel anytime.</p>
          <div className="inline-flex items-center gap-3 bg-secondary border border-border rounded-xl p-1.5">
            <button onClick={()=>setAnnual(false)} className={cn("px-4 py-2 rounded-lg text-[13px] font-medium transition-all",!annual?"bg-white shadow-sm text-foreground border border-border":"text-muted-foreground hover:text-foreground")}>Monthly</button>
            <button onClick={()=>setAnnual(true)} className={cn("px-4 py-2 rounded-lg text-[13px] font-medium transition-all",annual?"bg-white shadow-sm text-foreground border border-border":"text-muted-foreground hover:text-foreground")}>
              Annual <span className="text-emerald-600 font-semibold ml-1">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_PLANS.map(plan=>(
            <div key={plan.name} className={cn("rounded-2xl border overflow-hidden relative",plan.highlight?"border-accent shadow-xl shadow-accent/10":"border-border")}>
              {plan.highlight && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-emerald-400"/>}
              <div className={cn("p-7", plan.highlight?"bg-white":"bg-card")}>
                {plan.highlight && <span className="inline-block text-[11px] font-bold bg-accent text-white px-2.5 py-1 rounded-full mb-3">Most popular</span>}
                <h3 className="text-[20px] font-bold text-foreground mb-1">{plan.name}</h3>
                <p className="text-[13px] text-muted-foreground mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-[38px] font-black text-foreground" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                    {plan.price==="$49"&&annual?"$39":plan.price}
                  </span>
                  {plan.period && <span className="text-[14px] text-muted-foreground">{plan.period}</span>}
                </div>
                <button onClick={()=>onNav(plan.name==="Enterprise"?"enterprise":"ai-assistant")}
                  className={cn("w-full py-3 rounded-xl font-semibold text-[14px] transition-all",plan.highlight?"bg-accent text-white hover:bg-emerald-600":"bg-secondary border border-border text-foreground hover:bg-muted")}>
                  {plan.cta}
                </button>
              </div>
              <div className="border-t border-border px-7 py-5 space-y-2.5">
                {plan.features.map(f=>(
                  <div key={f} className="flex items-start gap-2.5 text-[13px] text-foreground">
                    <CircleCheck size={14} className="text-accent shrink-0 mt-0.5"/>
                    {f}
                  </div>
                ))}
                {plan.limits.map(l=>(
                  <div key={l} className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
                    <span className="w-3.5 h-3.5 rounded-full border border-border flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1 h-px bg-muted-foreground block"/>
                    </span>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-20">
          <h2 className="text-[26px] text-foreground text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-3">
            {[
              { q:"Is MedEvidence AI HIPAA compliant?", a:"Yes. All plans are HIPAA-compliant by default. Enterprise plans include a signed BAA, dedicated HIPAA compliance documentation, and data residency options." },
              { q:"Can I use MedEvidence AI offline?", a:"The web platform requires internet access to retrieve real-time guideline data. An offline mode for essential calculators is on our 2024 roadmap." },
              { q:"How current are the guidelines?", a:"We update indexed guidelines weekly. Major society guidelines (ACC/AHA, ESC, ADA, NICE) are typically indexed within 48 hours of publication." },
              { q:"Is AI content peer-reviewed?", a:"Our AI retrieval is grounded to indexed guidelines reviewed by our Editorial Board. We do not generate novel clinical advice — every claim is cited to a source." },
            ].map((faq,i)=>(
              <div key={i} className="bg-card border border-border rounded-xl p-5">
                <h4 className="font-semibold text-foreground text-[14px] mb-2">{faq.q}</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE 10 — ABOUT & EDITORIAL STANDARDS
// ══════════════════════════════════════════════════════════════════════════════
function AboutPage() {
  const [tab, setTab] = useState("Mission");
  const TABS = ["Mission","Editorial Board","Editorial Standards","Partner Institutions"];

  return (
    <div className="min-h-screen bg-background pt-16">
      <div className="border-b border-border bg-secondary/30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <Chip color="slate">About MedEvidence AI</Chip>
          <h1 className="text-[32px] text-foreground mt-2 mb-1">Built by clinicians. Trusted by hospitals.</h1>
          <p className="text-[14px] text-muted-foreground">Evidence integrity is our founding principle. Every clinical claim cites its source.</p>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Tabs */}
        <div className="flex gap-0 border-b border-border mb-8 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={cn("px-5 py-3 text-[13.5px] font-medium border-b-2 whitespace-nowrap transition-colors",tab===t?"border-accent text-accent":"border-transparent text-muted-foreground hover:text-foreground")}>
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.15}}>
            {tab==="Mission" && (
              <div className="space-y-6">
                <div className="bg-card border border-border rounded-xl p-7">
                  <h2 className="text-[26px] text-foreground mb-4">Our mission</h2>
                  <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">MedEvidence AI was founded on a single premise: clinicians deserve instant access to the highest quality evidence, structured in a way that directly answers the question in front of them — not after 30 minutes of guideline hunting.</p>
                  <p className="text-[15px] text-muted-foreground leading-relaxed">We are a team of physicians, clinical informaticists, and AI engineers committed to advancing evidence-based medicine through technology. Every feature is designed around the needs of clinicians at the point of care.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon:<Shield size={20}/>, title:"Evidence integrity", desc:"Every clinical recommendation is grounded to a primary source. We cite the guideline, the year, and the evidence class — always." },
                    { icon:<RefreshCw size={20}/>, title:"Continuously updated", desc:"Guidelines are indexed weekly. Our editorial team reviews all major society updates within 48 hours of publication." },
                    { icon:<Users size={20}/>, title:"Clinician-led design", desc:"Our product decisions are led by a 24-member clinical advisory board spanning 11 specialties across 6 countries." },
                  ].map(p=>(
                    <div key={p.title} className="bg-card border border-border rounded-xl p-5">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-accent mb-3">{p.icon}</div>
                      <h4 className="font-semibold text-foreground text-[14px] mb-2">{p.title}</h4>
                      <p className="text-[12.5px] text-muted-foreground leading-relaxed">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {tab==="Editorial Board" && (
              <div className="grid md:grid-cols-2 gap-5">
                {BOARD_MEMBERS.map(m=>(
                  <div key={m.name} className="bg-card border border-border rounded-xl p-5 flex gap-4 hover:border-accent/25 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-[15px] shrink-0">
                      {m.name.split(" ").filter((_,i)=>i===0||i===m.name.split(" ").length-1).map(n=>n[0]).join("")}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-[14px]">{m.name}</h4>
                      <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{m.role}</p>
                      <Chip color="green">{m.specialty}</Chip>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab==="Editorial Standards" && (
              <div className="space-y-4">
                {[
                  { title:"Source hierarchy", body:"Clinical recommendations are sourced exclusively from peer-reviewed clinical guidelines published by recognised national and international medical societies. Primary literature is cited only to support guidelines, not as standalone justification." },
                  { title:"Evidence grading", body:"We use the guideline organisation's own evidence classification system (e.g., ACC/AHA Class I–III, Level A–C; ESC Class I–III, Level A–C; GRADE for NICE) without modification. We do not re-grade evidence independently." },
                  { title:"Update policy", body:"Guidelines are reviewed for updates on a weekly cycle. When a major guideline update is published, our editorial team reviews and indexes changes within 48 hours. Superseded recommendations are archived, not deleted." },
                  { title:"Conflict of interest", body:"All editorial board members annually disclose financial relationships with pharmaceutical and device companies. Content that falls within an editor's disclosed conflict is reviewed by a non-conflicted board member before publication." },
                  { title:"AI transparency", body:"MedEvidence AI uses retrieval-augmented generation (RAG) to ground AI responses in indexed source documents. The AI does not generate novel clinical recommendations. Every AI response includes source citations and confidence scoring." },
                ].map(s=>(
                  <div key={s.title} className="bg-card border border-border rounded-xl p-5">
                    <h4 className="font-semibold text-foreground text-[14px] mb-2">{s.title}</h4>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">{s.body}</p>
                  </div>
                ))}
              </div>
            )}
            {tab==="Partner Institutions" && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {["Mayo Clinic","Cleveland Clinic","Johns Hopkins Medicine","NHS England","Apollo Hospitals Group","Aga Khan University Hospital","UCSF Health","Brigham & Women's Hospital","Toronto General Hospital","Karolinska Institutet","AIIMS New Delhi","Singapore General Hospital"].map(org=>(
                  <div key={org} className="bg-card border border-border rounded-xl p-5 flex items-center justify-center text-center hover:border-accent/25 transition-colors">
                    <span className="text-[13px] font-semibold text-foreground">{org}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FOOTER
// ══════════════════════════════════════════════════════════════════════════════
function Footer({ onNav }: { onNav:(p:Page)=>void }) {
  const cols: { h:string; links:{l:string;p:Page}[] }[] = [
    { h:"Platform", links:[{l:"Disease Hub",p:"disease"},{l:"Drug Database",p:"drug"},{l:"Guidelines",p:"guidelines"},{l:"Calculators",p:"calculators"},{l:"AI Assistant",p:"ai-assistant"},{l:"CME Center",p:"cme"}] },
    { h:"Company",  links:[{l:"About",p:"about"},{l:"Editorial Standards",p:"about"},{l:"Enterprise",p:"enterprise"},{l:"Pricing",p:"pricing"}] },
  ];
  return (
    <footer className="border-t border-border bg-secondary/30 mt-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr] gap-10 mb-10">
          <div>
            <button onClick={()=>onNav("home")} className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
                <Stethoscope size={14} className="text-white"/>
              </div>
              <span className="font-bold text-[16px] text-foreground" style={{fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                Med<span className="text-accent">Evidence</span><sup className="text-[9px] font-semibold text-muted-foreground ml-0.5">AI</sup>
              </span>
            </button>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs mb-4">Evidence-based clinical intelligence for modern medicine. Built by physicians, for physicians.</p>
            <div className="flex flex-wrap gap-2">
              {["HIPAA","SOC 2 Type II","ISO 27001","GDPR"].map(b=>(
                <span key={b} className="text-[10px] font-semibold border border-border px-2 py-1 rounded text-muted-foreground">{b}</span>
              ))}
            </div>
          </div>
          {cols.map(col=>(
            <div key={col.h}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground mb-4">{col.h}</p>
              <ul className="space-y-2.5">
                {col.links.map(({l,p})=>(
                  <li key={l}><button onClick={()=>onNav(p)} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">{l}</button></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[12px] text-muted-foreground">© 2024 MedEvidence AI, Inc. All rights reserved.</p>
          <p className="text-[11px] text-muted-foreground max-w-lg">For educational and clinical decision support only. Not a substitute for professional medical judgement. Always verify recommendations with current guidelines and patient-specific factors.</p>
        </div>
      </div>
    </footer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [dark, setDark] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const onNav = useCallback((p: Page) => { setPage(p); window.scrollTo({ top:0, behavior:"smooth" }); }, []);

  const PAGES: Record<Page, React.ReactNode> = {
    "home":         <HomePage onNav={onNav}/>,
    "disease":      <DiseasePage onNav={onNav}/>,
    "drug":         <DrugPage/>,
    "guidelines":   <GuidelinesPage/>,
    "calculators":  <CalculatorsPage/>,
    "ai-assistant": <AIAssistantPage/>,
    "cme":          <CMEPage/>,
    "enterprise":   <EnterprisePage onNav={onNav}/>,
    "pricing":      <PricingPage onNav={onNav}/>,
    "about":        <AboutPage/>,
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar page={page} onNav={onNav} dark={dark} setDark={setDark}/>
      <AnimatePresence mode="wait">
        <motion.div key={page} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.18}}>
          {PAGES[page]}
        </motion.div>
      </AnimatePresence>
      {page!=="ai-assistant" && <Footer onNav={onNav}/>}
    </div>
  );
}

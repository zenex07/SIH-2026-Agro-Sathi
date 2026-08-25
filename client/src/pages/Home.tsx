import { useAuth } from "@/_core/hooks/useAuth";
import { MapView } from "@/components/Map";
import { AIChatBox, type Message as ChatMessage } from "@/components/AIChatBox";
import { FieldIntelligence } from "@/components/FieldIntelligence";
import { startLogin } from "@/const";
import { type AppLanguage, useAppPreferences } from "@/contexts/AppPreferences";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CloudSun,
  FileImage,
  Leaf,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Settings2,
  Store,
  Sun,
  Upload,
  Wheat,
  X,
} from "lucide-react";

type WorkspacePage = "home" | "diagnose" | "market" | "intelligence" | "farms" | "settings";
type CropOption = { name: string; cedaCommodityId: number };

const crops: CropOption[] = [
  { name: "Cotton", cedaCommodityId: 15 },
  { name: "Soyabean", cedaCommodityId: 13 },
  { name: "Wheat", cedaCommodityId: 1 },
  { name: "Paddy (Dhan)", cedaCommodityId: 2 },
  { name: "Maize", cedaCommodityId: 4 },
  { name: "Onion", cedaCommodityId: 23 },
  { name: "Potato", cedaCommodityId: 24 },
  { name: "Tomato", cedaCommodityId: 78 },
];

const navItems: Array<{ id: WorkspacePage; icon: typeof Leaf }> = [
  { id: "home", icon: Leaf },
  { id: "diagnose", icon: Camera },
  { id: "market", icon: Store },
  { id: "intelligence", icon: Sparkles },
  { id: "farms", icon: Wheat },
  { id: "settings", icon: Settings2 },
];

const navigationKey: Record<WorkspacePage, string> = { home: "today", diagnose: "diagnose", market: "market", intelligence: "Field intel", farms: "farms", settings: "settings" };

function formatRupees(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function brand() {
  return <div className="pro-brand"><img src="/manus-storage/agrosaarthi-mark_386e8943.png" alt="" /><span>AgroSaarthi</span><small>Farm intelligence, gently delivered</small></div>;
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const { t } = useAppPreferences();
  return (
    <main className="auth-canvas">
      <section className="auth-story" aria-label="About AgroSaarthi">
        {brand()}
        <div className="auth-story-copy">
          <span className="eyebrow">{t("authKicker")}</span>
          <h1>{t("authTitle")}</h1>
          <p>{t("authBody")}</p>
        </div>
        <div className="auth-proof"><ShieldCheck size={18} /><span>{t("authPrivacy")}</span></div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-contour" aria-hidden="true" />
        <div className="auth-mobile-brand">{brand()}</div>
        <div className="auth-field-tab"><Leaf size={13} /><span>FARM RECORD · 2026</span><i>01</i></div>
        <div className="auth-tabs" role="tablist" aria-label="Account action">
          <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")}>{t("loginTab")}</button>
          <button role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")}>{t("signupTab")}</button>
        </div>
        <div className="auth-form-copy">
          <span className="eyebrow">{mode === "login" ? t("welcome") : t("signupTab")}</span>
          <h2>{mode === "login" ? "Your field, ready when you are." : "Create your private farmer workspace."}</h2>
          <p>{mode === "login" ? "Continue securely to review your farms and crop observations." : "Your first secure sign-in creates an account, ready for your farms and crop records."}</p>
        </div>
        <button className="pro-primary auth-cta" onClick={() => startLogin()}>{mode === "login" ? t("openRecord") : t("beginRecord")}<ArrowRight size={17} /></button>
        <p className="auth-note"><ShieldCheck size={14} /> Secure sign-in is used instead of a password form. Your farms, exact map pins, and crop observations stay in your own record.</p>
        <div className="auth-trust-strip"><span><MapPin size={14} /> Exact locations stay private</span><span><Store size={14} /> Market dates stay visible</span><span><Leaf size={14} /> Crop notes stay farm-specific</span></div>
      </section>
    </main>
  );
}

function FarmPicker({ farms, selectedFarmId, onSelect, onCreate }: { farms: Array<{ id: number; name: string; crop: string }>; selectedFarmId: number | null; onSelect: (id: number) => void; onCreate: () => void }) {
  const [open, setOpen] = useState(false);
  const { t } = useAppPreferences();
  const current = farms.find(farm => farm.id === selectedFarmId);
  return (
    <div className="farm-picker">
      <button className="farm-picker-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open}>
        <span className="farm-picker-icon"><Wheat size={17} /></span>
        <span><small>{t("activeFarm")}</small><strong>{current ? `${current.name} · ${current.crop}` : t("chooseFarm")}</strong></span>
        <ChevronDown size={16} />
      </button>
      {open && <div className="farm-picker-menu">
        {farms.map(farm => <button key={farm.id} onClick={() => { onSelect(farm.id); setOpen(false); }} className={farm.id === selectedFarmId ? "is-current" : ""}><span><strong>{farm.name}</strong><small>{farm.crop}</small></span><CheckCircle2 size={15} /></button>)}
        <button className="farm-picker-add" onClick={() => { setOpen(false); onCreate(); }}><Plus size={16} /> {t("addFarm")}</button>
      </div>}
    </div>
  );
}

function AppShell({ children, active, setActive, farms, selectedFarmId, setSelectedFarmId, onCreateFarm, userName, onLogout }: { children: React.ReactNode; active: WorkspacePage; setActive: (page: WorkspacePage) => void; farms: Array<{ id: number; name: string; crop: string }>; selectedFarmId: number | null; setSelectedFarmId: (id: number) => void; onCreateFarm: () => void; userName: string; onLogout: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useAppPreferences();
  return <div className="pro-shell">
    <aside className="pro-rail">
      {brand()}
      <FarmPicker farms={farms} selectedFarmId={selectedFarmId} onSelect={setSelectedFarmId} onCreate={onCreateFarm} />
      <nav className="pro-nav" aria-label="Farmer workspace">
        {navItems.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setActive(item.id)} className={active === item.id ? "is-active" : ""}><Icon size={18} /><span>{t(navigationKey[item.id])}</span></button>; })}
      </nav>
      <div className="pro-rail-foot"><div className="profile-dot">{userName.slice(0, 1).toUpperCase()}</div><div><strong>{userName}</strong><small>{t("protectedAccount")}</small></div><button aria-label={t("signOut")} onClick={onLogout}><LogOut size={16} /></button></div>
    </aside>
    <section className="pro-stage">
      <header className="pro-topbar">
        <div className="pro-mobile-brand">{brand()}</div>
        <div className="sync-status"><span /> {t("saved")}</div>
        <button className="pro-icon mobile-only" aria-label="Open navigation" onClick={() => setMobileMenuOpen(value => !value)}>{mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </header>
      {mobileMenuOpen && <nav className="pro-mobile-menu">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setActive(item.id); setMobileMenuOpen(false); }} className={active === item.id ? "is-active" : ""}><Icon size={18} />{t(navigationKey[item.id])}</button>; })}<button onClick={onCreateFarm}><Plus size={18} /> {t("addFarm")}</button></nav>}
      <main className="pro-content">{children}</main>
      <nav className="pro-bottom-nav" aria-label="Mobile farmer workspace">{navItems.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setActive(item.id)} className={active === item.id ? "is-active" : ""}><Icon size={18} /><span>{t(navigationKey[item.id])}</span></button>; })}</nav>
    </section>
  </div>;
}

function HomeView({ farm, onPage }: { farm: { name: string; crop: string; locationLabel: string; areaAcres: number } | undefined; onPage: (page: WorkspacePage) => void }) {
  const { t } = useAppPreferences();
  return <div className="pro-page home-pro-page">
    <section className="pro-hero">
      <div><span className="eyebrow">{t("homeKicker")}</span><h1>{farm ? `${farm.name} is ready for today.` : t("homeEmptyTitle")}</h1><p>{farm ? `${farm.crop} · ${farm.areaAcres} acres · ${farm.locationLabel}` : t("homeEmptyBody")}</p><div className="hero-chips"><span><ShieldCheck size={14} /> Private by default</span><span><MapPin size={14} /> Farm-specific records</span></div></div>
      <div className="hero-photo-pro" />
    </section>
    <section className="pro-action-grid">
      <article className="pro-card action-card"><span className="season-stamp">NEXT STEP</span><Camera size={22} /><h2>{t("photoCard")}</h2><p>{t("photoBody")}</p><button className="pro-primary" onClick={() => onPage("diagnose")}>{t("openDiagnosis")} <ArrowRight size={16} /></button></article>
      <article className="pro-card notice-card"><span className="season-stamp">MARKET SIGNAL</span><Store size={21} /><h2>{t("priceCard")}</h2><p>{t("priceBody")}</p><button className="pro-outline" onClick={() => onPage("market")}>{t("openMarket")} <ArrowRight size={16} /></button></article>
      <article className="pro-card quiet-card"><span className="season-stamp">FARM RECORD</span><MapPin size={21} /><h2>{t("farmsCard")}</h2><p>{t("farmsBody")}</p><button className="pro-outline" onClick={() => onPage("farms")}>{t("manageFarms")} <ArrowRight size={16} /></button></article>
    </section>
    <section className="ai-trust-panel"><div><span className="eyebrow">How crop AI is used</span><h2>Observation first. Clear evidence. Farmer stays in control.</h2></div><div className="ai-trust-steps"><span><b>01</b> Crop photo stored in your record</span><span><b>02</b> Visible signs reviewed, not guessed</span><span><b>03</b> Practical next checks, with expert review where needed</span></div></section>
    <section className="product-architecture"><div className="architecture-intro"><span className="eyebrow">Product architecture</span><h2>One accountable path from farm detail to next step.</h2><p>AgroSaarthi separates the farmer’s private records from public market data and makes every source, upload, and AI review visible in the experience.</p></div><div className="architecture-steps"><article><b>01</b><Camera size={20} /><strong>Field capture</strong><span>Camera or saved photo</span></article><i><ArrowRight size={16} /></i><article><b>02</b><ShieldCheck size={20} /><strong>Protected record</strong><span>Account, farms & location</span></article><i><ArrowRight size={16} /></i><article><b>03</b><Sparkles size={20} /><strong>Photo triage</strong><span>Visible evidence only</span></article><i><ArrowRight size={16} /></i><article><b>04</b><Store size={20} /><strong>Market context</strong><span>CEDA latest available data</span></article></div></section>
  </div>;
}

function CropDiagnosis({ farms, selectedFarm, onOpenFarms }: { farms: Array<{ id: number; name: string; crop: string }>; selectedFarm: { id: number; name: string; crop: string } | undefined; onOpenFarms: () => void }) {
  const { t } = useAppPreferences();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadedId, setUploadedId] = useState<number | null>(null);
  const [quickCrop, setQuickCrop] = useState(crops[0].name);
  const [quickResult, setQuickResult] = useState<{ status: string; resultTitle: string | null; confidence: string | null; summary: string | null; evidence: string | null; actions: string | null } | null>(null);
  const upload = trpc.diagnosis.upload.useMutation({ onSuccess: result => { setUploadedId(result.id); setMessage("Photo saved safely. You can now request an AI review."); } });
  const analyze = trpc.diagnosis.analyze.useMutation({ onSuccess: result => { setMessage(result?.status === "review" ? "Review complete. Please treat this as a photo-based check and inspect the field if it looks serious." : "Review complete. Read the visible evidence and next checks below."); } });
  const quickAssess = trpc.assistant.assessPhoto.useMutation({ onSuccess: result => { setQuickResult(result); setMessage("Photo quality check complete. Add a farm later if you want to save this image in a farm record."); } });

  const readFile = (file?: File) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) { setMessage("Choose a JPEG, PNG, or WEBP photo."); return; }
    if (file.size > 5_000_000) { setMessage("Choose a photo smaller than 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { setPreview(String(reader.result)); setUploadedId(null); setMessage(t("photoReady")); };
    reader.readAsDataURL(file);
  };
  const savePhoto = () => {
    if (!selectedFarm || !preview) return;
    upload.mutate({ farmId: selectedFarm.id, crop: selectedFarm.crop, dataUrl: preview });
  };
  const assessNow = () => { if (preview) quickAssess.mutate({ crop: selectedFarm?.crop ?? quickCrop, dataUrl: preview }); };
  const displayResult = quickResult ?? analyze.data ?? null;

  return <div className="pro-page">
    <section className="pro-heading"><div><span className="eyebrow">{t("diagnosisKicker")}</span><h1>{t("diagnosisTitle")}</h1><p>{t("diagnosisBody")}</p></div>{selectedFarm ? <span className="active-farm-chip"><Wheat size={14} /> {selectedFarm.name} · {selectedFarm.crop}</span> : <button className="pro-outline" onClick={onOpenFarms}>{t("addFirstFarm")} <ArrowRight size={15} /></button>}</section>
    <>
      <section className="diagnosis-grid">
        <article className="capture-card pro-card">
          <div className={preview ? "preview-frame has-image" : "preview-frame"}>{preview ? <img src={preview} alt="Selected crop to review" /> : <><Leaf size={42} /><strong>Place one leaf in the frame</strong><span>Use a close, sharp photo with daylight.</span></>}<div className="capture-frame-guide" /></div>
          <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={event => readFile(event.target.files?.[0])} />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => readFile(event.target.files?.[0])} />
          <div className="capture-buttons"><button className="pro-primary" onClick={() => cameraRef.current?.click()}><Camera size={17} /> {t("takePhoto")}</button><button className="pro-outline" onClick={() => fileRef.current?.click()}><Upload size={17} /> {t("uploadPhoto")}</button></div>
          {!selectedFarm && <label className="quick-crop-select">Crop in this photo<select value={quickCrop} onChange={event => setQuickCrop(event.target.value)}>{crops.map(item => <option key={item.name}>{item.name}</option>)}</select></label>}
        </article>
        <article className="pro-card diagnosis-guide"><span className="season-stamp">PHOTO CHECKLIST</span><h2>A useful image shows:</h2><ul><li><CheckCircle2 size={16} /> One leaf or crop area, close and in focus</li><li><CheckCircle2 size={16} /> The top and underside if spots are present</li><li><CheckCircle2 size={16} /> Natural light without flash glare</li></ul><div className="diagnosis-status">{upload.isPending || analyze.isPending || quickAssess.isPending ? <Loader2 size={17} className="spin" /> : <ShieldCheck size={17} />}{message ?? "Choose a photo, then run a photo quality check."}</div>{preview && !selectedFarm && <button className="pro-primary full" disabled={quickAssess.isPending} onClick={assessNow}>{quickAssess.isPending ? <><Loader2 size={16} className="spin" /> Checking photo…</> : <><Sparkles size={16} /> Check crop photo quality</>}</button>}{preview && selectedFarm && !uploadedId && <button className="pro-primary full" disabled={upload.isPending} onClick={savePhoto}>{upload.isPending ? <><Loader2 size={16} className="spin" /> Saving…</> : <>{t("savePhoto")} · {selectedFarm.name}</>}</button>}{uploadedId && <button className="pro-primary full" disabled={analyze.isPending} onClick={() => analyze.mutate({ diagnosisId: uploadedId })}>{analyze.isPending ? <><Loader2 size={16} className="spin" /> Reviewing photo…</> : <><Sparkles size={16} /> {t("reviewPhoto")}</>}</button>}</article>
      </section>
      {displayResult && <DiagnosisResult result={displayResult} />}
    </>
  </div>;
}

function DiagnosisResult({ result }: { result: { status: string; resultTitle: string | null; confidence: string | null; summary: string | null; evidence: string | null; actions: string | null } | null }) {
  const evidence = useMemo(() => { try { return result?.evidence ? JSON.parse(result.evidence) as string[] : []; } catch { return []; } }, [result]);
  const actions = useMemo(() => { try { return result?.actions ? JSON.parse(result.actions) as string[] : []; } catch { return []; } }, [result]);
  if (!result) return null;
  return <section className="diagnosis-result pro-card"><div><span className="eyebrow">Photo review · {result.confidence ?? "pending"} confidence</span><h2>{result.resultTitle ?? "Photo saved for review"}</h2><p>{result.summary}</p></div><div className="result-columns"><div><strong>Visible signs</strong>{evidence.map(item => <span key={item}><CheckCircle2 size={15} /> {item}</span>)}</div><div><strong>Next checks</strong>{actions.map(item => <span key={item}><ArrowRight size={15} /> {item}</span>)}</div></div><p className="result-caveat"><CircleAlert size={15} /> This is image-based triage, not a diagnosis or pesticide recommendation. Ask a qualified local expert if symptoms spread, worsen, or affect the crop broadly.</p></section>;
}

function CropCompanion({ farm, activeScreen, screenSummary }: { farm: { name: string; crop: string; locationLabel: string; areaAcres?: number; irrigationMethod?: string } | undefined; activeScreen: WorkspacePage; screenSummary: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useAppPreferences();
  const [responseMode, setResponseMode] = useState<"live" | "fallback" | "idle">("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "I’m Saarthi, your crop companion. Ask about a field observation, crop-photo check, or how to use this workspace." }]);
  const ask = trpc.assistant.ask.useMutation({
    onSuccess: result => { setResponseMode(result.mode); setMessages(current => [...current, { role: "assistant", content: result.answer }]); },
    onError: () => { setResponseMode("fallback"); setMessages(current => [...current, { role: "assistant", content: "I could not reach the live companion just now. Please try again when your connection is stable." }]); },
  });
  const onSendMessage = (content: string) => {
    setMessages(current => [...current, { role: "user", content }]);
    ask.mutate({ message: content, farm: farm ? { name: farm.name, crop: farm.crop, locationLabel: farm.locationLabel } : null, activeScreen, screenSummary: screenSummary });
  };
  return <aside className={open ? "crop-companion is-open" : "crop-companion"} aria-label="Saarthi crop companion">
    {open && <section className="companion-panel" role="dialog" aria-modal="false" aria-label="Chat with Saarthi">
      <header><div><span className="companion-orb"><Bot size={18} /></span><span><strong>{t("cropCompanion")}</strong><small>{ask.isPending ? `Reading ${activeScreen} context…` : responseMode === "live" ? `Live Gemini · ${activeScreen}` : responseMode === "fallback" ? "Connection-aware fallback" : farm ? `${farm.name} · ${farm.crop}` : `Screen-aware · ${activeScreen}`}</small></span></div><button className="pro-icon" onClick={() => setOpen(false)} aria-label={t("closeSaarthi")}><X size={17} /></button></header>
      <AIChatBox messages={messages} onSendMessage={onSendMessage} isLoading={ask.isPending} height="420px" placeholder="Ask about this screen, your crop, or farm record…" suggestedPrompts={activeScreen === "diagnose" ? ["What makes this crop photo useful?", "What visible signs should I compare?", "When should I call an expert?"] : activeScreen === "market" ? ["How should I use this mandi date?", "What may change my realised price?", "What should I ask a buyer?"] : activeScreen === "intelligence" ? ["How should I use the trend range?", "What belongs in my harvest brief?", "How does voice guidance work offline?"] : ["How do I take a useful crop photo?", "What should I note before calling an expert?", "What can I do on this screen?"]} />
      <p className="companion-caveat"><CircleAlert size={13} /> Photo and chat guidance support your field check; they do not replace a local expert.</p>
    </section>}
    <button className="companion-launch" onClick={() => setOpen(value => !value)} aria-expanded={open}><span className="companion-orb"><Sparkles size={19} /></span><span><strong>{open ? t("closeSaarthi") : t("assistant")}</strong><small>{t("cropCompanion")}</small></span></button>
  </aside>;
}

function SettingsView({ userName, userEmail, onLogout }: { userName: string; userEmail?: string | null; onLogout: () => void }) {
  const { language, setLanguage, t } = useAppPreferences();
  const { theme, toggleTheme } = useTheme();
  const languages: Array<{ code: AppLanguage; label: string; native: string }> = [{ code: "en", label: "English", native: "English" }, { code: "hi", label: "Hindi", native: "हिन्दी" }, { code: "mr", label: "Marathi", native: "मराठी" }];
  return <div className="pro-page settings-page"><section className="pro-heading"><div><span className="eyebrow">{t("settings")}</span><h1>{t("settingsTitle")}</h1><p>{t("settingsBody")}</p></div><span className="active-farm-chip"><Settings2 size={14} /> {t("account")}</span></section>
    <section className="settings-grid">
      <article className="pro-card settings-card language-card"><div className="settings-card-head"><span className="settings-icon"><Settings2 size={20} /></span><div><span className="season-stamp">{t("translationPreview")}</span><h2>{t("language")}</h2></div></div><p>{t("languageHelper")}</p><div className="language-options">{languages.map(item => <button key={item.code} onClick={() => setLanguage(item.code)} className={language === item.code ? "is-selected" : ""}><strong>{item.native}</strong><small>{item.label}</small>{language === item.code && <CheckCircle2 size={15} />}</button>)}</div></article>
      <article className="pro-card settings-card theme-card"><div className="settings-card-head"><span className="settings-icon">{theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}</span><div><span className="season-stamp">{t("themePreview")}</span><h2>{t("theme")}</h2></div></div><p>{t("themeHelper")}</p><button className="theme-toggle" onClick={toggleTheme}><span className={theme === "light" ? "is-active" : ""}><Sun size={16} /> {t("light")}</span><span className={theme === "dark" ? "is-active" : ""}><Moon size={16} /> {t("dark")}</span></button></article>
      <article className="pro-card settings-card account-card"><div className="settings-card-head"><span className="settings-icon"><ShieldCheck size={20} /></span><div><span className="season-stamp">{t("secureAccount")}</span><h2>{t("account")}</h2></div></div><div className="account-summary"><span className="profile-dot">{userName.slice(0, 1).toUpperCase()}</span><span><strong>{userName}</strong><small>{userEmail ?? t("protectedAccount")}</small></span></div><p>{t("accountHelper")}</p><button className="pro-outline" onClick={onLogout}><LogOut size={15} /> {t("signOut")}</button></article>
    </section>
  </div>;
}

function MarketView({ farm }: { farm: { name: string; crop: string; cedaCommodityId: number | null; locationLabel: string } | undefined }) {
  const { t } = useAppPreferences();
  const market = trpc.market.latest.useQuery({ commodityId: farm?.cedaCommodityId ?? 0 }, { enabled: Boolean(farm?.cedaCommodityId), retry: false, refetchOnWindowFocus: false });
  return <div className="pro-page"><section className="pro-heading market-heading"><div><span className="eyebrow">{t("marketKicker")}</span><h1>{t("marketTitle")}</h1><p>{t("marketBody")}</p></div>{farm && <span className="active-farm-chip"><MapPin size={14} /> {farm.locationLabel}</span>}</section>
    {!farm ? <EmptyFarmState onOpenFarms={() => undefined} /> : !farm.cedaCommodityId ? <section className="pro-card unsupported-card"><Wheat size={25} /><h2>Choose a supported crop for market prices.</h2><p>This farm’s crop is not currently mapped to the CEDA commodity list. Edit it or create another farm with a supported crop such as Cotton, Soyabean, Wheat, Maize, Onion, Potato, or Tomato.</p></section> : <section className="market-live-grid"><article className="price-panel pro-card"><span className="season-stamp">{farm.crop.toUpperCase()} · CEDA</span><div className="price-panel-top"><div><h2>{farm.crop}</h2><p>{farm.name}</p></div><button className="pro-icon" onClick={() => market.refetch()} aria-label="Refresh latest price" disabled={market.isFetching}><RefreshCw size={17} className={market.isFetching ? "spin" : ""} /></button></div>{market.isLoading || market.isFetching ? <div className="price-loading"><Loader2 className="spin" /> Checking latest available data…</div> : market.data?.status === "available" ? <><strong className="price-value">{formatRupees(market.data.modalPrice)} <small>{market.data.unit}</small></strong><div className="price-range"><span>Min {formatRupees(market.data.minPrice)}</span><span>Max {formatRupees(market.data.maxPrice)}</span></div><div className="market-source"><CheckCircle2 size={15} /><span><strong>{market.data.freshnessLabel}</strong>{market.data.source} · Upstream date: {market.data.date}</span></div></> : <div className="market-empty"><CircleAlert size={22} /><h3>Price currently unavailable</h3><p>{market.data?.message ?? "The source did not return a price for this crop. Refresh later."}</p></div>}</article><article className="pro-card market-method"><span className="season-stamp">USE WITH CONTEXT</span><h2>What this price means</h2><p>The modal price is the most commonly reported wholesale price in the source data. Local quality, grade, transport, quantity, and mandi conditions can differ.</p><div><span><ShieldCheck size={16} /> Source visible</span><span><RefreshCw size={16} /> On-demand refresh</span><span><CircleAlert size={16} /> No price forecast is presented as a guarantee</span></div></article></section>}
  </div>;
}

function EmptyFarmState({ onOpenFarms }: { onOpenFarms: () => void }) { const { t } = useAppPreferences(); return <section className="empty-farm pro-card"><Wheat size={30} /><h2>{t("addFirstFarm")}</h2><p>{t("addFirstFarmBody")}</p><button className="pro-primary" onClick={onOpenFarms}><Plus size={17} /> {t("createFarm")}</button></section>; }

function FarmMapPicker({ latitude, longitude, onChange }: { latitude: number; longitude: number; onChange: (next: { latitude: number; longitude: number; locationLabel: string }) => void }) {
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const mapReady = useCallback((map: google.maps.Map) => {
    const placeMarker = (position: google.maps.LatLngLiteral) => {
      markerRef.current?.map && (markerRef.current.map = null);
      markerRef.current = new google.maps.marker.AdvancedMarkerElement({ map, position, title: "Farm location" });
      onChange({ latitude: position.lat, longitude: position.lng, locationLabel: `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` });
    };
    placeMarker({ lat: latitude, lng: longitude });
    map.addListener("click", (event: google.maps.MapMouseEvent) => { if (event.latLng) placeMarker(event.latLng.toJSON()); });
  }, [latitude, longitude, onChange]);
  return <div className="farm-map-picker"><MapView initialCenter={{ lat: latitude, lng: longitude }} initialZoom={14} onMapReady={mapReady} /><p><MapPin size={15} /> Tap the map to place the farm pin. Your precise point is stored only in your account.</p></div>;
}

function FarmsView({ farms, selectedFarmId, onSelect, onCreate, onUpdate, isSaving, onOpenCreate }: { farms: Array<{ id: number; name: string; crop: string; cedaCommodityId: number | null; areaAcres: number; irrigationMethod: string; locationLabel: string; latitude: number; longitude: number }>; selectedFarmId: number | null; onSelect: (id: number) => void; onCreate: (values: { name: string; crop: string; cedaCommodityId: number | null; areaAcres: number; irrigationMethod: string; latitude: number; longitude: number; locationLabel: string }) => void; onUpdate: (id: number, values: { name: string; crop: string; cedaCommodityId: number | null; areaAcres: number; irrigationMethod: string; latitude: number; longitude: number; locationLabel: string }) => void; isSaving: boolean; onOpenCreate: () => void }) {
  const { t } = useAppPreferences();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [crop, setCrop] = useState(crops[0].name);
  const [area, setArea] = useState("1");
  const [irrigation, setIrrigation] = useState("Drip irrigation");
  const [location, setLocation] = useState({ latitude: 22.7196, longitude: 75.8577, locationLabel: "Indore, Madhya Pradesh" });
  const startAdd = () => { setEditingId(null); setName(""); setCrop(crops[0].name); setArea("1"); setIrrigation("Drip irrigation"); setLocation({ latitude: 22.7196, longitude: 75.8577, locationLabel: "Indore, Madhya Pradesh" }); setShowForm(true); onOpenCreate(); };
  const startEdit = (farm: typeof farms[number]) => { setEditingId(farm.id); setName(farm.name); setCrop(farm.crop); setArea(String(farm.areaAcres)); setIrrigation(farm.irrigationMethod); setLocation({ latitude: farm.latitude, longitude: farm.longitude, locationLabel: farm.locationLabel }); setShowForm(true); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); const cropData = crops.find(item => item.name === crop); const values = { name, crop, cedaCommodityId: cropData?.cedaCommodityId ?? null, areaAcres: Number(area), irrigationMethod: irrigation, ...location }; if (editingId) onUpdate(editingId, values); else onCreate(values); setShowForm(false); setName(""); };
  return <div className="pro-page"><section className="pro-heading"><div><span className="eyebrow">{t("farmKicker")}</span><h1>{t("farmTitle")}</h1><p>{t("farmBody")}</p></div><button className="pro-primary" onClick={startAdd}><Plus size={17} /> {t("createFarm")}</button></section>
    <section className="farm-record-grid">{farms.map(farm => <article className={farm.id === selectedFarmId ? "farm-record is-selected" : "farm-record"} key={farm.id}><button className="farm-record-select" onClick={() => onSelect(farm.id)}><div><span className="season-stamp">{farm.crop}</span><h2>{farm.name}</h2><p><MapPin size={14} /> {farm.locationLabel}</p></div><div className="farm-record-meta"><span>{farm.areaAcres} acres</span><span>{farm.irrigationMethod}</span></div>{farm.id === selectedFarmId && <CheckCircle2 className="farm-selected-icon" size={20} />}</button><button className="farm-edit" onClick={() => startEdit(farm)}>Edit farm</button></article>)}</section>
    {farms.length === 0 && <EmptyFarmState onOpenFarms={startAdd} />}
    {showForm && <div className="modal-scrim" role="presentation"><section className="farm-form-modal" role="dialog" aria-modal="true" aria-label={editingId ? t("editFarm") : t("createFarm")}><button className="modal-close" onClick={() => setShowForm(false)} aria-label="Close"><X size={19} /></button><span className="eyebrow">{editingId ? t("editFarm") : t("newFarm")}</span><h2>{t("fieldDetails")}</h2><form onSubmit={submit}><label>Farm name<input required value={name} onChange={event => setName(event.target.value)} placeholder="e.g., Anand north plot" /></label><div className="form-row"><label>Crop<select value={crop} onChange={event => setCrop(event.target.value)}>{crops.map(item => <option key={item.name}>{item.name}</option>)}</select></label><label>Area in acres<input required type="number" min="0.1" max="10000" step="0.1" value={area} onChange={event => setArea(event.target.value)} /></label></div><label>Irrigation method<select value={irrigation} onChange={event => setIrrigation(event.target.value)}><option>Drip irrigation</option><option>Sprinkler</option><option>Canal irrigation</option><option>Rain-fed</option><option>Manual watering</option></select></label><label>Farm location<small>Tap the map to set the exact farm point.</small><FarmMapPicker latitude={location.latitude} longitude={location.longitude} onChange={setLocation} /></label><div className="form-location"><MapPin size={15} /> {location.locationLabel}</div><button className="pro-primary full" type="submit" disabled={isSaving}>{isSaving ? <><Loader2 className="spin" size={16} /> Saving farm…</> : <><CheckCircle2 size={16} /> {editingId ? t("updateFarm") : t("saveFarm")}</>}</button></form></section></div>}
  </div>;
}

function FarmerWorkspace({ userName, userEmail }: { userName: string; userEmail?: string | null }) {
  const [active, setActive] = useState<WorkspacePage>("home");
  const [selectedFarmId, setSelectedFarmId] = useState<number | null>(null);
  const [creatingFarm, setCreatingFarm] = useState(false);
  const { logout } = useAuth();
  const utils = trpc.useUtils();
  const farmsQuery = trpc.farm.list.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const createFarm = trpc.farm.create.useMutation({ onSuccess: farm => { setSelectedFarmId(farm.id); setCreatingFarm(false); utils.farm.list.invalidate(); } });
  const updateFarm = trpc.farm.update.useMutation({ onSuccess: farm => { setSelectedFarmId(farm.id); setCreatingFarm(false); utils.farm.list.invalidate(); } });
  useEffect(() => { if (!selectedFarmId && farmsQuery.data?.[0]) setSelectedFarmId(farmsQuery.data[0].id); }, [farmsQuery.data, selectedFarmId]);
  const farms = farmsQuery.data ?? [];
  const selectedFarm = farms.find(farm => farm.id === selectedFarmId);
  const { language } = useAppPreferences();
  const { theme } = useTheme();
  const marketSnapshot = trpc.market.latest.useQuery({ commodityId: selectedFarm?.cedaCommodityId ?? 0 }, { enabled: active === "market" && Boolean(selectedFarm?.cedaCommodityId), retry: false, refetchOnWindowFocus: false });
  const diagnosisSnapshot = trpc.diagnosis.list.useQuery(undefined, { enabled: active === "diagnose", retry: false, refetchOnWindowFocus: false });
  const forecastSnapshot = trpc.market.forecast.useQuery({ commodityId: selectedFarm?.cedaCommodityId ?? 0 }, { enabled: active === "intelligence" && Boolean(selectedFarm?.cedaCommodityId), retry: false, refetchOnWindowFocus: false });
  const harvestSnapshot = trpc.linkage.list.useQuery(undefined, { enabled: active === "intelligence", retry: false, refetchOnWindowFocus: false });
  const screenSummary = useMemo(() => {
    const farmSummary = selectedFarm ? `Selected farm: ${selectedFarm.name}; crop: ${selectedFarm.crop}; area: ${selectedFarm.areaAcres} acres; irrigation: ${selectedFarm.irrigationMethod}.` : "No selected farm.";
    if (active === "market") {
      const market = marketSnapshot.data;
      const marketState = market?.status === "available" ? `Latest available CEDA price: ${market.modalPrice ?? "not supplied"} ${market.unit}; upstream date: ${market.date}; source: ${market.source}.` : `Market data state: ${market?.message ?? "not currently available"}.`;
      return `${farmSummary} ${marketState}`;
    }
    if (active === "diagnose") {
      const diagnosis = diagnosisSnapshot.data?.[0];
      return `${farmSummary} Crop diagnosis screen with camera and saved-photo review. Latest saved review: ${diagnosis ? `${diagnosis.resultTitle ?? diagnosis.status}; confidence: ${diagnosis.confidence ?? "pending"}.` : "none."}`;
    }
    if (active === "intelligence") {
      const forecast = forecastSnapshot.data;
      const forecastState = forecast?.status === "available" ? `Seven-day trend midpoint: ${forecast.projected} ${forecast.unit}; direction: ${forecast.direction}; confidence: ${forecast.confidence}.` : `Trend state: ${forecast?.message ?? "not available"}.`;
      return `${farmSummary} ${forecastState} Saved harvest briefs: ${harvestSnapshot.data?.length ?? 0}.`;
    }
    if (active === "settings") return `Settings screen. Workspace language: ${language}; visual theme: ${theme}.`;
    if (active === "farms") return `${farmSummary} Farm records screen with private location, crop, area, and irrigation editing.`;
    return `${farmSummary} Home screen with crop photo, market, farm records, and field-intelligence entry points.`;
  }, [active, diagnosisSnapshot.data, forecastSnapshot.data, harvestSnapshot.data, language, marketSnapshot.data, selectedFarm, theme]);
  const openFarms = () => setActive("farms");
  const create = (values: Parameters<typeof createFarm.mutate>[0]) => { setCreatingFarm(true); createFarm.mutate(values, { onError: () => setCreatingFarm(false) }); };
  const update = (id: number, values: { name: string; crop: string; cedaCommodityId: number | null; areaAcres: number; irrigationMethod: string; latitude: number; longitude: number; locationLabel: string }) => { setCreatingFarm(true); updateFarm.mutate({ id, ...values }, { onError: () => setCreatingFarm(false) }); };
  return <AppShell active={active} setActive={setActive} farms={farms} selectedFarmId={selectedFarmId} setSelectedFarmId={setSelectedFarmId} onCreateFarm={openFarms} userName={userName} onLogout={() => logout()}>{farmsQuery.isLoading ? <div className="workspace-loading"><Loader2 className="spin" /> Preparing your farm workspace…</div> : active === "home" ? <HomeView farm={selectedFarm} onPage={setActive} /> : active === "diagnose" ? <CropDiagnosis farms={farms} selectedFarm={selectedFarm} onOpenFarms={openFarms} /> : active === "market" ? <MarketView farm={selectedFarm} /> : active === "intelligence" ? <FieldIntelligence farm={selectedFarm} /> : active === "settings" ? <SettingsView userName={userName} userEmail={userEmail} onLogout={() => logout()} /> : <FarmsView farms={farms} selectedFarmId={selectedFarmId} onSelect={setSelectedFarmId} onCreate={create} onUpdate={update} isSaving={creatingFarm} onOpenCreate={() => undefined} />}<CropCompanion farm={selectedFarm} activeScreen={active} screenSummary={screenSummary} /></AppShell>;
}

export default function Home() {
  const { user } = useAuth();
  if (!user) return <AuthScreen />;
  return <FarmerWorkspace userName={user.name || "Farmer"} userEmail={user.email} />;
}

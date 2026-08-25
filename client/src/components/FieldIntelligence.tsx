import { trpc } from "@/lib/trpc";
import { useAppPreferences } from "@/contexts/AppPreferences";
import { MapView } from "@/components/Map";
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, CloudSun, Loader2, MapPin, Mic, Radio, RefreshCw, Route, Sparkles, Sprout, TrendingDown, TrendingUp, Truck, Volume2, Warehouse, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type FarmContext = {
  id: number;
  name: string;
  crop: string;
  cedaCommodityId: number | null;
  areaAcres: number;
  locationLabel: string;
  latitude: number;
  longitude: number;
};

function rupees(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function nextDate(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function blobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The voice recording could not be read."));
    reader.readAsDataURL(blob);
  });
}

function VoiceAdvisory({ farm }: { farm?: FarmContext }) {
  const { language } = useAppPreferences();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<"en" | "hi" | "mr" | "hinglish">(() => language === "en" ? "hinglish" : language);
  const [transcript, setTranscript] = useState("");
  const [advice, setAdvice] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);
  const cacheKey = `agrosaarthi-offline-advice-${farm?.id ?? "general"}`;

  useEffect(() => {
    const updateNetwork = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    const cached = localStorage.getItem(cacheKey);
    if (cached) setAdvice(cached);
    return () => { window.removeEventListener("online", updateNetwork); window.removeEventListener("offline", updateNetwork); };
  }, [cacheKey]);

  const ask = trpc.assistant.ask.useMutation({
    onSuccess: result => { setAdvice(result.answer); localStorage.setItem(cacheKey, result.answer); },
    onError: () => setAdvice("I could not reach Saarthi right now. The latest saved guidance remains available below when you are offline."),
  });
  const transcribe = trpc.assistant.transcribe.useMutation({
    onSuccess: result => {
      setTranscript(result.text);
      ask.mutate({ message: result.text, farm: farm ? { name: farm.name, crop: farm.crop, locationLabel: farm.locationLabel } : null });
    },
    onError: () => setAdvice("The voice note could not be transcribed. Please try again with a short recording in a quieter place."),
  });

  const start = async () => {
    if (!online) { setAdvice(localStorage.getItem(cacheKey) ?? "You are offline. Connect once to record a new voice question; your last saved guidance will stay here."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : undefined);
      chunks.current = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
        try {
          const blob = new Blob(chunks.current, { type: recorder.mimeType || "audio/webm" });
          const dataUrl = await blobAsDataUrl(blob);
          transcribe.mutate({ dataUrl, language: voiceLanguage });
        } catch (error) { setAdvice(error instanceof Error ? error.message : "Voice recording could not be prepared."); }
      };
      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
    } catch { setAdvice("Microphone access is needed for voice questions. You can allow it in your browser settings and try again."); }
  };
  const stop = () => mediaRecorder.current?.state === "recording" && mediaRecorder.current.stop();
  const pending = transcribe.isPending || ask.isPending;

  return <article className="pro-card intelligence-card voice-card">
    <span className="season-stamp">VOICE + OFFLINE</span>
    <div className="intelligence-head"><span className="intel-icon"><Volume2 size={21} /></span><div><h2>Speak to Saarthi</h2><p>Hindi, Marathi, Hinglish, or English questions become a crop advisory. Last saved guidance stays on this device when coverage drops.</p></div></div>
    <div className="voice-language-options" role="group" aria-label="Voice language"><button className={voiceLanguage === "hinglish" ? "is-active" : ""} onClick={() => setVoiceLanguage("hinglish")}>Hinglish</button><button className={voiceLanguage === "hi" ? "is-active" : ""} onClick={() => setVoiceLanguage("hi")}>हिन्दी</button><button className={voiceLanguage === "mr" ? "is-active" : ""} onClick={() => setVoiceLanguage("mr")}>मराठी</button><button className={voiceLanguage === "en" ? "is-active" : ""} onClick={() => setVoiceLanguage("en")}>English</button></div>
    <div className={online ? "voice-network online" : "voice-network offline"}>{online ? <><Radio size={14} /> Ready for a {voiceLanguage === "hinglish" ? "Hinglish" : voiceLanguage === "hi" ? "Hindi" : voiceLanguage === "mr" ? "Marathi" : "English"} voice question</> : <><WifiOff size={14} /> Offline — showing saved guidance only</>}</div>
    <button className={recording ? "voice-button recording" : "voice-button"} onClick={recording ? stop : start} disabled={pending}><Mic size={18} /> {pending ? "Working on your voice note…" : recording ? "Tap to finish recording" : "Hold a short voice question"}</button>
    {transcript && <p className="voice-transcript"><strong>You said</strong> “{transcript}”</p>}
    {advice && <div className="voice-advice"><Sparkles size={15} /><span>{advice}</span></div>}
  </article>;
}

function HarvestLinkage({ farm }: { farm?: FarmContext }) {
  const [date, setDate] = useState(nextDate(30));
  const [quantity, setQuantity] = useState("20");
  const [notes, setNotes] = useState("");
  const intents = trpc.linkage.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const create = trpc.linkage.create.useMutation({ onSuccess: () => { setNotes(""); utils.linkage.list.invalidate(); } });
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!farm) return;
    create.mutate({ farmId: farm.id, expectedHarvestDate: date, expectedQuantityQuintals: Number(quantity), notes: notes || undefined });
  };
  return <section className="linkage-shell"><div className="linkage-intro"><span className="eyebrow">FARM TO MARKET</span><h2>Turn a harvest window into a market-ready brief.</h2><p>Start with crop, expected date, and quantity. The app keeps the request with your farm while nearby mandi, transport, and storage discovery makes the next verified conversation easier.</p></div>
    <div className="linkage-grid">
      <article className="pro-card linkage-form-card"><div className="intelligence-head"><span className="intel-icon"><Route size={21} /></span><div><span className="season-stamp">HARVEST INTENT</span><h2>{farm ? `${farm.crop} · ${farm.name}` : "Choose a farm first"}</h2></div></div>{farm ? <form onSubmit={save} className="linkage-form"><label>Expected harvest date<input type="date" value={date} onChange={event => setDate(event.target.value)} required /></label><label>Expected quantity (quintals)<input type="number" min="0.1" step="0.1" value={quantity} onChange={event => setQuantity(event.target.value)} required /></label><label>Handling or buyer notes<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={500} placeholder="Grade, collection point, storage needs, or a question for a buyer" /></label><button className="pro-primary full" disabled={create.isPending}>{create.isPending ? <><Loader2 className="spin" size={16} /> Saving harvest brief…</> : <><CheckCircle2 size={16} /> Save harvest brief</>}</button></form> : <p className="linkage-empty">Select a farm to plan its harvest window and start a verified-market brief.</p>}</article>
      <MarketDiscovery farm={farm} />
    </div>
    {intents.data && intents.data.length > 0 && <div className="intent-history"><span className="season-stamp">SAVED HARVEST BRIEFS</span>{intents.data.slice(0, 3).map(intent => <span key={intent.id}><CalendarClock size={14} /> {intent.expectedHarvestDate} · {intent.expectedQuantityQuintals} qtl · {intent.status}</span>)}</div>}
  </section>;
}

type LocalPlace = { id: string; name: string; address: string; category: string };

function MarketDiscovery({ farm }: { farm?: FarmContext }) {
  const [places, setPlaces] = useState<LocalPlace[]>([]);
  const [loading, setLoading] = useState(Boolean(farm));
  const [message, setMessage] = useState("");
  const searchedFarm = useRef<number | null>(null);
  if (!farm) return <article className="pro-card linkage-readiness"><span className="season-stamp">LOCAL DISCOVERY</span><h2>Select a farm to find nearby market infrastructure.</h2><p><CircleAlert size={14} /> AgroSaarthi uses your private pin only to search nearby mandi, storage, and transport places.</p></article>;
  const discover = (map: google.maps.Map) => {
    if (searchedFarm.current === farm.id || !window.google?.maps?.places) return;
    searchedFarm.current = farm.id;
    setLoading(true);
    const service = new window.google.maps.places.PlacesService(map);
    const keywords = ["agricultural mandi", "agricultural commodity buyer", "warehouse storage", "transport service"];
    const collected: LocalPlace[] = [];
    let completed = 0;
    keywords.forEach(keyword => service.nearbySearch({ location: { lat: farm.latitude, lng: farm.longitude }, radius: 50000, keyword }, (results, status) => {
      completed += 1;
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) results.slice(0, 4).forEach(result => {
        const id = result.place_id ?? `${keyword}-${result.name}`;
        if (result.name && !collected.some(place => place.id === id)) {
          collected.push({ id, name: result.name, address: result.vicinity ?? farm.locationLabel, category: keyword });
          if (result.geometry?.location) new window.google.maps.Marker({ map, position: result.geometry.location, title: result.name });
        }
      });
      if (completed === keywords.length) {
        setPlaces(collected.slice(0, 6));
        setMessage(collected.length ? "Nearby map places are listed below. Their availability, capacity, buyer demand, and terms must be confirmed directly." : "No nearby market places were returned. Try a broader search in Google Maps.");
        setLoading(false);
      }
    }));
  };
  return <article className="pro-card linkage-readiness discovery-card"><span className="season-stamp">LIVE LOCAL DISCOVERY</span><h2>Nearby mandi, storage, and transport places.</h2><div className="discovery-map"><MapView initialCenter={{ lat: farm.latitude, lng: farm.longitude }} initialZoom={10} onMapReady={discover} /></div>{loading ? <p className="discovery-status"><Loader2 className="spin" size={14} /> Searching nearby market infrastructure…</p> : <><div className="place-list">{places.map(place => <span key={place.id}><MapPin size={15} /><strong>{place.name}</strong><small>{place.category.replace("agricultural ", "")} · {place.address}</small></span>)}</div><p className="discovery-status"><CircleAlert size={14} /> {message}</p></>}</article>;
}

export function FieldIntelligence({ farm }: { farm?: FarmContext }) {
  const forecast = trpc.market.forecast.useQuery({ commodityId: farm?.cedaCommodityId ?? 0 }, { enabled: Boolean(farm?.cedaCommodityId), retry: false, refetchOnWindowFocus: false });
  const cropWindow = useMemo(() => {
    const days = farm?.crop === "Wheat" ? "105–125 days" : farm?.crop === "Cotton" ? "145–180 days" : farm?.crop === "Soyabean" ? "90–120 days" : "crop-stage dependent";
    const baseYield = farm?.crop === "Wheat" ? 16 : farm?.crop === "Cotton" ? 8 : farm?.crop === "Soyabean" ? 7 : 10;
    return { days, expected: farm ? `${(baseYield * farm.areaAcres * 0.75).toFixed(0)}–${(baseYield * farm.areaAcres * 1.15).toFixed(0)} qtl` : "Select a farm" };
  }, [farm]);
  return <div className="pro-page intelligence-page"><section className="pro-heading"><div><span className="eyebrow">FIELD INTELLIGENCE</span><h1>Plan the next move. Keep the assumptions visible.</h1><p>Short-horizon price trends, crop-window scenarios, voice-led questions, offline guidance, and harvest-market readiness belong in the same practical workspace.</p></div>{farm && <span className="active-farm-chip"><Sprout size={14} /> {farm.name} · {farm.crop}</span>}</section>
    <section className="intelligence-grid">
      <article className="pro-card intelligence-card forecast-card"><span className="season-stamp">MANDI TREND · 7 DAYS</span><div className="intelligence-head"><span className="intel-icon"><TrendingUp size={21} /></span><div><h2>Source-led price direction</h2><p>Built from recent CEDA source observations. It is a planning indicator, not a sale recommendation.</p></div></div>{!farm ? <p className="linkage-empty">Select a farm with a market-mapped crop to see a source-data trend.</p> : forecast.isLoading ? <div className="intel-loading"><Loader2 className="spin" /> Reading recent source data…</div> : forecast.data?.status === "available" ? <><div className="forecast-number"><strong>{rupees(forecast.data.projected)}</strong><span>estimated 7-day midpoint</span></div><div className="forecast-direction">{forecast.data.direction === "down" ? <TrendingDown size={16} /> : <TrendingUp size={16} />} {forecast.data.direction} · {forecast.data.changePercent > 0 ? "+" : ""}{forecast.data.changePercent}% · {forecast.data.confidence} confidence</div><div className="forecast-range"><span>Range {rupees(forecast.data.lower)}–{rupees(forecast.data.upper)}</span><span>{forecast.data.observations} source observations</span></div><p className="forecast-caveat"><CircleAlert size={14} /> {forecast.data.caveat}</p></> : <p className="linkage-empty">{forecast.data?.message ?? "Source trend is unavailable right now."}</p>}</article>
      <article className="pro-card intelligence-card yield-card"><span className="season-stamp">YIELD WINDOW · PLANNING</span><div className="intelligence-head"><span className="intel-icon"><CloudSun size={21} /></span><div><h2>Harvest-window scenario</h2><p>A crop-and-area planning range. Confirm with crop stage, local weather, soil, and agronomy observations.</p></div></div><div className="yield-stat"><strong>{cropWindow.expected}</strong><span>planning range for {farm?.areaAcres ?? 0} acres</span></div><div className="yield-window"><CalendarClock size={16} /><span>{cropWindow.days} to harvest under typical field conditions</span></div><p className="forecast-caveat"><CircleAlert size={14} /> This is not a scientific yield prediction. It deliberately avoids claiming a harvest outcome without on-field crop, weather, soil, and input data.</p></article>
      <VoiceAdvisory farm={farm} />
    </section>
    <HarvestLinkage farm={farm} />
  </div>;
}

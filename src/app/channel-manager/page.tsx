'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, addDays, parseISO, isSameDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, LogIn, CheckCircle2, Settings2, Globe, Building2, Plus, X,
  ChevronLeft, ChevronRight, Upload, CreditCard, FileText, Users, StickyNote, Receipt,
  Search, Filter, Download
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── Types ─────────────────────────────────────────────── */
interface Room {
  id: string; name: string; color: string;
  room_sync_configs?: { id: string; source: string; ical_url: string; last_sync_at: string; last_sync_status: string }[];
}
interface Reservation {
  id: string; source: string; guest_name: string;
  check_in_date: string; check_out_date: string;
  room_id: string; status: string;
  guest_email?: string; guest_phone?: string; guest_address?: string;
  adults?: number; children?: number; infants?: number;
  total_price?: number; amount_paid?: number;
  document_url?: string; document_type?: string; notes?: string;
}
interface BlockedDate { id: string; date: string; reason: string; room_id: string; }

/* ─── Source colour map ─────────────────────────────────── */
const SRC_COLORS: Record<string, string> = {
  airbnb: '#e8584b', booking: '#003580', expedia: '#ffcc00',
  direct: '#059669', manual: '#7c3aed', default: '#64748b',
};
const srcColor = (s: string) => SRC_COLORS[s?.toLowerCase()] ?? SRC_COLORS.default;

const CELL_W = 40; // px per day column

/* ─── Modal tab definitions ─────────────────────────────── */
const MODAL_TABS = [
  { id: 'details',    label: 'DETAILS',    icon: FileText },
  { id: 'guests',     label: 'GUESTS',     icon: Users },
  { id: 'payments',   label: 'PAYMENTS',   icon: CreditCard },
  { id: 'notes',      label: 'NOTES',      icon: StickyNote },
  { id: 'invoices',   label: 'INVOICES',   icon: Receipt },
];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function ChannelManager() {
  /* state */
  const [syncing,  setSyncing]  = useState(false);
  const [rooms,    setRooms]    = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [activeView, setActiveView] = useState<'calendar' | 'list' | 'config'>('calendar');

  /* add room modal */
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', color: '#10b981' });

  /* reservation modal */
  const [showResModal, setShowResModal] = useState(false);
  const [modalTab, setModalTab] = useState('details');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [resForm, setResForm] = useState<any>({
    guest_name: '', room_id: '', source: 'direct',
    check_in_date: format(new Date(), 'yyyy-MM-dd'),
    check_out_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    guest_email: '', guest_phone: '', guest_address: '',
    adults: 2, children: 0, infants: 0,
    total_price: '', amount_paid: '0',
    document_url: '', document_type: 'passport', notes: '',
  });

  /* OTA config */
  const [otaUrls, setOtaUrls] = useState({ airbnb: '', booking: '', expedia: '' });

  /* timeline pivot */
  const [pivotDate, setPivotDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const DAYS = 28;
  const timelineDates = useMemo(() =>
    Array.from({ length: DAYS }, (_, i) => addDays(pivotDate, i)), [pivotDate]);

  /* ── fetch helpers ─────────────────────────────────────── */
  const fetchRooms = async () => {
    const res = await fetch('/api/rooms');
    const data = await res.json();
    if (Array.isArray(data)) setRooms(data);
  };

  const fetchData = async () => {
    const from = format(pivotDate, 'yyyy-MM-dd');
    const to   = format(addDays(pivotDate, 60), 'yyyy-MM-dd');
    const [resRes, blkRes] = await Promise.all([
      fetch(`/api/reservations?from=${from}&to=${to}`),
      fetch('/api/blocked-dates'),
    ]);
    const [resData, blkData] = await Promise.all([resRes.json(), blkRes.json()]);
    if (Array.isArray(resData)) setReservations(resData);
    if (Array.isArray(blkData)) setBlockedDates(blkData);
  };

  useEffect(() => { fetchRooms(); fetchData(); }, []);

  /* ── handlers ──────────────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync/manual', { method: 'POST' });
      toast.success('Sync terminée');
      fetchData(); fetchRooms();
    } catch { toast.error('Sync échouée'); } finally { setSyncing(false); }
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name) return;
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_room', ...newRoom }),
    });
    if (res.ok) { toast.success('Chambre créée'); setShowAddRoom(false); setNewRoom({ name: '', color: '#10b981' }); fetchRooms(); }
    else toast.error('Erreur création');
  };

  const openNewRes = (roomId = '', dateStr = '') => {
    setSelectedRes(null);
    setResForm({
      guest_name: '', room_id: roomId, source: 'direct',
      check_in_date: dateStr || format(new Date(), 'yyyy-MM-dd'),
      check_out_date: dateStr ? format(addDays(parseISO(dateStr), 1), 'yyyy-MM-dd') : format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      guest_email: '', guest_phone: '', guest_address: '',
      adults: 2, children: 0, infants: 0,
      total_price: '', amount_paid: '0',
      document_url: '', document_type: 'passport', notes: '',
    });
    setModalTab('details');
    setShowResModal(true);
  };

  const openEditRes = (res: Reservation) => {
    setSelectedRes(res);
    setResForm({ ...res });
    setModalTab('details');
    setShowResModal(true);
  };

  const handleSaveRes = async () => {
    const isNew = !selectedRes;
    const res = await fetch('/api/reservations', {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resForm),
    });
    if (res.ok) {
      toast.success(isNew ? 'Réservation créée' : 'Réservation mise à jour');
      setShowResModal(false); fetchData();
    } else toast.error("Erreur d'enregistrement");
  };

  const handleSaveOta = async () => {
    for (const [source, ical_url] of Object.entries(otaUrls)) {
      if (!ical_url) continue;
      // save per room — for demo just use first room; real impl would be per-room modal
      if (rooms[0]) {
        await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_sync_config', room_id: rooms[0].id, source, ical_url }),
        });
      }
    }
    toast.success('Config OTA enregistrée'); fetchRooms();
  };

  /* ── timeline helpers ──────────────────────────────────── */
  const dayIndex = (dateStr: string) =>
    differenceInDays(parseISO(dateStr), pivotDate);

  const resInView = (r: Reservation) => {
    const s = dayIndex(r.check_in_date);
    const e = dayIndex(r.check_out_date);
    return e > 0 && s < DAYS;
  };

  const nights = (form: any) => {
    try { return differenceInDays(parseISO(form.check_out_date), parseISO(form.check_in_date)); } catch { return 0; }
  };
  const outstanding = (form: any) =>
    Math.max(0, Number(form.total_price || 0) - Number(form.amount_paid || 0));

  /* ═══════════════ RENDER ═══════════════════════════════ */
  return (
    /* White page container — fills the full content area */
    <div className="min-h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">

      {/* ── TOP TOOLBAR (matches screenshot nav bar) ───────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0 gap-3">
        {/* Left: view tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { id: 'calendar', label: 'Calendar' },
            { id: 'list',     label: 'Reservations' },
            { id: 'config',   label: 'Setup' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveView(t.id as any)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeView === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Centre: date nav */}
        {activeView === 'calendar' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPivotDate(d => addDays(d, -7))} className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <button onClick={() => setPivotDate(new Date())} className="px-3 py-1 text-xs font-bold border border-slate-200 rounded-md hover:bg-slate-50">
              Today
            </button>
            <span className="text-xs font-bold text-slate-700 min-w-[140px] text-center">
              {format(pivotDate, 'dd MMM', { locale: fr })} — {format(addDays(pivotDate, DAYS - 1), 'dd MMM yyyy', { locale: fr })}
            </span>
            <button onClick={() => setPivotDate(d => addDays(d, 7))} className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center hover:bg-slate-50">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        )}

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddRoom(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
          >
            <Building2 className="w-3.5 h-3.5" /> Add Room
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync
          </button>
          <button
            onClick={() => openNewRes()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#e8584b] hover:bg-[#d44a3d] text-white rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> + Reservation
          </button>
        </div>
      </div>

      {/* ── LEGEND BAR ─────────────────────────────────────── */}
      {activeView === 'calendar' && (
        <div className="flex items-center gap-4 px-5 py-2 border-b border-slate-100 bg-slate-50/60 shrink-0">
          {Object.entries({ Confirmed: '#e8584b', 'Checked In': '#10b981', 'Checked Out': '#94a3b8', 'Room Closure': '#1e293b', Unallocated: '#f59e0b' }).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-semibold text-slate-500">{label}</span>
            </div>
          ))}
          <div className="ml-auto text-[10px] text-slate-400 font-medium">
            {rooms.length} units · {reservations.length} bookings
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CALENDAR / GANTT VIEW
      ══════════════════════════════════════════════════════ */}
      {activeView === 'calendar' && (
        <div className="flex-1 overflow-auto">
          {/* Sticky date header */}
          <div className="flex sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
            {/* Room label col */}
            <div className="w-48 shrink-0 border-r border-slate-200 bg-white" />
            {/* Date cols */}
            <div className="flex">
              {timelineDates.map((date, i) => {
                const isToday = isSameDay(date, new Date());
                const isWeekend = [0, 6].includes(date.getDay());
                return (
                  <div
                    key={i}
                    style={{ width: CELL_W }}
                    className={`shrink-0 text-center py-2 border-r border-slate-100 ${
                      isToday ? 'bg-[#fff3f2]' : isWeekend ? 'bg-slate-50' : 'bg-white'
                    }`}
                  >
                    <p className={`text-[9px] font-bold uppercase ${isToday ? 'text-[#e8584b]' : 'text-slate-400'}`}>
                      {format(date, 'EEE', { locale: fr })}
                    </p>
                    <p className={`text-[11px] font-black ${isToday ? 'text-[#e8584b]' : 'text-slate-700'}`}>
                      {format(date, 'd')}
                    </p>
                    <p className={`text-[9px] ${isToday ? 'text-[#e8584b]/70' : 'text-slate-400'}`}>
                      {format(date, 'MMM', { locale: fr })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rooms + bookings */}
          {rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-300 gap-4">
              <Building2 className="w-16 h-16" />
              <div className="text-center">
                <p className="font-black text-slate-400 text-lg">No rooms yet</p>
                <p className="text-sm text-slate-400">Click "Add Room" to create your first unit</p>
              </div>
              <button onClick={() => setShowAddRoom(true)} className="px-6 py-2 bg-[#e8584b] text-white rounded-lg text-sm font-bold hover:bg-[#d44a3d] transition-colors">
                + Add First Room
              </button>
            </div>
          ) : (
            rooms.map((room, ri) => {
              const roomRes = reservations.filter(r => r.room_id === room.id && resInView(r));
              const roomBlocked = blockedDates.filter(b => b.room_id === room.id);
              return (
                <div key={room.id} className={`flex relative ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} border-b border-slate-100`} style={{ minHeight: 56 }}>
                  {/* Room label */}
                  <div className="w-48 shrink-0 border-r border-slate-200 px-3 py-2 flex flex-col justify-center sticky left-0 z-20 bg-inherit">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: room.color }} />
                      <span className="text-xs font-bold text-slate-800 truncate">{room.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-medium ml-4">
                      {roomRes.length} booking{roomRes.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Grid cells */}
                  <div className="relative flex">
                    {timelineDates.map((date, di) => {
                      const isToday = isSameDay(date, new Date());
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isBlocked = roomBlocked.some(b => b.date === dateStr);
                      return (
                        <div
                          key={di}
                          style={{ width: CELL_W }}
                          onClick={() => !isBlocked && openNewRes(room.id, dateStr)}
                          className={`shrink-0 border-r border-slate-100 cursor-crosshair h-full transition-colors ${
                            isToday ? 'bg-[#fff3f2]/60' :
                            isBlocked ? 'bg-slate-200/60 cursor-default' : 'hover:bg-slate-100/60'
                          }`}
                        />
                      );
                    })}

                    {/* Reservation bars */}
                    {roomRes.map(res => {
                      const s = Math.max(0, dayIndex(res.check_in_date));
                      const raw_e = dayIndex(res.check_out_date);
                      const e = Math.min(DAYS, raw_e);
                      const w = (e - s) * CELL_W - 4;
                      if (w <= 0) return null;
                      const color = srcColor(res.source);
                      return (
                        <motion.div
                          key={res.id}
                          initial={{ opacity: 0, y: 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={ev => { ev.stopPropagation(); openEditRes(res); }}
                          style={{
                            left: s * CELL_W + 2,
                            width: w,
                            backgroundColor: color,
                            top: 7, height: 38,
                          }}
                          className="absolute rounded cursor-pointer flex items-center px-2 overflow-hidden group hover:brightness-90 transition-all z-10 shadow-sm"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-bold text-white truncate leading-tight">{res.guest_name}</span>
                            <span className="text-[8px] text-white/75 uppercase font-semibold">{res.source}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          RESERVATIONS LIST VIEW
      ══════════════════════════════════════════════════════ */}
      {activeView === 'list' && (
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">All Reservations</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input placeholder="Search guest..." className="text-xs outline-none text-slate-600 w-32" />
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50">
                <Filter className="w-3.5 h-3.5" /> Filter
              </button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {['Guest', 'Room', 'Check-in', 'Check-out', 'Nights', 'Source', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr><td colSpan={8} className="py-20 text-center text-slate-400 font-medium">No reservations found</td></tr>
              ) : reservations.map(res => {
                const room = rooms.find(r => r.id === res.room_id);
                const n = differenceInDays(parseISO(res.check_out_date), parseISO(res.check_in_date));
                return (
                  <tr key={res.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => openEditRes(res)}>
                    <td className="py-3 px-3 font-bold text-slate-800">{res.guest_name}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        {room && <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: room.color }} />}
                        <span className="text-slate-600">{room?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{format(parseISO(res.check_in_date), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="py-3 px-3 text-slate-600">{format(parseISO(res.check_out_date), 'dd MMM yyyy', { locale: fr })}</td>
                    <td className="py-3 px-3 text-slate-600">{n}N</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: srcColor(res.source) }}>
                        {res.source}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        res.status === 'confirmed' ? 'bg-[#e8584b]/10 text-[#e8584b]' :
                        res.status === 'checked_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>{res.status}</span>
                    </td>
                    <td className="py-3 px-3">
                      <CheckCircle2 className="w-4 h-4 text-slate-300 hover:text-[#e8584b] transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          CONFIG VIEW
      ══════════════════════════════════════════════════════ */}
      {activeView === 'config' && (
        <div className="flex-1 overflow-auto p-8 max-w-3xl mx-auto w-full">
          <h2 className="text-lg font-black text-slate-900 mb-6">Channel Configuration</h2>
          <div className="space-y-8">
            {/* Rooms list */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Units</h3>
              {rooms.map(room => (
                <div key={room.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: room.color }} />
                  <span className="font-bold text-slate-800 flex-1">{room.name}</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {room.room_sync_configs?.length ?? 0} channels
                  </span>
                  <div className="text-[10px] px-2 py-1 rounded bg-emerald-50 text-emerald-600 font-bold">ACTIVE</div>
                </div>
              ))}
              <button onClick={() => setShowAddRoom(true)} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#e8584b] hover:text-[#e8584b] transition-colors text-xs font-bold">
                <Plus className="w-4 h-4" /> Add New Unit
              </button>
            </div>

            {/* OTA Config */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">OTA iCal Links</h3>
              {['airbnb', 'booking', 'expedia'].map(src => (
                <div key={src} className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: srcColor(src) }} />
                    {src} iCal URL
                  </label>
                  <input
                    type="url"
                    value={otaUrls[src as keyof typeof otaUrls]}
                    onChange={e => setOtaUrls(u => ({ ...u, [src]: e.target.value }))}
                    placeholder={`https://www.${src}.com/calendar/ical/...`}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-700 outline-none focus:border-[#e8584b] focus:ring-2 focus:ring-[#e8584b]/10 transition-all"
                  />
                </div>
              ))}
              <button onClick={handleSaveOta} className="px-6 py-2.5 bg-slate-900 hover:bg-[#e8584b] text-white rounded-xl text-xs font-bold transition-colors">
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ADD ROOM MODAL
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddRoom && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddRoom(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">New Unit</h3>
                <button onClick={() => setShowAddRoom(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Room Name</label>
                  <input autoFocus value={newRoom.name} onChange={e => setNewRoom(n => ({ ...n, name: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                    placeholder="e.g. Suite Royale, Room 101..."
                    className="h-12 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold text-slate-800 outline-none focus:border-[#e8584b] focus:ring-2 focus:ring-[#e8584b]/10 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Color</label>
                  <div className="flex gap-3">
                    {['#10b981', '#e8584b', '#3b82f6', '#8b5cf6', '#f59e0b', '#1e293b'].map(c => (
                      <button key={c} onClick={() => setNewRoom(n => ({ ...n, color: c }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${newRoom.color === c ? 'border-slate-900 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddRoom(false)} className="flex-1 h-11 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={handleCreateRoom} className="flex-1 h-11 bg-[#e8584b] hover:bg-[#d44a3d] text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
                  Create Unit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════
          RESERVATION MODAL — tabbed, like in the screenshot
      ══════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showResModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowResModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">

              {/* Modal header — orange/red top bar like screenshot */}
              <div className="bg-[#e8584b] px-6 pt-5 pb-0 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">
                      {selectedRes ? `Edit Reservation — ${selectedRes.id?.slice(0, 8).toUpperCase() ?? ''}` : 'New Reservation'}
                    </p>
                    <h3 className="text-white font-black text-lg leading-tight">
                      {resForm.guest_name || 'Guest Name'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[10px] font-black uppercase">Confirmed</span>
                    <button onClick={() => setShowResModal(false)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1">
                  {MODAL_TABS.map(tab => (
                    <button key={tab.id} onClick={() => setModalTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-t-lg transition-all ${
                        modalTab === tab.id
                          ? 'bg-white text-[#e8584b]'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}>
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal body */}
              <div className="flex-1 overflow-y-auto bg-white">
                {modalTab === 'details' && (
                  <div className="p-6 grid grid-cols-12 gap-6">
                    {/* LEFT SIDE */}
                    <div className="col-span-8 space-y-6">
                      {/* Dates row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check in</label>
                          <input type="date" value={resForm.check_in_date}
                            onChange={e => setResForm((f: any) => ({ ...f, check_in_date: e.target.value }))}
                            className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Check out</label>
                          <input type="date" value={resForm.check_out_date}
                            onChange={e => setResForm((f: any) => ({ ...f, check_out_date: e.target.value }))}
                            className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all" />
                        </div>
                      </div>

                      {/* Stay summary */}
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 font-medium border border-slate-100">
                        <span>Length of stay: <strong className="text-slate-900">{nights(resForm)} Night{nights(resForm) !== 1 ? 's' : ''}</strong></span>
                        <span className="text-slate-300">|</span>
                        <span>Booking status: <strong className="text-[#e8584b]">Confirmed</strong></span>
                      </div>

                      {/* Room + Occupancy */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Room</label>
                          <select value={resForm.room_id} onChange={e => setResForm((f: any) => ({ ...f, room_id: e.target.value }))}
                            className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all">
                            <option value="">Select room...</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source</label>
                          <select value={resForm.source} onChange={e => setResForm((f: any) => ({ ...f, source: e.target.value }))}
                            className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all">
                            {['direct', 'airbnb', 'booking', 'expedia', 'manual'].map(s =>
                              <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {[['Adults', 'adults'], ['Children', 'children'], ['Infants', 'infants']].map(([label, key]) => (
                          <div key={key} className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
                            <input type="number" min={0} value={resForm[key]}
                              onChange={e => setResForm((f: any) => ({ ...f, [key]: e.target.value }))}
                              className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all" />
                          </div>
                        ))}
                      </div>

                      <Separator />

                      {/* PRIMARY CONTACT section */}
                      <h4 className="text-[11px] font-black text-[#e8584b] uppercase tracking-widest">Primary Contact</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</label>
                          <input value={resForm.guest_name} onChange={e => setResForm((f: any) => ({ ...f, guest_name: e.target.value }))}
                            placeholder="Guest full name"
                            className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</label>
                          <input type="email" value={resForm.guest_email} onChange={e => setResForm((f: any) => ({ ...f, guest_email: e.target.value }))}
                            className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone</label>
                          <input value={resForm.guest_phone} onChange={e => setResForm((f: any) => ({ ...f, guest_phone: e.target.value }))}
                            className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all" />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Address</label>
                          <input value={resForm.guest_address} onChange={e => setResForm((f: any) => ({ ...f, guest_address: e.target.value }))}
                            className="h-11 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] transition-all" />
                        </div>
                      </div>

                      {/* Document upload */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID / Passport Document</label>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-[#e8584b] transition-colors cursor-pointer group">
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-[#e8584b]/5 transition-colors">
                            <Upload className="w-5 h-5 text-slate-400 group-hover:text-[#e8584b] transition-colors" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-600">Upload via Cloudinary</p>
                            <p className="text-[10px] text-slate-400">JPG, PNG, PDF — Passport, CIN, Driver's License</p>
                          </div>
                          {resForm.document_url && (
                            <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Uploaded ✓</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Guest Comments</label>
                        <textarea value={resForm.notes} onChange={e => setResForm((f: any) => ({ ...f, notes: e.target.value }))}
                          rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 outline-none focus:border-[#e8584b] transition-all resize-none text-sm" />
                      </div>
                    </div>

                    {/* RIGHT SIDE — BOOKING SUMMARY */}
                    <div className="col-span-4 space-y-4">
                      <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-4">
                        <h4 className="font-black text-sm uppercase tracking-wider">Booking Summary</h4>
                        {[
                          ['Room Total',         `${Number(resForm.total_price || 0).toLocaleString()} MAD`, 'text-white'],
                          ['Discount',           '0 MAD', 'text-white'],
                          ['Total',              `${Number(resForm.total_price || 0).toLocaleString()} MAD`, 'text-white font-black'],
                          ['Total Received',     `${Number(resForm.amount_paid || 0).toLocaleString()} MAD`, 'text-emerald-400'],
                          ['Total Outstanding',  `${outstanding(resForm).toLocaleString()} MAD`, 'text-[#e8584b] font-black text-base'],
                        ].map(([label, value, cls]) => (
                          <div key={label} className="flex justify-between items-center border-t border-white/10 pt-3 first:border-0 first:pt-0">
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{label}</span>
                            <span className={`text-sm ${cls}`}>{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Price inputs */}
                      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Room Rate (MAD)</label>
                          <input type="number" value={resForm.total_price}
                            onChange={e => setResForm((f: any) => ({ ...f, total_price: e.target.value }))}
                            className="h-10 w-full bg-white border border-slate-200 rounded-lg px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] text-sm transition-all" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount Paid (MAD)</label>
                          <input type="number" value={resForm.amount_paid}
                            onChange={e => setResForm((f: any) => ({ ...f, amount_paid: e.target.value }))}
                            className="h-10 w-full bg-white border border-slate-200 rounded-lg px-3 font-bold text-slate-700 outline-none focus:border-[#e8584b] text-sm transition-all" />
                        </div>
                      </div>

                      <button onClick={handleSaveRes}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-sm flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {selectedRes ? 'Save Changes' : 'Create Reservation'}
                      </button>

                      {selectedRes && (
                        <button className="w-full h-10 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl font-bold text-xs uppercase transition-colors">
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {modalTab === 'guests' && (
                  <div className="p-6 flex items-center justify-center h-48 text-slate-400 text-sm">
                    Guest management coming soon
                  </div>
                )}
                {modalTab === 'payments' && (
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-800 text-sm">Payment Records</h4>
                      <button className="px-4 py-2 bg-[#e8584b] text-white rounded-lg text-xs font-bold">Record Payment</button>
                    </div>
                    <div className="text-center py-12 text-slate-400 text-sm">No payments recorded yet</div>
                  </div>
                )}
                {modalTab === 'notes' && (
                  <div className="p-6 space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Internal Notes</label>
                    <textarea value={resForm.notes} onChange={e => setResForm((f: any) => ({ ...f, notes: e.target.value }))}
                      rows={8} placeholder="Add internal notes here..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-700 outline-none focus:border-[#e8584b] transition-all resize-none text-sm" />
                    <button onClick={handleSaveRes} className="px-6 py-2 bg-[#e8584b] text-white rounded-xl text-xs font-bold">Save Notes</button>
                  </div>
                )}
                {modalTab === 'invoices' && (
                  <div className="p-6 flex items-center justify-center h-48 text-slate-400 text-sm">
                    Invoices for this reservation will appear here
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      ` }} />
    </div>
  );
}

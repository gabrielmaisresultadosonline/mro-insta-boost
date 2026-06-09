import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
 import { useNavigate, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, 
  Settings, 
  Users, 
  Search,
  Send, 
  GitBranch, 
  LogOut, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCcw,
  Bot,
  BarChart3,
  CheckCircle2,
  XCircle,
  Mic,
  DollarSign,
  TrendingUp,
  Filter,
  FileUp,
  Paperclip,
  Video,
  ImageIcon,
  FileText,
  StopCircle,
  Clock,
  Play,
  PlayCircle,
  ArrowRight,
  Check,
  AlertCircle,
  FileCheck2,
  ListFilter,
  Zap,
  Eye,
  EyeOff,
  LayoutDashboard,
  Menu,
  ChevronLeft,
  Facebook,
  Link as LinkIcon,
  UserPlus,
  Download,
  Upload,
  User,
  CalendarClock,
  Calendar,
  MapPin,
  Smile,
  MoreHorizontal,
  Webhook,
  Layers,
  CreditCard,
  Copy,
  Pencil,
  Camera,
  LayoutList,
   MessageCircle, 
   RotateCw,
   ShieldCheck
   ,
   UserCog,
   ExternalLink
  } from "lucide-react";
import * as LucideIcons from 'lucide-react';
const Instagram = (LucideIcons as any).Instagram || Camera;
import TemplatePreview from "@/components/whatsapp/TemplatePreview";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateBuilder from "@/components/whatsapp/TemplateBuilder";
import FlowEditor from "@/components/crm/FlowEditor";
import { MediaPopup } from "@/components/MediaPopup";
import Broadcaster from "@/components/crm/Broadcaster";
import ModuleManager from "@/components/admin/ModuleManager";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const encodeAudioBufferToWav = (audioBuffer: AudioBuffer) => {
  const channels = Math.min(audioBuffer.numberOfChannels, 2);
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples * blockAlign);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * blockAlign, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * blockAlign, true);

  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, index) => audioBuffer.getChannelData(index));
  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
};

const createMobilePlayableAudioBlob = async (audioBlob: Blob) => {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return null;

  const context = new AudioContextCtor();
  try {
    const sourceBuffer = await audioBlob.arrayBuffer();
    const decoded = await context.decodeAudioData(sourceBuffer.slice(0));
    return new Blob([encodeAudioBufferToWav(decoded)], { type: 'audio/wav' });
  } catch (error) {
    console.warn('Não foi possível gerar cópia WAV para o histórico mobile:', error);
    return null;
  } finally {
    context.close?.();
  }
};

const getMetaDeliveryErrorMessage = (message: any) => {
  const raw = String(message?.error_message || message?.metadata?.last_meta_status?.errors?.[0]?.message || '').trim();
  if (/business account locked|not been verified|business.*verification|verifica(c|ç)/i.test(raw)) {
    return 'A Meta bloqueou o envio porque o seu Negócio (Business Manager) ainda não foi verificado. Você consegue receber mensagens, mas não enviar até concluir a verificação.';
  }
  if (/media upload error/i.test(raw)) {
    return 'A Meta recusou o arquivo de áudio/mídia após o upload. Grave novamente ou envie outro formato.';
  }
  return raw || 'A Meta informou falha na entrega desta mensagem.';
};

const isBusinessVerificationError = (message: any) => {
  const raw = String(message?.error_message || message?.metadata?.last_meta_status?.errors?.[0]?.message || '').trim();
  return /business account locked|not been verified|business.*verification|verifica(c|ç)/i.test(raw);
};

type ConnectionLogEntry = {
  id: string;
  at: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  details?: string;
};

const sanitizeConnectionDetails = (details?: unknown) => {
  if (!details) return undefined;
  try {
    return JSON.stringify(
      details,
      (key, value) => {
        if (/code|token|secret|password/i.test(key)) return value ? '[oculto]' : value;
        return value;
      },
      2
    );
  } catch {
    return String(details);
  }
};

const CRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bizWarnExpanded, setBizWarnExpanded] = useState(false);
   const [activeTab, setActiveTab] = useState('dashboard');
   const [userRole, setUserRole] = useState<string | null>(null);
  const [isMyDataOpen, setIsMyDataOpen] = useState(false);
  const [myDataEmail, setMyDataEmail] = useState('');
  const [myDataNewEmail, setMyDataNewEmail] = useState('');
  const [myDataNewPassword, setMyDataNewPassword] = useState('');
  const [myDataConfirmPassword, setMyDataConfirmPassword] = useState('');
  const [myDataShowPassword, setMyDataShowPassword] = useState(false);
  const [myDataSaving, setMyDataSaving] = useState(false);
  const [metaSettings, setMetaSettings] = useState<any>({
    meta_access_token: '',
    meta_phone_number_id: '',
    meta_waba_id: '',
    meta_app_id: '',
    meta_app_secret: '',
    meta_display_phone_number: '',
    meta_verified_name: '',
    google_client_id: '811195616147-3v5531d27p0v61st1e75m6lshk1m1n7f.apps.googleusercontent.com',
    google_client_secret: '',
    openai_api_key: '',
    ai_agent_enabled: false,
    ai_operation_mode: 'chat',
    auto_generate_strategy: false,
    strategy_generation_prompt: 'Analise o histórico acima e gere uma análise detalhada. Destaque pontos positivos da conversa e sugira o que dizer daqui para frente para converter este cliente. Sugira também 2 perguntas que eliminem as principais dúvidas dele sob o cabeçalho \"### Perguntas para Eliminar Dúvidas\".',
    ai_system_prompt: 'Você é um assistente de vendas profissional para a empresa Mais Resultados Online. Responda em Português do Brasil.',
    ai_agent_trigger: 'all',
    ai_agent_trigger_keyword: '',
    initial_auto_response_enabled: true,
    initial_response_text: '',
    initial_response_buttons: [],
    shortcut_size: 100,
    tag_size: 100,
    business_hours_enabled: false,
    business_hours_start: '08:00',
    business_hours_end: '18:00',
    business_hours_tz: 'America/Sao_Paulo',
    outside_hours_message: 'Nossos administradores não estão ativos no momento. Seguiremos com o atendimento automatizado e em breve retornaremos com um atendimento humano.',
    business_description: 'Empresa especializada em soluções digitais e vendas online através do WhatsApp e redes sociais.',
    google_auto_sync: false,
    vps_transcoder_url: 'https://vps.zapmro.com.br',
    vps_status: 'unknown' as 'unknown' | 'online' | 'offline'
  });
  const [whatsAppConnectionConfirmed, setWhatsAppConnectionConfirmed] = useState(false);

  const [metrics, setMetrics] = useState<any>({
    sent_count: 0,
    responded_count: 0,
    qualified_count: 0,
    sales_count: 0,
    conv_24h_count: 0 // Nova métrica: conversas 24h
  });
  const [conversationStats, setConversationStats] = useState({
    paidThisMonth: 0,
    activeWindow24h: 0,
    monthLabel: '',
    paidThisWeek: 0,
    activeThisWeek: 0
  });
  const CONVERSATION_COST = 0.33;
  const [flows, setFlows] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [kanbanView, setKanbanView] = useState(false);
  const [draggedContact, setDraggedContact] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const selectedContactRef = useRef<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingContacts, setSendingContacts] = useState<Record<string, boolean>>({});
  const [loadingChat, setLoadingChat] = useState(false);
  const isSending = (id: string) => !!sendingContacts[id];
  const setContactSending = (id: string, state: boolean) => {
    setSendingContacts(prev => ({ ...prev, [id]: state }));
  };
  const [templates, setTemplates] = useState<any[]>([]);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isPreviewingAudio, setIsPreviewingAudio] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFlowEditorOpen, setIsFlowEditorOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<any>(null);
  const [uploadType, setUploadType] = useState<'image' | 'video' | 'audio' | 'document' | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [confirmSend, setConfirmSend] = useState<{
    type: 'template' | 'flow';
    id: string;
    name: string;
    language?: string;
  } | null>(null);
   const [previewTemplate, setPreviewTemplate] = useState<any>(null);
   const [previewMedia, setPreviewMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
   const [pastedImage, setPastedImage] = useState<File | null>(null);
   const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showFlows, setShowFlows] = useState(true);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [contactToView, setContactToView] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleDateObj, setScheduleDateObj] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleType, setScheduleType] = useState<'message' | 'template' | 'flow'>('message');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedContactsForScheduling, setSelectedContactsForScheduling] = useState<string[]>([]);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [selectedCampaignType, setSelectedCampaignType] = useState<'individual' | 'batch' | 'birthday' | 'list'>('individual');
  const [contactListText, setContactListText] = useState('');
  const [birthdayName, setBirthdayName] = useState('');
  const [birthdayNumber, setBirthdayNumber] = useState('');
  const [updatingKnowledge, setUpdatingKnowledge] = useState<string | null>(null);
  const [improvingPrompt, setImprovingPrompt] = useState(false);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isNewWebhookDialogOpen, setIsNewWebhookDialogOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: '', response_type: 'text' as 'text' | 'template', template_id: '', secret_token: '', is_active: true, default_status: 'new' });
  const [googleContactsEnabled, setGoogleContactsEnabled] = useState(localStorage.getItem('google_contacts_connected') === 'true');
  const [googleAccountInfo, setGoogleAccountInfo] = useState<{ email: string } | null>(null);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<{ [key: string]: number }>({});

  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [allScheduledMessages, setAllScheduledMessages] = useState<any[]>([]);
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [showAllGoogleContacts, setShowAllGoogleContacts] = useState(false);

  // States for custom statuses
  const [kanbanStatuses, setKanbanStatuses] = useState<any[]>([]);
  const [isNewStatusDialogOpen, setIsNewStatusDialogOpen] = useState(false);
  const [isEditStatusDialogOpen, setIsEditStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [newStatusData, setNewStatusData] = useState({ label: '', color: 'blue', value: '' });
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isMetricsListOpen, setIsMetricsListOpen] = useState(false);
  const [metricsListType, setMetricsListType] = useState<'paid' | 'active' | 'weekly_paid' | 'weekly_active' | null>(null);
  const [metricsListData, setMetricsListData] = useState<any[]>([]);
  const [metricsChartData, setMetricsChartData] = useState<any[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [activeFlowsView, setActiveFlowsView] = useState(false);
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLogEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('crm_connection_logs') || '[]');
    } catch {
      return [];
    }
  });

  const addConnectionLog = useCallback((level: ConnectionLogEntry['level'], message: string, details?: unknown) => {
    const entry: ConnectionLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      at: new Date().toLocaleString('pt-BR'),
      level,
      message,
      details: sanitizeConnectionDetails(details),
    };
    setConnectionLogs(prev => {
      const next = [entry, ...prev].slice(0, 25);
      localStorage.setItem('crm_connection_logs', JSON.stringify(next));
      return next;
    });

    const logger = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logger('[WhatsApp Connection]', message, details || '');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Meta Embedded Signup (WhatsApp Tech Provider) ---------------------------
  const META_APP_ID = '1296667748608099';
  const META_CONFIG_ID = '2249370022471857';

  useEffect(() => {
    if ((window as any).FB) return;
    (window as any).fbAsyncInit = function () {
      (window as any).FB.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        cookie: true,
        xfbml: true,
        version: 'v25.0',
      });
      addConnectionLog('success', 'SDK do Facebook carregado', { app_id: META_APP_ID, config_id: META_CONFIG_ID, version: 'v25.0' });
    };
    const id = 'facebook-jssdk';
    if (document.getElementById(id)) return;
    const js = document.createElement('script');
    js.id = id;
    js.async = true;
    js.defer = true;
    js.crossOrigin = 'anonymous';
    js.src = 'https://connect.facebook.net/en_US/sdk.js';
    document.body.appendChild(js);

    const handleMsg = async (event: MessageEvent) => {
      if (!event.origin || !/facebook\.com$/.test(new URL(event.origin).hostname)) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
        console.log('[Embedded Signup] event:', data);
        addConnectionLog(data.event === 'ERROR' ? 'error' : data.event === 'CANCEL' ? 'warn' : 'info', `Evento Meta recebido: ${data.event}`, data.data);
        if (['FINISH', 'FINISH_ONLY_WABA', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING', 'FINISH_GRANT_ONLY_API_ACCESS'].includes(data.event)) {
          (window as any).__waEmbeddedSignupData = { ...(data.data || {}), event: data.event };
        } else if (data.event === 'CANCEL') {
          toast({ title: 'Conexão cancelada', description: `Etapa: ${data.data?.current_step || 'N/A'}`, variant: 'destructive' });
        } else if (data.event === 'ERROR') {
          toast({ title: 'Erro no Embedded Signup', description: data.data?.error_message || 'Erro desconhecido', variant: 'destructive' });
        }
      } catch {}
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [addConnectionLog]);

  const startEmbeddedSignup = () => {
    const FB = (window as any).FB;
    if (!FB) {
      toast({ title: 'Facebook ainda carregando…', description: 'Aguarde, tentaremos abrir novamente em 2s.' });
      setTimeout(() => {
        if ((window as any).FB) startEmbeddedSignup();
        else toast({ title: 'Facebook não carregou', description: 'Recarregue a página e tente novamente.', variant: 'destructive' });
      }, 2000);
      return;
    }
    (window as any).__waEmbeddedSignupData = null;
    const handleSignupResponse = async (response: any) => {
      addConnectionLog(response?.authResponse?.code ? 'success' : 'warn', 'Resposta final do popup Meta recebida', response);
      if (!response?.authResponse?.code) {
        console.warn('[Embedded Signup] no auth code in response', response);
        toast({ title: 'Login cancelado ou bloqueado', description: 'Verifique se o popup foi bloqueado pelo navegador.', variant: 'destructive' });
        return;
      }
      const code = response.authResponse.code;
      const sessionInfo = (window as any).__waEmbeddedSignupData || {};
      addConnectionLog('info', 'Enviando código para salvar a conexão no CRM', {
        signup_event: sessionInfo.event,
        waba_id: sessionInfo.waba_id,
        phone_number_id: sessionInfo.phone_number_id,
        business_id: sessionInfo.business_id,
        has_code: true,
      });
      toast({ title: 'Conectando à Meta…', description: 'Trocando código por token e salvando credenciais.' });
      try {
        const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
          body: {
            action: 'exchangeEmbeddedSignupCode',
            code,
            waba_id: sessionInfo.waba_id,
            phone_number_id: sessionInfo.phone_number_id,
            business_id: sessionInfo.business_id,
            signup_event: sessionInfo.event,
          },
        });
        if (error || !data?.success) {
          addConnectionLog('error', 'Falha ao salvar conexão retornada pelo servidor', data || error);
          throw new Error(data?.error || error?.message || 'Falha ao conectar');
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) localStorage.setItem(`crm_whatsapp_connected_${user.id}`, 'true');
        addConnectionLog('success', 'Conexão salva no CRM com sucesso', data);
        setWhatsAppConnectionConfirmed(true);
        setMetaSettings(prev => ({
          ...prev,
          meta_waba_id: data.waba_id || prev.meta_waba_id,
          meta_phone_number_id: data.phone_number_id || prev.meta_phone_number_id,
          meta_display_phone_number: data.display_phone_number || prev.meta_display_phone_number,
          meta_verified_name: data.verified_name || prev.meta_verified_name,
        }));
        toast({ title: 'WhatsApp conectado!', description: `WABA: ${data.waba_id || '—'} · Phone: ${data.phone_number_id || '—'}` });
        await fetchData(false);
      } catch (e: any) {
        addConnectionLog('error', 'Erro ao finalizar conexão no CRM', { message: e?.message || String(e) });
        toast({ title: 'Erro ao conectar', description: e?.message || String(e), variant: 'destructive' });
      }
    };
    try {
      addConnectionLog('info', 'Abrindo popup de conexão Meta', {
        app_id: META_APP_ID,
        config_id: META_CONFIG_ID,
        domain: window.location.hostname,
        flow: 'whatsapp_business_app_onboarding',
      });
      FB.login(
      (response: any) => {
        void handleSignupResponse(response);
      },
      {
        config_id: META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      }
      );
    } catch (err: any) {
      console.error('[Embedded Signup] FB.login threw', err);
      addConnectionLog('error', 'Erro ao abrir popup do Facebook', { message: err?.message || String(err) });
      toast({ title: 'Erro ao abrir o Facebook', description: err?.message || 'Recarregue a página e tente novamente.', variant: 'destructive' });
    }
  };

  const computeConversationStats = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: monthMsgs } = await supabase
        .from('crm_messages')
        .select('contact_id, direction, created_at, metadata')
        .gte('created_at', startOfMonth)
        .order('created_at', { ascending: true })
        .limit(2000);

      const byContact: Record<string, any[]> = {};
      (monthMsgs || []).forEach((m: any) => {
        if (!m.contact_id) return;
        (byContact[m.contact_id] = byContact[m.contact_id] || []).push(m);
      });

      const DAY = 24 * 60 * 60 * 1000;
      let paidCount = 0;
      let paidWeek = 0;
      
      Object.values(byContact).forEach((msgs) => {
        let lastInbound = -Infinity;
        let lastPaidStart = -Infinity;
        const weekTime = new Date(startOfWeek).getTime();
        
        for (const m of msgs) {
          const t = new Date(m.created_at).getTime();
          if (m.direction === 'inbound') {
            lastInbound = t;
          } else if (m.direction === 'outbound') {
            // Mensagens enviadas pelo app do celular (echoes) NÃO são cobradas
            // pela Meta — não contam como conversa paga.
            const src = (m as any)?.metadata?.source;
            const isEcho = src === 'echo_mobile_app' || src === 'meta_webhook_echo';
            const isManual = src === 'manual_send';
            const isAutomation = src === 'api_automation' || m.message_type === 'template' || m.message_type === 'carousel';
            if (isEcho || isManual || !isAutomation) continue;
            // Regra oficial do WhatsApp: A janela de 24h só reseta quando o cliente responde.
            // O envio de mensagens outbound não estende a janela de atendimento livre.
            const inFreeWindow = t - lastInbound < DAY;
            const inPaidWindow = t - lastPaidStart < DAY;
            if (!inFreeWindow && !inPaidWindow) {
              paidCount++;
              if (t >= weekTime) paidWeek++;
              // Uma nova conversa (paga) começa aqui e dura 24h
              lastPaidStart = t;
            }
          }
        }
      });

      const { data: recent } = await supabase
        .from('crm_messages')
        .select('contact_id, direction, created_at')
        .eq('direction', 'inbound')
        .gte('created_at', since24h)
        .limit(1000);

      const activeSet = new Set<string>();
      (recent || []).forEach((m: any) => m.contact_id && activeSet.add(m.contact_id));

      const { data: recentWeek } = await supabase
        .from('crm_messages')
        .select('contact_id')
        .eq('direction', 'inbound')
        .gte('created_at', startOfWeek)
        .limit(1000);
      const activeWeekSet = new Set<string>();
      (recentWeek || []).forEach((m: any) => m.contact_id && activeWeekSet.add(m.contact_id));

      setConversationStats({
        paidThisMonth: paidCount,
        activeWindow24h: activeSet.size,
        monthLabel: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        paidThisWeek: paidWeek,
        activeThisWeek: activeWeekSet.size
      });

      // Calcular dados do gráfico (últimos 7 dias)
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayLabel = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        let dayPaid = 0;
        let dayActive = 0;

        Object.values(byContact).forEach((msgs) => {
          let lastInbound = -Infinity;
          let lastPaidStart = -Infinity;
          let contactPaidForDay = false;
          let contactActiveForDay = false;

          msgs.forEach(m => {
            const mt = new Date(m.created_at).getTime();
            const mDate = m.created_at.split('T')[0];
            
            if (m.direction === 'inbound') {
              lastInbound = mt;
              if (mDate === dateStr) contactActiveForDay = true;
            } else if (m.direction === 'outbound') {
              const src = (m as any)?.metadata?.source;
              const isEcho = src === 'echo_mobile_app' || src === 'meta_webhook_echo';
              const isManual = src === 'manual_send';
              const isAutomation = src === 'api_automation' || m.message_type === 'template' || m.message_type === 'carousel';
              if (isEcho || isManual || !isAutomation) return;
              const inFreeWindow = mt - lastInbound < DAY;
              const inPaidWindow = mt - lastPaidStart < DAY;
              if (!inFreeWindow && !inPaidWindow) {
                if (mDate === dateStr) contactPaidForDay = true;
                lastPaidStart = mt;
              }
            }
          });
          
          if (contactPaidForDay) dayPaid++;
          if (contactActiveForDay) dayActive++;
        });

        chartData.push({ name: dayLabel, pagos: dayPaid, ativos: dayActive });
      }
      setMetricsChartData(chartData);

    } catch (e) {
      console.error('Erro ao calcular estatísticas de conversas:', e);
    }
  };

  const handleOpenMetricsList = async (type: 'paid' | 'active' | 'weekly_paid' | 'weekly_active') => {
    setMetricsListType(type as any);
    setIsMetricsListOpen(true);
    setMetricsListData([]);

    try {
      const now = new Date();
      const DAY = 24 * 60 * 60 * 1000;
      let startTime: string;
      
      if (type === 'paid' || type === 'active') {
        startTime = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else {
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      if (type === 'paid' || type === 'weekly_paid') {
        const { data: msgs } = await supabase
          .from('crm_messages')
          .select('contact_id, direction, created_at, metadata')
          .gte('created_at', startTime)
          .order('created_at', { ascending: true });

        const byContact: Record<string, any[]> = {};
        (msgs || []).forEach((m: any) => {
          if (!m.contact_id) return;
          (byContact[m.contact_id] = byContact[m.contact_id] || []).push(m);
        });

        const paidContactIds = new Set<string>();
        Object.entries(byContact).forEach(([cid, cMsgs]) => {
          let lastInbound = -Infinity;
          let lastPaidStart = -Infinity;
          for (const m of cMsgs) {
            const t = new Date(m.created_at).getTime();
            if (m.direction === 'inbound') {
              lastInbound = t;
            } else if (m.direction === 'outbound') {
              const src = (m as any)?.metadata?.source;
              const isEcho = src === 'echo_mobile_app' || src === 'meta_webhook_echo';
              const isManual = src === 'manual_send';
              const isAutomation = src === 'api_automation' || m.message_type === 'template' || m.message_type === 'carousel';
              if (isEcho || isManual || !isAutomation) continue;
              const inFreeWindow = t - lastInbound < DAY;
              const inPaidWindow = t - lastPaidStart < DAY;
              if (!inFreeWindow && !inPaidWindow) {
                paidContactIds.add(cid);
                lastPaidStart = t;
              }
            }
          }
        });

        const { data: contactDetails } = await supabase
          .from('crm_contacts')
          .select('id, name, wa_id, status')
          .in('id', Array.from(paidContactIds));
        
        setMetricsListData(contactDetails || []);
      } else {
        const filterTime = (type === 'active') ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : startTime;
        const { data: recent } = await supabase
          .from('crm_messages')
          .select('contact_id')
          .eq('direction', 'inbound')
          .gte('created_at', filterTime);
        
        const activeIds = Array.from(new Set((recent || []).map(m => m.contact_id).filter(id => id)));
        
        const { data: contactDetails } = await supabase
          .from('crm_contacts')
          .select('id, name, wa_id, status')
          .in('id', activeIds);
          
        setMetricsListData(contactDetails || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') {
      computeConversationStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (metaSettings.vps_transcoder_url) {
      const checkVps = async () => {
        try {
          const url = metaSettings.vps_transcoder_url.replace(/\/$/, '');
          // Using a simple health check or just validating the URL format
          // to avoid CORS issues if the server doesn't have the OPTIONS header for the health check
          const res = await fetch(url, { 
            method: 'GET', 
            mode: 'no-cors', // Changed to no-cors to avoid preflight issues during status check
            signal: AbortSignal.timeout(5000) 
          });
          setMetaSettings(prev => ({ ...prev, vps_status: 'online' }));
        } catch (e) {
          setMetaSettings(prev => ({ ...prev, vps_status: 'offline' }));
        }
      };
      checkVps();
      const interval = setInterval(checkVps, 60000);
      return () => clearInterval(interval);
    }
  }, [metaSettings.vps_transcoder_url]);


  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  useEffect(() => {
    if (selectedContact?.next_execution_time) {
      const next = new Date(selectedContact.next_execution_time).getTime();
      const diff = Math.max(0, Math.floor((next - now) / 1000));
      setCountdown(diff > 0 ? diff : null);
    } else {
      setCountdown(null);
    }
  }, [selectedContact?.next_execution_time, selectedContact?.id, now]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

   useEffect(() => {
     const checkAuth = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) {
         navigate('/crm/login');
         return;
       }
        if (localStorage.getItem(`crm_whatsapp_connected_${session.user.id}`) === 'true') {
          setWhatsAppConnectionConfirmed(true);
        }
       fetchData(true);
     };
     checkAuth();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App visível, atualizando dados...');
        fetchData(false);
        fetchContacts();

        if (selectedContactRef.current?.id) {
          fetchMessages(selectedContactRef.current.id, true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const messageChannel = supabase
      .channel('crm_global_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMessage: any = payload.new;
          if (selectedContactRef.current && newMessage.contact_id === selectedContactRef.current.id) {
            setChatMessages(prev => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
          // Reset 24h window on inbound message (regra oficial WhatsApp)
          if (newMessage.direction === 'inbound') {
            setContacts(prev => prev.map(c => c.id === newMessage.contact_id
              ? { ...c, last_message_received_at: newMessage.created_at }
              : c
            ));
            setSelectedContact((prev: any) => prev && prev.id === newMessage.contact_id
              ? { ...prev, last_message_received_at: newMessage.created_at }
              : prev);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedMessage = payload.new;
          if (selectedContactRef.current && updatedMessage.contact_id === selectedContactRef.current.id) {
            setChatMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
            if (updatedMessage.direction === 'outbound' && updatedMessage.status === 'failed') {
              toast({
                title: 'Mensagem não entregue',
                description: getMetaDeliveryErrorMessage(updatedMessage),
                variant: 'destructive',
              });
            }
          }
        }
        fetchContacts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_contacts' }, (payload) => {
        fetchContacts();
        if (selectedContactRef.current && payload.new && (payload.new as any).id === selectedContactRef.current.id) {
          setSelectedContact((prev: any) => ({ ...prev, ...payload.new }));
        }
      })
      .subscribe();

    // Interval for processing scheduled flow nodes (delays)
    const scheduledInterval = setInterval(async () => {
      try {
        const nowIso = new Date().toISOString();
        const { data: contactsToProcess } = await supabase
          .from('crm_contacts')
          .select('id, last_message_received_at, last_interaction')
          .neq('flow_state', 'idle')
          .lte('next_execution_time', nowIso);
          
        if (contactsToProcess && contactsToProcess.length > 0) {
          // Regra de interrupção de fluxo: Só paramos o fluxo se o ÚLTIMO INBOUND (mensagem do cliente)
          // tiver ocorrido há mais de 24 horas + 30 minutos de tolerância.
          const DAY = 24 * 60 * 60 * 1000;
          const TOLERANCE = 30 * 60 * 1000;
          const limit = DAY + TOLERANCE;

          const activeContacts = contactsToProcess.filter(c => {
            if (!c.last_message_received_at) return true;
            const diff = Date.now() - new Date(c.last_message_received_at).getTime();
            return diff < limit;
          });

          const expiredContacts = contactsToProcess.filter(c => {
            if (!c.last_message_received_at) return false;
            const diff = Date.now() - new Date(c.last_message_received_at).getTime();
            return diff >= limit;
          });

          // Encerrar fluxos expirados automaticamente
          if (expiredContacts.length > 0) {
            console.log(`[FLOW] Auto-stopping ${expiredContacts.length} expired flows...`);
            await supabase
              .from('crm_contacts')
              .update({ flow_state: 'idle', next_execution_time: null })
              .in('id', expiredContacts.map(c => c.id));
          }

          if (activeContacts.length > 0) {
            console.log(`[FLOW] Triggering scheduled processing for ${activeContacts.length} active flows...`);
            await supabase.functions.invoke('meta-whatsapp-crm', {
              body: { action: 'processScheduled' }
            });
          }
        }
      } catch (err) {
        console.error('Error in scheduled flow interval:', err);
      }
    }, 5000);

    const activeChatSyncInterval = setInterval(() => {
      const activeContactId = selectedContactRef.current?.id;
      if (activeContactId && document.visibilityState === 'visible') {
        fetchMessages(activeContactId, true);
      }
    }, 4000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(messageChannel);
      clearInterval(scheduledInterval);
      clearInterval(activeChatSyncInterval);
    };
  }, [navigate]);

  const fetchWebhooks = async () => {
    const { data } = await supabase.from('crm_webhooks').select('*').order('created_at', { ascending: false });
    setWebhooks(data || []);
  };

  const fetchStatuses = async () => {
    const { data } = await supabase.from('crm_statuses').select('*').order('sort_order', { ascending: true });
    setKanbanStatuses(data || []);
  };

  const fetchContacts = async () => {
    // Paginate to bypass Supabase's default 1000-row cap and load ALL contacts (14k+)
    const pageSize = 1000;
    let allRows: any[] = [];
    let from = 0;
    // Hard safety cap of 100k contacts to avoid runaway loops
    while (from < 100000) {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .order('last_interaction', { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (error) break;
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    
    // Enrich with last inbound timestamp per contact (24h window logic)
    // Field doesn't exist in DB yet, so derive from crm_messages
    try {
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: recentInbound } = await supabase
        .from('crm_messages')
        .select('contact_id, created_at')
        .eq('direction', 'inbound')
        .gte('created_at', since)
        .order('created_at', { ascending: false });
      const lastInboundByContact: Record<string, string> = {};
      (recentInbound || []).forEach((m: any) => {
        if (m.contact_id && !lastInboundByContact[m.contact_id]) {
          lastInboundByContact[m.contact_id] = m.created_at;
        }
      });
      allRows = allRows.map((c: any) => {
        const derived = lastInboundByContact[c.id];
        if (derived) {
          const existing = c.last_message_received_at ? new Date(c.last_message_received_at).getTime() : 0;
          if (new Date(derived).getTime() > existing) {
            return { ...c, last_message_received_at: derived };
          }
        }
        return c;
      });
    } catch (e) {
      console.warn('[CRM] Failed to enrich last_message_received_at:', e);
    }
    
    setContacts(allRows);
  };

  useEffect(() => {
    let filtered = contacts;
    
    // In the "Conversations" (chat) tab, we only show contacts that have at least one message.
    // However, we should be careful not to hide them if they just arrived.
    if (activeTab === 'dashboard' || activeTab === 'contacts') {
      // For contacts list/conversations view, we show all that have interaction
      filtered = filtered.filter(c => c.last_interaction !== null || c.total_messages_received > 0);
    }

    if (statusFilter !== 'all') {
      // Allow searching by name/phone or filtering by status
      filtered = filtered.filter(c => 
        c.status === statusFilter || 
        c.name?.toLowerCase().includes(statusFilter.toLowerCase()) || 
        c.wa_id?.includes(statusFilter)
      );
    }
    setFilteredContacts(filtered);
  }, [statusFilter, contacts, activeTab]);

  const fetchData = async (isInitialLoad = false) => {
     if (isInitialLoad) setLoading(true);

     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;

 
        let settingsData = null;
        const { data: cloudSettings, error: cloudSettingsError } = await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { action: 'getCloudSettings' }
        });

        if (!cloudSettingsError && cloudSettings?.success && cloudSettings.settings) {
          settingsData = cloudSettings.settings;
        } else {
          console.warn('[CRM] Falha ao carregar conexão em nuvem pela função, tentando leitura direta:', cloudSettingsError || cloudSettings?.error);
          const { data: directSettings } = await supabase
            .from('crm_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          settingsData = directSettings;
        }
 
       if (settingsData) {
         setMetaSettings(settingsData);
         setWhatsAppConnectionConfirmed(!!(settingsData.meta_access_token && settingsData.meta_phone_number_id && settingsData.meta_waba_id));
       }
 
       const { data: profile } = await supabase
         .from('crm_profiles')
         .select('role')
         .eq('user_id', user.id)
         .maybeSingle();
       if (profile) setUserRole(profile.role);

      const { data: metricsData } = await supabase
        .from('crm_metrics')
        .select('*')
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();
      
      if (metricsData) setMetrics(metricsData);

      const { data: flowsData } = await supabase.from('crm_flows').select('*, crm_flow_steps(*)');
      setFlows(flowsData || []);

      // Paginated fetch to load ALL contacts (default cap is 1000)
      await fetchContacts();

      const { data: templatesData } = await supabase.from('crm_templates').select('*');
      setTemplates(templatesData || []);

      // Auto-sync if there are pending templates to see if they were approved
      if (templatesData?.some(t => t.status === 'PENDING' || t.status === 'pending')) {
        console.log('Detectados templates pendentes, iniciando sincronização automática...');
        supabase.functions.invoke('meta-whatsapp-crm', { body: { action: 'getTemplates' } })
          .then(({ data, error }) => {
            if (!error && data?.success) {
              supabase.from('crm_templates').select('*').then(({ data: updatedTemplates }) => {
                if (updatedTemplates) setTemplates(updatedTemplates);
              });
            }
          });
      }

      await fetchWebhooks();
      await fetchStatuses();
      await fetchAllScheduledMessages();

      // Busca informações da conta Google se estiver conectado
      if (localStorage.getItem('google_contacts_connected') === 'true') {
        const { data: googleAcc } = await supabase
          .from('crm_google_accounts')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle();
        if (googleAcc) setGoogleAccountInfo({ email: googleAcc.email });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };


   const handleSaveSettings = async (customSettings?: any) => {
     setSaving(true);
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return;
 
       const targetSettings = customSettings || metaSettings;
       const { id, created_at, updated_at, webhook_verify_token, vps_status, user_id, ...rest } = targetSettings;
       
       // Garante que o ID do webhook seja preservado ou gerado
       const settingsToSave = {
         ...rest,
         user_id: user.id,
         updated_at: new Date().toISOString()
       };

       if (!settingsToSave.webhook_identifier) {
         settingsToSave.webhook_identifier = Math.random().toString(36).substring(2, 15);
       }

       const { error } = await supabase.from('crm_settings').upsert(settingsToSave, { onConflict: 'user_id' });
       
       if (error) throw error;

       // Sync with Admin Central if needed (mocked for now)
       console.log('Syncing settings with Admin Central for token activation...');

        toast({ title: "Configurações salvas!" });
       fetchData(false);


     } catch (error) {
       console.error("Erro ao salvar:", error);
       toast({ title: "Erro ao salvar", variant: "destructive" });
     } finally {
       setSaving(false);
     }
   };

  const handleConnectGoogle = () => {
    if (!metaSettings.google_client_id) {
      toast({ title: "Aviso", description: "Configure o Google Client ID nas configurações primeiro.", variant: "destructive" });
      return;
    }
     // Usamos um callback único /google-callback. O usuário deve registrar este URL no Google Cloud Console.
     const redirectUri = encodeURIComponent(window.location.origin + '/google-callback');
    
    // Escopos: incluímos o de email/profile para identificar a conta e o de contatos para sincronizar
    const scopes = [
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' ');
    
    const scope = encodeURIComponent(scopes);
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${metaSettings.google_client_id}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  const handleDisconnectGoogle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('crm_google_accounts')
        .delete()
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      localStorage.removeItem('google_contacts_connected');
      setGoogleContactsEnabled(false);
      setGoogleAccountInfo(null);
      toast({ title: "Google desconectado" });
    } catch (err: any) {
      toast({ title: "Erro ao desconectar", description: err.message, variant: "destructive" });
    }
  };

  const handleSyncGoogleContacts = async () => {
    if (!googleContactsEnabled) {
      handleConnectGoogle();
      return;
    }

    setIsSyncingContacts(true);
    setSyncProgress(5);
    
    try {
      // Inicia a sincronização chamando a função
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'syncGoogleContacts' }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setSyncProgress(100);
        console.log('[SYNC] Sincronização concluída com sucesso:', data);
        toast({ 
          title: "Sincronização concluída!", 
          description: `${data.count} números processados de ${data.totalFetched || 0} contatos Google.` 
        });
        
        // Atualiza a lista local de contatos
        await fetchContacts();

      } else {
        console.error('[SYNC] Erro retornado pela função:', data.error);
        throw new Error(data.error || "Erro desconhecido na sincronização");
      }
    } catch (err: any) {
      console.error('Erro na sincronização Google:', err);
      toast({ 
        title: "Erro na sincronização", 
        description: err.message, 
        variant: "destructive" 
      });
      if (err.message?.includes('token') || err.message?.includes('auth')) {
        handleConnectGoogle();
      }
    } finally {
      setTimeout(() => {
        setIsSyncingContacts(false);
        setSyncProgress(0);
      }, 1000);
    }
  };

  const handleImprovePrompt = async () => {
    if (!metaSettings.ai_system_prompt?.trim() || improvingPrompt) {
      toast({ title: "Aviso", description: "Escreva algo no prompt primeiro para que eu possa melhorar." });
      return;
    }
    
    setImprovingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'improvePrompt', prompt: metaSettings.ai_system_prompt }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao melhorar prompt");

      setMetaSettings(prev => ({ ...prev, ai_system_prompt: data.improvedPrompt }));
      toast({ title: "Prompt melhorado!", description: "A I.A. refinou suas instruções com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao melhorar prompt", description: err.message, variant: "destructive" });
    } finally {
      setImprovingPrompt(false);
    }
  };

  const copyToClipboard = (text: string, label: string = "Texto") => {
    const cleanText = text.replace(/["']/g, '');
    navigator.clipboard.writeText(cleanText);
    toast({
      title: `${label} copiado!`,
      description: "Conteúdo pronto para enviar (sem aspas).",
    });
  };

  const updateContactStatus = async (contactId: string, updates: any) => {
    try {
      setContacts(prev => prev.map(c => c.id === contactId ? { ...c, ...updates } : c));
      const { error } = await supabase.from('crm_contacts').update(updates).eq('id', contactId);
      if (error) {
        fetchContacts();
        throw error;
      }
      toast({ title: "Status atualizado!" });
      fetchData(false);


    } catch (err) {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleDragStart = (contact: any) => setDraggedContact(contact);
  const handleDrop = async (status: string) => {
    if (!draggedContact || draggedContact.status === status) return;
    await updateContactStatus(draggedContact.id, { status });
    setDraggedContact(null);
  };

  const fetchMessages = async (contactId: string, silent = false) => {
    if (!contactId) return;
    if (!silent) setLoadingChat(true);
    const { data } = await supabase.from('crm_messages').select('*').eq('contact_id', contactId).order('created_at', { ascending: true });
    
    // Only update the UI if the contact is still the one selected
    if (selectedContactRef.current?.id === contactId) {
      setChatMessages(data || []);
      if (!silent) setLoadingChat(false);
      
      // Backfill: derive last_message_received_at from actual inbound messages
      // (regra oficial WhatsApp: a janela de 24h só reseta quando o cliente responde)
      const lastInboundMsg = [...(data || [])].reverse().find((m: any) => m.direction === 'inbound');
      if (lastInboundMsg) {
        const inboundIso = lastInboundMsg.created_at;
        const inboundT = new Date(inboundIso).getTime();
        const currentLast = selectedContactRef.current?.last_message_received_at
          ? new Date(selectedContactRef.current.last_message_received_at).getTime()
          : 0;
        
        if (inboundT > currentLast) {
          setSelectedContact((prev: any) => prev && prev.id === contactId
            ? { ...prev, last_message_received_at: inboundIso }
            : prev);
          setContacts((prev: any[]) => prev.map(c =>
            c.id === contactId ? { ...c, last_message_received_at: inboundIso } : c
          ));
        }
      }
      
      await supabase.from('crm_contacts').update({ last_read_at: new Date().toISOString() }).eq('id', contactId);
    }
  };

  const getLastInboundTime = (contact: any) => {
    const raw = contact?.last_message_received_at;
    if (!raw) return 0;
    const parsed = Date.parse(String(raw).trim());
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isConversationExpired = (contact: any) => {
    const lastInbound = getLastInboundTime(contact);
    if (!lastInbound) return false;
    const DAY = 24 * 60 * 60 * 1000;
    const TOLERANCE = 30 * 60 * 1000;
    return Date.now() - lastInbound > DAY + TOLERANCE;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || isSending(selectedContact.id)) return;

    const isColdList = isConversationExpired(selectedContact);

    if (isColdList) {
      toast({ 
        title: "Janela de 24h Expirada", 
        description: "Esta conversa passou de 24h. Inicie um novo chat usando um Template Aprovado (Custo médio: R$ 0,33).", 
        variant: "destructive" 
      });
      return;
    }

    const textToSend = newMessage.trim();
    const targetContactId = selectedContact.id;
    const targetWaId = selectedContact.wa_id;
    
    setNewMessage('');
    setContactSending(targetContactId, true);
    
    // Optimistic update
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      contact_id: targetContactId,
      content: textToSend,
      direction: 'outbound',
      message_type: 'text',
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    setChatMessages(prev => {
      if (selectedContactRef.current?.id === targetContactId) {
        return [...prev, optimisticMessage];
      }
      return prev;
    });

    try {
      // Desativa o agente de IA automaticamente ao enviar mensagem manual
      if (selectedContact.ai_active) {
        console.log('[CRM] Desativando IA para contato', targetContactId);
        await updateContactStatus(targetContactId, { ai_active: false });
      }

      console.log('[CRM][sendText] →', { to: targetWaId, len: textToSend.length, preview: textToSend.slice(0, 80) });
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'sendMessage', to: targetWaId, text: textToSend, metadata: { source: 'manual_send' } }
      });
      console.log('[CRM][sendText] ← resp', { error, data });
      if (error) throw error;
      if (!data?.success) {
        console.error('[CRM][sendText] FAIL', data);
        throw new Error(data.error || "Erro ao enviar mensagem pela Meta");
      }
      // Remove optimistic and fetch real
      if (selectedContactRef.current?.id === targetContactId) {
        setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      }
      await fetchMessages(targetContactId);
    } catch (err: any) {
      if (selectedContactRef.current?.id === targetContactId) {
        setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setNewMessage(textToSend); // Restore text on failure
      }
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setContactSending(targetContactId, false);
    }
  };

  const handleUpdateTemplateKnowledge = async (templateId: string, knowledge: string) => {
    setUpdatingKnowledge(templateId);
    try {
      const { error } = await supabase
        .from('crm_templates')
        .update({ knowledge_description: knowledge })
        .eq('id', templateId);
      
      if (error) throw error;
      
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, knowledge_description: knowledge } : t));
      toast({ title: "Conhecimento atualizado!" });
    } catch (err) {
      toast({ title: "Erro ao atualizar conhecimento", variant: "destructive" });
    } finally {
      setUpdatingKnowledge(null);
    }
  };
  const handleScheduleBatch = async () => {
    let finalContactIds = [...selectedContactsForScheduling];

    if (selectedCampaignType === 'list') {
      if (!contactListText.trim()) {
        toast({ title: "Cole uma lista de números ou vCard", variant: "destructive" });
        return;
      }
      setIsScheduling(true);
      try {
        // Extrair números (considerando linhas, espaços ou formato vCard)
        const lines = contactListText.split('\n');
        const extractedNumbers: string[] = [];
        
        lines.forEach(line => {
          // Se for vCard (TEL;TYPE=...)
          if (line.includes('TEL;')) {
            const num = line.split(':')[1]?.replace(/\D/g, '');
            if (num) extractedNumbers.push(num);
          } else {
            // Apenas número
            const num = line.replace(/\D/g, '');
            if (num && num.length >= 8) extractedNumbers.push(num);
          }
        });

        if (extractedNumbers.length === 0) {
          toast({ title: "Nenhum número válido encontrado na lista", variant: "destructive" });
          setIsScheduling(false);
          return;
        }

        // Criar ou encontrar contatos
        const contactsToProcess = [...new Set(extractedNumbers)];
        const createdIds: string[] = [];
        
        for (const num of contactsToProcess) {
          let { data: contact } = await supabase.from('crm_contacts').select('id').eq('wa_id', num).maybeSingle();
          if (!contact) {
            const { data: newContact, error: createError } = await supabase.from('crm_contacts').insert({
              wa_id: num,
              name: num,
              status: 'new',
              source_type: 'bulk_import'
            }).select().single();
            if (!createError && newContact) contact = newContact;
          }
          if (contact) createdIds.push(contact.id);
        }
        finalContactIds = createdIds;
      } catch (err: any) {
        toast({ title: "Erro ao processar lista", description: err.message, variant: "destructive" });
        setIsScheduling(false);
        return;
      }
    }

    if (finalContactIds.length === 0) {
      toast({ title: "Nenhum contato selecionado", variant: "destructive" });
      setIsScheduling(false);
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      toast({ title: "Informe data e hora", variant: "destructive" });
      setIsScheduling(false);
      return;
    }

    if (scheduleType !== 'message' && !selectedScheduleId) {
      toast({ title: "Selecione um item para agendar", variant: "destructive" });
      setIsScheduling(false);
      return;
    }

    if (scheduleType === 'message' && !newMessage.trim()) {
      toast({ title: "Escreva a mensagem", variant: "destructive" });
      setIsScheduling(false);
      return;
    }

    try {
      // Validar janela de 24h para mensagens comuns se necessário
      if (scheduleType === 'message' || scheduleType === 'flow') {
        const { data: contactsData } = await supabase.from('crm_contacts').select('id, last_message_received_at').in('id', finalContactIds);
        const coldContacts = contactsData?.filter(c => {
          if (!c.last_message_received_at) return true;
          return (Date.now() - new Date(c.last_message_received_at).getTime() > 24 * 60 * 60 * 1000);
        }) || [];

        if (coldContacts.length > 0) {
          const confirmCold = confirm(`Atenção: ${coldContacts.length} contatos estão fora da janela de 24h e podem não receber mensagens comuns. Deseja continuar apenas com os contatos ativos?`);
          if (!confirmCold) {
            setIsScheduling(false);
            return;
          }
          // Filtrar apenas contatos ativos
          finalContactIds = finalContactIds.filter(id => !coldContacts.find(c => c.id === id));
          if (finalContactIds.length === 0) {
            toast({ title: "Nenhum contato ativo para receber esta mensagem. Use um Template para contatos fora da janela.", variant: "destructive" });
            setIsScheduling(false);
            return;
          }
        }
      }

      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const payload: any = { action: scheduleType === 'message' ? 'sendMessage' : scheduleType === 'template' ? 'sendTemplate' : 'startFlow' };
      
      if (scheduleType === 'message') payload.text = newMessage;
      else if (scheduleType === 'template') {
        const t = templates.find(temp => temp.id === selectedScheduleId);
        payload.templateName = t?.name;
        payload.language = t?.language || 'pt_BR';
      } else if (scheduleType === 'flow') {
        payload.flowId = selectedScheduleId;
      }

      const insertions = finalContactIds.map(contactId => ({
        contact_id: contactId,
        scheduled_for: scheduledFor,
        message_data: payload,
        status: 'pending'
      }));

      const { error } = await supabase.from('crm_scheduled_messages').insert(insertions);
      if (error) throw error;

      toast({ title: `${insertions.length} agendamentos criados!` });
      setIsSchedulingOpen(false);
      setSelectedContactsForScheduling([]);
      setContactListText('');
      setNewMessage('');
      setSelectedScheduleId('');
      fetchAllScheduledMessages();
      if (selectedContact) fetchScheduledMessages(selectedContact.id);
    } catch (err: any) {
      toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  };
  const handleScheduleBirthday = async () => {
    if (!birthdayName || !birthdayNumber) {
      toast({ title: "Preencha nome e número", variant: "destructive" });
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      toast({ title: "Informe data e hora", variant: "destructive" });
      return;
    }
    if (!selectedScheduleId) {
      toast({ title: "Selecione um template para o aniversário", variant: "destructive" });
      return;
    }

    setIsScheduling(true);
    try {
      // 1. Garantir que o contato existe ou criar um temporário/persistente
      let { data: contact } = await supabase.from('crm_contacts').select('id').eq('wa_id', birthdayNumber).maybeSingle();
      
      if (!contact) {
        const { data: newContact, error: createError } = await supabase.from('crm_contacts').insert({
          wa_id: birthdayNumber,
          name: birthdayName,
          status: 'new',
          source_type: 'system'
        }).select().single();
        if (createError) throw createError;
        contact = newContact;
      }

      // 2. Criar agendamento (Apenas template para novos contatos/lista fria)
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const t = templates.find(temp => temp.id === selectedScheduleId);
      
      const payload = {
        action: 'sendTemplate',
        templateName: t?.name,
        language: t?.language || 'pt_BR'
      };

      const { error: scheduleError } = await supabase.from('crm_scheduled_messages').insert({
        contact_id: contact.id,
        scheduled_for: scheduledFor,
        message_data: payload,
        status: 'pending'
      });

      if (scheduleError) throw scheduleError;

      toast({ title: "Aniversário agendado com sucesso!" });
      setIsSchedulingOpen(false);
      setBirthdayName('');
      setBirthdayNumber('');
      fetchAllScheduledMessages();
    } catch (err: any) {
      toast({ title: "Erro ao agendar aniversário", description: err.message, variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  };

  
  
  
  const handleCreateWebhook = async () => {
    if (!newWebhook.name) return;
    setSaving(true);
    try {
      const token = newWebhook.secret_token || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const webhookData = {
        name: newWebhook.name,
        response_type: newWebhook.response_type,
        template_id: newWebhook.template_id || null,
        secret_token: token,
        is_active: true,
        default_status: newWebhook.default_status || 'new'
      };

      const { data, error } = await supabase.from('crm_webhooks').insert([webhookData]).select();
      
      if (error) {
        throw error;
      }

      toast({ title: "Webhook criado!" });
      fetchWebhooks();

      setIsNewWebhookDialogOpen(false);
      setNewWebhook({ name: '', response_type: 'text', template_id: '', secret_token: '', is_active: true, default_status: 'new' });
    } catch (err: any) {
      toast({ 
        title: "Erro ao criar", 
        description: err.message || "Ocorreu um erro ao salvar no banco de dados.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase.from('crm_webhooks').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Webhook excluído!" });
      fetchWebhooks();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const toggleWebhookStatus = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('crm_webhooks').update({ is_active: !current }).eq('id', id);
      if (error) throw error;
      fetchWebhooks();
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatusData.label) return;
    setSaving(true);
    try {
      const value = newStatusData.value || newStatusData.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const sortOrder = (kanbanStatuses.length + 1) * 10;
      
      const { error } = await supabase.from('crm_statuses').insert([{
        label: newStatusData.label,
        value: value,
        color: newStatusData.color,
        sort_order: sortOrder,
        is_starred: false,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }]);

      if (error) throw error;
      toast({ title: "Etiqueta criada com sucesso!" });
      fetchStatuses();
      setIsNewStatusDialogOpen(false);
      setNewStatusData({ label: '', color: 'blue', value: '' });
    } catch (err: any) {
      toast({ title: "Erro ao criar etiqueta", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStatus || !editingStatus.label) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('crm_statuses')
        .update({
          label: editingStatus.label,
          color: editingStatus.color,
          is_starred: !!editingStatus.is_starred
        })
        .eq('id', editingStatus.id);

      if (error) throw error;
      toast({ title: "Etiqueta atualizada com sucesso!" });
      fetchStatuses();
      setIsEditStatusDialogOpen(false);
      setEditingStatus(null);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar etiqueta", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      const { error } = await supabase.from('crm_statuses').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Etiqueta removida!" });
      fetchStatuses();
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  const handleMoveStatus = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = kanbanStatuses.findIndex(s => s.id === id);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === kanbanStatuses.length - 1) return;

    const newStatuses = [...kanbanStatuses];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newStatuses[currentIndex], newStatuses[targetIndex]] = [newStatuses[targetIndex], newStatuses[currentIndex]];

    // Update sort orders
    const updates = newStatuses.map((s, idx) => ({
      id: s.id,
      sort_order: (idx + 1) * 10
    }));

    try {
      for (const update of updates) {
        await supabase.from('crm_statuses').update({ sort_order: update.sort_order }).eq('id', update.id);
      }
      fetchStatuses();
    } catch (err) {
      console.error(err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const { default: Recorder } = await import('opus-recorder');
      const recorder: any = new Recorder({
        encoderPath: '/opus/encoderWorker.min.js',
        encoderApplication: 2048,
        encoderSampleRate: 16000,
        numberOfChannels: 1,
        streamPages: false,
        encoderBitRate: 24000,
      });

      console.log(`[RECORDER] Iniciando gravação PTT com Opus-Recorder.`);
      
      recorder.ondataavailable = (typedArray: Uint8Array) => {
        const buf = typedArray.buffer.slice(typedArray.byteOffset, typedArray.byteOffset + typedArray.byteLength) as ArrayBuffer;
        const audioBlob = new Blob([buf], { type: 'audio/ogg; codecs=opus' });
        console.log(`[RECORDER] Gravação finalizada. Tamanho: ${audioBlob.size} bytes, Tipo: audio/ogg; codecs=opus`);
        
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(audioUrl);
        setIsPreviewingAudio(true);
        
        stream.getTracks().forEach(track => track.stop());
      };

      await recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      toast({ title: "Erro ao acessar microfone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelAudioPreview = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setIsPreviewingAudio(false);
  };

  const sendRecordedAudio = async () => {
    if (recordedAudioBlob && !isSending(selectedContact?.id)) {
      const blob = recordedAudioBlob;
      const previewUrl = recordedAudioUrl || URL.createObjectURL(blob);
      setRecordedAudioBlob(null);
      setRecordedAudioUrl(null);
      setIsPreviewingAudio(false);
      // Forçamos isVoice como true para garantir o formato de "gravado na hora"
      await handleSendMedia(blob, 'audio', true, previewUrl);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setPastedImage(file);
          setPastedImagePreview(URL.createObjectURL(file));
        }
      }
    }
  };

  const cancelPastedImage = () => {
    if (pastedImagePreview) URL.revokeObjectURL(pastedImagePreview);
    setPastedImage(null);
    setPastedImagePreview(null);
  };

  const sendPastedImage = async () => {
    if (pastedImage && !isSending(selectedContact?.id)) {
      const file = pastedImage;
      const preview = pastedImagePreview;
      cancelPastedImage();
      await handleSendMedia(file, 'image', false, preview || undefined);
    }
  };

  const handleSendMedia = async (file: File | Blob, type: 'audio' | 'video' | 'image' | 'document', isVoice = false, previewUrl?: string) => {
    // IMPORTANTE: Se for áudio gravado aqui, isVoice deve ser true para que a Edge Function use o payload de voz da Meta
    const actuallyIsVoice = isVoice || type === 'audio';
    
    if (!selectedContact || isSending(selectedContact.id)) {
      console.warn('[CRM][sendMedia] abort: no contact or already sending', { hasContact: !!selectedContact, sending: selectedContact ? isSending(selectedContact.id) : false });
      return;
    }
    console.log('[CRM][sendMedia] start', { type, isVoice: actuallyIsVoice, size: (file as any).size, mime: (file as any).type, to: selectedContact.wa_id });

    const isColdList = isConversationExpired(selectedContact);

    if (isColdList) {
      toast({ 
        title: "Janela de 24h Expirada", 
        description: "Para reabrir o chat (Custo médio: R$ 0,33), envie primeiro um Template Aprovado.", 
        variant: "destructive" 
      });
      return;
    }

    const targetContactId = selectedContact.id;
    const targetWaId = selectedContact.wa_id;
    
    setContactSending(targetContactId, true);
    const localPreviewUrl = previewUrl || (file instanceof File ? URL.createObjectURL(file) : (recordedAudioUrl || URL.createObjectURL(file)));
    
    // Optimistic update for media
    const optimisticMessage = {
      id: `temp-media-${Date.now()}`,
      contact_id: targetContactId,
      content: actuallyIsVoice ? '[Mensagem de Áudio...]' : `[${type.toUpperCase()}...]`,
      direction: 'outbound',
      message_type: type,
      created_at: new Date().toISOString(),
      isOptimistic: true,
      media_url: localPreviewUrl
    };
    
    setChatMessages(prev => {
      if (selectedContactRef.current?.id === targetContactId) {
        return [...prev, optimisticMessage];
      }
      return prev;
    });

    let savedAudioMessage: any = null;
    const persistOutboundAudio = async (publicUrl: string, metaMsgId: string | null, source: string, contentType?: string, status = 'sent') => {
      const { data: savedMessage, error: persistError } = await supabase
        .from('crm_messages')
        .insert({
          contact_id: targetContactId,
          direction: 'outbound',
          message_type: 'audio',
          content: '[Mensagem de Áudio]',
          media_url: publicUrl,
          status,
          meta_message_id: metaMsgId,
          metadata: { source: 'manual_send', original_mime: contentType || null, is_voice: isVoice }
        })
        .select()
        .single();

      if (persistError) throw persistError;

      await supabase.from('crm_contacts')
        .update({ last_interaction: new Date().toISOString() })
        .eq('id', targetContactId);

      if (selectedContactRef.current?.id === targetContactId) {
        setChatMessages(prev => {
          const withoutTemp = prev.filter(m => m.id !== optimisticMessage.id && m.id !== savedMessage?.id);
          return savedMessage ? [...withoutTemp, savedMessage] : withoutTemp;
        });
      }
      savedAudioMessage = savedMessage;
      return savedMessage;
    };

    const updatePersistedAudio = async (status: string, source: string, metaMsgId?: string | null, errorMessage?: string) => {
      if (!savedAudioMessage?.id) return;
      const updateData: any = {
        status,
        metadata: { ...(savedAudioMessage.metadata || {}), source }
      };
      if (metaMsgId) updateData.meta_message_id = metaMsgId;
      if (errorMessage) updateData.error_message = errorMessage;
      const { data: updatedMessage } = await supabase
        .from('crm_messages')
        .update(updateData)
        .eq('id', savedAudioMessage.id)
        .select()
        .single();
      if (updatedMessage && selectedContactRef.current?.id === targetContactId) {
        setChatMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
      }
    };

    try {
      // Desativa o agente de IA automaticamente ao enviar mídia manual
      if (selectedContact.ai_active) {
        await updateContactStatus(targetContactId, { ai_active: false });
      }

      const isAudio = type === 'audio';
      setMediaUploadProgress(prev => ({ ...prev, [targetContactId]: 10 }));
      
      let fileExt = 'ogg';
      let contentType = 'audio/ogg; codecs=opus';
      
      if (isAudio) {
        fileExt = 'ogg';
        contentType = 'audio/ogg; codecs=opus';
      } else if (file instanceof File) {
        fileExt = file.name.split('.').pop() || 'bin';
        contentType = file.type;
      }

      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${fileName}`;

      setMediaUploadProgress(prev => ({ ...prev, [targetContactId]: 30 }));

      const { error: uploadError } = await supabase.storage
        .from('crm-media')
        .upload(filePath, file, {
          contentType: contentType || 'application/octet-stream',
          upsert: true
        });

      if (uploadError) throw uploadError;
      setMediaUploadProgress(prev => ({ ...prev, [targetContactId]: 60 }));

      const { data: { publicUrl } } = supabase.storage
        .from('crm-media')
        .getPublicUrl(filePath);

      let historyAudioUrl = publicUrl;
      let historyContentType = contentType;
      if (isAudio) {
        const wavBlob = await createMobilePlayableAudioBlob(file);
        if (wavBlob) {
          const wavPath = `chat-media/history_${fileName.replace(/\.[^.]+$/, '')}.wav`;
          const { error: wavUploadError } = await supabase.storage
            .from('crm-media')
            .upload(wavPath, wavBlob, { contentType: 'audio/wav', upsert: true });
          if (!wavUploadError) {
            const { data: { publicUrl: wavPublicUrl } } = supabase.storage.from('crm-media').getPublicUrl(wavPath);
            historyAudioUrl = wavPublicUrl;
            historyContentType = 'audio/wav';
          }
        }
        await persistOutboundAudio(historyAudioUrl, null, 'history_saved_before_send', historyContentType, 'sending');
      }
      setMediaUploadProgress(prev => ({ ...prev, [targetContactId]: 80 }));

      if (type === 'audio' && metaSettings.vps_transcoder_url && metaSettings.vps_status !== 'offline') {
        console.log('[CRM][sendMedia][VPS] Tentando envio via VPS Transcoder', { url: metaSettings.vps_transcoder_url, to: targetWaId });
        let vpsResult: any = null;
        try {
          const vpsUrl = metaSettings.vps_transcoder_url.replace(/\/$/, '');
          const response = await fetch(`${vpsUrl}/send-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: targetWaId,
              audioUrl: publicUrl,
              metaToken: metaSettings.meta_access_token,
              phoneId: metaSettings.meta_phone_number_id,
              sendAsVoice: true
            })
          });
          
          vpsResult = await response.json().catch(() => ({}));
          console.log('[CRM][sendMedia][VPS] Resposta do VPS:', { status: response.status, vpsResult });
          if (!response.ok) {
            console.error('[CRM][sendMedia][VPS] VPS retornou erro:', vpsResult);
            throw new Error(vpsResult.error || vpsResult.details || 'Erro no processamento do VPS');
          }
        } catch (vpsErr: any) {
          console.error('[CRM][sendMedia][VPS] erro', vpsErr);
          toast({ 
            title: "Erro no transcoder da Meta", 
            description: "O áudio foi salvo no histórico, mas a Meta API não aceitou o envio. Erro: " + vpsErr.message,
            variant: "destructive"
          });
          await updatePersistedAudio('failed', 'vps_bridge_failed', null, vpsErr.message);
          setContactSending(targetContactId, false);
          return;
        }

        if (vpsResult) {
          const metaMsgId = vpsResult?.messageId || vpsResult?.messages?.[0]?.id || null;
          await updatePersistedAudio('accepted', 'vps_bridge', metaMsgId);
          toast({ title: "Áudio enviado para a Meta", description: "Aguardando confirmação de entrega." });
          setMediaUploadProgress(prev => {
            const next = { ...prev };
            delete next[targetContactId];
            return next;
          });
          setContactSending(targetContactId, false);
          return;
        }
      }

      setMediaUploadProgress(prev => ({ ...prev, [targetContactId]: 90 }));

      console.log('[CRM][sendMedia] invocando edge sendMessage com mídia', { type, url: publicUrl, isVoice: type === 'audio' });
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', { 
        body: { 
          action: 'sendMessage', 
          to: targetWaId,
          audioUrl: type === 'audio' ? publicUrl : undefined,
          imageUrl: type === 'image' ? publicUrl : undefined,
          videoUrl: type === 'video' ? publicUrl : undefined,
          documentUrl: type === 'document' ? publicUrl : undefined,
          fileName: type === 'document' ? (file instanceof File ? file.name : 'document') : undefined,
          isVoice: type === 'audio',
          skipLocalSave: type === 'audio' ? true : undefined,
          meta_phone_number_id: metaSettings.meta_phone_number_id,
          meta_access_token: metaSettings.meta_access_token
        },
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      console.log('[CRM][sendMedia] resp edge', { error, data });
      if (error) throw error;
      if (!data?.success) {
        console.error('[CRM][sendMedia] FAIL edge', data);
        throw new Error(data?.error || 'Falha desconhecida ao enviar mídia');
      }

      if (selectedContactRef.current?.id === targetContactId) {
        setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      }
      if (type === 'audio') {
        const metaMsgId = data?.messageId || data?.messages?.[0]?.id || data?.result?.messages?.[0]?.id || null;
        await updatePersistedAudio('accepted', 'standard_send', metaMsgId);
      }
      await fetchMessages(targetContactId);
      toast({ title: "Mídia enviada para a Meta", description: "Aguardando confirmação de entrega." });
    } catch (err: any) {
      console.error('[CRM][sendMedia] EXCEPTION', err);
      if (selectedContactRef.current?.id === targetContactId) {
        setChatMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      }
      toast({ title: "Erro ao enviar mídia", description: err.message, variant: "destructive" });
    } finally {
      setMediaUploadProgress(prev => {
        const next = { ...prev };
        delete next[targetContactId];
        return next;
      });
      setContactSending(targetContactId, false);
    }
  };

  const [resendingAudioIds, setResendingAudioIds] = useState<Set<string>>(new Set());

  const handleResendAudio = async (msg: any) => {
    if (!msg?.id || !msg?.media_url) return;
    const contact = contacts.find(c => c.id === msg.contact_id) || selectedContact;
    const targetWaId = contact?.wa_id;
    if (!targetWaId) {
      toast({ title: "Contato não encontrado para reenviar", variant: "destructive" });
      return;
    }

    setResendingAudioIds(prev => {
      const next = new Set(prev);
      next.add(msg.id);
      return next;
    });

    const markStatus = async (status: string, source: string, metaMsgId?: string | null, errorMessage?: string) => {
      const updateData: any = {
        status,
        metadata: { ...(msg.metadata || {}), source }
      };
      if (metaMsgId) updateData.meta_message_id = metaMsgId;
      if (errorMessage) updateData.error_message = errorMessage;
      const { data: updatedMessage } = await supabase
        .from('crm_messages')
        .update(updateData)
        .eq('id', msg.id)
        .select()
        .single();
      if (updatedMessage) {
        setChatMessages(prev => prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m));
      }
    };

    try {
      // Tenta primeiro via VPS transcoder se disponível
      if (metaSettings.vps_transcoder_url && metaSettings.vps_status !== 'offline') {
        try {
          const vpsUrl = metaSettings.vps_transcoder_url.replace(/\/$/, '');
          const response = await fetch(`${vpsUrl}/send-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: targetWaId,
              audioUrl: msg.media_url,
              metaToken: metaSettings.meta_access_token,
              phoneId: metaSettings.meta_phone_number_id,
              sendAsVoice: true
            })
          });
          const vpsResult = await response.json().catch(() => ({}));
          if (response.ok) {
            const metaMsgId = vpsResult?.messageId || vpsResult?.messages?.[0]?.id || null;
            await markStatus('sent', 'vps_bridge_resend', metaMsgId);
            toast({ title: "Áudio reenviado!" });
            return;
          }
          // se falhar, tenta fallback abaixo
        } catch (_) {
          // fallback
        }
      }

      // Fallback: envia via edge function padrão
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: {
          action: 'sendMessage',
          to: targetWaId,
          audioUrl: msg.media_url,
          isVoice: true,
          skipLocalSave: true
        }
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha no reenvio');
      const metaMsgId = data?.messageId || data?.messages?.[0]?.id || data?.result?.messages?.[0]?.id || null;
      await markStatus('sent', 'standard_resend', metaMsgId);
      toast({ title: "Áudio reenviado!" });
    } catch (err: any) {
      await markStatus('failed', 'resend_failed', null, err.message);
      toast({ title: "Falha ao reenviar áudio", description: err.message, variant: "destructive" });
    } finally {
      setResendingAudioIds(prev => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadType) return;
    
    const isVoice = uploadType === 'audio';
    handleSendMedia(file, uploadType, isVoice);
    e.target.value = '';
  };

  const handleTriggerFlow = async (flowId: string) => {
    if (!selectedContact || isSending(selectedContact.id)) return;

    const isColdList = isConversationExpired(selectedContact);

    if (isColdList) {
      toast({ 
        title: "Janela de 24h Expirada", 
        description: "Não é possível iniciar fluxos em chats expirados. Use um Template Aprovado.", 
        variant: "destructive" 
      });
      return;
    }

    const targetContactId = selectedContact.id;
    const targetWaId = selectedContact.wa_id;
    
    const flow = flows.find(f => f.id === flowId);
    if (!confirmSend || confirmSend.id !== flowId) {
      setConfirmSend({ type: 'flow', id: flowId, name: flow?.name || 'Fluxo' });
      return;
    }

    setConfirmSend(null);
    setContactSending(targetContactId, true);
    try {
      // Desativa o agente de IA automaticamente ao iniciar um fluxo manual
      if (selectedContact.ai_active) {
        await updateContactStatus(targetContactId, { ai_active: false });
      }

      console.log('[CRM] Invocando startFlow para contato', targetContactId, 'fluxo', flowId);
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'startFlow', contactId: targetContactId, waId: targetWaId, flowId }
      });
      
      if (error) {
        console.error('[CRM] Erro na invocação de startFlow:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.error('[CRM] Função retornou erro no startFlow:', data);
        throw new Error(data?.error || "Erro ao iniciar fluxo");
      }

      toast({ title: "Fluxo Iniciado!" });
      
      // Atualização imediata do estado local para refletir no chat e na lista
      const { data: updatedContact } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', targetContactId)
        .single();
        
      if (updatedContact) {
        console.log('[CRM] Contato atualizado após startFlow:', updatedContact.flow_state);
        setContacts(prev => prev.map(c => c.id === targetContactId ? updatedContact : c));
        if (selectedContact?.id === targetContactId) {
          setSelectedContact(updatedContact);
        }
      }

      await fetchMessages(targetContactId);
    } catch (err: any) {
      toast({ title: "Erro ao iniciar fluxo", description: err.message, variant: "destructive" });
    } finally {
      setContactSending(targetContactId, false);
    }
  };

  const handleCancelFlow = async (contactId: string) => {
    setContactSending(contactId, true);
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update({
          flow_state: 'idle',
          current_flow_id: null,
          current_step_index: null,
          current_node_id: null,
          next_execution_time: null
        })
        .eq('id', contactId);
        
      if (error) throw error;
      
      await supabase
        .from('crm_scheduled_messages')
        .delete()
        .eq('contact_id', contactId)
        .eq('status', 'pending');

      toast({ title: "Fluxo interrompido com sucesso!" });
      
      if (selectedContact?.id === contactId) {
        setSelectedContact((prev: any) => ({
          ...prev,
          flow_state: 'idle',
          current_flow_id: null,
          current_step_index: null,
          current_node_id: null,
          next_execution_time: null
        }));
      }
      fetchContacts();
    } catch (err: any) {
      toast({ title: "Erro ao interromper fluxo", description: err.message, variant: "destructive" });
    } finally {
      setContactSending(contactId, false);
    }
  };

  const handleResumeFlow = async (contactId: string) => {
    setContactSending(contactId, true);
    try {
      const { data: contact } = await supabase
        .from('crm_contacts')
        .select('current_flow_id, current_node_id, wa_id')
        .eq('id', contactId)
        .single();
        
      if (!contact?.current_flow_id || !contact?.current_node_id) {
        throw new Error('Informações do fluxo não encontradas para retomar.');
      }

      const { error } = await supabase
        .from('crm_contacts')
        .update({
          flow_state: 'processing',
          next_execution_time: new Date().toISOString()
        })
        .eq('id', contactId);

      if (error) throw error;
      
      toast({ title: "Fluxo retomado! Processando agora..." });
      
      // Call background function to process immediately
      await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'processScheduled' }
      });
      
      fetchContacts();
    } catch (err: any) {
      toast({ title: "Erro ao retomar fluxo", description: err.message, variant: "destructive" });
    } finally {
      setContactSending(contactId, false);
    }
  };

  const handleScheduleMessage = async () => {
    if (!selectedContact || !scheduleDate || !scheduleTime) {
      toast({ title: "Preencha a data e hora", variant: "destructive" });
      return;
    }

    setIsScheduling(true);
    try {
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      
      let messageData: any = { action: '' };
      const isColdList = isConversationExpired(selectedContact);
      
      if (scheduleType === 'message') {
        if (isColdList) {
          toast({ 
            title: "Regra de Segurança", 
            description: "Para contatos fora da janela de 24h, use apenas Templates Aprovados.", 
            variant: "destructive" 
          });
          setIsScheduling(false);
          return;
        }
        if (!newMessage.trim()) {
          toast({ title: "Digite a mensagem para agendar", variant: "destructive" });
          setIsScheduling(false);
          return;
        }
        messageData = { action: 'sendMessage', text: newMessage };
      } else if (scheduleType === 'template') {
        if (!selectedScheduleId) {
          toast({ title: "Selecione um template", variant: "destructive" });
          setIsScheduling(false);
          return;
        }
        messageData = { action: 'sendTemplate', templateName: selectedScheduleId, languageCode: 'pt_BR' };
      } else if (scheduleType === 'flow') {
        if (isColdList) {
          toast({ 
            title: "Regra de Segurança", 
            description: "Não é possível agendar fluxos para lista fria. Use Templates.", 
            variant: "destructive" 
          });
          setIsScheduling(false);
          return;
        }
        if (!selectedScheduleId) {
          toast({ title: "Selecione um fluxo", variant: "destructive" });
          setIsScheduling(false);
          return;
        }
        messageData = { action: 'startFlow', flowId: selectedScheduleId };
      }

      const { error } = await supabase.from('crm_scheduled_messages').insert({
        contact_id: selectedContact.id,
        scheduled_for: scheduledFor,
        message_data: messageData,
        status: 'pending'
      });

      if (error) throw error;

      toast({ title: "Mensagem agendada com sucesso!" });
      setIsSchedulingOpen(false);
      setNewMessage('');
      setScheduleDate('');
      setScheduleTime('');
      setSelectedScheduleId('');
      fetchScheduledMessages(selectedContact.id);
      fetchAllScheduledMessages();
    } catch (err: any) {
      toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" });
    } finally {
      setIsScheduling(false);
    }
  };

  const syncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', { body: { action: 'getTemplates' } });
      if (error) throw error;
      toast({ title: "Templates Sincronizados" });
      fetchData(false);


    } catch (err) {
      toast({ title: "Erro ao sincronizar", variant: "destructive" });
    } finally {
      setSyncingTemplates(false);
    }
  };

  const handleSendTemplate = async (templateName: string, language: string) => {
    if (!selectedContact || isSending(selectedContact.id)) return;
    const targetContactId = selectedContact.id;
    const targetWaId = selectedContact.wa_id;
    
    const template = templates.find(t => t.name === templateName);
    
    if (!confirmSend || confirmSend.id !== templateName) {
      setConfirmSend({ type: 'template', id: templateName, name: templateName, language });
      return;
    }

    setConfirmSend(null);
    setContactSending(targetContactId, true);
    try {
      // Desativa o agente de IA automaticamente ao enviar template manual
      if (selectedContact.ai_active) {
        await updateContactStatus(targetContactId, { ai_active: false });
      }
      
      const components: any[] = [];
      const bodyComponent = template?.components?.find((c: any) => c.type === 'BODY');
      const headerComponent = template?.components?.find((c: any) => c.type === 'HEADER');
      
      if (headerComponent) {
        if (headerComponent.format === 'IMAGE') {
          const handleOrUrl = headerComponent.example?.header_handle?.[0];
          if (handleOrUrl && handleOrUrl.startsWith('http') && !handleOrUrl.includes('whatsapp.net')) {
            components.push({
              type: "header",
              parameters: [{ type: "image", image: { link: handleOrUrl } }]
            });
          }
        } else if (headerComponent.format === 'TEXT' && headerComponent.text) {
          const headerVariables = headerComponent.text.match(/\{\{\d+\}\}/g);
          if (headerVariables) {
            components.push({
              type: "header",
              parameters: headerVariables.map(() => ({ type: "text", text: "---" }))
            });
          }
        }
      }

      if (bodyComponent?.text) {
        const bodyVariables = bodyComponent.text.match(/\{\{\d+\}\}/g);
        if (bodyVariables) {
          const parameters = bodyVariables.map((_: any, index: number) => {
            if (index === 0 && selectedContact.name) return { type: "text", text: selectedContact.name };
            const exampleData = bodyComponent.example?.body_text?.[0] || [];
            let val = "---";
            if (Array.isArray(exampleData)) {
              if (exampleData.length === 1 && typeof exampleData[0] === 'string' && bodyVariables.length > 1) {
                const splitExamples = exampleData[0].split(' ');
                val = splitExamples[index] || "---";
              } else {
                val = exampleData[index] || "---";
              }
            } else if (typeof exampleData === 'string') {
              const splitExamples = exampleData.split(' ');
              val = splitExamples[index] || "---";
            }
            return { type: "text", text: val };
          });
          components.push({ type: "body", parameters: parameters });
        }
      }

      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { 
          action: 'sendTemplate', 
          to: targetWaId, 
          templateName, 
          languageCode: language,
          components: components
        }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao enviar template pela Meta");
      toast({ title: "Template enviado!" });
      await fetchMessages(targetContactId);
    } catch (err: any) {
      toast({ title: "Erro ao enviar template", description: err.message, variant: "destructive" });
    } finally {
      setContactSending(targetContactId, false);
    }
  };

  const handleSaveTemplate = async (template: any) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'createTemplate', ...template }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Erro ao criar template na Meta");
      toast({ title: "Template enviado para aprovação!" });
      fetchData(false);

    } catch (err: any) {
      toast({ title: "Erro ao criar template", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (name: string) => {
    try {
      const { error } = await supabase.functions.invoke('meta-whatsapp-crm', {
        body: { action: 'deleteTemplate', name }
      });
      if (error) throw error;
      toast({ title: "Template excluído" });
      fetchData(false);

    } catch (err) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const handleSaveContactMetadata = async (contactId: string, metadata: any) => {
    try {
      const { error } = await supabase.from('crm_contacts').update({ metadata }).eq('id', contactId);
      if (error) throw error;
      toast({ title: "Informações salvas!" });
      fetchContacts();
      if (selectedContact?.id === contactId) {
        setSelectedContact({ ...selectedContact, metadata });
      }
    } catch (err) {
      toast({ title: "Erro ao salvar informações", variant: "destructive" });
    }
  };

  const handleExportContacts = (format: 'csv' | 'vcard' = 'csv') => {
    if (format === 'csv') {
      const data = contacts.map(c => ({
        Nome: c.name || '',
        Telefone: c.wa_id || '',
        Status: c.status || '',
        Bio: c.metadata?.bio || '',
        Instagram: c.metadata?.instagram || '',
        Facebook: c.metadata?.facebook || '',
        Links: c.metadata?.links || ''
      }));
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contatos_crm_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else if (format === 'vcard') {
      const vcards = contacts.map(c => {
        return [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${c.name || c.wa_id}`,
          `TEL;TYPE=CELL:${c.wa_id}`,
          `NOTE:${c.metadata?.bio || ''} | IG: ${c.metadata?.instagram || ''} | FB: ${c.metadata?.facebook || ''}`,
          `URL:${c.metadata?.links || ''}`,
          'END:VCARD'
        ].join('\n');
      }).join('\n');
      
      const blob = new Blob([vcards], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contatos_crm_${new Date().toISOString().split('T')[0]}.vcf`;
      a.click();
    }
  };

  const handleImportContacts = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const contacts_to_import: any[] = [];

      if (fileName.endsWith('.vcf') || fileName.endsWith('.vcard')) {
        const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const vcardBlocks = normalizedContent.split(/BEGIN:VCARD/i).filter(block => block.trim());
        
        console.log(`vCard blocks found: ${vcardBlocks.length}`);

        for (const block of vcardBlocks) {
          const lines = block.split('\n');
          let currentContact: any = { metadata: {} };
          let foundName = false;
          let foundPhone = false;

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (/^FN[;:]/i.test(trimmedLine)) {
              currentContact.name = trimmedLine.split(':').slice(1).join(':').trim();
              foundName = true;
            } else if (/^N[;:]/i.test(trimmedLine) && !foundName) {
              const nameValue = trimmedLine.split(':').slice(1).join(':').trim();
              const parts = nameValue.split(';');
              currentContact.name = parts.filter(p => p).reverse().join(' ').trim();
              foundName = true;
            } else if (/^TEL[;:]/i.test(trimmedLine)) {
              const phoneValue = trimmedLine.split(':').slice(1).join(':').trim();
              const phone = phoneValue.replace(/\D/g, '');
              if (phone && phone.length >= 8) {
                currentContact.wa_id = phone;
                foundPhone = true;
              }
            } else if (trimmedLine.toUpperCase().startsWith('NOTE:')) {
              currentContact.metadata.bio = trimmedLine.substring(5).trim();
            } else if (trimmedLine.toUpperCase().startsWith('URL:')) {
              currentContact.metadata.links = trimmedLine.substring(4).trim();
            }
          }

          if (foundPhone) {
            if (!currentContact.name) currentContact.name = currentContact.wa_id;
            contacts_to_import.push(currentContact);
          }
        }
      } else {
        const lines = content.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 1) return;
        
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        const imported = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
          const obj: any = {};
          headers.forEach((h, i) => obj[h] = values[i]);
          return obj;
        });

        for (const contact of imported) {
          const phone = (contact.Telefone || contact.wa_id || contact.phone || contact.whatsapp || Object.values(contact)[0])?.toString();
          if (!phone) continue;
          
          const cleanPhone = phone.replace(/\D/g, '');
          if (cleanPhone.length < 8) continue;

          contacts_to_import.push({
            wa_id: cleanPhone,
            name: contact.Nome || contact.name || contact.full_name || cleanPhone,
            status: contact.Status || 'new',
            source_type: 'imported',
            metadata: {
              bio: contact.Bio || contact.bio,
              instagram: contact.Instagram || contact.instagram,
              facebook: contact.Facebook || contact.facebook,
              links: contact.Links || contact.links
            }
          });
        }
      }

      if (contacts_to_import.length === 0) {
        toast({ title: "Nenhum contato válido encontrado no arquivo", variant: "destructive" });
        return;
      }

      const batchSize = 100;
      let successCount = 0;
      
      toast({ title: `Importando ${contacts_to_import.length} contatos...` });

      // Processamento em lotes maiores
      for (let i = 0; i < contacts_to_import.length; i += batchSize) {
        const batch = contacts_to_import.slice(i, i + batchSize).map(contact => ({
          wa_id: contact.wa_id,
          name: contact.name,
          status: contact.status || 'new',
          source_type: 'imported',
          metadata: contact.metadata || {},
          last_interaction: null
        }));

        const { error } = await supabase.from('crm_contacts').upsert(batch, { onConflict: 'wa_id' });
        if (!error) {
          successCount += batch.length;
          // Atualiza a lista periodicamente para feedback visual
          if (successCount % 500 === 0) fetchContacts();
        } else {
          console.error("Batch error:", error);
        }
      }

      toast({ title: `Importação concluída: ${successCount} contatos!` });
      fetchContacts();
    };
    reader.readAsText(file);
  };

  const openContactInfo = (contact: any) => {
    setContactToView(contact);
    setIsContactInfoOpen(true);
  };

  const openChat = (contact: any) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
    fetchScheduledMessages(contact.id);
  };

  const fetchScheduledMessages = async (contactId: string) => {
    const { data } = await supabase
      .from('crm_scheduled_messages')
      .select('*')
      .eq('contact_id', contactId)
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });
    
    if (selectedContactRef.current?.id === contactId) {
      setScheduledMessages(data || []);
    }
  };

  const fetchAllScheduledMessages = async () => {
    const { data, error } = await supabase
      .from('crm_scheduled_messages')
      .select(`
        *,
        crm_contacts (
          name,
          wa_id
        )
      `)
      .order('scheduled_for', { ascending: true });
    
    if (error) {
      console.error("Error fetching all scheduled messages:", error);
      return;
    }
    setAllScheduledMessages(data || []);
  };

  const handleSaveFlow = async (flow: any) => {
    setSaving(true);
    try {
      const { id, ...flowData } = flow;
      
      if (!flowData.name || flowData.name.trim() === '') {
        throw new Error("O fluxo precisa de um nome.");
      }

      const payload = {
        name: flowData.name,
        trigger_type: flowData.trigger_type || 'manual',
        trigger_keywords: flowData.trigger_keywords || [],
        is_active: flowData.is_active !== false,
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        updated_at: new Date().toISOString()
      };

      let result;
      if (id) {
        result = await supabase
          .from('crm_flows')
          .update(payload)
          .eq('id', id);
      } else {
        result = await supabase
          .from('crm_flows')
          .insert([payload])
          .select();
      }

      if (result.error) {
        throw result.error;
      }
      
      toast({ title: "Fluxo salvo com sucesso!" });
      setIsFlowEditorOpen(false);
      setEditingFlow(null);
      fetchData(false);


    } catch (err: any) {
      toast({ 
        title: "Erro ao salvar fluxo", 
        description: err.message || "Ocorreu um erro inesperado.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateFlow = async (flow: any) => {
    setSaving(true);
    try {
      const { id, created_at, updated_at, ...flowData } = flow;
      
      const nodeMap: Record<string, string> = {};
      const newNodes = (flowData.nodes || []).map((node: any) => {
        const newId = `${node.type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        nodeMap[node.id] = newId;
        return { ...node, id: newId };
      });

      const newEdges = (flowData.edges || []).map((edge: any) => ({
        ...edge,
        id: `e_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        source: nodeMap[edge.source] || edge.source,
        target: nodeMap[edge.target] || edge.target
      }));

      const newFlow = {
        name: `${flowData.name} (Cópia)`,
        trigger_type: flowData.trigger_type || 'manual',
        trigger_keywords: flowData.trigger_keywords || [],
        is_active: false,
        nodes: newNodes,
        edges: newEdges,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('crm_flows')
        .insert([newFlow])
        .select();

      if (error) {
        throw error;
      }
      
      toast({ title: "Fluxo duplicado com sucesso!" });
      fetchData(false);

      fetchData(false);

    } catch (err: any) {
      console.error("Erro ao duplicar fluxo:", err);
      toast({ 
        title: "Erro ao duplicar fluxo", 
        description: err.message || "Verifique se há campos obrigatórios faltando ou conflitos.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };



  const getWindowInfo = (lastInbound: string) => {
    if (!lastInbound) return { label: "Janela aberta", isExpired: false };
    
    const last = new Date(lastInbound).getTime();
    const nowTime = Date.now();
    const diffMs = nowTime - last;
    const DAY = 24 * 60 * 60 * 1000;
    
    // Tolerância de 30 minutos para exibição visual também
    const limit = DAY + (30 * 60 * 1000);
    const remainingMs = Math.max(0, limit - diffMs);
    const remainingHours = remainingMs / (1000 * 60 * 60);
    
    return {
      label: remainingHours > 0 ? `${remainingHours.toFixed(1)}h restantes` : "Janela expirada",
      isExpired: remainingHours <= 0
    };
  };

  const getStatusColor = (status: string) => {
    const statusObj = kanbanStatuses.find(s => s.value === status);
    if (statusObj) {
      switch (statusObj.color) {
        case 'blue': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'yellow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case 'purple': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'green': return 'bg-green-500/10 text-green-500 border-green-500/20';
        case 'red': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'orange': return 'bg-orange-500 text-white border-orange-600 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]';
        case 'indigo': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
        case 'pink': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
        default: return 'bg-gray-500/10 text-gray-500';
      }
    }
    
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'responded': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'qualified': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'closed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'lost': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'human': return 'bg-orange-500 text-white border-orange-600 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusObj = kanbanStatuses.find(s => s.value === status);
    return statusObj ? statusObj.label : status.toUpperCase();
  };

  if (loading && !contacts.length) return <div className="min-h-screen flex items-center justify-center"><RefreshCcw className="animate-spin" /></div>;

  // Gate: usuário precisa conectar o WhatsApp antes de acessar conversas/CRM
  const isWhatsAppConnected = whatsAppConnectionConfirmed || !!(metaSettings.meta_access_token && metaSettings.meta_phone_number_id && metaSettings.meta_waba_id);
  if (!loading && !isWhatsAppConnected) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0c1317] via-[#111b21] to-[#0c1317] p-6">
        <div className="max-w-xl w-full bg-[#202c33] rounded-2xl shadow-2xl border border-white/5 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#00a884]/10 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-[#00a884]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Conecte seu WhatsApp</h1>
          <p className="text-white/60 mb-8 text-sm leading-relaxed">
            Para começar a usar o CRM, conversas e disparos, você precisa primeiro
            conectar uma conta oficial do WhatsApp Business através do Facebook.
            É rápido e seguro — usamos o Embedded Signup oficial da Meta.
          </p>
          <button
            onClick={startEmbeddedSignup}
            className="w-full h-14 rounded-xl bg-[#1877F2] hover:bg-[#1465c8] text-white font-bold text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#1877F2]/30"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Conectar com Facebook
          </button>
          <p className="text-[11px] text-white/30 mt-6">
            Ao conectar, você autoriza nosso app (Tech Provider Meta) a gerenciar mensagens em nome do seu número WhatsApp Business.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-[100dvh] w-full flex overflow-hidden bg-[#f0f2f5] dark:bg-[#0c1317]">
        <Sidebar className="border-r border-border/50 shadow-xl bg-[#111b21] dark:bg-[#111b21] text-white">
           <SidebarHeader className="p-4 border-b border-white/5 flex items-center justify-center bg-[#202c33]">
             <Link to="/vendas">
               <Logo size="sm" />
             </Link>
           </SidebarHeader>
          <SidebarContent className="bg-[#111b21]">
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-wider text-white/40 font-bold">Navegação</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                    { id: 'contacts', label: 'Conversas', icon: MessageSquare },
                     { id: 'contact-list', label: 'Contatos', icon: Users },
                    { id: 'broadcast', label: 'Disparador', icon: Zap },
                    { id: 'scheduling', label: 'Agendamentos', icon: Calendar },
                    { id: 'flows', label: 'Fluxos', icon: GitBranch },
                    { id: 'templates', label: 'Templates', icon: FileText },
                    { id: 'ai-agent', label: 'Agente IA', icon: Bot },
                    
                    { id: 'help', label: 'Ajuda', icon: LucideIcons.HelpCircle },
                    { id: 'settings', label: 'Ajustes', icon: Settings },
                  ].map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        isActive={activeTab === item.id} 
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-none transition-all duration-300 relative group",
                          activeTab === item.id 
                            ? "bg-[#2a3942] text-[#00a884] shadow-inner" 
                            : "text-white/70 hover:bg-[#202c33] hover:text-white"
                        )}
                      >
                        {activeTab === item.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00a884] shadow-[0_0_10px_rgba(0,168,132,0.5)]" />
                        )}
                        <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === item.id ? "text-[#00a884]" : "text-white/50")} />
                        <span className="font-semibold text-sm">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-white/5 p-4 bg-[#111b21]">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/80 hover:bg-white/5 hover:text-white transition-colors mb-2"
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                setMyDataEmail(user?.email || '');
                setMyDataNewEmail(user?.email || '');
                setMyDataNewPassword('');
                setMyDataConfirmPassword('');
                setIsMyDataOpen(true);
              }}
            >
              <UserCog className="mr-2 h-4 w-4" /> Meus Dados
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors" 
               onClick={async () => { await supabase.auth.signOut(); navigate('/crm/login'); }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </SidebarFooter>
        </Sidebar>

        <Dialog open={isMyDataOpen} onOpenChange={setIsMyDataOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Meus Dados</DialogTitle>
              <DialogDescription>
                Veja e altere o email e a senha da sua conta no CRM.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Email atual</Label>
                <Input value={myDataEmail} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="my-data-new-email">Novo email (opcional)</Label>
                <Input
                  id="my-data-new-email"
                  type="email"
                  value={myDataNewEmail}
                  onChange={(e) => setMyDataNewEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="my-data-new-password">Nova senha (opcional)</Label>
                <div className="relative">
                  <Input
                    id="my-data-new-password"
                    type={myDataShowPassword ? 'text' : 'password'}
                    value={myDataNewPassword}
                    onChange={(e) => setMyDataNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setMyDataShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {myDataShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="my-data-confirm-password">Confirmar nova senha</Label>
                <Input
                  id="my-data-confirm-password"
                  type={myDataShowPassword ? 'text' : 'password'}
                  value={myDataConfirmPassword}
                  onChange={(e) => setMyDataConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMyDataOpen(false)} disabled={myDataSaving}>
                Cancelar
              </Button>
              <Button
                disabled={myDataSaving}
                onClick={async () => {
                  const updates: { email?: string; password?: string } = {};
                  const newEmail = myDataNewEmail.trim();
                  if (newEmail && newEmail !== myDataEmail) updates.email = newEmail;
                  if (myDataNewPassword) {
                    if (myDataNewPassword.length < 6) {
                      toast({ title: 'Senha muito curta', description: 'A senha precisa ter pelo menos 6 caracteres.', variant: 'destructive' });
                      return;
                    }
                    if (myDataNewPassword !== myDataConfirmPassword) {
                      toast({ title: 'Senhas não conferem', description: 'A confirmação da senha não bate.', variant: 'destructive' });
                      return;
                    }
                    updates.password = myDataNewPassword;
                  }
                  if (!updates.email && !updates.password) {
                    toast({ title: 'Nada para atualizar', description: 'Altere o email ou a senha para salvar.' });
                    return;
                  }
                  setMyDataSaving(true);
                  const { error } = await supabase.auth.updateUser(updates);
                  setMyDataSaving(false);
                  if (error) {
                    toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
                    return;
                  }
                  toast({
                    title: 'Dados atualizados',
                    description: updates.email
                      ? 'Confirme a alteração de email pelo link enviado para sua caixa de entrada.'
                      : 'Suas informações foram salvas com sucesso.',
                  });
                  setMyDataNewPassword('');
                  setMyDataConfirmPassword('');
                  setIsMyDataOpen(false);
                }}
              >
                {myDataSaving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SidebarInset className="flex flex-col flex-1 h-full overflow-hidden bg-[#f0f2f5] dark:bg-[#0c1317]">
          <header className="min-h-[64px] h-auto md:h-16 border-b border-border/50 flex flex-wrap items-center px-4 md:px-6 bg-[#f0f2f5] dark:bg-[#202c33] z-10 shrink-0 justify-between gap-2 py-2 shadow-sm">
            <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
              <SidebarTrigger className="hover:bg-muted shrink-0" />
              <div className="h-4 w-px bg-border/50 mx-1 hidden md:block" />
               <h1 className="font-bold text-xs md:text-base text-foreground tracking-tight truncate flex items-center gap-2">
                 {activeTab === 'contact-list' ? 'Contatos' : 
                  activeTab === 'contacts' ? 'Conversas' : 
                  activeTab === 'google-synced' ? 'Sincronizados Google' :
                  activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                 {userRole === 'super_admin' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2 h-7 px-2 text-[10px] border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                     onClick={() => navigate('/admincentral')}
                   >
                     <ShieldCheck className="w-3 h-3 mr-1" /> ADMIN CENTRAL
                   </Button>
                 )}
               </h1>
            </div>
            {activeTab === 'contacts' && (
              <div className="flex items-center gap-1.5 md:gap-3">
                <Button 
                  variant={activeFlowsView ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => { setActiveFlowsView(!activeFlowsView); setKanbanView(false); }} 
                  className={cn(
                    "font-black h-8 px-2 md:px-3 text-[9px] md:text-xs rounded-full transition-all active:scale-95 whitespace-nowrap", 
                    activeFlowsView 
                      ? "bg-[#00a884] text-white hover:bg-[#008f6f] shadow-md" 
                      : "bg-white dark:bg-[#111b21] hover:bg-muted"
                  )}
                >
                  <GitBranch className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  FLUXOS
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setKanbanView(!kanbanView); setActiveFlowsView(false); }} 
                  className="font-black h-8 px-2 md:px-3 text-[9px] md:text-xs rounded-full bg-white dark:bg-[#111b21] hover:bg-muted transition-all active:scale-95 shadow-sm whitespace-nowrap"
                >
                  {kanbanView ? <MessageSquare className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> : <BarChart3 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />}
                  {kanbanView ? 'LISTA' : 'KANBAN'}
                </Button>
              </div>
            )}
          </header>
          
          <main className="flex-1 overflow-hidden relative flex flex-col bg-[#f0f2f5] dark:bg-[#0c1317] h-full">
            <div className={cn("flex-1 h-full overflow-hidden", activeTab !== 'dashboard' && "hidden")}>
              {activeTab === 'dashboard' && (
              <ScrollArea className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Métricas Gerais</h2>
                    <p className="text-muted-foreground text-sm">Visão geral do desempenho da sua operação.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {[
                      { label: 'Mensagens Enviadas', value: metrics.sent_count, icon: Send, color: 'blue', type: 'sent' },
                      { label: 'Respondidas', value: metrics.responded_count, icon: MessageSquare, color: 'yellow', type: 'responded' },
                      { label: 'Contatos Qualificados', value: metrics.qualified_count, icon: CheckCircle2, color: 'purple', type: 'qualified' },
                      { label: 'Conversas 24h (Hoje)', value: conversationStats.activeWindow24h, icon: Clock, color: 'green', type: 'active_today' },
                    ].map((stat, i) => (
                      <Card 
                        key={i} 
                        className="relative overflow-hidden group hover:shadow-xl transition-all border-none bg-white dark:bg-[#111b21] cursor-pointer shadow-sm rounded-2xl"
                        onClick={() => {
                          if (stat.type === 'responded') setStatusFilter('responded');
                          else if (stat.type === 'qualified') setStatusFilter('qualified');
                          else if (stat.type === 'active_today') handleOpenMetricsList('active');
                          else setStatusFilter('all');
                          setActiveTab('contacts');
                        }}
                      >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardDescription className="font-bold text-[10px] md:text-xs uppercase tracking-wider">{stat.label}</CardDescription>
                          <stat.icon className={cn("w-4 h-4 md:w-5 md:h-5", {
                            "text-blue-500": stat.color === 'blue',
                            "text-yellow-500": stat.color === 'yellow',
                            "text-purple-500": stat.color === 'purple',
                            "text-green-500": stat.color === 'green',
                          })} />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl md:text-3xl font-black">{stat.value}</div>
                          <div className={cn("mt-2 h-1 w-full rounded-full overflow-hidden", {
                            "bg-blue-500/10": stat.color === 'blue',
                            "bg-yellow-500/10": stat.color === 'yellow',
                            "bg-purple-500/10": stat.color === 'purple',
                            "bg-green-500/10": stat.color === 'green',
                          })}>
                            <div className={cn("h-full transition-all duration-1000", {
                              "bg-blue-500": stat.color === 'blue',
                              "bg-yellow-500": stat.color === 'yellow',
                              "bg-purple-500": stat.color === 'purple',
                              "bg-green-500": stat.color === 'green',
                            })} style={{ width: '70%' }} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <Card 
                      className="relative overflow-hidden border-orange-200/50 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/60 to-transparent dark:from-orange-950/20 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleOpenMetricsList('paid')}
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                        <div className="min-w-0">
                          <CardDescription className="font-bold text-[10px] md:text-xs uppercase tracking-wider text-orange-700 dark:text-orange-400">
                            Conversas Pagas (Mês)
                          </CardDescription>
                          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize truncate">
                            R$ {CONVERSATION_COST.toFixed(2).replace('.', ',')} por conversa
                          </p>
                        </div>
                        <DollarSign className="w-5 h-5 text-orange-500 shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <div className="text-2xl md:text-3xl font-black text-orange-600 dark:text-orange-400">
                            R$ {(conversationStats.paidThisMonth * CONVERSATION_COST).toFixed(2).replace('.', ',')}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold border-orange-300 text-orange-700 dark:text-orange-400">
                            {conversationStats.paidThisMonth} conv.
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card 
                      className="relative overflow-hidden border-emerald-200/50 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/20 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => handleOpenMetricsList('active')}
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                        <div className="min-w-0">
                          <CardDescription className="font-bold text-[10px] md:text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Conversas Grátis (Janela 24h)
                          </CardDescription>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Janela aberta de resposta gratuita
                          </p>
                        </div>
                        <Clock className="w-5 h-5 text-emerald-500 shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                            {conversationStats.activeWindow24h}
                          </div>
                          <Badge variant="outline" className="text-[10px] font-bold border-emerald-300 text-emerald-700 dark:text-emerald-400">
                            ativas
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card 
                      className="relative overflow-hidden border-blue-200/50 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/60 to-transparent dark:from-blue-950/20 cursor-pointer hover:shadow-md transition-all"
                    >
                      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
                        <div className="min-w-0">
                          <CardDescription className="font-bold text-[10px] md:text-xs uppercase tracking-wider text-blue-700 dark:text-blue-400">
                            Resumo Semanal (7 dias)
                          </CardDescription>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Interações na última semana
                          </p>
                        </div>
                        <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1 cursor-pointer hover:bg-blue-500/5 p-2 rounded-lg transition-colors" onClick={() => handleOpenMetricsList('weekly_paid')}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Pagas</p>
                            <div className="text-xl font-black text-blue-600">
                              {conversationStats.paidThisWeek}
                            </div>
                          </div>
                          <div className="space-y-1 cursor-pointer hover:bg-blue-500/5 p-2 rounded-lg transition-colors" onClick={() => handleOpenMetricsList('weekly_active')}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Ativas</p>
                            <div className="text-xl font-black text-blue-600">
                              {conversationStats.activeThisWeek}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Histórico de Conversas Pagas
                      </CardTitle>
                      <CardDescription>Envios realizados nos últimos 7 dias</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 pb-0 pt-4">
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={metricsChartData}>
                            <defs>
                              <linearGradient id="colorPagos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="rgb(249, 115, 22)" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="rgb(249, 115, 22)" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorAtivos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10}}
                              dy={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{fontSize: 10}}
                            />
                            <RechartsTooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="pagos" 
                              name="Conversas Pagas"
                              stroke="rgb(249, 115, 22)" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorPagos)" 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="ativos" 
                              name="Janela Grátis"
                              stroke="rgb(16, 185, 129)" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorAtivos)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
              )}
            </div>

            {/* Conversas */}
            <div className={cn("flex-1 h-full overflow-hidden", activeTab !== 'contacts' && "hidden")}>
              {activeTab === 'contacts' && (
              <div className="flex-1 flex overflow-hidden h-full min-h-0">
                {activeFlowsView ? (
                  <div className="flex-1 overflow-y-auto p-4 bg-muted/5">
                    <div className="max-w-5xl mx-auto space-y-4">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight">Fluxos em Andamento</h2>
                          <p className="text-muted-foreground text-sm">Contatos que estão interagindo com automações agora.</p>
                        </div>
                        <Badge variant="outline" className="bg-[#00a884]/5 text-[#00a884] border-[#00a884]/20 font-black px-3 py-1">
                          {contacts.filter(c => c.flow_state && c.flow_state !== 'idle').length} ATIVOS
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {contacts.filter(c => c.flow_state && c.flow_state !== 'idle').length === 0 ? (
                          <div className="py-20 text-center bg-card rounded-2xl border-2 border-dashed border-muted">
                            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                            <h3 className="text-lg font-medium">Nenhum fluxo ativo no momento</h3>
                            <p className="text-sm text-muted-foreground">Novos fluxos aparecerão aqui conforme os gatilhos forem acionados.</p>
                          </div>
                        ) : (
                          contacts.filter(c => c.flow_state && c.flow_state !== 'idle').map(contact => {
                            const flow = flows.find(f => f.id === contact.current_flow_id);
                            return (
                              <Card key={contact.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow rounded-xl">
                                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                      <User className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-sm md:text-base truncate">{contact.name || contact.wa_id}</h4>
                                        <Badge className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-none">
                                          {flow?.name || 'Fluxo Desconhecido'}
                                        </Badge>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                          <div className={cn("w-1.5 h-1.5 rounded-full animate-ping", contact.flow_state === 'error' ? "bg-red-500" : "bg-green-500")} />
                                          <span className="capitalize font-medium">{contact.flow_state}</span>
                                        </div>
                                        {contact.next_execution_time && (
                                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary tabular-nums">
                                            <Clock className="w-3 h-3" />
                                            Próxima ação em: {(() => {
                                              const next = new Date(contact.next_execution_time).getTime();
                                              const diff = Math.max(0, Math.floor((next - now) / 1000));
                                              return diff > 0 ? `${Math.floor(diff / 60)}m ${diff % 60}s` : 'Processando...';
                                            })()}
                                          </div>
                                        )}
                                        {contact.last_flow_interaction && (
                                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <CalendarClock className="w-3 h-3" />
                                            Última interação: {new Date(contact.last_flow_interaction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-9 px-4 font-bold border-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/5 rounded-xl transition-all"
                                      onClick={() => {
                                        openChat(contact);
                                        setActiveFlowsView(false);
                                      }}
                                    >
                                      VER CONVERSA
                                    </Button>
                                    <Button 
                                      variant="destructive" 
                                      size="sm" 
                                      className="h-9 px-4 font-bold shadow-sm"
                                      onClick={() => handleCancelFlow(contact.id)}
                                    >
                                      <StopCircle className="w-4 h-4 mr-2" />
                                      PARAR FLUXO
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                ) : kanbanView ? (
                  <div className="flex-1 overflow-x-auto p-3 md:p-4 flex gap-3 md:gap-4 bg-muted/5 snap-x relative group/kanban">
                    <div className="absolute top-0 left-0 p-2 z-10 opacity-0 group-hover/kanban:opacity-100 transition-opacity">
                      <Button 
                        size="sm" 
                        className="rounded-full bg-primary shadow-lg h-8 w-8 p-0"
                        onClick={() => setIsNewStatusDialogOpen(true)}
                        title="Nova Etiqueta"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {kanbanStatuses.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-50">
                        <LucideIcons.Tag className="w-12 h-12 mb-4" />
                        <h3 className="text-lg font-bold">Nenhuma etiqueta configurada</h3>
                        <p className="text-sm">Clique no botão "+" no topo para criar sua primeira etapa do Kanban.</p>
                      </div>
                    ) : kanbanStatuses.filter(s => s.value !== 'human' && s.value !== 'new').map(status => (
                      <div 
                        key={status.value} 
                        className="w-72 md:w-80 shrink-0 flex flex-col bg-[#f0f2f5] dark:bg-[#111b21] rounded-2xl border-none shadow-md group/column transition-all hover:shadow-xl snap-center overflow-hidden" 
                        onDragOver={e => e.preventDefault()} 
                        onDrop={() => handleDrop(status.value)}
                      >
                        <div className={cn(
                          "p-4 border-b border-border/10 font-black uppercase text-[11px] flex justify-between items-center",
                          status.value === 'human' || status.color === 'orange' ? "bg-orange-500/10 text-orange-700" : "bg-[#202c33] text-[#e9edef]"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              status.color === 'blue' && 'bg-blue-500',
                              status.color === 'yellow' && 'bg-yellow-500',
                              status.color === 'purple' && 'bg-purple-500',
                              status.color === 'green' && 'bg-green-500',
                              status.color === 'red' && 'bg-red-500',
                              status.color === 'orange' && 'bg-orange-500',
                              status.color === 'indigo' && 'bg-indigo-500',
                              status.color === 'pink' && 'bg-pink-500'
                            )} />
                            {status.label}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-background/80 shadow-sm border font-black">{contacts.filter(c => c.status === status.value && c.last_interaction !== null).length}</Badge>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/column:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const sObj = kanbanStatuses.find(s => s.value === status.value);
                                  if (sObj) handleMoveStatus(sObj.id, 'up');
                                }}
                                className="hover:text-primary p-0.5"
                                title="Mover p/ Esquerda"
                              >
                                <LucideIcons.ChevronLeft className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const sObj = kanbanStatuses.find(s => s.value === status.value);
                                  if (sObj) handleMoveStatus(sObj.id, 'down');
                                }}
                                className="hover:text-primary p-0.5"
                                title="Mover p/ Direita"
                              >
                                <LucideIcons.ChevronRight className="w-3 h-3" />
                              </button>
                              {kanbanStatuses.some(s => s.id && s.value === status.value) && (
                                <>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const sObj = kanbanStatuses.find(s => s.value === status.value);
                                      if (sObj) {
                                        setEditingStatus(sObj);
                                        setIsEditStatusDialogOpen(true);
                                      }
                                    }}
                                    className="hover:text-primary p-0.5"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const sObj = kanbanStatuses.find(s => s.value === status.value);
                                      if (sObj) {
                                        if (confirm(`Remover etiqueta "${sObj.label}"?`)) {
                                          handleDeleteStatus(sObj.id);
                                        }
                                      }
                                    }}
                                    className="hover:text-red-500 p-0.5"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <ScrollArea className="flex-1 p-3">
                          {contacts.filter(c => c.status === status.value && c.last_interaction !== null).map(contact => (
                            <Card 
                              key={contact.id} 
                              draggable 
                              onDragStart={() => handleDragStart(contact)} 
                              className="p-4 mb-3 cursor-grab active:cursor-grabbing border-none bg-white dark:bg-[#202c33] shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg rounded-xl animate-in fade-in slide-in-from-top-2" 
                              onClick={() => { openChat(contact); setKanbanView(false); }}
                            >
                              <p className="text-sm font-bold truncate">{contact.name || contact.wa_id}</p>
                              <div className="flex justify-between items-center mt-3">
                                {contact.last_interaction && (
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                    <Clock className="w-3 h-3 opacity-50" />
                                    {new Date(contact.last_interaction).toLocaleDateString([], {day: '2-digit', month: '2-digit'})}
                                  </div>
                                )}
                                {contact.last_message_received_at && (Date.now() - new Date(contact.last_message_received_at).getTime()) < (24 * 60 * 60 * 1000) && (
                                  <Badge variant="outline" className="text-[9px] font-black bg-[#00a884]/10 text-[#00a884] border-none">
                                    <Zap className="w-2 h-2 mr-1" /> ATIVO
                                  </Badge>
                                )}
                              </div>
                            </Card>
                          ))}
                          {contacts.filter(c => c.status === status.value && c.last_interaction !== null).length === 0 && (
                            <div className="h-20 flex items-center justify-center border-2 border-dashed border-muted rounded-xl opacity-40">
                              <p className="text-[10px] font-bold uppercase tracking-widest">Vazio</p>
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      "w-full md:w-[280px] lg:w-[320px] xl:w-[360px] border-r border-border/40 flex flex-col bg-white dark:bg-[#111b21] h-full min-h-0 shrink-0 shadow-sm z-[5]",
                      selectedContact ? 'hidden md:flex' : 'flex'
                    )}>
                      <div className="p-4 border-b border-border/30 flex flex-col gap-3 bg-white dark:bg-[#111b21]">
                        <div className="space-y-3">
                          <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#00a884] transition-colors" />
                            <Input 
                              placeholder="Pesquisar ou começar uma nova conversa" 
                              className="bg-[#f0f2f5] dark:bg-[#202c33] border-none h-9 pl-10 rounded-lg text-sm focus-visible:ring-1 focus-visible:ring-[#00a884]"
                              onChange={e => setStatusFilter(e.target.value || 'all')} 
                            />
                          </div>
                        </div>
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="tags" className="border-none">
                            <AccordionTrigger className="py-2 hover:no-underline text-[10px] font-black uppercase tracking-wider text-muted-foreground flex gap-2">
                              <ListFilter className="w-3 h-3" />
                              Etiquetas
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="flex gap-1.5 pb-2 pt-1 overflow-x-auto scrollbar-hide py-1">
                                {['all', ...kanbanStatuses.filter(s => s.value !== 'human' && s.value !== 'new').map(s => s.value)].map(s => {
                                  const statusObj = kanbanStatuses.find(status => status.value === s);
                                  const label = s === 'all' ? '🚀 Todos' : (statusObj ? statusObj.label : s.toUpperCase());
                                  
                                  return (
                                    <Badge 
                                      key={s} 
                                      variant={statusFilter === s ? 'default' : 'outline'} 
                                      style={{ 
                                        height: `${18 * ((metaSettings.tag_size || 100) / 100)}px`, 
                                        fontSize: `${9 * ((metaSettings.tag_size || 100) / 100)}px`,
                                        backgroundColor: statusFilter === s ? '#00a884' : undefined,
                                        borderColor: statusFilter === s ? '#00a884' : undefined
                                      }}
                                      className={cn(
                                        "cursor-pointer capitalize whitespace-nowrap px-3 font-bold transition-all rounded-full shrink-0",
                                        statusFilter === s ? "text-white shadow-md scale-105" : "hover:bg-muted"
                                      )}
                                      onClick={() => setStatusFilter(s)}
                                    >
                                      {label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                      <ScrollArea className="flex-1 min-h-0 bg-white dark:bg-[#111b21]">
                        {filteredContacts.length > 0 ? (
                          filteredContacts.map(contact => (
                            <button 
                              key={contact.id} 
                              onClick={() => openChat(contact)} 
                              className={cn(
                                "w-full p-4 text-left border-b transition-all flex flex-col gap-1 relative",
                                selectedContact?.id === contact.id ? "bg-[#f0f2f5] dark:bg-[#2a3942] border-l-4 border-l-[#00a884]" : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] border-l-4 border-l-transparent"
                              )}
                            >
                              <div className="flex items-center w-full gap-2 min-w-0">
                                <div className="flex flex-1 min-w-0 items-center gap-2 overflow-hidden">
                                  {contact.last_interaction && (!contact.last_read_at || new Date(contact.last_interaction) > new Date(contact.last_read_at)) && (
                                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-[#EAB308] shadow-[0_0_10px_rgba(234,179,8,0.3)] animate-in fade-in zoom-in duration-300 shrink-0" title="Nova mensagem">
                                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shrink-0" />
                                      <span className="text-[9px] font-black text-white uppercase tracking-tighter">Nova</span>
                                    </div>
                                  )}
                                  <p className={cn(
                                    "font-bold truncate text-sm flex items-center gap-1.5 min-w-0",
                                    contact.last_interaction && (!contact.last_read_at || new Date(contact.last_interaction) > new Date(contact.last_read_at)) ? "text-foreground" : "text-foreground/80"
                                  )}>
                                    <span className="truncate shrink grow min-w-0">{contact.name || contact.wa_id}</span>
                                    {contact.google_sync_account_id && (
                                      <span className="w-3.5 h-3.5 bg-[#4285F4] rounded-full flex items-center justify-center shrink-0">
                                         <span className="text-[6px] font-bold text-white">G</span>
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                  {contact.ai_active && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateContactStatus(contact.id, { ai_active: false });
                                      }}
                                      className="p-1 hover:bg-blue-50 rounded-full transition-colors group"
                                      title="Desativar Agente IA"
                                    >
                                      <Bot className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                                    </button>
                                  )}
                                  <span className={cn(
                                    "text-[10px] whitespace-nowrap opacity-70",
                                    contact.last_message_received_at && (Date.now() - new Date(contact.last_message_received_at).getTime()) < (24 * 60 * 60 * 1000) ? "text-[#25D366] font-bold opacity-100" : "text-muted-foreground"
                                  )}>
                                    {contact.last_interaction ? new Date(contact.last_interaction).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 mt-1 w-full min-w-0 pr-1">
                                <div className="flex flex-wrap items-center justify-between gap-1 w-full min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap min-w-0">
                                    <Badge 
                                      variant="outline" 
                                      style={{ height: `${16 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.tag_size || 100) / 100)}px` }}
                                      className={cn(
                                        "px-2 capitalize font-black shadow-sm shrink-0", 
                                        getStatusColor(contact.status),
                                        contact.last_interaction && (!contact.last_read_at || new Date(contact.last_interaction) > new Date(contact.last_read_at)) && "ring-2 ring-[#25D366]/20"
                                      )}
                                    >
                                      {statusFilter === 'all' && (contact.status === 'human' || contact.status === 'new') ? 'Atendimento' : getStatusLabel(contact.status)}
                                    </Badge>
                                    
                                    {contact.last_message_received_at && (() => {
                                      const elapsed = Date.now() - new Date(contact.last_message_received_at).getTime();
                                      const DAY = 24 * 60 * 60 * 1000;
                                      if (elapsed >= DAY) return null;
                                      const remainingMs = DAY - elapsed;
                                      const h = Math.floor(remainingMs / (60 * 60 * 1000));
                                      const m = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
                                      return (
                                        <Badge variant="outline" className="text-[8px] font-black bg-[#00a884]/10 text-[#00a884] border-none px-1.5 h-4 tabular-nums flex items-center gap-1 shrink-0">
                                          <Clock className="w-2.5 h-2.5" />
                                          <span>{h}h{m.toString().padStart(2,'0')}m</span>
                                        </Badge>
                                      );
                                    })()}
                                    
                                    {contact.flow_state && contact.flow_state !== 'idle' && (!contact.last_message_received_at || (Date.now() - new Date(contact.last_message_received_at).getTime()) < (24 * 60 * 60 * 1000)) && (
                                      <div className="flex items-center gap-1 min-w-0">
                                        <Badge 
                                          variant="secondary" 
                                          style={{ height: `${14 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${8 * ((metaSettings.tag_size || 100) / 100)}px` }}
                                          className={cn(
                                            "px-1.5 capitalize font-black shrink-0 border-none truncate max-w-[100px]",
                                            contact.flow_state === 'error' ? "bg-red-600 text-white" : 
                                            contact.flow_state === 'waiting_response' ? "bg-amber-500 text-white" :
                                            "bg-red-500 text-white"
                                          )}
                                        >
                                          <span className="truncate">
                                            {contact.flow_state === 'error' ? 'Erro' : 
                                             contact.flow_state === 'waiting_response' ? 'Aguardando' : 'Fluxo'}
                                            {contact.current_step_name && <span className="ml-1 text-white/90">({contact.current_step_name})</span>}
                                          </span>
                                        </Badge>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          {(contact.flow_state === 'error' || contact.flow_state === 'waiting_response') && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleResumeFlow(contact.id);
                                              }}
                                              className="text-green-500 hover:text-green-700 p-0.5 rounded-full hover:bg-green-50"
                                              title="Retomar Fluxo"
                                            >
                                              <PlayCircle className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCancelFlow(contact.id);
                                            }}
                                            className="text-red-400 hover:text-red-600 p-0.5 rounded-full hover:bg-red-50"
                                            title="Parar Fluxo"
                                          >
                                            <XCircle className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                 {(contact.next_execution_time || contact.flow_state === 'waiting_response' || (contact.ai_active && contact.flow_state === 'ai_handling')) && (!contact.last_message_received_at || (Date.now() - new Date(contact.last_message_received_at).getTime()) < (24 * 60 * 60 * 1000)) && (
                                   <div className={cn(
                                     "flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-sm tabular-nums whitespace-nowrap overflow-hidden shadow-sm",
                                     contact.ai_active ? "hidden" : "bg-red-600 text-white"
                                   )}>
                                     {contact.ai_active ? null : <Clock className="w-2.5 h-2.5" />}
                                     {(() => {
                                       if (contact.ai_active && contact.flow_state === 'ai_handling') {
                                         return null;
                                       }
                                       if (contact.flow_state === 'waiting_response') {
                                         const timeoutMinutes = contact.flow_timeout_minutes || 20;
                                         const lastInteraction = new Date(contact.last_flow_interaction || Date.now()).getTime();
                                         const timeoutThreshold = lastInteraction + (timeoutMinutes * 60 * 1000);
                                         const remainingSeconds = Math.max(0, Math.floor((timeoutThreshold - now) / 1000));
                                        return `Exp: ${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`;
                                      }
                                      const next = new Date(contact.next_execution_time).getTime();
                                      const diff = Math.max(0, Math.floor((next - now) / 1000));
                                      return diff > 0 ? `${Math.floor(diff / 60)}m ${diff % 60}s` : 'Próximo...';
                                    })()}
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-8 text-center text-muted-foreground text-sm italic">
                            Nenhum contato encontrado
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                    
                    <div className={cn(
                      "flex-1 flex flex-col min-h-0 min-w-0 w-full relative overflow-hidden",
                      !selectedContact ? 'hidden md:flex items-center justify-center bg-muted/5' : 'flex'
                    )}>
                      {selectedContact ? (
                        <>
                          <div className="p-1 sm:p-2 border-b border-border/40 flex flex-col gap-1 bg-[#f0f2f5] dark:bg-[#202c33] z-10 shrink-0 w-full min-w-0 shadow-sm relative">
                            {selectedContact.ai_active && metaSettings.ai_agent_enabled && (
                              <div className="bg-violet-600 text-white px-3 py-1.5 flex items-center justify-between shadow-md z-[20] animate-in slide-in-from-top-2 rounded-lg mb-1 mx-1">
                                <div className="flex items-center gap-2">
                                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Atendente I.A no Controle</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-[9px] font-black uppercase text-white hover:bg-white/20 gap-1 border border-white/30"
                                  onClick={() => updateContactStatus(selectedContact.id, { ai_active: false })}
                                >
                                  <StopCircle className="w-3 h-3" /> Parar Robô (Assumir Manual)
                                </Button>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-1 sm:gap-2 w-full min-w-0">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Button variant="ghost" size="icon" className="md:hidden shrink-0 h-8 w-8 hover:bg-muted" onClick={() => setSelectedContact(null)}>
                                  <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#dfe5e7] dark:bg-[#6a7175] flex items-center justify-center shrink-0 border border-border/10">
                                  <User className="w-4 h-4 md:w-6 md:h-6 text-white" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="font-bold text-sm md:text-base hover:text-primary cursor-pointer truncate" onClick={() => openContactInfo(selectedContact)}>
                                      {selectedContact.name || selectedContact.wa_id}
                                    </p>
                                    {selectedContact.google_sync_account_id && (
                                      <span className="w-3 h-3 bg-[#4285F4] rounded-full flex items-center justify-center shrink-0">
                                         <span className="text-[5px] font-bold text-white">G</span>
                                      </span>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "h-6 w-6 rounded-full transition-all shrink-0",
                                        selectedContact.ai_active && metaSettings.ai_agent_enabled ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20" : "text-muted-foreground bg-muted hover:bg-muted/80 grayscale"
                                      )}
                                      onClick={async () => {
                                        const newStatus = !selectedContact.ai_active;
                                        await updateContactStatus(selectedContact.id, { ai_active: newStatus });
                                      }}
                                      title={selectedContact.ai_active ? "Desativar Agente IA" : "Ativar Agente IA"}
                                    >
                                      <Bot className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                  {selectedContact.last_message_received_at && (
                                    <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 px-1 sm:px-1.5 py-0.5 rounded border border-border/10 shadow-sm shrink-0">
                                      <Clock className={cn("w-2.5 h-2.5", getWindowInfo(selectedContact.last_message_received_at)?.isExpired ? 'text-destructive animate-pulse' : 'text-[#00a884]')} />
                                      <span className={cn("text-[8px] font-bold tabular-nums", getWindowInfo(selectedContact.last_message_received_at)?.isExpired ? 'text-destructive' : 'text-[#00a884]')}>
                                        {getWindowInfo(selectedContact.last_message_received_at)?.label}
                                      </span>
                                    </div>
                                  )}
                                  {(countdown !== null && countdown > 0 || selectedContact.flow_state === 'waiting_response') && (!selectedContact.last_message_received_at || (Date.now() - new Date(selectedContact.last_message_received_at).getTime()) < (24 * 60 * 60 * 1000)) && (
                                    <div className="text-[8px] font-black bg-red-600 text-white tabular-nums whitespace-nowrap px-1.5 py-0.5 rounded-sm shrink-0 shadow-sm flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {(() => {
                                        if (selectedContact.flow_state === 'waiting_response') {
                                          const timeoutMinutes = selectedContact.flow_timeout_minutes || 20;
                                          const lastInteraction = new Date(selectedContact.last_flow_interaction || Date.now()).getTime();
                                          const timeoutThreshold = lastInteraction + (timeoutMinutes * 60 * 1000);
                                          const remainingSeconds = Math.max(0, Math.floor((timeoutThreshold - now) / 1000));
                                          return `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`;
                                        }
                                        return `${Math.floor(countdown! / 60)}m ${countdown! % 60}s`;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {((selectedContact.flow_state && selectedContact.flow_state !== 'idle') || (selectedContact.ai_active && metaSettings.ai_agent_enabled)) && (!selectedContact.last_message_received_at || (Date.now() - new Date(selectedContact.last_message_received_at).getTime()) < (24 * 60 * 60 * 1000)) && (
                              <div className={cn(
                                "flex items-center justify-between gap-2 px-2 py-1 rounded-lg border",
                                selectedContact.ai_active ? "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" : "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30"
                              )}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0", 
                                    selectedContact.ai_active ? "bg-blue-500" : "bg-red-500",
                                    selectedContact.flow_state === 'error' ? "animate-pulse" : "animate-ping"
                                  )} />
                                  <span className={cn(
                                    "text-[10px] font-bold truncate",
                                    selectedContact.ai_active ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                                  )}>
                                    {selectedContact.ai_active ? 'Agente IA Ativado' : (selectedContact.flow_state === 'error' ? 'Erro no Fluxo' : 'Fluxo Ativo')}
                                    {selectedContact.current_step_name && <span className="ml-1 opacity-70">({selectedContact.current_step_name})</span>}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {selectedContact.ai_active ? (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30" 
                                      onClick={async (e) => { 
                                        e.stopPropagation(); 
                                        await updateContactStatus(selectedContact.id, { ai_active: false }); 
                                      }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <>
                                      {(selectedContact.flow_state === 'error' || selectedContact.flow_state === 'waiting_response') && (
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30" onClick={(e) => { e.stopPropagation(); handleResumeFlow(selectedContact.id); }}><PlayCircle className="h-4 w-4" /></Button>
                                      )}
                                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={(e) => { e.stopPropagation(); handleCancelFlow(selectedContact.id); }}><XCircle className="h-4 w-4" /></Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1.5 w-full pt-1 border-t border-border/5 overflow-x-auto scrollbar-hide pb-0.5">
                              {kanbanStatuses.filter(s => s.is_starred).map(status => (
                                <Button 
                                  key={status.id}
                                  size="sm" 
                                  variant="outline" 
                                  className={cn("h-6 px-2 text-[9px] font-bold border-zinc-200 hover:bg-zinc-50 transition-all shadow-sm rounded-lg whitespace-nowrap")}
                                  onClick={() => updateContactStatus(selectedContact.id, { status: status.value })}
                                >
                                  {status.label}
                                </Button>
                              ))}
                              <Select onValueChange={(val) => updateContactStatus(selectedContact.id, { status: val })}>
                                <SelectTrigger className="w-fit h-6 text-[9px] font-bold border-zinc-200 bg-zinc-50/50 rounded-lg px-2 shrink-0">
                                  <SelectValue placeholder="Etiqueta" />
                                </SelectTrigger>
                                <SelectContent>
                                  {kanbanStatuses.map(s => (
                                    <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className={cn(
                            "bg-muted/5 border-b px-2 py-1 flex flex-col gap-1 z-[5] backdrop-blur-md overflow-hidden transition-all duration-300 shrink-0",
                            !showTemplates && !showFlows && "h-0 py-0 border-b-0"
                          )}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <button 
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="text-[9px] font-black uppercase text-muted-foreground/70 shrink-0 flex items-center gap-1 bg-muted/30 px-1.2 py-0.5 rounded-sm border border-border/20 hover:bg-muted/50 transition-colors group"
                              >
                                <FileText className="w-2.5 h-2.5 text-emerald-500" /> 
                                <span className="hidden sm:inline">Modelos</span>
                                {showTemplates ? <Eye className="w-2 h-2 ml-0.5 opacity-40 group-hover:opacity-100" /> : <EyeOff className="w-2 h-2 ml-0.5 opacity-100 text-emerald-500" />}
                              </button>
                              
                              {showTemplates && (
                                <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-hide animate-in fade-in slide-in-from-left-2 duration-200 py-0.5">
                                  {templates.slice(0, 15).map(t => (
                                    <Button 
                                      key={t.id} 
                                      variant="outline" 
                                      size="sm" 
                                      style={{ height: `${20 * ((metaSettings.shortcut_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.shortcut_size || 100) / 100)}px` }}
                                      className="px-2 rounded-md border-emerald-500/20 bg-emerald-500/5 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all font-bold whitespace-nowrap shadow-none shrink-0" 
                                      onClick={() => handleSendTemplate(t.name, t.language || 'pt_BR')} 
                                      disabled={isSending(selectedContact?.id)}
                                    >
                                      {t.name}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className={cn(
                              "flex items-center gap-1.5 min-w-0 pt-1 border-t border-border/5",
                              !showFlows && !showTemplates && "pt-0 border-t-0"
                            )}>
                              <button 
                                onClick={() => setShowFlows(!showFlows)}
                                className="text-[9px] font-black uppercase text-muted-foreground/70 shrink-0 flex items-center gap-1 bg-muted/30 px-1.2 py-0.5 rounded-sm border border-border/20 hover:bg-muted/50 transition-colors group"
                              >
                                <Zap className="w-2.5 h-2.5 text-blue-500" /> 
                                <span className="hidden sm:inline">Fluxos</span>
                                {showFlows ? <Eye className="w-2 h-2 ml-0.5 opacity-40 group-hover:opacity-100" /> : <EyeOff className="w-2 h-2 ml-0.5 opacity-100 text-blue-500" />}
                              </button>
                              
                              {showFlows && (
                                <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-hide animate-in fade-in slide-in-from-left-2 duration-200 py-0.5">
                                  {flows.filter(f => f.is_active).map(f => (
                                    <Button 
                                      key={f.id} 
                                      variant="outline" 
                                      size="sm" 
                                      style={{ height: `${20 * ((metaSettings.shortcut_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.shortcut_size || 100) / 100)}px` }}
                                      className="px-2 rounded-md border-blue-500/20 bg-blue-500/5 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all font-bold whitespace-nowrap shadow-none shrink-0" 
                                      onClick={() => handleTriggerFlow(f.id)} 
                                      disabled={isSending(selectedContact?.id)}
                                    >
                                      {f.name}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <ScrollArea className="flex-1 bg-[#efeae2] dark:bg-[#0b141a] relative min-h-0 min-w-0 w-full overflow-x-hidden">
                            <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.05] pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat"></div>
                            {chatMessages.some((m: any) => m.direction === 'outbound' && m.status === 'failed' && isBusinessVerificationError(m)) && (
                              <div className="sticky top-0 z-40 m-2">
                                {bizWarnExpanded ? (
                                  <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 p-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                          Não estamos conseguindo enviar mensagens — apenas receber
                                        </p>
                                        <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-1 leading-snug">
                                          A Meta bloqueou o envio deste número. Geralmente isso acontece quando o seu Negócio (Business Manager) ainda não foi verificado, está bloqueado ou tem pendências. Verifique no Meta Business Suite o que aconteceu com seu número, corrija e volte aqui para tentar novamente. Algo precisa estar OK no lado da Meta.
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-amber-500/50 bg-white hover:bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/60"
                                            onClick={() => window.open('https://business.facebook.com/', '_blank', 'noopener,noreferrer')}
                                          >
                                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                            Abrir Meta Business
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                                            onClick={() => setBizWarnExpanded(false)}
                                          >
                                            Minimizar
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setBizWarnExpanded(true)}
                                    title="Não estamos conseguindo enviar mensagens — clique para ver detalhes"
                                    aria-label="Aviso: não estamos conseguindo enviar mensagens"
                                    className="flex items-center justify-center w-8 h-8 rounded-full border border-amber-500/50 bg-amber-50 dark:bg-amber-950/60 shadow-md hover:bg-amber-100 dark:hover:bg-amber-900/70 transition-colors animate-pulse"
                                  >
                                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {loadingChat && (
                              <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#efeae2]/80 dark:bg-[#0b141a]/80 backdrop-blur-sm animate-in fade-in duration-300">
                                <div className="flex flex-col items-center gap-4">
                                  <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-[#00a884]/20 border-t-[#00a884] animate-spin" />
                                    <MessageSquare className="absolute inset-0 m-auto w-6 h-6 text-[#00a884] animate-pulse" />
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <p className="text-[#00a884] font-black text-sm uppercase tracking-widest animate-pulse">Carregando conversas</p>
                                    <div className="flex gap-1 mt-1">
                                      <div className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce [animation-delay:-0.3s]" />
                                      <div className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce [animation-delay:-0.15s]" />
                                      <div className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce" />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="p-2 sm:p-4 md:p-6 space-y-3 max-w-5xl mx-auto relative z-[1] min-w-0 w-full">
                              {scheduledMessages.length > 0 && (
                                <div className="space-y-2 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                  <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                      <CalendarClock className="w-3 h-3 text-primary" />
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mensagens Agendadas</span>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-6 text-[9px] font-bold gap-1 text-primary hover:bg-primary/5"
                                      onClick={() => {
                                        setScheduleDate('');
                                        setScheduleDateObj(undefined);
                                        setScheduleTime('');
                                        setSelectedContactsForScheduling([selectedContact.id]);
                                        setContactListText('');
                                        setIsSchedulingOpen(true);
                                      }}
                                    >
                                      <Plus className="w-2.5 h-2.5" /> Novo Agendamento
                                    </Button>
                                  </div>
                                  {scheduledMessages.map((msg) => (
                                    <div key={msg.id} className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between items-center shadow-sm backdrop-blur-sm">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <Badge variant="outline" className="text-[9px] h-4 bg-primary/10 text-primary border-primary/20 font-bold">
                                            {msg.message_data?.action === 'sendMessage' ? 'Mensagem' : 
                                             msg.message_data?.action === 'sendTemplate' ? 'Template' : 'Fluxo'}
                                          </Badge>
                                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(msg.scheduled_for).toLocaleString()}
                                          </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate italic">
                                          {msg.message_data?.text || msg.message_data?.templateName || msg.message_data?.flowId || 'Agendamento'}
                                        </p>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={async () => {
                                          if (confirm('Deseja cancelar este agendamento?')) {
                                            await supabase.from('crm_scheduled_messages').delete().eq('id', msg.id);
                                            fetchScheduledMessages(selectedContact.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {mediaUploadProgress[selectedContact.id] && (
                                <div className="p-3 mb-2 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Zap className="w-3.5 h-3.5 text-primary animate-pulse" />
                                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Convertendo e Enviando...</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-primary">{mediaUploadProgress[selectedContact.id]}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary transition-all duration-300" 
                                      style={{ width: `${mediaUploadProgress[selectedContact.id]}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {[...chatMessages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((m, idx) => {
                                const isTemplate = m.message_type === 'template' || (m.message_type !== 'carousel' && m.content?.includes('[Template:'));
                                const templateName = m.content?.match(/\[Template: (.*?)\]/)?.[1];
                                let template = isTemplate ? templates.find(t => t.name === templateName) : null;

                                if (isTemplate && !template && m.content) {
                                  template = templates.find(t => {
                                    const bodyComponent = t.components?.find((c: any) => c.type === 'BODY');
                                    const bodyText = bodyComponent?.text;
                                    if (!bodyText) return false;
                                    
                                    const cleanContent = m.content.replace(/\[Template: .*?\]\s*/, '').trim();
                                    const normalizedBody = bodyText.replace(/\{\{\d+\}\}/g, '').trim();
                                    
                                    return cleanContent.includes(normalizedBody.substring(0, 30)) || 
                                           bodyText.includes(cleanContent.substring(0, 30));
                                  });
                                }


                                
                                return (
                                  <div key={m.id || idx} className={cn(
                                    "flex w-full mb-1 min-w-0",
                                    m.direction === 'inbound' ? 'justify-start' : 'justify-end'
                                  )}>
                                    <div className={cn(
                                      "p-2 md:p-2.5 rounded-xl max-w-[88%] sm:max-w-[80%] md:max-w-[75%] min-w-0 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative transition-all duration-300",
                                      m.direction === 'inbound' 
                                        ? 'bg-white dark:bg-[#202c33] text-foreground rounded-tl-none border-l-[3px] border-l-transparent' 
                                        : 'bg-[#dcf8c6] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none border-r-[3px] border-r-transparent',
                                      m.isOptimistic && 'opacity-70 grayscale-[0.5]'
                                    )}>
                                      {isTemplate && template ? (
                                        <div className="overflow-hidden rounded-xl bg-white dark:bg-zinc-900 shadow-lg border border-border/50 max-w-[300px]">
                                          {template.components?.find((c: any) => c.type === 'HEADER')?.format !== 'NONE' && (
                                            <div className="max-h-[150px] aspect-video bg-muted/20 flex items-center justify-center relative overflow-hidden border-b border-border/10">
                                              {(() => {
                                                const header = template.components.find((c: any) => c.type === 'HEADER');
                                                let mediaUrl = m.media_url || header?.example?.header_handle?.[0];
                                                
                                                const isNumericId = mediaUrl && /^\d+$/.test(mediaUrl.toString());
                                                
                                                if (header?.format === 'IMAGE' && mediaUrl && !isNumericId) {
                                                  return <img src={mediaUrl} alt="Header" className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewMedia({ url: mediaUrl, type: 'image' })} />;
                                                } else if (header?.format === 'VIDEO' && mediaUrl) {
                                                  return (
                                                    <div className="w-full h-full relative cursor-pointer" onClick={() => setPreviewMedia({ url: mediaUrl, type: 'video' })}>
                                                      <video src={mediaUrl} className="w-full h-full object-cover" />
                                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                        <Play className="w-8 h-8 text-white" />
                                                      </div>
                                                    </div>
                                                  );
                                                } else if (header?.format === 'TEXT') {
                                                  return <div className="p-3 font-bold text-sm text-foreground w-full">{header.text}</div>;
                                                }
                                                return <div className="text-[10px] text-muted-foreground flex flex-col items-center gap-1"><ImageIcon className="w-5 h-5 opacity-20" /> Sem mídia</div>;
                                              })()}
                                            </div>
                                          )}
                                          <div className="p-3 space-y-2">
                                            <div className="text-[13px] md:text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                                              {m.content?.includes('[Template:') 
                                                ? m.content.replace(/\[Template: .*?\]\s*/, '') 
                                                : (template?.components?.find((c: any) => c.type === 'BODY')?.text || m.content)}
                                            </div>

                                            {template.components?.find((c: any) => c.type === 'FOOTER') && (
                                              <div className="text-[10px] opacity-60 uppercase font-medium">
                                                {template.components.find((c: any) => c.type === 'FOOTER').text}
                                              </div>
                                            )}
                                          </div>
                                          {template.components?.find((c: any) => c.type === 'BUTTONS')?.buttons?.map((btn: any, bIdx: number) => (
                                            <div key={bIdx} className="flex items-center justify-center p-2 border-t border-border/30 text-blue-500 text-xs font-bold hover:bg-muted/5 transition-colors cursor-default">
                                              {btn.text}
                                            </div>
                                          ))}
                                        </div>
                                      ) : m.message_type === 'carousel' && m.metadata?.carousel ? (
                                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                                          {m.metadata.carousel.cards.map((card: any, cIdx: number) => (
                                            <div key={cIdx} className="overflow-hidden rounded-xl bg-white dark:bg-zinc-900 shadow-md border border-border/40 w-[240px] shrink-0">
                                              {card.header && (card.header.format === 'IMAGE' || card.header.format === 'VIDEO') && (
                                                <div className="h-[135px] bg-muted/20 flex items-center justify-center relative overflow-hidden border-b border-border/10">
                                                  {(() => {
                                                    const mediaUrl = card.header.media_url || card.header.example?.header_handle?.[0] || card.header.image?.link || card.header.video?.link;
                                                    if (card.header.format === 'IMAGE' && mediaUrl) {
                                                      return <img src={mediaUrl} alt="Card" className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewMedia({ url: mediaUrl, type: 'image' })} />;
                                                    } else if (card.header.format === 'VIDEO' && mediaUrl) {
                                                      return (
                                                        <div className="w-full h-full relative cursor-pointer" onClick={() => setPreviewMedia({ url: mediaUrl, type: 'video' })}>
                                                          <video src={mediaUrl} className="w-full h-full object-cover" />
                                                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <Play className="w-6 h-6 text-white" />
                                                          </div>
                                                        </div>
                                                      );
                                                    }
                                                    return null;
                                                  })()}
                                                </div>
                                              )}
                                              <div className="p-3 space-y-1.5">
                                                {card.body?.text && (
                                                  <div className="text-[12px] leading-relaxed text-zinc-800 dark:text-zinc-200 line-clamp-3">
                                                    {card.body.text}
                                                  </div>
                                                )}
                                              </div>
                                              {card.buttons?.buttons?.map((btn: any, bIdx: number) => (
                                                <div key={bIdx} className="flex items-center justify-center p-2 border-t border-border/30 text-blue-500 text-[10px] font-bold">
                                                  {btn.text}
                                                </div>
                                              ))}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <>
                                          {m.message_type === 'image' && m.media_url && !/^\d+$/.test(m.media_url.toString()) && (
                                            <div className="mb-2 overflow-hidden rounded-lg border border-border/20 shadow-sm bg-muted/20 max-w-fit">
                                              <img 
                                                src={m.media_url} 
                                                alt="Mídia" 
                                                className="max-h-[180px] w-auto object-cover cursor-zoom-in transition-transform hover:scale-[1.02] duration-300" 
                                                onClick={() => setPreviewMedia({ url: m.media_url, type: 'image' })} 
                                              />
                                            </div>
                                          )}
                                          {m.message_type === 'sticker' && m.media_url && (
                                            <div className="mb-2 max-w-[150px]">
                                              <img 
                                                src={m.media_url} 
                                                alt="Sticker" 
                                                className="w-full h-auto cursor-zoom-in" 
                                                onClick={() => setPreviewMedia({ url: m.media_url, type: 'image' })}
                                              />
                                            </div>
                                          )}
                                          {m.message_type === 'image' && m.media_url && /^\d+$/.test(m.media_url.toString()) && (
                                            <div className="mb-2 p-4 rounded-lg border border-dashed border-border flex flex-col items-center justify-center bg-muted/5">
                                              <ImageIcon className="w-8 h-8 text-muted-foreground opacity-20 mb-2" />
                                              <span className="text-[10px] text-muted-foreground">ID de Mídia Meta: {m.media_url}</span>
                                            </div>
                                          )}
                                          {m.message_type === 'video' && m.media_url && (
                                            <div 
                                              className="mb-2 overflow-hidden rounded-lg border border-border/20 shadow-sm bg-muted/20 relative group cursor-pointer max-w-fit"
                                              onClick={() => setPreviewMedia({ url: m.media_url, type: 'video' })}
                                            >
                                              <video src={m.media_url} className="max-h-[180px] w-auto object-cover rounded-lg shadow-inner" />
                                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                <Play className="w-10 h-10 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                              </div>
                                            </div>
                                          )}
                                           {(m.message_type === 'audio' || m.message_type === 'voice') && m.media_url && (
                                             <div className="mb-1 p-2 rounded-xl bg-[#00a884]/10 dark:bg-[#00a884]/20 border border-[#00a884]/20 w-[min(280px,calc(100vw-100px))] sm:w-[280px] max-w-full">
                                               <audio
                                                 src={m.media_url}
                                                 controls
                                                 preload="metadata"
                                                 controlsList="nodownload"
                                                 className="block w-full h-10 rounded-lg filter dark:invert-[0.1]"
                                               />
                                              {m.direction === 'outbound' && m.status === 'failed' && !m.meta_message_id && (
                                                <div className="mt-2 flex items-center justify-between gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                                                  <div className="flex items-center gap-1.5 text-[10px] text-red-500 dark:text-red-300 font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Não enviado
                                                  </div>
                                                  <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-6 px-2 text-[10px] gap-1"
                                                    disabled={resendingAudioIds.has(m.id)}
                                                    onClick={() => handleResendAudio(m)}
                                                  >
                                                    <RotateCw className={cn("w-3 h-3", resendingAudioIds.has(m.id) && "animate-spin")} />
                                                    {resendingAudioIds.has(m.id) ? 'Reenviando...' : 'Reenviar'}
                                                  </Button>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {m.message_type === 'document' && m.media_url && (
                                            <div 
                                              onClick={() => window.open(m.media_url, '_blank')}
                                              className="mb-2 p-3 rounded-xl bg-muted/20 border border-border/20 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                                            >
                                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-primary" />
                                              </div>
                                              <div className="flex-1 overflow-hidden">
                                                <div className="text-[13px] font-medium truncate">Documento</div>
                                                <div className="text-[10px] opacity-60">Clique para abrir</div>
                                              </div>
                                            </div>
                                          )}
                                          {m.message_type === 'location' && (
                                            <div className="mb-2 p-3 rounded-xl bg-muted/20 border border-border/20 flex flex-col gap-2">
                                              <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-bold">Localização Recebida</span>
                                              </div>
                                              <div className="text-[10px] opacity-60 truncate">{m.content}</div>
                                              <Button 
                                                variant="secondary" 
                                                size="sm" 
                                                className="w-full text-[10px] h-7"
                                                onClick={() => {
                                                  const lat = m.metadata?.location?.latitude || m.content?.match(/Lat: (.*?),/)?.[1];
                                                  const lng = m.metadata?.location?.longitude || m.content?.match(/Long: (.*?)(\s|$)/)?.[1];
                                                  if (lat && lng) window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                                }}
                                              >
                                                Ver no Google Maps
                                              </Button>
                                            </div>
                                          )}
                                          {m.message_type === 'reaction' && (
                                            <div className="absolute -bottom-3 right-0 bg-zinc-800 border border-white/10 rounded-full px-1.5 py-0.5 text-xs shadow-md z-10">
                                              {m.content?.replace('[Reação] ', '')}
                                            </div>
                                          )}
                                          {m.message_type === 'contacts' && (
                                            <div className="mb-2 p-3 rounded-xl bg-muted/20 border border-border/20 flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserPlus className="w-5 h-5 text-primary" />
                                              </div>
                                              <div className="flex-1 overflow-hidden">
                                                <div className="text-[13px] font-medium truncate">{m.content?.replace('[Contato] ', '')}</div>
                                                <div className="text-[10px] opacity-60">Contato compartilhado</div>
                                              </div>
                                            </div>
                                          )}
                                          {(m.message_text || m.content) && m.message_type !== 'reaction' && m.message_type !== 'audio' && m.message_type !== 'voice' && !((m.message_text || m.content || '').trim() === '[Mensagem de Áudio]') && (
                                            <div className="space-y-2">
                                              <div className="text-sm md:text-[15px] leading-relaxed break-words whitespace-pre-wrap px-0.5">
                                                {m.message_text || m.content}
                                              </div>
                                              
                                              {/* Botões Interativos no Histórico */}
                                              {m.metadata?.interactive?.action?.buttons && (
                                                <div className="flex flex-col gap-1.5 mt-2 border-t border-border/10 pt-2">
                                                  {m.metadata.interactive.action.buttons.map((btn: any, bIdx: number) => (
                                                    <div 
                                                      key={bIdx} 
                                                      className="flex items-center justify-center p-2 rounded-lg bg-background/50 border border-border/20 text-[11px] font-bold text-primary shadow-sm"
                                                    >
                                                      {btn.reply?.title || btn.text}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          {m.message_type === 'unsupported' && (
                                            <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
                                              Mensagem com formato ainda não suportado pela interface. 
                                              {m.metadata && (
                                                <details className="mt-1 cursor-pointer">
                                                  <summary>Ver dados brutos</summary>
                                                  <pre className="mt-1 text-[8px] whitespace-pre-wrap bg-black/20 p-1 rounded">
                                                    {JSON.stringify(m.metadata, null, 2)}
                                                  </pre>
                                                </details>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {m.direction === 'outbound' && m.status === 'failed' && (
                                        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-[10px] leading-snug text-destructive clear-both">
                                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                          <div className="flex-1">
                                            <span>{getMetaDeliveryErrorMessage(m)}</span>
                                            {isBusinessVerificationError(m) && (
                                              <button
                                                type="button"
                                                onClick={() => window.open('https://business.facebook.com/', '_blank', 'noopener,noreferrer')}
                                                className="mt-1.5 inline-flex items-center gap-1 rounded border border-destructive/40 bg-white/60 dark:bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold text-destructive hover:bg-white"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                                Meta Business
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      <div className={cn(
                                        "text-[10px] mt-0.5 mb-[-2px] float-right ml-2 opacity-70 flex items-center gap-1 leading-none select-none",
                                        m.direction === 'inbound' ? 'text-muted-foreground' : 'text-[#303030]/60 dark:text-white/60',
                                        m.status === 'failed' && 'text-destructive opacity-100'
                                      )}>
                                        {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        {m.direction === 'outbound' && (
                                          m.status === 'failed'
                                            ? <XCircle className="w-3.5 h-3.5 text-destructive" />
                                            : <LucideIcons.CheckCheck className={cn("w-3.5 h-3.5", m.status === 'read' ? "text-[#53bdeb]" : "text-muted-foreground/60")} />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={scrollRef} className="h-4" />
                            </div>
                          </ScrollArea>
                          
                          <div className="p-1 sm:p-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t shadow-lg z-10 space-y-1 sm:space-y-2 shrink-0 w-full min-w-0 overflow-hidden">
                            {selectedContact ? (
                              <>
                                  {isPreviewingAudio && recordedAudioUrl ? (
                                   <div className="flex flex-col gap-2 p-2 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-bottom-2 shrink-0">
                                     <div className="flex items-center gap-2 overflow-hidden">
                                       <audio src={recordedAudioUrl} controls className="h-8 flex-1 min-w-0" />
                                       <div className="flex gap-1 shrink-0">
                                         <Button variant="ghost" size="icon" onClick={cancelAudioPreview} className="text-destructive h-8 w-8 hover:bg-destructive/10"><XCircle className="w-4 h-4" /></Button>
                                         <Button size="icon" onClick={() => sendRecordedAudio()} className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white shadow-lg"><Send className="w-4 h-4" /></Button>
                                       </div>
                                     </div>
                                     <p className="text-[9px] text-center text-muted-foreground font-medium uppercase tracking-tighter truncate">Envie ou descarte o áudio</p>
                                   </div>
                                 ) : pastedImagePreview ? (
                                  <div className="flex flex-col gap-2 p-2 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-bottom-2 shrink-0">
                                    <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border mx-auto">
                                      <img src={pastedImagePreview} alt="Colado" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex justify-center gap-2 mt-1">
                                      <Button variant="ghost" size="sm" onClick={cancelPastedImage} className="text-destructive h-8 px-3 hover:bg-destructive/10">Cancelar</Button>
                                      <Button size="sm" onClick={sendPastedImage} className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white shadow-lg">Enviar Imagem</Button>
                                    </div>
                                    <p className="text-[9px] text-center text-muted-foreground font-medium uppercase tracking-tighter truncate mt-1">Imagem colada pronta para envio</p>
                                  </div>
                                 ) : (
                                  <div className="flex flex-col gap-1.5 max-w-5xl mx-auto w-full px-0.5 sm:px-2 pb-2 shrink-0">
                                    {isRecording && (
                                      <div className="flex items-center justify-between px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse mx-1 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                                          <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Gravando...</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-black text-red-600">
                                          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-0.5 sm:gap-1 w-full min-w-0 px-0 sm:px-0">
                                      <div className="flex items-center gap-0 shrink-0">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => { setUploadType('image'); fileInputRef.current?.click(); }} 
                                          className="text-[#54656f] dark:text-[#aebac1] hover:bg-muted h-9 w-9 rounded-full shrink-0"
                                        >
                                          <Plus className="w-6 h-6" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 border border-red-100 rounded-full"
                                          title="Limpar Conversa"
                                          onClick={async () => {
                                            if (confirm('Tem certeza que deseja apagar todo o histórico desta conversa?')) {
                                              try {
                                                const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
                                                  body: { action: 'clearHistory', contactId: selectedContact.id }
                                                });
                                                if (error) throw error;
                                                toast({ title: 'Histórico apagado com sucesso!' });
                                                // Limpa o chat localmente
                                                setChatMessages([]);
                                              } catch (err: any) {
                                                toast({ title: 'Erro ao apagar histórico', variant: 'destructive' });
                                              }
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => { setUploadType('image'); fileInputRef.current?.click(); }} 
                                          className="text-[#54656f] dark:text-[#aebac1] hover:bg-muted h-9 w-9 rounded-full hidden sm:flex shrink-0"
                                        >
                                          <ImageIcon className="w-5 h-5" />
                                        </Button>
                                      </div>
                                      <div className="flex-1 relative flex items-center min-w-0">
                                        <Input 
                                          placeholder={isRecording ? "Gravando..." : "Mensagem"}
                                          value={newMessage} 
                                          disabled={isRecording}
                                          onPaste={handlePaste}
                                          onChange={e => setNewMessage(e.target.value)}
                                          onKeyDown={e => e.key === 'Enter' && !isRecording && handleSendMessage()}
                                          className="bg-white dark:bg-[#2a3942] border-none h-10 pr-8 sm:pr-9 rounded-xl shadow-sm text-sm focus-visible:ring-0 w-full min-w-0"
                                        />
                                        <Button 
                                          size="icon" 
                                          variant="ghost" 
                                          className="absolute right-0.5 h-8 w-8 text-[#54656f] dark:text-[#aebac1] hover:bg-transparent"
                                        >
                                          <Smile className="w-5 h-5" />
                                        </Button>
                                      </div>
                                      {!isRecording ? (
                                        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                                          {newMessage.trim() ? (
                                            <Button 
                                              size="icon" 
                                              onClick={handleSendMessage} 
                                              disabled={isSending(selectedContact?.id)}
                                              className="h-9 w-9 sm:h-10 sm:w-10 shadow-lg rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white active:scale-95 transition-all"
                                            >
                                              <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                                            </Button>
                                          ) : (
                                            <div className="relative">
                                              <Button 
                                                size="icon" 
                                                variant="ghost" 
                                                className={cn(
                                                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full",
                                                  !metaSettings.vps_transcoder_url || metaSettings.vps_status === 'offline' 
                                                    ? "text-orange-500 bg-orange-50 hover:bg-orange-100" 
                                                    : "text-[#54656f] dark:text-[#aebac1] hover:bg-muted"
                                                )}
                                                onClick={startRecording}
                                              >
                                                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                                              </Button>
                                              {(!metaSettings.vps_transcoder_url || metaSettings.vps_status === 'offline') && (
                                                <div className="absolute -top-1 -right-1">
                                                  <div className="bg-orange-500 rounded-full p-0.5 border-2 border-white">
                                                    <AlertCircle className="w-2.5 h-2.5 text-white" />
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <Button 
                                          size="icon" 
                                          variant="ghost" 
                                          className="h-10 w-10 text-red-500 bg-red-50 hover:bg-red-100 rounded-full shrink-0"
                                          onClick={stopRecording}
                                        >
                                          <StopCircle className="w-5 h-5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 bg-white dark:bg-[#111b21]">
                                <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center">
                                  <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
                                </div>
                                <h3 className="text-lg font-bold">WhatsApp Business CRM</h3>
                                <p className="text-muted-foreground text-sm max-w-[280px]">Selecione uma conversa para começar a atender seus clientes em tempo real.</p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full bg-[#f0f2f5] dark:bg-[#0c1317]">
                           <div className="text-center p-8">
                            <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                              <Bot className="w-12 h-12 text-muted-foreground/20" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Selecione uma Conversa</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">Conecte-se com seus clientes de forma profissional e organizada.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              )}
            </div>

            {/* Agendamentos */}
            <div className={cn("flex-1 h-full overflow-hidden", activeTab !== 'scheduling' && "hidden")}>
              {activeTab === 'scheduling' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-bold tracking-tight">Agendamentos</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Visualize e gerencie todas as mensagens agendadas e o histórico de envios.</p>
                    </div>
                    <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2 sm:shrink-0 w-full sm:w-auto">
                      <Button variant="outline" onClick={fetchAllScheduledMessages} className="h-10 px-4 rounded-xl w-full sm:w-auto">
                        <RefreshCcw className="w-4 h-4 mr-2" /> Atualizar
                      </Button>
                      <Button 
                        onClick={() => {
                          setScheduleDate('');
                          setScheduleDateObj(undefined);
                          setScheduleTime('');
                          setSelectedContactsForScheduling([]);
                          setContactListText('');
                          setIsSchedulingOpen(true);
                        }} 
                        className="h-10 px-4 sm:px-6 rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Novo Agendamento
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card className="border-none shadow-md overflow-hidden rounded-2xl">
                      <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
                        <CardDescription>Mensagens aguardando o horário de envio.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y">
                          {allScheduledMessages.filter(m => m.status === 'pending').length > 0 ? (
                            allScheduledMessages.filter(m => m.status === 'pending').map((msg) => (
                              <div key={msg.id} className="p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{msg.crm_contacts?.name || msg.crm_contacts?.wa_id || 'Desconhecido'}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {msg.message_data?.text || msg.message_data?.templateName || msg.message_data?.flowId || '-'}
                                    </p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                                    onClick={async () => {
                                      if (confirm('Deseja cancelar este agendamento?')) {
                                        await supabase.from('crm_scheduled_messages').update({ status: 'canceled' }).eq('id', msg.id);
                                        fetchAllScheduledMessages();
                                      }
                                    }}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {msg.message_data?.action === 'sendMessage' ? 'Texto' : 
                                     msg.message_data?.action === 'sendTemplate' ? 'Template' : 
                                     msg.message_data?.action === 'startFlow' ? 'Fluxo' : msg.message_data?.action}
                                  </Badge>
                                  <span className="text-muted-foreground font-medium">
                                    {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-muted-foreground italic text-xs">
                              Nenhum agendamento pendente encontrado.
                            </div>
                          )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b">
                              <tr>
                                <th className="px-6 py-3">Contato</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Conteúdo</th>
                                <th className="px-6 py-3">Agendado Para</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {allScheduledMessages.filter(m => m.status === 'pending').length > 0 ? (
                                allScheduledMessages.filter(m => m.status === 'pending').map((msg) => (
                                  <tr key={msg.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 font-bold">
                                      {msg.crm_contacts?.name || msg.crm_contacts?.wa_id || 'Desconhecido'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className="capitalize">
                                        {msg.message_data?.action === 'sendMessage' ? 'Texto' : 
                                         msg.message_data?.action === 'sendTemplate' ? 'Template' : 
                                         msg.message_data?.action === 'startFlow' ? 'Fluxo' : msg.message_data?.action}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate text-muted-foreground">
                                      {msg.message_data?.text || msg.message_data?.templateName || msg.message_data?.flowId || '-'}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                      {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={async () => {
                                          if (confirm('Deseja cancelar este agendamento?')) {
                                            await supabase.from('crm_scheduled_messages').update({ status: 'canceled' }).eq('id', msg.id);
                                            fetchAllScheduledMessages();
                                          }
                                        }}
                                      >
                                        <XCircle className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground italic">
                                    Nenhum agendamento pendente encontrado.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-md overflow-hidden rounded-2xl">
                      <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg">Histórico de Envios</CardTitle>
                        <CardDescription>Registro de mensagens enviadas ou com erro.</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {/* Mobile cards */}
                        <div className="md:hidden divide-y">
                          {allScheduledMessages.filter(m => m.status !== 'pending').length > 0 ? (
                            allScheduledMessages.filter(m => m.status !== 'pending')
                              .sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime())
                              .slice(0, 20)
                              .map((msg) => (
                              <div key={msg.id} className="p-4 flex flex-col gap-2">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="font-bold text-sm truncate min-w-0">{msg.crm_contacts?.name || msg.crm_contacts?.wa_id || 'Desconhecido'}</p>
                                  <Badge 
                                    variant={msg.status === 'sent' ? 'default' : 'destructive'}
                                    className={cn(
                                      "capitalize text-[10px] shrink-0",
                                      msg.status === 'sent' ? "bg-green-500/10 text-green-600 border-green-200" : ""
                                    )}
                                  >
                                    {msg.status === 'sent' ? 'Enviado' : msg.status === 'canceled' ? 'Cancelado' : 'Erro'}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {msg.message_data?.action === 'sendMessage' ? 'Texto' : 
                                     msg.message_data?.action === 'sendTemplate' ? 'Template' : 
                                     msg.message_data?.action === 'startFlow' ? 'Fluxo' : msg.message_data?.action}
                                  </Badge>
                                  <span className="text-muted-foreground">{new Date(msg.scheduled_for).toLocaleString('pt-BR')}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center text-muted-foreground italic text-xs">
                              Nenhum histórico encontrado.
                            </div>
                          )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b">
                              <tr>
                                <th className="px-6 py-3">Contato</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Enviado Em</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {allScheduledMessages.filter(m => m.status !== 'pending').length > 0 ? (
                                allScheduledMessages.filter(m => m.status !== 'pending')
                                  .sort((a, b) => new Date(b.scheduled_for).getTime() - new Date(a.scheduled_for).getTime())
                                  .slice(0, 20)
                                  .map((msg) => (
                                  <tr key={msg.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-6 py-4 font-bold">
                                      {msg.crm_contacts?.name || msg.crm_contacts?.wa_id || 'Desconhecido'}
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className="capitalize">
                                        {msg.message_data?.action === 'sendMessage' ? 'Texto' : 
                                         msg.message_data?.action === 'sendTemplate' ? 'Template' : 
                                         msg.message_data?.action === 'startFlow' ? 'Fluxo' : msg.message_data?.action}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge 
                                        variant={msg.status === 'sent' ? 'default' : 'destructive'}
                                        className={cn(
                                          "capitalize",
                                          msg.status === 'sent' ? "bg-green-500/10 text-green-600 border-green-200" : ""
                                        )}
                                      >
                                        {msg.status === 'sent' ? 'Enviado' : msg.status === 'canceled' ? 'Cancelado' : 'Erro'}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                      {new Date(msg.scheduled_for).toLocaleString('pt-BR')}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground italic">
                                    Nenhum histórico encontrado.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ScrollArea>
              )}
            </div>

            {/* Fluxos */}
            <div className={cn("flex-1 h-full overflow-hidden", activeTab !== 'flows' && "hidden")}>
              {activeTab === 'flows' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-bold tracking-tight">Fluxos de Automação</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Crie gatilhos e sequências automáticas de mensagens inteligentes.</p>
                    </div>
                    <Button onClick={() => { setEditingFlow(null); setIsFlowEditorOpen(true); }} className="shadow-lg shadow-[#00a884]/20 bg-[#00a884] hover:bg-[#008f6f] text-white font-bold shrink-0 self-start sm:self-auto rounded-xl h-10 transition-all active:scale-95">
                      <Plus className="w-4 h-4 mr-2" /> Novo Fluxo Visual
                    </Button>
                  </div>

                  <Accordion type="single" collapsible className="w-full space-y-4">
                    <AccordionItem value="flows-list" className="border-none">
                      <AccordionTrigger className="bg-card p-6 rounded-2xl border shadow-sm hover:no-underline">
                        <div className="flex flex-col items-start text-left">
                          <h3 className="text-xl font-bold tracking-tight">Lista de Fluxos</h3>
                          <p className="text-muted-foreground text-sm font-normal">Clique para ver e gerenciar seus fluxos de automação.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                          {flows.length > 0 ? (
                            flows.map((flow) => (
                              <Card key={flow.id} className="group overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-all">
                                <CardHeader className="bg-muted/30 pb-4 border-b">
                                  <div className="flex justify-between items-start mb-2">
                                    <Badge variant={flow.is_active ? "default" : "secondary"} className={cn("text-[10px]", flow.is_active ? "bg-green-500/10 text-green-600 border-green-200" : "")}>
                                      {flow.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    <div className="flex gap-1">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-primary hover:bg-primary/10" 
                                        onClick={() => handleDuplicateFlow(flow)}
                                        title="Duplicar Fluxo"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={async () => {
                                        if (confirm('Deseja excluir este fluxo?')) {
                                          await supabase.from('crm_flows').delete().eq('id', flow.id);
      fetchData(false);

                                        }
                                      }}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <CardTitle className="text-lg truncate">{flow.name}</CardTitle>
                                  <CardDescription className="text-[11px] flex items-center gap-1.5 mt-1 font-medium">
                                    <Zap className="w-3 h-3 text-amber-500" /> Gatilho: <span className="text-foreground">{flow.trigger_type || 'Manual'}</span>
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 bg-card">
                                  <Button variant="outline" size="sm" className="w-full hover:bg-primary hover:text-white transition-colors h-9" onClick={() => { setEditingFlow(flow); setIsFlowEditorOpen(true); }}>
                                    <GitBranch className="w-4 h-4 mr-2" /> Abrir Editor Visual
                                  </Button>
                                </CardContent>
                              </Card>
                            ))
                          ) : (
                            <div className="col-span-full py-20 text-center bg-card rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <GitBranch className="w-8 h-8 text-muted-foreground/50" />
                              </div>
                              <div className="max-w-xs mx-auto">
                                <h3 className="font-bold text-lg">Nenhum fluxo criado</h3>
                                <p className="text-sm text-muted-foreground">Comece criando um novo fluxo visual para automatizar suas mensagens do WhatsApp.</p>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => setIsFlowEditorOpen(true)}>Criar meu primeiro fluxo</Button>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ScrollArea>
            )}
            </div>

            {activeTab === 'ai-agent' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bot className="w-5 h-5 md:w-6 md:h-6 text-[#00a884] shrink-0" /> <span className="truncate">Agente de Inteligência Artificial</span>
                      </h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Configure como a IA deve interagir com seus clientes.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Label htmlFor="ai-agent-enabled" className="text-sm font-bold">Ativação Geral</Label>
                      <Switch 
                        id="ai-agent-enabled"
                        checked={metaSettings.ai_agent_enabled}
                        onCheckedChange={(val) => {
                          if (val) {
                            if (!metaSettings.business_description || metaSettings.business_description.length < 10) {
                              toast({
                                title: "Cérebro não configurado",
                                description: "Por favor, preencha as instruções do seu negócio na seção 'Instruções do Agente (Cérebro)' antes de ativar a IA.",
                                variant: "destructive"
                              });
                              return;
                            }
                            
                            if (!confirm("Ao ativar o IA em modo geral, ele responderá automaticamente a toda e qualquer mensagem que chegar. Caso deseje ativar o agente apenas em momentos específicos, controle isso via FLUXOS.\n\nDeseja ativar o agente IA e deixar que ele responda tudo por você? (Você pode assumir o controle a qualquer momento).")) {
                              return;
                            }
                          }
                          setMetaSettings({...metaSettings, ai_agent_enabled: val});
                          handleSaveSettings({...metaSettings, ai_agent_enabled: val});
                        }}
                      />
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full space-y-4">
                    <AccordionItem value="motor" className="border-none">
                      <Card className="rounded-2xl shadow-sm border overflow-hidden">
                        <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b p-0">
                          <AccordionTrigger className="flex-1 px-6 py-4 hover:no-underline [&[data-state=open]>div>h3]:text-primary transition-all">
                            <div className="flex flex-col items-start text-left gap-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-zinc-600" /> Motor da IA
                              </CardTitle>
                              <CardDescription>Conexão e Modo de Operação</CardDescription>
                            </div>
                          </AccordionTrigger>
                        </CardHeader>
                        <AccordionContent>
                          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-bold">OpenAI API Key</Label>
                              <Input 
                                type="password"
                                placeholder="sk-..."
                                value={metaSettings.openai_api_key}
                                onChange={(e) => setMetaSettings({...metaSettings, openai_api_key: e.target.value})}
                              />
                              <p className="text-[10px] text-muted-foreground italic">Use uma chave da OpenAI (GPT-4o recomendado).</p>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" /> Modo de Operação
                              </Label>
                              <Select 
                                value="chat" 
                                disabled
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="chat">Apenas Conversar (I.A. Ativa)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-[10px] text-muted-foreground italic">
                                O agente IA está configurado para o modo de conversação ativa.
                              </p>
                            </div>

                            <div className="md:col-span-2 flex justify-end pt-4 border-t">
                              <Button onClick={handleSaveSettings} disabled={saving} size="sm" className="bg-[#00875A] hover:bg-[#00875A]/90">
                                {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Motor
                              </Button>
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>


                    <AccordionItem value="hours" className="border-none">
                      <Card className="rounded-2xl shadow-sm border overflow-hidden">
                        <CardHeader className="bg-blue-50 dark:bg-blue-900/10 border-b p-0">
                          <AccordionTrigger className="flex-1 px-6 py-4 hover:no-underline [&[data-state=open]>div>h3]:text-blue-700 transition-all">
                            <div className="flex flex-col items-start text-left gap-1">
                              <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                                <Clock className="w-4 h-4 shrink-0" /> Gestão de Horário Comercial
                              </CardTitle>
                              <CardDescription>Defina quando o agente deve avisar sobre ausência</CardDescription>
                            </div>
                          </AccordionTrigger>
                        </CardHeader>
                        <AccordionContent>
                          <CardContent className="p-6 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Início
                                    </Label>
                                    <Input 
                                      type="time" 
                                      className="h-10 text-sm"
                                      value={metaSettings.business_hours_start}
                                      onChange={(e) => setMetaSettings({...metaSettings, business_hours_start: e.target.value})}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Fim
                                    </Label>
                                    <Input 
                                      type="time" 
                                      className="h-10 text-sm"
                                      value={metaSettings.business_hours_end}
                                      onChange={(e) => setMetaSettings({...metaSettings, business_hours_end: e.target.value})}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fuso Horário</Label>
                                  <Select 
                                    value={metaSettings.business_hours_tz} 
                                    onValueChange={(val) => setMetaSettings({...metaSettings, business_hours_tz: val})}
                                  >
                                    <SelectTrigger className="h-10 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                                      <SelectItem value="Europe/Lisbon">Lisboa (GMT+0)</SelectItem>
                                      <SelectItem value="UTC">UTC</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="md:col-span-2 space-y-2">
                                <Label className="text-sm font-bold">Mensagem de Ausência (Fora de Horário)</Label>
                                <Textarea 
                                  rows={4}
                                  className="resize-none text-sm"
                                  placeholder="Nossos administradores não estão ativos no momento..."
                                  value={metaSettings.outside_hours_message}
                                  onChange={(e) => setMetaSettings({...metaSettings, outside_hours_message: e.target.value})}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t">
                              <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg">
                                <Label className="text-xs font-bold">Ativar</Label>
                                <Switch 
                                  checked={metaSettings.business_hours_enabled}
                                  onCheckedChange={(val) => setMetaSettings({...metaSettings, business_hours_enabled: val})}
                                />
                              </div>
                              <Button onClick={handleSaveSettings} disabled={saving} size="sm" className="bg-[#00875A] hover:bg-[#00875A]/90">
                                {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Horário
                              </Button>
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>

                    <AccordionItem value="brain" className="border-none">
                      <Card className="rounded-2xl shadow-sm border overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b p-0">
                          <AccordionTrigger className="flex-1 px-6 py-4 hover:no-underline [&[data-state=open]>div>h3]:text-primary transition-all">
                            <div className="flex flex-col items-start text-left gap-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Bot className="w-5 h-5 text-primary" /> Instruções do Agente (Cérebro)
                              </CardTitle>
                              <CardDescription>Defina a personalidade e o objetivo do seu robô</CardDescription>
                            </div>
                          </AccordionTrigger>
                        </CardHeader>
                        <AccordionContent>
                          <CardContent className="p-6 space-y-6 pt-6">
                            <div className="space-y-2">
                              <Label className="text-sm font-bold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" /> O que sua empresa vende?
                              </Label>
                              <Textarea 
                                rows={4}
                                className="resize-none text-xs leading-relaxed bg-muted/30 border-none rounded-xl"
                                placeholder="Descreva detalhadamente seus produtos, serviços e diferenciais..."
                                value={metaSettings.business_description}
                                onChange={(e) => setMetaSettings({...metaSettings, business_description: e.target.value})}
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <Label className="text-sm font-bold">Prompt do System</Label>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={handleImprovePrompt}
                                  disabled={improvingPrompt}
                                  className="h-7 text-[10px] gap-1.5 bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white"
                                >
                                  {improvingPrompt ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />}
                                  Melhorar Prompt
                                </Button>
                              </div>
                              <Textarea 
                                rows={6}
                                className="resize-none font-mono text-xs leading-relaxed bg-muted/30 border-none rounded-xl"
                                value={metaSettings.ai_system_prompt}
                                onChange={(e) => setMetaSettings({...metaSettings, ai_system_prompt: e.target.value})}
                              />
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                              <Button onClick={handleSaveSettings} disabled={saving} size="sm" className="bg-[#00875A] hover:bg-[#00875A]/90">
                                {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Cérebro
                              </Button>
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>


                    <AccordionItem value="knowledge" className="border-none">
                      <Card className="rounded-2xl shadow-sm border overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b p-0">
                          <AccordionTrigger className="flex-1 px-6 py-4 hover:no-underline [&[data-state=open]>div>h3]:text-primary transition-all">
                            <div className="flex flex-col items-start text-left gap-1">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <GitBranch className="w-5 h-5 text-primary" /> Conhecimento dos Templates
                              </CardTitle>
                              <CardDescription>A IA saberá quais botões e caminhos estão disponíveis</CardDescription>
                            </div>
                          </AccordionTrigger>
                        </CardHeader>
                        <AccordionContent>
                          <CardContent className="p-6 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {templates.map((template) => (
                                <div key={template.id} className="p-4 rounded-xl border bg-card/50 space-y-3">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs truncate max-w-[150px]">{template.name}</span>
                                    <Badge variant="outline" className="text-[9px]">{template.category}</Badge>
                                  </div>
                                  <Textarea 
                                    placeholder="Descreva quando usar este template..."
                                    className="text-[11px] min-h-[60px] bg-muted/20 border-none resize-none"
                                    defaultValue={template.knowledge_description || ''}
                                    onBlur={(e) => {
                                      if (e.target.value !== (template.knowledge_description || '')) {
                                        handleUpdateTemplateKnowledge(template.id, e.target.value);
                                      }
                                    }}
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-end pt-4 border-t mt-6">
                              <Button onClick={handleSaveSettings} disabled={saving} size="sm" className="bg-[#00875A] hover:bg-[#00875A]/90">
                                {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Conhecimento
                              </Button>
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'broadcast' && (
              <Broadcaster 
                templates={templates} 
                flows={flows} 
                contacts={contacts} 
                statuses={kanbanStatuses}
              />
            )}

            {activeTab === 'templates' && (
              <ScrollArea className="flex-1 p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-card p-4 md:p-6 rounded-2xl border shadow-sm gap-4">
                    <div className="space-y-1">
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">Templates do WhatsApp</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Gerencie seus modelos oficiais aprovados pela Meta.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-[10px] h-8 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => {
                          const wabaId = metaSettings.meta_waba_id;
                          if (wabaId) {
                            window.open(`https://business.facebook.com/wa/static/template-manager/?waba_id=${wabaId}`, '_blank');
                          } else {
                            toast({ 
                              title: "WABA ID não configurado", 
                              description: "Conecte sua conta primeiro para ver os modelos na Meta.",
                              variant: "destructive"
                            });
                          }
                        }}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Ver modelos na Meta
                      </Button>
                      <Button variant="outline" onClick={syncTemplates} disabled={syncingTemplates} className="flex-1 sm:flex-none h-10 text-xs md:text-sm">
                        <RefreshCcw className={cn("w-3.5 h-3.5 md:w-4 md:h-4 mr-2", syncingTemplates && "animate-spin")} />
                        Sincronizar Meta
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="flex-1 sm:flex-none h-10 bg-[#00a884] hover:bg-[#008f6f] shadow-lg shadow-[#00a884]/20 text-xs md:text-sm font-bold rounded-xl transition-all active:scale-95">
                            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" /> Novo Template
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl w-[95vw] md:w-full h-[90vh] p-0 border-none rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
                          <ScrollArea className="h-full">
                            <TemplateBuilder onSave={handleSaveTemplate} isSaving={saving} />
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <Dialog open={!!confirmSend} onOpenChange={(open) => !open && setConfirmSend(null)}>
                    <DialogContent className="rounded-2xl border-none shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                          <Send className="w-5 h-5 text-primary" /> Confirmar Envio
                        </DialogTitle>
                        <DialogDescription className="py-4 text-base leading-relaxed text-foreground/80">
                          Deseja enviar o {confirmSend?.type === 'template' ? 'template' : 'fluxo'} <span className="font-black text-primary underline underline-offset-4">"{confirmSend?.name}"</span> para <span className="font-bold">{selectedContact?.name || selectedContact?.wa_id}</span>?
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setConfirmSend(null)} className="rounded-xl h-11 px-6">Cancelar</Button>
                        <Button onClick={() => {
                          if (confirmSend?.type === 'template') {
                            handleSendTemplate(confirmSend.id, confirmSend.language || 'pt_BR');
                          } else if (confirmSend?.type === 'flow') {
                            handleTriggerFlow(confirmSend.id);
                          }
                        }} className="rounded-xl h-11 px-8 bg-[#00a884] hover:bg-[#008f6f] shadow-lg shadow-[#00a884]/20 text-white font-bold transition-all active:scale-95">Sim, enviar agora</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Accordion type="single" collapsible className="w-full space-y-4">
                    <AccordionItem value="templates-list" className="border-none">
                      <AccordionTrigger className="bg-card p-4 md:p-6 rounded-2xl border shadow-sm hover:no-underline [&[data-state=open]>div>h3]:text-primary transition-all">
                        <div className="flex flex-col items-start text-left gap-1">
                          <h3 className="text-lg md:text-xl font-bold tracking-tight">Lista de Templates</h3>
                          <p className="text-muted-foreground text-xs md:text-sm font-normal">Clique para ver e gerenciar seus templates.</p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 md:pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-6">
                          {templates.length > 0 ? (
                            templates.map((template) => {
                              const header = template.components?.find((c: any) => c.type === 'HEADER');
                              const body = template.components?.find((c: any) => c.type === 'BODY');
                              const footer = template.components?.find((c: any) => c.type === 'FOOTER');
                              const buttonsComp = template.components?.find((c: any) => c.type === 'BUTTONS');
                              const carouselComp = template.components?.find((c: any) => c.type === 'CAROUSEL');

                              return (
                                <Card key={template.id} className="group overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-all flex flex-col bg-card rounded-2xl">
                                  <CardHeader className="bg-muted/30 pb-4 border-b">
                                    <div className="flex justify-between items-start mb-2">
                                      <Badge variant={
                                        template.status === 'APPROVED' ? 'default' : 
                                        template.status === 'REJECTED' ? 'destructive' : 'secondary'
                                      } className={cn(
                                        "text-[9px] uppercase tracking-wider",
                                        template.status === 'APPROVED' ? "bg-green-500/10 text-green-600 border-green-200" : ""
                                      )}>
                                        {template.status === 'APPROVED' ? <Check className="w-3 h-3 mr-1" /> : 
                                        template.status === 'REJECTED' ? <XCircle className="w-3 h-3 mr-1" /> : 
                                        <Clock className="w-3 h-3 mr-1" />}
                                        {template.status === 'APPROVED' ? 'Aprovado' : 
                                         template.status === 'REJECTED' ? 'Rejeitado' : 
                                         template.status === 'PENDING' ? 'Pendente' : template.status}
                                      </Badge>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => setPreviewTemplate(template)}>
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => {
                                          if (confirm(`Deseja realmente excluir o template "${template.name}"?`)) {
                                            handleDeleteTemplate(template.name);
                                          }
                                        }}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                      <CardTitle className="text-sm md:text-base truncate font-bold flex items-center gap-1.5 min-w-0">
                                        <span className="truncate">{template.name}</span>
                                        <div className="flex gap-1 shrink-0">
                                          {template.is_carousel && <Layers className="w-3 h-3 text-primary" />}
                                          {template.is_pix && <CreditCard className="w-3 h-3 text-amber-500" />}
                                        </div>
                                      </CardTitle>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-xl text-primary hover:text-white hover:bg-primary shadow-sm hover:shadow-primary/20 transition-all border border-primary/10 active:scale-95"
                                        title="Copiar texto fácil (sem aspas)"
                                        onClick={() => {
                                          const bodyText = template.components?.find((c: any) => c.type === 'BODY')?.text || '';
                                          copyToClipboard(bodyText, "Texto do Template");
                                        }}
                                      >
                                        <Copy className="h-3.5 w-3.5 md:h-4 md:h-4" />
                                      </Button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                      <Badge variant="outline" className="text-[8px] md:text-[9px] font-bold bg-muted/50 border-none px-1.5 py-0 md:py-0.5">{template.category}</Badge>
                                      <Badge variant="outline" className="text-[8px] md:text-[9px] font-bold bg-muted/50 border-none px-1.5 py-0 md:py-0.5">{template.language}</Badge>
                                      {template.is_pix && (
                                        <Badge variant="outline" className="text-[8px] md:text-[9px] font-bold bg-amber-500/10 text-amber-600 border-amber-200 px-1.5 py-0 md:py-0.5">PIX</Badge>
                                      )}
                                    </div>
                                  </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                              <div className="bg-muted/20 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50 relative">
                                <div className="absolute top-2 right-2 w-4 h-4 text-muted-foreground/30"><MessageSquare className="w-full h-full" /></div>
                                {header && header.format === 'IMAGE' && header.example?.header_handle?.[0] && (
                                  <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-muted shadow-inner">
                                    <img src={header.example.header_handle[0]} alt="Header" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                {carouselComp && carouselComp.cards && (
                                  <div className="mb-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {carouselComp.cards.map((card: any, cIdx: number) => {
                                      const cardHeader = card.components?.find((c: any) => c.type === 'HEADER');
                                      return (
                                        <div key={cIdx} className="min-w-[120px] aspect-square rounded-lg bg-muted overflow-hidden border border-zinc-200 dark:border-zinc-800">
                                          {cardHeader?.example?.header_handle?.[0] && (
                                            <img src={cardHeader.example.header_handle[0]} className="w-full h-full object-cover" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="text-[12px] md:text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300 italic line-clamp-4 md:line-clamp-6">
                                  "{body?.text}"
                                </div>
                                {template.is_pix && template.pix_code && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full mt-3 h-8 text-[9px] md:text-[10px] bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-900/10 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 gap-1.5 md:gap-2 px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(template.pix_code);
                                      toast({ title: "PIX Copiado!", description: "Chave PIX copiada para a área de transferência." });
                                    }}
                                  >
                                    <Copy className="w-2.5 h-2.5 md:w-3 md:h-3 shrink-0" /> <span className="truncate">Copiar PIX</span>
                                  </Button>
                                )}
                              </div>
                              {buttonsComp?.buttons && buttonsComp.buttons.length > 0 && (
                                <div className="space-y-1.5">
                                  {buttonsComp.buttons.map((btn: any, idx: number) => (
                                    <div key={idx} className="bg-primary/5 p-2 rounded-lg text-[10px] text-center text-primary font-bold border border-primary/10">
                                      {btn.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <div className="mt-4 pt-4 border-t space-y-2">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                  <Bot className="w-3 h-3" /> Instruções para o Agente IA
                                </Label>
                                <Textarea 
                                  placeholder="Explique quando a IA deve usar este template ou o que os botões fazem..."
                                  className="text-xs min-h-[60px] resize-none bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/30"
                                  defaultValue={template.knowledge_description || ''}
                                  onBlur={(e) => {
                                    if (e.target.value !== (template.knowledge_description || '')) {
                                      handleUpdateTemplateKnowledge(template.id, e.target.value);
                                    }
                                  }}
                                />
                                {updatingKnowledge === template.id && (
                                  <div className="text-[9px] text-primary animate-pulse flex items-center gap-1">
                                    <RefreshCcw className="w-2 h-2 animate-spin" /> Salvando...
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-20 text-center bg-card rounded-2xl border-2 border-dashed border-muted flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="font-bold text-lg">Sem templates sincronizados</h3>
                        <p className="text-sm text-muted-foreground">Clique em "Sincronizar Meta" para carregar seus templates oficiais.</p>
                        <Button variant="outline" size="sm" onClick={syncTemplates} disabled={syncingTemplates}>Sincronizar agora</Button>
                      </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
                  <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
                    {previewTemplate && (
                      <TemplatePreview 
                        name={previewTemplate.name}
                        headerType={previewTemplate.components?.find((c: any) => c.type === 'HEADER')?.format || 'NONE'}
                        headerText={previewTemplate.components?.find((c: any) => c.type === 'HEADER')?.text}
                        headerUrl={previewTemplate.components?.find((c: any) => c.type === 'HEADER')?.example?.header_handle?.[0]}
                        bodyText={previewTemplate.components?.find((c: any) => c.type === 'BODY')?.text || ''}
                        footerText={previewTemplate.components?.find((c: any) => c.type === 'FOOTER')?.text}
                        buttons={previewTemplate.components?.find((c: any) => c.type === 'BUTTONS')?.buttons || []}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </ScrollArea>
            )}

            {activeTab === 'contact-list' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-20">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-card p-4 md:p-6 rounded-2xl border shadow-sm gap-6">
                    <div className="w-full lg:w-auto">
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">Lista de Contatos</h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Gerencie todos os seus contatos salvos e importados.</p>
                    </div>
                    
                    <div className="flex flex-col xl:flex-row w-full lg:w-auto gap-4 items-stretch xl:items-center">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 px-3 py-3 md:px-4 md:py-2 bg-primary/5 rounded-2xl border border-primary/20 shadow-sm flex-1">
                        <div className="flex items-center justify-between sm:justify-start gap-3 sm:pr-4 sm:border-r border-primary/10">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase text-primary leading-none mb-1">Google Contatos</span>
                              {googleAccountInfo ? (
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{googleAccountInfo.email}</span>
                                  <button 
                                    onClick={handleDisconnectGoogle}
                                    className="text-[10px] text-destructive hover:underline text-left font-bold"
                                  >
                                    SAIR
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Switch 
                                    id="google-sync-list" 
                                    checked={metaSettings.google_auto_sync} 
                                    onCheckedChange={async (checked) => {
                                      setMetaSettings(prev => ({ ...prev, google_auto_sync: checked }));
                                      const { id, created_at, updated_at, webhook_verify_token, vps_status, ...rest } = metaSettings;
                                      await supabase.from('crm_settings').upsert({
                                        ...rest,
                                        google_auto_sync: checked,
                                        id: '00000000-0000-0000-0000-000000000001',
                                        updated_at: new Date().toISOString()
                                      });
                                      toast({ title: checked ? "Sincronização automática ativada" : "Sincronização automática desativada" });
                                    }}
                                  />
                                  <Label htmlFor="google-sync-list" className="text-[11px] font-bold cursor-pointer whitespace-nowrap">Sincronizar automático</Label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="default" 
                          size="sm"
                          className={cn(
                            "h-9 text-[10px] md:text-xs font-bold rounded-xl px-5 shadow-sm w-full sm:w-auto",
                            googleContactsEnabled ? "bg-white text-primary border border-primary/20 hover:bg-primary/5" : "bg-primary/90 text-white"
                          )}
                          onClick={handleSyncGoogleContacts}
                        >
                          <RefreshCcw className={cn("w-3.5 h-3.5 mr-2", googleContactsEnabled && "animate-spin-slow")} />
                          {googleContactsEnabled ? 'SINCRONIZAR AGORA' : 'CONECTAR GOOGLE'}
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full lg:w-auto">
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab('google-synced')} 
                          className="h-10 md:h-11 rounded-xl text-[11px] md:text-xs flex-1 sm:flex-none sm:px-4 border-blue-500/30 text-blue-600 hover:bg-blue-50"
                        >
                          <LucideIcons.Cloud className="w-4 h-4 sm:mr-2 flex-shrink-0" /> <span className="hidden xs:inline">Google Sync</span><span className="xs:hidden">Google</span>
                        </Button>
                        <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="h-10 md:h-11 rounded-xl text-[11px] md:text-xs flex-1 sm:flex-none sm:px-4">
                          <FileUp className="w-4 h-4 sm:mr-2 flex-shrink-0" /> <span className="hidden xs:inline">Importar/Exportar</span><span className="xs:hidden">Imp/Exp</span>
                        </Button>
                        <Button onClick={() => { setContactToView({ name: '', wa_id: '', metadata: {} }); setIsContactInfoOpen(true); }} className="bg-primary h-10 md:h-11 rounded-xl shadow-lg shadow-primary/20 text-[11px] md:text-xs flex-1 sm:flex-none sm:px-4">
                          <UserPlus className="w-4 h-4 sm:mr-2 flex-shrink-0" /> <span className="hidden xs:inline">Novo Contato</span><span className="xs:hidden">Novo</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-muted/30 flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="Pesquisar por nome ou número..." 
                          className="pl-9 bg-background h-10 rounded-xl"
                          value={statusFilter === 'all' ? '' : statusFilter}
                          onChange={e => setStatusFilter(e.target.value || 'all')}
                        />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Filtrar Origem:</span>
                        <div className="flex bg-muted p-1 rounded-lg w-full sm:w-auto">
                          <Button 
                            variant={sourceFilter === 'all' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="text-[9px] h-7 px-3 flex-1 sm:flex-none"
                            onClick={() => setSourceFilter('all')}
                          >
                            Todos
                          </Button>
                          <Button 
                            variant={sourceFilter === 'system' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="text-[9px] h-7 px-3 flex-1 sm:flex-none"
                            onClick={() => setSourceFilter('system')}
                          >
                            Sistema
                          </Button>
                          <Button 
                            variant={sourceFilter === 'imported' ? 'secondary' : 'ghost'} 
                            size="sm" 
                            className="text-[9px] h-7 px-3 flex-1 sm:flex-none"
                            onClick={() => setSourceFilter('imported')}
                          >
                            Importados
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto w-full">
                      {/* Mobile view of contacts as cards */}
                      <div className="md:hidden divide-y divide-border">
                        {(() => {
                          const filtered = contacts.filter(c => {
                            const matchesSearch = statusFilter === 'all' || 
                              c.name?.toLowerCase().includes(statusFilter.toLowerCase()) || 
                              c.wa_id?.includes(statusFilter);
                            const matchesSource = sourceFilter === 'all' || c.source_type === sourceFilter;
                            return matchesSearch && matchesSource;
                          });
                          
                          const isSearching = statusFilter !== 'all';
                          const displayContacts = (showAllContacts || isSearching) ? filtered : filtered.slice(0, 10);

                          if (displayContacts.length === 0) {
                            return (
                              <div className="p-12 text-center text-muted-foreground italic text-xs">
                                Nenhum contato encontrado.
                              </div>
                            );
                          }

                          return (
                            <>
                              {displayContacts.map((contact) => (
                                <div key={contact.id} className="p-4 flex flex-col gap-4 bg-card/50 hover:bg-card transition-colors">
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                        {contact.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                                      </div>
                                      <div className="flex flex-col overflow-hidden">
                                        <span className="font-bold text-sm truncate">{contact.name || 'Sem nome'}</span>
                                        <span className="text-xs text-muted-foreground font-mono truncate">{contact.wa_id}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => { openChat(contact); setActiveTab('contacts'); }}>
                                        <MessageSquare className="w-4 h-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => openContactInfo(contact)}>
                                        <Settings className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                    <div className="flex gap-1.5 flex-wrap">
                                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase font-bold tracking-tight">
                                        {contact.source_type === 'imported' ? 'Importado' : 'Sistema'}
                                      </Badge>
                                      <Badge variant="outline" className={cn("capitalize text-[9px] px-1.5 py-0 font-bold", getStatusColor(contact.status))}>
                                        {contact.status}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                                      <Clock className="w-3 h-3" />
                                      <span>{contact.last_interaction ? new Date(contact.last_interaction).toLocaleDateString() : 'Nunca'}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {filtered.length > 10 && !showAllContacts && !isSearching && (
                                <div className="p-6 bg-muted/5 flex justify-center border-t">
                                  <Button variant="outline" size="sm" onClick={() => setShowAllContacts(true)} className="text-xs font-bold text-primary rounded-xl px-8 h-9 border-primary/20 hover:bg-primary/5">
                                    Ver Todos os {filtered.length} Contatos
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      {/* Desktop view of contacts as table */}
                      <table className="hidden md:table w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b">
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">WhatsApp</th>
                            <th className="px-6 py-4">Origem</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Última Interação</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(() => {
                            const filtered = contacts.filter(c => {
                              const matchesSearch = statusFilter === 'all' || 
                                c.name?.toLowerCase().includes(statusFilter.toLowerCase()) || 
                                c.wa_id?.includes(statusFilter);
                              const matchesSource = sourceFilter === 'all' || c.source_type === sourceFilter;
                              return matchesSearch && matchesSource;
                            });
                            
                            const totalFiltered = filtered.length;
                            const isSearching = statusFilter !== 'all';
                            const displayContacts = (showAllContacts || isSearching) ? filtered : filtered.slice(0, 10);

                            return (
                              <>
                                {displayContacts.map((contact) => (
                                  <tr key={contact.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                          {contact.name?.charAt(0) || <User className="w-4 h-4" />}
                                        </div>
                                        <span className="font-semibold text-sm">{contact.name || 'Sem nome'}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{contact.wa_id}</td>
                                    <td className="px-6 py-4">
                                      <Badge variant="secondary" className="text-[9px] uppercase font-bold">
                                        {contact.source_type === 'imported' ? 'Importado' : 'Sistema'}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                      <Badge variant="outline" className={cn("capitalize text-[10px]", getStatusColor(contact.status))}>
                                        {contact.status}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-[11px] text-muted-foreground">
                                      {contact.last_interaction ? new Date(contact.last_interaction).toLocaleString() : 'Nunca'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { openChat(contact); setActiveTab('contacts'); }}>
                                          <MessageSquare className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openContactInfo(contact)}>
                                          <Settings className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
                                          if (confirm('Excluir este contato?')) {
                                            await supabase.from('crm_contacts').delete().eq('id', contact.id);
                                            fetchContacts();
                                          }
                                        }}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                
                                {totalFiltered > 10 && !showAllContacts && !isSearching && (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center bg-muted/5">
                                      <div className="flex flex-col items-center gap-3">
                                        <p className="text-sm text-muted-foreground">
                                          Mostrando 10 de <strong>{totalFiltered}</strong> contatos
                                        </p>
                                        <Button 
                                          variant="outline" 
                                          onClick={() => setShowAllContacts(true)}
                                          className="font-bold"
                                        >
                                          <Eye className="w-4 h-4 mr-2" /> Ver Todos os Contatos
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                
                                {totalFiltered === 0 && (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground italic text-sm">
                                      Nenhum contato encontrado. Importe uma lista vCard ou CSV para começar.
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'google-synced' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-card p-4 md:p-6 rounded-2xl border shadow-sm gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border">
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Sincronizados com Google</h2>
                        <p className="text-muted-foreground text-xs md:text-sm">
                          Contatos do sistema que já subiram para sua conta Google.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <div className="flex-1 lg:flex-none relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Pesquisar..."
                          className="pl-9 bg-background h-10 rounded-xl w-full lg:w-72"
                          value={statusFilter === 'all' ? '' : statusFilter}
                          onChange={e => setStatusFilter(e.target.value || 'all')}
                        />
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-10 rounded-xl text-xs font-bold whitespace-nowrap"
                        onClick={handleSyncGoogleContacts}
                      >
                        <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                        Sincronizar
                      </Button>
                    </div>
                  </div>

                  {(() => {
                    const synced = contacts.filter(c => c.google_sync_account_id || c.metadata?.google_resource_name);
                    const filtered = synced.filter(c => {
                      if (statusFilter === 'all') return true;
                      const q = statusFilter.toLowerCase();
                      return c.name?.toLowerCase().includes(q) || c.wa_id?.includes(statusFilter);
                    });

                    return (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                          <Card className="p-4">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Sincronizados</p>
                            <p className="text-2xl md:text-3xl font-black text-primary mt-1">{synced.length}</p>
                          </Card>
                          <Card className="p-4">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Contatos</p>
                            <p className="text-2xl md:text-3xl font-black mt-1">{contacts.length}</p>
                          </Card>
                          <Card className="p-4">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pendentes</p>
                            <p className="text-2xl md:text-3xl font-black text-orange-500 mt-1">{contacts.length - synced.length}</p>
                          </Card>
                          <Card className="p-4">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Auto Sync</p>
                            <p className={cn("text-sm md:text-base font-black mt-2", metaSettings.google_auto_sync ? "text-emerald-500" : "text-muted-foreground")}>
                              {metaSettings.google_auto_sync ? '● Ativo' : '○ Desativado'}
                            </p>
                          </Card>
                        </div>

                        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                          {filtered.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground text-sm italic">
                              Nenhum contato sincronizado com Google ainda.
                            </div>
                          ) : (
                            <>
                              {/* Mobile cards */}
                              <div className="md:hidden divide-y divide-border">
                                {filtered.slice(0, showAllGoogleContacts ? undefined : 50).map((contact) => (
                                  <div key={contact.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/30">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                        {contact.name?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                                        <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#4285F4] rounded-full flex items-center justify-center border-2 border-card">
                                          <span className="text-[7px] font-bold text-white">G</span>
                                        </span>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">{contact.name || 'Sem nome'}</p>
                                        <p className="text-[11px] text-muted-foreground font-mono truncate">{contact.wa_id}</p>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary shrink-0" onClick={() => { openChat(contact); setActiveTab('contacts'); }}>
                                      <MessageSquare className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>

                              {/* Desktop table */}
                              <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                  <thead>
                                    <tr className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-wider border-b">
                                      <th className="px-6 py-4">Nome</th>
                                      <th className="px-6 py-4">WhatsApp</th>
                                      <th className="px-6 py-4">Conta Google</th>
                                      <th className="px-6 py-4">Sincronizado em</th>
                                      <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {filtered.slice(0, showAllGoogleContacts ? undefined : 50).map((contact) => (
                                      <tr key={contact.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                            <div className="relative w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                              {contact.name?.charAt(0) || <User className="w-4 h-4" />}
                                              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#4285F4] rounded-full flex items-center justify-center border border-card">
                                                <span className="text-[6px] font-bold text-white">G</span>
                                              </span>
                                            </div>
                                            <span className="font-semibold text-sm">{contact.name || 'Sem nome'}</span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{contact.wa_id}</td>
                                        <td className="px-6 py-4 text-[11px] text-muted-foreground truncate max-w-[200px]">
                                          {contact.google_sync_account_id || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-[11px] text-muted-foreground">
                                          {contact.google_synced_at ? new Date(contact.google_synced_at).toLocaleString() : (contact.updated_at ? new Date(contact.updated_at).toLocaleDateString() : '—')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => { openChat(contact); setActiveTab('contacts'); }}>
                                              <MessageSquare className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openContactInfo(contact)}>
                                              <Settings className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {filtered.length > 50 && !showAllGoogleContacts && (
                                <div className="p-8 text-center bg-muted/5 border-t">
                                  <div className="flex flex-col items-center gap-3">
                                    <p className="text-sm text-muted-foreground">
                                      Mostrando 50 de <strong>{filtered.length}</strong> contatos sincronizados
                                    </p>
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setShowAllGoogleContacts(true)}
                                      className="font-bold"
                                    >
                                      <Eye className="w-4 h-4 mr-2" /> Ver Todos os Contatos Sincronizados
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </ScrollArea>
            )}

            {activeTab === 'settings' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div>
                    <h2 className="text-xl md:text-3xl font-bold tracking-tight text-primary">Configurações</h2>
                    <p className="text-muted-foreground text-xs md:text-sm font-medium">Gerencie as integrações e chaves de API do seu CRM.</p>
                  </div>

                  <div className="space-y-4">
                    <Accordion type="single" collapsible className="w-full space-y-4">
                      <AccordionItem value="whatsapp-api" className="border rounded-2xl bg-card overflow-hidden shadow-sm">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 text-left">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary"><MessageSquare className="w-5 h-5" /></div>
                            <div>
                              <CardTitle className="text-lg">WhatsApp API</CardTitle>
                              <CardDescription className="text-[11px]">Conecte com a plataforma Business da Meta.</CardDescription>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2 space-y-5 border-t">
                          <div className="flex items-center gap-2 pt-2">
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2",
                              (metaSettings.meta_access_token && metaSettings.meta_phone_number_id && metaSettings.meta_waba_id)
                                ? "bg-red-500 text-white animate-pulse" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              <div className={cn("w-2 h-2 rounded-full", (metaSettings.meta_access_token && metaSettings.meta_phone_number_id && metaSettings.meta_waba_id) ? "bg-white" : "bg-muted-foreground")} />
                              {(metaSettings.meta_access_token && metaSettings.meta_phone_number_id && metaSettings.meta_waba_id) ? "ATIVADO LIGADO" : "AGUARDANDO CONFIGURAÇÃO"}
                            </div>
                          </div>

                          {(metaSettings.meta_display_phone_number || metaSettings.meta_verified_name) && (
                            <div className="mt-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 dark:text-green-400 mb-1">Número conectado</p>
                              {metaSettings.meta_display_phone_number && (
                                <p className="text-sm font-semibold text-foreground">{metaSettings.meta_display_phone_number}</p>
                              )}
                              {metaSettings.meta_verified_name && (
                                <p className="text-xs text-muted-foreground">{metaSettings.meta_verified_name}</p>
                              )}
                            </div>
                          )}

                          {!(metaSettings.meta_access_token && metaSettings.meta_phone_number_id && metaSettings.meta_waba_id) && (
                            <div className="pt-3 border-t border-border/60 space-y-2">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Facebook className="w-3 h-3" /> Embedded Signup (Meta Tech Provider)
                              </Label>
                              <p className="text-[11px] text-muted-foreground">
                                Conecte uma conta WhatsApp Business diretamente pelo Facebook — preenche WABA, Phone Number ID e Access Token automaticamente.
                              </p>
                              <Button
                                type="button"
                                className="w-full h-11 rounded-xl bg-[#1877F2] hover:bg-[#1668d8] text-white font-semibold"
                                onClick={() => startEmbeddedSignup()}
                              >
                                <Facebook className="w-4 h-4 mr-2" />
                                Conectar com Facebook
                              </Button>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="payments" className="border rounded-2xl bg-card overflow-hidden shadow-sm">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 text-left">
                            <div className="p-2 rounded-lg bg-amber-100 text-amber-700"><CreditCard className="w-5 h-5" /></div>
                            <div>
                              <CardTitle className="text-lg">Saldo e Pagamentos Meta</CardTitle>
                              <CardDescription className="text-[11px]">Gerencie seus créditos para disparos em massa.</CardDescription>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2 space-y-4 border-t">
                          <div className="bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-3 mt-2">
                            <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center shrink-0">
                              <Zap className="w-4 h-4 text-amber-700 dark:text-amber-400 fill-amber-700 dark:fill-amber-400" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Aviso sobre Custos de Envio</h4>
                              <p className="text-xs text-amber-700/80 dark:text-amber-400/70 leading-relaxed">
                                Para realizar disparos em massa (Broadcasting) e agendamentos, a Meta cobra uma taxa por mensagem enviada.
                                Em média, o custo de uma mensagem de marketing é de <strong>R$ 0,33</strong>.
                              </p>
                              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70">
                                Adicione saldo ou um cartão de crédito na sua conta da Meta para evitar falhas no envio.
                              </p>
                            </div>
                          </div>

                          <Button 
                            className="w-full h-12 bg-[#00875A] hover:bg-[#00875A]/90 text-white font-bold rounded-xl shadow-lg shadow-[#00875A]/20 gap-2"
                            onClick={() => {
                              const wabaId = metaSettings.meta_waba_id;
                              if (wabaId) {
                                window.open(`https://business.facebook.com/wa/static/shipping-and-payment/?waba_id=${wabaId}`, '_blank');
                              } else {
                                toast({ 
                                  title: "WABA ID não configurado", 
                                  description: "Conecte sua conta do WhatsApp Business primeiro para acessar os pagamentos.",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <CreditCard className="w-5 h-5" />
                            Ir para Central de Pagamentos Meta
                          </Button>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="interface" className="border rounded-2xl bg-card overflow-hidden shadow-sm">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 text-left">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary"><Zap className="w-5 h-5" /></div>
                            <div>
                              <CardTitle className="text-lg">Customização da Interface</CardTitle>
                              <CardDescription className="text-[11px]">Ajuste o tamanho dos botões e etiquetas.</CardDescription>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2 space-y-8 border-t">
                          <div className="space-y-4 mt-2">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tamanho dos Atalhos (Modelos/Fluxos)</Label>
                              <Badge variant="secondary" className="text-[10px]">{metaSettings.shortcut_size}%</Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-muted-foreground">Menor</span>
                              <input 
                                type="range" 
                                min="70" 
                                max="150" 
                                step="5"
                                value={metaSettings.shortcut_size || 100} 
                                onChange={e => setMetaSettings({...metaSettings, shortcut_size: parseInt(e.target.value)})}
                                className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                              <span className="text-[10px] text-muted-foreground">Maior</span>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" style={{ height: `${20 * ((metaSettings.shortcut_size || 100) / 100)}px`, fontSize: `${9 * ((metaSettings.shortcut_size || 100) / 100)}px` }} className="px-2 rounded-md border-primary/20 bg-primary/5 text-primary pointer-events-none">Exemplo Atalho</Button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tamanho das Etiquetas (Status/Filtros)</Label>
                              <Badge variant="secondary" className="text-[10px]">{metaSettings.tag_size}%</Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] text-muted-foreground">Menor</span>
                              <input 
                                type="range" 
                                min="70" 
                                max="150" 
                                step="5"
                                value={metaSettings.tag_size || 100} 
                                onChange={e => setMetaSettings({...metaSettings, tag_size: parseInt(e.target.value)})}
                                className="flex-1 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                              />
                              <span className="text-[10px] text-muted-foreground">Maior</span>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" style={{ height: `${14 * ((metaSettings.tag_size || 100) / 100)}px`, fontSize: `${8 * ((metaSettings.tag_size || 100) / 100)}px` }} className="px-1.2 font-bold pointer-events-none">Exemplo Etiqueta</Badge>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSettings} disabled={saving} size="lg" className="px-10 h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                      {saving ? <RefreshCcw className="mr-3 h-5 w-5 animate-spin" /> : <Save className="mr-3 h-5 w-5" />}
                      Salvar Configurações
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'webhooks' && (
              <ScrollArea className="flex-1 p-8 bg-muted/5">
                <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex flex-col md:flex-row justify-between md:items-center bg-card p-6 rounded-2xl border shadow-sm gap-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Webhooks (API Externa)</h2>
                      <p className="text-muted-foreground text-sm">Conecte sites externos para enviar mensagens automáticas.</p>
                    </div>
                    <Button onClick={() => setIsNewWebhookDialogOpen(true)} className="h-10 bg-primary shadow-lg shadow-primary/20">
                      <Plus className="w-4 h-4 mr-2" /> Novo Webhook
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {webhooks.length === 0 ? (
                      <Card className="p-12 text-center border-dashed border-2 bg-muted/20 rounded-2xl">
                        <Webhook className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
                        <h3 className="text-lg font-medium">Nenhum webhook criado</h3>
                        <p className="text-sm text-muted-foreground">Crie um webhook para integrar seu site ou sistema externo.</p>
                      </Card>
                    ) : (
                      webhooks.map((webhook) => (
                        <Card key={webhook.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-lg">
                                <Webhook className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold">{webhook.name}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={webhook.is_active ? "default" : "secondary"} className="text-[10px]">
                                    {webhook.is_active ? "Ativo" : "Inativo"}
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground font-mono">ID: {webhook.id}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={webhook.is_active} 
                                onCheckedChange={() => toggleWebhookStatus(webhook.id, webhook.is_active)} 
                              />
                              <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                if(confirm("Deseja excluir este webhook?")) handleDeleteWebhook(webhook.id);
                              }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Configurações de Resposta</h4>
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="p-3 bg-muted/30 rounded-xl border">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</Label>
                                    <p className="text-sm font-semibold capitalize">{webhook.response_type === 'text' ? 'Texto' : 'Template'}</p>
                                  </div>
                                  <div className="p-3 bg-muted/30 rounded-xl border">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Etapa Kanban</Label>
                                    <p className="text-sm font-semibold capitalize text-primary">{webhook.default_status || 'Novo'}</p>
                                  </div>
                                  {webhook.response_type === 'template' && (
                                    <div className="p-3 bg-muted/30 rounded-xl border">
                                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Template</Label>
                                      <p className="text-sm font-semibold truncate">{templates.find(t => t.id === webhook.template_id)?.name || 'N/A'}</p>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">URL do Webhook (POST)</Label>
                                  <div className="flex gap-2">
                                    <Input 
                                      readOnly 
                                      value={`https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/crm-webhook`} 
                                      className="font-mono text-[10px] bg-muted/50 rounded-xl"
                                    />
                                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                                      navigator.clipboard.writeText(`https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/crm-webhook`);
                                      toast({ title: "URL copiada!" });
                                    }}>
                                      <Paperclip className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground italic">* Esta URL recebe os dados do seu site para disparar o WhatsApp.</p>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Token de Autenticação</Label>
                                  <div className="flex gap-2">
                                    <Input 
                                      readOnly 
                                      type="password"
                                      value={webhook.secret_token} 
                                      className="font-mono text-[10px] bg-muted/50 rounded-xl"
                                    />
                                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                                      navigator.clipboard.writeText(webhook.secret_token);
                                      toast({ title: "Token copiado!" });
                                    }}>
                                      <Paperclip className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-zinc-950 rounded-2xl p-6 text-zinc-300 overflow-hidden relative border border-white/5 shadow-2xl">
                                <div className="absolute top-4 right-4 text-zinc-700 font-mono text-[10px] tracking-widest">API DOCS</div>
                                <h4 className="text-primary font-bold text-sm mb-4 flex items-center gap-2">
                                  <Play className="w-3 h-3 fill-current" /> Guia de Integração
                                </h4>
                                <div className="space-y-4 font-mono text-[11px]">
                                  <p className="text-zinc-500">// Exemplo de requisição no seu site</p>
                                  <div className="bg-black/50 p-4 rounded-xl border border-white/5 overflow-x-auto whitespace-pre text-emerald-400">
{`fetch("https://adljdeekwifwcdcgbpit.supabase.co/functions/v1/crm-webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    webhook_id: "${webhook.id}",
    token: "${webhook.secret_token}",
    to: "5511999999999",
    message: "Olá, seu acesso ao produto foi liberado!"
  })
});`}
                                  </div>
                                  <div className="space-y-2 pt-2 border-t border-white/5 text-zinc-400 font-sans">
                                    <p className="italic text-[10px]">
                                      <strong className="text-zinc-200">Parâmetros:</strong><br/>
                                      - <code className="text-primary">to</code>: Número do cliente (DDI+DDD+Número)<br/>
                                      - <code className="text-primary">message</code>: Conteúdo da mensagem (se tipo Texto)<br/>
                                      - <code className="text-primary">variables</code>: [Array] Valores para as variáveis do template (se tipo Template)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                <Dialog open={isNewWebhookDialogOpen} onOpenChange={setIsNewWebhookDialogOpen}>
                  <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                        <Webhook className="w-6 h-6 text-primary" /> Novo Webhook
                      </DialogTitle>
                      <DialogDescription className="text-base">
                        Crie um ponto de entrada para disparar mensagens do seu site.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label className="font-bold">Nome de Identificação</Label>
                        <Input 
                          placeholder="Ex: Checkout - Produto A" 
                          value={newWebhook.name}
                          onChange={e => setNewWebhook({...newWebhook, name: e.target.value})}
                          className="rounded-2xl h-12"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="font-bold">Tipo da Mensagem</Label>
                          <Select 
                            value={newWebhook.response_type} 
                            onValueChange={(val: any) => setNewWebhook({...newWebhook, response_type: val, template_id: val === 'text' ? '' : newWebhook.template_id})}
                          >
                            <SelectTrigger className="rounded-2xl h-12">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                              <SelectItem value="text" className="rounded-xl">Texto Livre</SelectItem>
                              <SelectItem value="template" className="rounded-xl">Template Meta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold">Etapa Kanban</Label>
                          <Select 
                            value={newWebhook.default_status} 
                            onValueChange={(val: any) => setNewWebhook({...newWebhook, default_status: val})}
                          >
                            <SelectTrigger className="rounded-2xl h-12">
                              <SelectValue placeholder="Selecione a etapa" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                              <SelectItem value="new" className="rounded-xl">Novo</SelectItem>
                              <SelectItem value="responded" className="rounded-xl">Respondido</SelectItem>
                              <SelectItem value="qualified" className="rounded-xl">Qualificado</SelectItem>
                              <SelectItem value="human" className="rounded-xl">+ Humano</SelectItem>
                              <SelectItem value="closed" className="rounded-xl">Vendido</SelectItem>
                              <SelectItem value="lost" className="rounded-xl">Perdido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {newWebhook.response_type === 'template' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Label className="font-bold">Template Vinculado</Label>
                          <Select 
                            value={newWebhook.template_id} 
                            onValueChange={val => setNewWebhook({...newWebhook, template_id: val})}
                          >
                            <SelectTrigger className="rounded-2xl h-12">
                              <SelectValue placeholder="Selecione um template aprovado" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                              {templates.filter(t => t.status === 'APPROVED').map(t => (
                                <SelectItem key={t.id} value={t.id} className="rounded-xl">{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button variant="ghost" onClick={() => setIsNewWebhookDialogOpen(false)} className="rounded-2xl h-12 px-6">Cancelar</Button>
                      <Button onClick={handleCreateWebhook} disabled={saving || !newWebhook.name} className="rounded-2xl h-12 px-8 bg-primary shadow-lg shadow-primary/20 font-bold">
                        {saving ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Salvar Webhook
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </ScrollArea>
            )}
            {activeTab === 'ai-analysis' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-card p-4 md:p-6 rounded-2xl border shadow-sm">
                    <div className="min-w-0">
                      <h2 className="text-lg md:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-indigo-600 shrink-0" /> <span>Histórico Global de Análises IA</span>
                      </h2>
                      <p className="text-muted-foreground text-xs md:text-sm">Registro cronológico de todas as estratégias e análises geradas.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {(() => {
                      // Create a flattened, sorted list of all analyses from all contacts
                      const allAnalyses = contacts.flatMap(contact => 
                        (contact.ai_strategy_history || []).map((analysis: any) => ({
                          ...analysis,
                          contactId: contact.id,
                          contactName: contact.name || contact.wa_id,
                          waId: contact.wa_id,
                          contactStatus: contact.status,
                          contactObj: contact
                        }))
                      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                      if (allAnalyses.length === 0) {
                        return (
                          <div className="col-span-full py-20 text-center bg-card rounded-3xl border-2 border-dashed">
                            <Zap className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="font-bold text-muted-foreground">Nenhuma análise foi gerada ainda.</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Gere análises diretamente nas conversas com os clientes.</p>
                          </div>
                        );
                      }

                      return allAnalyses.map((item, i) => (
                        <Card key={`${item.contactId}-${i}`} className="rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[280px] hover:shadow-md transition-all group">
                          <CardHeader className="bg-muted/30 border-b p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <User className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <CardTitle className="text-xs font-bold truncate">{item.contactName}</CardTitle>
                                  <p className="text-[9px] text-muted-foreground">{item.waId}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[8px] uppercase px-1.5 h-4 shrink-0">
                                {item.type || 'Estratégia'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent 
                            className="p-4 flex-1 cursor-pointer overflow-hidden relative"
                            onClick={() => setSelectedAnalysis(item)}
                          >
                            <p className="text-xs leading-relaxed text-zinc-600 italic line-clamp-6">
                              {item.strategy}
                            </p>
                            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                          </CardContent>
                          <div className="p-3 bg-muted/10 border-t flex items-center justify-between gap-2">
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')} {new Date(item.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </span>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-[9px] font-bold h-7 px-2 gap-1 hover:bg-primary/10"
                                onClick={() => {
                                  setSelectedContact(item.contactObj);
                                  setActiveTab('contacts');
                                }}
                              >
                                <MessageSquare className="w-3 h-3" /> Chat
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-[9px] font-bold h-7 px-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                onClick={() => setSelectedAnalysis(item)}
                              >
                                <Eye className="w-3 h-3" /> Ver
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ));
                    })()}
                  </div>
                </div>
              </ScrollArea>
            )}

            {activeTab === 'help' && (
              <ScrollArea className="flex-1 p-3 sm:p-4 md:p-8 bg-muted/5">
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                  <div className="flex items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                      <LucideIcons.HelpCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Centro de Ajuda e Tutoriais</h2>
                      <p className="text-muted-foreground">Guia completo para dominar todas as ferramentas do seu CRM.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-primary/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" /> Dashboard e Métricas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm text-primary">Métricas Gerais</h4>
                            <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                              <li><strong>Mensagens Enviadas:</strong> Total de mensagens que saíram do seu número.</li>
                              <li><strong>Respondidas:</strong> Contatos que enviaram ao menos uma mensagem de volta.</li>
                              <li><strong>Contatos Qualificados:</strong> Leads marcados com a etiqueta "Qualificado".</li>
                              <li><strong>Conversas 24h (Hoje):</strong> Volume de interações únicas nas últimas 24 horas.</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm text-primary">Custos e Janelas</h4>
                            <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                              <li><strong>Conversas Pagas:</strong> Cobrança da Meta quando você inicia uma conversa fora da janela de 24h.</li>
                              <li><strong>Janela Grátis:</strong> Período de 24h após a última mensagem do cliente onde você não paga por envios.</li>
                              <li><strong>Resumo Semanal:</strong> Comparativo de performance dos últimos 7 dias.</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-emerald-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-emerald-500" /> CRM Kanban e Conversas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <p className="text-sm text-muted-foreground">O coração do seu atendimento. Organize leads por funil de vendas.</p>
                        <div className="space-y-3">
                          <div className="p-3 bg-muted/30 rounded-xl">
                            <h4 className="text-xs font-bold mb-1">Visualização Kanban</h4>
                            <p className="text-[11px] text-muted-foreground">Arraste e solte contatos entre as colunas (Novo Lead, Em Atendimento, Qualificado, etc.) para gerenciar seu progresso.</p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-xl">
                            <h4 className="text-xs font-bold mb-1">Chat em Tempo Real</h4>
                            <p className="text-[11px] text-muted-foreground">Envie textos, áudios (com transcrição), imagens e vídeos. O sistema detecta se o áudio foi "gravado na hora" para maior autoridade.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-blue-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <GitBranch className="w-5 h-5 text-blue-500" /> Fluxos e Gatilhos (Automação)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-sm">O que são Fluxos?</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                              Sequências lógicas de mensagens, perguntas e ações. Você pode criar caminhos onde o cliente clica em botões e o sistema responde automaticamente.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border p-3 rounded-xl">
                              <h5 className="text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> Gatilhos (Triggers)</h5>
                              <p className="text-[10px] text-muted-foreground mt-1">Palavras-chave, primeira mensagem ou inatividade. Eles disparam o fluxo sozinho.</p>
                            </div>
                            <div className="border p-3 rounded-xl">
                              <h5 className="text-[11px] font-bold flex items-center gap-1"><UserPlus className="w-3 h-3" /> Etiqueta Automática</h5>
                              <p className="text-[10px] text-muted-foreground mt-1">Configure o fluxo para colocar o contato em uma etiqueta (Ex: "Interesse Produto X") logo no início.</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-purple-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <Bot className="w-5 h-5 text-purple-500" /> Agente IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600"><Bot className="w-4 h-4" /></div>
                            <div>
                              <h5 className="text-xs font-bold">Assistente Inteligente</h5>
                              <p className="text-[11px] text-muted-foreground">Responde seus clientes automaticamente usando o conhecimento configurado no "Cérebro" e nos seus templates.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-amber-100 text-amber-600"><CreditCard className="w-4 h-4" /></div>
                            <div>
                              <h5 className="text-xs font-bold">Saldo e Pagamentos</h5>
                              <p className="text-[11px] text-muted-foreground">O envio de templates aprovados e conversas de marketing via IA possuem um custo médio de R$ 0,33 por mensagem pela Meta.</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-orange-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-orange-500" /> Disparador e Agendamentos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm">Disparador em Massa</h4>
                            <p className="text-xs text-muted-foreground">Envie uma mensagem ou inicie um fluxo para centenas de contatos filtrados por etiqueta de uma só vez.</p>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm">Agendamentos</h4>
                            <p className="text-xs text-muted-foreground">Programe mensagens para datas e horários específicos. Ideal para lembretes de reuniões ou follow-ups futuros.</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border shadow-sm overflow-hidden">
                      <CardHeader className="bg-zinc-500/5 border-b">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-zinc-600" /> Contatos e Google
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-bold text-sm">Sincronização Google</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Conecte sua conta Google para importar milhares de contatos. O sistema processa em segundo plano e filtra apenas números válidos para WhatsApp. Você também pode ativar a sincronização automática para novos leads.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ScrollArea>
            )}
          </main>
        </SidebarInset>
      </div>
      {isFlowEditorOpen && (
        <FlowEditor 
          flow={editingFlow} 
          onSave={handleSaveFlow} 
          onClose={() => { setIsFlowEditorOpen(false); setEditingFlow(null); }} 
        />
      )}
      {previewMedia && (
        <MediaPopup 
          url={previewMedia.url} 
          type={previewMedia.type} 
          onClose={() => setPreviewMedia(null)} 
        />
      )}

      <Dialog open={isSyncingContacts} onOpenChange={setIsSyncingContacts}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <DialogTitle className="text-xl">Sincronizando Contatos</DialogTitle>
            <DialogDescription>
              Aguarde enquanto buscamos seus contatos do Google...
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <Progress value={syncProgress} className="h-2" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              {syncProgress < 100 ? 'Sincronizando...' : 'Concluído!'}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isContactInfoOpen} onOpenChange={setIsContactInfoOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader className="items-center pb-4 border-b">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold">{contactToView?.id ? 'Informações do Contato' : 'Novo Contato'}</DialogTitle>
            <DialogDescription>
              {contactToView?.id 
                ? `Visualize e edite os detalhes de ${contactToView?.name || contactToView?.wa_id}`
                : 'Adicione um novo contato manualmente à sua lista.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Nome</Label>
                <Input 
                  value={contactToView?.name || ''} 
                  onChange={e => setContactToView({...contactToView, name: e.target.value})}
                  placeholder="Nome do contato"
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">WhatsApp / ID</Label>
                <Input 
                  value={contactToView?.wa_id || ''} 
                  onChange={e => setContactToView({...contactToView, wa_id: e.target.value})}
                  readOnly={!!contactToView?.id}
                  placeholder="Ex: 5511999999999"
                  className={cn(
                    "bg-muted/30 border-none h-10 rounded-xl text-sm",
                    contactToView?.id && "opacity-70 cursor-not-allowed bg-muted/20"
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Biografia / Observações</Label>
              <Textarea 
                value={contactToView?.metadata?.bio || ''} 
                onChange={e => setContactToView({...contactToView, metadata: { ...contactToView?.metadata, bio: e.target.value }})}
                placeholder="Descreva informações importantes..."
                className="bg-muted/30 border-none rounded-xl min-h-[80px] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <Instagram className="w-3 h-3" /> Instagram
                </Label>
                <Input 
                  value={contactToView?.metadata?.instagram || ''} 
                  onChange={e => setContactToView({...contactToView, metadata: { ...contactToView?.metadata, instagram: e.target.value }})}
                  placeholder="@usuario ou link"
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <Facebook className="w-3 h-3" /> Facebook
                </Label>
                <Input 
                  value={contactToView?.metadata?.facebook || ''} 
                  onChange={e => setContactToView({...contactToView, metadata: { ...contactToView?.metadata, facebook: e.target.value }})}
                  placeholder="link da página"
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" /> Outros Links
                </Label>
                <Input 
                  value={contactToView?.metadata?.links || ''} 
                  onChange={e => setContactToView({...contactToView, metadata: { ...contactToView?.metadata, links: e.target.value }})}
                  placeholder="https://site.com"
                  className="bg-muted/30 border-none h-10 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsContactInfoOpen(false)} className="rounded-xl h-12 px-6">Fechar</Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20"
              onClick={async () => {
                const { id, ...rest } = contactToView;
                if (id) {
                  await supabase.from('crm_contacts').update({ 
                    name: contactToView.name,
                    metadata: contactToView.metadata 
                  }).eq('id', id);
                } else {
                  const { error } = await supabase.from('crm_contacts').insert([{
                    name: contactToView.name,
                    wa_id: contactToView.wa_id,
                    metadata: contactToView.metadata,
                    status: 'new',
                    source_type: 'system'
                  }]);
                  if (error) {
                    toast({ title: "Erro ao criar contato", variant: "destructive" });
                    return;
                  }
                }
                toast({ title: id ? "Contato atualizado!" : "Contato criado!" });
                fetchContacts();
                if (selectedContact?.id === contactToView.id) {
                  setSelectedContact({ ...selectedContact, name: contactToView.name, metadata: contactToView.metadata });
                }
                setIsContactInfoOpen(false);
              }}
            >
              <Save className="w-4 h-4 mr-2" /> Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportExportOpen} onOpenChange={setIsImportExportOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" /> Gerenciar Contatos
            </DialogTitle>
            <DialogDescription>Exporte sua lista atual ou importe novos contatos via CSV ou vCard.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-4 py-6">
            <div className="p-4 rounded-2xl border-2 border-dashed border-muted bg-muted/5 flex flex-col items-center gap-4 text-center">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Exportar Lista</p>
                <p className="text-[10px] text-muted-foreground">Baixe todos os contatos para backups ou importação.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button variant="outline" size="sm" className="rounded-xl text-[11px]" onClick={() => handleExportContacts('csv')}>
                  <Download className="w-3 h-3 mr-1.5" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl text-[11px]" onClick={() => handleExportContacts('vcard')}>
                  <UserPlus className="w-3 h-3 mr-1.5" /> vCard
                </Button>
              </div>
            </div>

            <div className="p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center gap-4 text-center">
              <div className="p-3 rounded-full bg-primary/20 text-primary">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold">Importar Lista</p>
                <p className="text-xs text-muted-foreground">Adicione contatos em massa enviando um arquivo CSV ou vCard.</p>
              </div>
              <Label htmlFor="import-file" className="w-full">
                <Button variant="default" className="w-full rounded-xl pointer-events-none">
                  Selecionar Arquivo
                </Button>
              </Label>
              <input 
                id="import-file" 
                type="file" 
                accept=".csv,.vcf,.vcard" 
                className="hidden" 
                onChange={(e) => {
                  handleImportContacts(e);
                  setIsImportExportOpen(false);
                }} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsImportExportOpen(false)} className="w-full rounded-xl h-11">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSchedulingOpen} onOpenChange={setIsSchedulingOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-full max-w-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-none shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <CalendarClock className="w-5 h-5" /> Novo Agendamento
            </DialogTitle>
            <DialogDescription className="text-zinc-500">Agende templates aprovados para seus contatos de forma organizada.</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            <Button 
              variant={selectedCampaignType === 'individual' ? 'default' : 'outline'}
              className={cn("h-11 rounded-xl text-[10px] font-bold px-1 transition-all", 
                selectedCampaignType === 'individual' 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")}
              onClick={() => { setSelectedCampaignType('individual'); setSelectedContactsForScheduling([]); setScheduleType('template'); }}
            >
              <User className="w-4 h-4 mr-1.5" /> Individual
            </Button>
            <Button 
              variant={selectedCampaignType === 'batch' ? 'default' : 'outline'}
              className={cn("h-11 rounded-xl text-[10px] font-bold px-1 transition-all", 
                selectedCampaignType === 'batch' 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")}
              onClick={() => { setSelectedCampaignType('batch'); setSelectedContactsForScheduling([]); setScheduleType('template'); }}
            >
              <Users className="w-4 h-4 mr-1.5" /> Massa
            </Button>
            <Button 
              variant={selectedCampaignType === 'list' ? 'default' : 'outline'}
              className={cn("h-11 rounded-xl text-[10px] font-bold px-1 transition-all", 
                selectedCampaignType === 'list' 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")}
              onClick={() => { setSelectedCampaignType('list'); setSelectedContactsForScheduling([]); setScheduleType('template'); }}
            >
              <FileText className="w-4 h-4 mr-1.5" /> vCard / TXT
            </Button>
            <Button 
              variant={selectedCampaignType === 'birthday' ? 'default' : 'outline'}
              className={cn("h-11 rounded-xl text-[10px] font-bold px-1 transition-all", 
                selectedCampaignType === 'birthday' 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50")}
              onClick={() => { setSelectedCampaignType('birthday'); setSelectedContactsForScheduling([]); setScheduleType('template'); }}
            >
              <Calendar className="w-4 h-4 mr-1.5" /> Aniversário
            </Button>
          </div>

          <ScrollArea className="flex-1 pr-2 sm:pr-4 -mr-2 sm:-mr-4 py-4">
            <div className="space-y-6">
              {/* Configuração baseada no tipo de campanha */}
              {selectedCampaignType === 'individual' && (
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">1. Selecionar Contato</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Pesquisar..." 
                      className="pl-9 h-11 rounded-xl bg-zinc-100 border-none text-zinc-900 placeholder:text-zinc-400"
                      value={scheduleSearch}
                      onChange={e => setScheduleSearch(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto p-1">
                    {contacts
                      .filter(c => {
                        if (!scheduleSearch) return true;
                        const q = scheduleSearch.toLowerCase();
                        return c.name?.toLowerCase().includes(q) || c.wa_id?.includes(scheduleSearch);
                      })
                      .slice(0, 20)
                      .map(contact => (
                        <div 
                          key={contact.id}
                          onClick={() => setSelectedContactsForScheduling([contact.id])}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                            selectedContactsForScheduling.includes(contact.id)
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-transparent bg-zinc-100/50 hover:bg-zinc-100"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            selectedContactsForScheduling.includes(contact.id) ? "bg-primary/20" : "bg-muted-foreground/10"
                          )}>
                            <User className={cn("w-4 h-4", selectedContactsForScheduling.includes(contact.id) ? "text-primary" : "text-zinc-400")} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{contact.name || contact.wa_id}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{contact.wa_id}</p>
                          </div>
                          {contact.last_message_received_at && (
                            <div className={cn(
                              "ml-auto w-2 h-2 rounded-full",
                              (Date.now() - new Date(contact.last_message_received_at).getTime() < 24 * 60 * 60 * 1000) ? "bg-emerald-500" : "bg-zinc-300"
                            )} title={(Date.now() - new Date(contact.last_message_received_at).getTime() < 24 * 60 * 60 * 1000) ? "Janela Ativa" : "Janela Expirada"} />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {selectedCampaignType === 'batch' && (
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                    <span>1. Selecionar Massa de Contatos</span>
                    <span className="text-primary">{selectedContactsForScheduling.length} selecionados</span>
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Pesquisar..." 
                      className="pl-9 h-11 rounded-xl bg-zinc-100 border-none text-zinc-900 placeholder:text-zinc-400"
                      value={scheduleSearch}
                      onChange={e => setScheduleSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1 rounded-lg border-zinc-200 bg-white hover:bg-zinc-50" onClick={() => setSelectedContactsForScheduling(contacts.map(c => c.id))}>Selecionar Todos</Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1 rounded-lg border-zinc-200 bg-white hover:bg-zinc-50" onClick={() => setSelectedContactsForScheduling([])}>Limpar</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto p-1">
                    {contacts
                      .filter(c => {
                        if (!scheduleSearch) return true;
                        const q = scheduleSearch.toLowerCase();
                        return c.name?.toLowerCase().includes(q) || c.wa_id?.includes(scheduleSearch);
                      })
                      .slice(0, 30)
                      .map(contact => (
                        <div 
                          key={contact.id}
                          onClick={() => {
                            setSelectedContactsForScheduling(prev => 
                              prev.includes(contact.id) ? prev.filter(id => id !== contact.id) : [...prev, contact.id]
                            );
                          }}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer",
                            selectedContactsForScheduling.includes(contact.id) ? "border-primary bg-primary/5" : "border-transparent bg-zinc-100/50 hover:bg-zinc-100"
                          )}
                        >
                          <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0", selectedContactsForScheduling.includes(contact.id) ? "bg-primary border-primary" : "border-zinc-300")}>
                            {selectedContactsForScheduling.includes(contact.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <p className="text-[10px] font-bold truncate flex-1">{contact.name || contact.wa_id}</p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {selectedCampaignType === 'list' && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                    <span>1. Lista de Contatos (vCard ou TXT)</span>
                    <Badge variant="outline" className="text-[9px] font-bold">Importação Direta</Badge>
                  </Label>
                  <Textarea 
                    placeholder="Cole aqui os números (um por linha) ou o conteúdo de um arquivo vCard..."
                    className="min-h-[120px] rounded-xl bg-zinc-100 border-none resize-none font-mono text-[11px] text-zinc-900 placeholder:text-zinc-400"
                    value={contactListText}
                    onChange={e => setContactListText(e.target.value)}
                  />
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-100 border border-zinc-200">
                    <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
                    <p className="text-[10px] text-zinc-500">
                      Os números serão cadastrados automaticamente se não existirem. Formatos aceitos: <span className="font-bold">5511999999999</span> ou <span className="font-bold">vCard (.vcf)</span>.
                    </p>
                  </div>
                </div>
              )}

              {selectedCampaignType === 'birthday' && (
                <div className="space-y-4 border p-4 rounded-2xl bg-primary/5 border-primary/20">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Plus className="w-3 h-3" /> Cadastro de Aniversariante
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-600">Nome Completo</Label>
                        <Input placeholder="Nome do aniversariante" value={birthdayName} onChange={e => setBirthdayName(e.target.value)} className="h-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-zinc-600">WhatsApp (com DDI)</Label>
                        <Input placeholder="Ex: 5511999999999" value={birthdayNumber} onChange={e => setBirthdayNumber(e.target.value)} className="h-10 rounded-xl bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400" />
                      </div>
                    </div>
                    <p className="text-[9px] text-zinc-500 italic">* O aniversariante será cadastrado automaticamente como um novo contato.</p>
                  </div>
                </div>
              )}

              {/* Tipo de Agendamento */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-500">2. O que deseja agendar?</Label>
                <Tabs value={scheduleType} onValueChange={(val: any) => setScheduleType(val)} className="w-full">
                  <TabsList className="grid grid-cols-1 h-12 bg-zinc-100 rounded-xl p-1 gap-1">
                    <TabsTrigger value="template" className="rounded-lg text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Template Aprovado</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Conteúdo dinâmico baseado no tipo */}
              <div className="space-y-4 animate-in fade-in duration-300">
                {scheduleType === 'template' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-xs font-bold uppercase tracking-wider">Aviso de Cobrança</p>
                      </div>
                      <p className="text-xs text-amber-700 leading-relaxed">
                        Agendamentos serão enviados apenas com <span className="font-bold">templates aprovados pela Meta</span>. 
                        Isso gera um custo médio de <span className="font-bold text-amber-900">R$ 0,33</span> por disparo enviado.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-zinc-700">Selecione o Template Aprovado</Label>
                      {templates.filter(t => t.status === 'APPROVED').length > 0 ? (
                        <>
                          <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                            <SelectTrigger className="h-11 rounded-xl bg-zinc-100 border-none text-zinc-900">
                              <SelectValue placeholder="Escolha um modelo..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {templates.filter(t => t.status === 'APPROVED').map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-emerald-600 font-medium italic flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Templates podem ser agendados para qualquer contato (Mesmo janelas expiradas).
                          </p>
                        </>
                      ) : (
                        <div className="p-4 rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-center space-y-3">
                          <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="w-6 h-6 text-zinc-400" />
                            <p className="text-sm font-medium text-zinc-600">Você ainda não possui modelos aprovados pela Meta.</p>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full rounded-xl bg-primary text-white font-bold"
                            onClick={() => {
                              setIsSchedulingOpen(false);
                              setActiveTab('templates');
                            }}
                          >
                            Criar meu primeiro Template
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-2 text-zinc-700"><Calendar className="w-3 h-3 text-primary" /> Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal rounded-xl bg-zinc-100 border-none text-zinc-900",
                          !scheduleDateObj && "text-zinc-400"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {scheduleDateObj ? format(scheduleDateObj, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] p-0 rounded-2xl border-none shadow-2xl pointer-events-auto" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={scheduleDateObj}
                        onSelect={(date) => {
                          setScheduleDateObj(date);
                          if (date) setScheduleDate(format(date, "yyyy-MM-dd"));
                        }}
                        initialFocus
                        locale={ptBR}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold flex items-center gap-2 text-zinc-700"><Clock className="w-3 h-3 text-primary" /> Hora</Label>
                  <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="h-11 rounded-xl bg-zinc-100 border-none text-zinc-900" />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => { setIsSchedulingOpen(false); setSelectedContactsForScheduling([]); }} className="rounded-xl h-11 px-6 w-full sm:w-auto text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">Cancelar</Button>
            <Button 
              onClick={selectedCampaignType === 'birthday' ? handleScheduleBirthday : handleScheduleBatch} 
              disabled={isScheduling || (selectedCampaignType === 'individual' && selectedContactsForScheduling.length === 0) || (selectedCampaignType === 'batch' && selectedContactsForScheduling.length === 0) || (selectedCampaignType === 'list' && !contactListText.trim())}
              className="rounded-xl h-11 bg-primary px-4 sm:px-8 shadow-lg shadow-primary/20 font-bold w-full sm:w-auto"
            >
              {isScheduling ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {selectedCampaignType === 'birthday' ? 'Agendar Aniversário' : 
               selectedCampaignType === 'list' ? 'Agendar Lista' : 
               `Agendar para ${selectedContactsForScheduling.length} contatos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isMetricsListOpen} onOpenChange={setIsMetricsListOpen}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {metricsListType === 'paid' && <><DollarSign className="w-5 h-5 text-orange-500" /> Conversas Pagas (Mês)</>}
              {metricsListType === 'active' && <><Clock className="w-5 h-5 text-emerald-500" /> Janela 24h Aberta (Grátis)</>}
              {metricsListType === 'weekly_paid' && <><DollarSign className="w-5 h-5 text-emerald-500" /> Pagas (Semanal)</>}
              {metricsListType === 'weekly_active' && <><Clock className="w-5 h-5 text-emerald-500" /> Ativas (Semanal)</>}
            </DialogTitle>
            <DialogDescription>
              {metricsListType === 'paid' && "Lista de contatos que iniciaram uma nova cobrança este mês."}
              {metricsListType === 'active' && "Contatos com janela de resposta gratuita ativa."}
              {metricsListType === 'weekly_paid' && "Contatos que geraram cobrança nos últimos 7 dias."}
              {metricsListType === 'weekly_active' && "Contatos únicos que interagiram na última semana."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {metricsListData.length > 0 ? metricsListData.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedContact(contact);
                      setActiveTab('contacts');
                      setIsMetricsListOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{contact.name || contact.wa_id}</p>
                        <p className="text-[10px] text-muted-foreground">{contact.wa_id}</p>
                      </div>
                    </div>
                    <Badge className={cn("text-[10px] uppercase font-black", getStatusColor(contact.status))}>
                      {getStatusLabel(contact.status)}
                    </Badge>
                  </div>
                )) : (
                  <div className="text-center py-10 opacity-50">Nenhum contato encontrado.</div>
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsMetricsListOpen(false)} className="w-full rounded-xl">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedAnalysis} onOpenChange={(open) => !open && setSelectedAnalysis(null)}>
        <DialogContent className="max-w-[95vw] md:max-w-3xl rounded-3xl p-6 border-none shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {selectedAnalysis?.type || 'Estratégia de Venda'}
                  </DialogTitle>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3" /> {selectedAnalysis?.contactName} • {new Date(selectedAnalysis?.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6">
            <div className="bg-muted/30 border-l-4 border-indigo-500 rounded-r-2xl p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 font-medium">
                {selectedAnalysis?.strategy}
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
            <Button 
              variant="outline" 
              className="flex-1 rounded-xl h-11 font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              onClick={() => copyToClipboard(selectedAnalysis?.strategy, "Análise IA")}
            >
              <Copy className="w-4 h-4 mr-2" /> Copiar Texto
            </Button>
            <Button 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 font-bold shadow-lg shadow-indigo-500/20"
              onClick={() => {
                setSelectedContact(selectedAnalysis?.contactObj);
                setActiveTab('contacts');
                setSelectedAnalysis(null);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" /> Abrir Conversa
            </Button>
            <Button 
              variant="ghost" 
              className="sm:w-24 rounded-xl h-11"
              onClick={() => setSelectedAnalysis(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewStatusDialogOpen} onOpenChange={setIsNewStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Nova Etiqueta Kanban</DialogTitle>
            <DialogDescription>Crie uma nova etapa para o seu funil de vendas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etiqueta</Label>
              <Input 
                placeholder="Ex: Prospectando, Reunião Agendada..." 
                value={newStatusData.label}
                onChange={e => setNewStatusData({...newStatusData, label: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor da Etiqueta</Label>
              <Select value={newStatusData.color} onValueChange={val => setNewStatusData({...newStatusData, color: val})}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="yellow">Amarelo</SelectItem>
                  <SelectItem value="purple">Roxo</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="red">Vermelho</SelectItem>
                  <SelectItem value="orange">Laranja</SelectItem>
                  <SelectItem value="indigo">Índigo</SelectItem>
                  <SelectItem value="pink">Rosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewStatusDialogOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button onClick={handleCreateStatus} disabled={saving || !newStatusData.label} className="rounded-xl h-11 px-8 bg-primary">Criar Etiqueta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditStatusDialogOpen} onOpenChange={setIsEditStatusDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Etiqueta</DialogTitle>
            <DialogDescription>Altere as informações da etapa do funil.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etiqueta</Label>
              <Input 
                placeholder="Nome..." 
                value={editingStatus?.label || ''}
                onChange={e => setEditingStatus({...editingStatus, label: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Cor da Etiqueta</Label>
              <Select value={editingStatus?.color} onValueChange={val => setEditingStatus({...editingStatus, color: val})}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Azul</SelectItem>
                  <SelectItem value="yellow">Amarelo</SelectItem>
                  <SelectItem value="purple">Roxo</SelectItem>
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="red">Vermelho</SelectItem>
                  <SelectItem value="orange">Laranja</SelectItem>
                  <SelectItem value="indigo">Índigo</SelectItem>
                  <SelectItem value="pink">Rosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <RefreshCcw className={cn("w-4 h-4 text-zinc-500", editingStatus?.is_starred && "text-yellow-500 fill-yellow-500")} /> 
                  Destacar no Chat
                </Label>
                <p className="text-[10px] text-muted-foreground">Exibir como botão fixo no cabeçalho da conversa.</p>
              </div>
              <Switch 
                checked={editingStatus?.is_starred || false}
                onCheckedChange={(val) => setEditingStatus({...editingStatus, is_starred: val})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditStatusDialogOpen(false)} className="rounded-xl h-11">Cancelar</Button>
            <Button onClick={handleUpdateStatus} disabled={saving || !editingStatus?.label} className="rounded-xl h-11 px-8 bg-primary">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default CRM;

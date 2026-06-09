import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Send, 
  Users, 
  FileText, 
  GitBranch, 
  Play, 
  Pause, 
  Trash2, 
  Clock, 
  History, 
  HelpCircle, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  RefreshCcw,
  Plus,
  Upload,
  ArrowRight,
  Save
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";



interface BroadcasterProps {
  templates: any[];
  flows: any[];
  contacts: any[];
  statuses: any[];
}

const Broadcaster = ({ templates, flows, contacts, statuses }: BroadcasterProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  
  // New campaign state
  const [name, setName] = useState('');
  const [type, setType] = useState<'message' | 'template' | 'flow'>('message');
  const [targetType, setTargetType] = useState<'contacts' | 'conversation' | 'uploaded' | 'tag'>('contacts');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [uploadedNumbers, setUploadedNumbers] = useState('');
  const [delayMin, setDelayMin] = useState(10);
  const [delayMax, setDelayMax] = useState(60);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsingType, setParsingType] = useState<'vcard' | 'csv' | null>(null);

  // 24h Countdown trigger state
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [countdownThreshold, setCountdownThreshold] = useState(60);
  const [countdownType, setCountdownType] = useState<'message' | 'template' | 'flow'>('message');
  const [countdownContent, setCountdownContent] = useState('');
  const [countdownTemplate, setCountdownTemplate] = useState('');
  const [countdownFlow, setCountdownFlow] = useState('');
  const [savingCountdown, setSavingCountdown] = useState(false);

  useEffect(() => {
    fetchBroadcasts();
    fetchCountdownSettings();
  }, []);

  const fetchCountdownSettings = async () => {
    const { data: settings } = await supabase
      .from('crm_settings')
      .select('countdown_trigger_enabled, countdown_trigger_threshold_minutes, countdown_trigger_message_type, countdown_trigger_content, countdown_trigger_flow_id, countdown_trigger_template_id')
      .maybeSingle();

    if (settings) {
      setCountdownEnabled(settings.countdown_trigger_enabled || false);
      setCountdownThreshold(settings.countdown_trigger_threshold_minutes || 60);
      setCountdownType(settings.countdown_trigger_message_type as 'message' | 'template' | 'flow' || 'message');
      setCountdownContent(settings.countdown_trigger_content || '');
      setCountdownTemplate(settings.countdown_trigger_template_id || '');
      setCountdownFlow(settings.countdown_trigger_flow_id || '');
    }
  };

  const handleSaveCountdown = async () => {
    setSavingCountdown(true);
    try {
      const { error } = await supabase
        .from('crm_settings')
        .update({
          countdown_trigger_enabled: countdownEnabled,
          countdown_trigger_threshold_minutes: countdownThreshold,
          countdown_trigger_message_type: countdownType,
          countdown_trigger_content: countdownContent,
          countdown_trigger_template_id: countdownTemplate,
          countdown_trigger_flow_id: countdownFlow || null
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
      toast({ title: "Configuração de 24h salva!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSavingCountdown(false);
    }
  };


  const fetchBroadcasts = async () => {
    const { data } = await supabase
      .from('crm_broadcasts')
      .select('*')
      .order('created_at', { ascending: false });
    setBroadcasts(data || []);
  };

  const handleStartBroadcast = async () => {
    if (!name) {
      toast({ title: "Dê um nome à campanha", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let numbers: string[] = [];
      const DAY = 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      if (targetType === 'conversation') {
        // Filtrar apenas contatos que responderam nas últimas 24 horas (Janela Ativa)
        numbers = contacts
          .filter(c => c.last_message_received_at && (now - new Date(c.last_message_received_at).getTime()) < DAY)
          .map(c => c.wa_id);
      } else {
        // Lista Geral/Etiqueta/Upload
        let potentialNumbers: string[] = [];
        
        if (targetType === 'contacts') {
          potentialNumbers = contacts.map(c => c.wa_id);
        } else if (targetType === 'tag') {
          if (!selectedStatus) {
            toast({ title: "Selecione uma etiqueta", variant: "destructive" });
            setLoading(false);
            return;
          }
          potentialNumbers = contacts.filter(c => c.status === selectedStatus).map(c => c.wa_id);
        } else if (targetType === 'uploaded') {
          potentialNumbers = uploadedNumbers
            .split('\n')
            .map(n => n.trim().replace(/\D/g, ''))
            .filter(n => n.length >= 10);
        }

        // REGRAS DE DISPARO (META API)
        if (type === 'template') {
          // Templates podem ser enviados para qualquer um (Lista Fria ou Janela Ativa)
          numbers = potentialNumbers;
        } else {
          // Mensagem normal e Fluxos só podem ser enviados para Janela Ativa (24h)
          const activeNumbers = contacts
            .filter(c => potentialNumbers.includes(c.wa_id) && c.last_message_received_at && (now - new Date(c.last_message_received_at).getTime()) < DAY)
            .map(c => c.wa_id);
          
          const coldCount = potentialNumbers.length - activeNumbers.length;
          
          if (activeNumbers.length === 0 && potentialNumbers.length > 0) {
            toast({ 
              title: "Atenção: Regra de 24h", 
              description: `Para lista fria ou contatos fora das 24h, você só pode enviar "Templates". Mensagens e Fluxos são bloqueados pela Meta para evitar spam fora da janela ativa.`, 
              variant: "destructive" 
            });
            setLoading(false);
            return;
          }

          if (coldCount > 0) {
            toast({ 
              title: "Filtro Ativo", 
              description: `${coldCount} contatos fora da janela de 24h foram removidos. Use "Template" para falar com eles.`,
            });
          }
          numbers = activeNumbers;
        }
      }

      if (numbers.length === 0) {
        toast({ title: "Nenhum número válido encontrado", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from('crm_broadcasts')
        .insert([{
          name,
          type,
          target_type: targetType,
          message_text: type === 'message' ? messageText : null,
          template_id: type === 'template' ? selectedTemplate : null,
          flow_id: type === 'flow' ? selectedFlow : null,
          random_delay_min: delayMin,
          random_delay_max: delayMax,
          total_contacts: numbers.length,
          uploaded_numbers: (targetType === 'uploaded' || targetType === 'tag' || targetType === 'conversation' || targetType === 'contacts') ? numbers : null,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Campanha criada com sucesso!" });
      fetchBroadcasts();
      
      // Reset form
      setName('');
      setMessageText('');
      setUploadedNumbers('');
      
      // Here we would ideally trigger an edge function to process the queue
      // For now, let's just simulate the start
      await processBroadcast(data.id, numbers);

    } catch (err: any) {
      toast({ title: "Erro ao criar campanha", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const processBroadcast = async (broadcastId: string, numbers: string[]) => {
    // This is a simplified client-side processor
    // In a production app, this should be an Edge Function or Database Hook
    toast({ title: "Iniciando disparos...", description: `Total: ${numbers.length} números` });
    
    // Update status to running
    await supabase.from('crm_broadcasts').update({ status: 'running' }).eq('id', broadcastId);
    
    // We'll just update the DB records one by one in this simulation
    // In reality, you'd insert into crm_scheduled_messages
    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];
      
      // Wait random delay
      const delay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        // Send actual message
        const payload: any = { action: 'sendMessage', to: number };
        if (type === 'message') payload.text = messageText;
        else if (type === 'template') {
          const t = templates.find(temp => temp.id === selectedTemplate);
          payload.action = 'sendTemplate';
          payload.templateName = t?.name;
          payload.language = t?.language || 'pt_BR';
        } else if (type === 'flow') {
          // Find contact or create one
          const { data: contact } = await supabase.from('crm_contacts').select('id').eq('wa_id', number).maybeSingle();
          payload.action = 'startFlow';
          payload.flowId = selectedFlow;
          payload.waId = number;
          if (contact) payload.contactId = contact.id;
        }

        await supabase.functions.invoke('meta-whatsapp-crm', { body: payload });
        
        await supabase.from('crm_broadcasts')
          .update({ sent_count: i + 1 })
          .eq('id', broadcastId);
          
      } catch (err) {
        console.error("Error sending to", number, err);
        // Update failed count
        await (supabase.rpc as any)('increment_broadcast_failed', { b_id: broadcastId });
      }
    }
    
    await supabase.from('crm_broadcasts').update({ status: 'completed' }).eq('id', broadcastId);
    fetchBroadcasts();
    toast({ title: "Campanha finalizada!" });
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm('Deseja excluir este histórico?')) return;
    await supabase.from('crm_broadcasts').delete().eq('id', id);
    fetchBroadcasts();
  };

  const handleFileUpload = (type: 'vcard' | 'csv') => {
    setParsingType(type);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (parsingType === 'vcard') {
        // Extract numbers from VCard
        // Typical VCard entry: TEL;CELL;PREF:+55 11 99999-9999
        const telMatches = content.match(/TEL.*:([+\d\s\-()]+)/gi);
        if (telMatches) {
          const extracted = telMatches.map(m => {
            const num = m.split(':')[1].replace(/\D/g, '');
            return num;
          }).filter(n => n.length >= 10);
          setUploadedNumbers(prev => (prev ? prev + '\n' : '') + extracted.join('\n'));
          toast({ title: `${extracted.length} números extraídos do VCard` });
        }
      } else if (parsingType === 'csv') {
        // Simple CSV/Excel export parser (just look for long numbers)
        const lines = content.split('\n');
        const extracted: string[] = [];
        lines.forEach(line => {
          const matches = line.match(/\d{10,14}/g);
          if (matches) extracted.push(...matches);
        });
        setUploadedNumbers(prev => (prev ? prev + '\n' : '') + extracted.join('\n'));
        toast({ title: `${extracted.length} números extraídos do arquivo` });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 md:space-y-6 pb-24 md:pb-8 p-3 md:p-8 animate-in fade-in duration-500 overflow-x-hidden">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111b21] p-4 md:p-6 rounded-2xl border border-white/5 shadow-2xl">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl md:text-3xl font-bold tracking-tight text-[#e9edef] truncate">Disparador de Mensagens</h2>
          <p className="text-xs md:text-base text-[#8696a0] mt-1 line-clamp-2 sm:line-clamp-none">Automação de disparos em massa profissional e segura.</p>
        </div>
        <div className="flex shrink-0">
          <Badge variant="outline" className="px-2 md:px-3 py-1 bg-[#00a884]/10 text-[#00a884] border-[#00a884]/20 flex items-center gap-1 md:gap-2 text-[10px] md:text-xs whitespace-nowrap">
            <Zap className="w-3 h-3 shrink-0" /> Modo Inteligente Ativo
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        <div className="lg:col-span-8 space-y-4 md:space-y-6">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {/* Automação de 24h Trigger */}
            <AccordionItem value="countdown" className="border-none">
              <Card className="rounded-2xl shadow-xl border border-white/5 overflow-hidden bg-[#111b21]">
                <CardHeader className="bg-[#202c33] border-b border-white/5 p-0 flex flex-row items-center justify-between">
                  <AccordionTrigger className="flex-1 p-4 hover:no-underline [&[data-state=open]>div>h3]:text-[#00a884] transition-all">
                    <div className="space-y-1 text-left">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2 text-[#00a884]">
                        <Clock className="w-5 h-5" /> Automação de Janela (24h)
                      </CardTitle>
                      <CardDescription className="text-[10px] md:text-xs">
                        Disparar mensagem automática antes de expirar as 24h de conversa grátis.
                      </CardDescription>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between p-3 bg-[#202c33] rounded-xl mb-4 border border-white/5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold flex items-center gap-2 text-white">
                          Status da Automação
                        </Label>
                        <p className="text-[10px] text-white/40">Ativar ou desativar o disparo automático.</p>
                      </div>
                      <Switch 
                        checked={countdownEnabled} 
                        onCheckedChange={setCountdownEnabled}
                        className="data-[state=checked]:bg-[#00a884]"
                      />
                    </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm">Tempo Restante (minutos)</Label>
                  <Input 
                    type="number" 
                    value={countdownThreshold}
                    onChange={e => setCountdownThreshold(parseInt(e.target.value))}
                    placeholder="Ex: 60 (1 hora antes)"
                    className="h-10 rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm"
                  />
                  <p className="text-[10px] text-white/40 italic">O sistema verificará conversas que expiram em {countdownThreshold} min.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm">Tipo de Conteúdo</Label>
                  <Select value={countdownType} onValueChange={(val: any) => setCountdownType(val)}>
                    <SelectTrigger className="h-10 rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message">Mensagem de Texto</SelectItem>
                      <SelectItem value="template">Template Aprovado</SelectItem>
                      <SelectItem value="flow">Fluxo Visual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {countdownType === 'message' && (
                <div className="space-y-2 animate-in fade-in">
                  <Label className="text-xs md:text-sm">Texto do Disparo</Label>
                  <Textarea 
                    value={countdownContent}
                    onChange={e => setCountdownContent(e.target.value)}
                    placeholder="Olá, ainda está por aí? Gostaríamos de saber se..."
                    className="min-h-[80px] rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm"
                  />
                </div>
              )}

              {countdownType === 'template' && (
                <div className="space-y-2 animate-in fade-in">
                  <Label className="text-xs md:text-sm">Selecione o Template</Label>
                  <Select value={countdownTemplate} onValueChange={setCountdownTemplate}>
                    <SelectTrigger className="h-10 rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm">
                      <SelectValue placeholder="Escolha um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.status === 'APPROVED').map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {countdownType === 'flow' && (
                <div className="space-y-2 animate-in fade-in">
                  <Label className="text-xs md:text-sm">Selecione o Fluxo</Label>
                  <Select value={countdownFlow} onValueChange={setCountdownFlow}>
                    <SelectTrigger className="h-10 rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm">
                      <SelectValue placeholder="Escolha um fluxo" />
                    </SelectTrigger>
                    <SelectContent>
                      {flows.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={handleSaveCountdown} 
                disabled={savingCountdown}
                className="w-full h-10 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-semibold"
              >
                {savingCountdown ? <RefreshCcw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {countdownEnabled ? "ATIVAR E SALVAR CONFIGURAÇÃO" : "SALVAR CONFIGURAÇÃO"}
              </Button>
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

            <AccordionItem value="new-campaign" className="border-none">
              <Card className="rounded-2xl shadow-xl border border-white/5 overflow-hidden bg-[#111b21]">
                <CardHeader className="bg-[#202c33] border-b border-white/5 p-0">
                  <AccordionTrigger className="flex-1 p-4 hover:no-underline [&[data-state=open]>div>h3]:text-[#00a884] transition-all">
                    <div className="text-left">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2 text-[#00a884]">
                        <Plus className="w-5 h-5" /> Nova Campanha
                      </CardTitle>
                    </div>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm">Nome da Campanha</Label>
                  <Input 
                    placeholder="Ex: Promoção de Verão" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-10 md:h-11 rounded-xl bg-[#202c33] border-none text-[#e9edef] placeholder:text-[#8696a0] text-xs md:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm text-[#e9edef]">Destinatários</Label>
                  <Select value={targetType} onValueChange={(val: any) => setTargetType(val)}>
                    <SelectTrigger className="h-10 md:h-11 rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm">
                      <SelectValue placeholder="Selecione o público" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contacts">Todos os Contatos ({contacts.length})</SelectItem>
                      <SelectItem value="conversation">Contatos em Janela de 24h (Grátis)</SelectItem>
                      <SelectItem value="tag">Por Etiqueta (Status)</SelectItem>
                      <SelectItem value="uploaded">Subir Lista (VCard, Excel, Texto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {targetType === 'tag' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-xs md:text-sm">Selecione a Etiqueta</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-10 md:h-11 rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm">
                      <SelectValue placeholder="Escolha uma etiqueta" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => (
                        <SelectItem key={s.id} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetType === 'uploaded' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <Label className="text-xs md:text-sm">Lista de Números (Um por linha)</Label>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept={parsingType === 'vcard' ? '.vcf' : '.csv,.txt'} 
                        onChange={onFileChange} 
                      />
                      <Button variant="outline" size="sm" className="text-[9px] md:text-[10px] h-7 flex-1 sm:flex-none" onClick={() => handleFileUpload('vcard')}>
                        <Upload className="w-3 h-3 mr-1" /> VCard
                      </Button>
                      <Button variant="outline" size="sm" className="text-[9px] md:text-[10px] h-7 flex-1 sm:flex-none" onClick={() => handleFileUpload('csv')}>
                        <FileText className="w-3 h-3 mr-1" /> Excel/CSV
                      </Button>
                    </div>
                  </div>
                  <Textarea 
                    placeholder="5511999999999&#10;5521888888888"
                    className="min-h-[100px] md:min-h-[120px] rounded-xl bg-[#202c33] border-none resize-none font-mono text-xs md:text-sm text-[#e9edef]"
                    value={uploadedNumbers}
                    onChange={e => setUploadedNumbers(e.target.value)}
                  />
                  <p className="text-[9px] md:text-[10px] text-muted-foreground italic">Dica: Adicione o código do país (Ex: 55 para Brasil).</p>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground">Conteúdo do Disparo</Label>
                <Tabs value={type} onValueChange={(val: any) => setType(val)} className="w-full">
                  <TabsList className="grid grid-cols-3 h-10 md:h-12 bg-[#202c33] rounded-xl p-1 gap-1">
                    <TabsTrigger value="message" className="rounded-lg text-[9px] sm:text-xs md:text-sm data-[state=active]:bg-[#00a884] data-[state=active]:text-white px-1">Mensagem</TabsTrigger>
                    <TabsTrigger value="template" className="rounded-lg text-[9px] sm:text-xs md:text-sm data-[state=active]:bg-[#00a884] data-[state=active]:text-white px-1">Template</TabsTrigger>
                    <TabsTrigger value="flow" className="rounded-lg text-[9px] sm:text-xs md:text-sm data-[state=active]:bg-[#00a884] data-[state=active]:text-white px-1">Fluxo</TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4 md:mt-6">
                    <TabsContent value="message" className="space-y-2 animate-in fade-in">
                      <Label className="text-xs md:text-sm">Texto da Mensagem</Label>
                      <Textarea 
                        placeholder="Escreva sua mensagem aqui..."
                        className="min-h-[120px] md:min-h-[150px] rounded-xl bg-[#202c33] border-none resize-none text-[#e9edef] placeholder:text-[#8696a0] text-xs md:text-sm"
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                      />
                    </TabsContent>

                    <TabsContent value="template" className="space-y-4 animate-in fade-in">
                      <Label className="text-xs md:text-sm">Selecione o Template Aprovado</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {templates.filter(t => t.status === 'APPROVED').map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => setSelectedTemplate(t.id)}
                            className={cn(
                              "p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer min-w-0 w-full",
                              selectedTemplate === t.id ? "border-[#00a884] bg-[#00a884]/5 shadow-md" : "border-transparent bg-[#202c33] hover:border-white/10"
                            )}
                          >
                            <div className="flex justify-between items-center mb-2 gap-2">
                              <span className="font-bold text-[10px] md:text-xs truncate text-[#e9edef] flex-1">{t.name}</span>
                              <Badge variant="secondary" className="text-[8px] md:text-[9px] bg-[#111b21] shrink-0">{t.category}</Badge>
                            </div>
                            <p className="text-[9px] md:text-[10px] text-[#8696a0] line-clamp-2 break-words">
                              {t.components?.find((c: any) => c.type === 'BODY')?.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="flow" className="space-y-4 animate-in fade-in">
                      <Label className="text-xs md:text-sm">Selecione o Fluxo Visual</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        {flows.map(f => (
                          <div 
                            key={f.id} 
                            onClick={() => setSelectedFlow(f.id)}
                            className={cn(
                              "p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer min-w-0 w-full",
                              selectedFlow === f.id ? "border-[#00a884] bg-[#00a884]/5 shadow-md" : "border-transparent bg-[#202c33] hover:border-white/10"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 rounded-lg bg-[#00a884]/10 text-[#00a884] shrink-0">
                                <GitBranch className="w-4 h-4" />
                              </div>
                              <span className="font-bold text-[10px] md:text-xs text-[#e9edef] truncate">{f.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs md:text-sm font-bold uppercase tracking-wider text-[#8696a0] flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Tempo Randomizado
                  </Label>
                  <Badge variant="outline" className="text-[8px] md:text-[10px] text-[#00a884] border-[#00a884]/20 bg-[#00a884]/5">Evita Bloqueios</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] md:text-[10px]">Mínimo (seg)</Label>
                    <Input 
                      type="number" 
                      value={delayMin}
                      onChange={e => setDelayMin(parseInt(e.target.value))}
                      className="h-10 rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] md:text-[10px]">Máximo (seg)</Label>
                    <Input 
                      type="number" 
                      value={delayMax}
                      onChange={e => setDelayMax(parseInt(e.target.value))}
                      className="h-10 rounded-xl bg-[#202c33] border-none text-[#e9edef] text-xs md:text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleStartBroadcast} 
                disabled={loading}
                className="w-full h-12 md:h-14 rounded-xl bg-[#00a884] hover:bg-[#00a884]/90 text-white font-bold text-base md:text-lg shadow-lg shadow-[#00a884]/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                INICIAR DISPAROS AGORA
              </Button>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>
        </div>


        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="history" className="border-none">
              <Card className="rounded-2xl shadow-xl border border-white/5 overflow-hidden bg-[#111b21] flex flex-col">
                <CardHeader className="bg-[#202c33] border-b border-white/5 p-0">
                  <AccordionTrigger className="p-4 hover:no-underline [&[data-state=open]>div>h3]:text-[#00a884] transition-all">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 text-[#00a884]">
                      <History className="w-5 h-5" /> Histórico Recente
                    </CardTitle>
                  </AccordionTrigger>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="p-0 flex-1">
                    <ScrollArea className="h-[300px] lg:h-[500px]">

                <div className="p-4 space-y-3">
                  {broadcasts.length === 0 ? (
                    <div className="text-center py-10">
                      <Clock className="w-10 h-10 text-white/10 mx-auto mb-2" />
                      <p className="text-xs text-[#8696a0]">Nenhuma campanha realizada ainda.</p>
                    </div>
                  ) : (
                    broadcasts.map(b => (
                      <div key={b.id} className="p-3 rounded-xl bg-[#202c33] border border-white/5 space-y-2 group">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-[#e9edef] truncate">{b.name}</h4>
                            <p className="text-[9px] text-[#8696a0]">{new Date(b.created_at).toLocaleDateString('pt-BR')} às {new Date(b.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <button 
                            onClick={() => deleteBroadcast(b.id)}
                            className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-[#8696a0]">
                            <span>Progresso</span>
                            <span>{Math.round((b.sent_count / b.total_contacts) * 100) || 0}%</span>
                          </div>
                          <div className="w-full bg-[#111b21] h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#00a884] h-full transition-all duration-500" 
                              style={{ width: `${(b.sent_count / b.total_contacts) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center pt-1">
                            <div className="flex gap-2 text-[9px]">
                              <span className="text-[#00a884]">{b.sent_count} ok</span>
                              <span className="text-red-400">{b.failed_count || 0} erro</span>
                              <span className="text-[#8696a0]">/ {b.total_contacts} total</span>
                            </div>
                            <Badge className={cn(
                              "text-[8px] h-4 px-1 capitalize",
                              b.status === 'completed' ? "bg-blue-500/20 text-blue-400" :
                              b.status === 'running' ? "bg-green-500/20 text-green-400 animate-pulse" :
                              "bg-yellow-500/20 text-yellow-400"
                            )}>
                              {b.status === 'completed' ? 'Finalizado' : b.status === 'running' ? 'Em curso' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                    </ScrollArea>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          </Accordion>

          
          {/* Tutorial Card */}
          <Card className="rounded-2xl shadow-xl border border-white/5 overflow-hidden bg-[#202c33]">
            <CardHeader className="p-4 border-b border-white/5">
              <CardTitle className="text-sm flex items-center gap-2 text-[#00a884]">
                <HelpCircle className="w-4 h-4" /> Dicas de Ouro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { icon: <Zap className="w-3 h-3 text-yellow-500" />, text: "Use o tempo randomizado para imitar o comportamento humano e evitar bloqueios." },
                { icon: <AlertCircle className="w-3 h-3 text-orange-500" />, text: "Regra Meta: Mensagens normais e Fluxos só funcionam para quem respondeu nas últimas 24h." },
                { icon: <CheckCircle2 className="w-3 h-3 text-green-500" />, text: "Para lista fria (fora de 24h), use sempre Templates Aprovados para garantir a entrega." }
              ].map((tip, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="mt-0.5 shrink-0">{tip.icon}</div>
                  <p className="text-[10px] text-[#8696a0] leading-relaxed">{tip.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Broadcaster;

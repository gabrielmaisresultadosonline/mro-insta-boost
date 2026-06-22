import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  Send, 
  Layout, 
  Type, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  MousePointer2, 
  ExternalLink, 
  Phone, 
  Play, 
  Zap, 
  Upload, 
  Loader2, 
  File, 
  Eye,
  CreditCard,
  Copy,
  ChevronLeft,
  ChevronRight,
  Layers
} from "lucide-react";
import TemplatePreview from './TemplatePreview';
import MetaPricingCalculator from './MetaPricingCalculator';
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TemplateBuilderProps {
  onSave: (template: any) => void;
  isSaving?: boolean;
}

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({ onSave, isSaving }) => {
  const { toast } = useToast();
  const [templateType, setTemplateType] = useState<'STANDARD' | 'CAROUSEL'>('STANDARD');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('pt_BR');
  
  // Standard Template State
  const [headerType, setHeaderType] = useState('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerUrl, setHeaderUrl] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState<any[]>([]);
  
  // Carousel State
  const [carouselBody, setCarouselBody] = useState('');
  const [cards, setCards] = useState<any[]>([
    { id: '1', headerType: 'IMAGE', headerUrl: '', bodyText: '', buttons: [] },
    { id: '2', headerType: 'IMAGE', headerUrl: '', bodyText: '', buttons: [] }
  ]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // PIX State
  const [isPix, setIsPix] = useState(false);
  const [pixCode, setPixCode] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE', cardIndex?: number) => {
    if (cardIndex !== undefined) {
      const card = cards[cardIndex];
      if (card.buttons.length >= 2) return;
      const newButton = { type, text: '', url: type === 'URL' ? '' : undefined, phone_number: type === 'PHONE' ? '' : undefined };
      const newCards = [...cards];
      newCards[cardIndex].buttons.push(newButton);
      setCards(newCards);
    } else {
      if (buttons.length >= 3) return;
      const newButton = { type, text: '', url: type === 'URL' ? '' : undefined, phone_number: type === 'PHONE' ? '' : undefined };
      setButtons([...buttons, newButton]);
    }
  };

  const removeButton = (index: number, cardIndex?: number) => {
    if (cardIndex !== undefined) {
      const newCards = [...cards];
      newCards[cardIndex].buttons = newCards[cardIndex].buttons.filter((_: any, i: number) => i !== index);
      setCards(newCards);
    } else {
      setButtons(buttons.filter((_, i) => i !== index));
    }
  };

  const updateButton = (index: number, updates: any, cardIndex?: number) => {
    if (cardIndex !== undefined) {
      const newCards = [...cards];
      newCards[cardIndex].buttons[index] = { ...newCards[cardIndex].buttons[index], ...updates };
      setCards(newCards);
    } else {
      setButtons(buttons.map((b, i) => i === index ? { ...b, ...updates } : b));
    }
  };

  const addCard = () => {
    if (cards.length >= 10) return;
    setCards([...cards, { id: Date.now().toString(), headerType: 'IMAGE', headerUrl: '', bodyText: '', buttons: [] }]);
    setActiveCardIndex(cards.length);
  };

  const removeCard = (index: number) => {
    if (cards.length <= 2) {
      toast({ title: "Mínimo de 2 cartões", variant: "destructive" });
      return;
    }
    const newCards = cards.filter((_, i) => i !== index);
    setCards(newCards);
    setActiveCardIndex(Math.max(0, index - 1));
  };

  const updateCard = (index: number, updates: any) => {
    setCards(cards.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, cardIndex?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('crm-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('crm-media')
        .getPublicUrl(filePath);

      if (cardIndex !== undefined) {
        updateCard(cardIndex, { headerUrl: publicUrl });
      } else {
        setHeaderUrl(publicUrl);
      }
      toast({ title: "Arquivo enviado com sucesso!" });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    const components: any[] = [];
    
    if (templateType === 'STANDARD') {
      // Header
      if (headerType !== 'NONE') {
        const header: any = { type: 'HEADER', format: headerType };
        if (headerType === 'TEXT') {
          header.text = headerText;
          const variables = headerText.match(/\{\{\d+\}\}/g);
          if (variables) header.example = { header_text: [headerText.replace(/\{\{\d+\}\}/g, "Exemplo")] };
        } else {
          header.example = { header_handle: [headerUrl || "https://example.com/example.png"] };
        }
        components.push(header);
      }
      
      // Body
      const body: any = { type: 'BODY', text: bodyText };
      const bodyVariables = bodyText.match(/\{\{\d+\}\}/g);
      if (bodyVariables) body.example = { body_text: [bodyVariables.map(() => "Exemplo")] };
      components.push(body);
      
      // Footer
      if (footerText) components.push({ type: 'FOOTER', text: footerText });
      
      // Buttons
      if (buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: buttons.map(b => {
            const btn: any = { type: b.type, text: b.text };
            if (b.type === 'URL') btn.url = b.url || "https://example.com";
            if (b.type === 'PHONE') btn.phone_number = b.phone_number || "5511999999999";
            return btn;
          })
        });
      }
    } else {
      // Carousel Template
      // Main Body
      const body: any = { type: 'BODY', text: carouselBody || "Veja as opções abaixo:" };
      components.push(body);

      // Carousel Component
      const carousel: any = {
        type: 'CAROUSEL',
        cards: cards.map(card => {
          const cardComponents: any[] = [
            { 
              type: 'HEADER', 
              format: card.headerType, 
              example: { header_handle: [card.headerUrl || "https://maisonline.com.br/wp-content/uploads/2023/07/mais-resultados-online.png"] } 
            },
            { 
              type: 'BODY', 
              text: card.bodyText || "Descrição do cartão" 
            }
          ];

          if (card.buttons.length > 0) {
            cardComponents.push({
              type: 'BUTTONS',
              buttons: card.buttons.map((b: any) => {
                const btn: any = { type: b.type, text: b.text };
                if (b.type === 'URL') btn.url = b.url || "https://example.com";
                if (b.type === 'PHONE') btn.phone_number = b.phone_number || "5511999999999";
                return btn;
              })
            });
          }

          return { components: cardComponents };
        })
      };
      components.push(carousel);
    }
    
    onSave({ 
      name, 
      category, 
      language, 
      components, 
      is_pix: isPix, 
      pix_code: pixCode, 
      is_carousel: templateType === 'CAROUSEL' 
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
      <div className="space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layout className="w-5 h-5 text-primary" /> Configuração do Template
                </CardTitle>
                <CardDescription>Crie templates profissionais para o WhatsApp</CardDescription>
              </div>
              <div className="flex bg-muted p-1 rounded-lg">
                <Button 
                  variant={templateType === 'STANDARD' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setTemplateType('STANDARD')}
                >
                  Padrão
                </Button>
                <Button 
                  variant={templateType === 'CAROUSEL' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setTemplateType('CAROUSEL')}
                >
                  Carrossel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input 
                  placeholder="ex: promocao_verao" 
                  value={name} 
                  onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utilidade</SelectItem>
                    <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {templateType === 'STANDARD' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                <div className="space-y-2">
                  <Label>Cabeçalho (Opcional)</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant={headerType === 'NONE' ? 'default' : 'outline'} size="sm" onClick={() => { setHeaderType('NONE'); setHeaderUrl(''); }}>Nenhum</Button>
                    <Button variant={headerType === 'TEXT' ? 'default' : 'outline'} size="sm" onClick={() => { setHeaderType('TEXT'); setHeaderUrl(''); }}><Type className="w-4 h-4 mr-1" /> Texto</Button>
                    <Button variant={headerType === 'IMAGE' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('IMAGE')}><ImageIcon className="w-4 h-4 mr-1" /> Imagem</Button>
                    <Button variant={headerType === 'VIDEO' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('VIDEO')}><Video className="w-4 h-4 mr-1" /> Vídeo</Button>
                    <Button variant={headerType === 'DOCUMENT' ? 'default' : 'outline'} size="sm" onClick={() => setHeaderType('DOCUMENT')}><FileText className="w-4 h-4 mr-1" /> Documento</Button>
                  </div>
                  
                  {headerType === 'TEXT' && <Input placeholder="Texto do cabeçalho" value={headerText} onChange={e => setHeaderText(e.target.value)} maxLength={60} />}
                  {(headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && (
                    <div className="flex gap-2">
                      <Input placeholder="URL da mídia" value={headerUrl} onChange={e => setHeaderUrl(e.target.value)} className="flex-1" />
                      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e)} accept={headerType === 'IMAGE' ? 'image/*' : headerType === 'VIDEO' ? 'video/*' : '*/*'} />
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Corpo da Mensagem</Label>
                  <Textarea placeholder="Sua mensagem aqui..." value={bodyText} onChange={e => setBodyText(e.target.value)} rows={4} />
                </div>

                <div className="space-y-2">
                  <Label>Rodapé (Opcional)</Label>
                  <Input placeholder="Rodapé curto" value={footerText} onChange={e => setFooterText(e.target.value)} maxLength={60} />
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Botões (Máx 3)</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => addButton('QUICK_REPLY')} disabled={buttons.length >= 3}><MousePointer2 className="w-3 h-3 mr-1" /> Resposta</Button>
                      <Button variant="outline" size="sm" onClick={() => addButton('URL')} disabled={buttons.length >= 3}><ExternalLink className="w-3 h-3 mr-1" /> Link</Button>
                    </div>
                  </div>
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-muted/30 p-2 rounded-lg border">
                      <div className="flex-1 space-y-2">
                        <Input placeholder="Texto" value={btn.text} onChange={e => updateButton(idx, { text: e.target.value })} maxLength={25} />
                        {btn.type === 'URL' && <Input placeholder="URL" value={btn.url} onChange={e => updateButton(idx, { url: e.target.value })} />}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeButton(idx)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <Label className="text-amber-900 dark:text-amber-100 font-semibold cursor-pointer" htmlFor="pix-toggle">Configurar PIX</Label>
                    </div>
                    <Switch id="pix-toggle" checked={isPix} onCheckedChange={setIsPix} />
                  </div>
                  {isPix && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label className="text-xs text-amber-700 dark:text-amber-300">Cole sua Chave PIX ou Código Copia e Cola</Label>
                      <div className="flex gap-2">
                        <Textarea 
                          placeholder="Chave PIX ou Código..." 
                          value={pixCode} 
                          onChange={e => setPixCode(e.target.value)}
                          className="font-mono text-xs border-amber-200 dark:border-amber-800"
                        />
                      </div>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">Isso adicionará uma opção de cópia rápida no CRM.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-2">
                <div className="space-y-2">
                  <Label>Corpo do Carrossel (Texto que aparece acima)</Label>
                  <Input placeholder="Ex: Escolha um dos nossos planos:" value={carouselBody} onChange={e => setCarouselBody(e.target.value)} />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-primary font-bold">Cartões ({cards.length}/10)</Label>
                    <Button variant="outline" size="sm" onClick={addCard} disabled={cards.length >= 10}>
                      <Plus className="w-4 h-4 mr-1" /> Novo Cartão
                    </Button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {cards.map((card, idx) => (
                      <Button 
                        key={card.id}
                        variant={activeCardIndex === idx ? 'default' : 'outline'}
                        className="shrink-0 min-w-[80px]"
                        onClick={() => setActiveCardIndex(idx)}
                      >
                        Cartão {idx + 1}
                      </Button>
                    ))}
                  </div>

                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Editando Cartão {activeCardIndex + 1}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCard(activeCardIndex)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Mídia do Cartão</Label>
                        <div className="flex gap-2">
                          <Button variant={cards[activeCardIndex].headerType === 'IMAGE' ? 'default' : 'outline'} size="sm" onClick={() => updateCard(activeCardIndex, { headerType: 'IMAGE' })}><ImageIcon className="w-4 h-4 mr-1" /> Imagem</Button>
                          <Button variant={cards[activeCardIndex].headerType === 'VIDEO' ? 'default' : 'outline'} size="sm" onClick={() => updateCard(activeCardIndex, { headerType: 'VIDEO' })}><Video className="w-4 h-4 mr-1" /> Vídeo</Button>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Input placeholder="URL da mídia" value={cards[activeCardIndex].headerUrl} onChange={e => updateCard(activeCardIndex, { headerUrl: e.target.value })} className="h-8 text-xs" />
                          <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => handleFileUpload(e, activeCardIndex)} accept={cards[activeCardIndex].headerType === 'IMAGE' ? 'image/*' : 'video/*'} />
                          <Button variant="outline" size="sm" className="h-8" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Texto do Cartão (Máx 160 chars)</Label>
                        <Textarea 
                          placeholder="Descrição do item..." 
                          value={cards[activeCardIndex].bodyText} 
                          onChange={e => updateCard(activeCardIndex, { bodyText: e.target.value })}
                          maxLength={160}
                          rows={2}
                          className="text-xs"
                        />
                      </div>

                      <div className="space-y-2 border-t pt-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Botões do Cartão (Máx 2)</Label>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => addButton('QUICK_REPLY', activeCardIndex)} disabled={cards[activeCardIndex].buttons.length >= 2}>+ Resposta</Button>
                            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => addButton('URL', activeCardIndex)} disabled={cards[activeCardIndex].buttons.length >= 2}>+ Link</Button>
                          </div>
                        </div>
                        {cards[activeCardIndex].buttons.map((btn: any, idx: number) => (
                          <div key={idx} className="flex gap-1 items-start bg-background p-2 rounded-md border text-xs">
                            <div className="flex-1 space-y-1">
                              <Input placeholder="Texto" value={btn.text} onChange={e => updateButton(idx, { text: e.target.value }, activeCardIndex)} maxLength={25} className="h-7 text-[10px]" />
                              {btn.type === 'URL' && <Input placeholder="URL" value={btn.url} onChange={e => updateButton(idx, { url: e.target.value }, activeCardIndex)} className="h-7 text-[10px]" />}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeButton(idx, activeCardIndex)} className="h-7 w-7 text-destructive"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <Button className="w-full mt-6" onClick={handleSubmit} disabled={isSaving || !name}>
              {isSaving ? "Enviando..." : "Enviar para Aprovação"}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="sticky top-24 h-fit space-y-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
          <Eye className="w-3 h-3" /> Prévia do Dispositivo
        </div>
        <TemplatePreview 
          name={name}
          headerType={templateType === 'STANDARD' ? headerType : 'CAROUSEL'}
          headerText={headerText}
          headerUrl={headerUrl}
          bodyText={templateType === 'STANDARD' ? bodyText : carouselBody}
          footerText={footerText}
          buttons={templateType === 'STANDARD' ? buttons : []}
          isCarousel={templateType === 'CAROUSEL'}
          carouselCards={cards}
          isPix={isPix}
          pixCode={pixCode}
        />
      </div>
    </div>
  );
};

export default TemplateBuilder;

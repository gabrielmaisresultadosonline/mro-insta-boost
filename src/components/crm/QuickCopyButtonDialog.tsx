import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Link as LinkIcon, MessageSquare, Send, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildCopyUrl } from '@/lib/copyLink';

export type QuickButtonKind = 'copy' | 'link' | 'reply';

export interface QuickCopyButtonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contato ativo na conversa (opcional: sem contato só é possível salvar no fluxo). */
  contact?: { id: string; wa_id: string; name?: string | null } | null;
  metaSettings?: { meta_phone_number_id?: string | null; meta_access_token?: string | null } | null;
  /** Chamado após salvar um fluxo, para atualizar a lista de fluxos na tela. */
  onFlowSaved?: () => void;
}

/**
 * Diálogo rápido do chat: monta uma mensagem com botão (copiar / link / resposta)
 * e permite enviar na hora e/ou salvar como fluxo manual reutilizável.
 */
export const QuickCopyButtonDialog: React.FC<QuickCopyButtonDialogProps> = ({
  open,
  onOpenChange,
  contact,
  metaSettings,
  onFlowSaved,
}) => {
  const { toast } = useToast();
  const [kind, setKind] = useState<QuickButtonKind>('copy');
  const [text, setText] = useState('Segue meu PIX abaixo 👇');
  const [copyValue, setCopyValue] = useState('');
  const [buttonLabel, setButtonLabel] = useState('Copiar PIX');
  const [sendRawText, setSendRawText] = useState(true);
  const [alsoSaveFlow, setAlsoSaveFlow] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setBusy(false);
  };

  const validate = (): string | null => {
    if (!text.trim()) return 'Escreva a mensagem que vai acompanhar o botão.';
    if (!buttonLabel.trim()) return 'Dê um nome ao botão.';
    if (kind === 'copy' && !copyValue.trim()) return 'Informe o conteúdo que o cliente vai copiar (PIX, código, texto...).';
    if (kind === 'link' && !/^https?:\/\//i.test(copyValue.trim())) return 'Informe uma URL válida começando com https://';
    return null;
  };

  /** Monta o payload `interactive` do WhatsApp de acordo com o tipo escolhido. */
  const buildInteractive = () => {
    const displayText = buttonLabel.trim().slice(0, 20);
    if (kind === 'reply') {
      return {
        type: 'button',
        body: { text: text.trim() },
        action: {
          buttons: [{ type: 'reply', reply: { id: `quick_${Date.now()}`, title: displayText } }],
        },
      };
    }
    const url = kind === 'link' ? copyValue.trim() : buildCopyUrl(copyValue.trim(), buttonLabel.trim());
    return {
      type: 'cta_url',
      body: { text: text.trim() },
      action: { name: 'cta_url', parameters: { display_text: displayText, url } },
    };
  };

  const saveAsFlow = async () => {
    const name = (flowName.trim() || `Botão: ${buttonLabel.trim()}`).slice(0, 80);
    const nodeId = `copyText_${Date.now()}`;
    const { error } = await supabase.from('crm_flows').insert([
      {
        name,
        trigger_type: 'manual',
        trigger_keywords: [],
        trigger_tag: null,
        is_active: true,
        nodes: [
          {
            id: nodeId,
            type: 'copyText',
            position: { x: 240, y: 120 },
            data: {
              text: text.trim(),
              kind,
              copyValue: copyValue.trim(),
              buttonLabel: buttonLabel.trim(),
              sendRawText,
            },
          },
        ],
        edges: [],
        updated_at: new Date().toISOString(),
      },
    ]);
    if (error) throw error;
  };

  const handleSend = async (saveOnly = false) => {
    const problem = validate();
    if (problem) {
      toast({ title: 'Confira os campos', description: problem, variant: 'destructive' });
      return;
    }

    setBusy(true);
    try {
      if (!saveOnly) {
        if (!contact?.wa_id) {
          throw new Error('Abra uma conversa para enviar agora.');
        }
        const authHeader = `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`;

        const { data, error } = await supabase.functions.invoke('meta-whatsapp-crm', {
          headers: { Authorization: authHeader },
          body: {
            action: 'sendMessage',
            to: contact.wa_id,
            contactId: contact.id,
            interactive: buildInteractive(),
            meta_phone_number_id: metaSettings?.meta_phone_number_id,
            meta_access_token: metaSettings?.meta_access_token,
          },
        });
        if (error) throw error;
        if (data && data.success === false) throw new Error(data.error || 'Falha ao enviar a mensagem.');

        // Envia o conteúdo puro em uma bolha separada: no celular o cliente
        // consegue segurar e copiar direto pelo WhatsApp.
        if (kind === 'copy' && sendRawText) {
          await supabase.functions.invoke('meta-whatsapp-crm', {
            headers: { Authorization: authHeader },
            body: {
              action: 'sendMessage',
              to: contact.wa_id,
              contactId: contact.id,
              text: copyValue.trim(),
              meta_phone_number_id: metaSettings?.meta_phone_number_id,
              meta_access_token: metaSettings?.meta_access_token,
            },
          });
        }
      }

      if (saveOnly || alsoSaveFlow) {
        await saveAsFlow();
        onFlowSaved?.();
      }

      toast({
        title: saveOnly ? 'Salvo no fluxo!' : alsoSaveFlow ? 'Enviado e salvo no fluxo!' : 'Mensagem enviada!',
      });
      onOpenChange(false);
      reset();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Não foi possível concluir.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const kinds: { id: QuickButtonKind; label: string; hint: string; icon: React.ReactNode }[] = [
    { id: 'copy', label: 'Copiar', hint: 'PIX, código, texto', icon: <Copy className="w-4 h-4" /> },
    { id: 'link', label: 'Link', hint: 'Abrir site', icon: <LinkIcon className="w-4 h-4" /> },
    { id: 'reply', label: 'Resposta', hint: 'Botão de resposta', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[96vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Copy className="w-4 h-4 text-primary" /> Mensagem com botão
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envie agora na conversa e, se quiser, salve como fluxo manual para reutilizar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {kinds.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`rounded-lg border p-2 text-left transition-colors ${
                  kind === k.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  {k.icon} {k.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{k.hint}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Mensagem</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="text-sm" />
          </div>

          {kind !== 'reply' && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {kind === 'copy' ? 'Conteúdo que o cliente vai copiar' : 'URL do botão'}
              </Label>
              <Textarea
                value={copyValue}
                onChange={(e) => setCopyValue(e.target.value)}
                rows={kind === 'copy' ? 3 : 2}
                placeholder={kind === 'copy' ? 'Cole aqui sua chave PIX, código copia e cola ou texto' : 'https://...'}
                className="text-sm font-mono"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Texto do botão (máx. 20 caracteres)</Label>
            <Input
              value={buttonLabel}
              maxLength={20}
              onChange={(e) => setButtonLabel(e.target.value)}
              className="text-sm"
            />
          </div>

          {kind === 'copy' && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox checked={sendRawText} onCheckedChange={(v) => setSendRawText(!!v)} className="mt-0.5" />
              <span>Enviar também o conteúdo em uma mensagem separada (permite copiar segurando no WhatsApp).</span>
            </label>
          )}

          <div className="rounded-lg border border-dashed p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <Checkbox checked={alsoSaveFlow} onCheckedChange={(v) => setAlsoSaveFlow(!!v)} />
              Salvar também como fluxo manual
            </label>
            {alsoSaveFlow && (
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder={`Nome do fluxo (ex: ${buttonLabel || 'Copiar PIX'})`}
                className="text-sm"
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => handleSend(true)}
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Só salvar no fluxo
            </Button>
            <Button className="flex-1" disabled={busy || !contact?.wa_id} onClick={() => handleSend(false)}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar agora
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCopyButtonDialog;

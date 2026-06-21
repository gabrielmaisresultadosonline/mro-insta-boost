import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function lookupGoogleContact(wa_id: string, settings: any) {
  if (!settings?.google_auto_sync) return null;

  try {
    const { data: tokens } = await supabase.from('crm_google_tokens').select('*').maybeSingle();
    if (!tokens?.access_token) return null;

    let accessToken = tokens.access_token;

    // Refresh if needed
    if (new Date(tokens.expires_at) < new Date()) {
      console.log('Refreshing Google token in webhook...');
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: tokens.refresh_token || '',
          client_id: settings.google_client_id,
          client_secret: settings.google_client_secret,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();
      if (refreshResponse.ok) {
        accessToken = refreshData.access_token;
        const expires_at = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();
        await supabase.from('crm_google_tokens').update({
          access_token: accessToken,
          expires_at,
          updated_at: new Date().toISOString()
        }).eq('id', tokens.id);
      }
    }

    // Search for contact by phone
    // We search with the full number
    const searchResponse = await fetch(`https://people.googleapis.com/v1/people:searchContacts?query=${wa_id}&readMask=names,phoneNumbers`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const searchData = await searchResponse.json();
    if (searchResponse.ok && searchData.results && searchData.results.length > 0) {
      const person = searchData.results[0].person;
      return person.names?.[0]?.displayName || null;
    }
  } catch (err) {
    console.error('Error in lookupGoogleContact:', err);
  }
  return null;
}

serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    const { data: settings } = await supabase
      .from('crm_settings')
      .select('webhook_verify_token')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single()

    if (mode === 'subscribe' && token === (settings?.webhook_verify_token || 'mro_token_verification')) {
      return new Response(challenge, { status: 200 })
    } else {
      return new Response('Forbidden', { status: 403 })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      console.log('Webhook received payload:', JSON.stringify(body, null, 2))

      if (body.object === 'whatsapp_business_account') {
        const { data: settings } = await supabase
          .from('crm_settings')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single()

        for (const entry of body.entry) {
          for (const change of entry.changes) {
            const value = change.value
            if (value.statuses) {
              for (const statusUpdate of value.statuses) {
                const { id: meta_message_id, status, errors } = statusUpdate
                console.log(`Status update for ${meta_message_id}: ${status}`)
                
                let updateData: any = { status }
                if (errors && errors.length > 0) {
                  console.error(`Message ${meta_message_id} failed with errors:`, JSON.stringify(errors))
                  updateData.error_code = errors[0].code?.toString();
                  updateData.error_message = errors[0].message || errors[0].details;
                }

                await supabase
                  .from('crm_messages')
                  .update(updateData)
                  .eq('meta_message_id', meta_message_id)
              }
            }

            if (value.messages) {
              for (const message of value.messages) {
                const wa_id = message.from
                if (message.id) {
                  const { data: alreadyHandled } = await supabase
                    .from('crm_messages')
                    .select('id')
                    .eq('meta_message_id', message.id)
                    .maybeSingle()

                  if (alreadyHandled) {
                    console.log(`[WEBHOOK] Duplicate inbound message ${message.id} ignored for ${wa_id}`)
                    continue
                  }
                }

                const { data: contactBeforeUpdate } = await supabase
                  .from('crm_contacts')
                  .select('*')
                  .eq('wa_id', wa_id)
                  .maybeSingle()

                let contact_name = value.contacts?.[0]?.profile?.name || wa_id
                
                if (settings?.google_auto_sync && (!contactBeforeUpdate || !contactBeforeUpdate.name || contactBeforeUpdate.name === wa_id)) {
                  const googleName = await lookupGoogleContact(wa_id, settings);
                  if (googleName) {
                    console.log(`Found name "${googleName}" for ${wa_id} in Google Contacts`);
                    contact_name = googleName;
                  }
                }
                
                const now = new Date();
                const lastIntDate = contactBeforeUpdate?.last_interaction ? new Date(contactBeforeUpdate.last_interaction) : null;
                const isFirstMessageOfDay = !lastIntDate || 
                  lastIntDate.getUTCDate() !== now.getUTCDate() || 
                  lastIntDate.getUTCMonth() !== now.getUTCMonth() || 
                  lastIntDate.getUTCFullYear() !== now.getUTCFullYear();

                let contact = contactBeforeUpdate;
                
                if (!contact) {
                  const { data: newContact } = await supabase
                    .from('crm_contacts')
                    .insert({ 
                      wa_id, 
                      name: contact_name, 
                      last_interaction: now.toISOString(),
                      total_messages_received: 1,
                      status: 'new',
                      ai_active: true
                    })
                    .select('*')
                    .single()
                  contact = newContact
                } else {
                  const { data: updatedContact } = await supabase
                    .from('crm_contacts')
                    .update({ 
                      last_interaction: now.toISOString(), 
                      name: (!contact.name || contact.name === contact.wa_id || (settings?.google_auto_sync && contact.name === value.contacts?.[0]?.profile?.name)) ? contact_name : contact.name,
                      total_messages_received: (contact.total_messages_received || 0) + 1,
                      status: contact.status === 'new' ? 'responded' : contact.status
                    })
                    .eq('id', contact.id)
                    .select('*')
                    .single()
                  contact = updatedContact
                }

                if (contact) {
                  let content = ''
                  let message_type = message.type
                  let media_url = null
                  
                  const meta_access_token = settings?.meta_access_token

                  if (message.type === 'text') {
                    content = message.text.body
                  } else if (message.type === 'button') {
                    content = `[Button Click] ${message.button.text}`
                  } else if (message.type === 'interactive') {
                    if (message.interactive.type === 'button_reply') {
                      content = `[Button Reply] ${message.interactive.button_reply.title}`
                    } else if (message.interactive.type === 'list_reply') {
                      content = `[List Reply] ${message.interactive.list_reply.title}`
                    }
                  } else if (message.type === 'audio') {
                    content = `[Mensagem de Áudio]`
                  } else if (message.type === 'image') {
                    content = message.image.caption || `[Image Message]`
                  } else if (message.type === 'video') {
                    content = message.video.caption || `[Video Message]`
                  } else if (message.type === 'document') {
                    content = message.document.filename || `[Document]`
                  } else if (message.type === 'sticker') {
                    content = `[Sticker]`
                  } else if (message.type === 'location') {
                    content = `[Localização] Lat: ${message.location.latitude}, Long: ${message.location.longitude}`
                    if (message.location.name) content += ` (${message.location.name})`
                  } else if (message.type === 'contacts') {
                    const contactNames = message.contacts.map((c: any) => c.name.formatted_name).join(', ')
                    content = `[Contato] ${contactNames}`
                  } else if (message.type === 'reaction') {
                    content = `[Reação] ${message.reaction.emoji}`
                  } else {
                    content = `[Mensagem: ${message.type}]`
                  }

                  const { data: insertedMsg } = await supabase.from('crm_messages').insert({
                    contact_id: contact.id,
                    direction: 'inbound',
                    message_type: message_type,
                    content: content,
                    media_url: null,
                    meta_message_id: message.id,
                    status: 'received',
                    metadata: message
                  }).select().single();

                  if (insertedMsg && meta_access_token && ['audio', 'image', 'video', 'document', 'sticker'].includes(message.type)) {
                    const mediaId = message[message.type]?.id;
                    if (mediaId) {
                      console.log(`[WEBHOOK] Downloading media ${mediaId} after insert...`);
                      const downloadedUrl = await downloadAndUploadMedia(supabase, meta_access_token, mediaId, message.type, message.document?.filename);
                      if (downloadedUrl) {
                        media_url = downloadedUrl;
                        await supabase.from('crm_messages').update({ media_url: downloadedUrl }).eq('id', insertedMsg.id);
                      }
                    }
                  }

                  await supabase.rpc('increment_crm_metric', { metric_column: 'responded_count' })

                  // --- FLOW LOGIC ---
                  
                  // 1. Check if waiting for response in current flow
                  if (contact.flow_state === 'waiting_response' && contact.current_flow_id) {
                    let buttonId = null;
                    if (message.type === 'interactive' && message.interactive.type === 'button_reply') {
                      buttonId = message.interactive.button_reply.id;
                    }

                    // Cancel any scheduled followups for this flow/contact BEFORE continuing
                    await supabase.from('crm_scheduled_messages')
                      .update({ status: 'cancelled' })
                      .eq('contact_id', contact.id)
                      .eq('status', 'pending');

                    await supabase.functions.invoke('meta-whatsapp-crm', {
                      body: { 
                        action: 'continueFlow', 
                        contactId: contact.id, 
                        waId: wa_id, 
                        buttonId,
                        text: content,
                        sourceMessageId: message.id
                      }
                    })
                    
                    return new Response('OK - Flow Continued', { status: 200 })
                  }

                  // 1.1 Check if contact is in an AI Agent node (even if older executions left state as "running")
                  const isCurrentAiNode = !!contact.current_flow_id && String(contact.current_node_id || '').includes('aiAgent');
                  const normalizedStatus = String(contact.status || '').toLowerCase();
                  const isHumanHandoff = normalizedStatus.includes('human') || normalizedStatus.includes('humano');
                  const shouldHandleFlowAi = contact.flow_state === 'ai_handling' || (isCurrentAiNode && !isHumanHandoff);

                  if (shouldHandleFlowAi) {
                    console.log(`[WEBHOOK] Contact ${wa_id} is in flow AI node/state (${contact.flow_state}/${contact.current_node_id}). Invoking AI logic in meta-whatsapp-crm...`);
                    if (contact.flow_state !== 'ai_handling' || contact.ai_active !== true) {
                      await supabase.from('crm_contacts').update({ flow_state: 'ai_handling', ai_active: true }).eq('id', contact.id);
                    }
                    await supabase.functions.invoke('meta-whatsapp-crm', {
                      body: { 
                        action: 'processWebhook', 
                        entry: body.entry,
                        skipSave: true // Evita duplicar a mensagem no banco pois já salvamos aqui
                      }
                    });
                    return new Response('OK - AI Flow Handled', { status: 200 });
                  }

                  // 2. Check for triggers (Keywords, New Contact, 24h Inactivity)
                  const isNewContact = contact.total_messages_received === 1;
                  const lastInteraction = contact.last_interaction ? new Date(contact.last_interaction).getTime() : 0;
                  const isAfter24h = lastInteraction > 0 && (new Date().getTime() - lastInteraction) > 24 * 60 * 60 * 1000;
                  const isFlowActive = contact.flow_state === 'running' || contact.flow_state === 'waiting_response' || contact.flow_state === 'ai_handling';

                  if (!isFlowActive && (message.type === 'text' || message.referral)) {
                    const text = message.text?.body?.toLowerCase()?.trim() || "";
                    const referralData = message.referral;
                    
                    if (referralData) {
                      console.log('Detected Click-to-WhatsApp referral:', JSON.stringify(referralData));
                    }

                    // Search for flows with matching keywords or type
                    const { data: flows } = await supabase
                      .from('crm_flows')
                      .select('*')
                      .eq('is_active', true);
                    
                    let triggeredFlow = null;

                    if (flows) {
                      // 1. Priority: Referral/Ads Trigger
                      if (referralData) {
                        triggeredFlow = flows.find(f => 
                          f.trigger_type === 'ads' || 
                          f.trigger_type === 'referral' ||
                          (f.trigger_type === 'keyword' && referralData.body && f.trigger_keywords?.some((k: string) => referralData.body.toLowerCase().includes(k.toLowerCase())))
                        );
                      }

                      // 2. Keyword Trigger
                      if (!triggeredFlow && text) {
                        triggeredFlow = flows.find(f => 
                          f.trigger_type === 'keyword' && 
                          (f.trigger_keywords?.some((k: string) => k.toLowerCase() === text) || 
                           f.trigger_keyword?.toLowerCase() === text) ||
                          (f.trigger_type === 'exact_phrase' && f.trigger_keywords?.some((k: string) => k.toLowerCase() === text))
                        );
                      }

                      // 3. Status-based triggers
                      if (!triggeredFlow && isFirstMessageOfDay) {
                        triggeredFlow = flows.find(f => f.trigger_type === 'first_message_day');
                      }

                      if (!triggeredFlow && isAfter24h) {
                        triggeredFlow = flows.find(f => f.trigger_type === '24h_inactivity');
                      }

                      if (!triggeredFlow && isNewContact) {
                        triggeredFlow = flows.find(f => f.trigger_type === 'new_contact' || f.trigger_type === 'first_message');
                      }
                    }

                    if (triggeredFlow) {
                      console.log(`Triggering flow ${triggeredFlow.name} for contact ${wa_id}`);
                      await supabase.functions.invoke('meta-whatsapp-crm', {
                        body: { action: 'startFlow', flowId: triggeredFlow.id, contactId: contact.id, waId: wa_id, text: content, sourceMessageId: message.id }
                      })
                      
                      return new Response('OK - Flow Triggered', { status: 200 })
                    }
                  }

                  // 3. AI Agent Logic
                  const isAiEnabledGlobally = settings?.ai_agent_enabled === true;
                  
                  console.log('Checking AI Agent conditions:', { 
                    isAiEnabledGlobally,
                    hasKey: !!settings?.openai_api_key, 
                    contactAiActive: contact.ai_active,
                    trigger: settings?.ai_agent_trigger,
                    isNewContact,
                    messageType: message.type
                  });
                  
                  if (isAiEnabledGlobally && settings?.openai_api_key && contact.ai_active && !isFlowActive) {
                    let shouldTriggerAI = false;
                    
                    if (settings.ai_agent_trigger === 'all') {
                      shouldTriggerAI = true;
                    } else if (settings.ai_agent_trigger === 'first_message' && isNewContact) {
                      shouldTriggerAI = true;
                    } else if (settings.ai_agent_trigger === 'manual' && contact.ai_active) {
                      shouldTriggerAI = true;
                    } else if (settings.ai_agent_trigger === 'keyword' && message.type === 'text') {
                      const keyword = settings.ai_agent_trigger_keyword?.toLowerCase().trim();
                      const text = message.text.body.toLowerCase().trim();
                      if (keyword && (text === keyword || text.includes(keyword))) {
                        shouldTriggerAI = true;
                        // Forçar ativação do contato se bater o gatilho
                        if (!contact.ai_active) {
                          await supabase.from('crm_contacts').update({ ai_active: true }).eq('id', contact.id);
                        }
                      }
                    }

                    // If mode is monitor, we ALWAYS trigger AI to analyze, but we'll control response later
                    if (settings.ai_operation_mode === 'monitor' || settings.ai_operation_mode === 'hybrid') {
                      shouldTriggerAI = true;
                    }

                    console.log(`AI Agent decision: shouldTriggerAI=${shouldTriggerAI} (Mode: ${settings.ai_operation_mode})`);
                    
                    if (shouldTriggerAI) {
                      const { data: history } = await supabase
                        .from('crm_messages')
                        .select('content, direction, message_type, media_url')
                        .eq('contact_id', contact.id)
                        .order('created_at', { ascending: false })
                        .limit(15);

                      const { data: templates } = await supabase.from('crm_templates').select('name, components, knowledge_description');
                      const { data: flows } = await supabase.from('crm_flows').select('id, name').eq('is_active', true);

                      // Check if it's outside business hours
                      let businessHoursInstruction = "";
                      if (settings?.business_hours_enabled) {
                        const now = new Date();
                        const options: Intl.DateTimeFormatOptions = {
                          timeZone: settings.business_hours_tz || 'America/Sao_Paulo',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        };
                        const currentTime = new Intl.DateTimeFormat('pt-BR', options).format(now);
                        const start = settings.business_hours_start || '08:00';
                        const end = settings.business_hours_end || '18:00';

                        const isOutside = currentTime < start || currentTime > end;
                        if (isOutside) {
                          businessHoursInstruction = `
INFORMAÇÃO CRÍTICA: Atualmente estamos FORA do horário comercial (${start} às ${end}).
- Você DEVE informar ao usuário que nossos administradores não estão ativos no momento e que você seguirá com o atendimento, mas em breve um humano retornará.
- Mensagem padrão sugerida: "${settings.outside_hours_message || 'Nossos administradores não estão ativos no momento. Seguiremos com o atendimento automatizado e em breve retornaremos com um atendimento humano.'}"
- Se o usuário insistir em falar com um humano ou se você não souber responder algo complexo, use a tag [SET_STATUS: human] para encaminhar.
`;
                        }
                      }

                      const systemPrompt = `
MODO DE OPERAÇÃO ATUAL: ${settings.ai_operation_mode || 'chat'}
(Se o modo for "monitor", você NÃO deve enviar mensagens ao usuário, apenas tags de status ou gatilhos).

${settings.ai_system_prompt || 'Você é um assistente de vendas profissional.'}
${businessHoursInstruction}

TEMPLATES DISPONÍVEIS (IMPORTANTE: Use [SEND_TEMPLATE: nome] em uma linha isolada para enviar um template oficial):
${templates?.map(t => `- ${t.name}: ${t.knowledge_description || 'Sem descrição'}`).join('\n')}

STATUS DO CRM (IMPORTANTE: Use [SET_STATUS: status] para qualificar o contato):
- qualified: Cliente demonstrou interesse real, pediu preços ou links de compra.
- closed: Cliente confirmou que ACABOU DE COMPRAR ou finalizou o pagamento.
- lost: Cliente disse explicitamente que não tem interesse no momento.
- human: Cliente pediu para falar com um atendente humano ou você não sabe responder algo técnico/complexo.

DIRETRIZES DE QUALIFICAÇÃO:
11. REATIVAÇÃO E COMPRA: Se um cliente que estava como "lost" (perdido) chamar novamente e demonstrar interesse, você DEVE reavaliar o status e mudá-lo para "qualified" usando [SET_STATUS: qualified]. Se ele disser que "acabou de comprar" ou "já paguei", você DEVE mudar para "closed" usando [SET_STATUS: closed] imediatamente.
12. CONFIRMAÇÃO DE ENVIO: Certifique-se de que cada intenção de envio seja seguida pela tag técnica correspondente. Se você disser "Aqui está o link", a tag [SEND_TEMPLATE: ...] deve vir logo em seguida.
13. ATENDIMENTO HUMANO: Se você identificar que o cliente precisa de suporte humano urgente ou se você não conseguir resolver a dúvida dele, use a tag [SET_STATUS: human]. Isso moverá o contato para a fila de atendimento prioritário (+HUMANO).
14. ATUALIZAÇÃO EM TEMPO REAL: É mandatório enviar a tag [SET_STATUS: ...] na mesma resposta em que detectar a mudança de intenção do cliente, para garantir que o Kanban atualize em tempo real.
`;

                      const openaiMessages: any[] = [{ role: 'system', content: systemPrompt }];
                      
                      // Process history for OpenAI
                      for (const msg of (history || []).reverse()) {
                        const role = msg.direction === 'inbound' ? 'user' : 'assistant';
                        
                        // CRITICAL: Meta API/OpenAI does not support image_url for 'assistant' role
                        // We must send assistant messages as plain text, even if they refer to images
                        if (msg.message_type === 'image' && msg.media_url && role === 'user') {
                          openaiMessages.push({
                            role,
                            content: [
                              { type: 'text', text: msg.content || 'Imagem enviada pelo usuário.' },
                              { type: 'image_url', image_url: { url: msg.media_url } }
                            ]
                          });
                        } else if (msg.message_type === 'audio' && msg.media_url && role === 'user') {
                          // For audio, we'll try to transcribe it using Whisper
                          try {
                            const transcription = await transcribeAudio(settings.openai_api_key, msg.media_url);
                            openaiMessages.push({ role, content: `[Transcrição de Áudio]: ${transcription}` });
                          } catch (err) {
                            openaiMessages.push({ role, content: `[Áudio enviado, mas não foi possível transcrever]` });
                          }
                        } else {
                          // For assistant role OR text messages OR non-image inbound media, send as simple text
                          openaiMessages.push({ role, content: msg.content || `[Mensagem: ${msg.message_type}]` });
                        }
                      }

                      try {
                        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${settings.openai_api_key}`,
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            model: 'gpt-4o-mini', // Switched to gpt-4o-mini for better cost/quota management while maintaining vision support
                            messages: openaiMessages,
                            max_tokens: 500
                          })
                        });

                        const aiData = await aiResponse.json();
                        if (aiData.error) {
                          console.error('OpenAI API Error:', aiData.error);
                          throw new Error(aiData.error.message);
                        }

                        let aiText = aiData.choices[0].message.content.trim();
                        console.log('Raw AI Response:', aiText);

                        // If auto-generate strategy is enabled, trigger the generate-strategy function
                        if (settings.auto_generate_strategy) {
                          console.log('Auto-generating strategy for contact:', contact.id);
                          supabase.functions.invoke('generate-strategy', {
                            body: { contactId: contact.id }
                          }).catch(e => console.error('Error auto-generating strategy:', e));
                        }
                        
                        // Parse status update tags (side-effect, can be anywhere)
                        const statusMatches = aiText.matchAll(/\[SET_STATUS: (\w+)\]/g);
                        for (const match of statusMatches) {
                          const newStatus = match[1];
                          console.log(`AI setting status to: ${newStatus}`);
                          await supabase.from('crm_contacts').update({ status: newStatus }).eq('id', contact.id);
                          
                          // Increment metrics based on status
                          if (newStatus === 'qualified') {
                            await supabase.rpc('increment_crm_metric', { metric_column: 'qualified_count' });
                          } else if (newStatus === 'closed') {
                            await supabase.rpc('increment_crm_metric', { metric_column: 'sales_count' });
                          }
                        }
                        aiText = aiText.replace(/\[SET_STATUS: \w+\]/g, '').trim();

                        // Parse flow trigger (side-effect, can be anywhere)
                        const flowMatches = aiText.matchAll(/\[START_FLOW: ([\w-]+)\]/g);
                        for (const match of flowMatches) {
                          const flowId = match[1];
                          console.log(`AI suggested starting flow: ${flowId}`);
                          await supabase.functions.invoke('meta-whatsapp-crm', {
                            body: { 
                              action: 'startFlow', 
                              contactId: contact.id, 
                              waId: wa_id, 
                              flowId: flowId
                            }
                          });
                        }
                        aiText = aiText.replace(/\[START_FLOW: [\w-]+\]/g, '').trim();

                        // Now split the text by special tags (QUICK_REPLY, SEND_TEMPLATE, or SPLIT)
                        const parts = aiText.split(/(\[QUICK_REPLY:.*?\]|\[SEND_TEMPLATE:.*?\]|\[SPLIT\])/i)
                          .filter(p => p.trim() !== '' && p.toUpperCase() !== '[SPLIT]');
                        
                        console.log('AI Response parts:', JSON.stringify(parts));

                        const templateMatches = aiText.match(/\[SEND_TEMPLATE:\s*([\w_-]+)\]/gi);
                        const processedTemplates = new Set();
                        
                        if (settings.ai_operation_mode === 'monitor' && aiText.length > 0) {
                          console.log('AI is in monitor mode, suppressing outgoing message.');
                          return new Response('OK - AI Monitored', { status: 200 });
                        }

                        for (const part of parts) {
                          try {
                            const trimmedPart = part.trim();
                            if (!trimmedPart) continue;

                            // 1. Handle Template tag (Case-Insensitive)
                            const templateMatch = trimmedPart.match(/\[SEND_TEMPLATE:\s*([\w_-]+)\]/i);
                            if (templateMatch) {
                              const templateName = templateMatch[1].trim();
                              if (processedTemplates.has(templateName.toLowerCase())) continue;
                              processedTemplates.add(templateName.toLowerCase());
                              
                              console.log(`AI matched template tag: ${templateName}`);
                              
                              const { data: templateExists } = await supabase
                                .from('crm_templates')
                                .select('name, language, status')
                                .eq('name', templateName)
                                .maybeSingle();

                              if (templateExists) {
                                console.log(`Sending template: ${templateName}`);
                                await supabase.functions.invoke('meta-whatsapp-crm', {
                                  body: { 
                                    action: 'sendTemplate', 
                                    to: wa_id, 
                                    templateName: templateName,
                                    languageCode: templateExists.language || 'pt_BR',
                                    contactId: contact.id
                                  }
                                });
                              } else {
                                console.warn(`Template ${templateName} not found in database.`);
                              }
                              // Wait a bit after sending a template before next message if any
                              await new Promise(resolve => setTimeout(resolve, 3000));
                              continue;
                            }

                            // 2. Handle Quick Reply tag
                            const quickReplyMatch = trimmedPart.match(/\[QUICK_REPLY:\s*["']?([^"']+)["']?\s*\|\s*["']?([^"']+)["']?\s*\|\s*["']?([^"']+)["']?\s*(?:\|\s*["']?([^"']+)["']?\s*)?\]/i);
                            if (quickReplyMatch) {
                              const question = quickReplyMatch[1].trim();
                              const buttons = [quickReplyMatch[2].trim()];
                              if (quickReplyMatch[3]) buttons.push(quickReplyMatch[3].trim());
                              if (quickReplyMatch[4]) buttons.push(quickReplyMatch[4].trim());
                              
                              console.log(`Sending quick reply: ${question}`);
                              await supabase.functions.invoke('meta-whatsapp-crm', {
                                body: { 
                                  action: 'sendMessage', 
                                  to: wa_id, 
                                  text: question,
                                  buttons: buttons.map((text, idx) => ({ id: `qr_${idx}`, text: text.substring(0, 20) }))
                                }
                              });
                              await new Promise(resolve => setTimeout(resolve, 3000));
                              continue;
                            }

                            // 3. Normal text
                            console.log(`Sending text part: ${trimmedPart.substring(0, 50)}...`);
                            await supabase.functions.invoke('meta-whatsapp-crm', {
                              body: { action: 'sendMessage', to: wa_id, text: trimmedPart }
                            });
                            
                            // Delay between parts (3 seconds as requested for natural flow)
                            await new Promise(resolve => setTimeout(resolve, 3000));
                          } catch (partError) {
                            console.error('Error processing message part:', partError);
                            // Continue to next part even if one fails
                          }
                        }

                        // Final safety check: if templates were found but not processed in parts
                        if (templateMatches) {
                          for (const fullTag of templateMatches) {
                            const name = fullTag.match(/\[SEND_TEMPLATE:\s*([\w_-]+)\]/i)?.[1];
                            if (name && !processedTemplates.has(name.toLowerCase())) {
                              console.log(`Safety trigger for missed template: ${name}`);
                              const { data: tData } = await supabase.from('crm_templates').select('language').eq('name', name).maybeSingle();
                              await supabase.functions.invoke('meta-whatsapp-crm', {
                                body: { action: 'sendTemplate', to: wa_id, templateName: name, languageCode: tData?.language || 'pt_BR', contactId: contact.id }
                              });
                            }
                          }
                        }

                        return new Response('OK - AI Responded', { status: 200 });
                      } catch (err) {
                        console.error('AI Error:', err);
                      }
                    }
                  }

                  // 4. Default Auto-Responder (if AI didn't trigger)
                  if (isNewContact) {
                    if (settings?.initial_flow_id) {
                      await supabase.functions.invoke('meta-whatsapp-crm', {
                        body: { action: 'startFlow', flowId: settings.initial_flow_id, contactId: contact.id, waId: wa_id }
                      });
                    } else if (settings?.initial_auto_response_enabled) {
                      if (message.type === 'text') {
                         await supabase.functions.invoke('meta-whatsapp-crm', {
                           body: {
                             action: 'sendMessage',
                             to: wa_id,
                             text: settings.initial_response_text || `Olá ${contact_name}! Como posso te ajudar hoje?`,
                             buttons: settings.initial_response_buttons
                           }
                         });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Trigger scheduled messages processing
      try {
        await supabase.functions.invoke('meta-whatsapp-crm', { body: { action: 'processScheduled' } });
      } catch (e) {
        console.error('Error triggering scheduled messages:', e);
      }

      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Webhook processing error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})

async function transcribeAudio(apiKey: string, audioUrl: string) {
  try {
    const audioRes = await fetch(audioUrl);
    const audioBlob = await audioRes.blob();
    
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData
    });

    const data = await res.json();
    return data.text;
  } catch (err) {
    console.error('Transcription error:', err);
    throw err;
  }
}

async function downloadAndUploadMedia(supabase: any, token: string, mediaId: string, type: string, fileName?: string) {
  try {
    console.log(`Fetching media info for ${mediaId}...`);
    const infoRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!infoRes.ok) throw new Error('Failed to get media info');
    const info = await infoRes.json();
    
    if (!info.url) throw new Error('No media URL found');
    
    console.log(`Downloading media from ${info.url}...`);
    const mediaRes = await fetch(info.url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!mediaRes.ok) throw new Error('Failed to download media');
    const blob = await mediaRes.blob();
    
    const ext = info.mime_type?.split('/')?.[1] || 'bin';
    const name = fileName || `${mediaId}.${ext}`;
    const filePath = `inbound/${type}/${Date.now()}_${name}`;
    
    console.log(`Uploading to Supabase Storage: ${filePath}...`);
    const { error: uploadError } = await supabase.storage
      .from('crm-media')
      .upload(filePath, blob, {
        contentType: info.mime_type,
        upsert: true
      });
      
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('crm-media')
      .getPublicUrl(filePath);
      
    return publicUrl;
  } catch (err) {
    console.error('Error downloading/uploading media:', err);
    return null;
  }
}

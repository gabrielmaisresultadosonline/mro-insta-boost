import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function executeVisualNode(supabase: any, flow: any, node: any, contactId: string, waId: string) {
  console.log(`[EXECUTOR] Executing node ${node.id} (${node.type}) for contact ${contactId}`);

  try {
    // GUARD: Se o fluxo foi cancelado/desativado para esta conversa (ex.: usuário clicou em "Parar fluxo"
    // ou o contato foi colocado em 'idle' / mudou para outro fluxo), abortamos silenciosamente antes
    // de enviar qualquer mensagem. Isso impede envios fantasmas após o cancelamento.
    const { data: liveContact } = await supabase
      .from('crm_contacts')
      .select('current_flow_id, flow_state')
      .eq('id', contactId)
      .maybeSingle();

    if (!liveContact) {
      console.log(`[EXECUTOR] ABORT: contact ${contactId} not found.`);
      return { success: false, aborted: true, message: 'Contact not found' };
    }
    if (liveContact.flow_state === 'idle' || !liveContact.current_flow_id) {
      console.log(`[EXECUTOR] ABORT: flow was cancelled/deactivated for contact ${contactId} (state=${liveContact.flow_state}, flow_id=${liveContact.current_flow_id}). Skipping node ${node.id}.`);
      return { success: false, aborted: true, message: 'Flow cancelled' };
    }
    if (liveContact.current_flow_id !== flow.id) {
      console.log(`[EXECUTOR] ABORT: contact ${contactId} switched to another flow (${liveContact.current_flow_id} != ${flow.id}). Skipping node ${node.id}.`);
      return { success: false, aborted: true, message: 'Flow changed' };
    }

    if (node.type === 'message' || node.type === 'text' || node.type === 'question' || node.type === 'wait_response' || node.type === 'waitResponse') {
      const text = node.data?.text || node.data?.content || node.data?.question || "";
      const buttons = node.data?.buttons || [];
      console.log(`[EXECUTOR] Node ${node.id} (${node.type}) text="${text}", buttonsCount=${Array.isArray(buttons) ? buttons.length : 0}`);
      
      if (Array.isArray(buttons) && buttons.length > 0) {
        // Separa botões com link (URL) dos botões de resposta normais.
        // WhatsApp NÃO permite misturar cta_url + reply buttons numa mesma mensagem,
        // então enviamos os reply buttons primeiro e depois o(s) botão(ões) de link.
        const linkButtons = buttons.filter((btn: any) => btn.url && btn.url.startsWith('http'));
        const replyButtons = buttons.filter((btn: any) => !(btn.url && btn.url.startsWith('http')));

        const { data: settings } = await supabase.from('crm_settings').select('meta_phone_number_id, meta_access_token').eq('user_id', flow.user_id).maybeSingle();
        console.log(`[EXECUTOR] Settings found for user ${flow.user_id}: ${!!settings?.meta_access_token}`);

        // 1) Envia botões de resposta normais (se houver)
        if (replyButtons.length > 0) {
        
        console.log(`[EXECUTOR] Invoking meta-whatsapp-crm action=sendMessage for interactive buttons. ReplyButtons: ${replyButtons.length}`);
        const { data: result, error: invokeError } = await supabase.functions.invoke('meta-whatsapp-crm', {
          headers: {
            'Authorization': `Bearer INTERNAL_BYPASS`
          },
          body: { 
            action: 'sendMessage', 
            to: waId, 
            contactId,
            nodeId: node.id,
            meta_phone_number_id: settings?.meta_phone_number_id,
            meta_access_token: settings?.meta_access_token,
            interactive: {
              type: 'button',
              body: { text: text || "Escolha uma opção:" },
              action: {
                buttons: replyButtons.slice(0, 3).map((btn: any, index: number) => {
                  const rawTitle = btn.label || btn.text || `Opção ${index + 1}`;
                  // Meta exige limite de 20 caracteres no título do botão
                  const title = rawTitle.length > 20 ? rawTitle.substring(0, 17) + "..." : rawTitle;
                  return {
                    type: 'reply',
                    reply: {
                      id: btn.id || `btn_${index}`,
                      title: title
                    }
                  };
                })
              }
            }
          }
        });

        if (invokeError) {
          console.error(`[EXECUTOR] Error invoking meta-whatsapp-crm for buttons:`, invokeError);
          throw invokeError;
        }
        
        if (result && !result.success) {
          console.error(`[EXECUTOR] meta-whatsapp-crm returned error for buttons:`, result.error);
          throw new Error(result.error || "Erro no envio de botões");
        }

        console.log(`[EXECUTOR] Interactive buttons sent successfully to ${waId}`);
        await wait(1000); // Give small time for DB propagation if needed
        }

        // 2) Envia cada botão de link como mensagem cta_url separada
        for (const linkBtn of linkButtons) {
          console.log(`[EXECUTOR] Enviando botão de LINK para ${waId}: ${linkBtn.url}`);
          const imageUrl = (node.data?.imageUrl || '').toString();
          const hasImage = imageUrl.startsWith('http');
          const bodyText = replyButtons.length > 0
            ? (text || "Acesse pelo link:")
            : (text || "Clique abaixo para acessar:");
          const interactive: any = {
            type: 'cta_url',
            body: { text: bodyText },
            action: {
              name: "cta_url",
              parameters: {
                display_text: linkBtn.label || linkBtn.text || "Acessar",
                url: linkBtn.url
              }
            }
          };
          if (hasImage) {
            interactive.header = { type: 'image', image: { link: imageUrl } };
          }
          await supabase.functions.invoke('meta-whatsapp-crm', {
            headers: { 'Authorization': `Bearer INTERNAL_BYPASS` },
            body: {
              action: 'sendMessage',
              to: waId,
              contactId,
              meta_phone_number_id: settings?.meta_phone_number_id,
              meta_access_token: settings?.meta_access_token,
              interactive
            }
          });
          await wait(500);
        }
      } else if (text) {

        console.log(`[EXECUTOR] Enviando mensagem de texto simples para ${waId}`);
        const { data: settings } = await supabase.from('crm_settings').select('meta_phone_number_id, meta_access_token').eq('user_id', flow.user_id).maybeSingle();

        const body: any = { 
          action: 'sendMessage', 
          to: waId, 
          text, 
          contactId,
          nodeId: node.id,
          meta_phone_number_id: settings?.meta_phone_number_id,
          meta_access_token: settings?.meta_access_token
        };
        console.log(`[EXECUTOR] Invoking meta-whatsapp-crm action=sendMessage for text`);
        const { data: result, error: invokeError } = await supabase.functions.invoke('meta-whatsapp-crm', {
          headers: {
            'Authorization': `Bearer INTERNAL_BYPASS`
          },
          body
        });
        
        if (invokeError) {
          console.error(`[EXECUTOR] Erro ao invocar meta-whatsapp-crm para texto:`, invokeError);
          throw invokeError;
        }
        
        if (result && !result.success) {
          console.error(`[EXECUTOR] meta-whatsapp-crm retornou erro no envio de texto:`, result.error);
          throw new Error(result.error || "Erro no envio de texto");
        }
      }

      // Se chegamos aqui, a mensagem (ou botões) foi enviada com sucesso.
      
      // NOVO: Se o nó não é uma pergunta/espera mas tem botões, ele deve parar e esperar resposta
      // para que os cliques nos botões funcionem.
      const hasButtons = node.data?.buttons && node.data.buttons.length > 0;
      const isExplicitWait = node.type === 'question' || node.type === 'wait_response' || node.type === 'waitResponse';
      // Existem arestas de SAÍDA reais a partir deste nó (clique de botão / resposta / timeout)?
      const outgoingEdges = (flow.edges || []).filter((e: any) => e.source === node.id);
      const hasFollowups = outgoingEdges.length > 0;

      if (isExplicitWait || (hasButtons && hasFollowups)) {
        const timeoutEdge = isExplicitWait
          ? flow.edges?.find((e: any) => e.source === node.id && e.sourceHandle === 'timeout')
          : null;
        const rawTimeout = Number(node.data?.timeout);
        const timeoutMinutes = (isExplicitWait && timeoutEdge && Number.isFinite(rawTimeout) && rawTimeout > 0)
          ? rawTimeout
          : null;

        console.log(`[FLOW-LOG] Node ${node.id} (${node.type}) STARTING WAIT (hasButtons=${hasButtons}, explicitWait=${isExplicitWait}). Timeout: ${timeoutMinutes ? timeoutMinutes + 'min' : 'INDEFINIDO'}. Target timeout: ${timeoutEdge?.target}`);

        const { error: updateError } = await supabase.from('crm_contacts').update({
          flow_state: 'waiting_response',
          next_execution_time: null,
          flow_timeout_minutes: timeoutMinutes,
          flow_timeout_node_id: timeoutEdge?.target || null,
          last_flow_interaction: new Date().toISOString()
        }).eq('id', contactId);

        if (updateError) {
          console.error(`[FLOW-LOG] ERROR updating contact ${contactId} to waiting_response:`, updateError);
          throw updateError;
        }
        return { success: true, message: 'Waiting for response' };
      }

      if (hasButtons && !hasFollowups) {
        // Botões enviados (ex: link/URL) sem ramificações configuradas — encerra o fluxo.
        console.log(`[FLOW-LOG] Node ${node.id} sent buttons without follow-up edges. Closing flow.`);
        await supabase.from('crm_contacts').update({
          flow_state: 'idle',
          current_flow_id: null,
          current_node_id: null,
          next_execution_time: null,
          flow_timeout_minutes: null,
          flow_timeout_node_id: null
        }).eq('id', contactId);
        return { success: true, message: 'Buttons sent, no follow-up, flow closed' };
      }
    } else if (node.type === 'image' || node.type === 'video' || node.type === 'audio' || node.type === 'document') {
      const mediaUrl = node.data?.url || node.data?.mediaUrl || node.data?.fileUrl || node.data?.audioUrl || node.data?.imageUrl || node.data?.videoUrl || node.data?.documentUrl;
      console.log(`[FLOW-LOG] Node ${node.id} (${node.type}). Media: ${mediaUrl}`);
      if (mediaUrl) {
        console.log(`[FLOW-LOG] Calling meta-whatsapp-crm action=sendMessage for ${node.type}`);
        const { data: result, error: invokeError } = await supabase.functions.invoke('meta-whatsapp-crm', {
          headers: { 'Authorization': `Bearer INTERNAL_BYPASS` },
          body: { 
            action: 'sendMessage', 
            to: waId, 
            [node.type + 'Url']: mediaUrl,
            contactId,
            nodeId: node.id,
            isVoice: node.type === 'audio'
          }
        });

        if (invokeError) {
          console.error(`[FLOW-LOG] ERROR in meta-whatsapp-crm for ${node.type}:`, invokeError);
          throw invokeError;
        }

        if (result && !result.success) {
          console.error(`[FLOW-LOG] Result ERROR in meta-whatsapp-crm for ${node.type}:`, result.error);
          throw new Error(result.error || `Erro no envio de ${node.type}`);
        }

        console.log(`[FLOW-LOG] SUCCESS: ${node.type} sent. Result:`, JSON.stringify(result));
      } else {
        console.error(`[FLOW-LOG] FAILED: No media URL for node ${node.id} (${node.type})`);
      }
    } else if (node.type === 'template') {
      const templateName = node.data?.templateName;
      if (templateName) {
        console.log(`[EXECUTOR] Enviando template ${templateName} para ${waId}`);
        const { data: result, error: invokeError } = await supabase.functions.invoke('meta-whatsapp-crm', {
          headers: { 'Authorization': `Bearer INTERNAL_BYPASS` },
          body: { action: 'sendTemplate', to: waId, templateName, languageCode: node.data?.language || 'pt_BR', contactId }
        });
        if (invokeError) {
          console.error(`[EXECUTOR] Erro ao invocar sendTemplate:`, invokeError);
          throw invokeError;
        }
        if (result && !result.success) {
          console.error(`[EXECUTOR] meta-whatsapp-crm retornou erro no envio de template:`, result.error);
          throw new Error(result.error || `Erro no envio de template`);
        }
      }

      // Se houver um nó de timeout conectado a este template, configuramos a espera
      const timeoutEdge = flow.edges?.find((e: any) => e.source === node.id && e.sourceHandle === 'timeout');
      if (timeoutEdge) {
        const timeoutMinutes = parseInt(node.data?.timeout || '20');
        await supabase.from('crm_contacts').update({
          flow_state: 'waiting_response',
          next_execution_time: null,
          flow_timeout_minutes: timeoutMinutes,
          flow_timeout_node_id: timeoutEdge.target,
          last_flow_interaction: new Date().toISOString()
        }).eq('id', contactId);
        
        console.log(`Template node ${node.id}: Waiting ${timeoutMinutes}min for response, then will go to ${timeoutEdge.target}`);
        return { success: true, message: 'Template sent, waiting for response or timeout' };
      }
    } else if (node.type === 'delay') {
      const waitTime = parseInt(node.data?.delay || '5');
      const nextExecution = new Date(Date.now() + waitTime * 1000).toISOString();
      
      const edge = flow.edges?.find((e: any) => e.source === node.id);
      if (edge) {
        await supabase.from('crm_contacts').update({
          next_execution_time: nextExecution,
          current_node_id: edge.target,
          flow_state: 'running'
        }).eq('id', contactId);
        
        console.log(`Delay node ${node.id}: Scheduled next node ${edge.target} at ${nextExecution}`);
        return { success: true, message: `Delay scheduled for ${waitTime}s` };
      }
    } else if (node.type === 'aiAgent') {
      console.log(`[EXECUTOR] Entering AI Agent node ${node.id} for contact ${contactId}`);
      
      const prompt = node.data?.prompt || "";
      const labelOnTransfer = node.data?.labelOnHumanTransfer || "";
      const { data: currentContact } = await supabase
        .from('crm_contacts')
        .select('metadata')
        .eq('id', contactId)
        .maybeSingle();
      const { data: settings } = await supabase
        .from('crm_settings')
        .select('ai_agent_enabled')
        .eq('user_id', flow.user_id)
        .maybeSingle();
      const shouldActivateAi = settings?.ai_agent_enabled === true || currentContact?.metadata?.manual_ai_activation === true;

      if (!shouldActivateAi) {
        console.log(`[EXECUTOR] AI Agent node ${node.id} skipped: general AI disabled and no manual activation for contact ${contactId}`);
        await supabase.from('crm_contacts').update({
          flow_state: 'idle',
          current_node_id: null,
          ai_active: false,
          metadata: {
            ...(currentContact?.metadata || {}),
            ai_agent_prompt: prompt,
            ai_agent_label_on_transfer: labelOnTransfer,
            ai_agent_node_id: node.id
          }
        }).eq('id', contactId);
        return { success: true, message: 'AI agent skipped because it is not enabled for this contact' };
      }
      
      // Se tiver uma mensagem inicial configurada no nó, envia antes de disparar a IA
      const initialMessageText = node.data?.initialMessage || "";
      if (initialMessageText) {
        console.log(`[EXECUTOR] Sending AI Agent initial message: ${initialMessageText}`);
        await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { action: 'sendMessage', to: waId, text: initialMessageText, contactId }
        });
      }

      console.log(`[EXECUTOR] Updating contact ${contactId} to ai_handling state. prompt length: ${prompt.length}`);
      await supabase.from('crm_contacts').update({
        flow_state: 'ai_handling',
        current_node_id: node.id,
        ai_active: true,
        metadata: { 
          ...(currentContact?.metadata || {}),
          ...(node.data || {}),
          manual_ai_activation: currentContact?.metadata?.manual_ai_activation === true,
          ai_agent_prompt: prompt,
          ai_agent_label_on_transfer: labelOnTransfer,
          ai_agent_node_id: node.id
        }
      }).eq('id', contactId);
      
      console.log(`[EXECUTOR] Contact ${contactId} state updated to ai_handling. Triggering initial processAiAgentResponse.`);
      // IMPORTANTE: Dispara o processamento inicial da IA para que ela responda sem esperar nova mensagem do cliente
      // Exceto se configurado para aguardar a primeira resposta
      if (node.data?.wait_response_before_start !== true) {
        await supabase.functions.invoke('meta-whatsapp-crm', {
          headers: { 'Authorization': `Bearer INTERNAL_BYPASS` },
          body: { 
            action: 'processAiAgent', 
            contactId: contactId, 
            waId: waId,
            text: initialMessageText || "Inicie o atendimento se apresentando."
          }
        });
      } else {
        console.log(`[EXECUTOR] AI Agent configured to wait for first response. Skipping initial trigger.`);
      }
      
      return { success: true, message: 'Contact moved to AI handling state' };
    } else if (node.type === 'crmAction') {
      const action = node.data?.action;
      const statusValue = node.data?.statusValue;
      
      console.log(`[EXECUTOR] Executing CRM Action: ${action} for contact ${contactId}`);
      
      if (action === 'Adicionar Etiqueta' && statusValue) {
        await supabase.from('crm_contacts').update({ status: statusValue }).eq('id', contactId);
      } else if (action === 'Mudar Status: Ganho') {
        await supabase.from('crm_contacts').update({ status: 'closed' }).eq('id', contactId);
      } else if (action === 'Mudar Status: Perdido') {
        await supabase.from('crm_contacts').update({ status: 'lost' }).eq('id', contactId);
      } else if (action === 'Humanizar Atendimento') {
        await supabase.from('crm_contacts').update({ status: 'human', ai_active: false }).eq('id', contactId);
      } else if (action === 'Notificar Agente') {
        // Implement logic if needed
      }
    } else if (node.type === 'pix') {
      const pixKey = node.data?.pixKey || "";
      const amount = node.data?.amount || "0.00";
      const description = node.data?.description || "Pagamento PIX";
      
      console.log(`[EXECUTOR] Gerando cobrança PIX para ${waId}: R$ ${amount}`);
      
      const pixText = `*COBRANÇA PIX GERADA*\n\n📌 *Item:* ${description}\n💰 *Valor:* R$ ${amount}\n\nAbra o app do seu banco e escolha a opção *PIX Copia e Cola*.\n\n👇 *CÓDIGO ABAIXO:*`;
      
      // Aqui simularíamos a geração do código real. Para o MVP, enviamos o texto e a instrução.
      const pixCode = `00020126580014br.gov.bcb.pix01${pixKey.length.toString().padStart(2, '0')}${pixKey}520400005303986540${amount.length.toString().padStart(2, '0')}${amount}5802BR5913ZAP_MRO_CRM6009SAO_PAULO62070503***6304abcd`;

      await supabase.functions.invoke('meta-whatsapp-crm', {
        headers: { 'Authorization': `Bearer INTERNAL_BYPASS` },
        body: { action: 'sendMessage', to: waId, text: pixText, contactId }
      });

      await supabase.functions.invoke('meta-whatsapp-crm', {
        headers: { 'Authorization': `Bearer INTERNAL_BYPASS` },
        body: { action: 'sendMessage', to: waId, text: pixCode, contactId }
      });

      console.log(`[EXECUTOR] PIX enviado com sucesso para ${waId}`);
    }

    
    // Find next node based on handle or standard connection
    // BUT: If the current node was a question/wait_response or has buttons, we ALREADY handled its state transition in the webhook/above
    // This part should only run for nodes that trigger a "next" automatically (like message, audio, etc.)
    const hasButtons = node.data?.buttons && node.data.buttons.length > 0;
    
    // Check if it's a question-like node
    const isQuestionNode = node.type === 'question' || node.type === 'wait_response' || node.type === 'waitResponse';
    
    console.log(`[EXECUTOR] Checking next node. isQuestionNode=${isQuestionNode}, hasButtons=${hasButtons}, nodeType=${node.type}`);

    const outgoingEdgesAll = (flow.edges || []).filter((e: any) => e.source === node.id);

    if (!isQuestionNode && node.type !== 'delay' && node.type !== 'aiAgent' && !hasButtons) {
      const edge = flow.edges?.find((e: any) => e.source === node.id && (!e.sourceHandle || e.sourceHandle === 'next' || e.sourceHandle === 'responded' || e.sourceHandle === 'any_response'));
      
      if (edge) {
        const nextNode = flow.nodes?.find((n: any) => n.id === edge.target);
        if (nextNode) {
          const delay = parseInt(node.data?.delayAfter || '1');
          console.log(`[EXECUTOR] Node ${node.id} finished. Moving to ${nextNode.id} (${nextNode.type}) after ${delay}s`);
          
          await supabase.from('crm_contacts').update({
            current_node_id: nextNode.id,
            next_execution_time: null,
            flow_state: 'running'
          }).eq('id', contactId);
          
          // Execute next node immediately after a small wait to ensure message order
          if (delay > 0) await wait(delay * 1000);
          return await executeVisualNode(supabase, flow, nextNode, contactId, waId);
        }
      }
    } else if (isQuestionNode || (hasButtons && outgoingEdgesAll.length > 0)) {
       console.log(`[EXECUTOR] Node ${node.id} has buttons or is question. Stopped to wait for interaction.`);
       // Certifica que o estado está correto
       await supabase.from('crm_contacts').update({
         flow_state: 'waiting_response',
         current_node_id: node.id
       }).eq('id', contactId);
       return { success: true, message: 'Wait for interaction' };
    } else if (hasButtons && outgoingEdgesAll.length === 0) {
       console.log(`[EXECUTOR] Node ${node.id} has buttons but no outgoing edges. Closing flow.`);
       await supabase.from('crm_contacts').update({
         flow_state: 'idle',
         current_flow_id: null,
         current_node_id: null,
         next_execution_time: null,
         flow_timeout_minutes: null,
         flow_timeout_node_id: null
       }).eq('id', contactId);
       return { success: true, message: 'Buttons sent, no follow-up' };
    }


    console.log(`End of flow reached for contact ${contactId}`);
    await supabase.from('crm_contacts').update({
      flow_state: 'idle',
      current_flow_id: null,
      current_node_id: null,
      next_execution_time: null
    }).eq('id', contactId);

    return { success: true };
  } catch (err: any) {
    console.error(`Error executing node ${node.id}:`, err);
    await supabase.from('crm_contacts').update({
      flow_state: 'error',
      metadata: { last_flow_error: err.message }
    }).eq('id', contactId);
    throw err;
  }
}

export async function processStep(supabase: any, step: any, contactId: string, waId: string) {
  console.log(`Executing legacy step ${step.id} for contact ${contactId}`);
  return { success: true };
}

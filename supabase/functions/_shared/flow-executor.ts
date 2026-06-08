import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export async function executeVisualNode(supabase: any, flow: any, node: any, contactId: string, waId: string) {
  console.log(`Executing node ${node.id} (${node.type}) for contact ${contactId}`);

  try {
    if (node.type === 'message' || node.type === 'text' || node.type === 'question' || node.type === 'wait_response' || node.type === 'waitResponse') {
      const text = node.data?.text || node.data?.content || node.data?.question || "";
      const buttons = node.data?.buttons || [];
      
      if (buttons && buttons.length > 0) {
        // Enviar como mensagem interativa com botões (Meta Interactive Buttons)
        await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { 
            action: 'sendMessage', 
            to: waId, 
            contactId,
            interactive: {
              type: 'button',
              body: { text: text || "Escolha uma opção:" },
              action: {
                buttons: buttons.slice(0, 3).map((btn: any, index: number) => ({
                  type: 'reply',
                  reply: {
                    id: btn.id || `btn_${index}`,
                    title: btn.label || btn.text || `Opção ${index + 1}`
                  }
                }))
              }
            }
          }
        });
      } else if (text) {
        console.log(`[EXECUTOR] Enviando mensagem de texto simples para ${waId}`);
        const { data: result, error: invokeError } = await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { action: 'sendMessage', to: waId, text, contactId }
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

      // If it's just a message (not waiting for response), we don't return here, 
      // we let it continue to the "find next node" logic at the end of function
      if (node.type === 'question' || node.type === 'wait_response' || node.type === 'waitResponse') {
        // Find timeout edge
        const timeoutEdge = flow.edges?.find((e: any) => e.source === node.id && e.sourceHandle === 'timeout');
        const timeoutMinutes = parseInt(node.data?.timeout || '20');
        
        console.log(`[EXECUTOR] Node ${node.id} is a wait/question node. Timeout minutes: ${timeoutMinutes}, Target: ${timeoutEdge?.target}`);
        
        await supabase.from('crm_contacts').update({
          flow_state: 'waiting_response',
          next_execution_time: null,
          flow_timeout_minutes: timeoutMinutes,
          flow_timeout_node_id: timeoutEdge?.target || null,
          last_flow_interaction: new Date().toISOString()
        }).eq('id', contactId);
        
        return { success: true, message: 'Sent interactive buttons and waiting for response' };
      }
    } else if (node.type === 'image' || node.type === 'video' || node.type === 'audio' || node.type === 'document') {
      const mediaUrl = node.data?.url || node.data?.mediaUrl || node.data?.fileUrl || node.data?.audioUrl || node.data?.imageUrl || node.data?.videoUrl || node.data?.documentUrl;
      console.log(`[EXECUTOR] Nó ${node.id} (${node.type}). Dados:`, JSON.stringify(node.data));
      if (mediaUrl) {
        console.log(`[EXECUTOR] Chamando meta-whatsapp-crm para enviar ${node.type}: ${mediaUrl}`);
        const { data: result, error: invokeError } = await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { 
            action: 'sendMessage', 
            to: waId, 
            [node.type + 'Url']: mediaUrl,
            contactId,
            isVoice: node.type === 'audio'
          }
        });

        if (invokeError) {
          console.error(`[EXECUTOR] ERRO AO INVOCAR meta-whatsapp-crm para ${node.type}:`, invokeError);
          // IMPORTANTE: Mesmo com erro de envio, precisamos decidir se o fluxo para ou segue.
          // Por segurança, vamos lançar o erro para marcar o contato como 'error'
          throw invokeError;
        }

        if (result && !result.success) {
          console.error(`[EXECUTOR] meta-whatsapp-crm retornou erro no envio de ${node.type}:`, result.error);
          throw new Error(result.error || `Erro no envio de ${node.type}`);
        }

        console.log(`[EXECUTOR] Sucesso no envio de ${node.type}:`, JSON.stringify(result));
      } else {
        console.warn(`[EXECUTOR] Nó de mídia ${node.type} (${node.id}) sem URL definida.`);
      }
    } else if (node.type === 'template') {
      const templateName = node.data?.templateName;
      if (templateName) {
        console.log(`[EXECUTOR] Enviando template ${templateName} para ${waId}`);
        const { data: result, error: invokeError } = await supabase.functions.invoke('meta-whatsapp-crm', {
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
      
      // Se tiver uma mensagem inicial configurada no nó, envia antes de disparar a IA
      const initialMessageText = node.data?.initialMessage || "";
      if (initialMessageText) {
        console.log(`[EXECUTOR] Sending AI Agent initial message: ${initialMessageText}`);
        await supabase.functions.invoke('meta-whatsapp-crm', {
          body: { action: 'sendMessage', to: waId, text: initialMessageText, contactId }
        });
      }

      await supabase.from('crm_contacts').update({
        flow_state: 'ai_handling',
        current_node_id: node.id,
        ai_active: true,
        metadata: { 
          ...(node.data || {}),
          ai_agent_prompt: prompt,
          ai_agent_label_on_transfer: labelOnTransfer,
          ai_agent_node_id: node.id
        }
      }).eq('id', contactId);
      
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
    }
    
    // Find next node based on handle or standard connection
    // BUT: If the current node was a question/wait_response, we ALREADY handled its state transition in the webhook
    // This part should only run for nodes that trigger a "next" automatically (like message, audio, etc.)
    if (node.type !== 'question' && node.type !== 'wait_response' && node.type !== 'waitResponse' && node.type !== 'delay' && node.type !== 'aiAgent') {
      const edge = flow.edges?.find((e: any) => e.source === node.id && (!e.sourceHandle || e.sourceHandle === 'next'));
      
      if (edge) {
        const nextNode = flow.nodes?.find((n: any) => n.id === edge.target);
        if (nextNode) {
          const delay = parseInt(node.data?.delayAfter || '2');
          console.log(`Scheduling next node ${nextNode.id} after ${node.type} with ${delay}s delay`);
          const nextTime = new Date(Date.now() + delay * 1000).toISOString();
          await supabase.from('crm_contacts').update({
            current_node_id: nextNode.id,
            next_execution_time: nextTime,
            flow_state: 'running'
          }).eq('id', contactId);
          
          return { success: true, message: 'Next node scheduled', nextNodeId: nextNode.id };
        }
      }
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

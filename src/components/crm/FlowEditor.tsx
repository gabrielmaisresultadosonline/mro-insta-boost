import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Save, 
  Plus, 
  MessageSquare, 
  Mic, 
  Video, 
  ImageIcon,
  Clock, 
  HelpCircle, 
  ArrowRight,
  Trash2,
  X,
  Zap,
  AlertCircle,
  Upload,
  UserCheck,
  Timer,
  Settings,
  FileText,
  RefreshCcw,
  GitBranch,
  BrainCircuit,
  UserCog,
  Link as LinkIcon
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Custom Node Types
const PixNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-cyan-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-cyan-500 text-white rounded-t-lg">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Zap className="w-3 h-3" /> Cobrança PIX
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-700">Valor: R$ {data.amount || '0,00'}</p>
        <p className="text-[9px] text-muted-foreground line-clamp-1 italic">{data.description || 'Pagamento via PIX'}</p>
      </div>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const MessageNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-blue-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-blue-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <MessageSquare className="w-3 h-3" /> Mensagem de Texto
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] text-muted-foreground line-clamp-2">{data.text || 'Sem texto...'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const AudioNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-purple-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-purple-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Mic className="w-3 h-3" /> Áudio {data.isPTT && <Badge variant="secondary" className="bg-white/20 text-white border-none text-[8px] h-4">Gravado</Badge>}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] text-muted-foreground truncate">{data.fileName || data.audioUrl || 'Nenhum áudio selecionado'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const VideoNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-orange-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-orange-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Video className="w-3 h-3" /> Vídeo
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] text-muted-foreground truncate">{data.fileName || data.videoUrl || 'Nenhum vídeo selecionado'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const ImageNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-emerald-400 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-emerald-400 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <ImageIcon className="w-3 h-3" /> Imagem
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      {data.imageUrl ? (
        <div className="aspect-video w-full rounded bg-slate-100 flex items-center justify-center overflow-hidden">
          <img src={data.imageUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground truncate">{data.fileName || 'Nenhuma imagem selecionada'}</p>
      )}
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const WaitResponseNode = ({ data }: any) => (
  <Card className="min-w-[220px] border-indigo-500 shadow-md">
    <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white" />
    <CardHeader className="p-3 bg-indigo-500 text-white rounded-t-lg">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <UserCheck className="w-3 h-3" /> Aguardar Resposta
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 space-y-2">
      <div className="relative flex items-center justify-between bg-indigo-50 text-indigo-700 px-3 py-2 rounded border border-indigo-100 text-[10px] font-medium group">
        <span>Se responder</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="responded" 
          className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white !-right-4"
        />
      </div>
      <div className="relative flex items-center justify-between bg-slate-50 text-slate-600 px-3 py-2 rounded border border-slate-200 text-[10px] font-medium group">
        <span>Sem resposta ({data.timeout || 20}m)</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="timeout" 
          className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white !-right-4"
        />
      </div>
    </CardContent>
  </Card>
);

const DelayNode = ({ data }: any) => (
  <Card className="min-w-[150px] border-amber-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-amber-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Clock className="w-3 h-3" /> Aguardar
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] font-bold">{data.delay || 5} {data.unit || 'segundos'}</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const QuestionNode = ({ data }: any) => (
  <Card className="min-w-[250px] border-emerald-500 shadow-md">
    <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white" />
    <CardHeader className="p-3 bg-emerald-500 text-white rounded-t-lg">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <HelpCircle className="w-3 !h-3" /> Pergunta com Botões
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 space-y-3">
      <p className="text-[10px] text-muted-foreground line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">{data.text || 'Qual a sua dúvida?'}</p>
      <div className="flex flex-col gap-2">
        {(data.buttons || []).map((btn: any, idx: number) => (
          <div key={idx} className="relative flex items-center justify-between bg-emerald-50 text-emerald-700 px-3 py-2 rounded border border-emerald-200 text-[10px] font-medium group">
            <span className="truncate pr-4 flex items-center gap-1">
              {btn.text}
              {btn.url && <LinkIcon className="w-2.5 h-2.5 opacity-50" />}
            </span>
            {!btn.url && (
              <Handle 
                type="source" 
                position={Position.Right} 
                id={btn.id || `btn-${idx}`} 
                className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white !-right-4"
              />
            )}
          </div>
        ))}
        {data.anyResponse && (
          <div className="relative flex items-center justify-between bg-indigo-50 text-indigo-700 px-3 py-2 rounded border border-indigo-100 text-[10px] font-medium group mt-1">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Qualquer resposta</span>
            <Handle 
              type="source" 
              position={Position.Right} 
              id="any_response" 
              className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white !-right-4"
            />
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const FollowUpNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-red-500 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-red-500 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <AlertCircle className="w-3 h-3" /> Lembrete (Sem Resposta)
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] text-muted-foreground">Se não responder em {data.timeout || 20} min</p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

const CRMActionNode = ({ data }: any) => (
  <Card className="min-w-[180px] border-slate-700 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-slate-700 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <Zap className="w-3 h-3" /> Ação CRM
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] font-bold text-slate-600">{data.action || 'Notificar Agente'}</p>
      {data.action === 'Adicionar Etiqueta' && (data.statusLabel || data.statusValue) && (
        <Badge variant="outline" className="mt-1 text-[8px] h-4 bg-slate-50">{data.statusLabel || data.statusValue}</Badge>
      )}
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

// TemplateNode is defined later with enhanced styling


const JumpNode = ({ data }: any) => (
  <Card className="min-w-[200px] border-amber-600 shadow-md">
    <Handle type="target" position={Position.Top} />
    <CardHeader className="p-3 bg-amber-600 text-white rounded-t-lg flex flex-row items-center justify-between">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <GitBranch className="w-3 h-3" /> Pular para Fluxo
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3">
      <p className="text-[10px] font-bold text-amber-700 truncate">
        {data.targetFlowName || 'Selecione o fluxo...'}
      </p>
    </CardContent>
    <Handle type="source" position={Position.Bottom} />
  </Card>
);

// Custom Edge with a button to break the connection
const ButtonEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: any) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-5 h-5 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer group scale-90 hover:scale-110 active:scale-95"
            onClick={onEdgeClick}
            title="Quebrar conexão"
          >
            <X className="w-3 h-3 text-slate-400 group-hover:text-red-500" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const AIAgentNode = ({ data }: any) => (
  <Card className="min-w-[250px] border-violet-600 border-2 shadow-lg ring-1 ring-violet-200">
    <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-violet-600 !border-2 !border-white" />
    <CardHeader className="p-3 bg-violet-600 text-white rounded-t-sm">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <BrainCircuit className="w-4 h-4 animate-pulse" /> Atendente e Vendedor I.A
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 space-y-3 bg-white">
      {data.initialMessage && (
        <div className="bg-slate-50 p-2 rounded-md border border-slate-100 mb-2">
          <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5 flex items-center gap-1">
            <MessageSquare className="w-2.5 h-2.5" /> Mensagem Inicial:
          </p>
          <p className="text-[10px] text-slate-600 line-clamp-2 italic">
            {data.initialMessage}
          </p>
        </div>
      )}
      <div className="bg-violet-50 p-2.5 rounded-md border border-violet-100 shadow-inner">
        <p className="text-[10px] text-violet-800 font-bold uppercase mb-1 flex items-center gap-1">
          <BrainCircuit className="w-3 h-3" /> Instruções de Venda:
        </p>
        <p className="text-[11px] text-slate-700 line-clamp-4 italic leading-relaxed">
          {data.prompt || 'Configure as instruções nas configurações ao lado...'}
        </p>
      </div>
      <div className="relative flex items-center justify-between bg-emerald-100 text-emerald-800 px-3 py-2.5 rounded-md border border-emerald-200 text-[11px] font-bold shadow-sm group">
        <span className="flex items-center gap-1.5"><UserCog className="w-3.5 h-3.5" /> Direcionar Humano</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="human_transfer" 
          className="!w-3.5 !h-3.5 !bg-emerald-600 !border-2 !border-white !-right-4 shadow-sm"
        />
      </div>
    </CardContent>
    <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-violet-600 !border-2 !border-white" />
  </Card>
);

const TemplateNode = ({ data }: any) => (
  <Card className="min-w-[250px] border-blue-600 border-2 shadow-lg ring-1 ring-blue-200">
    <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white" />
    <CardHeader className="p-3 bg-blue-600 text-white rounded-t-sm">
      <CardTitle className="text-xs font-bold flex items-center gap-2">
        <FileText className="w-4 h-4" /> Template Meta
      </CardTitle>
    </CardHeader>
    <CardContent className="p-3 space-y-3 bg-white">
      <div className="bg-blue-50 p-2.5 rounded-md border border-blue-100 shadow-inner">
        <p className="text-[10px] text-blue-800 font-bold uppercase mb-1">Template Selecionado:</p>
        <p className="text-[11px] text-slate-700 font-medium truncate">
          {data.templateName || 'Selecione um template...'}
        </p>
        <p className="text-[10px] text-slate-500 mt-1 italic line-clamp-2">
          {data.bodyText || ''}
        </p>
      </div>
      {data.anyResponse && (
        <div className="flex items-center gap-1.5 text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
          <Zap className="w-3 h-3" /> Qualquer resposta segue fluxo
        </div>
      )}
    </CardContent>
    <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white" />
  </Card>
);

const nodeTypes = {
  message: MessageNode,
  audio: AudioNode,
  video: VideoNode,
  image: ImageNode,
  delay: DelayNode,
  question: QuestionNode,
  followup: FollowUpNode,
  waitResponse: WaitResponseNode,
  crmAction: CRMActionNode,
  template: TemplateNode,
  jump: JumpNode,
  aiAgent: AIAgentNode,
  pix: PixNode,
};

const edgeTypes = {
  button: ButtonEdge,
};

interface FlowEditorProps {
  flow: any;
  onSave: (flow: any) => void;
  onClose: () => void;
}

const FlowEditorInner: React.FC<FlowEditorProps> = ({ flow, onSave, onClose }) => {
  const { screenToFlowPosition } = useReactFlow();
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState(flow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState((flow?.edges || []).map((e: any) => ({ ...e, type: 'button' })));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [flowName, setFlowName] = useState(flow?.name || 'Novo Fluxo');
  const [triggerType, setTriggerType] = useState(flow?.trigger_type || 'manual');
  const [triggerKeywords, setTriggerKeywords] = useState(flow?.trigger_keywords?.join(', ') || flow?.trigger_keyword || '');
  const [triggerTag, setTriggerTag] = useState(flow?.trigger_tag || '');
  const [isActive, setIsActive] = useState(flow?.is_active !== false);
  const [uploading, setUploading] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [availableFlows, setAvailableFlows] = useState<any[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [templatesRes, flowsRes, statusesRes] = await Promise.all([
        supabase.from('crm_templates').select('*'),
        supabase.from('zapi_flows').select('id, name'),
        supabase.from('crm_statuses').select('*').order('sort_order', { ascending: true })
      ]);
      
      if (templatesRes.data) setAvailableTemplates(templatesRes.data);
      if (flowsRes.data) setAvailableFlows(flowsRes.data);
      if (statusesRes.data) setAvailableStatuses(statusesRes.data);
    };
    fetchData();
  }, []);

  const handleFileUpload = async (file: File, nodeId: string, type: 'audio' | 'video' | 'image') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `flow-media/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('crm-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('crm-media')
        .getPublicUrl(filePath);

      const updateData: any = { fileName: file.name };
      if (type === 'audio') updateData.audioUrl = publicUrl;
      if (type === 'video') updateData.videoUrl = publicUrl;
      if (type === 'image') updateData.imageUrl = publicUrl;

      updateNodeData(nodeId, updateData);
      toast({ title: "Arquivo enviado com sucesso!" });
    } catch (error: any) {
      toast({ 
        title: "Erro no upload", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const edge = {
        ...params,
        type: 'button',
        animated: true,
        style: { strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) =>
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    [setEdges],
  );

  const addNode = (type: string) => {
    const id = `${type}_${Date.now()}`;
    const position = { x: 100, y: 100 };
    let data: any = {};

    switch (type) {
      case 'message': data = { text: 'Nova mensagem de texto' }; break;
      case 'audio': data = { audioUrl: '', fileName: '', isPTT: true }; break;
      case 'video': data = { videoUrl: '', fileName: '' }; break;
      case 'image': data = { imageUrl: '', fileName: '' }; break;
      case 'delay': data = { delay: 5, unit: 'segundos' }; break;
      case 'question': data = { text: 'Qual a sua dúvida?', buttons: [{ text: 'Opção 1', id: 'opt1' }, { text: 'Opção 2', id: 'opt2' }], anyResponse: false }; break;
      case 'followup': data = { timeout: 20 }; break;
      case 'waitResponse': data = { timeout: 20 }; break;
      case 'crmAction': data = { action: 'Adicionar Etiqueta', statusLabel: 'new' }; break;
      case 'template': data = { templateName: '', language: 'pt_BR', anyResponse: false }; break;
      case 'jump': data = { targetFlowId: '', targetFlowName: '' }; break;
      case 'aiAgent': data = { prompt: '', labelOnHumanTransfer: 'Atenção: Humano Necessário' }; break;
      case 'pix': data = { pixKey: '', amount: '47.00', description: 'Pagamento via PIX' }; break;
    }

    const newNode: Node = {
      id,
      type,
      position,
      data,
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, ...newData } }));
    }
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const handleSave = () => {
    onSave({
      ...flow,
      name: flowName,
      trigger_type: triggerType,
      trigger_keywords: triggerType === 'exact_phrase' ? [triggerKeywords.trim()] : triggerKeywords.split(',').map(k => k.trim()).filter(k => k !== ''),
      trigger_tag: triggerTag,
      is_active: isActive,
      nodes,
      edges,
    });
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <header className="border-b p-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          <div className="space-y-1">
            <Input 
              value={flowName} 
              onChange={(e) => setFlowName(e.target.value)}
              className="font-bold border-none h-auto p-0 focus-visible:ring-0 text-lg"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              Editor de Fluxo Visual
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-[10px] gap-1 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 ml-2" 
                onClick={() => setSelectedNode(null)}
              >
                <Zap className="w-3 h-3" /> Configurar Gatilho
              </Button>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5 mr-4">
            <Zap className="w-3 h-3 mr-1" /> Mensagens após 24h serão Marketing (Pago)
          </Badge>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-2" /> Salvar Fluxo
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r bg-card/50 p-4 space-y-6 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Adicionar Blocos</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                const { error } = await supabase.functions.invoke('meta-whatsapp-crm', { body: { action: 'getTemplates' } });
                if (!error) {
                  const { data } = await supabase.from('crm_templates').select('*');
                  if (data) setAvailableTemplates(data);
                  toast({ title: "Templates sincronizados!" });
                }
              }}>
                <RefreshCcw className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="outline" 
                className="justify-start gap-2 border-amber-500/30 bg-amber-50/50 hover:bg-amber-100/50 text-amber-700" 
                onClick={() => setSelectedNode(null)}
              >
                <Zap className="w-4 h-4 text-amber-500" /> Configurar Gatilho
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-blue-500/20 hover:bg-blue-500/10" onClick={() => addNode('message')}>
                <MessageSquare className="w-4 h-4 text-blue-500" /> Texto
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-emerald-500/20 hover:bg-emerald-500/10" onClick={() => addNode('question')}>
                <HelpCircle className="w-4 h-4 text-emerald-500" /> Pergunta/Botões
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-purple-500/20 hover:bg-purple-500/10" onClick={() => addNode('audio')}>
                <Mic className="w-4 h-4 text-purple-500" /> Áudio
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-orange-500/20 hover:bg-orange-500/10" onClick={() => addNode('video')}>
                <Video className="w-4 h-4 text-orange-500" /> Vídeo
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-emerald-400/20 hover:bg-emerald-400/10" onClick={() => addNode('image')}>
                <ImageIcon className="w-4 h-4 text-emerald-400" /> Imagem
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-amber-500/20 hover:bg-amber-500/10" onClick={() => addNode('delay')}>
                <Clock className="w-4 h-4 text-amber-500" /> Delay
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-indigo-500/20 hover:bg-indigo-500/10" onClick={() => addNode('waitResponse')}>
                <UserCheck className="w-4 h-4 text-indigo-500" /> Aguardar Resposta
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-red-500/20 hover:bg-red-500/10" onClick={() => addNode('followup')}>
                <AlertCircle className="w-4 h-4 text-red-500" /> Lembrete
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 border-blue-600 bg-blue-50 hover:bg-blue-100 group transition-all h-auto py-2.5 shadow-sm" 
                onClick={() => addNode('template')}
              >
                <FileText className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" /> 
                <div className="flex flex-col items-start">
                  <span className="text-blue-800 font-bold text-xs">Template Meta</span>
                  <span className="text-[9px] text-blue-600 font-medium uppercase tracking-wider">Marketing/Utilitário</span>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 border-cyan-500 bg-cyan-50 hover:bg-cyan-100 group transition-all h-auto py-2.5 shadow-sm" 
                onClick={() => addNode('pix')}
              >
                <Zap className="w-5 h-5 text-cyan-600 group-hover:scale-110 transition-transform" /> 
                <div className="flex flex-col items-start text-left">
                  <span className="text-cyan-800 font-bold text-xs">Enviar PIX</span>
                  <span className="text-[9px] text-cyan-600 font-medium uppercase tracking-wider">Copia e Cola + QR Code</span>
                </div>
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-slate-700/20 hover:bg-slate-700/10" onClick={() => addNode('crmAction')}>
                <Zap className="w-4 h-4 text-slate-700" /> Ação CRM
              </Button>
              <Button variant="outline" className="justify-start gap-2 border-amber-600/20 hover:bg-amber-600/10" onClick={() => addNode('jump')}>
                <GitBranch className="w-4 h-4 text-amber-600" /> Pular p/ Fluxo
              </Button>
              <Button 
                variant="outline" 
                className="justify-start gap-2 border-violet-600 bg-violet-50 hover:bg-violet-100 group transition-all h-auto py-2.5 shadow-sm" 
                onClick={() => addNode('aiAgent')}
              >
                <BrainCircuit className="w-5 h-5 text-violet-600 group-hover:rotate-12 transition-transform" /> 
                <div className="flex flex-col items-start text-left">
                  <span className="text-violet-800 font-bold text-xs">Atendente e Vendedor I.A</span>
                  <span className="text-[9px] text-violet-600 font-medium uppercase tracking-wider">Atendimento e Vendas 24h</span>
                </div>
              </Button>
            </div>
          </div>

          {selectedNode ? (
            <div className="pt-6 border-t animate-in fade-in slide-in-from-right-4 pb-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Configurar Bloco</h3>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteNode(selectedNode.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {(selectedNode.type === 'message' || selectedNode.type === 'question') && (
                  <div className="space-y-2">
                    <Label className="text-xs">Texto da Mensagem</Label>
                    <Textarea 
                      value={selectedNode.data.text as string} 
                      onChange={(e) => updateNodeData(selectedNode.id, { text: e.target.value })}
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                )}

                {selectedNode.type === 'question' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Qualquer resposta segue?
                        </Label>
                        <p className="text-[9px] text-indigo-600/70">Mesmo que não clique no botão, o fluxo continua.</p>
                      </div>
                      <Switch 
                        checked={selectedNode.data.anyResponse as boolean}
                        onCheckedChange={(checked) => updateNodeData(selectedNode.id, { anyResponse: checked })}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-xs">Botões (Máx 3)</Label>
                      {(selectedNode.data.buttons as any[]).map((btn, idx) => (
                        <div key={idx} className="space-y-2 p-2 border rounded-md bg-slate-50/50">
                          <div className="flex gap-2">
                            <Input 
                              value={btn.text} 
                              onChange={(e) => {
                                const newButtons = [...(selectedNode.data.buttons as any[])];
                                newButtons[idx].text = e.target.value;
                                updateNodeData(selectedNode.id, { buttons: newButtons });
                              }}
                              placeholder="Texto do botão"
                              className="text-xs h-8"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-400 shrink-0"
                              onClick={() => {
                                const newButtons = (selectedNode.data.buttons as any[]).filter((_, i) => i !== idx);
                                updateNodeData(selectedNode.id, { buttons: newButtons });
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="flex flex-col gap-1.5 px-1 bg-white/50 p-2 rounded-md border border-slate-100">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-bold text-slate-600">Botão de Link?</Label>
                              <Switch 
                                checked={!!btn.url}
                                onCheckedChange={(checked) => {
                                  const newButtons = [...(selectedNode.data.buttons as any[])];
                                  newButtons[idx].url = checked ? 'https://' : '';
                                  updateNodeData(selectedNode.id, { buttons: newButtons });
                                  
                                  // Se ativar link, remove conexões saindo desse botão
                                  if (checked) {
                                    setEdges((eds) => eds.filter(e => e.source !== selectedNode.id || e.sourceHandle !== (btn.id || `btn-${idx}`)));
                                  }
                                }}
                              />
                            </div>
                            {btn.url !== undefined && btn.url !== null && btn.url !== '' && (
                              <Input 
                                value={btn.url} 
                                onChange={(e) => {
                                  const newButtons = [...(selectedNode.data.buttons as any[])];
                                  newButtons[idx].url = e.target.value;
                                  updateNodeData(selectedNode.id, { buttons: newButtons });
                                }}
                                placeholder="https://..."
                                className="text-[10px] h-7 bg-white"
                              />
                            )}
                            <p className="text-[8px] text-muted-foreground leading-tight italic">
                              {btn.url ? "Botões com link abrem o site e finalizam o fluxo." : "Botões sem link permitem ligar linhas para continuar o fluxo."}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(selectedNode.data.buttons as any[]).length < 3 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs h-8" 
                          onClick={() => {
                            const newButtons = [...(selectedNode.data.buttons as any[]), { text: 'Novo Botão', id: `btn-${Date.now()}`, url: '' }];
                            updateNodeData(selectedNode.id, { buttons: newButtons });
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Botão
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {selectedNode.type === 'audio' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Upload de Áudio (.mp3, .ogg)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="file" 
                        accept=".mp3,.ogg"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, selectedNode.id, 'audio');
                        }}
                        className="text-xs h-8"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                    </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-bold text-purple-700">Gravado na hora</Label>
                        <p className="text-[9px] text-purple-600/70">Aparecerá como "gravando..."</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={selectedNode.data.isPTT as boolean}
                        onChange={(e) => updateNodeData(selectedNode.id, { isPTT: e.target.checked })}
                        className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {selectedNode.type === 'video' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Upload de Vídeo (.mp4)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="file" 
                        accept=".mp4"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, selectedNode.id, 'video');
                        }}
                        className="text-xs h-8"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                    </div>
                  </div>
                )}

                {selectedNode.type === 'image' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Upload de Imagem (.jpg, .png)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="file" 
                        accept="image/*"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, selectedNode.id, 'image');
                        }}
                        className="text-xs h-8"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                    </div>
                  </div>
                )}

                {selectedNode.type === 'waitResponse' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Tempo máximo de espera (minutos)</Label>
                      <Input 
                        type="number" 
                        value={selectedNode.data.timeout as number} 
                        onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="p-2 bg-indigo-50 rounded border border-indigo-100 space-y-2">
                      <p className="text-[10px] text-indigo-700 font-medium flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" /> Como funciona?
                      </p>
                      <p className="text-[9px] text-indigo-600/80">
                        O fluxo para aqui. Se o cliente enviar qualquer mensagem, ele segue pela saída da esquerda. Se passar o tempo configurado, segue pela saída da direita (Follow-up).
                      </p>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'delay' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Tempo</Label>
                      <Input 
                        type="number" 
                        value={selectedNode.data.delay as number} 
                        onChange={(e) => updateNodeData(selectedNode.id, { delay: parseInt(e.target.value) })}
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Unidade</Label>
                      <Select 
                        value={selectedNode.data.unit as string} 
                        onValueChange={(val) => updateNodeData(selectedNode.id, { unit: val })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="segundos">Segundos</SelectItem>
                          <SelectItem value="minutos">Minutos</SelectItem>
                          <SelectItem value="horas">Horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'pix' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Chave PIX (E-mail, CPF ou Aleatória)</Label>
                      <Input 
                        value={(selectedNode.data.pixKey as string) || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, { pixKey: e.target.value })}
                        placeholder="ex: financeiro@empresa.com"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Valor da Cobrança (R$)</Label>
                      <Input 
                        type="number"
                        value={(selectedNode.data.amount as string) || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, { amount: e.target.value })}
                        placeholder="47.00"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Descrição do Item</Label>
                      <Input 
                        value={(selectedNode.data.description as string) || ''} 
                        onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                        placeholder="Curso Cabeleireira Completa"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="p-2 bg-cyan-50 rounded border border-cyan-100">
                      <p className="text-[9px] text-cyan-700 italic leading-tight">
                        Ao chegar neste nó, o sistema gerará automaticamente um código Copia e Cola e o texto de instrução para o cliente.
                      </p>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'aiAgent' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-violet-500" /> Mensagem de Abertura (Opcional)
                      </Label>
                      <Textarea 
                        placeholder="Ex: Olá! Sou o assistente virtual. Como posso te ajudar a escolher o melhor produto hoje?"
                        className="text-xs min-h-[80px] bg-white border-slate-200"
                        value={(selectedNode.data.initialMessage as string) || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { initialMessage: e.target.value })}
                      />
                      <p className="text-[9px] text-muted-foreground italic">
                        Esta mensagem inicia o atendimento antes da I.A assumir o controle total da conversa.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold flex items-center gap-2">
                        <BrainCircuit className="w-3.5 h-3.5 text-violet-500" /> Instruções de Venda e Atendimento
                      </Label>
                      <Textarea 
                        placeholder="Ex: Você é um vendedor especialista. Use links de pagamento, tire dúvidas sobre o curso e tente fechar a venda. Se o cliente pedir para falar com um humano, use a saída lateral."
                        className="text-xs min-h-[150px] bg-violet-50/30 border-violet-100"
                        value={(selectedNode.data.prompt as string) || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { prompt: e.target.value })}
                      />
                      <p className="text-[9px] text-muted-foreground italic">
                        Dê todo o conhecimento do seu negócio para a I.A vender por você. Inclua preços, links e regras.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold">Etiqueta de Intervenção Humana</Label>
                      <Input 
                        placeholder="Ex: Atenção: Cliente quer Humano"
                        className="text-xs h-8"
                        value={(selectedNode.data.labelOnHumanTransfer as string) || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { labelOnHumanTransfer: e.target.value })}
                      />
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2 shadow-sm">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <UserCog className="w-4 h-4" />
                        <span className="text-[11px] font-bold">Atendimento Híbrido</span>
                      </div>
                      <p className="text-[10px] text-emerald-600/80 leading-relaxed">
                        A I.A conduzirá a venda sozinha. Ela só parará e alertará você (através da saída lateral) se detectar que a intervenção humana é estritamente necessária.
                      </p>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'followup' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Tempo sem resposta (min)</Label>
                    <Input 
                      type="number" 
                      value={selectedNode.data.timeout as number} 
                      onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) })}
                      className="text-xs h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">O fluxo continuará deste nó se o cliente não responder.</p>
                  </div>
                )}
                {selectedNode.type === 'crmAction' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Tipo de Ação</Label>
                      <Select 
                        value={selectedNode.data.action as string} 
                        onValueChange={(val) => updateNodeData(selectedNode.id, { action: val })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Notificar Agente">Notificar Agente</SelectItem>
                          <SelectItem value="Mudar Status: Ganho">Mudar Status: Ganho</SelectItem>
                          <SelectItem value="Mudar Status: Perdido">Mudar Status: Perdido</SelectItem>
                          <SelectItem value="Adicionar Etiqueta">Adicionar Etiqueta</SelectItem>
                          <SelectItem value="Solicitar Ligação">Solicitar Ligação</SelectItem>
                          <SelectItem value="Humanizar Atendimento">Encaminhar p/ Humano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedNode.data.action === 'Adicionar Etiqueta' && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label className="text-xs font-semibold text-slate-700">Escolher Etiqueta (Status)</Label>
                        <Select 
                          value={selectedNode.data.statusValue as string} 
                          onValueChange={(val) => {
                            const status = availableStatuses.find(s => s.value === val);
                            if (status) {
                              setNodes((nds) => nds.map((node) => 
                                node.id === selectedNode.id ? { ...node, data: { ...node.data, statusValue: val, statusLabel: status.label } } : node
                              ));
                              setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, statusValue: val, statusLabel: status.label } }));
                            }
                          }}
                        >
                          <SelectTrigger className="text-xs h-9 border-slate-300">
                            <SelectValue placeholder="Selecione uma etiqueta..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStatuses.map(s => (
                              <SelectItem key={s.id} value={s.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full bg-${s.color}-500`} />
                                  {s.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-[9px] text-muted-foreground mt-1 italic">
                          O contato receberá esta etiqueta automaticamente ao chegar nesta etapa.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {selectedNode.type === 'jump' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Escolher Fluxo de Destino</Label>
                      <Select 
                        value={selectedNode.data.targetFlowId as string} 
                        onValueChange={(val) => {
                          const targetFlow = availableFlows.find(f => f.id === val);
                          if (targetFlow) {
                            updateNodeData(selectedNode.id, { 
                              targetFlowId: val, 
                              targetFlowName: targetFlow.name
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Selecione um fluxo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFlows.map(f => (
                            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Atenção
                      </p>
                      <p className="text-[9px] text-amber-600/80 mt-1">
                        Ao chegar neste nó, o cliente será transferido instantaneamente para o início do fluxo selecionado.
                      </p>
                    </div>
                  </div>
                )}
                {selectedNode.type === 'template' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Qualquer resposta segue?
                        </Label>
                        <p className="text-[9px] text-indigo-600/70">Mesmo que não clique no botão, o fluxo continua.</p>
                      </div>
                      <Switch 
                        checked={selectedNode.data.anyResponse as boolean}
                        onCheckedChange={(checked) => updateNodeData(selectedNode.id, { anyResponse: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Escolher Template</Label>
                      <Select 
                        value={selectedNode.data.templateId as string} 
                        onValueChange={(val) => {
                          const template = availableTemplates.find(t => t.id === val);
                          if (template) {
                            const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
                            updateNodeData(selectedNode.id, { 
                              templateId: val, 
                              templateName: template.name,
                              language: template.language,
                              status: template.status,
                              category: template.category,
                              bodyText: bodyComponent?.text || ''
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Selecione um template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTemplates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name} ({t.language})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedNode.data.templateId && (
                      <div className="space-y-3">
                        {/* Custom Image Upload for Header if template has header */}
                        {availableTemplates.find(t => t.id === selectedNode.data.templateId)?.components?.some((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
                          <div className="space-y-2">
                            <Label className="text-xs">Imagem do Cabeçalho (Opcional)</Label>
                            <div className="flex gap-2">
                              <Input 
                                type="file" 
                                accept="image/*"
                                disabled={uploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(file, selectedNode.id, 'image');
                                }}
                                className="text-xs h-8"
                              />
                              {uploading && <Loader2 className="w-4 h-4 animate-spin mt-2" />}
                            </div>
                            {selectedNode.data.imageUrl && (
                              <div className="aspect-video w-full rounded overflow-hidden border">
                                <img src={selectedNode.data.imageUrl as string} className="w-full h-full object-cover" alt="Preview" />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <Label className="text-[10px] uppercase text-muted-foreground font-bold mb-2 block">Prévia do Conteúdo</Label>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap italic">
                            {(selectedNode.data.bodyText as string) || "Template sem texto no corpo."}
                          </p>
                        </div>

                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-[10px] text-blue-700 font-medium">⚠️ Regras da Meta</p>
                          <p className="text-[9px] text-blue-600/80 mt-1">
                            Templates de {(selectedNode.data.category as string) || 'Marketing'} são cobrados por conversa iniciada. 
                            {selectedNode.data.status !== 'APPROVED' && (
                              <span className="block mt-1 font-bold text-red-500">
                                Este template ainda não está aprovado e pode falhar ao enviar.
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-6 border-t animate-in fade-in slide-in-from-left-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-amber-700">
                <Zap className="w-4 h-4" /> Gatilho do Fluxo
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-zinc-200 shadow-sm">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Fluxo Ativo</Label>
                    <p className="text-[10px] text-muted-foreground">O gatilho funcionará automaticamente</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Gatilho (Trigger)</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Selecione um gatilho" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">🔘 Apenas Manual</SelectItem>
                      <SelectItem value="first_message">🆕 Primeiro Contato (Vida toda)</SelectItem>
                      <SelectItem value="first_message_day">☀️ Primeira mensagem do dia</SelectItem>
                      <SelectItem value="24h_inactivity">⏰ Primeira mensagem após 24h</SelectItem>
                      <SelectItem value="keyword">⌨️ Palavras-chave específicas</SelectItem>
                      <SelectItem value="exact_phrase">📝 Frase Completa Exata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(triggerType === 'keyword' || triggerType === 'exact_phrase') && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label className="text-xs">
                      {triggerType === 'keyword' ? 'Palavras-chave (separado por vírgula)' : 'Frase Completa'}
                    </Label>
                    <Textarea 
                      placeholder={triggerType === 'keyword' ? "Ex: olá, preço, ajuda" : "Ex: Estou no site, gostaria de tirar umas dúvidas..."}
                      value={triggerKeywords}
                      onChange={(e) => {
                        console.log("Updating trigger keywords:", e.target.value);
                        setTriggerKeywords(e.target.value);
                      }}
                      className="text-xs min-h-[80px]"
                    />
                    <p className="text-[9px] text-muted-foreground italic">
                      {triggerType === 'exact_phrase' 
                        ? "O fluxo iniciará apenas se o cliente enviar exatamente essa frase."
                        : "O fluxo iniciará se a mensagem contiver qualquer uma dessas palavras."}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Etiqueta ao Iniciar</Label>
                  <Select value={triggerTag} onValueChange={setTriggerTag}>
                    <SelectTrigger className="text-xs h-9 border-zinc-200">
                      <SelectValue placeholder="Nenhuma etiqueta..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {availableStatuses.map(s => (
                        <SelectItem key={s.id} value={s.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full bg-${s.color}-500`} />
                            {s.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground italic">
                    Ao iniciar este fluxo, o contato receberá esta etiqueta automaticamente.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-[10px] text-blue-700 font-medium">💡 Dica</p>
                  <p className="text-[9px] text-blue-600/80 mt-1">
                    Defina o gatilho para automatizar o atendimento. O gatilho de "Novo Contato" substituirá a resposta padrão automática se configurada.
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        <main className="flex-1 relative bg-slate-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onReconnect={onReconnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(_, node) => setSelectedNode(node)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="top-right">
              <div className="bg-card p-2 border rounded shadow-sm flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-[10px] font-medium">Fluxo Ativo</span>
              </div>
            </Panel>
          </ReactFlow>
        </main>
      </div>
    </div>
  );
};

const FlowEditor: React.FC<FlowEditorProps> = (props) => (
  <ReactFlowProvider>
    <FlowEditorInner {...props} />
  </ReactFlowProvider>
);

export default FlowEditor;

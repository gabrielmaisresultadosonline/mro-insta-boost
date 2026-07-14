import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Pencil, Video, Image as ImageIcon, ExternalLink, GripVertical } from "lucide-react";

type Tutorial = {
  id: string;
  module: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  video_url: string | null;
  button1_label: string | null;
  button1_url: string | null;
  button2_label: string | null;
  button2_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
};

const emptyForm: Partial<Tutorial> = {
  module: "Geral",
  title: "",
  description: "",
  cover_url: "",
  video_url: "",
  button1_label: "",
  button1_url: "",
  button2_label: "",
  button2_url: "",
  order_index: 0,
  is_active: true,
};

export default function TutorialsAdminPanel() {
  const [items, setItems] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Tutorial>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sales_tutorials")
      .select("*")
      .order("module", { ascending: true })
      .order("order_index", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as Tutorial[]) || []);
    setLoading(false);
  }

  function openNew() {
    setEditing({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(t: Tutorial) {
    setEditing({ ...t });
    setDialogOpen(true);
  }

  async function uploadFile(file: File, prefix: string): Promise<string | null> {
    const ext = file.name.split(".").pop() || "bin";
    const path = `tutorials/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast.error(`Upload falhou: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from("assets").getPublicUrl(path);
    return data.publicUrl;
  }

  async function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Capa deve ter até 10MB");
      return;
    }
    setUploadingCover(true);
    const url = await uploadFile(file, "cover");
    if (url) setEditing((p) => ({ ...p, cover_url: url }));
    setUploadingCover(false);
  }

  async function onVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      toast.error("Vídeo deve ter até 200MB");
      return;
    }
    setUploadingVideo(true);
    setVideoProgress(0);
    // Fake progress ticker
    const timer = setInterval(() => setVideoProgress((p) => Math.min(p + 5, 90)), 500);
    const url = await uploadFile(file, "video");
    clearInterval(timer);
    setVideoProgress(100);
    if (url) setEditing((p) => ({ ...p, video_url: url }));
    setUploadingVideo(false);
  }

  async function save() {
    if (!editing.title?.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setSaving(true);
    const payload = {
      module: editing.module || "Geral",
      title: editing.title,
      description: editing.description || null,
      cover_url: editing.cover_url || null,
      video_url: editing.video_url || null,
      button1_label: editing.button1_label || null,
      button1_url: editing.button1_url || null,
      button2_label: editing.button2_label || null,
      button2_url: editing.button2_url || null,
      order_index: Number(editing.order_index) || 0,
      is_active: editing.is_active !== false,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("sales_tutorials").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("sales_tutorials").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Salvo");
    setDialogOpen(false);
    load();
  }

  async function remove(t: Tutorial) {
    if (!confirm(`Excluir "${t.title}"?`)) return;
    const { error } = await supabase.from("sales_tutorials").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  }

  async function toggleActive(t: Tutorial) {
    const { error } = await supabase
      .from("sales_tutorials")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    load();
  }

  // Group by module
  const grouped = items.reduce<Record<string, Tutorial[]>>((acc, t) => {
    (acc[t.module] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#075E54]">Tutoriais</h2>
          <p className="text-xs text-[#128C7E]/70">
            Vídeos exibidos na página <strong>/vendas</strong>. Vídeo até 200MB, capa até 10MB.
          </p>
        </div>
        <Button onClick={openNew} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
          <Plus className="h-4 w-4 mr-1" /> Novo tutorial
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#128C7E]/60" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-[#128C7E]/70 bg-white border-[#E8F5F1]">
          Nenhum tutorial cadastrado. Clique em "Novo tutorial" para começar.
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([module, list]) => (
            <div key={module}>
              <h3 className="text-sm font-bold text-[#075E54] mb-2 uppercase tracking-wide">
                📚 {module}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => (
                  <Card key={t.id} className="overflow-hidden bg-white border-[#E8F5F1] shadow-sm">
                    <div className="aspect-video bg-slate-100 relative">
                      {t.cover_url ? (
                        <img src={t.cover_url} alt={t.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      )}
                      {t.video_url && (
                        <Badge className="absolute top-2 left-2 bg-black/70 text-white border-0 gap-1">
                          <Video className="h-3 w-3" /> Vídeo
                        </Badge>
                      )}
                      {!t.is_active && (
                        <Badge className="absolute top-2 right-2 bg-slate-500 text-white border-0">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="font-semibold text-sm text-[#075E54] truncate">{t.title}</div>
                      {t.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(t)} className="h-8">
                          <Pencil className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleActive(t)} className="h-8">
                          {t.is_active ? "Desativar" : "Ativar"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(t)} className="h-8">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-[#075E54]">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar tutorial" : "Novo tutorial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Módulo</Label>
                <Input
                  value={editing.module || ""}
                  onChange={(e) => setEditing({ ...editing, module: e.target.value })}
                  placeholder="Ex: Primeiros Passos"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={editing.order_index ?? 0}
                  onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={editing.title || ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                value={editing.description || ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Capa (imagem, até 10MB)</Label>
                <Input type="file" accept="image/*" onChange={onCoverChange} disabled={uploadingCover} />
                {uploadingCover && <p className="text-xs text-slate-500">Enviando capa...</p>}
                {editing.cover_url && (
                  <img src={editing.cover_url} className="mt-1 h-20 w-full object-cover rounded" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Vídeo (até 200MB)</Label>
                <Input type="file" accept="video/*" onChange={onVideoChange} disabled={uploadingVideo} />
                {uploadingVideo && (
                  <div className="space-y-1">
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full bg-[#25D366] transition-all" style={{ width: `${videoProgress}%` }} />
                    </div>
                    <p className="text-xs text-slate-500">Enviando vídeo... {videoProgress}%</p>
                  </div>
                )}
                {editing.video_url && !uploadingVideo && (
                  <video src={editing.video_url} className="mt-1 h-20 w-full object-cover rounded" />
                )}
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-bold text-[#128C7E] uppercase">Botões (opcional — abrem em nova aba)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Botão 1 - Texto</Label>
                  <Input
                    value={editing.button1_label || ""}
                    onChange={(e) => setEditing({ ...editing, button1_label: e.target.value })}
                    placeholder="Ex: Acessar CRM"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Botão 1 - URL</Label>
                  <Input
                    value={editing.button1_url || ""}
                    onChange={(e) => setEditing({ ...editing, button1_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Botão 2 - Texto</Label>
                  <Input
                    value={editing.button2_label || ""}
                    onChange={(e) => setEditing({ ...editing, button2_label: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Botão 2 - URL</Label>
                  <Input
                    value={editing.button2_url || ""}
                    onChange={(e) => setEditing({ ...editing, button2_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={editing.is_active !== false}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
              />
              Ativo (exibir na página /vendas)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || uploadingCover || uploadingVideo} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Database, Download, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface TableInfo {
  table_name: string;
  row_count: number;
}

interface MigrationPanelProps {
  creds: { email: string; password: string } | null;
}

const PAGE_SIZE = 500;

export default function MigrationPanel({ creds }: MigrationPanelProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  const call = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!creds) throw new Error("Sessão administrativa não encontrada.");
      const { data, error } = await supabase.functions.invoke("admin-db-dump", {
        body: { ...payload, adminEmail: creds.email, adminPassword: creds.password },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Falha na requisição");
      return data as { tables?: TableInfo[]; sql?: string };
    },
    [creds]
  );

  const loadTables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list_tables" });
      setTables(data.tables ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao listar tabelas");
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (creds) void loadTables();
  }, [creds, loadTables]);

  const totalRows = tables.reduce((sum, t) => sum + Number(t.row_count || 0), 0);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setProgress(0);
    setCurrentStep("Gerando estrutura das tabelas...");

    const parts: string[] = [];
    try {
      parts.push(
        `-- ZAPMRO :: dump SQL completo\n-- Gerado em: ${new Date().toISOString()}\n-- Tabelas: ${tables.length} | Registros: ${totalRows}\n\nBEGIN;\nSET session_replication_role = replica;\n\n`
      );

      const schema = await call({ action: "dump_schema" });
      parts.push("-- ============ ESTRUTURA ============\n\n" + (schema.sql ?? "") + "\n");

      const totalUnits = Math.max(
        tables.reduce((sum, t) => sum + Math.max(1, Math.ceil(Number(t.row_count || 0) / PAGE_SIZE)), 0),
        1
      );
      let done = 0;

      parts.push("-- ============ DADOS ============\n\n");

      for (const t of tables) {
        const count = Number(t.row_count || 0);
        parts.push(`\n-- Tabela: ${t.table_name} (${count} registros)\n`);
        if (count === 0) {
          done += 1;
          setProgress(Math.round((done / totalUnits) * 100));
          continue;
        }
        for (let off = 0; off < count; off += PAGE_SIZE) {
          setCurrentStep(`Exportando ${t.table_name} (${Math.min(off + PAGE_SIZE, count)}/${count})`);
          const chunk = await call({
            action: "dump_rows",
            table: t.table_name,
            offset: off,
            limit: PAGE_SIZE,
          });
          if (chunk.sql) parts.push(chunk.sql + "\n");
          done += 1;
          setProgress(Math.min(99, Math.round((done / totalUnits) * 100)));
        }
      }

      parts.push("\nSET session_replication_role = DEFAULT;\nCOMMIT;\n");

      const blob = new Blob(parts, { type: "application/sql" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `zapmro-dump-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setCurrentStep("Concluído");
      toast.success("Dump SQL gerado e baixado com sucesso!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar o dump");
      setCurrentStep("Falhou");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-white border-[#E8F5F1]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#075E54] p-2.5">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#075E54]">Migração — Dump SQL completo</h2>
              <p className="text-sm text-muted-foreground">
                Exporta a estrutura e todos os registros do banco (cadastros, conversas, mensagens, fluxos, pedidos)
                em um único arquivo <code>.sql</code>.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadTables()}
              disabled={loading || exporting}
              className="bg-white border-[#E8F5F1] text-[#075E54] hover:bg-[#F0FDF4]"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Recarregar
            </Button>
            <Button
              size="sm"
              onClick={() => void handleExport()}
              disabled={exporting || loading || tables.length === 0}
              className="bg-[#25D366] hover:bg-[#1FAF52] text-white"
            >
              {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar dump SQL
            </Button>
          </div>
        </div>

        {exporting && (
          <div className="mt-5 space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              {currentStep} — {progress}%
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary" className="bg-[#F0FDF4] text-[#075E54]">
            {tables.length} tabelas
          </Badge>
          <Badge variant="secondary" className="bg-[#F0FDF4] text-[#075E54]">
            {totalRows.toLocaleString("pt-BR")} registros
          </Badge>
        </div>

        <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <p>
            O dump cobre tabelas e dados do banco. Usuários de autenticação, arquivos de armazenamento e as funções
            de servidor não fazem parte deste arquivo e precisam ser migrados separadamente.
          </p>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-[#E8F5F1]">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#F0FDF4] text-[#075E54]">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Tabela</th>
                <th className="px-4 py-2 text-right font-medium">Registros</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Carregando tabelas...
                  </td>
                </tr>
              )}
              {!loading &&
                tables.map((t) => (
                  <tr key={t.table_name} className="border-t border-[#E8F5F1]">
                    <td className="px-4 py-2 font-mono text-xs text-[#075E54]">{t.table_name}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {Number(t.row_count || 0).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              {!loading && tables.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">
                    Nenhuma tabela encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

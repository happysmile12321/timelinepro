import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import classNames from "classnames";
import { DataSet } from "vis-data";
import { Timeline as VisTimeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

/** -----------------------------
 * Vis Timeline Demo（带“配置模式预览数据”）
 * - 支持在配置模式下粘贴预览数据（JSON 或 CSV），并通过字段映射生成时间轴 items
 * - 字段要求：开始时间(start, 必填)、结束时间(end, 可选)、事件名(title, 可选)、事件描述(desc, 可选)、分组(group, 可选)
 * - 仍保留极简 dashboard mock（saveConfig / setRendered / state）
 * ----------------------------- */

/*****************************
 * 0) Mock：Lark Dashboard SDK
 *****************************/
const DashboardState = {
  Create: "Create",
  Config: "Config",
  Normal: "Normal",
} as const;
const STORAGE_KEY = "timeline_preview_demo_config_v1";
const dashboard = {
  state: DashboardState.Normal as keyof typeof DashboardState,
  saveConfig: (cfg: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg?.customConfig ?? {}));
  },
  setRendered: () => {
    console.log("[demo] dashboard.setRendered()");
  },
};

/*****************************
 * 1) 类型定义
 *****************************/
export type TimelineItem = {
  id: string | number;
  content: string; // 展示文案（通常是 title）
  start: string | number | Date;
  end?: string | number | Date;
  group?: string | number;
  title?: string; // 鼠标悬浮的 tooltip，这里放 desc
};

interface IFieldMapper {
  start: string; // 必填
  end?: string;
  title?: string;
  desc?: string;
  group?: string;
}

interface ITimelineConfig {
  color: string;
  showTitle: boolean;
  titleText: string; // 支持 {{time}}
  items: TimelineItem[];
  options: {
    stack?: boolean;
    start?: string | number | Date;
    end?: string | number | Date;
    zoomMin?: number;
    zoomMax?: number;
    orientation?: "top" | "bottom";
  };
  preview: {
    raw: string; // 粘贴的原始预览数据（JSON/CSV）
    mapper: IFieldMapper; // 字段映射
    parsedRows: any[]; // 解析后的行数据（仅用于调试展示）
  };
}

const defaultConfig: ITimelineConfig = {
  color: "#2E3A59",
  showTitle: true,
  titleText: "我的时间轴 – {{time}}",
  items: [
    { id: 1, content: "示例：需求评审", start: addHours(Date.now(), -24), title: "评审说明" },
    { id: 2, content: "示例：开发中", start: addHours(Date.now(), -6), end: addHours(Date.now(), 18), group: "A组" },
  ],
  options: {
    stack: true,
    start: addHours(Date.now(), -72),
    end: addHours(Date.now(), 72),
    zoomMin: 60 * 1000, // 1min
    zoomMax: 30 * 24 * 60 * 60 * 1000, // 30d
    orientation: "bottom",
  },
  preview: {
    raw: `[
  { "开始时间": "2025-10-01 09:00:00", "结束时间": "2025-10-01 12:00:00", "事件名": "评审", "事件描述": "需求过评", "分组": "产品" },
  { "开始时间": "2025-10-02 10:00:00", "事件名": "开发", "事件描述": "模块A", "分组": "后端" }
]`,
    mapper: { start: "开始时间", end: "结束时间", title: "事件名", desc: "事件描述", group: "分组" },
    parsedRows: [],
  },
};

/*****************************
 * 2) 顶层 App
 *****************************/
export default function App() {
  const [mode, setMode] = useState<typeof DashboardState[keyof typeof DashboardState]>(
    DashboardState.Normal
  );
  dashboard.state = mode;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-6xl mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vis Timeline Demo （预览数据映射）</h1>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={mode !== DashboardState.Normal}
            onChange={(e) =>
              setMode(e.target.checked ? DashboardState.Config : DashboardState.Normal)
            }
          />
          Config 模式
        </label>
      </div>

      <TimelineCard bgColor="#fff" />

      <style>{css}</style>
    </div>
  );
}

/*****************************
 * 3) Timeline 主体
 *****************************/
function TimelineCard({ bgColor }: { bgColor: string }) {
  const [config, setConfig] = useState<ITimelineConfig>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  });

  const isCreate = dashboard.state === DashboardState.Create;
  useEffect(() => { if (isCreate) setConfig(defaultConfig); }, [isCreate]);
  const isConfig = dashboard.state === DashboardState.Config || isCreate;

  const timer = useRef<any>();
  const updateConfig = (res: any) => {
    if (timer.current) clearTimeout(timer.current);
    const { customConfig } = res || {};
    if (customConfig) {
      setConfig((prev) => ({ ...prev, ...customConfig }));
      timer.current = setTimeout(() => dashboard.setRendered(), 300);
    }
  };
  useEffect(() => {
    // mock useConfig
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) updateConfig({ customConfig: JSON.parse(raw) });
  }, []);

  return (
    <main style={{ backgroundColor: bgColor }} className={classNames({ "main-config": isConfig, main: true })}>
      <div className="content">
        <TimelineView config={config} isConfig={isConfig} />
      </div>
      {isConfig && (
        <ConfigPanel config={config} setConfig={setConfig} onSave={() => dashboard.saveConfig({ customConfig: config })} />
      )}
    </main>
  );
}

function TimelineView({ config, isConfig }: { config: ITimelineConfig; isConfig: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<VisTimeline | null>(null);
  const itemsRef = useRef(new DataSet<TimelineItem>(config.items as any));
  const groupsRef = useRef(new DataSet<any>(buildGroups(config.items)));

  // 创建实例
  useEffect(() => {
    if (!containerRef.current || instanceRef.current) return;

    instanceRef.current = new VisTimeline(containerRef.current, itemsRef.current, { ...config.options });
    instanceRef.current.setGroups(groupsRef.current);

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  // 同步 items
  useEffect(() => {
    const ds = itemsRef.current;
    const ids = new Set(ds.getIds() as (string | number)[]);
    const incoming = new Set(config.items.map((i) => i.id));
    const toRemove: (string | number)[] = [];
    ids.forEach((id) => { if (!incoming.has(id)) toRemove.push(id); });
    if (toRemove.length) ds.remove(toRemove);
    ds.update(config.items as any);

    // 同步 groups
    const newGroups = buildGroups(config.items);
    groupsRef.current.clear();
    groupsRef.current.add(newGroups);
    instanceRef.current?.setGroups(groupsRef.current);
  }, [config.items]);

  // 同步 options
  useEffect(() => { instanceRef.current?.setOptions({ ...(config.options || {}) }); }, [config.options]);

  const now = Date.now();
  const title = config.showTitle ? config.titleText.replace(/\{\{\s*time\s*\}\}/g, dayjs(now).format("YYYY-MM-DD HH:mm:ss")) : "";

  return (
    <div>
      {config.showTitle && (
        <p style={{ color: config.color }} className={classNames("count-down-title", { "count-down-title-config": isConfig })}>{title}</p>
      )}
      <div ref={containerRef} style={{ height: 380 }} />
    </div>
  );
}

/*****************************
 * 4) 配置面板：粘贴预览数据 + 字段映射 + 应用
 *****************************/
function ConfigPanel({ config, setConfig, onSave }: { config: ITimelineConfig; setConfig: React.Dispatch<React.SetStateAction<ITimelineConfig>>; onSave: () => void; }) {
  const [draft, setDraft] = useState(config.preview.raw);
  const [mapper, setMapper] = useState<IFieldMapper>(config.preview.mapper);

  const applyPreview = () => {
    const rows = parseRows(draft);
    const items = rowsToItems(rows, mapper);
    setConfig((p) => ({
      ...p,
      items,
      preview: { ...p.preview, raw: draft, mapper: { ...mapper }, parsedRows: rows },
    }));
  };

  return (
    <div className="config-panel">
      <div className="form">
        <Item label="显示标题">
          <label>
            <input type="checkbox" checked={config.showTitle} onChange={(e) => setConfig((p) => ({ ...p, showTitle: e.target.checked }))} />
            <span style={{ marginLeft: 8 }}>{String(config.showTitle)}</span>
          </label>
        </Item>

        <Item label="标题文案（可用 {{time}}）">
          <input style={{ width: "100%" }} value={config.titleText} onChange={(e) => setConfig((p) => ({ ...p, titleText: e.target.value }))} />
        </Item>

        <Item label="主题色">
          <input type="color" value={config.color} onChange={(e) => setConfig((p) => ({ ...p, color: e.target.value }))} />
        </Item>

        <Item label="可视范围（start / end）">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input type="datetime-local" value={toDatetimeLocal(config.options.start as number)} onChange={(e) => setConfig((p) => ({ ...p, options: { ...p.options, start: new Date(e.target.value).getTime() } }))} />
            <input type="datetime-local" value={toDatetimeLocal(config.options.end as number)} onChange={(e) => setConfig((p) => ({ ...p, options: { ...p.options, end: new Date(e.target.value).getTime() } }))} />
          </div>
        </Item>

        <Item label="缩放限制（ms）">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input type="number" placeholder="zoomMin" value={Number(config.options.zoomMin || 0)} onChange={(e) => setConfig((p) => ({ ...p, options: { ...p.options, zoomMin: Number(e.target.value) || 0 } }))} />
            <input type="number" placeholder="zoomMax" value={Number(config.options.zoomMax || 0)} onChange={(e) => setConfig((p) => ({ ...p, options: { ...p.options, zoomMax: Number(e.target.value) || 0 } }))} />
          </div>
        </Item>

        <Item label="预览数据（JSON 数组或 CSV）">
          <textarea style={{ width: "100%", minHeight: 140 }} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Item>

        <Item label="字段映射（开始时间* / 结束时间 / 事件名 / 描述 / 分组）">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            <input placeholder="start*" value={mapper.start} onChange={(e) => setMapper((m) => ({ ...m, start: e.target.value }))} />
            <input placeholder="end" value={mapper.end || ""} onChange={(e) => setMapper((m) => ({ ...m, end: e.target.value }))} />
            <input placeholder="title" value={mapper.title || ""} onChange={(e) => setMapper((m) => ({ ...m, title: e.target.value }))} />
            <input placeholder="desc" value={mapper.desc || ""} onChange={(e) => setMapper((m) => ({ ...m, desc: e.target.value }))} />
            <input placeholder="group" value={mapper.group || ""} onChange={(e) => setMapper((m) => ({ ...m, group: e.target.value }))} />
          </div>
          <div style={{ fontSize: 12, opacity: .7, marginTop: 6 }}>映射值必须是你数据里的字段名；开始时间为必填。</div>
        </Item>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={applyPreview}>应用预览数据</button>
          <button className="btn" onClick={onSave}>保存配置</button>
        </div>

        {config.preview.parsedRows?.length ? (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer" }}>查看解析后的行（调试）</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(config.preview.parsedRows.slice(0, 5), null, 2)}{config.preview.parsedRows.length > 5 ? "\n..." : ""}</pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}

/*****************************
 * 5) 工具方法
 *****************************/
function toDatetimeLocal(val?: number | string | Date) {
  const ms = typeof val === "number" ? val : typeof val === "string" ? Number(val) || Date.parse(val) : (val as Date)?.getTime();
  const d = new Date(ms || Date.now());
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function addHours(base: number, h: number) { return base + h * 3600 * 1000; }

function parseRows(raw: string): any[] {
  const txt = (raw || "").trim();
  if (!txt) return [];
  // 尝试 JSON
  try {
    const val = JSON.parse(txt);
    if (Array.isArray(val)) return val;
  } catch {}
  // 退化到 CSV
  return csvToRows(txt);
}

function csvToRows(csv: string): any[] {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(/,|\t/).map((s) => s.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(/,|\t/);
    const row: any = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function toMs(v: any): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return v; // 已经是 ms
  const s = String(v).trim();
  // 支持常见时间格式："YYYY-MM-DD HH:mm:ss"、ISO、时间戳秒或毫秒
  const asNum = Number(s);
  if (!Number.isNaN(asNum)) {
    // 猜测：>= 10^12 视为 ms，否则视为秒
    return asNum >= 1e12 ? asNum : asNum * 1000;
  }
  const parsed = Date.parse(s.replace(/\//g, "-"));
  if (!Number.isNaN(parsed)) return parsed;
  return undefined;
}

function rowsToItems(rows: any[], map: IFieldMapper): TimelineItem[] {
  let autoId = 1;
  const items: TimelineItem[] = [];
  for (const r of rows) {
    const startMs = toMs(r[map.start]);
    if (!startMs) continue; // 忽略无开始时间
    const endMs = map.end ? toMs(r[map.end]) : undefined;
    const title = map.title ? r[map.title] : undefined;
    const desc = map.desc ? r[map.desc] : undefined;
    const group = map.group ? r[map.group] : undefined;

    items.push({
      id: autoId++,
      content: String(title ?? "(未命名)") || "(未命名)",
      start: startMs,
      end: endMs,
      group,
      title: desc ? String(desc) : undefined,
    });
  }
  return items;
}

function buildGroups(items: TimelineItem[]) {
  const labels = Array.from(new Set(items.map((i) => i.group).filter(Boolean))) as (string | number)[];
  return labels.map((g) => ({ id: g, content: String(g) }));
}

/*****************************
 * 6) 轻量 UI 组件
 *****************************/
function Item({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-sm mb-1 opacity-70">{label}</div>
      {children}
    </div>
  );
}

/*****************************
 * 7) 样式
 *****************************/
const css = `
.main { width: 100%; max-width: 1100px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
.main-config { outline: 1px dashed rgba(0,0,0,.12); }
.content { padding: 24px; }
.count-down-title { font-size: 18px; margin: 0 0 16px; }
.count-down-title-config { opacity: .95; }
.config-panel { padding: 16px 24px 24px; border-top: 1px solid rgba(0,0,0,.06); }
.form { display: grid; grid-template-columns: 1fr; gap: 12px; }
.btn { margin-top: 8px; background: #111827; color: #fff; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; }
.btn:hover { filter: brightness(1.05); }
`;

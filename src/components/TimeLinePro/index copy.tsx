import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import classNames from "classnames";
import { DataSet } from "vis-data";
import { Timeline as VisTimeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

/** -----------------------------
 * Demo 说明（Timeline 版）
 * - 修复你遇到的错误：不要把 vis-timeline 的 class 当成 <Timeline /> 组件使用；
 *   必须用 `new VisTimeline(container, items, options)` 实例化。
 * - 这个 Demo 去掉了 countdown，只保留“数据传入 + 配置面板”的结构，
 *   以 items/options 驱动一条时间轴。
 * - 仍然包含极简 dashboard mock（saveConfig / setRendered / state），
 *   以及最小的 Item/ColorPicker/useConfig 工具。
 * ----------------------------- */

/*****************************
 * 0) Mock：Lark Dashboard SDK
 *****************************/
const DashboardState = {
  Create: "Create",
  Config: "Config",
  Normal: "Normal",
} as const;

const STORAGE_KEY = "timeline_demo_config_v1";

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
 * 1) i18n 超简化（仅示例）
 *****************************/
const t = (k: string) => {
  const dict: Record<string, string> = {
    second: "秒",
    minute: "分",
    hour: "时",
    day: "天",
    week: "周",
    month: "月",
    "please.config": "请在配置面板设置时间轴",
    "label.set.range": "可视范围（start / end）",
    "label.title": "标题（可含占位 {{time}}）",
    "label.color": "主题色",
    "label.stack": "纵向堆叠 stack",
    "label.zoom": "缩放限制（min/max，毫秒）",
    "label.items": "Items 数据",
    "label.showTitle": "显示标题",
    confirm: "确定",
    configMode: "Config 模式",
    addItem: "新增 Item",
  };
  return dict[k] ?? k;
};

/*****************************
 * 2) 工具：Item & ColorPicker & useConfig
 *****************************/
function Item({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-sm mb-1 opacity-70">{label}</div>
      {children}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: 56, height: 32, padding: 0, border: "none", background: "transparent" }}
      aria-label="color-picker"
    />
  );
}

function useConfig(update: (res: any) => void) {
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) update({ customConfig: JSON.parse(raw) });
  }, [update]);
}

/*****************************
 * 3) 类型 & 默认配置
 *****************************/
export type TimelineItem = {
  id: string | number;
  content: string;
  start: string | number | Date;
  end?: string | number | Date;
  group?: string | number;
  className?: string;
};

interface ITimelineConfig {
  color: string;
  title: string;
  showTitle: boolean;
  /** 传入的 items */
  items: TimelineItem[];
  /** 透传给 vis-timeline 的 options（只放我们常用的最小子集） */
  options: {
    stack?: boolean;
    start?: string | number | Date;
    end?: string | number | Date;
    zoomMin?: number;
    zoomMax?: number;
    orientation?: "top" | "bottom";
  };
}

const defaultConfig: ITimelineConfig = {
  color: "#2E3A59",
  title: "我的时间轴 – {{time}}",
  showTitle: true,
  items: [
    { id: 1, content: "需求评审", start: addHours(Date.now(), -48) },
    { id: 2, content: "设计完成", start: addHours(Date.now(), -24) },
    { id: 3, content: "开发中", start: addHours(Date.now(), -6), end: addHours(Date.now(), 30) },
    { id: 4, content: "联调", start: addHours(Date.now(), 36) },
  ],
  options: {
    stack: true,
    start: addHours(Date.now(), -72),
    end: addHours(Date.now(), 72),
    zoomMin: 1000 * 60, // 1 分钟
    zoomMax: 1000 * 60 * 60 * 24 * 30, // 30 天
    orientation: "bottom",
  },
};

/*****************************
 * 4) 顶层 App：切换 Config/Normal
 *****************************/
export default function App() {
  const [mode, setMode] = useState<typeof DashboardState[keyof typeof DashboardState]>(
    DashboardState.Normal
  );
  dashboard.state = mode;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-6">
      <div className="w-full max-w-5xl mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vis Timeline Demo</h1>
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={mode !== DashboardState.Normal}
            onChange={(e) =>
              setMode(e.target.checked ? DashboardState.Config : DashboardState.Normal)
            }
          />
          {t("configMode")}
        </label>
      </div>

      <TimelineCard bgColor="#fff" />

      <style>{css}</style>
    </div>
  );
}

/*****************************
 * 5) Timeline 主体（无倒计时）
 *****************************/
function TimelineCard({ bgColor }: { bgColor: string }) {
  const [config, setConfig] = useState<ITimelineConfig>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  });

  const isCreate = dashboard.state === DashboardState.Create;
  useEffect(() => {
    if (isCreate) setConfig(defaultConfig);
  }, [isCreate]);

  const isConfig = dashboard.state === DashboardState.Config || isCreate;

  const timer = useRef<any>();
  const updateConfig = (res: any) => {
    if (timer.current) clearTimeout(timer.current);
    const { customConfig } = res || {};
    if (customConfig) {
      setConfig((prev) => ({ ...prev, ...customConfig }));
      timer.current = setTimeout(() => dashboard.setRendered(), 400);
    }
  };

  useConfig(updateConfig);

  return (
    <main
      style={{ backgroundColor: bgColor }}
      className={classNames({ "main-config": isConfig, main: true })}
    >
      <div className="content">
        <TimelineView config={config} isConfig={isConfig} />
      </div>
      {isConfig && (
        <ConfigPanel config={config} setConfig={setConfig} />
      )}
    </main>
  );
}

function TimelineView({ config, isConfig }: { config: ITimelineConfig; isConfig: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<VisTimeline | null>(null);
  const dataRef = useRef(new DataSet<TimelineItem>(config.items as any));

  // 创建实例
  useEffect(() => {
    if (!containerRef.current) return;
    if (instanceRef.current) return; // 只创建一次

    instanceRef.current = new VisTimeline(
      containerRef.current,
      dataRef.current,
      {
        stack: config.options.stack,
        start: config.options.start,
        end: config.options.end,
        zoomMin: config.options.zoomMin,
        zoomMax: config.options.zoomMax,
        orientation: config.options.orientation,
      }
    );

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  // 同步 items（diff 更新）
  useEffect(() => {
    const ds = dataRef.current;
    const ids = new Set(ds.getIds() as (string | number)[]);
    const incoming = new Set(config.items.map((i) => i.id));

    // 删除不存在的
    const toRemove: (string | number)[] = [];
    ids.forEach((id) => {
      if (!incoming.has(id)) toRemove.push(id);
    });
    if (toRemove.length) ds.remove(toRemove);

    // upsert 传入的
    ds.update(config.items as any);
  }, [config.items]);

  // 同步 options
  useEffect(() => {
    instanceRef.current?.setOptions({ ...(config.options || {}) });
  }, [config.options]);

  const now = Date.now();
  const title = config.showTitle
    ? config.title.replaceAll(/\{\{\s*time\s*\}\}/g, dayjs(now).format("YYYY-MM-DD HH:mm:ss"))
    : "";

  return (
    <div>
      {config.showTitle && (
        <p style={{ color: config.color }} className={classNames("count-down-title", { "count-down-title-config": isConfig })}>
          {title}
        </p>
      )}
      <div ref={containerRef} style={{ height: 360 }} />
    </div>
  );
}

/*****************************
 * 6) 配置面板（编辑 items / options）
 *****************************/
function ConfigPanel({
  config,
  setConfig,
}: {
  config: ITimelineConfig;
  setConfig: React.Dispatch<React.SetStateAction<ITimelineConfig>>;
}) {
  const onSaveConfig = () => {
    dashboard.saveConfig({ customConfig: config, dataConditions: [] });
  };

  const addOne = () => {
    setConfig((p) => {
      const nextId = (p.items[p.items.length - 1]?.id as number) + 1 || 1;
      return {
        ...p,
        items: [
          ...p.items,
          { id: nextId, content: `新事件 ${nextId}` , start: Date.now() + 3600 * 1000 },
        ],
      };
    });
  };

  return (
    <div className="config-panel">
      <div className="form">
        <Item label={t("label.showTitle")}>
          <label>
            <input
              type="checkbox"
              checked={config.showTitle}
              onChange={(e) => setConfig((p) => ({ ...p, showTitle: e.target.checked }))}
            />
            <span style={{ marginLeft: 8 }}>{String(config.showTitle)}</span>
          </label>
        </Item>

        <Item label={t("label.title")}>
          <input
            style={{ width: "100%" }}
            value={config.title}
            onChange={(e) => setConfig((p) => ({ ...p, title: e.target.value }))}
          />
        </Item>

        <Item label={t("label.color")}>
          <ColorPicker value={config.color} onChange={(v) => setConfig((p) => ({ ...p, color: v }))} />
        </Item>

        <Item label={t("label.set.range")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              type="datetime-local"
              value={toDatetimeLocal(config.options.start as number)}
              onChange={(e) =>
                setConfig((p) => ({ ...p, options: { ...p.options, start: new Date(e.target.value).getTime() } }))
              }
            />
            <input
              type="datetime-local"
              value={toDatetimeLocal(config.options.end as number)}
              onChange={(e) =>
                setConfig((p) => ({ ...p, options: { ...p.options, end: new Date(e.target.value).getTime() } }))
              }
            />
          </div>
        </Item>

        <Item label={t("label.stack")}>
          <label>
            <input
              type="checkbox"
              checked={!!config.options.stack}
              onChange={(e) => setConfig((p) => ({ ...p, options: { ...p.options, stack: e.target.checked } }))}
            />
            <span style={{ marginLeft: 8 }}>{String(config.options.stack)}</span>
          </label>
        </Item>

        <Item label={t("label.zoom")}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input
              type="number"
              placeholder="zoomMin (ms)"
              value={Number(config.options.zoomMin || 0)}
              onChange={(e) =>
                setConfig((p) => ({ ...p, options: { ...p.options, zoomMin: Number(e.target.value) || 0 } }))
              }
            />
            <input
              type="number"
              placeholder="zoomMax (ms)"
              value={Number(config.options.zoomMax || 0)}
              onChange={(e) =>
                setConfig((p) => ({ ...p, options: { ...p.options, zoomMax: Number(e.target.value) || 0 } }))
              }
            />
          </div>
        </Item>

        <Item label={t("label.items")}>
          <button className="btn" onClick={addOne}>{t("addItem")}</button>
          <div style={{ fontSize: 12, opacity: .7, marginTop: 8 }}>
            也可直接改代码里默认 items，或接入你的数据源再写入 config.items。
          </div>
        </Item>
      </div>

      <button className="btn" onClick={onSaveConfig}>{t("confirm")}</button>
    </div>
  );
}

function toDatetimeLocal(val?: number | string | Date) {
  const ms = typeof val === "number" ? val : typeof val === "string" ? Number(val) : (val as Date)?.getTime();
  const d = new Date(ms || Date.now());
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

function addHours(base: number, h: number) {
  return base + h * 3600 * 1000;
}

/*****************************
 * 7) 样式
 *****************************/
const css = `
.main { width: 100%; max-width: 960px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,.06); }
.main-config { outline: 1px dashed rgba(0,0,0,.12); }
.content { padding: 24px; }
.count-down-title { font-size: 18px; margin: 0 0 16px; }
.count-down-title-config { opacity: .95; }

.config-panel { padding: 16px 24px 24px; border-top: 1px solid rgba(0,0,0,.06); }
.form { display: grid; grid-template-columns: 1fr; gap: 12px; }
.btn { margin-top: 8px; background: #111827; color: #fff; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; }
.btn:hover { filter: brightness(1.05); }
`;

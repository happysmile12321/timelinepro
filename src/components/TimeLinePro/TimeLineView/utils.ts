import {
    RawItem,
    Mapper,
    Config
} from './types'
import dayjs from "dayjs";
function toMs(v: any): number | undefined {
    if (v == null || v === "") return undefined;
    if (typeof v === "number") return v;
    const s = String(v).trim();
    const asNum = Number(s);
    if (!Number.isNaN(asNum)) {
        return asNum >= 1e12 ? asNum : asNum * 1000;
    }
    const parsed = Date.parse(s.replace(/\//g, "-"));
    if (!Number.isNaN(parsed)) return parsed;
    return undefined;
}

function rowsToItems(data: any[], map: Mapper): RawItem[] {
    let autoId = 1;
    const items: RawItem[] = [];
    for (const r of data) {
        const start = toMs(r[map.start]);
        if (!start) continue;
        const end = map.end ? toMs(r[map.end]) : undefined;
        const title = map.title ? r[map.title] : undefined;
        const desc = map.desc ? r[map.desc] : undefined;
        const group = map.group ? r[map.group] : undefined;
        items.push({
            id: autoId++,
            eventName: String(title ?? "(未命名)"),
            eventDescription: desc ? String(desc) : undefined,
            startTime: start,
            endTime: end,
            group,
        });
    }
    return items;
}

function normalizeToItems(config: Config): { items: RawItem[]; options: any; title?: string; color?: string } {
    const baseOptions = (config as any).options || {};
    const color = (config as any).color || "#2E3A59";
    const showTitle = (config as any).showTitle ?? true;
    const titleTpl = (config as any).titleText || "我的时间轴 – {{time}}";
    const nowText = dayjs().format("YYYY-MM-DD HH:mm:ss");
    const title = showTitle ? titleTpl.replace(/\{\{\s*time\s*\}\}/g, nowText) : undefined;

    // A: items
    if ((config as any).items) {
        return { items: (config as any).items, options: baseOptions, title, color };
    }
    // B: data + mapper
    if ((config as any).data && (config as any).mapper) {
        const items = rowsToItems((config as any).data, (config as any).mapper);
        return { items, options: baseOptions, title, color };
    }
    // C: 单条字段
    const start = toMs((config as any).startTime);
    if (!start) {
        return { items: [], options: baseOptions, title, color };
    }
    const single: RawItem = {
        id: 1,
        eventName: (config as any).eventName || "(未命名)",
        eventDescription: (config as any).eventDescription,
        startTime: start,
        endTime: toMs((config as any).endTime),
        group: (config as any).group,
    };
    return { items: [single], options: baseOptions, title, color };
}

function buildVisGroups(items: RawItem[]) {
    const labels = Array.from(new Set(items.map(i => i.group).filter(Boolean))) as (string | number)[];
    return labels.map(g => ({ id: g, content: String(g) }));
}

export {
    toMs,
    buildVisGroups,
    normalizeToItems,
    rowsToItems
}
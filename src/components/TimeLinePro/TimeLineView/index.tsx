// TimeLineView.tsx
import React, { useEffect, useRef } from "react";
import {
  toMs,
  buildVisGroups,
  normalizeToItems,
  rowsToItems
} from './utils'
import classNames from "classnames";
import { DataSet } from "vis-data";
import { Timeline as VisTimeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import {
  RawItem,
  Mapper,
  Config
} from './types'
import {zhCNLocale, zhFormat} from './locale'


export default function TimeLineView({ config }: { config: Config }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<VisTimeline | null>(null);
  const itemsDSRef = useRef(new DataSet<any>([]));
  const groupsDSRef = useRef(new DataSet<any>([]));

  // 初始化
  useEffect(() => {
    if (!containerRef.current || timelineRef.current) return;
    timelineRef.current = new VisTimeline(containerRef.current, itemsDSRef.current,  {
      ...((config as any).options || {}),
      locale: "zh-cn",
      locales: { "zh-cn": zhCNLocale },
      format: zhFormat,   
    });
    timelineRef.current.setGroups(groupsDSRef.current);
    return () => {
      timelineRef.current?.destroy();
      timelineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 同步数据 & 选项
  useEffect(() => {
    const { items, options, title, color } = normalizeToItems(config);

    // items → vis items
    const visItems = items.map((it) => ({
      id: it.id ?? `${it.eventName}-${it.startTime}`,
      content: String(it.eventName ?? "(未命名)"),
      start: toMs(it.startTime)!,
      end: it.endTime != null ? toMs(it.endTime)! : undefined,
      group: it.group,
      title: it.eventDescription,
    }));

    // 更新 DataSet
    const ds = itemsDSRef.current;
    const oldIds = new Set(ds.getIds() as (string | number)[]);
    const newIds = new Set(visItems.map((v) => v.id as string | number));
    const toRemove: (string | number)[] = [];
    oldIds.forEach((id) => { if (!newIds.has(id)) toRemove.push(id); });
    if (toRemove.length) ds.remove(toRemove);
    ds.update(visItems as any);

    // groups
    const groups = buildVisGroups(items);
    groupsDSRef.current.clear();
    if (groups.length) groupsDSRef.current.add(groups);
    timelineRef.current?.setGroups(groupsDSRef.current);

    // options
    timelineRef.current?.setOptions({ ...(options || {}) });

    // 自定义标题（可选）
    const titleEl = document.getElementById("__timeline_title__");
    if (titleEl) {
      titleEl.textContent = title || "";
      (titleEl as HTMLElement).style.color = color || "#2E3A59";
    }
  }, [config]);

  return (
    <div style={{ width: "100vw", textAlign: "center", overflow: "hidden" }}>
      <p
        id="__timeline_title__"
        className={classNames("timeline-title")}
        style={{ margin: "0 0 12px", fontSize: 16 }}
      />
      <div ref={containerRef} style={{ height: 360 
      }}  
      
      />
    </div>
  );
}

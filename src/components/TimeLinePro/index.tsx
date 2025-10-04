import React, { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import classnames from 'classnames'
import './style.scss';
import { Item } from '../Item'
import { DataSet } from "vis-data";
import { Timeline as VisTimeline } from "vis-timeline/standalone";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
import { useConfig } from "../../hooks";
import { dashboard, bitable, DashboardState, IConfig } from "@lark-base-open/js-sdk";
import ConfigPanel from "./ConfigPanel";
import { useTranslation } from "react-i18next";
import TimeLineView from "./TimeLineView";


/*****************************
 * 类型
 *****************************/
export type TimelineItem = {
  id: string | number;
  content: string; // 展示文案（事件名）
  start: number | string | Date;
  end?: number | string | Date;
  group?: string | number;
  title?: string; // tooltip 放事件描述
};

export interface ITimelineConfig {
}

/*****************************
 * 默认配置
 *****************************/
const defaultConfig: ITimelineConfig = {
};



/*****************************
 * 主体卡片
 *****************************/
export default function TimelineCard(props: { bgColor: string }) {

  const { t, i18n } = useTranslation();

  const timer = useRef<any>();

  // create时的默认配置
  const [config, setConfig] = useState<ITimelineConfig>(() => {
    return defaultConfig;
  });

  /** 飞书多维表格状态：是否创建模式 */
  const isCreate = dashboard.state === DashboardState.Create
  useEffect(() => { if (isCreate) setConfig(defaultConfig); }, [isCreate]);
  const isConfig = dashboard.state === DashboardState.Config || isCreate;
  /** 配置用户配置 */
  const updateConfig = (res: any) => {
    if (timer.current) clearTimeout(timer.current);
    const { customConfig } = res || {};
    if (customConfig) {
      setConfig((prev) => ({ ...prev, ...customConfig }));
      timer.current = setTimeout(() => dashboard.setRendered(), 300);
    }
  };
  useConfig(updateConfig)
  return (
    <main style={{ backgroundColor: props.bgColor }} className={classnames({ "main-config": isConfig, "main": true })}>
      <div className="content">
      <TimeLineView
  config={{
    items: [
      { eventName: "评审",  startTime: "2025-10-01 09:00:00", endTime: "2025-10-01 12:00:00", group: "产品" },
      { eventName: "开发", startTime: "2025-10-02 10:00:00", group: "后端" },
      { eventName: "开发1", startTime: "2025-10-02 10:00:00", group: "后端" },
      { eventName: "开发2", startTime: "2025-10-02 10:00:00", group: "后端" },
      { eventName: "开发3", startTime: "2025-10-02 10:00:00", group: "后端" },
      { eventName: "开发4", startTime: "2025-10-02 10:00:00", group: "后端" },
    ],
    options: { stack: true, orientation: "bottom" },
    showTitle: true,
    titleText: "我的时间轴 – {{time}}",
    color: "#2E3A59",
  }}
/>

      </div>
      {isConfig && (
        <div className="config-panel">
          <ConfigPanel
          t={t}
          config={config}
          setConfig={setConfig}
          onSave={() => dashboard.saveConfig({ customConfig: config })} />
        </div>
      )}
    </main>
  );
}


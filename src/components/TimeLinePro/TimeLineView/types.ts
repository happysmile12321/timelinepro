
type RawItem = {
    eventName: string;
    eventDescription?: string;
    startTime: string | number | Date;
    endTime?: string | number | Date;
    group?: string | number;
    id?: string | number;
};

type Mapper = {
    start: string;          // 开始时间字段名（必填）
    end?: string;           // 结束时间字段名
    title?: string;         // 事件名字段名
    desc?: string;          // 事件描述字段名
    group?: string;         // 分组字段名
};

type Config =
    | {
        // 模式 A：直接给 items（最简单）
        items: RawItem[];
        options?: any;
        showTitle?: boolean;
        titleText?: string; // 可包含 {{time}}
        color?: string;
    }
    | {
        // 模式 B：给 data + mapper（从表格映射）
        data: any[];
        mapper: Mapper;
        options?: any;
        showTitle?: boolean;
        titleText?: string;
        color?: string;
    }
    | {
        // 模式 C：单条字段（配置预览）
        eventName: string;
        eventDescription?: string;
        startTime: string | number | Date;
        endTime?: string | number | Date;
        group?: string | number;
        options?: any;
        showTitle?: boolean;
        titleText?: string;
        color?: string;
    };
export type {
    RawItem,
    Mapper,
    Config
}
// TimeLineView.tsx 顶部
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
dayjs.locale("zh-cn");

// 可放同文件任意位置
const zhCNLocale = { current: "当前", time: "时间", deleteSelected: "删除所选" /* …可选 */ };

const zhFormat = {
  minorLabels: (date: Date, scale: string) => {
    switch (scale) {
      case "millisecond":
      case "second":
      case "minute":
      case "hour":
        return dayjs(date).format("HH:mm");
      case "weekday":
      case "day":
        return dayjs(date).format("MM-DD ddd"); // 10-04 周六
      case "month":
        return dayjs(date).format("YYYY-MM");   // 2025-10
      case "year":
        return dayjs(date).format("YYYY年");    // 2025年
      default:
        return dayjs(date).format("YYYY-MM-DD HH:mm");
    }
  },
  majorLabels: (date: Date, scale: string) => {
    switch (scale) {
      case "millisecond":
      case "second":
      case "minute":
      case "hour":
        return dayjs(date).format("YYYY年MM月DD日 dddd");
      case "weekday":
      case "day":
        return dayjs(date).format("YYYY年MM月");
      case "month":
        return dayjs(date).format("YYYY年");
      case "year":
        return "";
      default:
        return dayjs(date).format("YYYY年MM月DD日");
    }
  },
};
export {
    zhCNLocale,
    zhFormat
}
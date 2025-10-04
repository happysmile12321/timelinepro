import React from "react";
import { Form, Button,Select } from "@douyinfe/semi-ui";
import { TFunction } from "i18next";
import { ITimelineConfig } from ".";
import './style.scss';

export default function ConfigPanel(props: {
  config: ITimelineConfig;
  setConfig: React.Dispatch<React.SetStateAction<ITimelineConfig>>;
  t: TFunction<"translation", undefined>;
}) {
  const { config, setConfig, t } = props;

  const handleChange = (key: keyof ITimelineConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    
   <div>
    <div className="form">
     <Form
      labelPosition="left"
      labelWidth={120}
      style={{ padding: 16 }}
    >
      <Form.Input
        label={t("事件名")}
        field="eventName"
        value={config.eventName}
        placeholder={t("请输入事件名")}
        onChange={v => handleChange("eventName", v)}
      />

      <Form.TextArea
        label={t("事件描述")}
        field="eventDescription"
        value={config.eventDescription}
        placeholder={t("请输入事件描述")}
        onChange={v => handleChange("eventDescription", v)}
      />

      <Form.DatePicker
        label={t("开始时间")}
        field="startTime"
        type="dateTime"
        value={config.startTime}
        onChange={v => handleChange("startTime", v)}
      />

      <Form.DatePicker
        label={t("结束时间")}
        field="endTime"
        type="dateTime"
        value={config.endTime}
        onChange={v => handleChange("endTime", v)}
      />

      <Form.Select
        label={t("分组")}
        field="group"
        value={config.group}
        placeholder={t("请选择分组")}
        onChange={v => handleChange("group", v)}
      >
        <Select.Option value="A">A组</Select.Option>
        <Select.Option value="B">B组</Select.Option>
        <Select.Option value="C">C组</Select.Option>
      </Form.Select>
    </Form>
   </div>
    
    <Button
    className='btn'
    theme='solid'
    onClick={setConfig}
  >
    {t('confirm')}
  </Button>
   </div>
  

);
}

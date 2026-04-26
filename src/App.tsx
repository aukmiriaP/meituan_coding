import { ChangeEvent, useMemo, useState } from "react";

type TabKey = "today" | "cabinet" | "vitals";
type RoleView = "patient" | "guardian";
type SlotKey = "早" | "中" | "晚" | "睡前";
type MedicationSource = "meituan_order" | "multimodal_ai";
type MessageRole = "agent" | "user" | "system";
type MessageType =
  | "reminder"
  | "warning"
  | "checkin"
  | "symptom"
  | "guardian"
  | "summary";

interface Medication {
  id: string;
  name: string;
  spec: string;
  totalStock: number;
  remainingStock: number;
  dosePerUse: number;
  timesPerDay: number;
  scheduleSlots: SlotKey[];
  source: MedicationSource;
}

interface AiRecognitionResult {
  imageType: string;
  extractedName: string;
  extractedSpec: string;
  dosePerUse: number;
  timesPerDay: number;
  totalStock: number;
  confidenceLevel: "高" | "中";
  needsReview: boolean;
  reviewNotes: string;
}

interface CheckInRecord {
  date: string;
  slot: SlotKey;
  medicationId: string;
  takenAt: string;
  source: "main_app" | "wechat_agent";
  status: "taken" | "missed";
}

interface ReminderSetting {
  enabled: boolean;
  habitWindow: string;
  overdueEscalationHours: number;
  notifyGuardian: boolean;
}

interface VitalsEntry {
  id: string;
  createdAt: string;
  rawText: string;
  structuredTags: string[];
  complianceNotice: string;
  source: "main_app" | "wechat_agent";
}

interface AgentAction {
  id:
    | "checkin_next"
    | "snooze"
    | "record_symptom"
    | "show_risks"
    | "guardian_done"
    | "refill"
    | "mark_missed";
  label: string;
  medicationId?: string;
  slot?: SlotKey;
}

interface SnoozedReminder {
  slot: SlotKey;
  remindAt: string;
}

interface AgentMessage {
  id: string;
  role: MessageRole;
  messageType: MessageType;
  text: string;
  actions: AgentAction[];
  relatedMedicationId?: string;
  timestamp: string;
}

interface OrderTemplate {
  id: string;
  name: string;
  spec: string;
  dosePerUse: number;
  timesPerDay: number;
  totalStock: number;
  scheduleSlots: SlotKey[];
}

interface DemoState {
  medications: Medication[];
  records: CheckInRecord[];
  vitals: VitalsEntry[];
  reminderSetting: ReminderSetting;
  agentMessages: AgentMessage[];
}

const TODAY = "2026-04-26";
const SLOT_ORDER: SlotKey[] = ["早", "中", "晚", "睡前"];
const SLOT_TIMES: Record<SlotKey, string> = {
  早: "08:15",
  中: "12:30",
  晚: "18:30",
  睡前: "21:30"
};
const DEMO_TIME_OPTIONS = ["07:50", "08:35", "09:05", "10:45", "11:10", "19:00", "19:30", "21:40", "22:10"];

const orderTemplates: OrderTemplate[] = [
  {
    id: "ord-1",
    name: "缬沙坦胶囊",
    spec: "80mg*28粒",
    dosePerUse: 1,
    timesPerDay: 1,
    totalStock: 28,
    scheduleSlots: ["早"]
  },
  {
    id: "ord-2",
    name: "二甲双胍片",
    spec: "0.5g*60片",
    dosePerUse: 1,
    timesPerDay: 2,
    totalStock: 60,
    scheduleSlots: ["早", "晚"]
  },
  {
    id: "ord-3",
    name: "阿托伐他汀钙片",
    spec: "20mg*14片",
    dosePerUse: 1,
    timesPerDay: 1,
    totalStock: 14,
    scheduleSlots: ["睡前"]
  }
];

const aiTemplates: AiRecognitionResult[] = [
  {
    imageType: "处方单",
    extractedName: "硝苯地平控释片",
    extractedSpec: "30mg*7片",
    dosePerUse: 1,
    timesPerDay: 1,
    totalStock: 7,
    confidenceLevel: "高",
    needsReview: false,
    reviewNotes: "已从处方单和药品规格区块完成结构化提取。"
  },
  {
    imageType: "药盒",
    extractedName: "盐酸氨氯地平片",
    extractedSpec: "5mg*7片",
    dosePerUse: 1,
    timesPerDay: 1,
    totalStock: 7,
    confidenceLevel: "中",
    needsReview: true,
    reviewNotes: "模型已识别药品名与规格，但总量区遮挡，建议人工补充确认。"
  },
  {
    imageType: "美团买药订单截图",
    extractedName: "琥珀酸美托洛尔缓释片",
    extractedSpec: "47.5mg*14片",
    dosePerUse: 1,
    timesPerDay: 1,
    totalStock: 14,
    confidenceLevel: "高",
    needsReview: false,
    reviewNotes: "模型结合订单图像语义和规格信息完成结构化理解。"
  }
];

function nowIso(date = TODAY, time = "08:35", seconds = "00") {
  return `${date}T${time}:${seconds}`;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateTime(iso: string) {
  const [date, time] = iso.split("T");
  return `${date.replace(/-/g, ".")} ${time.slice(0, 5)}`;
}

function getSlotMinutes(slot: SlotKey) {
  const [hour, minute] = SLOT_TIMES[slot].split(":").map(Number);
  return hour * 60 + minute;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function addMinutes(time: string, delta: number) {
  const minutes = timeToMinutes(time) + delta;
  const safe = ((minutes % 1440) + 1440) % 1440;
  const hour = String(Math.floor(safe / 60)).padStart(2, "0");
  const minute = String(safe % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

function deriveTags(text: string) {
  const map = [
    { tag: "头晕", match: ["头晕", "晕"] },
    { tag: "血压波动", match: ["血压", "心慌"] },
    { tag: "胃部不适", match: ["胃", "恶心"] },
    { tag: "疲乏", match: ["乏力", "疲惫"] }
  ];
  const tags = map
    .filter((item) => item.match.some((keyword) => text.includes(keyword)))
    .map((item) => item.tag);
  return tags.length ? tags : ["待医生复核"];
}

function buildMedicationFromOrder(template: OrderTemplate): Medication {
  return {
    id: createId("med"),
    name: template.name,
    spec: template.spec,
    totalStock: template.totalStock,
    remainingStock: template.totalStock,
    dosePerUse: template.dosePerUse,
    timesPerDay: template.timesPerDay,
    scheduleSlots: template.scheduleSlots,
    source: "meituan_order"
  };
}

function buildMedicationFromAi(result: AiRecognitionResult): Medication {
  const scheduleSlots: SlotKey[] =
    result.timesPerDay === 1 ? ["早"] : result.timesPerDay === 2 ? ["早", "晚"] : ["早", "中", "晚"];
  return {
    id: createId("med"),
    name: result.extractedName,
    spec: result.extractedSpec,
    totalStock: result.totalStock,
    remainingStock: result.totalStock,
    dosePerUse: result.dosePerUse,
    timesPerDay: result.timesPerDay,
    scheduleSlots,
    source: "multimodal_ai"
  };
}

function buildInitialState(): DemoState {
  const medications: Medication[] = [
    {
      id: "med-losartan",
      name: "氯沙坦钾片",
      spec: "50mg*7片",
      totalStock: 7,
      remainingStock: 3,
      dosePerUse: 1,
      timesPerDay: 1,
      scheduleSlots: ["早"],
      source: "meituan_order"
    },
    {
      id: "med-metformin",
      name: "二甲双胍片",
      spec: "0.5g*60片",
      totalStock: 60,
      remainingStock: 38,
      dosePerUse: 1,
      timesPerDay: 2,
      scheduleSlots: ["早", "晚"],
      source: "meituan_order"
    },
    {
      id: "med-statin",
      name: "阿托伐他汀钙片",
      spec: "20mg*14片",
      totalStock: 14,
      remainingStock: 10,
      dosePerUse: 1,
      timesPerDay: 1,
      scheduleSlots: ["睡前"],
      source: "multimodal_ai"
    }
  ];

  const previousDates = ["2026-04-23", "2026-04-24", "2026-04-25"];
  const records: CheckInRecord[] = previousDates.flatMap((date, index) => [
    {
      date,
      slot: "早",
      medicationId: "med-losartan",
      takenAt: nowIso(date, addMinutes("08:15", index + 1)),
      source: "main_app",
      status: "taken"
    },
    {
      date,
      slot: "早",
      medicationId: "med-metformin",
      takenAt: nowIso(date, addMinutes("08:18", index + 1)),
      source: "wechat_agent",
      status: "taken"
    }
  ]);

  const vitals: VitalsEntry[] = [
    {
      id: "vt-1",
      createdAt: nowIso("2026-04-25", "20:10"),
      rawText: "晚上吃完新开的降压药后有一点头晕，休息后缓解了。",
      structuredTags: ["头晕", "待医生复核"],
      complianceNotice: "AI 无法提供医疗诊断，建议您带上此记录咨询在线医生。",
      source: "main_app"
    }
  ];

  const reminderSetting: ReminderSetting = {
    enabled: true,
    habitWindow: "08:17",
    overdueEscalationHours: 2,
    notifyGuardian: true
  };

  const agentMessages: AgentMessage[] = [
    {
      id: "msg-1",
      role: "agent",
      messageType: "summary",
      text: "我是您的用药陪护助手。我会根据最近 3 天的打卡习惯，在合适的时间提醒服药、记录不适，并在需要时同步子女。",
      actions: [
        { id: "show_risks", label: "查看库存风险" },
        { id: "record_symptom", label: "记录今天的不适" }
      ],
      timestamp: nowIso(TODAY, "07:50")
    }
  ];

  return { medications, records, vitals, reminderSetting, agentMessages };
}

function getRemainingDays(medication: Medication) {
  const dailyConsumption = medication.dosePerUse * medication.timesPerDay;
  return dailyConsumption > 0 ? medication.remainingStock / dailyConsumption : 0;
}

function getMessageSortPriority(message: AgentMessage) {
  if (message.role === "agent") return 0;
  if (message.role === "system") return 1;
  return 2;
}

function isSameMedication(left: Medication, right: Medication) {
  return (
    left.name === right.name &&
    left.spec === right.spec &&
    left.scheduleSlots.join("|") === right.scheduleSlots.join("|")
  );
}

function mergeMedicationIntoList(medications: Medication[], incoming: Medication) {
  const existing = medications.find((item) => isSameMedication(item, incoming));
  if (!existing) {
    return {
      medications: [incoming, ...medications],
      medicationId: incoming.id,
      merged: false,
      previousRemainingStock: 0,
      addedStock: incoming.remainingStock,
      updatedRemainingStock: incoming.remainingStock
    };
  }

  return {
    medications: medications.map((item) =>
      item.id === existing.id
        ? {
            ...item,
            totalStock: item.totalStock + incoming.totalStock,
            remainingStock: item.remainingStock + incoming.remainingStock
          }
        : item
    ),
    medicationId: existing.id,
    merged: true,
    previousRemainingStock: existing.remainingStock,
    addedStock: incoming.remainingStock,
    updatedRemainingStock: existing.remainingStock + incoming.remainingStock
  };
}

function App() {
  const [state, setState] = useState<DemoState>(() => buildInitialState());
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [roleView, setRoleView] = useState<RoleView>("patient");
  const [agentOpen, setAgentOpen] = useState(true);
  const [demoTime, setDemoTime] = useState("07:50");
  const [snoozedReminders, setSnoozedReminders] = useState<SnoozedReminder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState(orderTemplates[0].id);
  const [recognitionType, setRecognitionType] = useState(aiTemplates[0].imageType);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [recognitionResult, setRecognitionResult] = useState<AiRecognitionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [manualVitalsText, setManualVitalsText] = useState("");

  const medicationMap = useMemo(
    () => new Map(state.medications.map((medication) => [medication.id, medication])),
    [state.medications]
  );

  const todayRecords = useMemo(
    () => state.records.filter((record) => record.date === TODAY),
    [state.records]
  );

  const riskMedications = useMemo(
    () => state.medications.filter((medication) => getRemainingDays(medication) <= 3),
    [state.medications]
  );

  const timeline = useMemo(() => {
    const bySlot = (["早", "中", "晚", "睡前"] as SlotKey[]).map((slot) => {
      const items = state.medications
        .filter((medication) => medication.scheduleSlots.includes(slot))
        .map((medication) => {
          const record = todayRecords.find(
            (entry) => entry.medicationId === medication.id && entry.slot === slot
          );
          const status = record?.status ?? "pending";
          return { medication, slot, status };
        });
      return { slot, items };
    });
    return bySlot;
  }, [state.medications, todayRecords]);

  const completionRate = useMemo(() => {
    const total = timeline.reduce((sum, group) => sum + group.items.length, 0);
    const checked = timeline.reduce(
      (sum, group) => sum + group.items.filter((item) => item.status === "taken").length,
      0
    );
    return total ? Math.round((checked / total) * 100) : 0;
  }, [timeline]);

  const slotStatusSummary = useMemo(
    () =>
      SLOT_ORDER.map((slot) => {
        const group = timeline.find((item) => item.slot === slot);
        if (!group || group.items.length === 0) {
          return { slot, label: `${slot}药`, value: "无安排" };
        }
        if (group.items.some((item) => item.status === "pending")) {
          return { slot, label: `${slot}药`, value: "待处理" };
        }
        if (group.items.some((item) => item.status === "missed")) {
          return { slot, label: `${slot}药`, value: "有漏服" };
        }
        return { slot, label: `${slot}药`, value: "已完成" };
      }),
    [timeline]
  );

  const habitWindow = useMemo(() => {
    const recent = state.records
      .filter((record) => record.slot === "早")
      .slice(-3)
      .map((record) => record.takenAt.split("T")[1]?.slice(0, 5))
      .filter(Boolean) as string[];
    if (!recent.length) return state.reminderSetting.habitWindow;
    const avg =
      recent.reduce((sum, time) => sum + timeToMinutes(time), 0) / recent.length;
    const hour = String(Math.floor(avg / 60)).padStart(2, "0");
    const minute = String(Math.round(avg % 60)).padStart(2, "0");
    return `${hour}:${minute}`;
  }, [state.records, state.reminderSetting.habitWindow]);

  const activeReminder = useMemo(() => {
    const dueSlots = SLOT_ORDER.filter(
      (slot) => timeToMinutes(SLOT_TIMES[slot]) <= timeToMinutes(demoTime)
    );
    const currentSlot = [...dueSlots].reverse().find((slot) =>
      state.medications.some((medication) => {
        if (!medication.scheduleSlots.includes(slot)) return false;
        return !todayRecords.some(
          (record) =>
            record.medicationId === medication.id &&
            record.slot === slot
        );
      })
    );

    if (!currentSlot) return null;

    const medications = state.medications.filter(
      (item) =>
        item.scheduleSlots.includes(currentSlot) &&
        !todayRecords.some(
          (record) =>
            record.medicationId === item.id && record.slot === currentSlot
        )
    );

    if (!medications.length) return null;

    const snoozedReminder = snoozedReminders.find((item) => item.slot === currentSlot);
    const referenceTime = snoozedReminder?.remindAt ?? (currentSlot === "早" ? habitWindow : SLOT_TIMES[currentSlot]);
    const now = timeToMinutes(demoTime);
    const reference = timeToMinutes(referenceTime);
    const overdue = reference + state.reminderSetting.overdueEscalationHours * 60;

    if (snoozedReminder && now < reference) {
      return null;
    }

    return {
      medications,
      slot: currentSlot,
      referenceTime,
      isFollowUp: Boolean(snoozedReminder),
      state: now >= overdue ? "guardian_alert" : "patient_reminder"
    } as const;
  }, [
    demoTime,
    habitWindow,
    state.medications,
    state.reminderSetting.overdueEscalationHours,
    snoozedReminders,
    todayRecords
  ]);

  const mergedAgentMessages = useMemo(() => {
    const dynamic: AgentMessage[] = [];
    if (activeReminder && activeReminder.state === "patient_reminder") {
      const medicationNames = activeReminder.medications.map((item) => item.name).join("、");
      dynamic.push({
        id: "dynamic-patient-reminder",
        role: "agent",
        messageType: "reminder",
        text:
          activeReminder.isFollowUp
            ? `刚才您选择了稍后提醒，现在到了 ${activeReminder.referenceTime}。待处理的${activeReminder.slot}药有：${medicationNames}，请确认是已服还是漏服。`
            : activeReminder.slot === "早"
            ? `该吃早药了，您平时会在 ${activeReminder.referenceTime} 左右完成打卡。今天待服的药品有：${medicationNames}。请分别完成打卡。`
            : `该吃${activeReminder.slot}药了，建议在 ${activeReminder.referenceTime} 左右完成。当前待服药品有：${medicationNames}。请分别完成打卡。`,
        relatedMedicationId: activeReminder.medications[0]?.id,
        actions: [
          ...activeReminder.medications.flatMap((medication) =>
            activeReminder.isFollowUp
              ? [
                  {
                    id: "checkin_next" as const,
                    label: `打卡 ${medication.name}`,
                    medicationId: medication.id,
                    slot: activeReminder.slot
                  },
                  {
                    id: "mark_missed" as const,
                    label: `漏服 ${medication.name}`,
                    medicationId: medication.id,
                    slot: activeReminder.slot
                  }
                ]
              : [
                  {
                    id: "checkin_next" as const,
                    label: `打卡 ${medication.name}`,
                    medicationId: medication.id,
                    slot: activeReminder.slot
                  }
                ]
          ),
          { id: "snooze", label: "稍后提醒我" },
          { id: "record_symptom", label: "记录今天的不适" }
        ],
        timestamp: nowIso(TODAY, demoTime, "00")
      });
    }
    if (
      activeReminder &&
      activeReminder.state === "guardian_alert" &&
      state.reminderSetting.notifyGuardian
    ) {
      dynamic.push({
        id: "dynamic-guardian-alert",
        role: "agent",
        messageType: "guardian",
        text: `已超过${activeReminder.referenceTime}后的 2 小时提醒窗口，系统已向子女发送提醒：${activeReminder.medications
          .map((item) => item.name)
          .join("、")} 今日${activeReminder.slot}药暂未完成，请协助确认。`,
        relatedMedicationId: activeReminder.medications[0]?.id,
        actions: [
          { id: "guardian_done", label: "通知子女已处理" },
          { id: "show_risks", label: "查看库存风险" }
        ],
        timestamp: nowIso(TODAY, demoTime, "10")
      });
    }
    riskMedications
      .filter(() => timeToMinutes(demoTime) < timeToMinutes(SLOT_TIMES["早"]))
      .forEach((medication) => {
        dynamic.push({
          id: `risk-${medication.id}`,
          role: "agent",
          messageType: "warning",
          text: `${medication.name} 预计仅剩 ${getRemainingDays(medication).toFixed(1)} 天，请尽快续方或在线复诊。`,
          relatedMedicationId: medication.id,
          actions: [
            { id: "show_risks", label: "查看库存风险" },
            {
              id: "refill",
              label: "一键续方",
              medicationId: medication.id
            }
          ],
          timestamp: nowIso(TODAY, demoTime, "20")
        });
      });
    return [...state.agentMessages, ...dynamic]
      .map((message, index) => ({ message, index }))
      .sort((left, right) => {
        const timeCompare = left.message.timestamp.localeCompare(right.message.timestamp);
        if (timeCompare !== 0) return timeCompare;
        const priorityCompare =
          getMessageSortPriority(left.message) - getMessageSortPriority(right.message);
        if (priorityCompare !== 0) return priorityCompare;
        return left.index - right.index;
      })
      .map((entry) => entry.message);
  }, [
    demoTime,
    activeReminder,
    riskMedications,
    state.agentMessages,
    state.reminderSetting.notifyGuardian,
    todayRecords
  ]);

  const addAgentMessage = (message: Omit<AgentMessage, "id">) => {
    setState((current) => ({
      ...current,
      agentMessages: [...current.agentMessages, { ...message, id: createId("msg") }]
    }));
  };

  const openAgent = () => setAgentOpen(true);

  const openDoctorConsultLink = (medicationId?: string) => {
    const medicationName = medicationId ? medicationMap.get(medicationId)?.name ?? "当前药品" : "当前药品";
    window.open("https://health.meituan.com/", "_blank", "noopener,noreferrer");
    addAgentMessage({
      role: "system",
      messageType: "summary",
      text: `已为您打开 ${medicationName} 的在线复诊入口（Demo 中使用网页链接模拟问诊跳转）。`,
      actions: [],
      relatedMedicationId: medicationId,
      timestamp: nowIso(TODAY, demoTime, "36")
    });
  };

  const openRefillLink = (medicationId?: string) => {
    const medicationName = medicationId ? medicationMap.get(medicationId)?.name ?? "常用药" : "常用药";
    window.open("https://waimai.meituan.com/", "_blank", "noopener,noreferrer");
    addAgentMessage({
      role: "system",
      messageType: "summary",
      text: `已为您拉起 ${medicationName} 的续方入口（Demo 中使用美团买药网页链接模拟小程序跳转）。`,
      actions: [],
      relatedMedicationId: medicationId,
      timestamp: nowIso(TODAY, demoTime, "35")
    });
  };

  const triggerAgentFollowUp = (medicationId?: string, slot?: SlotKey) => {
    if (!medicationId) {
      openAgent();
      addAgentMessage({
        role: "agent",
        messageType: "summary",
        text: "我会继续跟进当前风险药品，重点关注库存不足、续方时机和是否需要在线复诊。",
        actions: [
          { id: "show_risks", label: "查看库存风险" },
          { id: "refill", label: "一键续方", medicationId: riskMedications[0]?.id }
        ],
        timestamp: nowIso(TODAY, demoTime, "25")
      });
      return;
    }

    openAgent();
    const medication = medicationMap.get(medicationId);
    if (!medication) return;

    const currentRecord = slot
      ? todayRecords.find((record) => record.medicationId === medicationId && record.slot === slot)
      : undefined;
    const remainingDays = getRemainingDays(medication);
    const actions: AgentAction[] = [];

    if (slot && !currentRecord && roleView === "patient") {
      actions.push({
        id: "checkin_next",
        label: `打卡 ${medication.name}`,
        medicationId,
        slot
      });
    }
    if (remainingDays <= 3) {
      actions.push({ id: "refill", label: "一键续方", medicationId });
    }
    actions.push({ id: "show_risks", label: "查看库存风险" });

    let text = `我会接手跟进 ${medication.name}。`;
    if (currentRecord?.status === "taken") {
      text = `${medication.name} 的${slot}药已完成打卡。我会继续关注库存，余量不足时提醒您续方或在线复诊。`;
    } else if (currentRecord?.status === "missed") {
      text = `${medication.name} 的${slot}药已记录为漏服。我会继续跟进后续服药情况，并在需要时提醒复诊。`;
    } else if (slot) {
      text = `我会跟进 ${medication.name} 的${slot}药：到点提醒、未处理时再次追问，并结合库存情况给出续方建议。`;
    } else if (remainingDays <= 3) {
      text = `我会重点关注 ${medication.name} 的库存风险，及时提醒续方，避免断药。`;
    }

    addAgentMessage({
      role: "agent",
      messageType: remainingDays <= 3 ? "warning" : "summary",
      text,
      actions,
      relatedMedicationId: medicationId,
      timestamp: nowIso(TODAY, demoTime, "25")
    });
  };

  const checkInMedication = (
    medicationId: string,
    slot: SlotKey,
    source: CheckInRecord["source"]
  ) => {
    const medication = medicationMap.get(medicationId);
    if (!medication) return;
    const alreadyChecked = todayRecords.some(
      (record) => record.medicationId === medicationId && record.slot === slot
    );
    if (alreadyChecked || roleView === "guardian") return;

    const takenAt = nowIso(TODAY, demoTime, source === "wechat_agent" ? "30" : "40");
    setState((current) => ({
      ...current,
      medications: current.medications.map((item) =>
        item.id === medicationId
          ? { ...item, remainingStock: Math.max(0, item.remainingStock - item.dosePerUse) }
          : item
      ),
      records: [
        ...current.records,
        {
          date: TODAY,
          slot,
          medicationId,
          takenAt,
          source,
          status: "taken"
        }
      ]
    }));

    addAgentMessage({
      role: source === "wechat_agent" ? "user" : "system",
      messageType: "checkin",
      text:
        source === "wechat_agent"
          ? `已在聊天窗口完成 ${medication.name} 的${slot}打卡，库存已同步更新。`
          : `${medication.name} 的${slot}打卡已完成，Agent 已收到同步。`,
      actions: [],
      relatedMedicationId: medicationId,
      timestamp: takenAt
    });
  };

  const markMedicationMissed = (medicationId: string, slot: SlotKey) => {
    const medication = medicationMap.get(medicationId);
    if (!medication) return;
    const alreadyHandled = todayRecords.some(
      (record) => record.medicationId === medicationId && record.slot === slot
    );
    if (alreadyHandled || roleView === "guardian") return;

    const handledAt = nowIso(TODAY, demoTime, "32");
    setState((current) => ({
      ...current,
      records: [
        ...current.records,
        {
          date: TODAY,
          slot,
          medicationId,
          takenAt: handledAt,
          source: "wechat_agent",
          status: "missed"
        }
      ]
    }));

    addAgentMessage({
      role: "user",
      messageType: "summary",
      text: `已标记 ${medication.name} 的${slot}药为漏服，本次不扣减库存。`,
      actions: [],
      relatedMedicationId: medicationId,
      timestamp: handledAt
    });
  };

  const handleAgentAction = (action: AgentAction) => {
    openAgent();
    if (action.id === "checkin_next" && action.medicationId && action.slot) {
      checkInMedication(action.medicationId, action.slot, "wechat_agent");
      return;
    }
    if (action.id === "mark_missed" && action.medicationId && action.slot) {
      markMedicationMissed(action.medicationId, action.slot);
      return;
    }
    if (action.id === "refill") {
      openRefillLink(action.medicationId);
      return;
    }
    if (action.id === "snooze") {
      if (activeReminder) {
        const remindAt = addMinutes(demoTime, 30);
        setSnoozedReminders((current) => [
          ...current.filter((item) => item.slot !== activeReminder.slot),
          { slot: activeReminder.slot, remindAt }
        ]);
        addAgentMessage({
          role: "user",
          messageType: "summary",
          text: `请在 ${remindAt} 再提醒我。`,
          actions: [],
          timestamp: nowIso(TODAY, demoTime, "30")
        });
        addAgentMessage({
          role: "agent",
          messageType: "reminder",
          text: `好的，我会在 ${remindAt} 再次提醒您。若届时仍未处理，我会继续跟进并视情况同步子女。`,
          actions: [],
          timestamp: nowIso(TODAY, demoTime, "40")
        });
      }
      return;
    }
    if (action.id === "record_symptom") {
      const text = "今天早上服药后有点头晕，活动后稍有缓解。";
      const entry: VitalsEntry = {
        id: createId("vt"),
        createdAt: nowIso(TODAY, demoTime),
        rawText: text,
        structuredTags: deriveTags(text),
        complianceNotice: "AI 无法提供医疗诊断，建议您带上此记录咨询在线医生。",
        source: "wechat_agent"
      };
      setState((current) => ({ ...current, vitals: [entry, ...current.vitals] }));
      addAgentMessage({
        role: "user",
        messageType: "symptom",
        text,
        actions: [],
        timestamp: nowIso(TODAY, demoTime, "30")
      });
      addAgentMessage({
        role: "agent",
        messageType: "summary",
        text: "已帮您记录到体征日记，并同步到主应用。若持续不适，建议尽快咨询在线医生。",
        actions: [],
        timestamp: nowIso(TODAY, demoTime, "40")
      });
      setActiveTab("vitals");
      return;
    }
    if (action.id === "show_risks") {
      setActiveTab("today");
      addAgentMessage({
        role: "agent",
        messageType: "warning",
        text:
          riskMedications.length > 0
            ? `当前需要优先关注：${riskMedications.map((item) => item.name).join("、")}。`
            : "当前暂无库存不足 3 天的药品，今日库存总体安全。",
        actions: [],
        timestamp: nowIso(TODAY, demoTime, "40")
      });
      return;
    }
    if (action.id === "guardian_done") {
      addAgentMessage({
        role: "user",
        messageType: "guardian",
        text: "已通知子女，我这边也会尽快处理。",
        actions: [],
        timestamp: nowIso(TODAY, demoTime, "30")
      });
    }
  };

  const handleOrderImport = () => {
    const template = orderTemplates.find((item) => item.id === selectedOrderId);
    if (!template) return;
    const medication = buildMedicationFromOrder(template);
    const mergeResult = mergeMedicationIntoList(state.medications, medication);
    setState((current) => ({
      ...current,
      medications: mergeMedicationIntoList(current.medications, medication).medications
    }));
    addAgentMessage({
      role: "system",
      messageType: "summary",
      text: mergeResult.merged
        ? `已从美团买药历史订单补充 ${template.name} 库存：原库存 ${mergeResult.previousRemainingStock} 片，本次补充 ${mergeResult.addedStock} 片，现库存 ${mergeResult.updatedRemainingStock} 片。`
        : `已从美团买药历史订单导入 ${template.name}，并生成每日服药计划。`,
      actions: [],
      relatedMedicationId: mergeResult.medicationId,
      timestamp: nowIso(TODAY, demoTime)
    });
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name ?? "");
  };

  const runAiRecognition = () => {
    const template = aiTemplates.find((item) => item.imageType === recognitionType) ?? aiTemplates[0];
    setIsAnalyzing(true);
    setRecognitionResult(null);
    window.setTimeout(() => {
      setRecognitionResult(template);
      setIsAnalyzing(false);
    }, 900);
  };

  const confirmAiRecognition = () => {
    if (!recognitionResult) return;
    const medication = buildMedicationFromAi(recognitionResult);
    const mergeResult = mergeMedicationIntoList(state.medications, medication);
    setState((current) => ({
      ...current,
      medications: mergeMedicationIntoList(current.medications, medication).medications
    }));
    addAgentMessage({
      role: "system",
      messageType: "summary",
      text: mergeResult.merged
        ? `已通过多模态模型识别并确认 ${recognitionResult.extractedName}，库存已补充：原库存 ${mergeResult.previousRemainingStock} 片，本次补充 ${mergeResult.addedStock} 片，现库存 ${mergeResult.updatedRemainingStock} 片。`
        : `已通过多模态模型识别并确认 ${recognitionResult.extractedName}，药箱库存已更新。`,
      actions: [],
      relatedMedicationId: mergeResult.medicationId,
      timestamp: nowIso(TODAY, demoTime)
    });
    setRecognitionResult(null);
    setSelectedFileName("");
  };

  const submitVitalsFromMain = () => {
    const text = manualVitalsText.trim();
    if (!text) return;
    const entry: VitalsEntry = {
      id: createId("vt"),
      createdAt: nowIso(TODAY, demoTime),
      rawText: text,
      structuredTags: deriveTags(text),
      complianceNotice: "AI 无法提供医疗诊断，建议您带上此记录咨询在线医生。",
      source: "main_app"
    };
    setState((current) => ({ ...current, vitals: [entry, ...current.vitals] }));
    setManualVitalsText("");
    addAgentMessage({
      role: "system",
      messageType: "symptom",
      text: "主应用新增了一条体征记录，Agent 已同步更新。",
      actions: [],
      timestamp: entry.createdAt
    });
  };

  const resetDemo = () => {
    const fresh = buildInitialState();
    setState(fresh);
    setSnoozedReminders([]);
    setActiveTab("today");
    setRoleView("patient");
    setAgentOpen(true);
    setDemoTime("07:50");
    setRecognitionResult(null);
    setSelectedFileName("");
    setManualVitalsText("");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <strong>慢病用药小管家</strong>
        </div>
        <div className="topbar-actions">
          <div className={`segmented ${roleView}`} role="tablist" aria-label="身份视角">
            <button
              className={roleView === "patient" ? "active" : ""}
              onClick={() => setRoleView("patient")}
            >
              患者本人
            </button>
            <button
              className={roleView === "guardian" ? "active" : ""}
              onClick={() => setRoleView("guardian")}
            >
              子女关怀
            </button>
          </div>
          <button className="ghost-button" onClick={resetDemo}>
            重置 Demo
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="side-nav" aria-label="功能导航">
          <nav className="side-menu">
            <button
              className={activeTab === "today" ? "active" : ""}
              onClick={() => setActiveTab("today")}
            >
              <span>▦</span>
              今日打卡
            </button>
            <button
              className={activeTab === "cabinet" ? "active" : ""}
              onClick={() => setActiveTab("cabinet")}
            >
              <span>◷</span>
              智能药箱
            </button>
            <button
              className={activeTab === "vitals" ? "active" : ""}
              onClick={() => setActiveTab("vitals")}
            >
              <span>✚</span>
              体征日记
            </button>
          </nav>
        </aside>

        <div className="content-shell">
          <div className="page-title">
            <p className="eyebrow">美团 AI coding demo</p>
            <h1>慢病用药小管家</h1>
            <p className="subtitle">
              主应用负责总览，右侧微信专属 Agent 负责提醒、追问与快捷协助。
            </p>
          </div>

          <main className={`workspace ${agentOpen ? "agent-open" : "agent-closed"}`}>
        <section className="main-panel">
          <div className="status-row">
            <div className="time-switch">
              <span>演示时间</span>
              <div className="chips" aria-label="演示时间切换">
                {DEMO_TIME_OPTIONS.map((time) => (
                  <button
                    key={time}
                    className={demoTime === time ? "active" : ""}
                    onClick={() => setDemoTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="status-card">
              <strong>{completionRate}%</strong>
              <span>今日完成度</span>
            </div>
            <div className="status-card">
              <strong>{habitWindow}</strong>
              <span>习惯提醒窗口</span>
            </div>
            <div className="status-card">
              <strong>{riskMedications.length}</strong>
              <span>库存风险药品</span>
            </div>
          </div>

          {riskMedications.length > 0 && (
            <div className="warning-banner" role="alert">
              <div>
                <strong>余量不足 3 天</strong>
                <p>
                  {riskMedications.map((medication) => medication.name).join("、")}
                  需要尽快续方，避免断药。
                </p>
              </div>
              <div className="warning-actions">
                <button onClick={() => triggerAgentFollowUp(riskMedications[0]?.id)}>Agent 跟进</button>
                <button className="soft" onClick={() => openRefillLink(riskMedications[0]?.id)}>
                  一键续方
                </button>
                <button className="soft" onClick={() => openDoctorConsultLink(riskMedications[0]?.id)}>
                  在线复诊
                </button>
              </div>
            </div>
          )}

          <nav className="tabs" aria-label="主导航">
            <button className={activeTab === "today" ? "active" : ""} onClick={() => setActiveTab("today")}>
              今日打卡
            </button>
            <button className={activeTab === "cabinet" ? "active" : ""} onClick={() => setActiveTab("cabinet")}>
              智能药箱
            </button>
            <button className={activeTab === "vitals" ? "active" : ""} onClick={() => setActiveTab("vitals")}>
              体征日记
            </button>
          </nav>

          {activeTab === "today" && (
            <div className="tab-content">
              <div className="section-header">
                <div>
                  <h2>今日用药时间轴</h2>
                  <p>按照早、中、晚、睡前分组，打卡后库存会自动扣减。</p>
                </div>
                {roleView === "guardian" && (
                  <span className="tag neutral">子女视角仅查看，不支持代打卡</span>
                )}
              </div>

              <div className="timeline">
                {timeline.map((group) => (
                  <article className="timeline-group" key={group.slot}>
                    <div className="timeline-head">
                      <h3>{group.slot}</h3>
                      <span>{SLOT_TIMES[group.slot]}</span>
                    </div>
                    <div className="cards-grid">
                      {group.items.length === 0 && <EmptyState text="当前时段暂无药品安排。" />}
                      {group.items.map(({ medication, status, slot }) => {
                        const remainingDays = getRemainingDays(medication);
                        return (
                          <section className="med-card" key={`${medication.id}-${slot}`}>
                            <div className="med-head">
                              <div>
                                <h4>{medication.name}</h4>
                                <p>{medication.spec}</p>
                              </div>
                              <span
                                className={`tag ${
                                  status === "taken"
                                    ? "success"
                                    : status === "missed"
                                      ? "warning"
                                      : remainingDays <= 3
                                        ? "danger"
                                        : "neutral"
                                }`}
                              >
                                {status === "taken"
                                  ? "已服"
                                  : status === "missed"
                                    ? "漏服"
                                    : remainingDays <= 3
                                      ? "余量紧张"
                                      : "待服"}
                              </span>
                            </div>
                            <dl className="kv-grid">
                              <div>
                                <dt>单次剂量</dt>
                                <dd>{medication.dosePerUse} 片</dd>
                              </div>
                              <div>
                                <dt>剩余库存</dt>
                                <dd>{medication.remainingStock} 片</dd>
                              </div>
                              <div>
                                <dt>剩余天数</dt>
                                <dd>{remainingDays.toFixed(1)} 天</dd>
                              </div>
                              <div>
                                <dt>来源</dt>
                                <dd>{medication.source === "meituan_order" ? "订单导入" : "多模态识别"}</dd>
                              </div>
                            </dl>
                            <div className="card-actions">
                              <button
                                className="primary-button"
                                disabled={status !== "pending" || roleView === "guardian"}
                                onClick={() => checkInMedication(medication.id, slot, "main_app")}
                              >
                                {status === "taken"
                                  ? "已完成打卡"
                                  : status === "missed"
                                    ? "已标记漏服"
                                    : "一键服药"}
                              </button>
                              <button
                                className="ghost-button small"
                                onClick={() => triggerAgentFollowUp(medication.id, slot)}
                              >
                                Agent 跟进
                              </button>
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === "cabinet" && (
            <div className="tab-content two-column">
              <section className="panel">
                <div className="section-header">
                  <div>
                    <h2>智能药箱</h2>
                    <p>支持美团订单导入和多模态大模型识别，均需人工确认后入库。</p>
                  </div>
                </div>

                <div className="form-card">
                  <h3>一键导入美团历史订单</h3>
                  <label className="field">
                    <span>选择历史订单</span>
                    <select value={selectedOrderId} onChange={(event) => setSelectedOrderId(event.target.value)}>
                      {orderTemplates.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name} / {item.spec}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="primary-button" onClick={handleOrderImport}>
                    确认导入并生成计划
                  </button>
                </div>

                <div className="form-card">
                  <h3>AI 拍照识别（多模态大模型）</h3>
                  <label className="field">
                    <span>图片类型</span>
                    <select
                      value={recognitionType}
                      onChange={(event) => setRecognitionType(event.target.value)}
                    >
                      {aiTemplates.map((item) => (
                        <option key={item.imageType} value={item.imageType}>
                          {item.imageType}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="upload-box">
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    <strong>{selectedFileName || "上传处方单、药盒、药袋或订单截图"}</strong>
                    <span>模型会结合图像语义和文字内容完成结构化理解，而不是只做 OCR 扫字。</span>
                  </label>
                  <button className="primary-button" onClick={runAiRecognition}>
                    开始识别
                  </button>
                </div>
              </section>

              <section className="panel">
                <div className="section-header">
                  <div>
                    <h2>识别确认与库存总览</h2>
                    <p>低置信字段会要求人工复核，避免识别错误直接入库。</p>
                  </div>
                </div>

                <div className="recognition-card">
                  {isAnalyzing && <p className="analysis-state">多模态模型正在理解图片内容...</p>}
                  {!isAnalyzing && !recognitionResult && (
                    <EmptyState text="上传图片并点击开始识别后，这里会展示结构化结果确认卡片。" />
                  )}
                  {recognitionResult && (
                    <>
                      <div className="result-head">
                        <div>
                          <h3>{recognitionResult.extractedName}</h3>
                          <p>{recognitionResult.imageType}</p>
                        </div>
                        <span className={`tag ${recognitionResult.confidenceLevel === "高" ? "success" : "warning"}`}>
                          置信度 {recognitionResult.confidenceLevel}
                        </span>
                      </div>
                      <dl className="kv-grid">
                        <div>
                          <dt>规格</dt>
                          <dd>{recognitionResult.extractedSpec}</dd>
                        </div>
                        <div>
                          <dt>每日频次</dt>
                          <dd>{recognitionResult.timesPerDay} 次</dd>
                        </div>
                        <div>
                          <dt>单次剂量</dt>
                          <dd>{recognitionResult.dosePerUse} 片</dd>
                        </div>
                        <div>
                          <dt>总数量</dt>
                          <dd>{recognitionResult.totalStock} 片</dd>
                        </div>
                      </dl>
                      <div className={`review-box ${recognitionResult.needsReview ? "needs-review" : ""}`}>
                        <strong>{recognitionResult.needsReview ? "需人工确认" : "识别结果可信"}</strong>
                        <p>{recognitionResult.reviewNotes}</p>
                      </div>
                      <button className="primary-button" onClick={confirmAiRecognition}>
                        确认结果并入库
                      </button>
                    </>
                  )}
                </div>

                <div className="inventory-list">
                  {state.medications.map((medication) => (
                    <div className="inventory-row" key={medication.id}>
                      <div>
                        <strong>{medication.name}</strong>
                        <p>
                          {medication.spec} · {medication.scheduleSlots.join(" / ")}
                        </p>
                      </div>
                      <div className="inventory-meta">
                        <span>{medication.remainingStock} 片</span>
                        <span className={`tag ${getRemainingDays(medication) <= 3 ? "danger" : "neutral"}`}>
                          {getRemainingDays(medication) <= 3 ? "库存预警" : "库存正常"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "vitals" && (
            <div className="tab-content two-column">
              <section className="panel">
                <div className="section-header">
                  <div>
                    <h2>体征日记</h2>
                    <p>支持主应用记录，也支持从微信 Agent 快捷补记。</p>
                  </div>
                </div>
                <div className="form-card">
                  <label className="field">
                    <span>语音转写结果 / 手动补充</span>
                    <textarea
                      rows={5}
                      value={manualVitalsText}
                      onChange={(event) => setManualVitalsText(event.target.value)}
                      placeholder="例如：吃完新开的降压药后有点头晕，活动后缓解。"
                    />
                  </label>
                  <div className="inline-actions">
                    <button className="primary-button" onClick={submitVitalsFromMain}>
                      生成结构化记录
                    </button>
                    <button className="ghost-button" onClick={openAgent}>
                      从 Agent 快捷补记
                    </button>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="section-header">
                  <div>
                    <h2>历史记录</h2>
                    <p>每条记录都附带合规提示和医生导流入口。</p>
                  </div>
                </div>
                <div className="vitals-list">
                  {state.vitals.map((entry) => (
                    <article className="vitals-card" key={entry.id}>
                      <div className="vitals-head">
                        <strong>{formatDateTime(entry.createdAt)}</strong>
                        <span className={`tag ${entry.source === "wechat_agent" ? "success" : "neutral"}`}>
                          {entry.source === "wechat_agent" ? "来自 Agent" : "来自主应用"}
                        </span>
                      </div>
                      <p>{entry.rawText}</p>
                      <div className="tag-list">
                        {entry.structuredTags.map((tag) => (
                          <span className="mini-tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="compliance-box">
                        <strong>合规提示</strong>
                        <p>{entry.complianceNotice}</p>
                      </div>
                      <button className="primary-button secondary" onClick={() => openDoctorConsultLink()}>
                        点击连线美团在线医生
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>

        <aside className={`agent-panel ${agentOpen ? "open" : "collapsed"}`}>
          {agentOpen ? (
            <>
              <div className="agent-header">
                <div>
                  <p className="eyebrow">微信专属 Agent</p>
                  <h2>{roleView === "patient" ? "用药陪护助手" : "子女关怀同步"}</h2>
                </div>
                <button className="icon-button" onClick={() => setAgentOpen(false)}>
                  收起
                </button>
              </div>

              <div className="wechat-shell">
                <div className="wechat-title">
                  <span className="avatar">药</span>
                  <div>
                    <strong>{roleView === "patient" ? "用药陪护助手" : "家庭关怀提醒"}</strong>
                    <p>{roleView === "patient" ? "提醒、打卡、记录不适" : "同步患者状态与风险"}</p>
                  </div>
                </div>
                <div className="message-list">
                  {mergedAgentMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      actionHandler={handleAgentAction}
                    />
                  ))}
                </div>
              </div>

              <div className="agent-summary">
                <div className="summary-item">
                  <span>提醒状态</span>
                  <strong>
                    {!activeReminder
                      ? "窗口未到"
                      : activeReminder.state === "patient_reminder"
                        ? "已提醒患者"
                        : "已同步子女"}
                  </strong>
                </div>
                <div className="summary-item">
                  <span>库存风险</span>
                  <strong>{riskMedications.length} 项</strong>
                </div>
                {slotStatusSummary.map((item) => (
                  <div className="summary-item" key={item.slot}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <button className="agent-fab" onClick={() => setAgentOpen(true)}>
              <span className="agent-fab-icon">药</span>
              <span>微信 Agent</span>
            </button>
          )}
        </aside>
          </main>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <p>{text}</p>
    </div>
  );
}

function MessageBubble({
  message,
  actionHandler
}: {
  message: AgentMessage;
  actionHandler: (action: AgentAction) => void;
}) {
  const isAgent = message.role === "agent";
  const isUser = message.role === "user";
  const className = `message-bubble ${isAgent ? "agent" : isUser ? "user" : "system"}`;
  const avatarLabel = isAgent ? "药" : isUser ? "我" : "系";
  const avatarClassName = `avatar small ${isAgent ? "agent-avatar" : ""}`;
  return (
    <div className={className}>
      {!isUser && <span className={avatarClassName}>{avatarLabel}</span>}
      <div className="bubble-card">
        <p>{message.text}</p>
        {message.actions.length > 0 && (
            <div className="bubble-actions">
              {message.actions.map((action) => (
              <button key={action.label} onClick={() => actionHandler(action)}>
                {action.label}
              </button>
              ))}
            </div>
        )}
        <span className="message-time">{formatDateTime(message.timestamp)}</span>
      </div>
      {isUser && <span className={avatarClassName}>{avatarLabel}</span>}
    </div>
  );
}

export default App;

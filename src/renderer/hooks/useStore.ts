import { useState, useEffect, useCallback, useMemo } from 'react';
const { ipcRenderer } = window.require('electron');

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  seat: number;
  muted: boolean;
  online: boolean;
  group: string;
  joinTime: string;
  connectionStatus: 'good' | 'warning' | 'bad';
  role: 'participant' | 'cohost' | 'host';
}

export interface Room {
  id: string;
  name: string;
  theme: string;
  description?: string;
  capacity: number;
  online: number;
  participantCount: number;
  status: string;
  host: string;
  permission: string;
  startTime?: string;
  endTime?: string;
  topic?: string;
  notes?: string;
  groupTasks?: Record<string, string>;
  discussionMode?: boolean;
}

export interface RecordingItem {
  id: string;
  name: string;
  duration: string;
  date: string;
  size: string;
  durationSeconds: number;
}

export interface Vote {
  id: string;
  question: string;
  options: string[];
  results: number[];
  active: boolean;
}

export interface Task {
  id: string;
  name: string;
  status: 'completed' | 'active' | 'locked';
  reward: string;
}

export interface HandRaise {
  id: string;
  name: string;
  avatar: string;
  time: string;
}

export interface AppState {
  rooms: Room[];
  currentUser: { id: string; name: string; role: string; avatar: string };
  participants: Participant[];
  currentRoom: Room | null;
  recordings: RecordingItem[];
  activities: {
    handRaises: HandRaise[];
    votes: Vote[];
    tasks: Task[];
  };
  groups: string[];
  whiteboardData: string | null;
}

const avatarColors = [
  '#667eea', '#f093fb', '#11998e', '#f5576c',
  '#4facfe', '#43e97b', '#fa709a', '#fee140',
  '#a18cd1', '#fad0c4', '#ffecd2', '#a1c4fd',
];

const groupColors: Record<string, string> = {
  '一组': '#667eea',
  '二组': '#11998e',
  '三组': '#f093fb',
  '四组': '#f5576c',
};

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function getGroupColor(group: string): string {
  return groupColors[group] || '#667eea';
}

export function getGroupNum(group: string): number {
  const match = group.match(/(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

const defaultState: AppState = {
  rooms: [
    { 
      id: '1', 
      name: '产品培训会议室', 
      theme: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      description: '产品功能深度培训', 
      capacity: 50, 
      online: 23, 
      participantCount: 23, 
      status: 'active', 
      host: '张老师', 
      permission: 'invite',
      startTime: '2026-06-08 14:00',
      endTime: '2026-06-08 16:00',
      topic: '新产品功能深度解析',
      notes: '请提前准备好问题，培训后有QA环节',
      groupTasks: {},
      discussionMode: false,
    },
    { 
      id: '2', 
      name: '新人入职培训厅', 
      theme: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', 
      description: '新员工入职培训课程', 
      capacity: 30, 
      online: 15, 
      participantCount: 15, 
      status: 'active', 
      host: '李主管', 
      permission: 'password',
      startTime: '2026-06-08 09:00',
      endTime: '2026-06-08 12:00',
      topic: '新员工入职培训',
      notes: '公司文化、规章制度、流程介绍',
      groupTasks: {},
      discussionMode: false,
    },
    { 
      id: '3', 
      name: '技术分享会', 
      theme: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)', 
      description: '前沿技术交流分享', 
      capacity: 100, 
      online: 67, 
      participantCount: 67, 
      status: 'active', 
      host: '王工', 
      permission: 'open',
      startTime: '2026-06-08 15:00',
      endTime: '2026-06-08 17:30',
      topic: 'AI 技术前沿分享',
      notes: '开放讨论，欢迎分享想法',
      groupTasks: {},
      discussionMode: false,
    },
    { 
      id: '4', 
      name: '虚拟教室A', 
      theme: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
      description: '小组讨论专用教室', 
      capacity: 40, 
      online: 0, 
      participantCount: 0, 
      status: 'inactive', 
      host: '待定', 
      permission: 'invite',
      startTime: '2026-06-09 10:00',
      endTime: '2026-06-09 11:30',
      topic: '项目复盘讨论',
      notes: '下周项目组内讨论',
      groupTasks: {},
      discussionMode: false,
    },
  ],
  currentUser: { id: 'u001', name: '组织者', role: 'host', avatar: '👨‍💼' },
  participants: [
    { id: 'p1', name: '张三', avatar: '👨', seat: 1, muted: false, online: true, group: '一组', joinTime: '14:00', connectionStatus: 'good', role: 'participant' },
    { id: 'p2', name: '李四', avatar: '👩', seat: 2, muted: true, online: true, group: '一组', joinTime: '14:02', connectionStatus: 'good', role: 'participant' },
    { id: 'p3', name: '王五', avatar: '🧑', seat: 3, muted: false, online: true, group: '二组', joinTime: '14:05', connectionStatus: 'warning', role: 'participant' },
    { id: 'p4', name: '赵六', avatar: '👨‍🦱', seat: 4, muted: true, online: true, group: '二组', joinTime: '14:10', connectionStatus: 'good', role: 'participant' },
    { id: 'p5', name: '钱七', avatar: '👩‍🦰', seat: 5, muted: false, online: true, group: '三组', joinTime: '14:08', connectionStatus: 'bad', role: 'participant' },
    { id: 'p6', name: '孙八', avatar: '🧔', seat: 6, muted: true, online: false, group: '三组', joinTime: '14:15', connectionStatus: 'good', role: 'participant' },
    { id: 'p7', name: '周九', avatar: '👴', seat: 7, muted: false, online: true, group: '一组', joinTime: '14:20', connectionStatus: 'good', role: 'participant' },
    { id: 'p8', name: '吴十', avatar: '👵', seat: 8, muted: true, online: true, group: '二组', joinTime: '14:25', connectionStatus: 'warning', role: 'participant' },
  ],
  currentRoom: null,
  recordings: [
    { id: 'r1', name: '产品介绍片段1', duration: '05:32', date: '2026-06-05 14:30', size: '45.2 MB', durationSeconds: 332 },
    { id: 'r2', name: '互动问答环节', duration: '12:18', date: '2026-06-05 15:10', size: '98.7 MB', durationSeconds: 738 },
    { id: 'r3', name: '总结发言', duration: '03:45', date: '2026-06-05 16:00', size: '28.1 MB', durationSeconds: 225 },
  ],
  activities: {
    handRaises: [
      { id: 'h1', name: '张三', avatar: '👨', time: '2分钟前' },
      { id: 'h2', name: '李四', avatar: '👩', time: '5分钟前' },
    ],
    votes: [
      { id: 'v1', question: '你对本次培训内容满意吗？', options: ['非常满意', '满意', '一般', '不满意'], results: [12, 8, 2, 1], active: false },
    ],
    tasks: [
      { id: 't1', name: '第一关：基础知识测验', status: 'completed', reward: '🏆 青铜徽章' },
      { id: 't2', name: '第二关：实操演练', status: 'active', reward: '🥈 白银徽章' },
      { id: 't3', name: '第三关：综合考核', status: 'locked', reward: '🥇 黄金徽章' },
    ],
  },
  groups: ['一组', '二组', '三组', '四组'],
  whiteboardData: null,
};

export function useStore<T>(selector: (state: AppState) => T): T {
  const [state, setState] = useState<T>(() => {
    const savedState = (window as any).__INITIAL_STATE__;
    return selector(savedState || defaultState);
  });

  useEffect(() => {
    const handleStateUpdate = (_event: any, newState: AppState) => {
      setState(selector(newState));
    };

    ipcRenderer.on('state-updated', handleStateUpdate);

    ipcRenderer.invoke('get-state').then((initialState: AppState) => {
      (window as any).__INITIAL_STATE__ = initialState;
      setState(selector(initialState));
    }).catch(() => {
      // 如果 IPC 调用失败（比如沙箱环境），使用默认状态
      setState(selector(defaultState));
    });

    return () => {
      ipcRenderer.removeListener('state-updated', handleStateUpdate);
    };
  }, [selector]);

  return state;
}

export function useParticipants() {
  return useStore(state => state.participants);
}

export function useRooms() {
  return useStore(state => state.rooms);
}

export function useCurrentRoom() {
  return useStore(state => state.currentRoom);
}

export function useRecordings() {
  return useStore(state => state.recordings);
}

export function useGroups() {
  return useStore(state => state.groups);
}

export function useGroupsWithColors() {
  const groups = useGroups();
  return useMemo(() => 
    groups.map(g => ({ id: getGroupNum(g), name: g, color: getGroupColor(g) })),
    [groups]
  );
}

export function useCurrentUser() {
  return useStore(state => state.currentUser);
}

export function useActivities() {
  return useStore(state => state.activities);
}

export const storeActions = {
  addParticipant: (data: { name: string; group?: string; avatar?: string }) => 
    ipcRenderer.invoke('add-participant', data),
  removeParticipant: (id: string) => 
    ipcRenderer.invoke('remove-participant', id),
  updateParticipant: (id: string, updates: Partial<Participant>) => 
    ipcRenderer.invoke('update-participant', id, updates),
  swapSeats: (id1: string, id2: string) => 
    ipcRenderer.invoke('swap-seats', id1, id2),
  moveToSeat: (id: string, seat: number) => 
    ipcRenderer.invoke('move-to-seat', id, seat),
  changeGroup: (id: string, group: string) => 
    ipcRenderer.invoke('change-group', id, group),
  toggleMute: (id: string) => 
    ipcRenderer.invoke('toggle-mute', id),
  muteAll: () => 
    ipcRenderer.invoke('mute-all'),
  addRoom: (data: { name: string; theme?: string; capacity?: number; permission?: string; startTime?: string; endTime?: string; topic?: string; notes?: string }) => 
    ipcRenderer.invoke('add-room', data),
  setCurrentRoom: (id: string) => 
    ipcRenderer.invoke('set-current-room', id),
  updateRoom: (id: string, updates: any) => 
    ipcRenderer.invoke('update-room', id, updates),
  setDiscussionMode: (roomId: string, group: string, enabled: boolean) => 
    ipcRenderer.invoke('set-discussion-mode', roomId, group, enabled),
  setGroupTask: (roomId: string, group: string, task: string) => 
    ipcRenderer.invoke('set-group-task', roomId, group, task),
  setCohost: (participantId: string, isCohost: boolean) => 
    ipcRenderer.invoke('set-cohost', participantId, isCohost),
  addRecording: (data: { name: string; durationSeconds: number }) => 
    ipcRenderer.invoke('add-recording', data),
  deleteRecording: (id: string) => 
    ipcRenderer.invoke('delete-recording', id),
  exportAttendanceCSV: (filePath: string, filter?: { search?: string; group?: string }) => 
    ipcRenderer.invoke('export-attendance-csv', filePath, filter),
  exportReviewCSV: (filePath: string, filter?: { search?: string; group?: string }) => 
    ipcRenderer.invoke('export-review-csv', filePath, filter),
  exportReviewText: (filePath: string, filter?: { search?: string; group?: string }) => 
    ipcRenderer.invoke('export-review-text', filePath, filter),
  exportWhiteboardPNG: (filePath: string, dataUrl: string) => 
    ipcRenderer.invoke('export-whiteboard-png', filePath, dataUrl),
  generateRecordingFile: (filePath: string, recordingId: string) => 
    ipcRenderer.invoke('generate-recording-file', filePath, recordingId),
  saveWhiteboard: (dataUrl: string) => 
    ipcRenderer.invoke('save-whiteboard', dataUrl),
  getWhiteboardData: () => 
    ipcRenderer.invoke('get-whiteboard-data'),
  addVote: (data: { question: string; options: string[] }) => 
    ipcRenderer.invoke('add-vote', data),
  toggleVoteActive: (id: string) => 
    ipcRenderer.invoke('toggle-vote-active', id),
  admitHandRaise: (id: string) => 
    ipcRenderer.invoke('admit-hand-raise', id),
  rejectHandRaise: (id: string) => 
    ipcRenderer.invoke('reject-hand-raise', id),
  updateCurrentUser: (updates: any) => 
    ipcRenderer.invoke('update-current-user', updates),
  openWindow: (name: string, data?: any) => 
    ipcRenderer.invoke('open-window', name, data),
  closeWindow: (name: string) => 
    ipcRenderer.invoke('close-window', name),
  showSaveDialog: (options: any) => 
    ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => 
    ipcRenderer.invoke('show-open-dialog', options),
};

export {};

import { BrowserWindow } from 'electron';
import * as path from 'path';

interface WindowConfig {
  name: string;
  title: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
}

const windowConfigs: Record<string, WindowConfig> = {
  lobby: { name: 'lobby', title: '元宇宙大厅', width: 1200, height: 800, minWidth: 1000, minHeight: 700 },
  room: { name: 'room', title: '虚拟房间', width: 1400, height: 900, minWidth: 1200, minHeight: 800 },
  character: { name: 'character', title: '角色形象', width: 800, height: 700, minWidth: 700, minHeight: 600 },
  whiteboard: { name: 'whiteboard', title: '协作白板', width: 1200, height: 800, minWidth: 1000, minHeight: 700 },
  activity: { name: 'activity', title: '活动中心', width: 1000, height: 750, minWidth: 900, minHeight: 650 },
  recording: { name: 'recording', title: '录制中心', width: 1100, height: 750, minWidth: 950, minHeight: 650 },
  management: { name: 'management', title: '管理控制台', width: 1200, height: 800, minWidth: 1000, minHeight: 700 },
};

export function createWindowManager() {
  const windows: Record<string, BrowserWindow | null> = {};
  const sharedData: Record<string, any> = {
    rooms: [
      { id: '1', name: '产品培训会议室', theme: '科技蓝', capacity: 50, online: 23, status: '进行中', host: '张老师' },
      { id: '2', name: '新人入职培训厅', theme: '清新绿', capacity: 30, online: 15, status: '进行中', host: '李主管' },
      { id: '3', name: '技术分享会', theme: '商务灰', capacity: 100, online: 67, status: '进行中', host: '王工' },
      { id: '4', name: '虚拟教室A', theme: '温馨橙', capacity: 40, online: 0, status: '未开始', host: '待定' },
    ],
    currentUser: { id: 'u001', name: '组织者', role: 'host', avatar: '👨‍💼' },
    participants: [
      { id: 'p1', name: '张三', avatar: '👨', seat: 1, muted: false, online: true, group: '一组' },
      { id: 'p2', name: '李四', avatar: '👩', seat: 2, muted: true, online: true, group: '一组' },
      { id: 'p3', name: '王五', avatar: '🧑', seat: 3, muted: false, online: true, group: '二组' },
      { id: 'p4', name: '赵六', avatar: '👨‍🦱', seat: 4, muted: true, online: true, group: '二组' },
      { id: 'p5', name: '钱七', avatar: '👩‍🦰', seat: 5, muted: false, online: true, group: '三组' },
      { id: 'p6', name: '孙八', avatar: '🧔', seat: 6, muted: true, online: false, group: '三组' },
      { id: 'p7', name: '周九', avatar: '👴', seat: 7, muted: false, online: true, group: '一组' },
      { id: 'p8', name: '吴十', avatar: '👵', seat: 8, muted: true, online: true, group: '二组' },
    ],
    currentRoom: null,
    recordings: [
      { id: 'r1', name: '产品介绍片段1', duration: '05:32', date: '2026-06-05 14:30', size: '45.2 MB' },
      { id: 'r2', name: '互动问答环节', duration: '12:18', date: '2026-06-05 15:10', size: '98.7 MB' },
      { id: 'r3', name: '总结发言', duration: '03:45', date: '2026-06-05 16:00', size: '28.1 MB' },
    ],
    activities: {
      handRaises: [],
      votes: [
        { id: 'v1', question: '你对本次培训内容满意吗？', options: ['非常满意', '满意', '一般', '不满意'], results: [12, 8, 2, 1], active: false },
      ],
      tasks: [
        { id: 't1', name: '第一关：基础知识测验', status: 'completed', reward: '🏆 青铜徽章' },
        { id: 't2', name: '第二关：实操演练', status: 'active', reward: '🥈 白银徽章' },
        { id: 't3', name: '第三关：综合考核', status: 'locked', reward: '🥇 黄金徽章' },
      ],
    },
  };

  function createWindow(name: string, data?: any): BrowserWindow {
    const config = windowConfigs[name];
    if (!config) throw new Error(`Unknown window: ${name}`);

    if (windows[name] && !windows[name]!.isDestroyed()) {
      windows[name]!.focus();
      return windows[name]!;
    }

    const win = new BrowserWindow({
      width: config.width,
      height: config.height,
      minWidth: config.minWidth,
      minHeight: config.minHeight,
      title: config.title,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        preload: path.join(__dirname, 'preload.js'),
      },
      backgroundColor: '#1a1a2e',
      frame: true,
      show: false,
    });

    const htmlPath = path.join(__dirname, '..', 'renderer', 'html', `${name}.html`);
    win.loadFile(htmlPath);

    win.once('ready-to-show', () => {
      win.show();
    });

    win.on('closed', () => {
      windows[name] = null;
    });

    windows[name] = win;
    return win;
  }

  return {
    createLobbyWindow: () => createWindow('lobby'),
    createRoomWindow: (data?: any) => {
      if (data) {
        sharedData.currentRoom = data;
      }
      return createWindow('room', data);
    },
    createCharacterWindow: () => createWindow('character'),
    createWhiteboardWindow: () => createWindow('whiteboard'),
    createActivityWindow: () => createWindow('activity'),
    createRecordingWindow: () => createWindow('recording'),
    createManagementWindow: () => createWindow('management'),
    closeWindow: (name: string) => {
      if (windows[name]) {
        windows[name]!.close();
        windows[name] = null;
      }
    },
    getData: (key: string) => sharedData[key],
    setData: (key: string, value: any) => {
      sharedData[key] = value;
    },
    getWindows: () => windows,
  };
}

import { BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { initialState, Participant, Room, RecordingItem, Vote, HandRaise } from './store';

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

let state = JSON.parse(JSON.stringify(initialState));

export function createWindowManager() {
  const windows: Record<string, BrowserWindow | null> = {};

  function broadcastState() {
    Object.keys(windows).forEach(name => {
      const win = windows[name];
      if (win && !win.isDestroyed()) {
        win.webContents.send('state-updated', state);
      }
    });
  }

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

  // 参与者管理
  function getParticipants(): Participant[] {
    return state.participants;
  }

  function addParticipant(participant: Partial<Participant> & { name: string }): Participant {
    const maxSeat = state.participants.reduce((max: number, p: Participant) => Math.max(max, p.seat), 0);
    const newParticipant: Participant = {
      id: `p${Date.now()}`,
      name: participant.name,
      avatar: participant.avatar || '🧑',
      seat: maxSeat + 1,
      muted: true,
      online: false,
      group: participant.group || '一组',
      joinTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      connectionStatus: 'good',
      role: 'participant',
    };
    state.participants.push(newParticipant);
    broadcastState();
    return newParticipant;
  }

  function removeParticipant(id: string): boolean {
    const index = state.participants.findIndex((p: Participant) => p.id === id);
    if (index > -1) {
      state.participants.splice(index, 1);
      broadcastState();
      return true;
    }
    return false;
  }

  function updateParticipant(id: string, updates: Partial<Participant>): Participant | null {
    const participant = state.participants.find((p: Participant) => p.id === id);
    if (participant) {
      Object.assign(participant, updates);
      broadcastState();
      return participant;
    }
    return null;
  }

  function swapSeats(participantId1: string, participantId2: string): boolean {
    const p1 = state.participants.find((p: Participant) => p.id === participantId1);
    const p2 = state.participants.find((p: Participant) => p.id === participantId2);
    if (p1 && p2) {
      const tempSeat = p1.seat;
      p1.seat = p2.seat;
      p2.seat = tempSeat;
      broadcastState();
      return true;
    }
    return false;
  }

  function moveToSeat(participantId: string, seatNumber: number): boolean {
    const participant = state.participants.find((p: Participant) => p.id === participantId);
    const existing = state.participants.find((p: Participant) => p.seat === seatNumber);
    if (participant) {
      if (existing) {
        existing.seat = participant.seat;
      }
      participant.seat = seatNumber;
      broadcastState();
      return true;
    }
    return false;
  }

  function changeGroup(participantId: string, newGroup: string): boolean {
    const participant = state.participants.find((p: Participant) => p.id === participantId);
    if (participant) {
      participant.group = newGroup;
      broadcastState();
      return true;
    }
    return false;
  }

  function toggleMute(participantId: string): boolean {
    const participant = state.participants.find((p: Participant) => p.id === participantId);
    if (participant) {
      participant.muted = !participant.muted;
      broadcastState();
      return true;
    }
    return false;
  }

  function muteAll(): void {
    state.participants.forEach((p: Participant) => { p.muted = true; });
    broadcastState();
  }

  // 房间管理
  function getRooms(): Room[] {
    return state.rooms;
  }

  function addRoom(room: Partial<Room> & { name: string }): Room {
    const newRoom: Room = {
      id: Date.now().toString(),
      name: room.name,
      theme: room.theme || '科技蓝',
      description: room.description || '',
      capacity: room.capacity || 30,
      online: 0,
      participantCount: 0,
      status: '未开始',
      host: state.currentUser.name,
      permission: room.permission || 'invite',
    };
    state.rooms.push(newRoom);
    broadcastState();
    return newRoom;
  }

  function setCurrentRoom(roomId: string): Room | null {
    const room = state.rooms.find((r: Room) => r.id === roomId);
    if (room) {
      state.currentRoom = room;
      broadcastState();
      return room;
    }
    return null;
  }

  function getCurrentRoom(): Room | null {
    return state.currentRoom;
  }

  // 录制管理
  function getRecordings(): RecordingItem[] {
    return state.recordings;
  }

  function addRecording(recording: Partial<RecordingItem> & { name: string; durationSeconds: number }): RecordingItem {
    const mins = Math.floor(recording.durationSeconds / 60);
    const secs = recording.durationSeconds % 60;
    const duration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const newRecording: RecordingItem = {
      id: `r${Date.now()}`,
      name: recording.name,
      duration,
      date: new Date().toLocaleString('zh-CN'),
      size: `${(recording.durationSeconds * 0.15).toFixed(1)} MB`,
      durationSeconds: recording.durationSeconds,
    };
    state.recordings.unshift(newRecording);
    broadcastState();
    return newRecording;
  }

  function deleteRecording(id: string): boolean {
    const index = state.recordings.findIndex((r: RecordingItem) => r.id === id);
    if (index > -1) {
      state.recordings.splice(index, 1);
      broadcastState();
      return true;
    }
    return false;
  }

  // 文件导出
  function exportAttendanceCSV(filePath: string, filter?: { search?: string; group?: string }): boolean {
    try {
      let participants = [...state.participants];
      
      if (filter?.search) {
        const search = filter.search.toLowerCase();
        participants = participants.filter(p => p.name.toLowerCase().includes(search));
      }
      if (filter?.group && filter.group !== 'all') {
        participants = participants.filter(p => p.group === filter.group);
      }

      const headers = ['ID', '姓名', '分组', '座位号', '状态', '加入时间', '连接状态', '麦克风'];
      const rows = participants.map(p => [
        p.id,
        p.name,
        p.group,
        p.seat.toString(),
        p.online ? '在线' : '离线',
        p.joinTime,
        p.connectionStatus === 'good' ? '良好' : p.connectionStatus === 'warning' ? '一般' : '较差',
        p.muted ? '静音' : '开启',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // 添加 BOM 以支持 Excel 中文显示
      const bom = '\uFEFF';
      fs.writeFileSync(filePath, bom + csvContent, 'utf-8');
      return true;
    } catch (err) {
      console.error('导出CSV失败:', err);
      return false;
    }
  }

  function exportWhiteboardPNG(filePath: string, dataUrl: string): boolean {
    try {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(filePath, base64Data, 'base64');
      return true;
    } catch (err) {
      console.error('导出PNG失败:', err);
      return false;
    }
  }

  function generateRecordingFile(filePath: string, recordingId: string): boolean {
    try {
      const recording = state.recordings.find((r: RecordingItem) => r.id === recordingId);
      if (!recording) return false;

      // 生成一个模拟的录制文件（实际项目中应该是真实的视频文件）
      const content = `Metaverse Recording\n================\nTitle: ${recording.name}\nDuration: ${recording.duration}\nDate: ${recording.date}\nSize: ${recording.size}\n\n[这是一个模拟的录制文件，实际项目中会包含真实的视频/音频数据]`;
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error('生成录制文件失败:', err);
      return false;
    }
  }

  // 白板数据
  function saveWhiteboardData(dataUrl: string): void {
    state.whiteboardData = dataUrl;
    broadcastState();
  }

  function getWhiteboardData(): string | null {
    return state.whiteboardData;
  }

  // 活动管理
  function addVote(vote: { question: string; options: string[] }): any {
    const newVote = {
      id: `v${Date.now()}`,
      question: vote.question,
      options: vote.options,
      results: new Array(vote.options.length).fill(0),
      active: true,
    };
    state.activities.votes.unshift(newVote);
    broadcastState();
    return newVote;
  }

  function toggleVoteActive(voteId: string): boolean {
    const vote = state.activities.votes.find((v: Vote) => v.id === voteId);
    if (vote) {
      vote.active = !vote.active;
      broadcastState();
      return true;
    }
    return false;
  }

  function admitHandRaise(handId: string): boolean {
    const index = state.activities.handRaises.findIndex((h: HandRaise) => h.id === handId);
    if (index > -1) {
      state.activities.handRaises.splice(index, 1);
      broadcastState();
      return true;
    }
    return false;
  }

  function rejectHandRaise(handId: string): boolean {
    const index = state.activities.handRaises.findIndex((h: HandRaise) => h.id === handId);
    if (index > -1) {
      state.activities.handRaises.splice(index, 1);
      broadcastState();
      return true;
    }
    return false;
  }

  // 用户管理
  function getCurrentUser(): any {
    return state.currentUser;
  }

  function updateCurrentUser(updates: any): any {
    Object.assign(state.currentUser, updates);
    broadcastState();
    return state.currentUser;
  }

  // 注册 IPC 处理器
  function registerIpcHandlers() {
    ipcMain.handle('get-state', () => state);
    ipcMain.handle('get-participants', () => getParticipants());
    ipcMain.handle('add-participant', (_event, data) => addParticipant(data));
    ipcMain.handle('remove-participant', (_event, id) => removeParticipant(id));
    ipcMain.handle('update-participant', (_event, id, updates) => updateParticipant(id, updates));
    ipcMain.handle('swap-seats', (_event, id1, id2) => swapSeats(id1, id2));
    ipcMain.handle('move-to-seat', (_event, id, seat) => moveToSeat(id, seat));
    ipcMain.handle('change-group', (_event, id, group) => changeGroup(id, group));
    ipcMain.handle('toggle-mute', (_event, id) => toggleMute(id));
    ipcMain.handle('mute-all', () => muteAll());
    
    ipcMain.handle('get-rooms', () => getRooms());
    ipcMain.handle('add-room', (_event, data) => addRoom(data));
    ipcMain.handle('set-current-room', (_event, id) => setCurrentRoom(id));
    ipcMain.handle('get-current-room', () => getCurrentRoom());
    
    ipcMain.handle('get-recordings', () => getRecordings());
    ipcMain.handle('add-recording', (_event, data) => addRecording(data));
    ipcMain.handle('delete-recording', (_event, id) => deleteRecording(id));
    
    ipcMain.handle('export-attendance-csv', (_event, filePath, filter) => exportAttendanceCSV(filePath, filter));
    ipcMain.handle('export-whiteboard-png', (_event, filePath, dataUrl) => exportWhiteboardPNG(filePath, dataUrl));
    ipcMain.handle('generate-recording-file', (_event, filePath, recordingId) => generateRecordingFile(filePath, recordingId));
    
    ipcMain.handle('save-whiteboard', (_event, dataUrl) => saveWhiteboardData(dataUrl));
    ipcMain.handle('get-whiteboard-data', () => getWhiteboardData());
    
    ipcMain.handle('add-vote', (_event, data) => addVote(data));
    ipcMain.handle('toggle-vote-active', (_event, id) => toggleVoteActive(id));
    ipcMain.handle('admit-hand-raise', (_event, id) => admitHandRaise(id));
    ipcMain.handle('reject-hand-raise', (_event, id) => rejectHandRaise(id));
    
    ipcMain.handle('get-current-user', () => getCurrentUser());
    ipcMain.handle('update-current-user', (_event, updates) => updateCurrentUser(updates));
    
    ipcMain.handle('get-groups', () => state.groups);
  }

  return {
    createLobbyWindow: () => createWindow('lobby'),
    createRoomWindow: (data?: any) => {
      if (data && data.id) {
        state.currentRoom = data;
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
    getWindows: () => windows,
    registerIpcHandlers,
    broadcastState,
    getState: () => state,
  };
}

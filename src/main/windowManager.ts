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

  function updateRoom(roomId: string, updates: Partial<Room>): Room | null {
    const room = state.rooms.find((r: Room) => r.id === roomId);
    if (room) {
      Object.assign(room, updates);
      if (state.currentRoom?.id === roomId) {
        Object.assign(state.currentRoom, updates);
      }
      broadcastState();
      return room;
    }
    return null;
  }

  function setDiscussionMode(roomId: string, group: string, enabled: boolean): boolean {
    const room = state.rooms.find((r: Room) => r.id === roomId);
    if (room) {
      if (!room.groupTasks) room.groupTasks = {};
      room.groupTasks[`discussion_${group}`] = enabled ? 'true' : 'false';
      if (state.currentRoom?.id === roomId) {
        if (!state.currentRoom.groupTasks) state.currentRoom.groupTasks = {};
        state.currentRoom.groupTasks[`discussion_${group}`] = enabled ? 'true' : 'false';
      }
      broadcastState();
      return true;
    }
    return false;
  }

  function setGroupTask(roomId: string, group: string, task: string): boolean {
    const room = state.rooms.find((r: Room) => r.id === roomId);
    if (room) {
      if (!room.groupTasks) room.groupTasks = {};
      room.groupTasks[group] = task;
      if (state.currentRoom?.id === roomId) {
        if (!state.currentRoom.groupTasks) state.currentRoom.groupTasks = {};
        state.currentRoom.groupTasks[group] = task;
      }
      broadcastState();
      return true;
    }
    return false;
  }

  function setCohost(participantId: string, isCohost: boolean): boolean {
    const participant = state.participants.find((p: Participant) => p.id === participantId);
    if (participant) {
      participant.role = isCohost ? 'cohost' : 'participant';
      broadcastState();
      return true;
    }
    return false;
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

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  }

  function exportReviewCSV(filePath: string, filter?: { search?: string; group?: string }): boolean {
    try {
      let participants = [...state.participants];
      
      if (filter?.search) {
        const search = filter.search.toLowerCase();
        participants = participants.filter(p => p.name.toLowerCase().includes(search));
      }
      if (filter?.group && filter.group !== 'all') {
        participants = participants.filter(p => p.group === filter.group);
      }

      const headers = [
        '序号', '姓名', '分组', '角色', '座位号', '在线状态', 
        '加入时间', '在线时长', '举手次数', '投票参与', 
        '任务完成', '连接状态', '麦克风'
      ];
      
      const rows = participants.map((p, index) => {
        const handRaiseCount = state.activities.handRaises.filter((h: any) => h.name === p.name).length;
        const taskCompleted = state.activities.tasks.filter((t: any) => t.status === 'completed').length;
        const totalTasks = state.activities.tasks.length;
        const onlineMinutes = Math.floor(Math.random() * 120) + 10;
        
        return [
          (index + 1).toString(),
          p.name,
          p.group,
          p.role === 'host' ? '主持人' : p.role === 'cohost' ? '联席主持' : '参会者',
          p.seat.toString(),
          p.online ? '在线' : '离线',
          p.joinTime,
          `${onlineMinutes}分钟`,
          handRaiseCount.toString(),
          state.activities.votes.length > 0 ? '已参与' : '未发起',
          `${taskCompleted}/${totalTasks}`,
          p.connectionStatus === 'good' ? '良好' : p.connectionStatus === 'warning' ? '一般' : '较差',
          p.muted ? '静音' : '开启',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // 添加 BOM 以支持 Excel 中文显示
      const bom = '\uFEFF';
      fs.writeFileSync(filePath, bom + csvContent, 'utf-8');
      return true;
    } catch (err) {
      console.error('导出复盘CSV失败:', err);
      return false;
    }
  }

  function exportReviewText(filePath: string, filter?: { search?: string; group?: string }): boolean {
    try {
      let participants = [...state.participants];
      
      if (filter?.search) {
        const search = filter.search.toLowerCase();
        participants = participants.filter(p => p.name.toLowerCase().includes(search));
      }
      if (filter?.group && filter.group !== 'all') {
        participants = participants.filter(p => p.group === filter.group);
      }

      const totalRecordingSeconds = state.recordings.reduce((acc: number, r: any) => acc + r.durationSeconds, 0);
      const completedTasks = state.activities.tasks.filter((t: any) => t.status === 'completed').length;

      const lines: string[] = [];
      lines.push('='.repeat(60));
      lines.push('              会议复盘报告');
      lines.push('='.repeat(60));
      lines.push('');
      lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
      lines.push(`参会人数: ${participants.length} 人`);
      lines.push(`在线人数: ${participants.filter(p => p.online).length} 人`);
      lines.push(`录制片段: ${state.recordings.length} 个`);
      lines.push(`总录制时长: ${formatDuration(totalRecordingSeconds)}`);
      lines.push(`举手次数: ${state.activities.handRaises.length} 次`);
      lines.push(`投票数: ${state.activities.votes.length} 个`);
      lines.push(`闯关任务: ${completedTasks}/${state.activities.tasks.length} 完成`);
      lines.push('');
      lines.push('-'.repeat(60));
      lines.push('');
      lines.push('一、参会人员详情');
      lines.push('');
      
      participants.forEach((p, index) => {
        const handRaiseCount = state.activities.handRaises.filter((h: any) => h.name === p.name).length;
        const onlineMinutes = Math.floor(Math.random() * 120) + 10;
        lines.push(`${index + 1}. ${p.name}`);
        lines.push(`   分组: ${p.group} | 角色: ${p.role === 'host' ? '主持人' : p.role === 'cohost' ? '联席主持' : '参会者'} | 座位: ${p.seat}号`);
        lines.push(`   状态: ${p.online ? '在线' : '离线'} | 加入时间: ${p.joinTime} | 在线时长: ${onlineMinutes}分钟`);
        lines.push(`   举手: ${handRaiseCount}次 | 麦克风: ${p.muted ? '静音' : '开启'} | 连接: ${p.connectionStatus === 'good' ? '良好' : p.connectionStatus === 'warning' ? '一般' : '较差'}`);
        lines.push('');
      });

      lines.push('-'.repeat(60));
      lines.push('');
      lines.push('二、录制片段');
      lines.push('');
      
      state.recordings.forEach((r: any, index: number) => {
        lines.push(`${index + 1}. ${r.name}`);
        lines.push(`   时长: ${r.duration} | 日期: ${r.date} | 大小: ${r.size}`);
        lines.push('');
      });

      lines.push('-'.repeat(60));
      lines.push('');
      lines.push('三、投票记录');
      lines.push('');
      
      if (state.activities.votes.length === 0) {
        lines.push('   暂无投票记录');
      } else {
        state.activities.votes.forEach((v: any, index: number) => {
          lines.push(`${index + 1}. ${v.question}`);
          v.options.forEach((opt: string, i: number) => {
            lines.push(`   ${opt}: ${v.results[i]}票`);
          });
          lines.push('');
        });
      }

      lines.push('-'.repeat(60));
      lines.push('');
      lines.push('四、闯关任务');
      lines.push('');
      
      state.activities.tasks.forEach((t: any, index: number) => {
        const statusText = t.status === 'completed' ? '已完成' : t.status === 'active' ? '进行中' : '未解锁';
        lines.push(`${index + 1}. ${t.name}`);
        lines.push(`   状态: ${statusText} | 奖励: ${t.reward}`);
        lines.push('');
      });

      lines.push('='.repeat(60));
      lines.push('                  报告结束');
      lines.push('='.repeat(60));

      const content = lines.join('\n');
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    } catch (err) {
      console.error('导出复盘文本失败:', err);
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
    ipcMain.handle('update-room', (_event, id, updates) => updateRoom(id, updates));
    ipcMain.handle('set-discussion-mode', (_event, roomId, group, enabled) => setDiscussionMode(roomId, group, enabled));
    ipcMain.handle('set-group-task', (_event, roomId, group, task) => setGroupTask(roomId, group, task));
    ipcMain.handle('set-cohost', (_event, participantId, isCohost) => setCohost(participantId, isCohost));
    
    ipcMain.handle('get-recordings', () => getRecordings());
    ipcMain.handle('add-recording', (_event, data) => addRecording(data));
    ipcMain.handle('delete-recording', (_event, id) => deleteRecording(id));
    
    ipcMain.handle('export-attendance-csv', (_event, filePath, filter) => exportAttendanceCSV(filePath, filter));
    ipcMain.handle('export-whiteboard-png', (_event, filePath, dataUrl) => exportWhiteboardPNG(filePath, dataUrl));
    ipcMain.handle('generate-recording-file', (_event, filePath, recordingId) => generateRecordingFile(filePath, recordingId));
    ipcMain.handle('export-review-csv', (_event, filePath, filter) => exportReviewCSV(filePath, filter));
    ipcMain.handle('export-review-text', (_event, filePath, filter) => exportReviewText(filePath, filter));
    
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

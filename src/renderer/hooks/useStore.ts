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

export function useStore<T>(selector: (state: AppState) => T): T {
  const [state, setState] = useState<T>(() => {
    const initialState = (window as any).__INITIAL_STATE__;
    return selector(initialState || {} as AppState);
  });

  useEffect(() => {
    const handleStateUpdate = (_event: any, newState: AppState) => {
      setState(selector(newState));
    };

    ipcRenderer.on('state-updated', handleStateUpdate);

    ipcRenderer.invoke('get-state').then((initialState: AppState) => {
      (window as any).__INITIAL_STATE__ = initialState;
      setState(selector(initialState));
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
  addRoom: (data: { name: string; theme?: string; capacity?: number; permission?: string }) => 
    ipcRenderer.invoke('add-room', data),
  setCurrentRoom: (id: string) => 
    ipcRenderer.invoke('set-current-room', id),
  addRecording: (data: { name: string; durationSeconds: number }) => 
    ipcRenderer.invoke('add-recording', data),
  deleteRecording: (id: string) => 
    ipcRenderer.invoke('delete-recording', id),
  exportAttendanceCSV: (filePath: string, filter?: { search?: string; group?: string }) => 
    ipcRenderer.invoke('export-attendance-csv', filePath, filter),
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

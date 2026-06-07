import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRecordings, useParticipants, storeActions, getAvatarColor } from '../hooks/useStore';

const RecordingApp: React.FC = () => {
  const recordings = useRecordings();
  const participants = useParticipants();
  const [activeTab, setActiveTab] = useState('recordings');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMusicIndex, setCurrentMusicIndex] = useState(-1);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const intervalRef = useRef<number | null>(null);
  const noteIndexRef = useRef(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const bgMusicList = [
    { 
      id: 'm1', 
      name: '轻松氛围', 
      icon: '🎵', 
      duration: '3:24',
      notes: [261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66],
      tempo: 400,
      type: 'sine' as OscillatorType,
    },
    { 
      id: 'm2', 
      name: '专注思考', 
      icon: '🎶', 
      duration: '4:12',
      notes: [220.00, 246.94, 261.63, 293.66, 329.63, 293.66, 261.63, 246.94],
      tempo: 600,
      type: 'triangle' as OscillatorType,
    },
    { 
      id: 'm3', 
      name: '激情昂扬', 
      icon: '🎸', 
      duration: '2:58',
      notes: [392.00, 440.00, 493.88, 523.25, 587.33, 523.25, 493.88, 440.00],
      tempo: 200,
      type: 'square' as OscillatorType,
    },
    { 
      id: 'm4', 
      name: '舒缓放松', 
      icon: '🎹', 
      duration: '5:30',
      notes: [196.00, 220.00, 246.94, 261.63, 293.66, 261.63, 246.94, 220.00],
      tempo: 800,
      type: 'sine' as OscillatorType,
    },
  ];

  const stopMusic = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    oscillatorsRef.current = [];
    
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch (e) {}
      gainNodeRef.current = null;
    }
    
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    
    noteIndexRef.current = 0;
    setIsPlaying(false);
  }, []);

  const playMusic = useCallback((musicIndex: number) => {
    stopMusic();
    
    const music = bgMusicList[musicIndex];
    if (!music) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn('Web Audio API not supported');
      setIsPlaying(true);
      return;
    }

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = (volume / 100) * 0.3;
    gainNode.connect(audioCtx.destination);
    gainNodeRef.current = gainNode;

    noteIndexRef.current = 0;

    const playNextNote = () => {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
      if (!gainNodeRef.current) return;

      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      oscillatorsRef.current = [];

      const freq = music.notes[noteIndexRef.current % music.notes.length];
      
      const osc = audioCtxRef.current.createOscillator();
      osc.type = music.type;
      osc.frequency.value = freq;
      osc.connect(gainNodeRef.current);
      osc.start();
      oscillatorsRef.current.push(osc);

      noteIndexRef.current++;
    };

    playNextNote();
    intervalRef.current = window.setInterval(playNextNote, music.tempo);
    
    setIsPlaying(true);
  }, [volume, stopMusic]);

  const toggleMusic = (index: number) => {
    if (currentMusicIndex === index && isPlaying) {
      stopMusic();
    } else {
      setCurrentMusicIndex(index);
      playMusic(index);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = (newVolume / 100) * 0.3;
    }
  };

  const playPrev = () => {
    if (bgMusicList.length === 0) return;
    const prevIndex = currentMusicIndex <= 0 ? bgMusicList.length - 1 : currentMusicIndex - 1;
    setCurrentMusicIndex(prevIndex);
    playMusic(prevIndex);
  };

  const playNext = () => {
    if (bgMusicList.length === 0) return;
    const nextIndex = (currentMusicIndex + 1) % bgMusicList.length;
    setCurrentMusicIndex(nextIndex);
    playMusic(nextIndex);
  };

  const togglePlayPause = () => {
    if (currentMusicIndex < 0) {
      toggleMusic(0);
    } else if (isPlaying) {
      stopMusic();
    } else {
      playMusic(currentMusicIndex);
    }
  };

  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, [stopMusic]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      storeActions.addRecording({
        name: `录制片段 ${recordings.length + 1}`,
        durationSeconds: recordingTime,
      });
      setRecordingTime(0);
    } else {
      setIsRecording(true);
    }
  };

  const exportRecording = async (rec: { id: string; name: string; durationSeconds: number }) => {
    const result = await storeActions.showSaveDialog({
      defaultPath: `${rec.name}.mp4`,
      filters: [
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      await storeActions.generateRecordingFile(result.filePath, rec.id);
    }
  };

  const exportAttendance = async () => {
    const result = await storeActions.showSaveDialog({
      defaultPath: '参会记录.csv',
      filters: [{ name: 'CSV File', extensions: ['csv'] }],
    });

    if (!result.canceled && result.filePath) {
      await storeActions.exportAttendanceCSV(result.filePath);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'host': return '主持人';
      case 'cohost': return '副主持';
      default: return '参会者';
    }
  };

  const openWindow = (name: string) => {
    storeActions.openWindow(name);
  };

  return (
    <div className="recording-container">
      <header className="header">
        <h1>🎬 录制中心</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => openWindow('lobby')}>
            🏛️ 大厅
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('room')}>
            🏠 房间
          </button>
        </div>
      </header>

      <div className="recording-main">
        <div className="recording-left">
          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'recordings' ? 'active' : ''}`}
              onClick={() => setActiveTab('recordings')}
            >
              📹 录制片段
            </button>
            <button
              className={`tab-btn ${activeTab === 'music' ? 'active' : ''}`}
              onClick={() => setActiveTab('music')}
            >
              🎵 背景音乐
            </button>
            <button
              className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
            >
              👥 参会记录
            </button>
          </div>

          {activeTab === 'recordings' && (
            <div className="tab-content">
              <div className="record-panel">
                <div className={`record-status ${isRecording ? 'recording' : ''}`}>
                  <div className="record-dot"></div>
                  <div className="record-time">{formatTime(recordingTime)}</div>
                  <div className="record-label">
                    {isRecording ? '录制中...' : '准备录制'}
                  </div>
                </div>

                <button 
                  className={`record-btn ${isRecording ? 'stop' : 'start'}`}
                  onClick={toggleRecording}
                >
                  {isRecording ? '⏹ 停止录制' : '⏺ 开始录制'}
                </button>
              </div>

              <h3>录制历史</h3>
              <div className="recording-list">
                {recordings.map(rec => (
                  <div key={rec.id} className="recording-item">
                    <div className="thumb">🎬</div>
                    <div className="info">
                      <div className="name">{rec.name}</div>
                      <div className="meta">
                        {rec.duration} · {rec.date} · {rec.size}
                      </div>
                    </div>
                    <div className="actions">
                      <button className="action-icon-btn" title="播放">▶️</button>
                      <button 
                        className="action-icon-btn" 
                        title="导出"
                        onClick={() => exportRecording(rec)}
                      >
                        📥
                      </button>
                      <button className="action-icon-btn" title="删除">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'music' && (
            <div className="tab-content">
              <div className="music-player">
                <div className="now-playing">
                  <div className="album-art">🎵</div>
                  <div className="song-info">
                    <div className="song-name">
                      {currentMusicIndex >= 0 ? bgMusicList[currentMusicIndex].name : '未播放'}
                    </div>
                    <div className="song-status">
                      {isPlaying ? '正在播放...' : '选择一首歌开始播放'}
                    </div>
                  </div>
                </div>

                <div className="player-controls">
                  <button className="player-btn" onClick={playPrev}>⏮️</button>
                  <button 
                    className="player-btn play-btn"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? '⏸️' : '▶️'}
                  </button>
                  <button className="player-btn" onClick={playNext}>⏭️</button>
                </div>

                <div className="volume-control">
                  <span>{volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊'}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                  />
                  <span className="volume-value">{volume}%</span>
                </div>
              </div>

              <h3>背景音乐列表</h3>
              <div className="music-list">
                {bgMusicList.map((music, index) => (
                  <div 
                    key={music.id} 
                    className={`music-item ${currentMusicIndex === index && isPlaying ? 'playing' : ''}`}
                    onClick={() => toggleMusic(index)}
                  >
                    <div className="music-icon">{music.icon}</div>
                    <div className="music-info">
                      <div className="name">{music.name}</div>
                      <div className="duration">时长: {music.duration}</div>
                    </div>
                    <button className="action-icon-btn">
                      {currentMusicIndex === index && isPlaying ? '⏸️' : '▶️'}
                    </button>
                  </div>
                ))}
              </div>

              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }}>
                ➕ 上传音乐
              </button>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="tab-content">
              <div className="attendance-header">
                <h3>参会记录</h3>
                <button className="btn btn-primary" onClick={exportAttendance}>
                  📥 导出CSV
                </button>
              </div>

              <div className="attendance-stats">
                <div className="stat-card">
                  <div className="stat-value">{participants.length}</div>
                  <div className="stat-label">总参会人数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {participants.filter(p => p.online).length}
                  </div>
                  <div className="stat-label">在线人数</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {participants.filter(p => !p.online).length}
                  </div>
                  <div className="stat-label">离线人数</div>
                </div>
              </div>

              <div className="attendance-list">
                {participants.map(p => (
                  <div key={p.id} className="attendance-item">
                    <div className="avatar" style={{ backgroundColor: getAvatarColor(p.name) }}>
                      {p.name[0]}
                    </div>
                    <div className="info">
                      <div className="name">{p.name}</div>
                      <div className="details">
                        {getRoleLabel(p.role)} · {p.group}
                      </div>
                    </div>
                    <div className={`status-badge ${p.online ? 'online' : 'offline'}`}>
                      {p.online ? '在线' : '离线'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="recording-right">
          <h3>📊 录制统计</h3>
          
          <div className="stat-item">
            <span>总录制时长</span>
            <span className="highlight">
              {recordings.reduce((acc, r) => acc + r.durationSeconds, 0) > 0 
                ? formatDuration(recordings.reduce((acc, r) => acc + r.durationSeconds, 0))
                : '0分0秒'
              }
            </span>
          </div>
          
          <div className="stat-item">
            <span>录制片段数</span>
            <span className="highlight">{recordings.length} 个</span>
          </div>
          
          <div className="stat-item">
            <span>存储空间</span>
            <span className="highlight">128 MB / 1 GB</span>
          </div>

          <div className="storage-bar">
            <div className="storage-used" style={{ width: '12.8%' }}></div>
          </div>

          <h3 style={{ marginTop: '24px' }}>⚙️ 录制设置</h3>
          
          <div className="setting-item">
            <label>录制质量</label>
            <select className="input-field" style={{ width: 'auto' }}>
              <option>高清 1080p</option>
              <option>标清 720p</option>
              <option>流畅 480p</option>
            </select>
          </div>

          <div className="setting-item">
            <label>录制格式</label>
            <select className="input-field" style={{ width: 'auto' }}>
              <option>MP4</option>
              <option>MKV</option>
              <option>WEBM</option>
            </select>
          </div>

          <div className="setting-item">
            <label>包含音频</label>
            <input type="checkbox" defaultChecked />
          </div>

          <div className="setting-item">
            <label>录制摄像头</label>
            <input type="checkbox" defaultChecked />
          </div>

          <div className="setting-item">
            <label>录制屏幕</label>
            <input type="checkbox" defaultChecked />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingApp;

import React, { useState, useRef, useEffect } from 'react';
import { useRecordings, useParticipants, storeActions, getAvatarColor } from '../hooks/useStore';

const RecordingApp: React.FC = () => {
  const recordings = useRecordings();
  const participants = useParticipants();
  const [activeTab, setActiveTab] = useState('recordings');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMusic, setCurrentMusic] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

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

  const toggleMusic = (musicName: string) => {
    if (currentMusic === musicName && isPlaying) {
      setIsPlaying(false);
    } else {
      setCurrentMusic(musicName);
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
  };

  const bgMusicList = [
    { id: 'm1', name: '轻松氛围', icon: '🎵', duration: '3:24' },
    { id: 'm2', name: '专注思考', icon: '🎶', duration: '4:12' },
    { id: 'm3', name: '激情昂扬', icon: '🎸', duration: '2:58' },
    { id: 'm4', name: '舒缓放松', icon: '🎹', duration: '5:30' },
  ];

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
                      {currentMusic || '未播放'}
                    </div>
                    <div className="song-status">
                      {isPlaying ? '正在播放...' : '选择一首歌开始播放'}
                    </div>
                  </div>
                </div>

                <div className="player-controls">
                  <button className="player-btn">⏮️</button>
                  <button 
                    className="player-btn play-btn"
                    onClick={() => currentMusic && setIsPlaying(!isPlaying)}
                    disabled={!currentMusic}
                  >
                    {isPlaying ? '⏸️' : '▶️'}
                  </button>
                  <button className="player-btn">⏭️</button>
                </div>

                <div className="volume-control">
                  <span>🔊</span>
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
                {bgMusicList.map(music => (
                  <div 
                    key={music.id} 
                    className={`music-item ${currentMusic === music.name && isPlaying ? 'playing' : ''}`}
                    onClick={() => toggleMusic(music.name)}
                  >
                    <div className="music-icon">{music.icon}</div>
                    <div className="music-info">
                      <div className="name">{music.name}</div>
                      <div className="duration">时长: {music.duration}</div>
                    </div>
                    <button className="action-icon-btn">
                      {currentMusic === music.name && isPlaying ? '⏸️' : '▶️'}
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

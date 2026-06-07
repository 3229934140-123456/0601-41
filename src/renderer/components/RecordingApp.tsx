import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRecordings, useParticipants, useActivities, useGroups, storeActions, getAvatarColor } from '../hooks/useStore';

const RecordingApp: React.FC = () => {
  const recordings = useRecordings();
  const participants = useParticipants();
  const activities = useActivities();
  const groups = useGroups();
  const [activeTab, setActiveTab] = useState('recordings');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMusicIndex, setCurrentMusicIndex] = useState(-1);
  const [reviewFilter, setReviewFilter] = useState({
    search: '',
    group: 'all',
  });
  
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
      case 'cohost': return '联席主持';
      default: return '参会者';
    }
  };

  const openWindow = (name: string) => {
    storeActions.openWindow(name);
  };

  const filteredReviewParticipants = useMemo(() => {
    let result = participants;
    if (reviewFilter.search) {
      const search = reviewFilter.search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(search));
    }
    if (reviewFilter.group && reviewFilter.group !== 'all') {
      result = result.filter(p => p.group === reviewFilter.group);
    }
    return result;
  }, [participants, reviewFilter]);

  const totalRecordingSeconds = useMemo(() => 
    recordings.reduce((acc, r) => acc + r.durationSeconds, 0), 
    [recordings]
  );

  const completedTasks = useMemo(() => 
    activities.tasks.filter(t => t.status === 'completed').length, 
    [activities.tasks]
  );

  const exportReviewCSV = async () => {
    const result = await storeActions.showSaveDialog({
      defaultPath: '会议复盘记录.csv',
      filters: [{ name: 'CSV File', extensions: ['csv'] }],
    });

    if (!result.canceled && result.filePath) {
      await storeActions.exportReviewCSV(result.filePath, {
        search: reviewFilter.search,
        group: reviewFilter.group,
      });
    }
  };

  const exportReviewText = async () => {
    const result = await storeActions.showSaveDialog({
      defaultPath: '会议复盘记录.txt',
      filters: [{ name: 'Text File', extensions: ['txt'] }],
    });

    if (!result.canceled && result.filePath) {
      await storeActions.exportReviewText(result.filePath, {
        search: reviewFilter.search,
        group: reviewFilter.group,
      });
    }
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
            <button
              className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              📊 复盘记录
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

          {activeTab === 'review' && (
            <div className="tab-content">
              <div className="attendance-header">
                <h3>会议复盘</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={exportReviewText}>
                    📄 导出文本
                  </button>
                  <button className="btn btn-primary" onClick={exportReviewCSV}>
                    📥 导出CSV
                  </button>
                </div>
              </div>

              <div className="review-filters">
                <input
                  type="text"
                  placeholder="🔍 搜索参会者姓名..."
                  value={reviewFilter.search}
                  onChange={(e) => setReviewFilter({...reviewFilter, search: e.target.value})}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '13px',
                  }}
                />
                <select
                  value={reviewFilter.group}
                  onChange={(e) => setReviewFilter({...reviewFilter, group: e.target.value})}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '13px',
                  }}
                >
                  <option value="all">全部分组</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="review-summary">
                <div className="summary-item">
                  <div className="summary-icon">👥</div>
                  <div>
                    <div className="summary-value">{filteredReviewParticipants.length}</div>
                    <div className="summary-label">参会人数</div>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">⏱️</div>
                  <div>
                    <div className="summary-value">{formatDuration(totalRecordingSeconds)}</div>
                    <div className="summary-label">总录制时长</div>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">✋</div>
                  <div>
                    <div className="summary-value">{activities.handRaises.length}</div>
                    <div className="summary-label">举手次数</div>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">📊</div>
                  <div>
                    <div className="summary-value">{activities.votes.length}</div>
                    <div className="summary-label">投票数</div>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">🏆</div>
                  <div>
                    <div className="summary-value">{completedTasks}/{activities.tasks.length}</div>
                    <div className="summary-label">闯关任务</div>
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-icon">🎬</div>
                  <div>
                    <div className="summary-value">{recordings.length}</div>
                    <div className="summary-label">录制片段</div>
                  </div>
                </div>
              </div>

              <h3 style={{ marginTop: '20px' }}>参会者详情</h3>
              <div className="review-list">
                {filteredReviewParticipants.map((p, index) => {
                  const handRaiseCount = activities.handRaises.filter(h => h.name === p.name).length;
                  return (
                    <div key={p.id} className="review-item">
                      <div className="review-index">{index + 1}</div>
                      <div className="avatar" style={{ backgroundColor: getAvatarColor(p.name) }}>
                        {p.avatar}
                      </div>
                      <div className="info">
                        <div className="name">
                          {p.name}
                          {p.role === 'cohost' && (
                            <span style={{ 
                              fontSize: '10px', 
                              background: 'rgba(255, 185, 87, 0.2)', 
                              color: '#ffb957', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              marginLeft: '6px',
                            }}>
                              联席主持
                            </span>
                          )}
                        </div>
                        <div className="details">
                          {p.group} · 座位{p.seat} · 加入 {p.joinTime}
                        </div>
                      </div>
                      <div className="review-stats">
                        <div className="review-stat">
                          <span className="stat-num">{handRaiseCount}</span>
                          <span className="stat-label">举手</span>
                        </div>
                        <div className="review-stat">
                          <span className="stat-num">{activities.votes.length > 0 ? '✓' : '-'}</span>
                          <span className="stat-label">投票</span>
                        </div>
                        <div className="review-stat">
                          <span className="stat-num">{p.online ? '在线' : '离线'}</span>
                          <span className="stat-label">状态</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredReviewParticipants.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    暂无匹配的参会者
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: '20px' }}>投票记录</h3>
              <div className="vote-list">
                {activities.votes.map((vote, vIndex) => (
                  <div key={vote.id} className="vote-item" style={{ 
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '10px',
                    padding: '14px',
                    marginBottom: '10px',
                  }}>
                    <div style={{ fontWeight: '500', marginBottom: '10px' }}>
                      {vIndex + 1}. {vote.question}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {vote.options.map((opt, oIndex) => {
                        const total = vote.results.reduce((a, b) => a + b, 0);
                        const percent = total > 0 ? Math.round((vote.results[oIndex] / total) * 100) : 0;
                        return (
                          <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ flex: 1, fontSize: '12px', color: '#aaa' }}>{opt}</span>
                            <div style={{ 
                              flex: 2, 
                              height: '8px', 
                              background: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}>
                              <div style={{ 
                                width: `${percent}%`, 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                                borderRadius: '4px',
                              }}></div>
                            </div>
                            <span style={{ fontSize: '12px', color: '#888', minWidth: '50px', textAlign: 'right' }}>
                              {vote.results[oIndex]}票 ({percent}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {activities.votes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '13px' }}>
                    暂无投票记录
                  </div>
                )}
              </div>

              <h3 style={{ marginTop: '20px' }}>闯关任务</h3>
              <div className="task-list">
                {activities.tasks.map((task, tIndex) => (
                  <div key={task.id} className="task-item" style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '10px',
                    marginBottom: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: task.status === 'completed' 
                          ? 'rgba(56, 239, 125, 0.2)' 
                          : task.status === 'active' 
                            ? 'rgba(102, 126, 234, 0.2)' 
                            : 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        color: task.status === 'completed' ? '#38ef7d' : task.status === 'active' ? '#667eea' : '#666',
                      }}>
                        {task.status === 'completed' ? '✓' : tIndex + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px' }}>{task.name}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{task.reward}</div>
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: task.status === 'completed' 
                        ? 'rgba(56, 239, 125, 0.15)' 
                        : task.status === 'active' 
                          ? 'rgba(102, 126, 234, 0.15)' 
                          : 'rgba(255, 255, 255, 0.05)',
                      color: task.status === 'completed' 
                        ? '#38ef7d' 
                        : task.status === 'active' 
                          ? '#667eea' 
                          : '#666',
                    }}>
                      {task.status === 'completed' ? '已完成' : task.status === 'active' ? '进行中' : '未解锁'}
                    </span>
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

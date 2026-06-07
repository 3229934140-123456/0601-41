import React, { useState, useEffect, useRef } from 'react';

interface Recording {
  id: string;
  name: string;
  duration: string;
  date: string;
  size: string;
}

interface BGM {
  id: string;
  name: string;
  duration: string;
  icon: string;
}

const RecordingApp: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([
    { id: 'r1', name: '产品介绍片段1', duration: '05:32', date: '2026-06-05 14:30', size: '45.2 MB' },
    { id: 'r2', name: '互动问答环节', duration: '12:18', date: '2026-06-05 15:10', size: '98.7 MB' },
    { id: 'r3', name: '总结发言', duration: '03:45', date: '2026-06-05 16:00', size: '28.1 MB' },
  ]);
  const [bgmList] = useState<BGM[]>([
    { id: 'b1', name: '轻松钢琴曲', duration: '03:24', icon: '🎹' },
    { id: 'b2', name: '轻快电子乐', duration: '04:12', icon: '🎵' },
    { id: 'b3', name: '自然白噪音', duration: '05:00', icon: '🌿' },
    { id: 'b4', name: '古典交响乐', duration: '06:30', icon: '🎻' },
  ]);
  const [playingBgm, setPlayingBgm] = useState<string | null>(null);
  const [volume, setVolume] = useState(50);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingTime > 0) {
      const newRecording: Recording = {
        id: `r${Date.now()}`,
        name: `录制片段 ${recordings.length + 1}`,
        duration: formatTime(recordingTime),
        date: new Date().toLocaleString('zh-CN'),
        size: `${(recordingTime * 0.15).toFixed(1)} MB`,
      };
      setRecordings([newRecording, ...recordings]);
    }
  };

  const pauseRecording = () => {
    setIsRecording(false);
  };

  const toggleBgm = (id: string) => {
    if (playingBgm === id) {
      setPlayingBgm(null);
    } else {
      setPlayingBgm(id);
    }
  };

  const deleteRecording = (id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  const exportRecording = async (id: string) => {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: 'recording.mp4',
      filters: [
        { name: 'MP4 Video', extensions: ['mp4'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (!result.canceled) {
      console.log('导出到:', result.filePath);
    }
  };

  const exportAttendance = async () => {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: '参会记录.csv',
      filters: [
        { name: 'CSV File', extensions: ['csv'] },
        { name: 'Excel File', extensions: ['xlsx'] },
      ],
    });
    if (!result.canceled) {
      console.log('导出到:', result.filePath);
    }
  };

  return (
    <div className="recording-container">
      <header className="header">
        <h1>⏺️ 录制中心</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => window.electronAPI.openWindow('room')}>
            🏠 房间
          </button>
        </div>
      </header>

      <div className="recording-main">
        <div className="recording-content">
          <div className="status-section">
            <div className={`recording-indicator ${isRecording ? '' : 'stopped'}`}>
              <div className="recording-dot"></div>
              <span>{isRecording ? '录制中...' : '未录制'}</span>
            </div>
            
            <div className="recording-time">{formatTime(recordingTime)}</div>
            <div className="recording-time-label">当前录制时长</div>
            
            <div className="record-controls">
              {!isRecording ? (
                <button className="record-btn start" onClick={startRecording}>
                  ⏺️
                </button>
              ) : (
                <>
                  <button className="record-btn secondary" onClick={pauseRecording}>
                    ⏸️
                  </button>
                  <button className="record-btn start" onClick={stopRecording}>
                    ⏹️
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="recordings-list-section">
            <h3 style={{ marginBottom: '16px' }}>📁 已录制片段 ({recordings.length})</h3>
            
            {recordings.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🎬</div>
                <p>暂无录制片段</p>
              </div>
            ) : (
              recordings.map(rec => (
                <div key={rec.id} className="recording-item">
                  <div className="name">🎬 {rec.name}</div>
                  <div className="meta">
                    <span>⏱️ {rec.duration}</span>
                    <span>📅 {rec.date}</span>
                    <span>💾 {rec.size}</span>
                  </div>
                  <div className="actions">
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      ▶️ 播放
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => exportRecording(rec.id)}
                    >
                      📤 导出
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => deleteRecording(rec.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="recording-sidebar">
          <div className="bgm-section">
            <h3>🎵 背景音乐</h3>
            
            {bgmList.map(bgm => (
              <div
                key={bgm.id}
                className={`bgm-item ${playingBgm === bgm.id ? 'playing' : ''}`}
                onClick={() => toggleBgm(bgm.id)}
              >
                <div className="icon">{bgm.icon}</div>
                <div className="info">
                  <div className="name">{bgm.name}</div>
                  <div className="duration">{bgm.duration}</div>
                </div>
                <div className="play-icon">
                  {playingBgm === bgm.id ? '⏸️' : '▶️'}
                </div>
              </div>
            ))}

            <div className="volume-control">
              <span className="volume-icon">{volume > 0 ? '🔊' : '🔇'}</span>
              <div 
                className="volume-slider"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width * 100;
                  setVolume(Math.max(0, Math.min(100, Math.round(pct))));
                }}
              >
                <div className="volume-fill" style={{ width: `${volume}%` }}></div>
              </div>
              <span style={{ fontSize: '12px', color: '#888', minWidth: '30px' }}>{volume}%</span>
            </div>
          </div>

          <div className="export-section">
            <h3>📤 导出选项</h3>
            
            <div className="export-options">
              <div className="export-option" onClick={exportAttendance}>
                <div className="icon">📊</div>
                <div className="info">
                  <div className="title">参会记录</div>
                  <div className="desc">导出Excel/CSV格式</div>
                </div>
              </div>
              
              <div className="export-option">
                <div className="icon">🎬</div>
                <div className="info">
                  <div className="title">全部录像</div>
                  <div className="desc">批量导出MP4格式</div>
                </div>
              </div>
              
              <div className="export-option">
                <div className="icon">📝</div>
                <div className="info">
                  <div className="title">白板内容</div>
                  <div className="desc">导出PNG/PDF格式</div>
                </div>
              </div>

              <div className="export-option">
                <div className="icon">📈</div>
                <div className="info">
                  <div className="title">数据报表</div>
                  <div className="desc">互动统计汇总报告</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '15px' }}>⚙️ 录制设置</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span>录制音频</span>
                <div className="toggle-switch active"></div>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span>录制摄像头</span>
                <div className="toggle-switch active"></div>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span>录制屏幕</span>
                <div className="toggle-switch active"></div>
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span>高清画质</span>
                <div className="toggle-switch"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingApp;

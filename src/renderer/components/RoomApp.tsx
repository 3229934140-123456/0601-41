import React, { useState, useEffect } from 'react';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  seat: number;
  muted: boolean;
  online: boolean;
  group: string;
}

interface RoomInfo {
  id: string;
  name: string;
  theme: string;
  capacity: number;
  online: number;
  status: string;
  host: string;
}

const RoomApp: React.FC = () => {
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeTab, setActiveTab] = useState('participants');
  const [hostView, setHostView] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [draggedSeat, setDraggedSeat] = useState<number | null>(null);

  const groups = ['一组', '二组', '三组', '四组'];

  useEffect(() => {
    loadRoomData();
  }, []);

  const loadRoomData = async () => {
    const roomData = await window.electronAPI.getData('currentRoom');
    const participantsData = await window.electronAPI.getData('participants');
    if (roomData) setRoom(roomData);
    if (participantsData) setParticipants(participantsData);
  };

  const openWindow = (name: string) => {
    window.electronAPI.openWindow(name);
  };

  const toggleMute = (participantId: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === participantId ? { ...p, muted: !p.muted } : p
    ));
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const inviteParticipant = () => {
    if (!inviteEmail.trim()) return;
    const newParticipant: Participant = {
      id: `p${Date.now()}`,
      name: inviteEmail.split('@')[0],
      avatar: '🧑',
      seat: participants.length + 1,
      muted: true,
      online: false,
      group: '一组',
    };
    setParticipants(prev => [...prev, newParticipant]);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const changeParticipantGroup = (id: string, group: string) => {
    setParticipants(prev => prev.map(p => 
      p.id === id ? { ...p, group } : p
    ));
  };

  const getFilteredParticipants = () => {
    if (selectedGroup === 'all') return participants;
    return participants.filter(p => p.group === selectedGroup);
  };

  const getSeatsByRow = () => {
    const rows: Participant[][] = [[], [], []];
    const onlineParticipants = participants.filter(p => p.online);
    onlineParticipants.forEach((p, i) => {
      const rowIndex = Math.floor(i / 4);
      if (rowIndex < 3) {
        rows[rowIndex].push(p);
      }
    });
    return rows;
  };

  const onlineCount = participants.filter(p => p.online).length;

  return (
    <div className="room-container">
      <header className="header">
        <div>
          <h1>🏠 {room?.name || '虚拟会议室'}</h1>
          <span className="status-badge status-active" style={{ marginTop: '6px' }}>
            {room?.status} · {onlineCount} 人在线
          </span>
        </div>
        <div className="nav-buttons">
          <button 
            className={`btn ${hostView ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setHostView(!hostView)}
          >
            🎯 主持视角
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('whiteboard')}>
            📝 白板
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('activity')}>
            🎮 活动
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('recording')}>
            ⏺️ 录制
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('management')}>
            ⚙️ 管理
          </button>
        </div>
      </header>

      <div className="room-main">
        <div className="room-canvas">
          <div className="grid-floor"></div>
          
          <div className="stage-area">
            <div className="host-display">
              <div className="seat host online">
                <div className="seat-avatar">👨‍💼</div>
                <div className="seat-name">主持人</div>
              </div>
            </div>
          </div>

          {getSeatsByRow().map((row, rowIndex) => (
            <div key={rowIndex} className="seat-row" style={{ marginTop: rowIndex === 0 ? '20px' : '0' }}>
              {row.map((participant) => (
                <div
                  key={participant.id}
                  className={`seat ${participant.online ? 'online' : ''} ${participant.muted ? 'muted' : ''}`}
                  draggable
                  onDragStart={() => setDraggedSeat(participant.seat)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => setDraggedSeat(null)}
                >
                  {participant.group && rowIndex === 0 && (
                    <div className="group-label">{participant.group}</div>
                  )}
                  <div className="seat-avatar">{participant.avatar}</div>
                  <div className="seat-name">{participant.name}</div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - row.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="seat">
                  <div className="seat-avatar" style={{ opacity: 0.3 }}>👤</div>
                  <div className="seat-name" style={{ opacity: 0.3 }}>空座</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="room-sidebar">
          <div className="sidebar-tabs">
            <div 
              className={`sidebar-tab ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              参会者 ({onlineCount})
            </div>
            <div 
              className={`sidebar-tab ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              分组
            </div>
          </div>

          <div className="sidebar-content">
            {activeTab === 'participants' && (
              <>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={() => setShowInviteModal(true)}>
                    ➕ 邀请
                  </button>
                  <button className="quick-action-btn" onClick={() => setParticipants(prev => prev.map(p => ({...p, muted: true})))}>
                    🔇 全体静音
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div 
                    className={`filter-item ${selectedGroup === 'all' ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => setSelectedGroup('all')}
                  >
                    全部
                  </div>
                  {groups.map(g => (
                    <div
                      key={g}
                      className={`filter-item ${selectedGroup === g ? 'active' : ''}`}
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                      onClick={() => setSelectedGroup(g)}
                    >
                      {g}
                    </div>
                  ))}
                </div>

                {getFilteredParticipants().map(participant => (
                  <div key={participant.id} className={`participant-item ${participant.online ? 'online' : ''}`}>
                    <div className="avatar">{participant.avatar}</div>
                    <div className="info">
                      <div className="name">{participant.name}</div>
                      <div className="group">{participant.group} · {participant.online ? '在线' : '离线'}</div>
                    </div>
                    <div className="actions">
                      <button 
                        className={`action-icon-btn ${participant.muted ? 'muted' : ''}`}
                        onClick={() => toggleMute(participant.id)}
                        title={participant.muted ? '取消静音' : '静音'}
                      >
                        {participant.muted ? '🔇' : '🔊'}
                      </button>
                      <button 
                        className="action-icon-btn"
                        onClick={() => removeParticipant(participant.id)}
                        title="移除"
                      >
                        ✖️
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === 'groups' && (
              <>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginBottom: '16px' }}
                  onClick={() => setShowGroupModal(true)}
                >
                  ➕ 管理分组
                </button>
                {groups.map(group => {
                  const groupMembers = participants.filter(p => p.group === group);
                  return (
                    <div key={group} className="card" style={{ marginBottom: '12px', padding: '14px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}>
                        <strong>{group}</strong>
                        <span style={{ fontSize: '12px', color: '#888' }}>
                          {groupMembers.length} 人
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {groupMembers.map(m => (
                          <div 
                            key={m.id}
                            title={m.name}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px',
                            }}
                          >
                            {m.avatar}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="room-toolbar">
        <button 
          className={`tool-btn ${!isMicOn ? 'active' : ''}`}
          onClick={toggleMic}
        >
          <span className="icon">{isMicOn ? '🎤' : '🔇'}</span>
          <span className="label">{isMicOn ? '麦克风' : '已静音'}</span>
        </button>
        
        <button 
          className={`tool-btn ${!isCameraOn ? 'active' : ''}`}
          onClick={toggleCamera}
        >
          <span className="icon">{isCameraOn ? '📹' : '🚫'}</span>
          <span className="label">{isCameraOn ? '摄像头' : '已关闭'}</span>
        </button>
        
        <button 
          className={`tool-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={toggleScreenShare}
        >
          <span className="icon">🖥️</span>
          <span className="label">共享屏幕</span>
        </button>
        
        <button className="tool-btn" onClick={() => openWindow('whiteboard')}>
          <span className="icon">📝</span>
          <span className="label">白板</span>
        </button>
        
        <button className="tool-btn" onClick={() => openWindow('activity')}>
          <span className="icon">✋</span>
          <span className="label">举手</span>
        </button>
        
        <button className="tool-btn" onClick={() => openWindow('recording')}>
          <span className="icon">⏺️</span>
          <span className="label">录制</span>
        </button>
        
        <button className="tool-btn danger">
          <span className="icon">📞</span>
          <span className="label">离开</span>
        </button>
      </div>

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>邀请参会者</h2>
            <div className="form-group">
              <label>邮箱或用户名</label>
              <input 
                type="text"
                placeholder="输入邮箱或用户名"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>分配分组</label>
              <select>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>角色</label>
              <select>
                <option value="participant">参会者</option>
                <option value="cohost">联席主持人</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={inviteParticipant}>发送邀请</button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>分组管理</h2>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
              拖拽参会者到不同分组进行调整
            </p>
            {groups.map(group => {
              const groupMembers = participants.filter(p => p.group === group);
              return (
                <div key={group} style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}>
                    <span>{group}</span>
                    <span style={{ color: '#888', fontSize: '12px' }}>{groupMembers.length}人</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    flexWrap: 'wrap',
                    padding: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    minHeight: '50px',
                  }}>
                    {groupMembers.map(m => (
                      <div 
                        key={m.id}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(102, 126, 234, 0.2)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {m.avatar} {m.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>关闭</button>
              <button className="btn btn-primary" onClick={() => setShowGroupModal(false)}>应用</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomApp;

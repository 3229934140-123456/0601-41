import React, { useState, useMemo } from 'react';
import { useParticipants, useCurrentRoom, useGroups, storeActions, Participant } from '../hooks/useStore';

const RoomApp: React.FC = () => {
  const participants = useParticipants();
  const room = useCurrentRoom();
  const groups = useGroups();
  
  const [activeTab, setActiveTab] = useState('participants');
  const [hostView, setHostView] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteGroup, setInviteGroup] = useState('一组');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [draggedParticipant, setDraggedParticipant] = useState<string | null>(null);
  const [dragOverSeat, setDragOverSeat] = useState<number | null>(null);

  const onlineCount = useMemo(() => 
    participants.filter(p => p.online).length, 
    [participants]
  );

  const getFilteredParticipants = () => {
    if (selectedGroup === 'all') return participants;
    return participants.filter(p => p.group === selectedGroup);
  };

  const getSeatsByRow = () => {
    const sorted = [...participants]
      .filter(p => p.online)
      .sort((a, b) => a.seat - b.seat);
    
    const rows: Participant[][] = [[], [], []];
    sorted.forEach((p) => {
      const rowIndex = Math.floor((p.seat - 1) / 4);
      if (rowIndex >= 0 && rowIndex < 3) {
        rows[rowIndex].push(p);
      }
    });
    for (let r = 0; r < 3; r++) {
      rows[r].sort((a, b) => a.seat - b.seat);
    }
    return rows;
  };

  const getEmptySeatsInRow = (rowIndex: number) => {
    const row = getSeatsByRow()[rowIndex];
    const occupiedSeats = new Set(row.map(p => p.seat));
    const emptySeats: number[] = [];
    for (let i = 1; i <= 4; i++) {
      const seatNum = rowIndex * 4 + i;
      if (!occupiedSeats.has(seatNum)) {
        emptySeats.push(seatNum);
      }
    }
    return emptySeats;
  };

  const handleDragStart = (e: React.DragEvent, participantId: string) => {
    setDraggedParticipant(participantId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, seatNumber: number) => {
    e.preventDefault();
    setDragOverSeat(seatNumber);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverSeat(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSeat: number) => {
    e.preventDefault();
    setDragOverSeat(null);
    
    if (!draggedParticipant) return;
    
    const targetParticipant = participants.find(p => p.seat === targetSeat);
    
    if (targetParticipant) {
      await storeActions.swapSeats(draggedParticipant, targetParticipant.id);
    } else {
      await storeActions.moveToSeat(draggedParticipant, targetSeat);
    }
    
    setDraggedParticipant(null);
  };

  const handleDragEnd = () => {
    setDraggedParticipant(null);
    setDragOverSeat(null);
  };

  const toggleMute = async (id: string) => {
    await storeActions.toggleMute(id);
  };

  const handleMuteAll = async () => {
    await storeActions.muteAll();
  };

  const inviteParticipant = async () => {
    if (!inviteName.trim()) return;
    
    await storeActions.addParticipant({
      name: inviteName,
      group: inviteGroup,
      avatar: '🧑',
    });
    
    setInviteName('');
    setShowInviteModal(false);
  };

  const removeParticipant = async (id: string) => {
    await storeActions.removeParticipant(id);
  };

  const changeParticipantGroup = async (id: string, group: string) => {
    await storeActions.changeGroup(id, group);
  };

  const openWindow = (name: string) => {
    storeActions.openWindow(name);
  };

  const toggleMic = () => setIsMicOn(!isMicOn);
  const toggleCamera = () => setIsCameraOn(!isCameraOn);
  const toggleScreenShare = () => setIsScreenSharing(!isScreenSharing);

  const getGroupMembers = (group: string) => {
    return participants.filter(p => p.group === group);
  };

  const handleMoveToGroup = async (participantId: string, targetGroup: string) => {
    await storeActions.changeGroup(participantId, targetGroup);
  };

  return (
    <div className="room-container">
      <header className="header">
        <div>
          <h1>🏠 {room?.name || '虚拟会议室'}</h1>
          <span className="status-badge status-active" style={{ marginTop: '6px' }}>
            {room?.status || '进行中'} · {onlineCount} 人在线
          </span>
        </div>
        <div className="nav-buttons">
          <button 
            className={`btn ${hostView ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setHostView(!hostView)}
          >
            🎯 主持视角
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('character')}>
            👤 角色
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
                  className={`seat ${participant.online ? 'online' : ''} ${participant.muted ? 'muted' : ''} ${dragOverSeat === participant.seat ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, participant.id)}
                  onDragOver={(e) => handleDragOver(e, participant.seat)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, participant.seat)}
                  onDragEnd={handleDragEnd}
                  style={{
                    transform: draggedParticipant === participant.id ? 'scale(0.95)' : undefined,
                    opacity: draggedParticipant === participant.id ? 0.5 : 1,
                  }}
                >
                  {participant.group && (
                    <div className="group-label">{participant.group}</div>
                  )}
                  <div className="seat-avatar">{participant.avatar}</div>
                  <div className="seat-name">{participant.name}</div>
                  <div className="seat-number" style={{ 
                    position: 'absolute', 
                    bottom: '4px', 
                    right: '8px', 
                    fontSize: '10px', 
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                    #{participant.seat}
                  </div>
                </div>
              ))}
              {getEmptySeatsInRow(rowIndex).map((seatNum) => (
                <div 
                  key={`empty-${seatNum}`} 
                  className={`seat empty ${dragOverSeat === seatNum ? 'drag-over' : ''}`}
                  onDragOver={(e) => handleDragOver(e, seatNum)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, seatNum)}
                  style={{
                    border: dragOverSeat === seatNum ? '2px dashed #667eea' : '2px dashed rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                  }}
                >
                  <div className="seat-avatar" style={{ opacity: 0.3 }}>👤</div>
                  <div className="seat-name" style={{ opacity: 0.3 }}>空座 {seatNum}</div>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '4px', 
                    right: '8px', 
                    fontSize: '10px', 
                    color: 'rgba(255,255,255,0.3)',
                  }}>
                    #{seatNum}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: '30px', color: '#888', fontSize: '13px' }}>
            💡 拖拽参会者头像可以调整座位位置
          </div>
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
                  <button className="quick-action-btn" onClick={handleMuteAll}>
                    🔇 全体静音
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div 
                    className={`filter-item ${selectedGroup === 'all' ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => setSelectedGroup('all')}
                  >
                    全部 ({participants.length})
                  </div>
                  {groups.map(g => {
                    const count = getGroupMembers(g).length;
                    return (
                      <div
                        key={g}
                        className={`filter-item ${selectedGroup === g ? 'active' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => setSelectedGroup(g)}
                      >
                        {g} ({count})
                      </div>
                    );
                  })}
                </div>

                <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                  {getFilteredParticipants().map(participant => (
                    <div 
                      key={participant.id} 
                      className={`participant-item ${participant.online ? 'online' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, participant.id)}
                      onDragEnd={handleDragEnd}
                      style={{ cursor: 'move' }}
                    >
                      <div className="avatar">{participant.avatar}</div>
                      <div className="info">
                        <div className="name">{participant.name}</div>
                        <div className="group">{participant.group} · 座位{participant.seat} · {participant.online ? '在线' : '离线'}</div>
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
                </div>
              </>
            )}

            {activeTab === 'groups' && (
              <>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginBottom: '16px' }}
                  onClick={() => setShowGroupModal(true)}
                >
                  ⚙️ 管理分组
                </button>
                {groups.map(group => {
                  const groupMembers = getGroupMembers(group);
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
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: m.online ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                              border: m.online ? '1px solid #667eea' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                            }}
                          >
                            {m.avatar}
                          </div>
                        ))}
                        {groupMembers.length === 0 && (
                          <span style={{ fontSize: '12px', color: '#666' }}>暂无成员</span>
                        )}
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
              <label>姓名或邮箱</label>
              <input 
                type="text"
                placeholder="输入姓名或邮箱"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>分配分组</label>
              <select 
                value={inviteGroup}
                onChange={e => setInviteGroup(e.target.value)}
              >
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
              点击成员可移动到其他分组
            </p>
            {groups.map(group => {
              const groupMembers = getGroupMembers(group);
              const otherGroups = groups.filter(g => g !== group);
              
              return (
                <div key={group} style={{ marginBottom: '20px' }}>
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
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    minHeight: '50px',
                  }}>
                    {groupMembers.map(m => (
                      <div key={m.id} style={{ position: 'relative' }}>
                        <div 
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(102, 126, 234, 0.2)',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          onClick={() => {
                            if (otherGroups.length > 0) {
                              handleMoveToGroup(m.id, otherGroups[0]);
                            }
                          }}
                          title={`点击移动到 ${otherGroups[0] || '下一组'}`}
                        >
                          {m.avatar} {m.name}
                        </div>
                        <select
                          style={{
                            position: 'absolute',
                            bottom: '-24px',
                            left: '0',
                            fontSize: '10px',
                            background: 'rgba(0,0,0,0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            zIndex: 10,
                          }}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleMoveToGroup(m.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">移动到...</option>
                          {otherGroups.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {groupMembers.length === 0 && (
                      <span style={{ fontSize: '12px', color: '#666' }}>暂无成员</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowGroupModal(false)}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomApp;

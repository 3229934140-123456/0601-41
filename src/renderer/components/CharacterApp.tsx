import React, { useState, useEffect } from 'react';
import { useCurrentUser, storeActions } from '../hooks/useStore';

const CharacterApp: React.FC = () => {
  const currentUser = useCurrentUser();
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍💼');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [characterName, setCharacterName] = useState('组织者');
  const [accessories, setAccessories] = useState<Record<string, boolean>>({
    glasses: false,
    hat: false,
    tie: true,
    badge: false,
  });

  useEffect(() => {
    if (currentUser) {
      setCharacterName(currentUser.name);
      setSelectedAvatar(currentUser.avatar || '👨‍💼');
    }
  }, [currentUser]);

  const avatars = [
    '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍🔬', '👩‍🔬',
    '👨‍💻', '👩‍💻', '🧑‍🎨', '👨‍🏫', '👩‍🏫', '🧑‍💼',
    '👴', '👵', '👨', '👩', '🧑', '👦',
  ];

  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#30cfd0', '#667eea',
  ];

  const accessoryList = [
    { key: 'glasses', name: '眼镜', icon: '👓' },
    { key: 'hat', name: '帽子', icon: '🎩' },
    { key: 'tie', name: '领带', icon: '👔' },
    { key: 'badge', name: '徽章', icon: '🏅' },
  ];

  const toggleAccessory = (key: string) => {
    setAccessories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveCharacter = () => {
    storeActions.updateCurrentUser({
      name: characterName,
      avatar: selectedAvatar,
    });
  };

  return (
    <div className="character-container">
      <header className="header">
        <h1>👤 角色形象</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => storeActions.openWindow('lobby')}>
            🏠 大厅
          </button>
          <button className="btn btn-primary" onClick={saveCharacter}>
            💾 保存
          </button>
        </div>
      </header>

      <div className="character-main">
        <div className="character-preview">
          <div className="character-display" style={{ borderColor: selectedColor }}>
            <div className="avatar" style={{ fontSize: '140px' }}>
              {selectedAvatar}
            </div>
          </div>
          <div className="character-name" style={{ color: selectedColor }}>
            {characterName}
          </div>
          <div className="character-role">
            会议组织者 · 主持人权限
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            marginTop: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {accessoryList.filter(a => accessories[a.key]).map(a => (
              <div key={a.key} style={{
                padding: '6px 14px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                fontSize: '13px',
              }}>
                {a.icon} {a.name}
              </div>
            ))}
          </div>
        </div>

        <div className="character-sidebar">
          <h3>🎨 形象自定义</h3>

          <div className="category-section">
            <div className="category-title">名称</div>
            <input 
              className="name-input"
              type="text"
              value={characterName}
              onChange={e => setCharacterName(e.target.value)}
              placeholder="输入你的名称"
            />
          </div>

          <div className="category-section">
            <div className="category-title">角色头像</div>
            <div className="avatar-grid">
              {avatars.map(avatar => (
                <div
                  key={avatar}
                  className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatar(avatar)}
                >
                  {avatar}
                </div>
              ))}
            </div>
          </div>

          <div className="category-section">
            <div className="category-title">主题色</div>
            <div className="color-options">
              {colors.map(color => (
                <div
                  key={color}
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color, color: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="category-section">
            <div className="category-title">装饰配件</div>
            <div className="accessory-list">
              {accessoryList.map(item => (
                <div
                  key={item.key}
                  className={`accessory-item ${accessories[item.key] ? 'active' : ''}`}
                  onClick={() => toggleAccessory(item.key)}
                >
                  <div className="name">
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  <div className={`toggle-switch ${accessories[item.key] ? 'active' : ''}`}></div>
                </div>
              ))}
            </div>
          </div>

          <div className="save-section">
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={saveCharacter}
            >
              💾 保存形象
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '10px' }}
              onClick={() => {
                setSelectedAvatar('👨‍💼');
                setSelectedColor('#667eea');
                setCharacterName('组织者');
                setAccessories({ glasses: false, hat: false, tie: true, badge: false });
              }}
            >
              🔄 重置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterApp;

import React, { useState, useRef, useEffect } from 'react';

interface SharedFile {
  id: string;
  name: string;
  size: string;
  type: 'image' | 'file';
  icon: string;
}

const WhiteboardApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#1a1a2e');
  const [brushSize, setBrushSize] = useState(4);
  const [zoom, setZoom] = useState(100);
  const [files, setFiles] = useState<SharedFile[]>([
    { id: 'f1', name: '产品介绍图.png', size: '2.3 MB', type: 'image', icon: '🖼️' },
    { id: 'f2', name: '培训大纲.pdf', size: '1.8 MB', type: 'file', icon: '📄' },
  ]);

  const tools = [
    { id: 'pen', icon: '✏️', name: '画笔' },
    { id: 'eraser', icon: '🧹', name: '橡皮擦' },
    { id: 'text', icon: '📝', name: '文字' },
    { id: 'line', icon: '📏', name: '直线' },
    { id: 'rect', icon: '⬜', name: '矩形' },
    { id: 'circle', icon: '⭕', name: '圆形' },
  ];

  const colors = [
    '#1a1a2e', '#e94560', '#ff6b6b', '#feca57',
    '#48dbfb', '#1dd1a1', '#5f27cd', '#ff9ff3',
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = currentTool === 'eraser' ? '#f5f5f5' : currentColor;
        ctx.lineWidth = currentTool === 'eraser' ? brushSize * 4 : brushSize;
      }
    }
  }, [currentColor, brushSize, currentTool]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleUpload = async () => {
    const result = await window.electronAPI.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xlsx', 'ppt'] },
      ],
    });
    
    if (!result.canceled && result.filePaths) {
      result.filePaths.forEach((filePath: string) => {
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'unknown';
        const isImage = /\.(png|jpg|jpeg|gif)$/i.test(fileName);
        const newFile: SharedFile = {
          id: `f${Date.now()}-${Math.random()}`,
          name: fileName,
          size: '未知',
          type: isImage ? 'image' : 'file',
          icon: isImage ? '🖼️' : '📄',
        };
        setFiles(prev => [...prev, newFile]);
      });
    }
  };

  const saveWhiteboard = async () => {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: 'whiteboard.png',
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (!result.canceled) {
      const canvas = canvasRef.current;
      if (canvas) {
        // 模拟保存
        console.log('保存到:', result.filePath);
      }
    }
  };

  return (
    <div className="whiteboard-container">
      <header className="header">
        <h1>📝 协作白板</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => window.electronAPI.openWindow('room')}>
            🏠 房间
          </button>
          <button className="btn btn-secondary" onClick={clearCanvas}>
            🗑️ 清空
          </button>
          <button className="btn btn-primary" onClick={saveWhiteboard}>
            💾 保存
          </button>
        </div>
      </header>

      <div className="whiteboard-main">
        <div className="whiteboard-sidebar">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-btn-wb ${currentTool === tool.id ? 'active' : ''}`}
              onClick={() => setCurrentTool(tool.id)}
              title={tool.name}
            >
              {tool.icon}
            </button>
          ))}
          
          <div className="tool-divider"></div>
          
          <div className="color-picker-wb">
            {colors.map(color => (
              <div
                key={color}
                className={`color-dot ${currentColor === color && currentTool !== 'eraser' ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => { setCurrentColor(color); setCurrentTool('pen'); }}
              />
            ))}
          </div>

          <div className="tool-divider"></div>

          <button 
            className="tool-btn-wb"
            onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
            title="减小笔触"
          >
            ➖
          </button>
          <div className="size-slider" title="笔触大小">
            <div 
              className="size-dot" 
              style={{ width: brushSize, height: brushSize }}
            ></div>
          </div>
          <button 
            className="tool-btn-wb"
            onClick={() => setBrushSize(Math.min(20, brushSize + 1))}
            title="增大笔触"
          >
            ➕
          </button>

          <div className="tool-divider"></div>

          <button className="tool-btn-wb" title="撤销">↩️</button>
          <button className="tool-btn-wb" title="重做">↪️</button>
        </div>

        <div className="whiteboard-canvas-area">
          <div className="whiteboard-bg"></div>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>

        <div className="whiteboard-right">
          <h3>📎 共享文件</h3>
          
          <div className="upload-area" onClick={handleUpload}>
            <div className="icon">📤</div>
            <p>点击上传图片或文件</p>
          </div>

          <div className="files-section">
            {files.map(file => (
              <div key={file.id} className="file-item">
                <div className="icon">{file.icon}</div>
                <div className="info">
                  <div className="filename">{file.name}</div>
                  <div className="size">{file.size}</div>
                </div>
                <button className="action-icon-btn" title="在白板中打开">
                  👁️
                </button>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '24px' }}>📚 图层</h3>
          <div className="layer-item active">
            <span className="name">图层 1</span>
            <div className="actions">
              <button className="action-icon-btn">👁️</button>
              <button className="action-icon-btn">🔒</button>
            </div>
          </div>
          <div className="layer-item">
            <span className="name">背景</span>
            <div className="actions">
              <button className="action-icon-btn">👁️</button>
              <button className="action-icon-btn">🔓</button>
            </div>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }}>
            ➕ 添加图层
          </button>
        </div>
      </div>

      <div className="whiteboard-footer">
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => setZoom(Math.max(25, zoom - 25))}>➖</button>
          <div className="zoom-level">{zoom}%</div>
          <button className="zoom-btn" onClick={() => setZoom(Math.min(200, zoom + 25))}>➕</button>
        </div>
        <div className="page-info">
          当前工具: {tools.find(t => t.id === currentTool)?.name} | 颜色: {currentColor}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
            👥 3人协作中
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardApp;

import React, { useState, useEffect, useCallback } from 'react';

// Default color scheme
const DEFAULT_COLORS = ['white', 'red', 'blue', 'orange', 'green', 'yellow'];

// Color themes
const COLOR_THEMES = {
  classic: ['white', 'red', 'blue', 'orange', 'green', 'yellow'],
  pastel: ['#f5f5f5', '#ffcccb', '#add8e6', '#ffdab9', '#98fb98', '#fffacd'],
  neon: ['#ffffff', '#ff0066', '#00ccff', '#ff9900', '#00ff66', '#ffff00'],
  grayscale: ['#ffffff', '#cccccc', '#999999', '#666666', '#333333', '#111111']
};

// Common patterns
const PATTERNS = {
  solved: null, // Default solved state
  checkerboard: [
    "R", "L", "U", "D", "F", "B", 
    "R", "L", "U", "D", "F", "B"
  ],
  flower: ["F", "R", "U", "B", "L", "F", "R", "U", "B", "L"],
  cube_in_cube: [
    "F", "L", "F", "U'", "R", "U",
    "F", "F", "L", "L", "U'", "R'",
    "D'", "B", "B", "R", "R", "U'"
  ]
};

// Algorithms for solving different parts of the cube
const ALGORITHMS = {
  whiteCross: "F R U R' U' F'",
  firstLayerCorner: "R U R' U'",
  secondLayer: "U R U' R' U' F' U F",
  yellowCross: "F R U R' U' F'",
  yellowCorners: "R U R' U R U U R'",
  finalCorners: "R' F R' B B R F' R' B B R R"
};

const CubePiece = ({ position, colors }) => (
  <div className="cube-piece" style={{
    transform: `translate3d(${position[0]}px, ${position[1]}px, ${position[2]}px)`
  }}>
    {colors.map((color, index) => (
      <div key={index} className={`face face-${index}`} style={{ backgroundColor: color }} />
    ))}
  </div>
);

const RubiksCube = () => {
  // State for cube properties
  const [cubeSize, setCubeSize] = useState(3); // Default 3x3
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [cubeState, setCubeState] = useState(() => initializeCube(3, DEFAULT_COLORS));
  const [rotation, setRotation] = useState({ x: -30, y: 45, z: 0 });
  const [isRotating, setIsRotating] = useState(false);
  
  // Move history and timer states
  const [moveHistory, setMoveHistory] = useState([]);
  const [moveCount, setMoveCount] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  
  // Solver assistant states
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState("");
  const [autoSolving, setAutoSolving] = useState(false);
  const [solveStep, setSolveStep] = useState(0);

  // Initialize cube state
  function initializeCube(size, colorScheme) {
    const initialState = [];
    const range = Math.floor(size / 2);
    
    for (let x = -range; x <= range; x++) {
      for (let y = -range; y <= range; y++) {
        for (let z = -range; z <= range; z++) {
          // Skip internal pieces for 3x3 and larger cubes
          if (size > 1 && 
              Math.abs(x) < range && 
              Math.abs(y) < range && 
              Math.abs(z) < range) {
            continue;
          }
          
          initialState.push({
            position: [x, y, z],
            colors: [
              y === -range ? colorScheme[0] : (y === range ? colorScheme[5] : 'black'),
              x === range ? colorScheme[1] : (x === -range ? colorScheme[3] : 'black'),
              z === -range ? colorScheme[2] : (z === range ? colorScheme[4] : 'black'),
              x === -range ? colorScheme[3] : (x === range ? colorScheme[1] : 'black'),
              z === range ? colorScheme[4] : (z === -range ? colorScheme[2] : 'black'),
              y === range ? colorScheme[5] : (y === -range ? colorScheme[0] : 'black'),
            ]
          });
        }
      }
    }
    return initialState;
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const shift = e.shiftKey;
      
      // Map keys to face rotations
      const keyMap = {
        'u': 'U', 'd': 'D', 'f': 'F', 
        'b': 'B', 'l': 'L', 'r': 'R'
      };
      
      if (keyMap[key]) {
        rotateFace(keyMap[key], shift ? 'counterclockwise' : 'clockwise');
      }
      
      // Additional controls
      if (key === ' ') {
        toggleTimer();
      } else if (key === 'z' && e.ctrlKey) {
        undoMove();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cubeState, moveHistory, isRotating]);

  // Timer functionality
  useEffect(() => {
    let timerId;
    if (timerRunning) {
      timerId = setInterval(() => {
        const now = Date.now();
        setElapsedTime(prev => prev + (now - startTime) / 1000);
        setStartTime(now);
      }, 100);
    }
    return () => clearInterval(timerId);
  }, [timerRunning, startTime]);

  const toggleTimer = () => {
    if (!timerRunning) {
      setStartTime(Date.now());
      setTimerRunning(true);
    } else {
      setTimerRunning(false);
    }
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setElapsedTime(0);
    setMoveCount(0);
  };

  // Auto-solve functionality  
  useEffect(() => {
    let solveTimer;
    if (autoSolving && solveStep < 6) {
      solveTimer = setTimeout(() => {
        executeAlgorithm(Object.values(ALGORITHMS)[solveStep]);
        setSolveStep(prev => prev + 1);
      }, 2000);
    } else if (solveStep >= 6) {
      setAutoSolving(false);
      setSolveStep(0);
    }
    return () => clearTimeout(solveTimer);
  }, [autoSolving, solveStep]);

  const startAutoSolve = () => {
    setAutoSolving(true);
    setSolveStep(0);
  };

  const stopAutoSolve = () => {
    setAutoSolving(false);
  };

  const getNextHint = () => {
    // In a real implementation, this would analyze the current cube state
    // For demo purposes, we're just cycling through the algorithms
    const hints = Object.entries(ALGORITHMS);
    const hint = hints[solveStep % hints.length];
    setCurrentHint(`${hint[0]}: ${hint[1]}`);
  };

  // Cube rotation function
  const rotateFace = useCallback((face, direction) => {
    if (isRotating) return;
    setIsRotating(true);

    // Start timer on first move
    if (moveCount === 0 && !timerRunning) {
      toggleTimer();
    }

    let axis, layer;
    switch (face) {
      case 'U': axis = 'y'; layer = -1; break;
      case 'D': axis = 'y'; layer = 1; break;
      case 'F': axis = 'z'; layer = -1; break;
      case 'B': axis = 'z'; layer = 1; break;
      case 'L': axis = 'x'; layer = -1; break;
      case 'R': axis = 'x'; layer = 1; break;
      default: return;
    }

    const axisIndex = ['x', 'y', 'z'].indexOf(axis);
    const range = Math.floor(cubeSize / 2);
    layer *= range; // Adjust layer for cube size
    
    setCubeState(prevState => {
      return prevState.map(piece => {
        if (piece.position[axisIndex] === layer) {
          const newPosition = [...piece.position];
          const newColors = [...piece.colors];
          
          if (axis === 'x') {
            if (direction === 'clockwise') {
              [newPosition[1], newPosition[2]] = [newPosition[2], -newPosition[1]];
              [newColors[0], newColors[2], newColors[5], newColors[4]] = [newColors[4], newColors[0], newColors[2], newColors[5]];
            } else {
              [newPosition[1], newPosition[2]] = [-newPosition[2], newPosition[1]];
              [newColors[0], newColors[2], newColors[5], newColors[4]] = [newColors[2], newColors[5], newColors[4], newColors[0]];
            }
          } else if (axis === 'y') {
            if (direction === 'clockwise') {
              [newPosition[0], newPosition[2]] = [-newPosition[2], newPosition[0]];
              [newColors[1], newColors[2], newColors[3], newColors[4]] = [newColors[4], newColors[1], newColors[2], newColors[3]];
            } else {
              [newPosition[0], newPosition[2]] = [newPosition[2], -newPosition[0]];
              [newColors[1], newColors[2], newColors[3], newColors[4]] = [newColors[2], newColors[3], newColors[4], newColors[1]];
            }
          } else if (axis === 'z') {
            if (direction === 'clockwise') {
              [newPosition[0], newPosition[1]] = [newPosition[1], -newPosition[0]];
              [newColors[0], newColors[1], newColors[5], newColors[3]] = [newColors[3], newColors[0], newColors[1], newColors[5]];
            } else {
              [newPosition[0], newPosition[1]] = [-newPosition[1], newPosition[0]];
              [newColors[0], newColors[1], newColors[5], newColors[3]] = [newColors[1], newColors[5], newColors[3], newColors[0]];
            }
          }
          
          return { ...piece, position: newPosition, colors: newColors };
        }
        return piece;
      });
    });

    // Update move history and count
    const moveNotation = direction === 'counterclockwise' ? `${face}'` : face;
    setMoveHistory(prev => [...prev, moveNotation]);
    setMoveCount(prev => prev + 1);

    setTimeout(() => setIsRotating(false), 500);
  }, [isRotating, cubeSize, moveCount, timerRunning]);

  // Execute a sequence of moves (algorithm)
  const executeAlgorithm = (algorithm) => {
    if (!algorithm) return;
    
    const moves = algorithm.split(' ');
    let delay = 0;
    
    moves.forEach(move => {
      const isCounterClockwise = move.includes("'");
      const face = isCounterClockwise ? move.charAt(0) : move;
      const direction = isCounterClockwise ? 'counterclockwise' : 'clockwise';
      
      setTimeout(() => {
        rotateFace(face, direction);
      }, delay);
      
      delay += 600; // Slightly longer than the animation time
    });
  };

  // Apply a pattern to the cube
  const applyPattern = (patternName) => {
    resetCube();
    setTimeout(() => {
      if (patternName !== 'solved' && PATTERNS[patternName]) {
        executeAlgorithm(PATTERNS[patternName].join(' '));
      }
    }, 500);
  };

  // Reset the cube to solved state
  const resetCube = () => {
    setCubeState(initializeCube(cubeSize, colors));
    setMoveHistory([]);
    resetTimer();
  };

  // Change cube size
  const changeCubeSize = (size) => {
    setCubeSize(size);
    setCubeState(initializeCube(size, colors));
    setMoveHistory([]);
    resetTimer();
  };

  // Change color theme
  const changeColorTheme = (themeName) => {
    const newColors = COLOR_THEMES[themeName] || DEFAULT_COLORS;
    setColors(newColors);
    setCubeState(initializeCube(cubeSize, newColors));
    setMoveHistory([]);
    resetTimer();
  };

  // Undo last move
  const undoMove = () => {
    if (moveHistory.length === 0 || isRotating) return;
    
    const lastMove = moveHistory[moveHistory.length - 1];
    const face = lastMove.charAt(0);
    const wasCounterClockwise = lastMove.includes("'");
    
    // Apply the reverse move
    rotateFace(face, wasCounterClockwise ? 'clockwise' : 'counterclockwise');
    
    // Remove the undone move and the reverse move that was just added
    setMoveHistory(prev => prev.slice(0, -2));
    setMoveCount(prev => prev - 1); // Only subtract 1 since rotateFace adds 1
  };

  // Format time for display
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="enhanced-rubiks-cube">
      <style jsx>{`
        .enhanced-rubiks-cube {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
        }
        .rubiks-cube-container {
          perspective: 1000px;
          width: 300px;
          height: 300px;
          margin: 30px auto;
        }
        .rubiks-cube {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.5s;
        }
        .cube-piece {
          position: absolute;
          width: ${55 - (cubeSize > 3 ? 10 : 0)}px;
          height: ${55 - (cubeSize > 3 ? 10 : 0)}px;
          transition: transform 0.5s;
          transform-style: preserve-3d;
        }
        .face {
          position: absolute;
          width: ${48 - (cubeSize > 3 ? 10 : 0)}px;
          height: ${48 - (cubeSize > 3 ? 10 : 0)}px;
          border: 1px solid black;
          opacity: 0.9;
        }
        .face-0 { transform: rotateX(90deg) translateZ(${25 - (cubeSize > 3 ? 5 : 0)}px); }
        .face-1 { transform: rotateY(90deg) translateZ(${25 - (cubeSize > 3 ? 5 : 0)}px); }
        .face-2 { transform: translateZ(${25 - (cubeSize > 3 ? 5 : 0)}px); }
        .face-3 { transform: rotateY(-90deg) translateZ(${25 - (cubeSize > 3 ? 5 : 0)}px); }
        .face-4 { transform: rotateY(180deg) translateZ(${25 - (cubeSize > 3 ? 5 : 0)}px); }
        .face-5 { transform: rotateX(-90deg) translateZ(${25 - (cubeSize > 3 ? 5 : 0)}px); }
        
        .controls {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .face-controls {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 5px;
          margin-bottom: 15px;
        }
        .section {
          background-color: #f8f8f8;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 16px;
        }
        button {
          padding: 5px 10px;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .primary-btn {
          background-color: #4a90e2;
          color: white;
          border: none;
        }
        .danger-btn {
          background-color: #e25555;
          color: white;
          border: none;
        }
        button:hover {
          background-color: #e0e0e0;
        }
        .primary-btn:hover {
          background-color: #3a80d2;
        }
        .danger-btn:hover {
          background-color: #d24545;
        }
        .face-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        .stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 15px;
          font-size: 14px;
        }
        .stat-item {
          text-align: center;
        }
        .stat-value {
          font-size: 18px;
          font-weight: bold;
        }
        .move-history {
          max-height: 100px;
          overflow-y: auto;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
          font-family: monospace;
        }
        .hint-box {
          padding: 10px;
          background-color: #fffde7;
          border-radius: 4px;
          margin-top: 10px;
          border-left: 4px solid #fbc02d;
        }
        .keyboard-info {
          font-size: 12px;
          color: #666;
          text-align: center;
          margin-top: 5px;
        }
        select {
          padding: 5px;
          border-radius: 4px;
          border: 1px solid #ccc;
        }
        .select-group {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 10px;
        }
        .select-label {
          font-size: 14px;
          min-width: 70px;
        }
      `}</style>
      
      <div className="section stats">
        <div className="stat-item">
          <div>Time</div>
          <div className="stat-value">{formatTime(elapsedTime)}</div>
        </div>
        <div className="stat-item">
          <div>Moves</div>
          <div className="stat-value">{moveCount}</div>
        </div>
        <div className="stat-item">
          <button className={timerRunning ? "danger-btn" : "primary-btn"} onClick={toggleTimer}>
            {timerRunning ? "Pause" : "Start"}
          </button>
          <button onClick={resetTimer}>Reset</button>
        </div>
      </div>
      
      <div className="rubiks-cube-container">
        <div className="rubiks-cube" style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`
        }}>
          {cubeState.map((piece, index) => (
            <CubePiece 
              key={index} 
              position={piece.position.map(p => p * (55 - (cubeSize > 3 ? 10 : 0)))} 
              colors={piece.colors} 
            />
          ))}
        </div>
      </div>
      
      <div className="section">
        <div className="section-title">Controls</div>
        <div className="face-controls">
          {['U', 'D', 'F', 'B', 'L', 'R'].map(face => (
            <div key={face}>
              <button 
                className="face-btn" 
                onClick={() => rotateFace(face, 'clockwise')}
                title={`${face} - Clockwise`}
              >
                {face}
              </button>
              <button 
                className="face-btn" 
                onClick={() => rotateFace(face, 'counterclockwise')}
                title={`${face}' - Counterclockwise`}
              >
                {face}'
              </button>
            </div>
          ))}
        </div>
        <div className="keyboard-info">
          Keyboard controls: U, D, F, B, L, R (hold Shift for counterclockwise)
        </div>
      </div>
      
      <div className="section">
        <div className="section-title">Customize</div>
        <div className="select-group">
          <div className="select-label">Cube Size:</div>
          <select value={cubeSize} onChange={(e) => changeCubeSize(parseInt(e.target.value))}>
            <option value="2">2×2</option>
            <option value="3">3×3</option>
            <option value="4">4×4 (simplified)</option>
          </select>
        </div>
        <div className="select-group">
          <div className="select-label">Theme:</div>
          <select onChange={(e) => changeColorTheme(e.target.value)}>
            <option value="classic">Classic</option>
            <option value="pastel">Pastel</option>
            <option value="neon">Neon</option>
            <option value="grayscale">Grayscale</option>
          </select>
        </div>
        <div className="select-group">
          <div className="select-label">Pattern:</div>
          <select onChange={(e) => applyPattern(e.target.value)}>
            <option value="solved">Solved</option>
            <option value="checkerboard">Checkerboard</option>
            <option value="flower">Flower</option>
            <option value="cube_in_cube">Cube in Cube</option>
          </select>
        </div>
      </div>
      
      <div className="section">
        <div className="section-title">Move History</div>
        <div className="move-history">
          {moveHistory.length === 0 ? "No moves yet" : moveHistory.join(' ')}
        </div>
        <div style={{ marginTop: '10px' }}>
          <button onClick={undoMove} disabled={moveHistory.length === 0}>
            Undo Last Move (Ctrl+Z)
          </button>
          <button onClick={resetCube} style={{ marginLeft: '10px' }}>
            Reset Cube
          </button>
        </div>
      </div>
      
      <div className="section">
        <div className="section-title">Solver Assistant</div>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button onClick={getNextHint} className="primary-btn">
            Get Hint
          </button>
          <button 
            onClick={autoSolving ? stopAutoSolve : startAutoSolve}
            className={autoSolving ? "danger-btn" : "primary-btn"}
          >
            {autoSolving ? "Stop Auto-Solving" : "Auto-Solve"}
          </button>
        </div>
        {currentHint && (
          <div className="hint-box">
            <strong>Hint:</strong> {currentHint}
          </div>
        )}
      </div>
    </div>
  );
};

export default RubiksCube;
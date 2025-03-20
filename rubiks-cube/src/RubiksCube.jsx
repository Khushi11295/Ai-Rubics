import React, { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { a, useSpring } from "@react-spring/three";

const colors = ["red", "green", "blue", "yellow", "orange", "white"];

function Cube({ rotation }) {
  return (
    <a.mesh rotation={rotation}>
      <boxGeometry args={[1, 1, 1]} />
      {colors.map((color, index) => (
        <meshStandardMaterial key={index} attach={`material-${index}`} color={color} />
      ))}
    </a.mesh>
  );
}

function RubiksCube() {
  const [rotation, setRotation] = useState([0, 0, 0]);
  const animatedProps = useSpring({ rotation });

  const rotateCube = () => {
    setRotation([rotation[0] + Math.PI / 2, rotation[1], rotation[2]]);
  };

  return (
    <>
      <Canvas style={{ height: "100vh", background: "#222" }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Cube rotation={animatedProps.rotation} />
        <OrbitControls />
      </Canvas>
      <button onClick={rotateCube} style={{ position: "absolute", top: 20, left: 20 }}>
        Rotate Cube
      </button>
    </>
  );
}

export default RubiksCube;





import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

// 3D Bar Chart Component
function BarChart({ data }) {
  const meshRef = useRef();
  const [bars, setBars] = useState([]);

  useEffect(() => {
    if (!data || !data.labels || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      console.log('ThreeJS BarChart: Invalid data structure', data);
      return;
    }

    const dataValues = data.datasets[0].data;
    if (dataValues.length === 0) {
      console.log('ThreeJS BarChart: No data values');
      return;
    }

    const maxValue = Math.max(...dataValues);
    if (maxValue <= 0) {
      console.log('ThreeJS BarChart: No positive values found');
      return;
    }

    const newBars = data.labels.map((label, index) => {
      const value = dataValues[index] || 0;
      const normalizedValue = maxValue > 0 ? Math.max(value / maxValue, 0.1) : 0.1;
      
      return {
        position: [index * 2 - (data.labels.length - 1), 0, 0],
        height: normalizedValue * 5,
        label: String(label),
        value: Number(value)
      };
    });

    console.log('ThreeJS BarChart: Generated bars', newBars.length);
    setBars(newBars);
  }, [data]);

  if (bars.length === 0) {
    return (
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        No data available
      </Text>
    );
  }

  return (
    <group ref={meshRef}>
      {bars.map((bar, index) => (
        <group key={index} position={bar.position}>
          {/* Bar */}
          <mesh position={[0, bar.height / 2, 0]}>
            <boxGeometry args={[1.5, bar.height, 1.5]} />
            <meshStandardMaterial 
              color={new THREE.Color().setHSL(index / bars.length, 0.7, 0.6)} 
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
          
          {/* Label */}
          <Text
            position={[0, -0.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={2}
          >
            {bar.label}
          </Text>
          
          {/* Value */}
          <Text
            position={[0, bar.height + 0.3, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {bar.value}
          </Text>
        </group>
      ))}
    </group>
  );
}

// 3D Scatter Plot Component
function ScatterPlot({ data }) {
  const meshRef = useRef();
  const [points, setPoints] = useState([]);

  useEffect(() => {
    if (!data || !data.labels || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      console.log('ThreeJS ScatterPlot: Invalid data structure', data);
      return;
    }

    const dataValues = data.datasets[0].data;
    if (dataValues.length === 0) {
      console.log('ThreeJS ScatterPlot: No data values');
      return;
    }

    const newPoints = data.labels.map((label, index) => {
      const value = dataValues[index] || 0;
      const x = (Math.random() - 0.5) * 10;
      const y = value * 0.1;
      const z = (Math.random() - 0.5) * 10;
      
      return {
        position: [x, y, z],
        label: String(label),
        value: Number(value),
        color: new THREE.Color().setHSL(index / Math.max(data.labels.length, 1), 0.7, 0.6)
      };
    });

    console.log('ThreeJS ScatterPlot: Generated points', newPoints.length);
    setPoints(newPoints);
  }, [data]);

  if (points.length === 0) {
    return (
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        No data available
      </Text>
    );
  }

  return (
    <group ref={meshRef}>
      {points.map((point, index) => (
        <group key={index} position={point.position}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial 
              color={point.color}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
          
          <Text
            position={[0, 0.5, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {point.label}
          </Text>
        </group>
      ))}
    </group>
  );
}

// 3D Surface Plot Component
function SurfacePlot({ data }) {
  const meshRef = useRef();
  const [geometry, setGeometry] = useState(null);

  useEffect(() => {
    if (!data || !data.labels || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
      console.log('ThreeJS SurfacePlot: Invalid data structure', data);
      return;
    }

    const dataValues = data.datasets[0].data;
    if (dataValues.length === 0) {
      console.log('ThreeJS SurfacePlot: No data values');
      return;
    }

    const width = data.labels.length;
    const height = 1;
    const geometry = new THREE.PlaneGeometry(width * 2, height * 2, width - 1, height - 1);
    
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const normalizedX = (x + width) / (width * 2);
      const dataIndex = Math.floor(normalizedX * (data.labels.length - 1));
      const value = dataValues[dataIndex] || 0;
      positions[i + 1] = Number(value) * 0.1;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    console.log('ThreeJS SurfacePlot: Generated surface geometry');
    setGeometry(geometry);
  }, [data]);

  if (!geometry) {
    return (
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        No data available
      </Text>
    );
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color={0x4f46e5}
        wireframe={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Main 3D Scene Component
function Scene({ data, visualizationType = 'bar' }) {
  const [type, setType] = useState(visualizationType);

  const renderVisualization = () => {
    switch (type) {
      case 'scatter':
        return <ScatterPlot data={data} />;
      case 'surface':
        return <SurfacePlot data={data} />;
      default:
        return <BarChart data={data} />;
    }
  };

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />
      
      {/* Ground plane */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x1f2937} transparent opacity={0.3} />
      </mesh>
      
      {/* Visualization */}
      {renderVisualization()}
      
      {/* Controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
      />
      
      {/* Type selector */}
      <Text
        position={[-8, 4, 0]}
        fontSize={0.3}
        color="white"
        anchorX="left"
        anchorY="middle"
      >
        Visualization Type: {type}
      </Text>
    </>
  );
}

// Main ThreeJS Visualization Component
const ThreeJSVisualization = ({ data, visualizationType = 'bar' }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading 3D visualization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 5, 10], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene data={data} visualizationType={visualizationType} />
      </Canvas>
    </div>
  );
};

export default ThreeJSVisualization;

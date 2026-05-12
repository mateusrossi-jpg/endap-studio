import React, { useState, useMemo } from 'react';
import './Dashboard.module.css';
import { EndapProject, EndapIoPoint } from '../types/endap';

interface DashboardProps {
  project: EndapProject;
}

// Compute reserved GPIO pins based on selected transports
const getReservedPins = (net: { wifi?: boolean; ethernet?: boolean; rs485?: boolean }) => {
  const pins: number[] = [];
  if (net.rs485) pins.push(25, 26, 27);
  if (net.ethernet) pins.push(23, 19, 18, 5, 16, 17); // placeholder W5500 pins
  // Wi‑Fi does not reserve static pins
  return pins;
};

export const Dashboard: React.FC<DashboardProps> = ({ project }) => {
  // Transport toggles – could be persisted later via API
  const [wifi, setWifi] = useState<boolean>(false);
  const [ethernet, setEthernet] = useState<boolean>(false);
  const [rs485, setRs485] = useState<boolean>(false);
  const [gateway, setGateway] = useState<boolean>(false);
  const [node, setNode] = useState<boolean>(false);

  const reservedPins = useMemo(() => getReservedPins({ wifi, ethernet, rs485 }), [wifi, ethernet, rs485]);

  // Available GPIOs = all ESP32 pins (0‑39) minus used + reserved
  const availableGpios = useMemo(() => {
    const used = new Set<number>();
    project.io.forEach((p: EndapIoPoint) => {
      if (typeof p.gpio === 'number') used.add(p.gpio);
    });
    // Reserve pins for selected transports
    reservedPins.forEach(p => used.add(p));
    const all = Array.from({ length: 40 }, (_, i) => i);
    return all.filter(i => !used.has(i));
  }, [project.io, reservedPins]);

  const inputSlots = project.io.filter(p => p.direction === 'input');
  const outputSlots = project.io.filter(p => p.direction === 'output');

  return (
    <section className="dashboard" aria-label="Dashboard técnico">
      <h2 className="title">Transporte</h2>
      <div className="transport-toggle">
        <label>
          <input type="checkbox" checked={wifi} onChange={() => setWifi(!wifi)} /> Wi‑Fi
        </label>
        <label>
          <input type="checkbox" checked={ethernet} onChange={() => setEthernet(!ethernet)} /> Ethernet
        </label>
        <label>
          <input type="checkbox" checked={rs485} onChange={() => setRs485(!rs485)} /> RS485
        </label>
        <label>
          <input type="checkbox" checked={gateway} onChange={() => setGateway(!gateway)} /> Gateway
        </label>
        <label>
          <input type="checkbox" checked={node} onChange={() => setNode(!node)} /> Nó
        </label>
      </div>

      <h3 className="subtitle">GPIO reservados</h3>
      <p className="status-text">
        {reservedPins.length ? reservedPins.map(p => `GPIO${p}`).join(', ') : 'Nenhum'}
      </p>

      <h3 className="subtitle">GPIO disponíveis</h3>
      <ul className="gpio-list">
        {availableGpios.map(pin => (
          <li key={pin}>GPIO{pin}</li>
        ))}
      </ul>

      <h3 className="subtitle">Resumo de slots</h3>
      <p className="status-text">
        Entradas: {inputSlots.length} | Saídas: {outputSlots.length}
      </p>
      <ul className="slot-list">
        {project.io.map((p: EndapIoPoint) => (
          <li key={p.id}>
            {p.alias} – {p.direction.toUpperCase()} – {p.address}{' '}
            {p.gpio !== undefined ? `(GPIO${p.gpio})` : ''}
          </li>
        ))}
      </ul>
    </section>
  );
};

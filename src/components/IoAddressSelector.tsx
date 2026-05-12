import React, { useState, useEffect } from 'react';
import { EndapLadderBlock, EndapProject } from '../types/endap';

interface IoAddressSelectorProps {
  project: EndapProject;
  selectedBlock: EndapLadderBlock | null;
  currentAddress: string;
  onChange: (address: string) => void;
}

export const IoAddressSelector: React.FC<IoAddressSelectorProps> = ({
  project,
  selectedBlock,
  currentAddress,
  onChange,
}) => {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    if (!selectedBlock) {
      setOptions([]);
      return;
    }
    const kind = selectedBlock.kind;
    const opts: Array<{ value: string; label: string }> = [];
    // Inputs (contacts) -> only input direction
    if (['contact-no', 'contact-nc'].includes(kind)) {
      project.io
        .filter(p => p.direction === 'input')
        .forEach(p => {
          opts.push({ value: p.address, label: `${p.alias} (GPIO ${p.gpio ?? 'Virtual'})` });
        });
    }
    // Outputs (coils) -> only output direction
    if (['coil', 'coil-set', 'coil-reset'].includes(kind)) {
      project.io
        .filter(p => p.direction === 'output')
        .forEach(p => {
          opts.push({ value: p.address, label: `${p.alias} (GPIO ${p.gpio ?? 'Virtual'})` });
        });
    }
    // Internal memory contacts
    if (['memory-contact-no', 'memory-contact-nc'].includes(kind)) {
      Array.from({ length: 16 }).forEach((_, i) => {
        const val = `M${i}`;
        opts.push({ value: val, label: `Memória Interna ${i}` });
      });
    }
    // Timers / Counters or generic registers
    if (!['memory-contact-no', 'memory-contact-nc', 'contact-no', 'contact-nc', 'coil', 'coil-set', 'coil-reset'].includes(kind)) {
      const base = kind.startsWith('timer') ? 'T' : 'C';
      Array.from({ length: 8 }).forEach((_, i) => {
        const val = `${base}${i}`;
        opts.push({ value: val, label: `Registrador Interno ${i}` });
      });
    }
    setOptions(opts);
  }, [project, selectedBlock]);

  return (
    <label className="io-address-selector">
      <span>Endereço</span>
      <select
        value={currentAddress ?? ''}
        onChange={e => onChange(e.target.value)}
        className="mobile-select"
      >
        <option value="" disabled>
          Selecione um endereço…
        </option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
};
